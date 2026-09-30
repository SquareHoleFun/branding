/**
 * Generated SVG documents of the kit: wordmarks, lockups and the GitHub images (organisation avatar, social previews,
 * profile banner). Only the marks are hand-authored (logo/svg/square-hole-mark*.svg); everything here is placed from
 * them and from the outlined texts, with the proportions below.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, pngDataUrl } from './browser.mjs';
import { doc, inkWidth, place, round, text, TEXT } from './svg.mjs';

export const COLOURS = Object.freeze({
  canvas: '#080D16',
  surface: '#111B29',
  raised: '#18253A',
  border: '#30415D',
  text: '#F3F5FB',
  textSecondary: '#B5C0D5',
  muted: '#899AB6',
  accent: '#A78BFA',
  action: '#6D4AE2',
  glow: '#C4B2FF',
});

export const MARKS = Object.freeze({
  master: 'square-hole-mark.svg',
  appIcon: 'square-hole-app-icon.svg',
  flat: 'square-hole-mark-flat.svg',
  mono: 'square-hole-mark-mono.svg',
  px16: 'square-hole-mark-16.svg',
  px24: 'square-hole-mark-24.svg',
  px32: 'square-hole-mark-32.svg',
});

export function readMark(key) {
  return readFileSync(join(ROOT, 'logo', 'svg', MARKS[key]), 'utf8');
}

/** Lockup proportions, in units of the mark's side M. */
export const LOCKUP = Object.freeze({
  horizontal: { cap: 0.38, gap: 0.25 },
  stacked: { cap: 0.28, gap: 0.22 },
});

const DESCENDER = 200; // the "q" of the wordmark, font units below the baseline
const WORDMARK_TOP = -TEXT.texts.wordmark.ink[1]; // the "l" ascender, font units above the baseline

const VARIANTS = {
  dark: { suffix: '', text: COLOURS.text, mark: 'master', note: 'for dark backgrounds (navy canvas)' },
  light: { suffix: '-on-light', text: COLOURS.canvas, mark: 'master', note: 'for white and light backgrounds' },
  mono: { suffix: '-mono', text: 'currentColor', mark: 'mono', note: 'one colour (currentColor)' },
};

export function wordmark(variant) {
  const v = VARIANTS[variant];
  const cap = 100;
  const s = cap / TEXT.font.capHeight;
  const top = WORDMARK_TOP * s;
  const t = text('wordmark', { cap, x: 0, baseline: top, fill: v.text });
  const height = top + DESCENDER * s;
  return {
    name: `square-hole-wordmark${v.suffix}.svg`,
    svg: doc(t.width, height, [t.path], { desc: `Square Hole wordmark, Plus Jakarta Sans 750 outlined, ${v.note}` }),
    width: t.width,
    height,
  };
}

export function lockupHorizontal(variant, M = 256) {
  const v = VARIANTS[variant];
  const cap = LOCKUP.horizontal.cap * M;
  const x = M + LOCKUP.horizontal.gap * M;
  const baseline = M / 2 + cap / 2;
  const t = text('wordmark', { cap, x, baseline, fill: v.text });
  return {
    name: `square-hole-lockup-horizontal${v.suffix}.svg`,
    svg: doc(t.right, M, [place(readMark(v.mark), 0, 0, M), t.path], { desc: `Square Hole horizontal lockup, ${v.note}` }),
    width: t.right,
    height: M,
  };
}

export function lockupStacked(variant, M = 256) {
  const v = VARIANTS[variant];
  const cap = LOCKUP.stacked.cap * M;
  const s = cap / TEXT.font.capHeight;
  const width = Math.max(M, inkWidth('wordmark', cap));
  const baseline = M + LOCKUP.stacked.gap * M + cap;
  const t = text('wordmark', { cap, x: width / 2, baseline, fill: v.text, align: 'center' });
  const height = baseline + DESCENDER * s;
  return {
    name: `square-hole-lockup-stacked${v.suffix}.svg`,
    svg: doc(width, height, [place(readMark(v.mark), (width - M) / 2, 0, M), t.path], { desc: `Square Hole stacked lockup, ${v.note}` }),
    width,
    height,
  };
}

/* ── GitHub images ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** Navy canvas, a lavender glow behind the mark and a faint grid of small square holes that fades out towards the text. */
function backdrop(width, height, glow) {
  const cell = 32;
  return [
    '<defs>',
    `<radialGradient id="bg-glow" cx="${round(glow.x)}" cy="${round(glow.y)}" r="${round(glow.r)}" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0" stop-color="${COLOURS.accent}" stop-opacity=".2"/><stop offset=".55" stop-color="${COLOURS.action}" stop-opacity=".06"/><stop offset="1" stop-color="${COLOURS.action}" stop-opacity="0"/>`,
    '</radialGradient>',
    `<pattern id="bg-grid" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" x="${round((width % cell) / 2 - cell / 2 + 2)}" y="${round((height % cell) / 2 - cell / 2 + 2)}">`,
    `<rect x="${cell / 2 - 3}" y="${cell / 2 - 3}" width="6" height="6" rx="1.5" fill="none" stroke="${COLOURS.border}" stroke-width="1"/>`,
    '</pattern>',
    `<radialGradient id="bg-fade" cx="${round(glow.x)}" cy="${round(glow.y)}" r="${round(Math.max(width, height) * 0.62)}" gradientUnits="userSpaceOnUse">`,
    '<stop offset=".25" stop-color="#fff" stop-opacity=".0"/><stop offset=".6" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/>',
    '</radialGradient>',
    `<mask id="bg-mask"><rect width="${width}" height="${height}" fill="url(#bg-fade)"/></mask>`,
    '</defs>',
    `<rect width="${width}" height="${height}" fill="${COLOURS.canvas}"/>`,
    `<rect width="${width}" height="${height}" fill="url(#bg-grid)" mask="url(#bg-mask)" opacity=".7"/>`,
    `<rect width="${width}" height="${height}" fill="url(#bg-glow)"/>`,
  ];
}

