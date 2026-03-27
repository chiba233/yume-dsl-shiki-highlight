export type { StructuralNode, StructuralParseOptions } from "yume-dsl-rich-text";

/** A single colored token in a highlighted line. */
export interface HighlightToken {
  content: string;
  color?: string;
  fontStyle?: string;
}

/** Color palette for rich-text highlight tokens. */
export interface HighlightColors {
  /** Tag name (e.g. `bold`, `code`). */
  tagName: string;
  /** Punctuation (`$$`). */
  punct: string;
  /** Brackets for arguments (`(`, `)`). */
  bracket: string;
  /** Pipe separator (`|`). */
  separator: string;
  /** Operator markers (`%`, `*`). */
  operator: string;
  /** `end` keyword. */
  end: string;
  /** Escape sequences (`\\`). */
  escape: string;
  /** Text inside tag arguments. */
  argText: string;
  /** Text inside block/raw content. */
  contentText: string;
}

/** Options for {@link tokenizeRichText}. */
export interface TokenizeOptions {
  /** Override default colors. */
  colors?: Partial<HighlightColors>;
  /** Maximum tag nesting depth (default 50). */
  depthLimit?: number;
}

/** Reusable tokenizer instance with bound default options. */
export interface Tokenizer {
  tokenize: (text: string, overrides?: TokenizeOptions) => HighlightToken[];
  tokenizeLines: (text: string, overrides?: TokenizeOptions) => HighlightToken[][];
}

/** Tag name lists for Shiki grammar generation. */
export interface GrammarTagConfig {
  /** All recognized tag names (used for inline tag matching). */
  allTags: readonly string[];
  /** Tags that support raw form (`$$tag(…)% … %end$$`). */
  rawTags: readonly string[];
  /** Tags that support block form (`$$tag(…)* … *end$$`). */
  blockTags: readonly string[];
}
