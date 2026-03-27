[English](./README.md) | **中文**

# yume-dsl-shiki-highlight

### [▶ 在线演示 — DSL Fallback Museum](https://qwwq.org/blog/dsl-fallback-museum)

Shiki 代码高亮插件 · 合法插件用法 · 各种故意书写错误 · 错误报告

---

<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />

[![npm](https://img.shields.io/npm/v/yume-dsl-shiki-highlight)](https://www.npmjs.com/package/yume-dsl-shiki-highlight)
[![GitHub](https://img.shields.io/badge/GitHub-chiba233%2Fyume--dsl--shiki--highlight-181717?logo=github)](https://github.com/chiba233/yume-dsl-shiki-highlight)
[![CI](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml/badge.svg)](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Contributing](https://img.shields.io/badge/贡献指南-guide-blue.svg)](./CONTRIBUTING.zh-CN.md)
[![Security](https://img.shields.io/badge/安全策略-policy-red.svg)](./SECURITY.md)

[`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL) 的最小语法高亮库。

两种模式：

- **编程式** — `tokenizeRichText` 返回带颜色的 token 数组，可渲染到任何目标（终端、canvas、自定义 UI）。
- **Shiki / TextMate** — `createRichTextGrammar` 生成可直接用于 [Shiki](https://shiki.style/) 或任何 TextMate
  兼容编辑器的语法定义。

---

## 目录

- [生态](#生态)
- [安装](#安装)
- [快速开始](#快速开始)
    - [编程式高亮](#编程式高亮)
    - [Shiki 集成](#shiki-集成)
- [API — 分词器](#api--分词器)
    - [tokenizeRichText](#tokenizerichtexttext-options)
    - [tokenizeRichTextLines](#tokenizerichtextlinestext-options)
    - [renderStructuralTree](#renderstructuraltreenodes-colors-textcolor)
- [API — Shiki 语法](#api--shiki-语法)
    - [createRichTextGrammar](#createrichtextgrammartagconfig)
    - [RICH_TEXT_TOKEN_COLORS](#rich_text_token_colors)
    - [RICH_TEXT_SCOPE_NAME](#rich_text_scope_name)
- [API — 工具函数](#api--工具函数)
    - [colorizeEscapes](#colorizeescapestext-valuecolor-escapecolor)
    - [splitTokensByLineBreak](#splittokensbylinebreaktokens)
    - [pushToken](#pushtokentokens-content-color-fontstyle)
- [配色](#配色)
    - [DEFAULT_COLORS](#default_colors)
    - [resolveColors](#resolvecolorsoverrides)
- [类型定义](#类型定义)
- [与 parseStructural 的关系](#与-parsestructural-的关系)
- [更新日志](#更新日志)
- [许可证](#许可证)

---

## 生态

```
text ──▶ yume-dsl-rich-text (parse) ──▶ TextToken[]  ──▶ yume-dsl-token-walker (interpret) ──▶ TNode[]
  │                  │
  │                  ├── parseStructural ──▶ StructuralNode[]
  │                  │                            │
  └──────────────────┴── yume-dsl-shiki-highlight ┘ ──▶ HighlightToken[] / Shiki 语法
```

| 包                                                              | 角色                                |
|----------------------------------------------------------------|-----------------------------------|
| [`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL)    | 解析器 — 文本到 token 树                 |
| [`yume-dsl-token-walker`](https://github.com/chiba233/yume-dsl-token-walker) | 解释器 — token 树到输出节点                |
| **`yume-dsl-shiki-highlight`**                                 | 语法高亮 — 彩色 token 或 TextMate 语法（本包） |

---

## 安装

```bash
npm install yume-dsl-shiki-highlight
# 或
pnpm add yume-dsl-shiki-highlight
```

`yume-dsl-rich-text` 作为直接依赖自动安装。

---

## 快速开始

### 编程式高亮

将 DSL 源码转为带颜色和字体样式的 token 数组，适合在任何渲染目标（HTML、终端、canvas 等）上自行绘制。

```ts
import {tokenizeRichText, tokenizeRichTextLines} from "yume-dsl-shiki-highlight";

// 单行 → 扁平 token 数组
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

// 多行（跨行的 raw/block 标签会被正确处理）
const lines = tokenizeRichTextLines("$$code(ts)%\nconst x = 1;\n%end$$");
// lines[0] = [$$, code, (, ts, ), %]
// lines[1] = [{ content: "const x = 1;", color: "#0A7EA4" }]
// lines[2] = [%, end, $$]
```

### Shiki 集成

生成 TextMate 语法定义和配套主题色，直接喂给 Shiki 即可获得编辑器级的 DSL 高亮。

```ts
import {createHighlighterCore} from "shiki/core";
import {createOnigurumaEngine} from "shiki/engine/oniguruma";
import baseTheme from "shiki/themes/github-light-high-contrast.mjs";
import {
    createRichTextGrammar,
    RICH_TEXT_TOKEN_COLORS,
} from "yume-dsl-shiki-highlight";

// 不传参：匹配任意合法标签名
const grammar = createRichTextGrammar();

// 或限定已知标签：
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

## API — 分词器

### `tokenizeRichText(text, options?)`

将 DSL 字符串转为扁平的带颜色 token 数组。

内部流程：调用 `parseStructural` 得到结构树，再用 `renderStructuralTree` 渲染为 `HighlightToken[]`。
适合单行或整段文本的一次性高亮。

```ts
function tokenizeRichText(text: string, options?: TokenizeOptions): HighlightToken[]
```

| 参数                   | 类型                         | 说明              |
|----------------------|----------------------------|-----------------|
| `text`               | `string`                   | DSL 源码          |
| `options.colors`     | `Partial<HighlightColors>` | 覆盖默认配色          |
| `options.depthLimit` | `number`                   | 最大嵌套深度（默认 `50`） |

### `tokenizeRichTextLines(text, options?)`

与 `tokenizeRichText` 相同，但按换行符拆分结果，返回二维数组。
跨行的 raw/block 标签会被正确处理——标签内部的换行不会截断高亮。

```ts
function tokenizeRichTextLines(text: string, options?: TokenizeOptions): HighlightToken[][]
```

### `renderStructuralTree(nodes, colors, textColor?)`

底层渲染器：将 `StructuralNode[]`（来自 `parseStructural`）转为 `HighlightToken[]`。

当你需要在结构解析和颜色渲染之间插入自定义处理逻辑时使用。例如：先过滤掉某些节点，或对特定标签添加额外样式。

```ts
function renderStructuralTree(
    nodes: StructuralNode[],
    colors: HighlightColors,
    textColor?: string,
): HighlightToken[]
```

---

## API — Shiki 语法

### `createRichTextGrammar(tagConfig?)`

生成 Shiki 兼容的 TextMate 语法定义。返回值可直接传入 Shiki 的 `langs` 数组。

- **不传参** — 用 `[a-zA-Z_][a-zA-Z0-9_-]*` 匹配所有合法标签名，适合通用场景。
- **传 `tagConfig`** — 按形态限定标签名列表，适合只想高亮已知标签的严格场景。

```ts
function createRichTextGrammar(tagConfig?: GrammarTagConfig): LanguageRegistration
```

```ts
interface GrammarTagConfig {
    allTags: readonly string[];   // inline 形态匹配
    rawTags: readonly string[];   // $$tag(…)% … %end$$
    blockTags: readonly string[]; // $$tag(…)* … *end$$
}
```

### `RICH_TEXT_TOKEN_COLORS`

预置的 Shiki 主题 `tokenColors` 条目数组。
合并到你的主题中即可获得与 `DEFAULT_COLORS` 一致的 DSL 配色：

```ts
const theme = {
    ...baseTheme,
    tokenColors: [...(baseTheme.tokenColors ?? []), ...RICH_TEXT_TOKEN_COLORS],
};
```

### `RICH_TEXT_SCOPE_NAME`

生成语法使用的 TextMate `scopeName`：`"source.yume-rich-text-dsl"`。

在需要通过 scope 引用该语法时使用（例如在其他语法中通过 `{ include: "source.yume-rich-text-dsl" }` 嵌入）。

---

## API — 工具函数

### `colorizeEscapes(text, valueColor, escapeColor)`

扫描字符串中的 DSL 转义序列（`\(`、`\)`、`\|` 等），将转义部分和普通文本分别着色。

适合在自定义渲染器中对 raw 内容做转义高亮。

```ts
function colorizeEscapes(
    text: string,
    valueColor: string | undefined,
    escapeColor: string,
): HighlightToken[]
```

### `splitTokensByLineBreak(tokens)`

将扁平的 `HighlightToken[]` 按 `\n` 边界拆分为每行一个数组。

当你需要逐行渲染（如终端输出、表格行）时使用。

```ts
function splitTokensByLineBreak(tokens: HighlightToken[]): HighlightToken[][]
```

### `pushToken(tokens, content, color?, fontStyle?)`

向 token 数组追加一项，自动跳过空 `content`。

在编写自定义渲染逻辑时用于简化 token 构建。

```ts
function pushToken(
    tokens: HighlightToken[],
    content: string,
    color?: string,
    fontStyle?: string,
): void
```

---

## 配色

### `DEFAULT_COLORS`

| 键             | 色值        | 角色                   |
|---------------|-----------|----------------------|
| `tagName`     | `#0550AE` | 标签名（`bold`、`code` 等） |
| `punct`       | `#CF222E` | `$$` 前缀/后缀           |
| `bracket`     | `#6639BA` | `(` `)` 参数括号         |
| `separator`   | `#953800` | `\|` 管道分隔符           |
| `operator`    | `#1A7F37` | `%` `*` 形态标记         |
| `end`         | `#8250DF` | `end` 关键字            |
| `escape`      | `#116329` | 转义序列                 |
| `argText`     | `#0A3069` | 参数区内的文本              |
| `contentText` | `#0A7EA4` | raw/block 内容区的文本     |

### `resolveColors(overrides?)`

将部分覆盖与 `DEFAULT_COLORS` 合并，返回完整配色对象：

```ts
const colors = resolveColors({tagName: "#FF0000"}); // 只改标签名颜色，其余保持默认
```

---

## 类型定义

```ts
/** 单个带颜色的高亮 token */
interface HighlightToken {
    content: string;
    color?: string;      // CSS 色值，undefined 表示无特殊着色
    fontStyle?: string;  // 如 "bold"
}

/** 9 色配色方案 */
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

/** tokenizeRichText / tokenizeRichTextLines 的选项 */
interface TokenizeOptions {
    colors?: Partial<HighlightColors>;  // 部分覆盖默认配色
    depthLimit?: number;                // 最大嵌套深度，默认 50
}

/** createRichTextGrammar 的标签名配置 */
interface GrammarTagConfig {
    allTags: readonly string[];   // 所有标签名（用于 inline 匹配）
    rawTags: readonly string[];   // 支持 raw 形态的标签
    blockTags: readonly string[]; // 支持 block 形态的标签
}
```

`StructuralNode` 和 `StructuralParseOptions` 从 `yume-dsl-rich-text` 重导出。

---

## 与 `parseStructural` 的关系

本包内部使用 `yume-dsl-rich-text` 的 `parseStructural` 做结构解析。

`ParseOptions` 和 `StructuralParseOptions` 均继承自共享的 `ParserBaseOptions`（`handlers`、`allowForms`、`depthLimit`、
`syntax`、`tagName`）。传入 `handlers` 时，标签识别和形态门控与 `parseRichText` 完全一致。省略时（本包默认行为），所有标签和所有形态均被接受。

与 `parseRichText` 的差异（特性，非缺陷）：

|          | `parseRichText`         | `parseStructural`         |
|----------|-------------------------|---------------------------|
| 标签识别     | 共享（`ParserBaseOptions`） | 共享（`ParserBaseOptions`）   |
| 形态门控     | 共享                      | 共享                        |
| 换行归一化    | `mode: "render"` 裁剪     | 始终保留                      |
| 转义表示     | 根级反转义，栈内保留原始            | 统一产出 `escape` 结构节点        |
| 管道符 `\|` | 纯文本（由 handler 后处理）      | 参数区产出 `separator`；正文中为纯文本 |
| 错误上报     | `onError` 回调            | 静默降级                      |
| 输出类型     | `TextToken[]`           | `StructuralNode[]`        |

`parseStructural` 在未传 override 时继承外部 `withSyntax` / `withTagNameConfig` 闭包上下文，可在自定义解析管线中自由组合。

---

## 更新日志

### 0.1.0

- 首次发布
- 编程式分词器：`tokenizeRichText`、`tokenizeRichTextLines`
- Shiki TextMate 语法工厂：`createRichTextGrammar`
- 预置主题 token 配色：`RICH_TEXT_TOKEN_COLORS`
- 可配置 9 色方案：`DEFAULT_COLORS` / `resolveColors`
- 底层渲染器：`renderStructuralTree`
- 工具函数：`colorizeEscapes`、`splitTokensByLineBreak`、`pushToken`
- 从 `yume-dsl-rich-text` 重导出 `parseStructural`、`StructuralNode`

---

## 许可证

[MIT](./LICENSE)
