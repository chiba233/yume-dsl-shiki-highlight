import type { SyntaxConfig, TagNameConfig } from "yume-dsl-rich-text";
import { createSyntax, createTagNameConfig, DEFAULT_TAG_NAME } from "yume-dsl-rich-text";
import type { GrammarTagConfig } from "./types.js";
import { DEFAULT_COLORS } from "./colors.js";

/** Escape regex metacharacters — protects against custom tagName configs that allow `.`, `*`, etc. */
export const escapeRegex = (value: string): string => value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");

/** Never-match pattern for empty tag lists — prevents accidental zero-width matches. */
const NEVER_MATCH = "(?!)";

/**
 * Validate and escape a single tag name into a regex-safe pattern.
 * Throws if the name violates the provided `TagNameConfig` rules.
 */
const toSafeTagPattern = (name: string, config: TagNameConfig): string => {
  if (name.length === 0 || !config.isTagStartChar(name[0])) {
    throw new Error(`Invalid tag name for grammar: "${name}"`);
  }
  for (let i = 1; i < name.length; i++) {
    if (!config.isTagChar(name[i])) {
      throw new Error(`Invalid tag name for grammar: "${name}"`);
    }
  }
  return escapeRegex(name);
};

/** Join normalized tag names into a regex alternation, or `(?!)` for empty lists. */
const tagAlternation = (tags: readonly string[], tagNameConfig: TagNameConfig): string =>
  tags.length === 0 ? NEVER_MATCH : tags.map((t) => toSafeTagPattern(t, tagNameConfig)).join("|");

const DEFAULT_ANY_TAG_PATTERN = "[a-zA-Z_][a-zA-Z0-9_-]*";

const createCaptureMap = (
  ...entries: Array<[number, string]>
): Record<number, { name: string }> =>
  Object.fromEntries(entries.map(([index, name]) => [index, { name }]));

const SCOPE = "yume-rich-text-dsl";

const splitOpenToken = (
  composite: string,
  leading: string,
): { leading: string; trailing: string } =>
  composite.startsWith(leading)
    ? { leading, trailing: composite.slice(leading.length) }
    : { leading: composite, trailing: "" };

const splitCloseToken = (
  composite: string,
  operator: string,
  suffix: string,
): { operator: string; middle: string; suffix: string } => {
  if (composite.startsWith(operator) && composite.endsWith(suffix)) {
    return {
      operator,
      middle: composite.slice(operator.length, composite.length - suffix.length),
      suffix,
    };
  }

  if (composite.endsWith(suffix)) {
    return {
      operator: composite.slice(0, composite.length - suffix.length),
      middle: "",
      suffix,
    };
  }

  return { operator: composite, middle: "", suffix: "" };
};

const createDelimitedCaptures = (
  firstIndex: number,
  firstScope: string,
  second: string,
  secondScope: string,
): Record<number, { name: string }> =>
  second
    ? createCaptureMap([firstIndex, firstScope], [firstIndex + 1, secondScope])
    : createCaptureMap([firstIndex, firstScope]);

const createCloseCaptures = (
  close: { operator: string; middle: string; suffix: string },
  operatorScope: string,
): Record<number, { name: string }> => {
  const entries: Array<[number, string]> = [[1, operatorScope]];
  let index = 2;

  if (close.middle) {
    entries.push([index, `keyword.control.flow.end.${SCOPE}`]);
    index++;
  }
  if (close.suffix) {
    entries.push([index, `punctuation.definition.tag.end.${SCOPE}`]);
  }

  return createCaptureMap(...entries);
};

const buildArgsPattern = (syntax: SyntaxConfig): string => {
  const escapeChar = escapeRegex(syntax.escapeChar);
  const tagClose = escapeRegex(syntax.tagClose);
  return `((?:(?:${escapeChar}[\\s\\S])|(?!${tagClose})[\\s\\S])*)`;
};

/**
 * Create a Shiki-compatible TextMate grammar for the rich-text DSL.
 *
 * @param tagConfig - Optional tag name lists. If omitted, matches any valid tag name.
 * @returns A `LanguageRegistration`-shaped object (compatible with `shiki/types`).
 */
