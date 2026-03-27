import type { GrammarTagConfig } from "./types.js";
import { DEFAULT_COLORS } from "./colors.js";

const escapeRegex = (value: string): string => value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");

/** Never-match pattern for empty tag lists — prevents accidental zero-width matches. */
const NEVER_MATCH = "(?!)";

const tagAlternation = (tags: readonly string[]): string =>
  tags.length === 0 ? NEVER_MATCH : tags.map(escapeRegex).join("|");

const ANY_TAG_PATTERN = "[a-zA-Z_][a-zA-Z0-9_-]*";

const createCaptureMap = (
  ...entries: Array<[number, string]>
): Record<number, { name: string }> =>
  Object.fromEntries(entries.map(([index, name]) => [index, { name }]));

const SCOPE = "yume-rich-text-dsl";

/**
 * Create a Shiki-compatible TextMate grammar for the rich-text DSL.
 *
 * @param tagConfig - Optional tag name lists. If omitted, matches any valid tag name.
 * @returns A `LanguageRegistration`-shaped object (compatible with `shiki/types`).
 */
export const createRichTextGrammar = (tagConfig?: GrammarTagConfig) => {
  const allPattern = tagConfig ? tagAlternation(tagConfig.allTags) : ANY_TAG_PATTERN;
  const rawPattern = tagConfig ? tagAlternation(tagConfig.rawTags) : ANY_TAG_PATTERN;
  const blockPattern = tagConfig ? tagAlternation(tagConfig.blockTags) : ANY_TAG_PATTERN;

  return {
    name: "yume-rich-text-dsl",
    displayName: "Yume Rich Text DSL",
    scopeName: `source.${SCOPE}`,
    aliases: ["rich-text-dsl", "rich-dsl", "dsl-rich", "yume-rich-dsl"],
    patterns: [
      { include: "#raw-tag" },
      { include: "#block-tag" },
      { include: "#inline-tag" },
      { include: "#escape-sequence" },
    ],
    repository: {
      "escape-sequence": {
        match: "\\\\(?:\\\\|\\(|\\)|\\||\\$\\$|\\*end\\$\\$|%end\\$\\$)",
        name: `constant.character.escape.${SCOPE}`,
      },
      "pipe-divider": {
        match: "\\|",
        name: `punctuation.separator.arguments.${SCOPE}`,
      },
      "tag-name": {
        match: allPattern,
        name: `entity.name.tag.${SCOPE}`,
      },
      "inline-tag": {
        begin: `(\\$\\$)(${allPattern})(\\()`,
        beginCaptures: createCaptureMap(
          [1, `punctuation.definition.tag.begin.${SCOPE}`],
          [2, `entity.name.tag.${SCOPE}`],
          [3, `punctuation.section.arguments.begin.${SCOPE}`],
        ),
        end: "(\\))(\\$\\$)",
        endCaptures: createCaptureMap(
          [1, `punctuation.section.arguments.end.${SCOPE}`],
          [2, `punctuation.definition.tag.end.${SCOPE}`],
        ),
        patterns: [
          { include: "#escape-sequence" },
          { include: "#inline-tag" },
          { include: "#paren-group" },
          { include: "#pipe-divider" },
        ],
      },
      "paren-group": {
        begin: "(\\()",
        beginCaptures: createCaptureMap([1, `punctuation.section.group.begin.${SCOPE}`]),
        end: "(\\))",
        endCaptures: createCaptureMap([1, `punctuation.section.group.end.${SCOPE}`]),
        patterns: [
          { include: "#escape-sequence" },
          { include: "#inline-tag" },
          { include: "#paren-group" },
          { include: "#pipe-divider" },
        ],
      },
      "raw-tag": {
        begin: `(\\$\\$)(${rawPattern})(\\()((?:\\\\.|[^\\\\)])*)(\\))(%)\\n?`,
        beginCaptures: createCaptureMap(
          [1, `punctuation.definition.tag.begin.${SCOPE}`],
          [2, `entity.name.tag.raw.${SCOPE}`],
          [3, `punctuation.section.arguments.begin.${SCOPE}`],
          [5, `punctuation.section.arguments.end.${SCOPE}`],
          [6, `keyword.operator.raw.open.${SCOPE}`],
        ),
        end: "^(%)(end)(\\$\\$)$",
        endCaptures: createCaptureMap(
          [1, `keyword.operator.raw.close.${SCOPE}`],
          [2, `keyword.control.flow.end.${SCOPE}`],
          [3, `punctuation.definition.tag.end.${SCOPE}`],
        ),
        patterns: [
          { include: "#escape-sequence" },
          { include: "#inline-tag" },
          { include: "#paren-group" },
          { include: "#pipe-divider" },
          { match: "^.*$", name: `string.unquoted.block.${SCOPE}` },
        ],
      },
      "block-tag": {
        begin: `(\\$\\$)(${blockPattern})(\\()((?:\\\\.|[^\\\\)])*)(\\))(\\*)\\n?`,
        beginCaptures: createCaptureMap(
          [1, `punctuation.definition.tag.begin.${SCOPE}`],
          [2, `entity.name.tag.block.${SCOPE}`],
          [3, `punctuation.section.arguments.begin.${SCOPE}`],
          [5, `punctuation.section.arguments.end.${SCOPE}`],
          [6, `keyword.operator.block.open.${SCOPE}`],
        ),
        end: "^(\\*)(end)(\\$\\$)$",
        endCaptures: createCaptureMap(
          [1, `keyword.operator.block.close.${SCOPE}`],
          [2, `keyword.control.flow.end.${SCOPE}`],
          [3, `punctuation.definition.tag.end.${SCOPE}`],
        ),
        patterns: [
          { include: "#escape-sequence" },
          { include: "#inline-tag" },
          { include: "#paren-group" },
          { include: "#pipe-divider" },
          { include: "#raw-tag" },
          { include: "#block-tag" },
        ],
      },
    },
  } as const;
};

