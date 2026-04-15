# 更新日志

### 2.1.3

- **修复：inline 关闭符分词严格遵循 `syntax.endTag`**
  - 渲染器不再假设 inline 关闭符恒等于 `tagClose + tagPrefix`。
  - 对非 shorthand inline 标签，关闭符 token 现在与 `syntax.endTag` 完全一致。
  - 修复了自定义语法中 `endTag` 不等于 `tagClose + tagPrefix`（例如 `endTag: ">"`）时的高亮偏移漂移问题。
- **测试更新**
  - 新增 smoke 覆盖：当 `endTag === tagClose` 时，token 重组文本必须与源码完全一致。
- 无公共 API 变化

### 2.1.2

- **Grammar：按上下文拆分 escape 规则**
  - 原先单一的 `escape-sequence` 规则拆分为：
    - `args-escape-sequence`
    - `raw-escape-sequence`
    - `block-escape-sequence`
  - inline/括号参数区使用参数区 escape 规则。
  - raw 正文仅高亮 `escape + rawClose`。
  - block 正文仅高亮 `escape + blockClose`。
- **Tokenizer：修复 raw 正文 escape 高亮**
  - `render.ts` 对 `raw.content` 改为使用 raw 作用域 escape 集合（`[rawClose]`）着色，被转义的 raw 闭合符会输出为 escape 颜色 token。
- **测试更新**
  - 新增/更新了被转义 raw 闭合符的 smoke 断言。
  - grammar 仓库键断言同步更新为新的上下文命名。
- 无公共 API 变化

### 2.1.1

- 修复：当自定义语法的 `rawClose` / `blockClose` 不以 `tagPrefix` 结尾时
  （如 `rawClose: "%"`、`blockClose: "*"`），高亮 token 偏移量会逐渐漂移。
  渲染器之前在每个 raw/block 关闭序列后硬编码追加 `tagPrefix`；现在会
  正确拆解关闭 token，仅在关闭 token 确实以 `tagPrefix` 结尾时才追加后缀
- 修复：简写 inline 标签（`implicitInlineShorthand`）的高亮 token 偏移量漂移。
  渲染器之前对每个 inline 标签都输出 `tagPrefix` 前后缀，但简写标签
  （`italic<...>` 而非 `=italic<...>=`）源码中没有前后缀。渲染器现在会
  检查 `implicitInlineShorthand` 标志并跳过 `tagPrefix`

### 2.1.0

- 新增：`TokenizeOptions.implicitInlineShorthand` —— 将 `implicitInlineShorthand`
  选项转发给底层 structural parser，使 inline 参数内的 `name(...)` 简写语法能被
  正确解析和高亮。接受 `boolean | readonly string[]`，与 parser 的三级开关一致
- 优化：`renderTokens` 现在有条件地将 `implicitInlineShorthand` 传递给
  `parseStructural`，保证高亮流水线与 parser 行为同步
- 文档：README 和 GUIDE 已更新，在 `parserOptions` / `TokenizeOptions`
  字段列表中加入 `implicitInlineShorthand`
- 依赖：`yume-dsl-rich-text` 版本范围提升至 `^1.3.0`

### 2.0.1

- 修复：深层嵌套高亮爆栈——`renderStructuralTree` 在病理级 inline 深嵌套
  （例如 5000 层）下不再崩溃。结构树渲染从直接递归改为显式栈迭代，
  高亮生成现在与 `yume-dsl-rich-text` 的 structural parser 一样，仅受堆内存限制

### 2.0.0

- **破坏性变更：** `colorizeEscapes(text, valueColor, escapeColor, syntax)` 的 `syntax` 参数
  现在是**必填**（`SyntaxConfig`）。之前为可选，省略时会回退到已弃用的 ambient `getSyntax()` 状态。
  需要默认语法时传 `createSyntax()` 即可
- **破坏性变更：** `renderStructuralTree(nodes, colors, syntax, textColor?)` 的 `syntax` 现在
  是**必填**（`SyntaxConfig`），且移到第 3 个参数（在 `textColor` 之前）。
  之前 `syntax` 是第 4 个可选参数（`Partial<SyntaxInput>`）。
  需要默认语法时传 `createSyntax()` 即可
- 新增：`GrammarTagConfig.tagName` —— 为 grammar 校验覆盖标签名字符规则。标签名在生成 regex
  之前会按规则逐字符校验；无效名称直接抛出描述性错误，不再产出坏掉的 grammar
- 新增：`GrammarTagConfig.anyTagPattern` —— 在未提供特定标签列表时覆盖匹配任意标签名的回退 regex。
  保持 grammar 的"全匹配"兜底与自定义 `tagName` 规则同步（默认 `[a-zA-Z_][a-zA-Z0-9_-]*`）
- 新增：内部 `toSafeTagPattern` 校验器 —— 逐字符检查标签名是否符合 `TagNameConfig` 规则，
  并通过 `escapeRegex` 转义 regex 元字符
- 优化：所有用户提供的标签名在用于 grammar 前均做 regex 转义，防止 `.`、`*` 等元字符破坏生成的正则

### 1.0.3

- `createRichTextGrammar(...)` 现在支持 `tagConfig.syntax`
- Shiki / TextMate grammar 生成现在会跟随 parser 的自定义分隔符，而不再默认假设 `$$` / `()` / `%end$$` / `*end$$`
- 补充了自定义语法 grammar 生成的 smoke 覆盖和 README 示例

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
