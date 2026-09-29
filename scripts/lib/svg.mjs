/**
 * Small SVG helpers for the brand kit: the outlined brand texts (src/text-paths.json, from scripts/outline_text.py)
 * placed at a given size, and the hand-authored marks embedded into larger documents.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './browser.mjs';

export const TEXT = JSON.parse(readFileSync(join(ROOT, 'src', 'text-paths.json'), 'utf8'));
export const CAP = TEXT.font.capHeight;

const round = (v) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

const ARITY = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, Z: 0 };

/** Scales and moves an absolute path (M L H V Q C Z only, as fontTools' SVGPathPen writes it). */
export function transformPath(d, s, dx, dy) {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out = [];
  let cmd = null;
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[A-Za-z]$/.test(t)) {
      if (!(t in ARITY)) throw new Error(`unsupported path command ${t}`);
      cmd = t;
      out.push(t);
      i += 1;
      if (cmd === 'Z') continue;
    } else if (cmd === null || cmd === 'Z') {
      throw new Error('path data starts with a number');
    }
    const n = ARITY[cmd];
    const args = tokens.slice(i, i + n).map(Number);
    if (args.length !== n || args.some(Number.isNaN)) throw new Error(`bad arguments for ${cmd}`);
    i += n;
    const mapped = args.map((v, k) => {
      if (cmd === 'H') return v * s + dx;
      if (cmd === 'V') return v * s + dy;
      return k % 2 === 0 ? v * s + dx : v * s + dy;
    });
    out.push(mapped.map(round).join(' '));
    if (cmd === 'M') cmd = 'L'; // implicit repeats after a moveto are linetos
  }
  return out.join(' ').replace(/ ([A-Za-z])/g, '$1').replace(/([A-Za-z]) /g, '$1');
}

/**
 * One outlined brand text. `cap` is the cap height in px; `x` is where the ink starts (left side bearing removed);
 * `baseline` is the baseline y. Returns the <path> and the ink box in px.
 */
export function text(id, { cap, x, baseline, fill, align = 'left' }) {
  const item = TEXT.texts[id];
  if (!item) throw new Error(`no outlined text "${id}"`);
  const s = cap / CAP;
  const [x0, y0, x1, y1] = item.ink;
  const width = (x1 - x0) * s;
  const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  const dx = left - x0 * s;
  const path = `<path fill="${fill}" d="${transformPath(item.d, s, dx, baseline)}"/>`;
  return { path, left, right: left + width, top: baseline + y0 * s, bottom: baseline + y1 * s, width, scale: s };
}

export const inkWidth = (id, cap) => {
  const [x0, , x1] = TEXT.texts[id].ink;
  return ((x1 - x0) * cap) / CAP;
};

/** The inside of a hand-authored SVG (no outer <svg>, no <title>), for embedding as a nested <svg>. */
export function innerOf(svg) {
  const open = svg.indexOf('>', svg.indexOf('<svg')) + 1;
  const close = svg.lastIndexOf('</svg>');
  return svg.slice(open, close).replace(/\s*<title>[^<]*<\/title>/, '').trim();
}

export const viewBoxOf = (svg) => /viewBox="([^"]+)"/.exec(svg)[1];

/** Places a hand-authored mark (any viewBox) at x, y with the given size. */
export function place(svg, x, y, size, extra = '') {
  return `<svg x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(size)}" viewBox="${viewBoxOf(svg)}"${extra}>${innerOf(svg)}</svg>`;
}

export function doc(width, height, body, { title = 'Square Hole', desc } = {}) {
  const w = round(width);
  const h = round(height);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `  <title>${title}</title>`,
    ...(desc ? [`  <desc>${desc}</desc>`] : []),
    ...body.map((line) => `  ${line}`),
    '</svg>',
    '',
  ].join('\n');
}

export { round };
