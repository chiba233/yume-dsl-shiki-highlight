export type {
  StructuralNode,
  StructuralParseOptions,
  ParserBaseOptions,
  SyntaxInput,
} from "yume-dsl-rich-text";
import type { ParserBaseOptions, SyntaxInput } from "yume-dsl-rich-text";

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

/**
 * Options for {@link tokenizeRichText} and {@link createTokenizer}.
 *
 * Extends {@link ParserBaseOptions} — `handlers`, `allowForms`, `syntax`,
 * `tagName`, and `depthLimit` are forwarded to `parseStructural` so that
 * highlighting respects the same tag/form gating as the parser.
 */
export interface TokenizeOptions extends ParserBaseOptions {
  /** Override default colors. */
  colors?: Partial<HighlightColors>;
  /**
   * Forward-compatible shorthand toggle for inline-arg context (`name(...)`).
   *
   * Kept locally to support newer parser options even when the installed
   * `yume-dsl-rich-text` type version lags behind at compile time.
   */
  implicitInlineShorthand?: boolean | readonly string[];
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
  /**
   * Override tag-name character rules for validation.
   * When provided, tag names are validated before being used in the grammar.
   * Invalid names throw an error instead of producing a broken regex.
   * Defaults to `DEFAULT_TAG_NAME` from `yume-dsl-rich-text`.
   */
  tagName?: Partial<import("yume-dsl-rich-text").TagNameConfig>;
  /**
   * Override the DSL syntax tokens used by the generated grammar.
   * Pass the same syntax you use in `createParser(...)` so editor highlighting
   * stays aligned with runtime parsing.
   */
  syntax?: Partial<SyntaxInput>;
  /**
   * Override the regex pattern used to match **any** tag name when
   * the corresponding tag list is not provided.
   *
   * Defaults to `[a-zA-Z_][a-zA-Z0-9_-]*` (matches `DEFAULT_TAG_NAME` rules).
   * Set this when using custom `tagName` rules so that the grammar's
   * "match-all" fallback stays in sync with the parser.
   */
  anyTagPattern?: string;
}
