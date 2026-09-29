#!/usr/bin/env node
/**
 * Builds the Square Hole brand kit from the hand-authored marks in logo/svg/ and the outlined texts in
 * src/text-paths.json:
 *   - logo/svg/: wordmarks and lockups (generated; the square-hole-mark*.svg and app-icon SVGs are the hand-made source)
 *   - logo/png/: the mark from 16 to 1024 px, flat and mono marks, lockups (real alpha)
 *   - logo/favicon/: favicon.ico (16 + 32 + 48), favicon.svg, apple-touch-icon, icon-192/512, maskable 512, manifest
 *   - github/: organisation avatar, social previews for the code and branding repositories, profile banner
 *   - dotgithub/profile/banner.png (a copy of the banner for the organisation's .github repository)
 *   - logo/preview.png: the review sheet; manifest.json: size and sha256 of every generated file
 *
 *   node scripts/build.mjs          # writes the files
 *   node scripts/build.mjs --check  # renders in memory and compares with manifest.json
 *
 * Rasterising uses the pinned headless Chromium of Playwright 1.63.0 (see scripts/lib/browser.mjs).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, openRenderer } from './lib/browser.mjs';
import {
  COLOURS,
  lockupHorizontal,
  lockupStacked,
  profileBanner,
  readMark,
  socialPreviewBranding,
  socialPreviewCode,
  wordmark,
} from './lib/compose.mjs';
import { previewSheet } from './lib/preview.mjs';
import { TEXT } from './lib/svg.mjs';

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } });

const MARK_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const MAX_SOCIAL_BYTES = 1_000_000;
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const out = (line) => process.stdout.write(`${line}\n`);

function pngSize(buf) {
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colourType: buf.readUInt8(25) };
}

/** A Windows icon file holding PNG-compressed images (every current browser reads it). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((buf, i) => {
    const { width, height } = pngSize(buf);
    const e = 6 + 16 * i;
    header.writeUInt8(width >= 256 ? 0 : width, e);
    header.writeUInt8(height >= 256 ? 0 : height, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buf.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...images]);
}

/** The hand-authored source for a mark PNG of this size: pixel-hinted drawings up to 32 px, the master above. */
function markSourceFor(size) {
  if (size === 16) return 'px16';
  if (size === 24) return 'px24';
  if (size === 32) return 'px32';
  return 'master';
}

const WEBMANIFEST = `${JSON.stringify(
  {
    name: 'Square Hole',
    short_name: 'Square Hole',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    theme_color: COLOURS.canvas,
    background_color: COLOURS.canvas,
    display: 'standalone',
  },
  null,
  2,
)}\n`;

