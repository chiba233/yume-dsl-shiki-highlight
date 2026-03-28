**English** | [中文](./README.zh-CN.md)

# yume-dsl-shiki-highlight

### [▶ Live Demo — DSL Fallback Museum](https://qwwq.org/blog/dsl-fallback-museum)

Shiki code-highlighting plugin

---

<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />

[![npm](https://img.shields.io/npm/v/yume-dsl-shiki-highlight)](https://www.npmjs.com/package/yume-dsl-shiki-highlight)
[![GitHub](https://img.shields.io/badge/GitHub-chiba233%2Fyume--dsl--shiki--highlight-181717?logo=github)](https://github.com/chiba233/yume-dsl-shiki-highlight)
[![CI](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml/badge.svg)](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Contributing](https://img.shields.io/badge/Contributing-guide-blue.svg)](./CONTRIBUTING.md)
[![Security](https://img.shields.io/badge/Security-policy-red.svg)](./SECURITY.md)

A small syntax-highlighting library for
[`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL).

**Core API is stable.** Future updates will prioritize backward compatibility; breaking changes, if any, will land in
major versions with explicit migration notes.

Two modes:

- **Programmatic** — `tokenizeRichText` returns colored token arrays you can render anywhere (terminal, canvas, custom
  UI).
- **Shiki / TextMate** — `createRichTextGrammar` generates a grammar you can feed to [Shiki](https://shiki.style/) or
  any TextMate-compatible editor.

---

## Table of Contents

- [Ecosystem](#ecosystem)
- [Install](#install)
- [Quick Start](#quick-start)
    - [With createParser (recommended)](#with-createparser-recommended)
    - [Standalone](#standalone)
    - [Shiki integration](#shiki-integration)
- [API — Tokenizer](#api--tokenizer)
    - [createTokenizerFromParser](#createtokenizerfromparserparseroptions-colors)
    - [createTokenizer](#createtokenizerdefaults)
    - [tokenizeRichText / tokenizeRichTextLines](#tokenizerichtexttext-options)
    - [renderStructuralTree](#renderstructuraltreenodes-colors-textcolor)
- [API — Shiki Grammar](#api--shiki-grammar)
    - [createRichTextGrammar](#createrichtextgrammartagconfig)
    - [RICH_TEXT_TOKEN_COLORS](#rich_text_token_colors)
    - [RICH_TEXT_SCOPE_NAME](#rich_text_scope_name)
- [API — Utilities](#api--utilities)
    - [escapeRegex](#escaperegexvalue)
    - [colorizeEscapes](#colorizeescapestext-valuecolor-escapecolor)
    - [splitTokensByLineBreak](#splittokensbylinebreaktokens)
    - [pushToken](#pushtokentokens-content-color-fontstyle)
- [Colors](#colors)
- [Types](#types)
- [Relationship with parseStructural](#relationship-with-parsestructural)
- [Changelog](#changelog)
- [License](#license)

---

## Ecosystem

```
text ──▶ yume-dsl-rich-text (parse) ──▶ TextToken[]  ──▶ yume-dsl-token-walker (interpret) ──▶ TNode[]
  │                  │
  │                  ├── parseStructural ──▶ StructuralNode[]
  │                  │                            │
  └──────────────────┴── yume-dsl-shiki-highlight ┘ ──▶ HighlightToken[] / Shiki grammar
```

| Package                                                                            | Role                                                            |
|------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| [`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL)                        | Parser — text to token tree                                     |
| [`yume-dsl-token-walker`](https://github.com/chiba233/yume-dsl-token-walker)       | Interpreter — token tree to output nodes                        |
| **`yume-dsl-shiki-highlight`**                                                     | Syntax highlighting — tokens or TextMate grammar (this package) |

---

## Install

```bash
npm install yume-dsl-shiki-highlight
# or
pnpm add yume-dsl-shiki-highlight
```

`yume-dsl-rich-text` is a direct dependency and installed automatically.

---

## Quick Start

### With `createParser` (recommended)

Use one config object for both parsing and highlighting.

```ts
import { createParser, createSimpleInlineHandlers } from "yume-dsl-rich-text";
import { createTokenizerFromParser } from "yume-dsl-shiki-highlight";

const parserOpts = {
  handlers: createSimpleInlineHandlers(["bold", "code", "link"]),
};

const dsl = createParser(parserOpts);
const hl = createTokenizerFromParser(parserOpts, { tagName: "#0550AE" });

dsl.parse(text);        // TextToken[]
hl.tokenize(text);      // HighlightToken[]
hl.tokenizeLines(text); // same, split by line → HighlightToken[][]
```

### Standalone

Highlight all tags without a parser — useful for editor previews, playgrounds, or documentation.

```ts
import { tokenizeRichText, tokenizeRichTextLines } from "yume-dsl-shiki-highlight";

// Single-line → flat token array
const tokens = tokenizeRichText("$$bold(hello)$$ world");

// Multi-line (handles cross-line raw/block tags)
const lines = tokenizeRichTextLines("$$code(ts)%\nconst x = 1;\n%end$$");
```

When using custom syntax, prefer `createEasySyntax(...)` from `yume-dsl-rich-text` and pass the result explicitly in
`options.syntax`:

```ts
import { createEasySyntax } from "yume-dsl-rich-text";

const syntax = createEasySyntax({
  tagPrefix: "@@",
  tagOpen: "<<",
  tagClose: ">>",
  tagDivider: "||",
  escapeChar: "~",
});

const tokens = tokenizeRichText("@@bold<<hello>>@@", { syntax });
```

Or bind defaults once:

```ts
import { createTokenizer } from "yume-dsl-shiki-highlight";

const hl = createTokenizer({
  handlers,
  allowForms: ["inline"],
  colors: { tagName: "#FF0000" },
});

hl.tokenize(text);
```

### Shiki integration

```ts
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import baseTheme from "shiki/themes/github-light-high-contrast.mjs";
import { createRichTextGrammar, RICH_TEXT_TOKEN_COLORS } from "yume-dsl-shiki-highlight";

const grammar = createRichTextGrammar();          // match any tag
// or restrict to known tags:
// const grammar = createRichTextGrammar({
//   allTags: ["bold", "code", "link", "info"],
//   rawTags: ["code"],
//   blockTags: ["info", "collapse"],
// });

const theme = {
    ...baseTheme,
    tokenColors: [...(baseTheme.tokenColors ?? []), ...RICH_TEXT_TOKEN_COLORS],
};

const highlighter = await createHighlighterCore({
    themes: [theme],
    langs: [grammar],
    engine: await createOnigurumaEngine(() => import("shiki/wasm")),
});

const html = highlighter.codeToHtml(dslSource, {
    lang: "yume-rich-text-dsl",
    theme: theme.name,
});
```

---

## API — Tokenizer

### `createTokenizerFromParser(parserOptions, colors?)`

**Recommended entry point.** Create a tokenizer from the same defaults object you use for parsing.

```ts
function createTokenizerFromParser(
  parserOptions: TokenizeOptions,
  colors?: Partial<HighlightColors>,
): Tokenizer
```

```ts
interface Tokenizer {
  tokenize: (text: string, overrides?: TokenizeOptions) => HighlightToken[];
  tokenizeLines: (text: string, overrides?: TokenizeOptions) => HighlightToken[][];
}
```

`parserOptions` can include the same structural settings used by `parseStructural`:
`handlers`, `allowForms`, `depthLimit`, `syntax`, and `tagName`.

The optional `colors` argument is applied on top of those parser-derived defaults.

### `createTokenizer(defaults?)`

Create a standalone tokenizer with bound defaults.
Parser-related fields are forwarded to `parseStructural`.

```ts
function createTokenizer(defaults?: TokenizeOptions): Tokenizer
```

### `tokenizeRichText(text, options?)` / `tokenizeRichTextLines(text, options?)`

Stateless one-shot functions.
`TokenizeOptions` extends `ParserBaseOptions`, so you can pass parser gating options directly.

```ts
function tokenizeRichText(text: string, options?: TokenizeOptions): HighlightToken[]
function tokenizeRichTextLines(text: string, options?: TokenizeOptions): HighlightToken[][]
```

```ts
interface TokenizeOptions extends ParserBaseOptions {
  colors?: Partial<HighlightColors>;
}
```

### `renderStructuralTree(nodes, colors, textColor?, syntax?)`

Low-level renderer: converts a `StructuralNode[]` tree (from `parseStructural`) into colored tokens.

Use this when you want to insert your own logic between structural parsing and rendering.
If your tree was parsed with custom syntax, pass the same `syntax` override here as well.

```ts
function renderStructuralTree(
  nodes: StructuralNode[],
  colors: HighlightColors,
  textColor?: string,
  syntax?: Partial<SyntaxInput>,
): HighlightToken[]
```

---

## API — Shiki Grammar

### `createRichTextGrammar(tagConfig?)`

Generate a Shiki-compatible TextMate grammar for the rich-text DSL.
The returned object can be passed directly to Shiki's `langs` array.

- **No `tagConfig`**: match any valid tag name
- **With `tagConfig`**: restrict matching to listed tag names

```ts
function createRichTextGrammar(tagConfig?: GrammarTagConfig): LanguageRegistration
```

```ts
interface GrammarTagConfig {
  allTags: readonly string[];       // inline matching
  rawTags: readonly string[];       // $$tag(…)% … %end$$
  blockTags: readonly string[];     // $$tag(…)* … *end$$
  tagName?: Partial<TagNameConfig>; // validation rules
  anyTagPattern?: string;           // fallback regex for unrestricted matching
}
```

### `RICH_TEXT_TOKEN_COLORS`

Pre-built `tokenColors` array for Shiki themes.

```ts
const theme = {
    ...baseTheme,
    tokenColors: [...(baseTheme.tokenColors ?? []), ...RICH_TEXT_TOKEN_COLORS],
};
```

### `RICH_TEXT_SCOPE_NAME`

The TextMate `scopeName` used by the generated grammar:
`"source.yume-rich-text-dsl"`.

---

## API — Utilities

### `escapeRegex(value)`

Escape all regex metacharacters (`|`, `\`, `{`, `}`, `(`, `)`, `[`, `]`, `^`, `$`, `+`, `*`, `?`, `.`, `-`)
in a string so it can be safely embedded in a regex pattern as a literal match.

This is the same function used internally by `createRichTextGrammar`.
Useful when:

- Building custom TextMate grammar patterns from user-configurable syntax tokens
- Embedding DSL delimiters (like `$$`, `)*`, `%end$$`) in regex strings
- Composing your own Shiki grammar rules that reference DSL syntax

```ts
function escapeRegex(value: string): string
```

```ts
import { escapeRegex } from "yume-dsl-shiki-highlight";

escapeRegex("hello");    // "hello"       — no metacharacters
escapeRegex("$$");       // "\\$\\$"      — both $ escaped
escapeRegex("*end$$");   // "\\*end\\$\\$"
escapeRegex("ns.tag");   // "ns\\.tag"    — dot escaped (not wildcard)
```

### `colorizeEscapes(text, valueColor, escapeColor)`

Scan a string for DSL escape sequences (`\(`, `\)`, `\|`, etc.), returning tokens
where escapes are colored separately.

```ts
function colorizeEscapes(text: string, valueColor: string | undefined, escapeColor: string): HighlightToken[]
```

### `splitTokensByLineBreak(tokens)`

Split a flat `HighlightToken[]` into one array per line at `\n` boundaries.

```ts
function splitTokensByLineBreak(tokens: HighlightToken[]): HighlightToken[][]
```

### `pushToken(tokens, content, color?, fontStyle?)`

Append a token to an array, automatically skipping empty `content`.

```ts
function pushToken(tokens: HighlightToken[], content: string, color?: string, fontStyle?: string): void
```

---

## Colors

### `DEFAULT_COLORS`

| Key           | Hex       | Role                          |
|---------------|-----------|-------------------------------|
| `tagName`     | `#0550AE` | Tag name (`bold`, `code`, …)  |
| `punct`       | `#CF222E` | `$$` prefix/suffix            |
| `bracket`     | `#6639BA` | `(` `)` argument brackets     |
| `separator`   | `#953800` | `\|` pipe divider             |
| `operator`    | `#1A7F37` | `%` `*` form markers          |
| `end`         | `#8250DF` | `end` keyword                 |
| `escape`      | `#116329` | Escape sequences              |
| `argText`     | `#0A3069` | Text inside arguments         |
| `contentText` | `#0A7EA4` | Text inside raw/block content |

### `resolveColors(overrides?)`

Merge partial overrides with `DEFAULT_COLORS`:

```ts
const colors = resolveColors({ tagName: "#FF0000" });
```

---

## Types

```ts
interface HighlightToken {
    content: string;
    color?: string;
    fontStyle?: string;
}

interface TokenizeOptions extends ParserBaseOptions {
    colors?: Partial<HighlightColors>;
    // Inherited from ParserBaseOptions:
    // handlers?, allowForms?, depthLimit?, syntax?, tagName?
}

interface Tokenizer {
    tokenize: (text: string, overrides?: TokenizeOptions) => HighlightToken[];
    tokenizeLines: (text: string, overrides?: TokenizeOptions) => HighlightToken[][];
}

interface GrammarTagConfig {
    allTags: readonly string[];
    rawTags: readonly string[];
    blockTags: readonly string[];
    tagName?: Partial<TagNameConfig>;
    anyTagPattern?: string;
}
```

`StructuralNode`, `StructuralParseOptions`, `ParserBaseOptions`, and `TagNameConfig`
are re-exported from `yume-dsl-rich-text`.

---

## Relationship with `parseStructural`

`TokenizeOptions` extends `ParserBaseOptions`, so `handlers`, `allowForms`, `syntax`,
`tagName`, and `depthLimit` flow through to `parseStructural` without extra adapter code.

When `handlers` is provided, tag recognition and form gating are identical to `parseRichText`.
When omitted, all tags and forms are accepted.

Differences from `parseRichText` (features, not bugs):

|                          | `parseRichText`                         | `parseStructural`                         |
|--------------------------|-----------------------------------------|-------------------------------------------|
| Tag recognition          | Same (`ParserBaseOptions`)              | Same (`ParserBaseOptions`)                |
| Form gating              | Same                                    | Same                                      |
| Line-break normalization | `mode: "render"` strips                 | Always preserves                          |
| Escape representation    | Unescaped at root, raw inside tags      | Structural `escape` nodes                 |
| Pipe `\|`                | Plain text (post-processed by handlers) | `separator` nodes in args; text elsewhere |
| Error reporting          | `onError` callback                      | Silent degradation                        |
| Output type              | `TextToken[]`                           | `StructuralNode[]`                        |

---

## Changelog

See also [CHANGELOG](./CHANGELOG.md).


---

## License

[MIT](./LICENSE)
