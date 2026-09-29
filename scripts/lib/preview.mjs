/**
 * The review sheet (logo/preview.png): every mark export at native pixels on the four brand surfaces and on white,
 * pixel zooms of the small sizes, the flat and mono variants, app icons under the iOS and Android masks, the lockups,
 * the platform mark beside the FIT coin, and the GitHub images at their display sizes. Review only, not an asset.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, pngDataUrl, svgDataUrl } from './browser.mjs';
import { COLOURS } from './compose.mjs';

const SURFACES = [
  ['canvas #080D16', COLOURS.canvas, '#B5C0D5'],
  ['surface #111B29', COLOURS.surface, '#B5C0D5'],
  ['raised #18253A', COLOURS.raised, '#B5C0D5'],
  ['white', '#FFFFFF', '#30415D'],
];

const img = (src, w, h = w, style = '') => `<img src="${src}" width="${w}" height="${h}" style="${style}" alt="">`;
const fig = (inner, label, colour) => `<figure>${inner}<figcaption style="color:${colour}">${label}</figcaption></figure>`;

export async function previewSheet(r, { mark, app, github, lockupPngs, svgOf }) {
  const png = (buf) => pngDataUrl(buf);
  const fit = (name) => pngDataUrl(readFileSync(join(ROOT, 'fit', name)));
  const sizes = Object.keys(mark).map(Number);
  // Up to 256 px at native pixels; 512 and 1024 are shown at 256 px so each surface stays one row.
  const shown = (s) => (s <= 256 ? [s, `${s}`] : [256, `${s} at ${Math.round(25600 / s)}%`]);

  const native = SURFACES.map(
    ([label, bg, ink]) =>
      `<div class="band" style="background:${bg}"><span class="tag" style="color:${ink}">${label}</span><div class="row">${sizes
        .map((s) => fig(img(png(mark[s]), shown(s)[0]), shown(s)[1], ink))
        .join('')}</div></div>`,
  ).join('');

  const zoom = [
    [COLOURS.canvas, '#B5C0D5'],
    ['#FFFFFF', '#30415D'],
  ]
    .map(
      ([bg, ink]) =>
        `<div class="band" style="background:${bg}"><div class="row">${[16, 24, 32, 48]
          .map((s) => fig(img(png(mark[s]), s * 6, s * 6, 'image-rendering:pixelated'), `${s} px ×6`, ink))
          .join('')}</div></div>`,
    )
    .join('');

  const mono = (colour) => svgDataUrl(svgOf('mono').replace('currentColor', colour));
  const variants = `<div class="band" style="background:${COLOURS.canvas}"><div class="row">
    ${fig(img(svgDataUrl(svgOf('flat')), 128), 'flat, #A78BFA on canvas', '#B5C0D5')}
    ${fig(img(mono('#FFFFFF'), 128), 'mono, white on canvas', '#B5C0D5')}
    <div style="background:#fff;padding:16px;border-radius:8px">${fig(img(mono(COLOURS.canvas), 128), 'mono, navy on white', '#30415D')}</div>
    <div style="background:${COLOURS.action};padding:16px;border-radius:8px">${fig(img(mono('#FFFFFF'), 128), 'mono, white on violet', '#fff')}</div>
    ${fig(img(png(app.appleTouch), 180, 180, 'border-radius:40px'), 'apple-touch-icon 180, iOS mask', '#B5C0D5')}
    ${fig(img(png(app.maskable), 256, 256, 'border-radius:50%'), 'maskable 512 at 50%, circle mask', '#B5C0D5')}
    ${fig(img(png(app.icon192), 192), 'icon-192 (transparent)', '#B5C0D5')}
  </div></div>`;

  const lockupBands = [
    [COLOURS.canvas, 'square-hole-lockup-horizontal@1x.png', 'square-hole-lockup-stacked@1x.png', '#B5C0D5'],
    ['#FFFFFF', 'square-hole-lockup-horizontal-on-light@1x.png', 'square-hole-lockup-stacked-on-light@1x.png', '#30415D'],
  ]
    .map(([bg, h, s, ink]) => {
      const hb = lockupPngs[`logo/png/${h}`];
      const sb = lockupPngs[`logo/png/${s}`];
      const hs = hb.readUInt32BE(16);
      const hh = hb.readUInt32BE(20);
      const ss = sb.readUInt32BE(16);
      const sh = sb.readUInt32BE(20);
      return `<div class="band" style="background:${bg}"><div class="row">${fig(img(png(hb), hs * 0.75, hh * 0.75), `${h} at 75%`, ink)}${fig(
        img(png(sb), ss * 0.6, sh * 0.6),
        `${s} at 60%`,
        ink,
      )}${fig(img(png(hb), (hs * 32) / hh, 32), 'horizontal at 32 px tall', ink)}</div></div>`;
    })
    .join('');

  const family = [
    [COLOURS.canvas, '#B5C0D5'],
    ['#FFFFFF', '#30415D'],
  ]
    .map(
      ([bg, ink]) =>
        `<div class="band" style="background:${bg}"><div class="row">${[
          [24, 'fit-icon-24.png'],
          [32, 'fit-icon-32.png'],
          [64, 'fit-icon-64.png'],
        ]
          .map(([s, f]) => fig(`<div style="display:flex;gap:${s / 2}px">${img(png(mark[s]), s)}${img(fit(f), s)}</div>`, `platform ${s} · FIT ${s}`, ink))
          .join('')}</div></div>`,
    )
    .join('');

  const githubBand = `<div class="band" style="background:#0D1117"><div class="row">
    ${fig(img(png(github.avatar), 120, 120, 'border-radius:12px;border:1px solid #30363D'), 'org avatar at 120', '#B5C0D5')}
    ${fig(img(png(github.avatar), 40, 40, 'border-radius:6px;border:1px solid #30363D'), '40', '#B5C0D5')}
    ${fig(img(png(github.avatar), 20, 20, 'border-radius:4px;border:1px solid #30363D'), '20', '#B5C0D5')}
  </div><div class="row">
    ${fig(`<div class="crop">${img(png(github.code), 640, 320)}<i></i></div>`, 'social preview (code) at 50%; box = 1.91:1 crop', '#B5C0D5')}
    ${fig(`<div class="crop">${img(png(github.branding), 640, 320)}<i></i></div>`, 'social preview (branding) at 50%; box = 1.91:1 crop', '#B5C0D5')}
  </div><div class="row">
    ${fig(img(png(github.banner), 900, 225, 'border-radius:6px'), 'profile banner at 900 px (README width)', '#B5C0D5')}
    ${fig(`<div class="crop">${img(png(github.code), 300, 150)}<i></i></div>`, 'code preview at 300 px (small card)', '#B5C0D5')}
  </div></div>`;

  const html = `<style>
    body{background:#D5DBE6;font:14px/1.4 -apple-system,'Helvetica Neue',Arial,sans-serif;color:#080D16;padding:28px 28px 8px;width:1544px}
    h1{font-size:26px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}p{margin:0 0 10px;color:#30415D}
    .band{position:relative;padding:28px 20px 14px;border-radius:6px;margin-bottom:8px}
    .tag{position:absolute;left:12px;top:8px;font-size:11px}
    .row{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px}
    figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}
    figcaption{font-size:11px;white-space:nowrap}
    .crop{position:relative;line-height:0}.crop i{position:absolute;top:0;bottom:0;left:50%;width:95.5%;transform:translateX(-50%);outline:1.5px dashed #FFD17A;outline-offset:-1px}
  </style>
  <h1>Square Hole mark · review sheet</h1>
  <p>Rounded tile, square hole with a lavender glow. 16/24/32 px are pixel-hinted drawings; 48 px and up render the 256-grid master. Real alpha everywhere except the opaque app icons and GitHub images.</p>
  <h2>A. Every mark export at native pixels</h2>${native}
  <h2>B. Small sizes, ×6 pixel zoom</h2>${zoom}
  <h2>C. Flat, mono and app icons</h2>${variants}
  <h2>D. Lockups</h2>${lockupBands}
  <h2>E. Family: platform mark beside the FIT coin (distinct shapes)</h2>${family}
  <h2>F. GitHub images at display size</h2>${githubBand}`;
  return r.html(html, 1600, 800, { fullPage: true });
}
