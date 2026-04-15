import assert from "node:assert/strict";

const mod = await import("../dist/index.js");
const richText = await import("yume-dsl-rich-text");

const {
  createTokenizer,
  createTokenizerFromParser,
  tokenizeRichText,
  tokenizeRichTextLines,
  createRichTextGrammar,
  escapeRegex,
} = mod;
const { createSimpleInlineHandlers, createSimpleRawHandlers } = richText;

const normalize = (tokens) =>
  tokens.map((token) => ({
    content: token.content,
    color: token.color,
    fontStyle: token.fontStyle,
  }));

const joinTokenText = (tokens) => tokens.map((token) => token.content).join("");

// ── createTokenizer defaults/overrides ──

const syntax = {
  tagPrefix: "@@",
  tagOpen: "<<",
  tagClose: ">>",
  tagDivider: "||",
  endTag: ">>@@",
  rawOpen: ">>%",
  blockOpen: ">>*",
  rawClose: "%fin@@",
  blockClose: "*fin@@",
  escapeChar: "~",
};

const tokenizer = createTokenizer({
  colors: {
    tagName: "#111111",
    separator: "#222222",
  },
  depthLimit: 7,
});

assert.deepEqual(
  normalize(tokenizer.tokenize("@@link<<a || b>>@@", { colors: { separator: "#333333" } })),
  normalize(
    tokenizeRichText("@@link<<a || b>>@@", {
      colors: {
        tagName: "#111111",
        separator: "#333333",
      },
      depthLimit: 7,
    }),
  ),
);
console.log("PASS createTokenizer defaults/overrides");

// ── explicit syntax option should not require withSyntax ambient context ──

{
  const explicitSyntaxTokens = tokenizeRichText("@@code<<ts>>%\na ~%fin@@ b\n%fin@@", {
    syntax,
  });
  assert.equal(joinTokenText(explicitSyntaxTokens), "@@code<<ts>>%\na ~%fin@@ b\n%fin@@");
  const rawEnd = explicitSyntaxTokens.find((t) => t.content === "fin");
  assert.ok(rawEnd, "explicit syntax path should derive raw end word");
  assert.equal(rawEnd.fontStyle, "bold");
  const operatorTokens = explicitSyntaxTokens.filter((t) => t.content === "%");
  assert.equal(operatorTokens.length, 2, "explicit syntax path should emit both raw operators");
  const rawEscape = explicitSyntaxTokens.find((t) => t.content === "~%fin@@");
  assert.ok(rawEscape, "raw escaped close marker should be emitted as a dedicated token");
  assert.equal(rawEscape.color, "#116329");
}
console.log("PASS explicit syntax option without withSyntax");

// ── explicit syntax drives tokenization and end-word derivation ──

assert.deepEqual(normalize(tokenizeRichText("@@link<<a || b>>@@", { syntax })), [
  { content: "@@", color: "#CF222E", fontStyle: "bold" },
  { content: "link", color: "#0550AE", fontStyle: "bold" },
  { content: "<<", color: "#6639BA", fontStyle: undefined },
  { content: "a ", color: "#0A3069", fontStyle: undefined },
  { content: "||", color: "#953800", fontStyle: "bold" },
  { content: " b", color: "#0A3069", fontStyle: undefined },
  { content: ">>", color: "#6639BA", fontStyle: undefined },
  { content: "@@", color: "#CF222E", fontStyle: "bold" },
]);

const source = "@@code<<ts>>%\nconst x = 1;\n%fin@@";
const lineTokens = tokenizeRichTextLines(source, { syntax });
assert.equal(lineTokens.length, 3);
assert.equal(
  lineTokens.map((line) => joinTokenText(line)).join("\n"),
  joinTokenText(tokenizeRichText(source, { syntax })),
);

// inline close should follow syntax.endTag exactly (no inferred +tagPrefix)
const sameCloseSyntax = {
  ...syntax,
  tagPrefix: "=",
  tagOpen: "<",
  tagClose: ">",
  tagDivider: "|",
  endTag: ">",
  rawOpen: ">%",
  blockOpen: ">*",
  rawClose: "%",
  blockClose: "*",
  escapeChar: "~",
};
const sameCloseSource = "=bold<ok>";
const sameCloseTokens = tokenizeRichText(sameCloseSource, { syntax: sameCloseSyntax });
assert.equal(joinTokenText(sameCloseTokens), sameCloseSource);
const punctEqualsCount = sameCloseTokens.filter(
  (t) => t.content === "=" && t.fontStyle === "bold",
).length;
assert.equal(
  punctEqualsCount,
  1,
  "inline close should not emit inferred tagPrefix token when endTag is just tagClose",
);

