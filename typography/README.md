# Typography

**Plus Jakarta Sans** is the Square Hole typeface, for the wordmark, headings and the interface. It is a geometric
sans with rounded, toy-like shapes that suit "different shapes", and it stays readable at 12–16 px. It is a variable
font with weights from 200 to 800.

- License: SIL Open Font License 1.1 (`OFL.txt`, copied from the font package).
  Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans).
- **No font file is in this repository.** The wordmark and every text in the PNGs are outlines of the font, made by
  `scripts/outline_text.py` from `@fontsource-variable/plus-jakarta-sans@5.3.0` (the same pinned package the Square
  Hole app uses; the script checks the file's sha256). Get the font from the upstream project, Google Fonts or that
  npm package.

## Styles

| Use | Weight | Tracking | Colour on dark |
|---|---|---|---|
| Wordmark "Square Hole" | 750 | -0.02 em | `#F3F5FB` (navy `#080D16` on light) |
| Display headings | 700–750 | -0.01 em | `#F3F5FB` |
| Tagline | 550 | -0.005 em | `#B5C0D5` |
| Label (uppercase, short) | 700 | +0.14 em | `#A78BFA` |
| Body | 400 | 0 | `#F3F5FB` or `#B5C0D5` |
| Captions (12 px minimum) | 400–550 | 0 | `#899AB6` |

- Interface sizes from the app: caption 12, label 13, small 14, body 15–16, section 22, title 28–36 px.
- Numbers in tables and amounts use tabular figures: `font-variant-numeric: tabular-nums`.
- Use sentence case for headings. Uppercase only for short labels such as "BRAND KIT".
- Fallback stack when the font is missing: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
  sans-serif` (see `--sh-font` in `colors/tokens.css`).

## The wordmark

Always use the outlined files in `logo/svg/` (`square-hole-wordmark*.svg` or a lockup). Do not retype the name in a
different font, weight or spacing to make a logo.