async function build(r) {
  const files = new Map();
  const add = (path, buf, meta) => {
    if (files.has(path)) throw new Error(`duplicate output ${path}`);
    files.set(path, { buf: Buffer.isBuffer(buf) ? buf : Buffer.from(buf), ...meta });
  };
  const svgOf = (key) => readMark(key);

  // Wordmarks and lockups (vector, generated).
  const lockups = {};
  for (const variant of ['dark', 'light', 'mono']) {
    const w = wordmark(variant);
    add(`logo/svg/${w.name}`, w.svg, { kind: 'svg-wordmark', source: 'src/text-paths.json', use: `Wordmark alone (${variant})` });
    for (const make of [lockupHorizontal, lockupStacked]) {
      const l = make(variant);
      lockups[l.name] = l;
      add(`logo/svg/${l.name}`, l.svg, { kind: 'svg-lockup', source: 'logo/svg/square-hole-mark*.svg + src/text-paths.json', use: `Lockup (${variant})` });
    }
  }

  // The mark, 16 to 1024 px.
  const mark = {};
  for (const size of MARK_SIZES) {
    const key = markSourceFor(size);
    mark[size] = await r.svg(svgOf(key), size);
    add(`logo/png/square-hole-mark-${size}.png`, mark[size], {
      kind: 'png-mark',
      source: `logo/svg/${readMarkName(key)}`,
      use: size <= 32 ? `Exactly ${size} px (pixel-hinted drawing)` : `Mark at ${size} px`,
    });
  }
  for (const size of [64, 256, 1024]) {
    add(`logo/png/square-hole-mark-flat-${size}.png`, await r.svg(svgOf('flat'), size), {
      kind: 'png-flat',
      source: 'logo/svg/square-hole-mark-flat.svg',
      use: 'One colour, lavender #A78BFA',
    });
  }
  for (const [name, colour] of [['white', '#FFFFFF'], ['navy', COLOURS.canvas]]) {
    for (const size of [256, 1024]) {
      add(`logo/png/square-hole-mark-mono-${name}-${size}.png`, await r.svg(svgOf('mono').replace('currentColor', colour), size), {
        kind: 'png-mono',
        source: 'logo/svg/square-hole-mark-mono.svg',
        use: `Monochrome, ${colour}`,
      });
    }
  }
  const lockupPngs = {};
  for (const [name, l] of Object.entries(lockups)) {
    if (name.includes('-mono')) continue;
    for (const scale of [1, 2]) {
      const width = Math.ceil(l.width * scale);
      const height = Math.ceil(l.height * scale);
      const png = await r.svg(l.svg, width, height);
      const path = `logo/png/${name.replace('.svg', '')}@${scale}x.png`;
      lockupPngs[path] = png;
      add(path, png, { kind: 'png-lockup', source: `logo/svg/${name}`, use: `Lockup at ${scale}×` });
    }
  }

  // Favicon and app icons.
  const icon48 = mark[48];
  add('logo/favicon/favicon.ico', ico([mark[16], mark[32], icon48]), {
    kind: 'ico',
    source: 'square-hole-mark-16.png + square-hole-mark-32.png + square-hole-mark-48.png',
    use: 'Browser favicon (16, 32, 48)',
  });
  add('logo/favicon/favicon.svg', svgOf('px16'), { kind: 'svg-favicon', source: 'logo/svg/square-hole-mark-16.svg', use: 'Vector favicon (16 grid, crisp at 16 and 32 px)' });
  const app = {
    appleTouch: await r.svg(svgOf('appIcon'), 180),
    icon192: await r.svg(svgOf('master'), 192),
    icon512: await r.svg(svgOf('master'), 512),
    maskable: await r.svg(svgOf('appIcon'), 512),
  };
  add('logo/favicon/apple-touch-icon.png', app.appleTouch, { kind: 'png-app', source: 'logo/svg/square-hole-app-icon.svg', use: 'iOS home screen 180 px, opaque full-bleed face (iOS rounds the corners)' });
  add('logo/favicon/icon-192.png', app.icon192, { kind: 'png-app', source: 'logo/svg/square-hole-mark.svg', use: 'Web app manifest 192 px, transparent corners' });
  add('logo/favicon/icon-512.png', app.icon512, { kind: 'png-app', source: 'logo/svg/square-hole-mark.svg', use: 'Web app manifest 512 px, transparent corners' });
  add('logo/favicon/icon-maskable-512.png', app.maskable, {
    kind: 'png-app',
    source: 'logo/svg/square-hole-app-icon.svg',
    use: 'Web app manifest maskable 512 px, opaque, hole inside the 80% safe zone',
  });
  add('logo/favicon/site.webmanifest', WEBMANIFEST, { kind: 'webmanifest', source: 'scripts/build.mjs', use: 'Example web app manifest' });

  // GitHub.
  const github = {
    avatar: await r.svg(svgOf('appIcon'), 500),
    code: await r.svg(socialPreviewCode(), 1280, 640),
    branding: await r.svg(socialPreviewBranding(), 1280, 640),
    banner: await r.svg(profileBanner(), 1600, 400),
  };
  add('github/org-avatar-500.png', github.avatar, { kind: 'png-github', source: 'logo/svg/square-hole-app-icon.svg', use: 'Organisation avatar (GitHub rounds the corners)' });
  add('github/social-preview-code-1280x640.png', github.code, { kind: 'png-github', source: 'scripts/lib/compose.mjs', use: 'Social preview of the code repository' });
  add('github/social-preview-branding-1280x640.png', github.branding, { kind: 'png-github', source: 'scripts/lib/compose.mjs', use: 'Social preview of the branding repository' });
  add('github/profile-banner.png', github.banner, { kind: 'png-github', source: 'scripts/lib/compose.mjs', use: 'Banner of the organisation profile README' });
  add('dotgithub/profile/banner.png', github.banner, { kind: 'png-github', source: 'github/profile-banner.png', use: 'Copy of the banner for the .github repository' });
  for (const key of ['code', 'branding']) {
    if (github[key].length > MAX_SOCIAL_BYTES) throw new Error(`social preview ${key} is ${github[key].length} B, over 1 MB`);
  }

  // Review sheet.
  const sheet = await previewSheet(r, { mark, app, github, lockupPngs, svgOf });
  add('logo/preview.png', sheet, { kind: 'preview', source: 'scripts/lib/preview.mjs', use: 'Review sheet only, not an asset' });
  return files;
}