/** The `scopeName` used by the generated grammar. */
export const RICH_TEXT_SCOPE_NAME = `source.${SCOPE}` as const;

/**
 * Token color entries for Shiki themes.
 *
 * Merge these into your theme's `tokenColors` array to get DSL highlighting
 * that matches the default {@link DEFAULT_COLORS} palette.
 *
 * @example
 * ```ts
 * const theme = { ...baseTheme, tokenColors: [...baseTheme.tokenColors, ...RICH_TEXT_TOKEN_COLORS] };
 * ```
 */
export const RICH_TEXT_TOKEN_COLORS = [
  {
    scope: [
      `entity.name.tag.${SCOPE}`,
      `entity.name.tag.raw.${SCOPE}`,
      `entity.name.tag.block.${SCOPE}`,
    ],
    settings: { foreground: DEFAULT_COLORS.tagName, fontStyle: "bold" },
  },
  {
    scope: [
      `punctuation.definition.tag.begin.${SCOPE}`,
      `punctuation.definition.tag.end.${SCOPE}`,
    ],
    settings: { foreground: DEFAULT_COLORS.punct, fontStyle: "bold" },
  },
  {
    scope: [
      `punctuation.section.arguments.begin.${SCOPE}`,
      `punctuation.section.arguments.end.${SCOPE}`,
      `punctuation.section.group.begin.${SCOPE}`,
      `punctuation.section.group.end.${SCOPE}`,
    ],
    settings: { foreground: DEFAULT_COLORS.bracket },
  },
  {
    scope: [`punctuation.separator.arguments.${SCOPE}`],
    settings: { foreground: DEFAULT_COLORS.separator, fontStyle: "bold" },
  },
  {
    scope: [
      `keyword.operator.raw.open.${SCOPE}`,
      `keyword.operator.raw.close.${SCOPE}`,
      `keyword.operator.block.open.${SCOPE}`,
      `keyword.operator.block.close.${SCOPE}`,
    ],
    settings: { foreground: DEFAULT_COLORS.operator, fontStyle: "bold" },
  },
  {
    scope: [`keyword.control.flow.end.${SCOPE}`],
    settings: { foreground: DEFAULT_COLORS.end, fontStyle: "bold" },
  },
  {
    scope: [`string.unquoted.block.${SCOPE}`],
    settings: { foreground: DEFAULT_COLORS.contentText },
  },
  {
    scope: [`constant.character.escape.${SCOPE}`],
    settings: { foreground: DEFAULT_COLORS.escape },
  },
] as const;
