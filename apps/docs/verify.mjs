/**
 * End-to-end browser verification of the built docs site.
 *
 * Run: `pnpm --filter docs verify` (builds first, then checks `_site`).
 *
 * This exists because the interesting failure modes here are all SILENT. Every one
 * of the following produced a page with no console error, no failed request, and
 * passing DOM queries:
 *
 *   - components never upgrading, because the bundle had a bare `lit` import
 *   - components upgrading but rendering twice, because the hydrate shim was absent
 *   - the entire library tree-shaken away by a too-narrow `sideEffects` field
 *   - anatomy diagrams rendering as empty boxes, because markdown-it split the
 *     inlined SVG at a blank line
 *
 * A build that succeeds proves nothing about any of them.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '_site');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.map': 'application/json',
};

/** Minimal static server, so this script needs nothing else running. */
const server = createServer(async (req, res) => {
  try {
    let path = join(SITE, normalize(decodeURIComponent(req.url.split('?')[0])));
    if ((await stat(path).catch(() => null))?.isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

const port = await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const BASE = `http://127.0.0.1:${port}`;
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `\n    ${detail}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

/**
 * Navigate and wait until the components are actually defined and painted.
 *
 * `networkidle` is not enough: the client bundle has to evaluate the hydrate
 * support shim before it registers any element, so a check that runs at
 * networkidle can catch the page with its SSR markup present but no element
 * upgraded — which looks exactly like a hydration failure.
 */
const gotoReady = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!customElements.get('qds-button'), null, { timeout: 5000 });
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
};

// ── 1. Component page: SSR + styling ───────────────────────────────────────────
await gotoReady('/components/qds-button/');

const dsd = await page.evaluate(() => {
  const el = document.querySelector('qds-button');
  return {
    exists: !!el,
    // A shadowRoot present before any JS ran means the browser adopted the
    // server-rendered declarative shadow DOM.
    hasShadowRoot: !!el?.shadowRoot,
    upgraded: el?.constructor?.name !== 'HTMLElement',
    innerButton: !!el?.shadowRoot?.querySelector('button'),
  };
});
check('qds-button SSR: shadow root adopted and element upgraded',
  dsd.exists && dsd.hasShadowRoot && dsd.upgraded && dsd.innerButton, JSON.stringify(dsd));

/**
 * Hydration must ADOPT the server-rendered shadow DOM, not render alongside it.
 *
 * Without @lit-labs/ssr-client/lit-element-hydrate-support loaded before lit,
 * every component renders twice — the SSR copy plus a fresh one Lit appends. No
 * error is raised and every querySelector assertion still passes, because it finds
 * the first copy; only counting reveals it.
 */
const hydration = await page.evaluate(() => {
  const els = [...document.querySelectorAll('qds-button')];
  return {
    hosts: els.length,
    buttonCounts: [...new Set(els.map((e) => e.shadowRoot.querySelectorAll('button').length))],
    contentCounts: [...new Set(els.map((e) => e.shadowRoot.querySelectorAll('.content').length))],
  };
});
check('hydration adopts the SSR shadow DOM rather than duplicating it',
  hydration.hosts > 0 &&
    hydration.buttonCounts.length === 1 && hydration.buttonCounts[0] === 1 &&
    hydration.contentCounts.length === 1 && hydration.contentCounts[0] === 1,
  `${hydration.hosts} hosts, buttons/host=${hydration.buttonCounts}, .content/host=${hydration.contentCounts}`);

const styling = await page.evaluate(() => {
  const btn = document.querySelector('qds-button').shadowRoot.querySelector('button');
  const cs = getComputedStyle(btn);
  const root = getComputedStyle(document.documentElement);
  return {
    background: cs.backgroundColor,
    color: cs.color,
    paddingInline: cs.paddingInline,
    tokenBlue600: root.getPropertyValue('--qds-color-blue-600').trim(),
    tokenSemantic: root.getPropertyValue('--qds-semantic-color-background-primary-rest').trim(),
    tokenComponent: root
      .getPropertyValue('--qds-component-button-primary-color-background-rest')
      .trim(),
  };
});
// #2563eb === rgb(37, 99, 235)
check('button background comes from the token chain (not a fallback)',
  styling.background === 'rgb(37, 99, 235)',
  `computed=${styling.background}  component→${styling.tokenComponent}  semantic→${styling.tokenSemantic}  primitive→${styling.tokenBlue600}`);

check('component-tier variable is defined at document level',
  styling.tokenComponent.startsWith('var(') || styling.tokenComponent.length > 0,
  `--qds-component-button-primary-color-background-rest = ${styling.tokenComponent}`);

// ── 2. Theme toggle ────────────────────────────────────────────────────────────
const readTheme = () =>
  page.evaluate(() => {
    const btn = document.querySelector('qds-button').shadowRoot.querySelector('button');
    return {
      theme: document.documentElement.dataset.theme ?? 'system',
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyFg: getComputedStyle(document.body).color,
      buttonBg: getComputedStyle(btn).backgroundColor,
      label: document.getElementById('theme-toggle').textContent.trim(),
    };
  });

// Two animation frames after each toggle: a custom-property change invalidates
// immediately, but the dependent property recalc inside a shadow tree is deferred,
// so reading in the same task returns the previous paint's value.
const settle = () =>
  page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

const before = await readTheme();
await page.click('#theme-toggle'); // system → light
await settle();
const light = await readTheme();
await page.click('#theme-toggle'); // light → dark
await settle();
const dark = await readTheme();

check('theme toggle cycles system → light → dark',
  light.theme === 'light' && dark.theme === 'dark',
  `${before.theme} → ${light.theme} → ${dark.theme}  (label: "${dark.label}")`);

check('dark mode changes page colours',
  light.bodyBg !== dark.bodyBg && light.bodyFg !== dark.bodyFg,
  `bg ${light.bodyBg} → ${dark.bodyBg}   fg ${light.bodyFg} → ${dark.bodyFg}`);

check('dark mode reaches inside shadow DOM (button recoloured)',
  light.buttonBg !== dark.buttonBg,
  `button bg ${light.buttonBg} → ${dark.buttonBg}`);

// ── 3. API tables generated from the manifest ─────────────────────────────────
const api = await page.evaluate(() => {
  const headings = [...document.querySelectorAll('h2')].map((h) => h.textContent.trim());
  const rowsUnder = (text) => {
    const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.trim() === text);
    if (!h) return 0;
    let n = h.nextElementSibling;
    while (n && n.tagName !== 'DIV') n = n.nextElementSibling;
    return n?.querySelectorAll('tbody tr').length ?? 0;
  };
  return {
    headings,
    properties: rowsUnder('Properties'),
    slots: rowsUnder('Slots'),
    events: rowsUnder('Events'),
    cssProps: rowsUnder('CSS custom properties'),
    firstProp: document.querySelector('tbody tr th code')?.textContent,
  };
});
check('API tables populated from custom-elements.json',
  api.properties >= 6 && api.slots === 3 && api.events === 1 && api.cssProps >= 8,
  `properties=${api.properties} slots=${api.slots} events=${api.events} cssProps=${api.cssProps}`);

// ── 4. Interaction: qds-click and loading guard ───────────────────────────────
const interaction = await page.evaluate(async () => {
  const buttons = [...document.querySelectorAll('qds-button')];
  const normal = buttons.find((b) => !b.disabled && !b.loading);
  const loading = buttons.find((b) => b.loading);
  const disabled = buttons.find((b) => b.disabled);

  let fired = 0;
  normal.addEventListener('qds-click', () => fired++);
  normal.shadowRoot.querySelector('button').click();

  let loadingFired = 0;
  loading?.addEventListener('qds-click', () => loadingFired++);
  loading?.shadowRoot.querySelector('button').click();

  let disabledFired = 0;
  disabled?.addEventListener('qds-click', () => disabledFired++);
  disabled?.shadowRoot.querySelector('button').click();

  return { fired, loadingFired, disabledFired, hasSpinner: !!loading?.shadowRoot.querySelector('.spinner') };
});
check('qds-click fires normally but is suppressed while loading/disabled',
  interaction.fired === 1 && interaction.loadingFired === 0 && interaction.disabledFired === 0,
  `normal=${interaction.fired} loading=${interaction.loadingFired} disabled=${interaction.disabledFired} spinner=${interaction.hasSpinner}`);

// Loading label must remain in the accessibility tree.
const a11yName = await page.evaluate(() => {
  const loading = [...document.querySelectorAll('qds-button')].find((b) => b.loading);
  return loading?.textContent.trim();
});
check('loading button keeps its accessible name', !!a11yName, `name="${a11yName}"`);

// ── 5. Form submission across the shadow boundary ────────────────────────────
const formResult = await page.evaluate(() => {
  const form = document.querySelector('form');
  if (!form) return { skipped: true };
  const submitBtn = [...form.querySelectorAll('qds-button')].find((b) => b.type === 'submit');
  submitBtn.shadowRoot.querySelector('button').click();
  return { output: form.querySelector('output')?.textContent };
});
check('a shadow-DOM button submits the form around it',
  formResult.output === 'Submitted', `output="${formResult.output}"`);

// ── 6. Tokens page: reference chains ─────────────────────────────────────────
await gotoReady('/tokens/');
const chains = await page.evaluate(() => {
  const chainLists = [...document.querySelectorAll('.chain')];
  const threeStep = chainLists.filter((c) => c.querySelectorAll('li').length >= 4);
  const sample = threeStep[0]
    ? [...threeStep[0].querySelectorAll('li')].map((li) => li.textContent.trim().replace(/\s+/g, ' '))
    : [];
  return {
    total: chainLists.length,
    threeStep: threeStep.length,
    sample,
    swatches: document.querySelectorAll('.swatch').length,
  };
});
check('token page renders full reference chains',
  chains.threeStep > 0 && chains.swatches > 100,
  `chains=${chains.total} full-depth=${chains.threeStep} swatches=${chains.swatches}\n    e.g. ${chains.sample.join('  ')}`);

// ── 7. Nomenclature page: vocab tables + inline anatomy SVG ──────────────────
await gotoReady('/nomenclature/');
const nomen = await page.evaluate(() => {
  const svgs = [...document.querySelectorAll('.anatomy svg')];
  return {
    anatomyCount: svgs.length,
    // Inlined (not <img>) is what lets the diagram see data-theme.
    inlined: svgs.length > 0 && svgs.every((s) => s.querySelector('text')),
    svgWidths: svgs.map((s) => Math.round(s.getBoundingClientRect().width)),
    mentionsRest: document.body.textContent.includes('Why `rest` exists') ||
      document.body.textContent.includes('Why rest exists'),
    hasKnownGaps: document.body.textContent.includes('Known gaps'),
    brokenWikilinks: (document.body.textContent.match(/!\[\[/g) || []).length,
  };
});
check('nomenclature page inlines all three anatomy diagrams',
  nomen.anatomyCount === 3 && nomen.inlined,
  `count=${nomen.anatomyCount} widths=${nomen.svgWidths}`);
check('no unrendered Obsidian wikilinks remain', nomen.brokenWikilinks === 0);
check('spec documents the rest state and known gaps',
  nomen.mentionsRest && nomen.hasKnownGaps);

// Anatomy SVG must follow the page theme, not just the OS.
await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const svgDark = await page.evaluate(() => {
  const label = document.querySelector('.anatomy svg .label');
  return label ? getComputedStyle(label).fill : 'NO .label FOUND';
});
await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const svgLight = await page.evaluate(() => {
  const label = document.querySelector('.anatomy svg .label');
  return label ? getComputedStyle(label).fill : 'NO .label FOUND';
});
check('inlined anatomy SVG follows the page theme toggle',
  svgDark !== svgLight, `label fill: dark=${svgDark} light=${svgLight}`);

// ── 8. Console cleanliness across every page ─────────────────────────────────
for (const path of ['/', '/tokens/', '/components/', '/components/qds-stack/']) {
  await gotoReady(path);
}
check('no console errors on any page', consoleErrors.length === 0,
  consoleErrors.slice(0, 5).join('\n    ') || 'clean');

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n── ${results.length - failed.length} passed, ${failed.length} failed ──`);
process.exit(failed.length ? 1 : 0);
