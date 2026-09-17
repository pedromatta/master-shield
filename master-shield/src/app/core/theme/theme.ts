/**
 * Frontend mirror of the palette in `src/styles.css`.
 *
 * CSS variables cannot be read synchronously during component construction, and a few
 * places need a concrete default colour (new resource bars, new tag colours, low-health
 * bars). Those values live here so the theme has a single source of truth in both the
 * stylesheet and the code.
 *
 * When re-skinning the app, change the matching values in `styles.css` and here.
 */
export const THEME = {
  /** Primary accent — aged bronze (matches `--color-sky-500`). */
  accent: '#ad7223',
  /** Danger / low-health — deep rust (matches `--color-rose-500`). */
  danger: '#943f2b',
  /** Success / vitality — moss green (matches `--color-emerald-500`). */
  success: '#597b32',
  /** Highlight — gold (matches `--color-amber-400`). */
  highlight: '#cf9c2e',
} as const;

/** Default colour for new resource bars and tags. */
export const DEFAULT_RESOURCE_COLOR = THEME.accent;

/** Colour used when a resource bar drops into its "low" state. */
export const LOW_RESOURCE_COLOR = THEME.danger;
