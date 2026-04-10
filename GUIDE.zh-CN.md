[English](./README.md) | **中文**

# yume-dsl-shiki-highlight

### **[▶ 在线体验——输入 DSL，即时查看 token 树](https://demo.qwwq.org/)**

**实时编辑标签、开关 handler、边打字边看 token 树更新。**

Shiki 代码高亮插件

---

<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />

[![npm](https://img.shields.io/npm/v/yume-dsl-shiki-highlight)](https://www.npmjs.com/package/yume-dsl-shiki-highlight)
[![GitHub](https://img.shields.io/badge/GitHub-chiba233%2Fyume--dsl--shiki--highlight-181717?logo=github)](https://github.com/chiba233/yume-dsl-shiki-highlight)
[![CI](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml/badge.svg)](https://github.com/chiba233/yume-dsl-shiki-highlight/actions/workflows/publish-yume-dsl-shiki-highlight.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Contributing](https://img.shields.io/badge/贡献指南-guide-blue.svg)](./CONTRIBUTING.zh-CN.md)
[![Security](https://img.shields.io/badge/安全策略-policy-red.svg)](./SECURITY.md)

[`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL) 的轻量语法高亮库。

**核心 API 已稳定。** 后续更新以向后兼容为优先；如有破坏性变更，将在主版本号升级时附带明确的迁移说明。

两种模式：

- **编程式** — `tokenizeRichText` 返回带颜色的 token 数组，可渲染到任何目标（终端、canvas、自定义 UI）。
- **Shiki / TextMate** — `createRichTextGrammar` 生成可直接用于 [Shiki](https://shiki.style/) 或任何 TextMate
  兼容编辑器的语法定义。

---

## 目录

- [生态](#生态)
- [安装](#安装)
- [快速开始](#快速开始)
    - [配合 createParser（推荐）](#配合-createparser推荐)
    - [独立使用](#独立使用)
    - [Shiki 集成](#shiki-集成)
- [API — 分词器](#api--分词器)
    - [createTokenizerFromParser](#createtokenizerfromparserparseroptions-colors)
    - [createTokenizer](#createtokenizerdefaults)
    - [tokenizeRichText / tokenizeRichTextLines](#tokenizerichtexttext-options)
    - [renderStructuralTree](#renderstructuraltreenodes-colors-syntax-textcolor)
- [API — Shiki 语法](#api--shiki-语法)
    - [createRichTextGrammar](#createrichtextgrammartagconfig)
    - [RICH_TEXT_TOKEN_COLORS](#rich_text_token_colors)
    - [RICH_TEXT_SCOPE_NAME](#rich_text_scope_name)
- [API — 工具函数](#api--工具函数)
    - [escapeRegex](#escaperegexvalue)
    - [colorizeEscapes](#colorizeescapestext-valuecolor-escapecolor-syntax)
    - [splitTokensByLineBreak](#splittokensbylinebreaktokens)
    - [pushToken](#pushtokentokens-content-color-fontstyle)
- [配色](#配色)
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

| 包                                                                            | 角色                                   |
|------------------------------------------------------------------------------|--------------------------------------|
| [`yume-dsl-rich-text`](https://github.com/chiba233/yumeDSL)                  | 解析器 — 文本到 token 树                    |
| [`yume-dsl-token-walker`](https://github.com/chiba233/yume-dsl-token-walker) | 解释器 — token 树到输出节点                   |
| **`yume-dsl-shiki-highlight`**                                               | 语法高亮 — 彩色 token 或 TextMate 语法（本包）    |
| [`yume-dsl-markdown-it`](https://github.com/chiba233/yume-dsl-markdown-it)   | markdown-it 插件 — Markdown 中渲染 DSL 标签 |

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

### 配合 `createParser`（推荐）

同一份配置对象可同时驱动解析和高亮。

```ts
import {createParser, createSimpleInlineHandlers} from "yume-dsl-rich-text";
import {createTokenizerFromParser} from "yume-dsl-shiki-highlight";

const parserOpts = {
    handlers: createSimpleInlineHandlers(["bold", "code", "link"]),
};

const dsl = createParser(parserOpts);
const hl = createTokenizerFromParser(parserOpts, {tagName: "#0550AE"});

dsl.parse(text);        // TextToken[]
hl.tokenize(text);      // HighlightToken[]
hl.tokenizeLines(text); // 同一套规则，按行拆分
```

### 独立使用

不依赖 parser，高亮所有标签——适合编辑器预览、playground、文档展示。

```ts
import {tokenizeRichText, tokenizeRichTextLines} from "yume-dsl-shiki-highlight";

// 单行 → 扁平 token 数组
const tokens = tokenizeRichText("$$bold(hello)$$ world");

// 多行（跨行 raw/block 正确处理）
const lines = tokenizeRichTextLines("$$code(ts)%\nconst x = 1;\n%end$$");
```

如果使用自定义语法，推荐先用 `yume-dsl-rich-text` 的 `createEasySyntax(...)` 生成，再显式传入 `options.syntax`：

```ts
import {createEasySyntax} from "yume-dsl-rich-text";

const syntax = createEasySyntax({
    tagPrefix: "@@",
    tagOpen: "<<",
    tagClose: ">>",
    tagDivider: "||",
    escapeChar: "~",
});

const tokens = tokenizeRichText("@@bold<<hello>>@@", {syntax});
```

或先绑定默认选项：

```ts
import {createTokenizer} from "yume-dsl-shiki-highlight";

const hl = createTokenizer({
    handlers,
    allowForms: ["inline"],
    colors: {tagName: "#FF0000"},
});
hl.tokenize(text);
```

### Shiki 集成

```ts
import {createHighlighterCore} from "shiki/core";
import {createOnigurumaEngine} from "shiki/engine/oniguruma";
import baseTheme from "shiki/themes/github-light-high-contrast.mjs";
import {createEasySyntax} from "yume-dsl-rich-text";
import {createRichTextGrammar, RICH_TEXT_TOKEN_COLORS} from "yume-dsl-shiki-highlight";

const syntax = createEasySyntax({
    tagPrefix: "@@",
    tagOpen: "<<",
    tagClose: ">>",
    tagDivider: "||",
    escapeChar: "~",
});

const grammar = createRichTextGrammar({syntax});  // 使用自定义分隔符匹配任意标签
// 或限定已知标签：
// const grammar = createRichTextGrammar({
//   allTags: ["bold", "code", "link", "info"],
//   rawTags: ["code"],
//   blockTags: ["info", "collapse"],
//   syntax,
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

备注：`createRichTextGrammar({syntax})` 自 `v1.0.3` 起可用。

---

## API — 分词器

### `createTokenizerFromParser(parserOptions, colors?)`

**推荐入口。** 直接从 parser 默认配置创建 tokenizer。

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

`parserOptions` 可包含与 `parseStructural` 相同的结构化选项：
`handlers`、`allowForms`、`implicitInlineShorthand`、`depthLimit`、`syntax`、`tagName`。

若启用了 implicit inline shorthand（inline 参数里的 `name(...)`），请在高亮侧传入
与 parser 相同的 `implicitInlineShorthand`，保证解析与高亮结果一致。

第二个参数 `colors` 会叠加到这些 parser 派生默认值之上。

### `createTokenizer(defaults?)`

创建独立 tokenizer 并绑定默认选项。
解析相关字段会透传给 `parseStructural`。

```ts
function createTokenizer(defaults?: TokenizeOptions): Tokenizer
```

### `tokenizeRichText(text, options?)` / `tokenizeRichTextLines(text, options?)`

无状态一次性函数。
`TokenizeOptions` 继承 `ParserBaseOptions`，可直接传 parser 的门控选项
（包括 `implicitInlineShorthand`）。

```ts
function tokenizeRichText(text: string, options?: TokenizeOptions): HighlightToken[]

function tokenizeRichTextLines(text: string, options?: TokenizeOptions): HighlightToken[][]
```

```ts
interface TokenizeOptions extends ParserBaseOptions {
    colors?: Partial<HighlightColors>;
}
```

### `renderStructuralTree(nodes, colors, syntax, textColor?)`

底层渲染器：将 `StructuralNode[]`（来自 `parseStructural`）转为 `HighlightToken[]`。

适合在结构解析和颜色渲染之间插入你自己的逻辑。
传入与解析时相同的 `syntax`。需要默认语法时传 `createSyntax()` 即可。

```ts
function renderStructuralTree(
    nodes: StructuralNode[],
    colors: HighlightColors,
    syntax: SyntaxConfig,
    textColor?: string,
): HighlightToken[]
```

---

## API — Shiki 语法

### `createRichTextGrammar(tagConfig?)`

生成 Shiki 兼容的 TextMate 语法定义。返回值可直接传入 Shiki 的 `langs` 数组。

- **不传 `tagConfig`**：匹配所有合法标签名
- **传 `tagConfig`**：只匹配列出的标签名
- `tagConfig.syntax` 可让 grammar 跟随 parser 的自定义分隔符（自 `v1.0.3` 起可用）

```ts
function createRichTextGrammar(tagConfig?: GrammarTagConfig): LanguageRegistration
```

```ts
interface GrammarTagConfig {
    allTags: readonly string[];       // inline 形态匹配
    rawTags: readonly string[];       // $$tag(…)% … %end$$
    blockTags: readonly string[];     // $$tag(…)* … *end$$
    syntax?: Partial<SyntaxInput>;    // 可选的自定义语法 token
    tagName?: Partial<TagNameConfig>; // 标签名校验规则
    anyTagPattern?: string;           // 通用匹配时的回退正则
}
```

如果省略 `syntax`，grammar 会使用 `yume-dsl-rich-text` 的默认分隔符。
如果你的 parser 用了 `createEasySyntax(...)` 或手写自定义 token，请把同一份 `syntax` 传进来。

### `RICH_TEXT_TOKEN_COLORS`

预置的 Shiki 主题 `tokenColors` 条目数组。

```ts
const theme = {
    ...baseTheme,
    tokenColors: [...(baseTheme.tokenColors ?? []), ...RICH_TEXT_TOKEN_COLORS],
};
```

### `RICH_TEXT_SCOPE_NAME`

生成语法使用的 TextMate `scopeName`：
`"source.yume-rich-text-dsl"`。

---

## API — 工具函数

### `escapeRegex(value)`

对字符串中所有正则元字符（`|`、`\`、`{`、`}`、`(`、`)`、`[`、`]`、`^`、`$`、`+`、`*`、`?`、`.`、`-`）
进行转义，使其可以安全地作为字面量嵌入正则模式。

这和 `createRichTextGrammar` 内部用的是同一个函数。
适合用于：

- 基于用户可配置的 syntax token 构建自定义 TextMate grammar 模式
- 把 DSL 分隔符（如 `$$`、`)*`、`%end$$`）嵌入正则字符串
- 编写引用 DSL 语法的自定义 Shiki grammar 规则

```ts
function escapeRegex(value: string): string
```

```ts
import {escapeRegex} from "yume-dsl-shiki-highlight";

escapeRegex("hello");    // "hello"       — 无元字符
escapeRegex("$$");       // "\\$\\$"      — 两个 $ 都被转义
escapeRegex("*end$$");   // "\\*end\\$\\$"
escapeRegex("ns.tag");   // "ns\\.tag"    — 点号被转义（不是通配符）
```

### `colorizeEscapes(text, valueColor, escapeColor, syntax)`

扫描 DSL 转义序列（`\(`、`\)`、`\|` 等），将转义部分和普通文本分别着色。

```ts
function colorizeEscapes(text: string, valueColor: string | undefined, escapeColor: string, syntax: SyntaxConfig): HighlightToken[]
```

### `splitTokensByLineBreak(tokens)`

将扁平 `HighlightToken[]` 按 `\n` 边界拆分为每行一个数组。

```ts
function splitTokensByLineBreak(tokens: HighlightToken[]): HighlightToken[][]
```

### `pushToken(tokens, content, color?, fontStyle?)`

向 token 数组追加一项，自动跳过空 `content`。

```ts
function pushToken(tokens: HighlightToken[], content: string, color?: string, fontStyle?: string): void
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

将部分覆盖与 `DEFAULT_COLORS` 合并：

```ts
const colors = resolveColors({tagName: "#FF0000"});
```

---

## 类型定义

```ts
interface HighlightToken {
    content: string;
    color?: string;
    fontStyle?: string;
}

interface TokenizeOptions extends ParserBaseOptions {
    colors?: Partial<HighlightColors>;
    // 继承自 ParserBaseOptions:
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

`StructuralNode`、`StructuralParseOptions`、`ParserBaseOptions`、`TagNameConfig`
从 `yume-dsl-rich-text` 重导出。

---

## 与 `parseStructural` 的关系

`TokenizeOptions` 继承 `ParserBaseOptions`，所以 `handlers`、`allowForms`、`syntax`、
`tagName`、`depthLimit` 会直接透传给 `parseStructural`，不需要额外适配层。

传入 `handlers` 时，标签识别和形态门控与 `parseRichText` 完全一致。省略时，所有标签和所有形态均被接受。

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

---

## 更新日志

另见 [更新日志](./CHANGELOG.zh-CN.md)。

---

## 许可证

[MIT](./LICENSE)
