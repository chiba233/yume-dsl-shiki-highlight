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
}

/** Derive the "end word" between a marker and tagPrefix: e.g. "%end$$" → "end" */
const deriveEndWord = (closeToken: string, marker: string, tagPrefix: string): string =>
  closeToken.slice(marker.length, closeToken.length - tagPrefix.length);

const buildRenderSyntax = (s: SyntaxInput): RenderSyntax => {
  const rawMarker = s.rawOpen.slice(s.tagClose.length);
  const blockMarker = s.blockOpen.slice(s.tagClose.length);
  return {
    tagPrefix: s.tagPrefix,
    tagOpen: s.tagOpen,
    tagClose: s.tagClose,
    tagDivider: s.tagDivider,
    rawMarker,
    blockMarker,
    rawEndWord: deriveEndWord(s.rawClose, rawMarker, s.tagPrefix),
    blockEndWord: deriveEndWord(s.blockClose, blockMarker, s.tagPrefix),
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
  syntax?: SyntaxConfig,
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
    const [escaped, next] = readEscapedSequence(text, i, syntax ? { syntax } : undefined);
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

/** Internal recursive renderer — syntax tokens are precomputed once at the entry point. */
const renderNodes = (
  nodes: StructuralNode[],
  colors: HighlightColors,
  s: RenderSyntax,
  syntax: SyntaxConfig,
  textColor?: string,
): HighlightToken[] => {
  const tokens: HighlightToken[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      pushToken(tokens, node.value, textColor);
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

    // Common tag head: $$tagName(
    pushToken(tokens, s.tagPrefix, colors.punct, "bold");
    pushToken(tokens, node.tag, colors.tagName, "bold");
    pushToken(tokens, s.tagOpen, colors.bracket);

    if (node.type === "inline") {
      renderNodes(node.children, colors, s, syntax, colors.argText).forEach((t) => tokens.push(t));
      pushToken(tokens, s.tagClose, colors.bracket);
      pushToken(tokens, s.tagPrefix, colors.punct, "bold");
      continue;
    }

    // Raw / Block share arg section
    renderNodes(node.args, colors, s, syntax, colors.argText).forEach((t) => tokens.push(t));
    pushToken(tokens, s.tagClose, colors.bracket);

    if (node.type === "raw") {
      pushToken(tokens, s.rawMarker, colors.operator, "bold");
      colorizeEscapes(node.content, colors.contentText, colors.escape, syntax).forEach((t) =>
        tokens.push(t),
      );
      pushToken(tokens, s.rawMarker, colors.operator, "bold");
      pushToken(tokens, s.rawEndWord, colors.end, "bold");
      pushToken(tokens, s.tagPrefix, colors.punct, "bold");
      continue;
    }

    // Block
    pushToken(tokens, s.blockMarker, colors.operator, "bold");
    renderNodes(node.children, colors, s, syntax, colors.contentText).forEach((t) => tokens.push(t));
    pushToken(tokens, s.blockMarker, colors.operator, "bold");
    pushToken(tokens, s.blockEndWord, colors.end, "bold");
    pushToken(tokens, s.tagPrefix, colors.punct, "bold");
  }

  return tokens;
};

/**
 * Render a structural tree into colored highlight tokens.
 *
 * Reads syntax tokens once from the provided `syntax` override or `DEFAULT_SYNTAX`.
 */
export const renderStructuralTree = (
  nodes: StructuralNode[],
  colors: HighlightColors,
  textColor?: string,
  syntax?: Partial<SyntaxInput>,
): HighlightToken[] => {
  const resolvedSyntax = createSyntax(syntax);
  return renderNodes(nodes, colors, buildRenderSyntax(resolvedSyntax), resolvedSyntax, textColor);
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
  const syntax = options?.syntax ? createSyntax(options.syntax) : undefined;
  const tree = parseStructural(text, {
    handlers: options?.handlers,
    allowForms: options?.allowForms,
    depthLimit: options?.depthLimit,
    syntax: options?.syntax,
    tagName: options?.tagName,
  });
  return renderStructuralTree(tree, colors, undefined, syntax);
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
