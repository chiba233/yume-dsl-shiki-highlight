import type { StructuralNode, SyntaxInput } from "yume-dsl-rich-text";
import { getSyntax, readEscapedSequence } from "yume-dsl-rich-text";
import type { HighlightColors, HighlightToken, TokenizeOptions, Tokenizer } from "./types.js";
import { resolveColors } from "./colors.js";
import { parseStructural } from "yume-dsl-rich-text";

const BLOCK_END = "end";

/** Precomputed syntax tokens needed by the renderer. */
interface RenderSyntax {
  tagPrefix: string;
  tagOpen: string;
  tagClose: string;
  tagDivider: string;
  rawMarker: string;
  blockMarker: string;
}

const buildRenderSyntax = (s: SyntaxInput): RenderSyntax => ({
  tagPrefix: s.tagPrefix,
  tagOpen: s.tagOpen,
  tagClose: s.tagClose,
  tagDivider: s.tagDivider,
  rawMarker: s.rawOpen.slice(s.tagClose.length),
  blockMarker: s.blockOpen.slice(s.tagClose.length),
});

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
    const [escaped, next] = readEscapedSequence(text, i);
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
      renderNodes(node.children, colors, s, colors.argText).forEach((t) => tokens.push(t));
      pushToken(tokens, s.tagClose, colors.bracket);
      pushToken(tokens, s.tagPrefix, colors.punct, "bold");
      continue;
    }

    // Raw / Block share arg section
    renderNodes(node.args, colors, s, colors.argText).forEach((t) => tokens.push(t));
    pushToken(tokens, s.tagClose, colors.bracket);

    if (node.type === "raw") {
      pushToken(tokens, s.rawMarker, colors.operator, "bold");
      colorizeEscapes(node.content, colors.contentText, colors.escape).forEach((t) =>
        tokens.push(t),
      );
      pushToken(tokens, s.rawMarker, colors.operator, "bold");
      pushToken(tokens, BLOCK_END, colors.end, "bold");
      pushToken(tokens, s.tagPrefix, colors.punct, "bold");
      continue;
    }

    // Block
    pushToken(tokens, s.blockMarker, colors.operator, "bold");
    renderNodes(node.children, colors, s, colors.contentText).forEach((t) => tokens.push(t));
    pushToken(tokens, s.blockMarker, colors.operator, "bold");
    pushToken(tokens, BLOCK_END, colors.end, "bold");
    pushToken(tokens, s.tagPrefix, colors.punct, "bold");
  }

  return tokens;
};

/**
 * Render a structural tree into colored highlight tokens.
 *
 * Reads syntax tokens once from the active `withSyntax` context (or default).
 */
export const renderStructuralTree = (
  nodes: StructuralNode[],
  colors: HighlightColors,
  textColor?: string,
): HighlightToken[] => {
  return renderNodes(nodes, colors, buildRenderSyntax(getSyntax()), textColor);
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
  const tree = parseStructural(text, { depthLimit: options?.depthLimit ?? 50 });
  return renderStructuralTree(tree, colors);
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

export const createTokenizer = (defaults: TokenizeOptions = {}): Tokenizer => ({
  tokenize: (text, overrides) =>
    tokenizeRichText(text, overrides ? mergeTokenizeOptions(defaults, overrides) : defaults),
  tokenizeLines: (text, overrides) =>
    tokenizeRichTextLines(text, overrides ? mergeTokenizeOptions(defaults, overrides) : defaults),
});