function fitCoin(size) {
  const file = size <= 64 ? 'fit-icon-64.png' : size <= 128 ? 'fit-icon-128.png' : 'fit-icon-256.png';
  return pngDataUrl(readFileSync(join(ROOT, 'fit', file)));
}

/** Mark on the left, wordmark and lines of text on the right, the whole group centred on the canvas. */
function markAndText({ width, height, mark, gap, cap, lines, extra = () => [] }) {
  const textWidth = Math.max(inkWidth('wordmark', cap), ...lines.map((l) => l.width ?? inkWidth(l.id, l.cap)));
  const groupWidth = mark + gap + textWidth;
  const x0 = (width - groupWidth) / 2;
  const tx = x0 + mark + gap;
  // Block: optional lines above the wordmark, the wordmark, then lines below; baselines stacked by `advance`.
  const above = lines.filter((l) => l.above);
  const below = lines.filter((l) => !l.above);
  const heightOf = cap + [...above, ...below].reduce((sum, l) => sum + l.advance, 0) + (below.at(-1)?.tail ?? 0);
  const top = (height - heightOf) / 2;
  let y = top;
  const body = [];
  for (const l of above) {
    y += l.cap;
    body.push(l.render ? l.render(tx, y) : text(l.id, { cap: l.cap, x: tx, baseline: y, fill: l.fill }).path);
    y += l.advance - l.cap;
  }
  y += cap;
  body.push(text('wordmark', { cap, x: tx, baseline: y, fill: COLOURS.text }).path);
  for (const l of below) {
    y += l.advance;
    body.push(l.render ? l.render(tx, y) : text(l.id, { cap: l.cap, x: tx, baseline: y, fill: l.fill }).path);
  }
  const markY = height / 2 - mark / 2;
  return { x0, tx, markY, body: [place(readMark('master'), x0, markY, mark), ...body, ...extra({ x0, tx, top, markY })] };
}

export function socialPreviewCode() {
  const width = 1280;
  const height = 640;
  const layout = markAndText({
    width,
    height,
    mark: 248,
    gap: 60,
    cap: 92,
    lines: [
      { id: 'tagline', cap: 33, advance: 76, fill: COLOURS.textSecondary },
      { id: 'domains', cap: 20, advance: 70, fill: COLOURS.muted, tail: 5 },
    ],
  });
  return doc(width, height, [...backdrop(width, height, { x: layout.x0 + 124, y: height / 2, r: 440 }), ...layout.body], {
    desc: 'Square Hole social preview for the code repository',
  });
}

export function socialPreviewBranding() {
  const width = 1280;
  const height = 640;
  const swatches = [COLOURS.accent, COLOURS.action, COLOURS.glow, COLOURS.raised, COLOURS.surface, COLOURS.canvas, COLOURS.text];
  const sw = 40;
  const swGap = 12;
  const coin = 56;
  const rowWidth = swatches.length * (sw + swGap) + 24 + coin + 14 + inkWidth('label-fit', 19);
  const swatchRow = (x, baseline) => {
    const y = baseline - sw;
    const cells = swatches.map(
      (c, i) => `<rect x="${round(x + i * (sw + swGap) + 0.5)}" y="${round(y + 0.5)}" width="${sw - 1}" height="${sw - 1}" rx="10" fill="${c}" stroke="${COLOURS.border}"/>`,
    );
    const cx = x + swatches.length * (sw + swGap) + 24;
    const cy = y + sw / 2 - coin / 2;
    const label = text('label-fit', { cap: 19, x: cx + coin + 14, baseline: y + sw / 2 + 19 / 2, fill: COLOURS.text }).path;
    return [...cells, `<image x="${round(cx)}" y="${round(cy)}" width="${coin}" height="${coin}" href="${fitCoin(coin)}"/>`, label].join('');
  };
  const layout = markAndText({
    width,
    height,
    mark: 248,
    gap: 60,
    cap: 92,
    lines: [
      { id: 'label-brand-kit', cap: 21, advance: 56, fill: COLOURS.accent, above: true },
      { id: 'tagline', cap: 33, advance: 76, fill: COLOURS.textSecondary },
      { width: rowWidth, cap: 40, advance: 88, render: swatchRow, tail: 0 },
    ],
  });
  return doc(width, height, [...backdrop(width, height, { x: layout.x0 + 124, y: height / 2, r: 440 }), ...layout.body], {
    desc: 'Square Hole social preview for the branding repository',
  });
}

export function profileBanner() {
  const width = 1600;
  const height = 400;
  const layout = markAndText({
    width,
    height,
    mark: 184,
    gap: 52,
    cap: 70,
    lines: [{ id: 'tagline', cap: 27, advance: 62, fill: COLOURS.textSecondary, tail: 6 }],
  });
  return doc(width, height, [...backdrop(width, height, { x: layout.x0 + 92, y: height / 2, r: 360 }), ...layout.body], {
    desc: 'Square Hole organisation profile banner',
  });
}
