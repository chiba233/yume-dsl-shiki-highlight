# Changelog

### 2.1.2

- **Grammar: split escape matching by context**
  - Replaced the single `escape-sequence` rule with:
    - `args-escape-sequence`
    - `raw-escape-sequence`
    - `block-escape-sequence`
  - Inline/paren arguments now use args-only escape rules.
  - Raw body now highlights only `escape + rawClose`.
  - Block body now highlights only `escape + blockClose`.
- **Tokenizer: raw body escape highlighting fixed**
  - `render.ts` now colorizes `raw.content` with a raw-scoped escape set (`[rawClose]`), so escaped raw close markers are emitted as escape-colored tokens.
- **Tests updated**
  - Added/updated smoke assertions for escaped raw close marker output.
  - Updated grammar repository key assertions to the new context-specific names.
- No public API changes

### 2.1.1

- Fix: highlight token offset drift when custom syntax defines `rawClose` / `blockClose`
  without a trailing `tagPrefix` (e.g. `rawClose: "%"`, `blockClose: "*"`). The renderer
  previously hardcoded `tagPrefix` after every raw/block close sequence; it now decomposes
  the close token and only emits a suffix when the close token actually ends with `tagPrefix`
- Fix: highlight token offset drift for implicit inline shorthand tags. The renderer
  previously emitted `tagPrefix` before and after every inline tag, but shorthand tags
  (`italic<...>` instead of `=italic<...>=`) have no prefix/suffix in source. The renderer
  now checks `implicitInlineShorthand` and skips `tagPrefix` accordingly

### 2.1.0

- New: `TokenizeOptions.implicitInlineShorthand` — forward the `implicitInlineShorthand`
  option to the underlying structural parser so that `name(...)` shorthand inside inline
  args is correctly parsed and highlighted. Accepts `boolean | readonly string[]`,
  matching the parser's three-tier opt-in
- Improve: `renderTokens` now conditionally passes `implicitInlineShorthand` to
  `parseStructural`, keeping the highlight pipeline in sync with parser behavior
- Docs: README and GUIDE updated to list `implicitInlineShorthand` among
  `parserOptions` / `TokenizeOptions` fields
- Dep: `yume-dsl-rich-text` peer range bumped to `^1.3.0`

### 2.0.1

- Fix: deep nesting highlight stack overflow — `renderStructuralTree` no longer crashes on
  pathological inline nesting (for example 5000 nested tags). Structural tree rendering was
  rewritten from direct recursion to explicit stack iteration, so highlight generation now
  follows the same heap-bounded behavior as `yume-dsl-rich-text`'s structural parser

### 2.0.0

- **Breaking:** `colorizeEscapes(text, valueColor, escapeColor, syntax)` — the `syntax` parameter
  is now **required** (`SyntaxConfig`). Previously it was optional and fell back to the deprecated
  ambient `getSyntax()` state when omitted. Pass `createSyntax()` for default syntax
- **Breaking:** `renderStructuralTree(nodes, colors, syntax, textColor?)` — `syntax` is now
  **required** (`SyntaxConfig`) and moved to the 3rd parameter (before `textColor`).
  Previously `syntax` was the 4th optional parameter (`Partial<SyntaxInput>`).
  Pass `createSyntax()` for default syntax
- New: `GrammarTagConfig.tagName` — override tag-name character rules for grammar
  validation. Tag names are validated against the provided rules before being used in
  the regex; invalid names throw a descriptive error instead of producing a broken grammar
- New: `GrammarTagConfig.anyTagPattern` — override the fallback regex for matching any
  tag name when specific tag lists are not provided. Keeps the grammar's "match-all"
  fallback in sync with custom `tagName` rules (default: `[a-zA-Z_][a-zA-Z0-9_-]*`)
- New: `toSafeTagPattern` internal validator — checks every tag name character against
  `TagNameConfig` rules and escapes regex metacharacters via `escapeRegex`
- Improve: all user-provided tag names are now regex-escaped before being used in the
  grammar, preventing broken patterns when tag names contain `.`, `*`, or other metacharacters

### 1.0.3

- `createRichTextGrammar(...)` now accepts `tagConfig.syntax`
- Shiki / TextMate grammar generation now follows custom parser delimiters instead of assuming the default `$$` / `()` / `%end$$` / `*end$$` syntax
- Added smoke coverage and README examples for custom-syntax grammar generation

### 1.0.2

- Update markdown

### 1.0.1

- `tokenizeRichText` / `tokenizeRichTextLines` now carry explicit `options.syntax` through the full render pipeline
- `renderStructuralTree(..., syntax?)` now uses the provided `syntax` override directly and otherwise falls back to `DEFAULT_SYNTAX`
- Internal highlighting no longer depends on ambient `withSyntax` state
- Added smoke coverage for explicit custom-syntax tokenization
- Updated README examples to promote `createEasySyntax(...)` as the preferred custom-syntax builder

### 1.0.0

- Stable release — API is finalized
- Updated `yume-dsl-rich-text` dependency to `^1.0.1`
- Updated `typescript` dev dependency from `^5.7.0` to `^6.0.2`

### 0.1.0

- Initial release
- `createTokenizerFromParser` — create tokenizer from parser config (recommended entry point)
- `createTokenizer` — standalone tokenizer with bound defaults
- `TokenizeOptions extends ParserBaseOptions` — `handlers`/`allowForms`/`syntax`/`tagName` transparently forwarded to `parseStructural`
- Stateless functions: `tokenizeRichText`, `tokenizeRichTextLines`
- Shiki TextMate grammar factory: `createRichTextGrammar` with `tagName` validation and `anyTagPattern` override
- Pre-built theme token colors: `RICH_TEXT_TOKEN_COLORS`
- Configurable 9-color palette with `DEFAULT_COLORS` / `resolveColors`
- Low-level renderer: `renderStructuralTree`
- Utilities: `escapeRegex`, `colorizeEscapes`, `splitTokensByLineBreak`, `pushToken`
