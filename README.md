**English** | [中文](./README.zh-CN.md)

# yume-dsl-shiki-highlight

### [▶ Live Demo — DSL Fallback Museum](https://qwwq.org/blog/dsl-fallback-museum)

Shiki code-highlighting plugin · legitimate plugins · intentional malformed markup · error reporting

---

<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />

[![npm](https://img.shields.io/npm/v/yume-dsl-shiki-highlight)](https://www.npmjs.com/package/yume-dsl-shiki-highlight)
[![GitHub](https://img.shields.io/badge/GitHub-chiba233%2Fyume--dsl--shiki--highlight-181717?logo=github)](https://github.com/chiba233/yume-dsl-shiki-highlight)
[![CI](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml/badge.svg)](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Contributing](https://img.shields.io/badge/Contributing-guide-blue.svg)](./CONTRIBUTING.md)
[![Security](https://img.shields.io/badge/Security-policy-red.svg)](./SECURITY.md)

Minimal syntax-highlight library for
[`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL).

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
    - [Programmatic highlighting](#programmatic-highlighting)
    - [Shiki integration](#shiki-integration)
- [API — Tokenizer](#api--tokenizer)
    - [tokenizeRichText](#tokenizerichtexttext-options)
    - [tokenizeRichTextLines](#tokenizerichtextlinestext-options)
    - [renderStructuralTree](#renderstructuraltreenodes-colors-textcolor)
- [API — Shiki Grammar](#api--shiki-grammar)
    - [createRichTextGrammar](#createrichtextgrammartagconfig)
    - [RICH_TEXT_TOKEN_COLORS](#rich_text_token_colors)
    - [RICH_TEXT_SCOPE_NAME](#rich_text_scope_name)
- [API — Utilities](#api--utilities)
    - [colorizeEscapes](#colorizeescapestext-valuecolor-escapecolor)
    - [splitTokensByLineBreak](#splittokensbylinebreaktokens)
    - [pushToken](#pushtokentokens-content-color-fontstyle)
- [Colors](#colors)
    - [DEFAULT_COLORS](#default_colors)
    - [resolveColors](#resolvecolorsoverrides)
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

| Package                                                        | Role                                                            |
|----------------------------------------------------------------|-----------------------------------------------------------------|
| [`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL)    | Parser — text to token tree                                     |
| [`yume-dsl-token-walker`](https://github.com/chiba233/yume-dsl-token-walker) | Interpreter — token tree to output nodes                        |
| **`yume-dsl-shiki-highlight`**                                 | Syntax highlighting — tokens or TextMate grammar (this package) |

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

### Programmatic highlighting

```ts
import {tokenizeRichText, tokenizeRichTextLines} from "yume-dsl-shiki-highlight";

// Single-line → flat token array
const tokens = tokenizeRichText("$$bold(hello)$$ world");
// [
//   { content: "$$",    color: "#CF222E", fontStyle: "bold" },
//   { content: "bold",  color: "#0550AE", fontStyle: "bold" },
//   { content: "(",     color: "#6639BA" },
//   { content: "hello", color: "#0A3069" },
//   { content: ")",     color: "#6639BA" },
//   { content: "$$",    color: "#CF222E", fontStyle: "bold" },
//   { content: " world" },
// ]

// Multi-line (handles cross-line raw/block tags)
const lines = tokenizeRichTextLines("$$code(ts)%\nconst x = 1;\n%end$$");
// lines[0] = [$$, code, (, ts, ), %]
// lines[1] = [{ content: "const x = 1;", color: "#0A7EA4" }]
// lines[2] = [%, end, $$]
```

### Shiki integration

```ts
import {createHighlighterCore} from "shiki/core";
import {createOnigurumaEngine} from "shiki/engine/oniguruma";
import baseTheme from "shiki/themes/github-light-high-contrast.mjs";
import {
    createRichTextGrammar,
    RICH_TEXT_TOKEN_COLORS,
} from "yume-dsl-shiki-highlight";

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

### `tokenizeRichText(text, options?)`

Tokenize a rich-text DSL string into a flat array of colored tokens.

Internally calls `parseStructural` to build a structural tree, then renders it via `renderStructuralTree`.
Best for single-line or whole-text one-shot highlighting.

```ts
function tokenizeRichText(text: string, options?: TokenizeOptions): HighlightToken[]
```

| Param                | Type                       | Description                      |
|----------------------|----------------------------|----------------------------------|
| `text`               | `string`                   | DSL source                       |
| `options.colors`     | `Partial<HighlightColors>` | Override default color palette   |
| `options.depthLimit` | `number`                   | Max nesting depth (default `50`) |

### `tokenizeRichTextLines(text, options?)`

Same as `tokenizeRichText`, but splits the result by line breaks — one `HighlightToken[]` per line.
Cross-line raw/block tags are handled correctly: line breaks inside a tag do not interrupt highlighting.

```ts
function tokenizeRichTextLines(text: string, options?: TokenizeOptions): HighlightToken[][]
```

### `renderStructuralTree(nodes, colors, textColor?)`

Low-level renderer: converts a `StructuralNode[]` tree (from `parseStructural`) into colored tokens.

Use this when you need to insert custom logic between structural parsing and color rendering —
e.g. filtering out certain nodes, or applying extra styles to specific tags.

```ts
function renderStructuralTree(
    nodes: StructuralNode[],
    colors: HighlightColors,
    textColor?: string,
): HighlightToken[]
```

---

## API — Shiki Grammar

### `createRichTextGrammar(tagConfig?)`

Generate a Shiki-compatible TextMate grammar for the rich-text DSL.
The returned object can be passed directly to Shiki's `langs` array.

- **No `tagConfig`** — uses `[a-zA-Z_][a-zA-Z0-9_-]*` to match any valid tag name. Good for generic highlighting.
- **With `tagConfig`** — restricts matching to the listed tag names per form. Good for strict highlighting of known tags
  only.

```ts
function createRichTextGrammar(tagConfig?: GrammarTagConfig): LanguageRegistration
```

```ts
interface GrammarTagConfig {
    allTags: readonly string[];   // inline matching
    rawTags: readonly string[];   // $$tag(…)% … %end$$
    blockTags: readonly string[]; // $$tag(…)* … *end$$
}
```

### `RICH_TEXT_TOKEN_COLORS`

Pre-built `tokenColors` array for Shiki themes.
Merge into your theme to get colors matching `DEFAULT_COLORS`:

```ts
const theme = {
    ...baseTheme,
    tokenColors: [...(baseTheme.tokenColors ?? []), ...RICH_TEXT_TOKEN_COLORS],
};
```

### `RICH_TEXT_SCOPE_NAME`

The TextMate `scopeName` used by the generated grammar: `"source.yume-rich-text-dsl"`.

Use this when you need to reference the grammar by scope — e.g. embedding it in another grammar
via `{ include: "source.yume-rich-text-dsl" }`.

---

## API — Utilities

### `colorizeEscapes(text, valueColor, escapeColor)`

Scan a string for DSL escape sequences (`\(`, `\)`, `\|`, etc.), returning tokens
where escapes are colored with `escapeColor` and everything else with `valueColor`.

Useful for highlighting raw content that may contain escape sequences in a custom renderer.

```ts
function colorizeEscapes(
    text: string,
    valueColor: string | undefined,
    escapeColor: string,
): HighlightToken[]
```

### `splitTokensByLineBreak(tokens)`

Split a flat `HighlightToken[]` into one array per line at `\n` boundaries.

Use this when you need per-line rendering (e.g. terminal output, table rows).

```ts
function splitTokensByLineBreak(tokens: HighlightToken[]): HighlightToken[][]
```

### `pushToken(tokens, content, color?, fontStyle?)`

Append a token to an array, automatically skipping empty `content`.

Simplifies token construction when writing custom rendering logic.

```ts
function pushToken(
    tokens: HighlightToken[],
    content: string,
    color?: string,
    fontStyle?: string,
): void
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
const colors = resolveColors({tagName: "#FF0000"});
```

---

## Types

```ts
interface HighlightToken {
    content: string;
    color?: string;
    fontStyle?: string;
}

interface HighlightColors {
    tagName: string;
    punct: string;
    bracket: string;
    separator: string;
    operator: string;
    end: string;
    escape: string;
    argText: string;
    contentText: string;
}

interface TokenizeOptions {
    colors?: Partial<HighlightColors>;
    depthLimit?: number;
}

interface GrammarTagConfig {
    allTags: readonly string[];
    rawTags: readonly string[];
    blockTags: readonly string[];
}
```

`StructuralNode` and `StructuralParseOptions` are re-exported from `yume-dsl-rich-text`.

---

## Relationship with `parseStructural`

This package uses `parseStructural` from `yume-dsl-rich-text` internally.

Both `ParseOptions` and `StructuralParseOptions` extend a shared `ParserBaseOptions`
(`handlers`, `allowForms`, `depthLimit`, `syntax`, `tagName`).
When `handlers` is provided, tag recognition and form gating are identical to `parseRichText`.
When omitted (as this package does by default), all tags and forms are accepted.

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

`parseStructural` inherits the active `withSyntax` / `withTagNameConfig` context when called without explicit overrides,
making it composable inside custom parse pipelines.

---

## Changelog

### 0.1.0

- Initial release
- Programmatic tokenizer: `tokenizeRichText`, `tokenizeRichTextLines`
- Shiki TextMate grammar factory: `createRichTextGrammar`
- Pre-built theme token colors: `RICH_TEXT_TOKEN_COLORS`
- Configurable 9-color palette with `DEFAULT_COLORS` / `resolveColors`
- Low-level renderer: `renderStructuralTree`
- Utilities: `colorizeEscapes`, `splitTokensByLineBreak`, `pushToken`
- Re-exports `parseStructural`, `StructuralNode` from `yume-dsl-rich-text`

---

## License

[MIT](./LICENSE)
