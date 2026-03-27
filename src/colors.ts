import type { HighlightColors } from "./types.js";

export const DEFAULT_COLORS: HighlightColors = {
  tagName: "#0550AE",
  punct: "#CF222E",
  bracket: "#6639BA",
  separator: "#953800",
  operator: "#1A7F37",
  end: "#8250DF",
  escape: "#116329",
  argText: "#0A3069",
  contentText: "#0A7EA4",
};

export const resolveColors = (overrides?: Partial<HighlightColors>): HighlightColors =>
  overrides ? { ...DEFAULT_COLORS, ...overrides } : DEFAULT_COLORS;
