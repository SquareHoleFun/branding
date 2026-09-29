#!/usr/bin/env node
/**
 * From colors/tokens.json (the source) writes colors/tokens.css and the computed contrast table inside
 * colors/README.md (between the CONTRAST markers). Contrast uses the WCAG 2.x relative-luminance formula, the same one
 * as the Square Hole app's packages/design/src/contrast.ts. Ratios are computed, never typed by hand.
 *
 *   node scripts/tokens.mjs          # writes the files
 *   node scripts/tokens.mjs --check  # fails if either file is out of date, a listed pair misses its threshold, or a
 *                                    # shared colour differs from the app's tokens (when $SQUAREHOLE_REPO or ../squarehole exists)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/browser.mjs';

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } });
const TOKENS = JSON.parse(readFileSync(join(ROOT, 'colors', 'tokens.json'), 'utf8'));
const C = Object.fromEntries(Object.entries(TOKENS.color).map(([k, v]) => [k, v.$value]));
const WHITE = '#FFFFFF';

function luminance(hex) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Minimum ratio per kind: WCAG 2.2 AA body text 4.5, large text 3, non-text (icons, control edges) 3.
const NEED = { text: 4.5, large: 3, 'non-text': 3, decorative: 0, avoid: 0 };
const KIND_LABEL = { text: 'text ≥ 4.5', large: 'large text ≥ 3', 'non-text': 'non-text ≥ 3', decorative: 'decoration', avoid: 'do not use' };

// [foreground token or hex, background token or hex, kind, note]
const PAIRS = [
  ['text', 'canvas', 'text', 'Primary text, the wordmark on dark'],
  ['text', 'surface', 'text', ''],
  ['text', 'surface-raised', 'text', ''],
  ['text-secondary', 'canvas', 'text', 'Taglines, secondary text'],
  ['text-secondary', 'surface', 'text', ''],
  ['text-secondary', 'surface-raised', 'text', ''],
  ['text-muted', 'canvas', 'text', 'Captions (12 px minimum)'],
  ['text-muted', 'surface', 'text', ''],
  ['text-muted', 'surface-raised', 'text', ''],
  ['accent', 'canvas', 'text', 'Lavender links and labels on dark'],
  ['accent', 'surface', 'text', ''],
  ['accent', 'surface-raised', 'text', ''],
  ['on-action', 'action', 'text', 'White on the violet button fill'],
  ['on-action', 'action-hover', 'text', 'Hovered button'],
  ['action', 'canvas', 'avoid', 'Violet as text or as the only colour of a mark on dark: too low'],
  ['action', 'surface-raised', 'avoid', ''],
  ['border-strong', 'canvas', 'non-text', 'Control outlines'],
  ['border-strong', 'surface', 'non-text', ''],
  ['border-strong', 'surface-raised', 'non-text', ''],
  ['border', 'canvas', 'decorative', 'Separators only, never a control edge'],
  ['accent', 'tile-top', 'non-text', 'Mark: lavender lip against the top of the tile'],
  ['accent', 'tile-bottom', 'non-text', 'Mark: lavender lip against the bottom of the tile'],
  ['accent', 'hole', 'non-text', 'Mark: lavender lip against the hole'],
  ['tile-top', 'canvas', 'decorative', 'Mark: the tile on the canvas is quiet on purpose; the lip and rim carry the shape'],
  ['accent', 'canvas', 'non-text', 'Flat mark (lavender) on the canvas'],
  ['canvas', WHITE, 'text', 'Navy on white: the wordmark and mono mark on light backgrounds'],
  ['action', WHITE, 'text', 'Violet on white: allowed as text on light backgrounds'],
  ['accent', WHITE, 'avoid', 'Lavender on white: not for text or the flat mark; use the full-colour or navy mark'],
  ['glow', 'canvas', 'decorative', 'Glow of the hole'],
  ['positive', 'canvas', 'text', 'UI only, with a sign or arrow'],
  ['negative', 'canvas', 'text', 'UI only, with a sign or arrow'],
  ['warning', 'canvas', 'text', 'UI only (Demo badge)'],
];

const hexOf = (key) => (key.startsWith('#') ? key : C[key]);
const nameOf = (key) => (key.startsWith('#') ? (key === WHITE ? 'white `#FFFFFF`' : `\`${key}\``) : `${key} \`${C[key]}\``);

function table() {
  const rows = PAIRS.map(([fg, bg, kind, note]) => {
    const ratio = contrast(hexOf(fg), hexOf(bg));
    const ok = ratio >= NEED[kind];
    const verdict = kind === 'avoid' ? 'avoid' : kind === 'decorative' ? '-' : ok ? 'pass' : 'FAIL';
    return { line: `| ${nameOf(fg)} | ${nameOf(bg)} | ${ratio.toFixed(2)} | ${KIND_LABEL[kind]} | ${verdict} | ${note} |`, ok: kind === 'avoid' || ok };
  });
  const failed = rows.filter((r) => !r.ok);
  if (failed.length) throw new Error(`contrast below threshold:\n${failed.map((r) => r.line).join('\n')}`);
  return ['| Foreground | Background | Ratio | Needs | Result | Note |', '|---|---|---|---|---|---|', ...rows.map((r) => r.line)].join('\n');
}

function css() {
  const lines = [
    '/*',
    ' * Square Hole brand tokens (dark theme). Generated from colors/tokens.json by scripts/tokens.mjs; do not edit.',
    ' * The --sh-* names match the Square Hole app, so this file drops into the app or any page that uses its styles.',
    ' * Contrast of every listed pair is computed in colors/README.md.',
    ' */',
    ':root {',
    '  color-scheme: dark;',
    '',
    '  /* Colour */',
  ];
  for (const [key, t] of Object.entries(TOKENS.color)) lines.push(`  ${t.css}: ${t.$value}; /* ${key}${t.name ? ` (${t.name})` : ''} */`);
  lines.push('', '  /* Type (no font file here: load Plus Jakarta Sans yourself, see typography/README.md) */');
  for (const t of Object.values(TOKENS.font)) {
    const v = Array.isArray(t.$value) ? t.$value.map((f) => (/\s/.test(f) && !f.includes('-apple') ? `'${f}'` : f)).join(', ') : t.$value;
    lines.push(`  ${t.css}: ${v};`);
  }
  lines.push('', '  /* Radius */');
  for (const t of Object.values(TOKENS.radius)) lines.push(`  ${t.css}: ${t.$value};`);
  lines.push('}', '');
  return lines.join('\n');
}