// rawEndWord derived from custom rawClose "%fin@@" → "fin"
const flat = tokenizeRichText(source, { syntax });
const rawEndToken = flat.find((t) => t.content === "fin");
assert.ok(rawEndToken, "rawEndWord should be 'fin' from custom rawClose");
assert.equal(rawEndToken.color, "#8250DF");

// blockEndWord derived from custom blockClose "*stop@@" → "stop" (different from raw)
const blockSyntax = {
  ...syntax,
  rawClose: "%done@@",
  blockClose: "*stop@@",
};
const blockSource = "@@info<<title>>*\ncontent\n*stop@@";
const blockFlat = tokenizeRichText(blockSource, { syntax: blockSyntax });
const blockEndToken = blockFlat.find((t) => t.content === "stop");
assert.ok(blockEndToken, "blockEndWord should be 'stop' from custom blockClose");
assert.equal(blockEndToken.color, "#8250DF");

// raw uses "done", not "stop"
const rawSource2 = "@@code<<ts>>%\ncode\n%done@@";
const rawFlat2 = tokenizeRichText(rawSource2, { syntax: blockSyntax });
const rawEndToken2 = rawFlat2.find((t) => t.content === "done");
assert.ok(rawEndToken2, "rawEndWord should be 'done', independent from blockEndWord");

console.log("PASS explicit syntax + independent raw/block endWord");

// ── tokenizeRichTextLines consistency ──

const linesSource = "$$code(ts)%\nconst x = 1;\n%end$$";
const lines = tokenizeRichTextLines(linesSource);
assert.equal(lines.length, 3);
assert.equal(
  lines.map((line) => joinTokenText(line)).join("\n"),
  joinTokenText(tokenizeRichText(linesSource)),
);
console.log("PASS tokenizeRichTextLines consistency");

// ── TokenizeOptions transparently forwards handlers/allowForms ──

const handlers = {
  ...createSimpleInlineHandlers(["bold"]),
  ...createSimpleRawHandlers(["code"]),
};

// With handlers: "bold" (inline) recognized; "code" (raw-only) rejects inline syntax
const gatedTokens = tokenizeRichText("$$bold(ok)$$ $$code(x)$$", { handlers });
const tagNames = gatedTokens.filter((t) => t.fontStyle === "bold" && t.color === "#0550AE").map((t) => t.content);
assert.ok(tagNames.includes("bold"), "bold should be highlighted as tag");
assert.ok(!tagNames.includes("code"), "raw-only tag should NOT be highlighted with inline syntax");
console.log("PASS TokenizeOptions forwards handlers (tag gating)");

// allowForms: only inline → raw syntax degrades
const inlineOnlyTokens = tokenizeRichText("$$code(ts)%\nconst x=1;\n%end$$", {
  handlers,
  allowForms: ["inline"],
});
const hasCodeTag = inlineOnlyTokens.some((t) => t.content === "code" && t.fontStyle === "bold");
assert.ok(!hasCodeTag, "raw form should degrade when allowForms excludes raw");
console.log("PASS TokenizeOptions forwards allowForms");

// implicitInlineShorthand: true -> inline shorthand should be highlighted as tags
{
  const shorthandSource = "$$bold(bold(x))$$";
  const shorthandHandlers = createSimpleInlineHandlers(["bold"]);
  const shorthandTokens = tokenizeRichText(shorthandSource, {
    handlers: shorthandHandlers,
    implicitInlineShorthand: true,
  });
  const shorthandBoldTags = shorthandTokens.filter(
    (t) => t.content === "bold" && t.fontStyle === "bold" && t.color === "#0550AE",
  );

  // Compatibility: when upstream parser does not support shorthand yet,
  // only the outer tag can be recognized.
  const tree = richText.parseStructural(shorthandSource, {
    handlers: shorthandHandlers,
    implicitInlineShorthand: true,
  });
  let inlineBoldCount = 0;
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === "inline" && node.tag === "bold") inlineBoldCount++;
    if (node.type === "inline") {
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
    } else if (node.type === "raw") {
      for (let i = node.args.length - 1; i >= 0; i--) stack.push(node.args[i]);
    } else if (node.type === "block") {
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
      for (let i = node.args.length - 1; i >= 0; i--) stack.push(node.args[i]);
    }
  }

  const expectedTagCount = inlineBoldCount >= 2 ? 2 : 1;
  assert.equal(shorthandBoldTags.length, expectedTagCount, "implicit shorthand highlight should match parser support");
}
console.log("PASS TokenizeOptions forwards implicitInlineShorthand");

// ── createTokenizerFromParser ──

const parserOpts = { handlers, allowForms: ["inline"] };
const hlFromParser = createTokenizerFromParser(parserOpts, { tagName: "#FF0000" });

