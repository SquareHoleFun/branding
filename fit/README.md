# FIT token icon

The icon of the FIT token (The Misfits): a **lavender round coin with an axis-aligned square hole**. It follows
founder decision F20 (5) and (6) in `docs/decisions/DECISION-LOG.md`: lavender only, no gold version, no Misfit shape in
the logo. The brief is `docs/design/misfits-v2/STYLE-BIBLE.md` § 6, and the size findings are in `CRITIQUE.md` § 4.

**Status:** these are design assets only. They are not wired into the app, and the trademark screen (bible O5) is still
open. The mark is never identity: the UI still shows the chain and the address next to it.

`preview.png` is the review sheet. It shows every size on `#080D16` and on white, square-framed and circle-cropped on the
four UI surfaces, ×4 pixel zooms, the platform tile beside the icon at 24/32/64 px, the one-colour variant and the app
icons.

## Which file to use

| Display size | File | What it is |
|---|---|---|
| 16 px | `fit-icon-16.png` (or `fit-icon-16.svg`) | Flat, hinted on a 16 grid: rim 1, lip 1, a 6 × 6 hole on whole pixels |
| 20–24 px | `fit-icon-24.png` (or `fit-icon-small.svg`) | Flat, hinted on a 24 grid: rim 2, lip 1, a 10 × 10 hole |
| 32, 48, 64, 128, 256, 512 px | `fit-icon-<size>.png` | 3D render (lavender enamel, glowing lip), transparent background |
| Marketing, large tiles | `fit-icon-1024.png` | 3D master, 1024 px, transparent background |
| Vector, any size from 32 px | `fit-icon.svg` | Two-tone master on a 256 grid (711 B) |
| One colour | `fit-icon-mono.svg` | `currentColor`: `#A78BFA` on navy, `#080D16` on white, or white |
| Browser tab | `favicon/favicon.ico` (16 + 32 + 48), `favicon/favicon.svg` | The ICO embeds the 16, 32 and 48 px PNGs; the SVG is the 16-grid drawing |
| Home screen / web app | `favicon/apple-touch-icon.png` (180), `favicon/icon-192.png`, `favicon/icon-maskable-512.png` | Apple and maskable icons are opaque `#080D16`; the maskable coin sits inside the 80% safe zone |

Use the PNG made for the size you display. Do not scale the 1024 px master down to 16–24 px, because the lip and
glow blur into the hole there. For a size in between, round up to the next export.

Every PNG and SVG has a **real transparent hole**: the page shows through it. The tests check that the hole centre and
the corners are fully transparent (`packages/design/src/art/fit-icon.test.ts`).

## Geometry (256 grid, `fit-icon.svg`)

- Coin diameter 256, full bleed. The 3D renders fill 97% of the square.
- Rim 20 (7.8% of the diameter) and hole lip 10, in `#6D4AE2`.
- Face in `#A78BFA` between the rim and the lip.
- Hole 104 × 104 (40.6% of the diameter), axis-aligned, with a corner radius of 4. The small drawings use square
  corners: 6/16 = 37.5% at 16 px and 10/24 = 41.7% at 24 px, so the hole stays at least 5 px wide.

## Colours and contrast

| Role | Colour | On white | On `#080D16` | On `#18253A` |
|---|---|---|---|---|
| Face | `#A78BFA` (`--sh-accent`) | 2.72 | 7.15 | 5.65 |
| Rim and lip | `#6D4AE2` (`--sh-action`) | 5.63 | 3.45 | 2.73 |
| 3D hole glow | `#C4B2FF` | n/a (decoration) | | |

- **Flat exports** (16, 24): every outer edge pixel is rim violet, so 5.63:1 on white and 3.45:1 on the canvas. The
  lip gives the hole the same edge.
- **3D exports**: the rim is lit so its outer edge stays at 3:1 or more on white and on `#080D16` at every size. That
  is measured on the edge pixels, 5th percentile: 32 px 3.29 / 4.08, 64 px 3.73 / 3.43, 512 px 3.35 / 3.19, 1024 px
  3.18 / 3.16. A few specular pixels at 128 and 1024 px dip to 2.8–2.9 on white.
- **On `#18253A`** the rim alone is below 3:1 (2.73). There the lavender face carries the silhouette (5.65:1).
  `#6D4AE2` is never used as the only colour of the mark (bible § 2.3).

## Clear space and minimum size

- Keep at least **one quarter of the coin diameter** clear on every side, for example 8 px around a 32 px icon. In a
  token list, the row's own padding counts.
- The minimum size is 16 px. Below that, the hole closes.

## Don'ts

- **No gold version.** The token is lavender only (F20). The gold coin is The Coin, a cast character, not the token.
- **No Misfit shape inside** the coin or on it: no star, face or character. Every Misfit carries equal weight, so none
  is the token's face (F20).
- **No currency sign** or other mark on the coin: no $, ₿, Ξ, ¢, € or ¥, and no letters or numbers. "$FIT" is a
  cashtag in running text only.
- Do not rotate the hole: it stays axis-aligned.
- Do not fill the hole or bake a background behind the icon, apart from the opaque app icons.
- No recolouring outside `fit-icon-mono.svg`. No outer glow, drop shadow, outline or stretching.
- Do not put the coin inside the platform's rounded tile. The platform tile and the token must stay distinct.
- Do not use the mark as a button or media "stop" icon.

## Rebuilding

The four SVGs are hand-authored geometry, not traces, and they are the source. `scripts/fit-icon/build.mjs` renders the
PNGs, the favicon set, `preview.png` and `manifest.json` (size and sha256 of every file). It uses the NFT generator's
pinned headless Chromium (SwiftShader) and three.js 0.186.1:

```sh
node scripts/fit-icon/build.mjs          # writes the files
node scripts/fit-icon/build.mjs --check  # re-renders in memory and compares with manifest.json
```

The 3D coin is `scripts/fit-icon/render/coin.mjs`. A different Chromium build may change PNG bytes. When that happens,
review `preview.png` again before committing the new hashes.