/** Shared colours must equal the app's tokens (packages/design/src/styles/tokens.css) when that checkout is present. */
function crossCheck() {
  const repo = process.env.SQUAREHOLE_REPO ? resolve(process.env.SQUAREHOLE_REPO) : resolve(ROOT, '..', 'squarehole');
  const file = join(repo, 'packages', 'design', 'src', 'styles', 'tokens.css');
  if (!existsSync(file)) return 'app tokens not found; cross-check skipped';
  const app = Object.fromEntries([...readFileSync(file, 'utf8').matchAll(/(--sh-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2].toUpperCase()]));
  const shared = Object.values(TOKENS.color).filter((t) => t.css in app);
  const diff = shared.filter((t) => app[t.css] !== t.$value.toUpperCase());
  if (diff.length) throw new Error(`differs from the app's tokens: ${diff.map((t) => `${t.css} ${t.$value} vs ${app[t.css]}`).join(', ')}`);
  return `${shared.length} shared colours equal the app's tokens`;
}

const README = join(ROOT, 'colors', 'README.md');
const START = '<!-- CONTRAST:START (generated by node scripts/tokens.mjs) -->';
const END = '<!-- CONTRAST:END -->';
const readme = readFileSync(README, 'utf8');
const a = readme.indexOf(START);
const b = readme.indexOf(END);
if (a < 0 || b < a) throw new Error('colors/README.md lacks the CONTRAST markers');
const nextReadme = `${readme.slice(0, a + START.length)}\n${table()}\n${readme.slice(b)}`;
const nextCss = css();
const note = crossCheck();

if (values.check) {
  const stale = [];
  if (readme !== nextReadme) stale.push('colors/README.md');
  if (readFileSync(join(ROOT, 'colors', 'tokens.css'), 'utf8') !== nextCss) stale.push('colors/tokens.css');
  if (stale.length) {
    process.stdout.write(`out of date: ${stale.join(', ')} (run node scripts/tokens.mjs)\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`colors/tokens.css and the contrast table are up to date; ${note}\n`);
  }
} else {
  writeFileSync(README, nextReadme);
  writeFileSync(join(ROOT, 'colors', 'tokens.css'), nextCss);
  process.stdout.write(`wrote colors/tokens.css and the contrast table (${PAIRS.length} pairs); ${note}\n`);
}