function readMarkName(key) {
  return { px16: 'square-hole-mark-16.svg', px24: 'square-hole-mark-24.svg', px32: 'square-hole-mark-32.svg', master: 'square-hole-mark.svg' }[key];
}

function manifestOf(files, info) {
  return {
    schemaVersion: 1,
    name: 'Square Hole brand kit',
    description: 'Generated files of the brand kit. Hand-authored sources: logo/svg/square-hole-mark*.svg, logo/svg/square-hole-app-icon.svg, colors/tokens.json.',
    generator: {
      command: 'node scripts/build.mjs',
      playwright: info.playwright,
      chromium: info.chromium,
      text: 'src/text-paths.json (python3 scripts/outline_text.py)',
      font: `${TEXT.font.family} ${TEXT.font.version} (${TEXT.font.license}), sha256 ${TEXT.font.sha256}`,
      note: 'Another Chromium build may change PNG bytes; review logo/preview.png before committing new hashes.',
    },
    files: [...files.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, f]) => {
        const size = path.endsWith('.png') ? pngSize(f.buf) : null;
        return {
          path,
          kind: f.kind,
          ...(size ? { width: size.width, height: size.height } : {}),
          bytes: f.buf.length,
          sha256: sha256(f.buf),
          source: f.source,
          use: f.use,
        };
      }),
  };
}

const r = await openRenderer();
try {
  const files = await build(r);
  const manifest = manifestOf(files, r.info);
  if (values.check) {
    const committed = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
    const want = new Map(committed.files.map((f) => [f.path, f.sha256]));
    const diffs = manifest.files.filter((f) => f.path !== 'logo/preview.png' && want.get(f.path) !== f.sha256).map((f) => f.path);
    const missing = committed.files.filter((f) => !files.has(f.path)).map((f) => f.path);
    for (const f of manifest.files) {
      if (f.path === 'logo/preview.png') continue;
      const onDisk = readFileSync(join(ROOT, f.path));
      if (sha256(onDisk) !== want.get(f.path)) diffs.push(`${f.path} (file on disk)`);
    }
    if (diffs.length || missing.length) {
      out(`differs: ${[...diffs, ...missing].join(', ')}`);
      process.exitCode = 1;
    } else {
      out(`all ${manifest.files.length - 1} generated files match manifest.json (Chromium ${r.info.chromium})`);
    }
  } else {
    for (const [path, f] of files) {
      mkdirSync(dirname(join(ROOT, path)), { recursive: true });
      writeFileSync(join(ROOT, path), f.buf);
    }
    writeFileSync(join(ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    for (const f of manifest.files) out(`${f.path}  ${f.width ? `${f.width}×${f.height}  ` : ''}${f.bytes} B`);
  }
} finally {
  await r.close();
}