const parserTokens = hlFromParser.tokenize("$$bold(ok)$$ $$code(ts)%\nx\n%end$$");
const boldTag = parserTokens.find((t) => t.content === "bold");
assert.ok(boldTag, "bold should exist");
assert.equal(boldTag.color, "#FF0000", "custom color should be applied");

const codeTag = parserTokens.find((t) => t.content === "code" && t.fontStyle === "bold");
assert.ok(!codeTag, "raw-only tag should degrade with allowForms=['inline']");

// tokenizeLines also works
const parserLines = hlFromParser.tokenizeLines("$$bold(ok)$$\nplain");
assert.equal(parserLines.length, 2);
console.log("PASS createTokenizerFromParser");

// ── Grammar: tagName validation ──

assert.throws(
  () => createRichTextGrammar({ allTags: ["valid", ""], rawTags: [], blockTags: [] }),
  /Invalid tag name/,
);
assert.throws(
  () => createRichTextGrammar({ allTags: ["123bad"], rawTags: [], blockTags: [] }),
  /Invalid tag name/,
);
// Invalid mid-character (space in tag name)
assert.throws(
  () => createRichTextGrammar({ allTags: ["bad tag"], rawTags: [], blockTags: [] }),
  /Invalid tag name/,
);
// With custom tagName that allows digits at start
assert.doesNotThrow(() =>
  createRichTextGrammar({
    allTags: ["123ok"],
    rawTags: [],
    blockTags: [],
    tagName: { isTagStartChar: (c) => /[a-zA-Z_0-9]/.test(c) },
  }),
);
// Custom tagName allowing regex metachar (dot) → escape must protect the pattern
{
  const dotGrammar = createRichTextGrammar({
    allTags: ["ns.tag"],
    rawTags: [],
    blockTags: [],
    tagName: {
      isTagStartChar: (c) => /[a-zA-Z_]/.test(c),
      isTagChar: (c) => /[a-zA-Z0-9_.]/.test(c),
    },
  });
  // The dot must be escaped to \. in the regex, not left as wildcard
  assert.match(dotGrammar.repository["inline-tag"].begin, /ns\\\.tag/);
}
console.log("PASS grammar tagName validation + escape");

// ── Grammar: custom syntax is reflected in delimiters ──

{
  const customSyntaxGrammar = createRichTextGrammar({
    allTags: ["bold"],
    rawTags: ["code"],
    blockTags: ["info"],
    syntax,
  });
  assert.match(customSyntaxGrammar.repository["inline-tag"].begin, /@@/);
  assert.match(customSyntaxGrammar.repository["inline-tag"].begin, /<</);
  assert.equal(customSyntaxGrammar.repository["inline-tag"].end, "(>>)(@@)");
  assert.equal(customSyntaxGrammar.repository["pipe-divider"].match, "\\|\\|");
  assert.ok(customSyntaxGrammar.repository["args-escape-sequence"].match.startsWith("~(?:"));
  assert.ok(customSyntaxGrammar.repository["raw-tag"].begin.includes("(>>)(%)"));
  assert.equal(customSyntaxGrammar.repository["raw-tag"].end, "^(%)(fin)(@@)$");
  assert.ok(customSyntaxGrammar.repository["block-tag"].begin.includes("(>>)(\\*)"));
  assert.equal(customSyntaxGrammar.repository["block-tag"].end, "^(\\*)(fin)(@@)$");
}
console.log("PASS grammar custom syntax");

// ── Grammar: anyTagPattern override ──

const customGrammar = createRichTextGrammar({
  allTags: ["bold"],
  rawTags: [],
  blockTags: [],
  anyTagPattern: "[a-zA-Z_0-9][a-zA-Z0-9_:-]*",
});
// allTags is provided → uses tag list, not anyTagPattern for inline
assert.match(customGrammar.repository["inline-tag"].begin, /bold/);
// rawTags is empty → uses NEVER_MATCH (not anyTagPattern since tags IS provided)
assert.match(customGrammar.repository["raw-tag"].begin, /\(\?!\)/);
console.log("PASS grammar anyTagPattern override");

// ── Grammar: no tagConfig → uses default anyTagPattern ──

const defaultGrammar = createRichTextGrammar();
assert.match(defaultGrammar.repository["inline-tag"].begin, /\[a-zA-Z_\]/);
console.log("PASS grammar default anyTagPattern");

// ── escapeRegex ──

assert.equal(escapeRegex("hello"), "hello");
assert.equal(escapeRegex("a.b*c"), "a\\.b\\*c");
assert.equal(escapeRegex("ns:tag"), "ns:tag"); // colon is not a regex metachar
console.log("PASS escapeRegex");
