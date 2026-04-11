import type { StructuralNode, SyntaxConfig, SyntaxInput } from "yume-dsl-rich-text";
import { createSyntax, readEscapedSequence } from "yume-dsl-rich-text";
import type { HighlightColors, HighlightToken, TokenizeOptions, Tokenizer } from "./types.js";
import { resolveColors } from "./colors.js";
import { parseStructural } from "yume-dsl-rich-text";

/** Precomputed syntax tokens needed by the renderer. */
interface RenderSyntax {
  tagPrefix: string;
  tagOpen: string;
  tagClose: string;
  tagDivider: string;
  rawMarker: string;
  blockMarker: string;
  rawEndWord: string;
  blockEndWord: string;
  rawCloseSuffix: string;
  blockCloseSuffix: string;
}

/**
 * Decompose a close token (e.g. rawClose / blockClose) into endWord and suffix.
 *
 * The close token is expected to be `marker + endWord + tagPrefix`, but when
 * the close token does not end with tagPrefix (custom syntax), the suffix is
 * empty and the entire remainder after the marker becomes the endWord.
 */
const decomposeClose = (
  closeToken: string,
  marker: string,
  tagPrefix: string,
): { endWord: string; suffix: string } => {
  const afterMarker = closeToken.slice(marker.length);
  if (afterMarker.length >= tagPrefix.length && afterMarker.endsWith(tagPrefix)) {
    return {
      endWord: afterMarker.slice(0, afterMarker.length - tagPrefix.length),
      suffix: tagPrefix,
    };
  }
  return { endWord: afterMarker, suffix: "" };
};

const buildRenderSyntax = (s: SyntaxInput): RenderSyntax => {
  const rawMarker = s.rawOpen.slice(s.tagClose.length);
  const blockMarker = s.blockOpen.slice(s.tagClose.length);
  const rawClose = decomposeClose(s.rawClose, rawMarker, s.tagPrefix);
  const blockClose = decomposeClose(s.blockClose, blockMarker, s.tagPrefix);
  return {
    tagPrefix: s.tagPrefix,
    tagOpen: s.tagOpen,
    tagClose: s.tagClose,
    tagDivider: s.tagDivider,
    rawMarker,
    blockMarker,
    rawEndWord: rawClose.endWord,
    blockEndWord: blockClose.endWord,
    rawCloseSuffix: rawClose.suffix,
    blockCloseSuffix: blockClose.suffix,
  };
};

// ── Token helpers ──

export const pushToken = (
  tokens: HighlightToken[],
  content: string,
  color?: string,
  fontStyle?: string,
): void => {
  if (!content) return;
  tokens.push({ content, color, fontStyle });
};

/** Colorize escape sequences within a string, leaving other text in `valueColor`. */
export const colorizeEscapes = (
  text: string,
  valueColor: string | undefined,
  escapeColor: string,
  syntax: SyntaxConfig,
): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    pushToken(tokens, buffer, valueColor);
    buffer = "";
  };

  while (i < text.length) {
    const [escaped, next] = readEscapedSequence(text, i, { syntax });
    if (escaped === null) {
      buffer += text[i];
      i++;
      continue;
    }
    flush();
    pushToken(tokens, text.slice(i, next), escapeColor);
    i = next;
  }

  flush();
  return tokens;
};

/** Split a flat token array into lines by `\n` boundaries. */
export const splitTokensByLineBreak = (tokens: HighlightToken[]): HighlightToken[][] => {
  const lines: HighlightToken[][] = [[]];

  for (const token of tokens) {
    const parts = token.content.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        lines[lines.length - 1].push({
          content: parts[i],
          color: token.color,
          fontStyle: token.fontStyle,
        });
      }
      if (i < parts.length - 1) {
        lines.push([]);
      }
    }
  }

  return lines;
};

// ── Tree renderer ──

type DeferredFrame =
  | { kind: "inline-close"; shorthand?: boolean }
  | { kind: "raw-after-args"; node: Extract<StructuralNode, { type: "raw" }> }
  | { kind: "block-after-args"; node: Extract<StructuralNode, { type: "block" }> }
  | { kind: "block-close" };

type RenderFrame =
  | { kind: "node"; node: StructuralNode; textColor?: string }
  | { kind: "deferred"; deferred: DeferredFrame; textColor?: string };

