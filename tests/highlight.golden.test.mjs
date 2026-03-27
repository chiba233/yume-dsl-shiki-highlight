import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "fixtures", "highlight.golden.json");
const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));

const mod = await import("../dist/index.js");
const {
  RICH_TEXT_SCOPE_NAME,
  createRichTextGrammar,
  createTokenizer,
  tokenizeRichText,
  tokenizeRichTextLines,
} = mod;

const normalizeToken = (token) => ({
  content: token.content,
  color: token.color ?? null,
  fontStyle: token.fontStyle ?? null,
});

const normalizeTokens = (tokens) => tokens.map(normalizeToken);
const normalizeLines = (lines) => lines.map((line) => normalizeTokens(line));

for (const testCase of fixture.tokenCases) {
  const actual = testCase.options
    ? normalizeTokens(
        createTokenizer(testCase.options).tokenize(testCase.input, testCase.overrideOptions),
      )
    : normalizeTokens(tokenizeRichText(testCase.input));
  assert.deepEqual(actual, testCase.expected, `token golden mismatch: ${testCase.name}`);
  console.log(`PASS golden token: ${testCase.name}`);
}

for (const testCase of fixture.lineCases) {
  const actual = normalizeLines(tokenizeRichTextLines(testCase.input));
  assert.deepEqual(actual, testCase.expected, `line golden mismatch: ${testCase.name}`);
  console.log(`PASS golden lines: ${testCase.name}`);
}

assert.equal(RICH_TEXT_SCOPE_NAME, "source.yume-rich-text-dsl");
console.log("PASS grammar scope constant");

const emptyGrammar = createRichTextGrammar({ allTags: [], rawTags: [], blockTags: [] });
assert.match(emptyGrammar.repository["inline-tag"].begin, /\(\?!\)/);
assert.match(emptyGrammar.repository["raw-tag"].begin, /\(\?!\)/);
assert.match(emptyGrammar.repository["block-tag"].begin, /\(\?!\)/);
console.log("PASS grammar empty-tag never-match");
