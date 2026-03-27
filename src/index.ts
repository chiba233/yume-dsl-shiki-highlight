// ── Re-exports from yume-dsl-rich-text ──
export { parseStructural, DEFAULT_SYNTAX, readEscapedSequence } from "yume-dsl-rich-text";
export type { StructuralNode, StructuralParseOptions, SyntaxInput } from "yume-dsl-rich-text";

// ── Types ──
export type {
  HighlightToken,
  HighlightColors,
  TokenizeOptions,
  Tokenizer,
  GrammarTagConfig,
} from "./types.js";

// ── Colors ──
export { DEFAULT_COLORS, resolveColors } from "./colors.js";

// ── Tokenizer (core API) ──
export {
  createTokenizer,
  tokenizeRichText,
  tokenizeRichTextLines,
  renderStructuralTree,
  colorizeEscapes,
  splitTokensByLineBreak,
  pushToken,
} from "./render.js";

// ── Shiki grammar & theme ──
export {
  createRichTextGrammar,
  RICH_TEXT_SCOPE_NAME,
  RICH_TEXT_TOKEN_COLORS,
} from "./grammar.js";
