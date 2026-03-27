import assert from "node:assert/strict";

const mod = await import("../dist/index.js");
const richText = await import("yume-dsl-rich-text");

const {
  createTokenizer,
  tokenizeRichText,
  tokenizeRichTextLines,
} = mod;
const { createSyntax, withSyntax } = richText;

const normalize = (tokens) =>
  tokens.map((token) => ({
    content: token.content,
    color: token.color,
    fontStyle: token.fontStyle,
  }));

const joinTokenText = (tokens) => tokens.map((token) => token.content).join("");

const syntax = {
  tagPrefix: "@@",
  tagOpen: "<<",
  tagClose: ">>",
  tagDivider: "||",
  endTag: ">>@@",
  rawOpen: ">>%",
  blockOpen: ">>*",
  rawClose: "%end@@",
  blockClose: "*end@@",
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

withSyntax(createSyntax(syntax), () => {
  assert.deepEqual(
    normalize(tokenizeRichText("@@link<<a || b>>@@")),
    [
      { content: "@@", color: "#CF222E", fontStyle: "bold" },
      { content: "link", color: "#0550AE", fontStyle: "bold" },
      { content: "<<", color: "#6639BA", fontStyle: undefined },
      { content: "a ", color: "#0A3069", fontStyle: undefined },
      { content: "||", color: "#953800", fontStyle: "bold" },
      { content: " b", color: "#0A3069", fontStyle: undefined },
      { content: ">>", color: "#6639BA", fontStyle: undefined },
      { content: "@@", color: "#CF222E", fontStyle: "bold" },
    ],
  );

  const source = "@@code<<ts>>%\nconst x = 1;\n%end@@";
  const lineTokens = tokenizeRichTextLines(source);
  assert.equal(lineTokens.length, 3);
  assert.equal(
    lineTokens.map((line) => joinTokenText(line)).join("\n"),
    joinTokenText(tokenizeRichText(source)),
  );
});

console.log("PASS createTokenizer defaults/overrides");
console.log("PASS withSyntax closure inheritance");
console.log("PASS tokenizeRichTextLines consistency");