/** Internal iterative renderer — syntax tokens are precomputed once at the entry point. */
const renderNodes = (
  nodes: StructuralNode[],
  colors: HighlightColors,
  s: RenderSyntax,
  syntax: SyntaxConfig,
  textColor?: string,
): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  const stack: RenderFrame[] = [];

  const pushNodes = (items: StructuralNode[], nextTextColor?: string) => {
    for (let i = items.length - 1; i >= 0; i--) {
      stack.push({ kind: "node", node: items[i], textColor: nextTextColor });
    }
  };

  pushNodes(nodes, textColor);

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;

    if (frame.kind === "deferred") {
      switch (frame.deferred.kind) {
        case "inline-close":
          pushToken(tokens, s.tagClose, colors.bracket);
          if (!frame.deferred.shorthand) {
            pushToken(tokens, s.tagPrefix, colors.punct, "bold");
          }
          break;
        case "raw-after-args":
          pushToken(tokens, s.tagClose, colors.bracket);
          pushToken(tokens, s.rawMarker, colors.operator, "bold");
          for (const token of colorizeEscapes(
            frame.deferred.node.content,
            colors.contentText,
            colors.escape,
            syntax,
          )) {
            tokens.push(token);
          }
          pushToken(tokens, s.rawMarker, colors.operator, "bold");
          pushToken(tokens, s.rawEndWord, colors.end, "bold");
          pushToken(tokens, s.rawCloseSuffix, colors.punct, "bold");
          break;
        case "block-after-args":
          pushToken(tokens, s.tagClose, colors.bracket);
          pushToken(tokens, s.blockMarker, colors.operator, "bold");
          stack.push({ kind: "deferred", deferred: { kind: "block-close" } });
          pushNodes(frame.deferred.node.children, colors.contentText);
          break;
        case "block-close":
          pushToken(tokens, s.blockMarker, colors.operator, "bold");
          pushToken(tokens, s.blockEndWord, colors.end, "bold");
          pushToken(tokens, s.blockCloseSuffix, colors.punct, "bold");
          break;
      }
      continue;
    }

    const { node } = frame;

    if (node.type === "text") {
      pushToken(tokens, node.value, frame.textColor);
      continue;
    }

    if (node.type === "escape") {
      pushToken(tokens, node.raw, colors.escape);
      continue;
    }

    if (node.type === "separator") {
      pushToken(tokens, s.tagDivider, colors.separator, "bold");
      continue;
    }

    const shorthand = node.type === "inline" && node.implicitInlineShorthand === true;
    if (!shorthand) {
      pushToken(tokens, s.tagPrefix, colors.punct, "bold");
    }
    pushToken(tokens, node.tag, colors.tagName, "bold");
    pushToken(tokens, s.tagOpen, colors.bracket);

    if (node.type === "inline") {
      stack.push({ kind: "deferred", deferred: { kind: "inline-close", shorthand } });
      pushNodes(node.children, colors.argText);
      continue;
    }

    if (node.type === "raw") {
      stack.push({ kind: "deferred", deferred: { kind: "raw-after-args", node } });
      pushNodes(node.args, colors.argText);
      continue;
    }

    stack.push({ kind: "deferred", deferred: { kind: "block-after-args", node } });
    pushNodes(node.args, colors.argText);
  }

  return tokens;
};

/**
 * Render a structural tree into colored highlight tokens.
 *
 * Reads syntax tokens once from the provided `syntax`.
 * Pass `createSyntax()` for default syntax.
 */
export const renderStructuralTree = (
  nodes: StructuralNode[],
  colors: HighlightColors,
  syntax: SyntaxConfig,
  textColor?: string,
): HighlightToken[] => {
  return renderNodes(nodes, colors, buildRenderSyntax(syntax), syntax, textColor);
};

// ── Public API ──

const mergeTokenizeOptions = (
  defaults: TokenizeOptions,
  overrides?: TokenizeOptions,
): TokenizeOptions => ({
  ...defaults,
  ...overrides,
  colors:
    defaults.colors || overrides?.colors
      ? { ...defaults.colors, ...overrides?.colors }
      : undefined,
});

const renderTokens = (text: string, options?: TokenizeOptions): HighlightToken[] => {
  const colors = resolveColors(options?.colors);
  const syntax = createSyntax(options?.syntax);
  const structuralOptions: Record<string, unknown> = {
    handlers: options?.handlers,
    allowForms: options?.allowForms,
    depthLimit: options?.depthLimit,
    syntax: options?.syntax,
    tagName: options?.tagName,
  };
  if (options?.implicitInlineShorthand !== undefined) {
    structuralOptions.implicitInlineShorthand = options.implicitInlineShorthand;
  }
  const tree = parseStructural(text, structuralOptions);
  return renderStructuralTree(tree, colors, syntax);
};

/**
 * Tokenize a rich-text DSL string into colored highlight tokens.
 */
export const tokenizeRichText = (text: string, options?: TokenizeOptions): HighlightToken[] => {
  return renderTokens(text, options);
};

/**
 * Tokenize a multi-line rich-text DSL string, returning one token array per line.
 *
 * Cross-line tags (raw/block forms) are handled correctly.
 */
export const tokenizeRichTextLines = (
  text: string,
  options?: TokenizeOptions,
): HighlightToken[][] => {
  return splitTokensByLineBreak(renderTokens(text, options));
};

/**
 * Create a reusable tokenizer with bound default options.
 *
 * Accepts all {@link TokenizeOptions} fields including `handlers`, `allowForms`,
 * `syntax`, and `tagName` — these are forwarded to `parseStructural` so that
 * highlighting respects the same tag/form gating as the parser.
 */
export const createTokenizer = (defaults: TokenizeOptions = {}): Tokenizer => ({
  tokenize: (text, overrides) =>
    tokenizeRichText(text, overrides ? mergeTokenizeOptions(defaults, overrides) : defaults),
  tokenizeLines: (text, overrides) =>
    tokenizeRichTextLines(text, overrides ? mergeTokenizeOptions(defaults, overrides) : defaults),
});

/**
 * Create a tokenizer that inherits tag/form gating from parser config.
 *
 * Accepts `ParseOptions` directly — semantic-only fields (`mode`, `onError`,
 * `blockTags`, `createId`) are harmlessly ignored at runtime.
 *
 * @example
 * ```ts
 * import { createParser, ParseOptions } from "yume-dsl-rich-text";
 * import { createTokenizerFromParser } from "yume-dsl-shiki-highlight";
 *
 * const opts: ParseOptions = { handlers, allowForms: ["inline"], mode: "render" };
 * const dsl = createParser(opts);
 * const tokenizer = createTokenizerFromParser(opts, { tagName: "#FF0000" });
 * // dsl.parse(text) and tokenizer.tokenize(text) share the same gating rules
 * ```
 */
export const createTokenizerFromParser = (
  parserOptions: TokenizeOptions,
  colors?: Partial<HighlightColors>,
): Tokenizer => {
  return createTokenizer({ ...parserOptions, colors });
};
