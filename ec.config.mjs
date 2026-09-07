import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers"
import { defineEcConfig, loadShikiTheme } from "astro-expressive-code"

const light = await loadShikiTheme("rose-pine-dawn")
const dark = await loadShikiTheme("rose-pine-moon")

// Tweak contrast so it looks less "washed out".
light.ensureMinSyntaxHighlightingColorContrast(4.5)

// See: https://expressive-code.com/reference/configuration/
export default defineEcConfig({
  themes: [light, dark],
  minSyntaxHighlightingColorContrast: 0,
  plugins: [pluginLineNumbers()],
  defaultProps: {
    // Preserve the articles' existing opt-in `showLineNumbers` metadata.
    showLineNumbers: false,
  },
  styleOverrides: {
    borderColor: ({ theme }) =>
      theme.type === "dark" ? "#56526e80" : "#dfdad980",
    borderRadius: "var(--garden-radius)",
    borderWidth: "1px",
    codeFontFamily: "inherit",
    codeFontSize: "0.9rem",
    codeLineHeight: "1.65",
    gutterBorderWidth: "0px",
    uiFontFamily: "inherit",
    frames: {
      frameBoxShadowCssValue: "none",
    },
    textMarkers: {
      delBackground: ({ theme }) =>
        theme.type === "dark" ? "#eb6f9233" : "#b4637a33",
      delBorderColor: ({ theme }) =>
        theme.type === "dark" ? "#eb6f92" : "#b4637a",
      delDiffIndicatorColor: ({ theme }) =>
        theme.type === "dark" ? "#eb6f92" : "#b4637a",
      insBackground: ({ theme }) =>
        theme.type === "dark" ? "#9ccfd833" : "#56949f33",
      insBorderColor: ({ theme }) =>
        theme.type === "dark" ? "#3e8fb0" : "#286983",
      insDiffIndicatorColor: ({ theme }) =>
        theme.type === "dark" ? "#9ccfd8" : "#286983",
      lineMarkerAccentWidth: "3px",
      markBackground: ({ theme }) =>
        theme.type === "dark" ? "#393552" : "#f2e9e1",
      markBorderColor: ({ theme }) =>
        theme.type === "dark" ? "#ea9a97" : "#d7827e",
    },
  },
})
