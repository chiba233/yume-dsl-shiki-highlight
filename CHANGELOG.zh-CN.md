# 更新日志

### 1.0.2

- 更新文档

### 1.0.1

- `tokenizeRichText` / `tokenizeRichTextLines` 现在会将显式传入的 `options.syntax` 贯穿到完整渲染链路
- `renderStructuralTree(..., syntax?)` 优先使用传入的 `syntax`，未传时回退到 `DEFAULT_SYNTAX`
- 内部高亮流程不再依赖 ambient `withSyntax` 状态
- 补充显式自定义语法分词的 smoke 测试
- README 示例改为主推 `createEasySyntax(...)` 作为自定义语法构造方式

### 1.0.0

- 稳定版发布 — API 已定型
- 将 `yume-dsl-rich-text` 依赖升级至 `^1.0.1`
- 将 `typescript` 开发依赖从 `^5.7.0` 升级至 `^6.0.2`

### 0.1.0

- 首次发布
- `createTokenizerFromParser` — 从 parser 配置创建 tokenizer（推荐入口）
- `createTokenizer` — 独立 tokenizer，绑定默认选项
- `TokenizeOptions extends ParserBaseOptions` — `handlers`/`allowForms`/`syntax`/`tagName` 透传给 `parseStructural`
- 无状态函数：`tokenizeRichText`、`tokenizeRichTextLines`
- Shiki TextMate 语法工厂：`createRichTextGrammar`，支持 `tagName` 校验和 `anyTagPattern` 覆盖
- 预置主题 token 配色：`RICH_TEXT_TOKEN_COLORS`
- 可配置 9 色方案：`DEFAULT_COLORS` / `resolveColors`
- 底层渲染器：`renderStructuralTree`
- 工具函数：`escapeRegex`、`colorizeEscapes`、`splitTokensByLineBreak`、`pushToken`