export const createRichTextGrammar = (tagConfig?: GrammarTagConfig) => {
  const syntax = createSyntax(tagConfig?.syntax);
  const tagNameConfig = tagConfig?.tagName
    ? createTagNameConfig(tagConfig.tagName)
    : DEFAULT_TAG_NAME;
  const anyPattern = tagConfig?.anyTagPattern ?? DEFAULT_ANY_TAG_PATTERN;
  const allPattern = tagConfig ? tagAlternation(tagConfig.allTags, tagNameConfig) : anyPattern;
  const rawPattern = tagConfig ? tagAlternation(tagConfig.rawTags, tagNameConfig) : anyPattern;
  const blockPattern = tagConfig ? tagAlternation(tagConfig.blockTags, tagNameConfig) : anyPattern;
  const argsEscapableTokens = syntax.escapableTokens.filter(
    (token) => token !== syntax.rawClose && token !== syntax.blockClose,
  );
  const blockEscapableSet = new Set([
    syntax.endTag,
    syntax.tagOpen,
    syntax.tagClose,
    syntax.blockClose,
  ]);
  const blockEscapableTokens = syntax.escapableTokens.filter((token) => blockEscapableSet.has(token));

  const argsEscapePattern = argsEscapableTokens.map((token) => escapeRegex(token)).join("|");
  const rawEscapePattern = escapeRegex(syntax.rawClose);
  const blockEscapePattern = blockEscapableTokens.map((token) => escapeRegex(token)).join("|");
  const rawContentPattern = `(?:${escapeRegex(syntax.escapeChar)}(?!${rawEscapePattern})|(?:(?!${escapeRegex(syntax.escapeChar)}(?:${rawEscapePattern}))[^\n]))+`;
  const argsPattern = buildArgsPattern(syntax);
  const rawOpen = splitOpenToken(syntax.rawOpen, syntax.tagClose);
  const blockOpen = splitOpenToken(syntax.blockOpen, syntax.tagClose);
  const endTag = splitOpenToken(syntax.endTag, syntax.tagClose);
  const rawClose = splitCloseToken(syntax.rawClose, rawOpen.trailing || syntax.rawOpen, syntax.tagPrefix);
  const blockClose = splitCloseToken(syntax.blockClose, blockOpen.trailing || syntax.blockOpen, syntax.tagPrefix);

  return {
    name: "yume-rich-text-dsl",
    displayName: "Yume Rich Text DSL",
    scopeName: `source.${SCOPE}`,
    aliases: ["rich-text-dsl", "rich-dsl", "dsl-rich", "yume-rich-dsl"],
    patterns: [
      { include: "#raw-tag" },
      { include: "#block-tag" },
      { include: "#inline-tag" },
      { include: "#args-escape-sequence" },
    ],
    repository: {
      "args-escape-sequence": {
        match: `${escapeRegex(syntax.escapeChar)}(?:${argsEscapePattern})`,
        name: `constant.character.escape.${SCOPE}`,
      },
      "raw-escape-sequence": {
        match: `${escapeRegex(syntax.escapeChar)}(?:${rawEscapePattern})`,
        name: `constant.character.escape.${SCOPE}`,
      },
      "block-escape-sequence": {
        match: `${escapeRegex(syntax.escapeChar)}(?:${blockEscapePattern})`,
        name: `constant.character.escape.${SCOPE}`,
      },
      "pipe-divider": {
        match: escapeRegex(syntax.tagDivider),
        name: `punctuation.separator.arguments.${SCOPE}`,
      },
      "inline-tag": {
        begin: `(${escapeRegex(syntax.tagPrefix)})(${allPattern})(${escapeRegex(syntax.tagOpen)})`,
        beginCaptures: createCaptureMap(
          [1, `punctuation.definition.tag.begin.${SCOPE}`],
          [2, `entity.name.tag.${SCOPE}`],
          [3, `punctuation.section.arguments.begin.${SCOPE}`],
        ),
        end: endTag.trailing
          ? `(${escapeRegex(endTag.leading)})(${escapeRegex(endTag.trailing)})`
          : `(${escapeRegex(endTag.leading)})`,
        endCaptures: createDelimitedCaptures(
          1,
          `punctuation.section.arguments.end.${SCOPE}`,
          endTag.trailing,
          `punctuation.definition.tag.end.${SCOPE}`,
        ),
        patterns: [
          { include: "#args-escape-sequence" },
          { include: "#inline-tag" },
          { include: "#paren-group" },
          { include: "#pipe-divider" },
        ],
      },
      "paren-group": {
        begin: `(${escapeRegex(syntax.tagOpen)})`,
        beginCaptures: createCaptureMap([1, `punctuation.section.group.begin.${SCOPE}`]),
        end: `(${escapeRegex(syntax.tagClose)})`,
        endCaptures: createCaptureMap([1, `punctuation.section.group.end.${SCOPE}`]),
        patterns: [
          { include: "#args-escape-sequence" },
          { include: "#inline-tag" },
          { include: "#paren-group" },
          { include: "#pipe-divider" },
        ],
      },
      "raw-tag": {
        begin: `(${escapeRegex(syntax.tagPrefix)})(${rawPattern})(${escapeRegex(syntax.tagOpen)})${argsPattern}(${escapeRegex(rawOpen.leading)})${rawOpen.trailing ? `(${escapeRegex(rawOpen.trailing)})` : ""}\\n?`,
        beginCaptures: createCaptureMap(
          [1, `punctuation.definition.tag.begin.${SCOPE}`],
          [2, `entity.name.tag.raw.${SCOPE}`],
          [3, `punctuation.section.arguments.begin.${SCOPE}`],
          [5, `punctuation.section.arguments.end.${SCOPE}`],
          ...(rawOpen.trailing
            ? [[6, `keyword.operator.raw.open.${SCOPE}`] as [number, string]]
            : []),
        ),
        end: rawClose.suffix
          ? `^(${escapeRegex(rawClose.operator)})${rawClose.middle ? `(${escapeRegex(rawClose.middle)})` : ""}(${escapeRegex(rawClose.suffix)})$`
          : `^(${escapeRegex(rawClose.operator)})${rawClose.middle ? `(${escapeRegex(rawClose.middle)})` : ""}$`,
        endCaptures: createCloseCaptures(rawClose, `keyword.operator.raw.close.${SCOPE}`),
        patterns: [
          { include: "#raw-escape-sequence" },
          { match: rawContentPattern, name: `string.unquoted.block.${SCOPE}` },
        ],
      },
      "block-tag": {
        begin: `(${escapeRegex(syntax.tagPrefix)})(${blockPattern})(${escapeRegex(syntax.tagOpen)})${argsPattern}(${escapeRegex(blockOpen.leading)})${blockOpen.trailing ? `(${escapeRegex(blockOpen.trailing)})` : ""}\\n?`,
        beginCaptures: createCaptureMap(
          [1, `punctuation.definition.tag.begin.${SCOPE}`],
          [2, `entity.name.tag.block.${SCOPE}`],
          [3, `punctuation.section.arguments.begin.${SCOPE}`],
          [5, `punctuation.section.arguments.end.${SCOPE}`],
          ...(blockOpen.trailing
            ? [[6, `keyword.operator.block.open.${SCOPE}`] as [number, string]]
            : []),
        ),
        end: blockClose.suffix
          ? `^(${escapeRegex(blockClose.operator)})${blockClose.middle ? `(${escapeRegex(blockClose.middle)})` : ""}(${escapeRegex(blockClose.suffix)})$`
          : `^(${escapeRegex(blockClose.operator)})${blockClose.middle ? `(${escapeRegex(blockClose.middle)})` : ""}$`,
        endCaptures: createCloseCaptures(blockClose, `keyword.operator.block.close.${SCOPE}`),
        patterns: [
          { include: "#block-escape-sequence" },
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
