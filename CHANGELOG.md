# Changelog

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
