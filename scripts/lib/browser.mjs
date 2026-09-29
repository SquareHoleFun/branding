/**
 * Headless Chromium from the pinned Playwright (1.63.0, the version the Square Hole app and its NFT/FIT renderers use).
 * Lookup order: node_modules/ of this repo (after `pnpm install`), then the Square Hole code checkout at
 * $SQUAREHOLE_REPO (default ../squarehole), whose apps/web declares the same pin. The version is checked either way.
 *
 * Every image is a Playwright screenshot of an SVG (or a small HTML page) with a transparent page background, so the
 * PNGs keep real alpha. Device scale factor 1: the viewport is the exact output size.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PLAYWRIGHT_VERSION = '1.63.0';

function playwrightDir() {
  const repo = process.env.SQUAREHOLE_REPO ? resolve(process.env.SQUAREHOLE_REPO) : resolve(ROOT, '..', 'squarehole');
  const candidates = [join(ROOT, 'node_modules', '@playwright', 'test'), join(repo, 'apps', 'web', 'node_modules', '@playwright', 'test')];
  for (const dir of candidates) {
    if (!existsSync(join(dir, 'package.json'))) continue;
    const real = realpathSync(dir);
    const { version } = JSON.parse(readFileSync(join(real, 'package.json'), 'utf8'));
    if (version !== PLAYWRIGHT_VERSION) throw new Error(`@playwright/test is ${version} at ${real}; the kit is pinned to ${PLAYWRIGHT_VERSION}`);
    return real;
  }
  throw new Error(`@playwright/test@${PLAYWRIGHT_VERSION} not found: run pnpm install here, or set SQUAREHOLE_REPO to the Square Hole checkout`);
}

export const svgDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
export const pngDataUrl = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

const PAGE_STYLE = 'html,body{margin:0;padding:0;background:transparent;overflow:hidden}img,svg{display:block}';

export async function openRenderer() {
  const dir = playwrightDir();
  const require = createRequire(join(dir, 'package.json'));
  const mod = await import(pathToFileURL(require.resolve('@playwright/test')).href);
  const chromium = mod.chromium ?? mod.default.chromium;
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  async function shoot(html, width, height, { fullPage = false } = {}) {
    await page.setViewportSize({ width, height });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>${html}</body></html>`);
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((img) => img.decode()));
      await document.fonts.ready;
    });
    if (errors.length) throw new Error(`render errors: ${errors.join(' | ')}`);
    return page.screenshot({ type: 'png', omitBackground: true, fullPage, ...(fullPage ? {} : { clip: { x: 0, y: 0, width, height } }) });
  }

  return {
    info: { playwright: PLAYWRIGHT_VERSION, chromium: browser.version() },
    /** An SVG document rasterised at exactly width × height (the SVG is scaled to fit its viewBox). */
    svg: (svg, width, height = width) => shoot(`<img src="${svgDataUrl(svg)}" width="${width}" height="${height}" alt="">`, width, height),
    /** An HTML fragment at width × height, or at its full height when fullPage is set. */
    html: (html, width, height, options) => shoot(html, width, height, options),
    async close() {
      await browser.close();
    },
  };
}
