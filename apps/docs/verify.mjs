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
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
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

/** Every page the build wrote, as a URL path: what the console sweep visits. */
const builtPages = (await readdir(SITE, { recursive: true }))
  .filter((file) => file.endsWith('index.html') || file === '404.html')
  .map((file) => '/' + file.replace(/index\.html$/, ''))
  .sort();
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
await gotoReady('/components/button/');

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
  page.evaluate(async () => {
    const btn = document.querySelector('qds-button').shadowRoot.querySelector('button');
    // The button transitions its colors; read once that has finished, or a read
    // can land at the start of the transition and still see the old theme.
    await Promise.all(btn.getAnimations().map((animation) => animation.finished));
    return {
      theme: document.documentElement.dataset.theme ?? 'none',
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyFg: getComputedStyle(document.body).color,
      buttonBg: getComputedStyle(btn).backgroundColor,
      pressed: document.getElementById('theme-toggle').getAttribute('aria-pressed'),
      name: document.getElementById('theme-toggle').getAttribute('aria-label'),
    };
  });

// Two animation frames after each toggle: a custom-property change invalidates
// immediately, but the dependent property recalc inside a shadow tree is deferred,
// so reading in the same task returns the previous paint's value.
const settle = () =>
  page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

// Light is the default, whatever the OS prefers, so start from a dark OS setting.
await page.emulateMedia({ colorScheme: 'dark' });
await page.reload();
await settle();
const light = await readTheme();
await page.click('#theme-toggle'); // light → dark
await settle();
const dark = await readTheme();
await page.click('#theme-toggle'); // dark → light
await settle();
const back = await readTheme();
await page.click('#theme-toggle'); // and dark again, for the checks below
await settle();
await page.emulateMedia({ colorScheme: 'light' });

check('theme starts light, even on a dark OS, and toggles light ↔ dark',
  light.theme === 'light' && light.pressed === 'false' &&
    dark.theme === 'dark' && dark.pressed === 'true' && back.theme === 'light' && dark.name === 'Dark theme',
  `${light.theme} → ${dark.theme} → ${back.theme}  (pressed ${light.pressed} → ${dark.pressed}; name "${dark.name}")`);

check('dark mode changes page colors',
  light.bodyBg !== dark.bodyBg && light.bodyFg !== dark.bodyFg,
  `bg ${light.bodyBg} → ${dark.bodyBg}   fg ${light.bodyFg} → ${dark.bodyFg}`);

check('dark mode reaches inside shadow DOM (button recolored)',
  light.buttonBg !== dark.buttonBg,
  `button bg ${light.buttonBg} → ${dark.buttonBg}`);

// ── 3. API tables generated from the manifest ─────────────────────────────────
// On the component's API page, one section per element, each table under an
// h3 whose id is prefixed with the element (qds-button-properties).
await gotoReady('/components/button/api/');
const api = await page.evaluate(() => {
  const rowsUnder = (id) => {
    let n = document.getElementById(id)?.nextElementSibling;
    while (n && n.tagName !== 'DIV') n = n.nextElementSibling;
    return n?.querySelectorAll('tbody tr').length ?? 0;
  };
  return {
    properties: rowsUnder('qds-button-properties'),
    slots: rowsUnder('qds-button-slots'),
    events: rowsUnder('qds-button-events'),
    cssProps: rowsUnder('qds-button-tokens'),
  };
});
check('API tables populated from custom-elements.json',
  api.properties >= 6 && api.slots === 3 && api.events === 1 && api.cssProps >= 8,
  `properties=${api.properties} slots=${api.slots} events=${api.events} cssProps=${api.cssProps}`);

await gotoReady('/components/button/');

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
await gotoReady('/foundations/tokens/');
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

// The package the page documents, with its version read from package.json.
const tokensPackage = JSON.parse(await readFile(new URL('../../packages/design-tokens/package.json', import.meta.url), 'utf8'));
const packageLinks = await page.evaluate(() => ({
  text: document.querySelector('.package-links')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
  hrefs: [...document.querySelectorAll('.package-links a')].map((a) => a.href),
}));
check('the Tokens page links to its package on npm and GitHub',
  packageLinks.text.includes(`@quieto/design-tokens ${tokensPackage.version}`) &&
    packageLinks.hrefs.includes('https://www.npmjs.com/package/@quieto/design-tokens') &&
    packageLinks.hrefs.some((href) => href.endsWith('/tree/main/packages/design-tokens')),
  packageLinks.hrefs.join('  '));

// ── 7. Nomenclature page: the naming spec, with inline anatomy SVG ───────────
await gotoReady('/foundations/nomenclature/');
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
check('the Nomenclature page inlines all three anatomy diagrams',
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

// ── Radio group: state survives hydration ─────────────────────────────────────
/**
 * Server-rendered radios are already slotted when the group hydrates, so no
 * slotchange arrives. A group that only synced on slotchange showed nothing
 * checked and stayed enabled when disabled. Only a hydrated page shows it.
 */
await gotoReady('/components/radio-group/');
const radioSync = await page.evaluate(() => {
  const groups = [...document.querySelectorAll('qds-radio-group')];
  const valued = groups.find((g) => g.getAttribute('value') === 'standard');
  const disabled = groups.find((g) => g.hasAttribute('disabled'));
  return {
    checked: [...valued.querySelectorAll('qds-radio')].filter((r) => r.checked).map((r) => r.value),
    disabledSynced: [...disabled.querySelectorAll('qds-radio')].every((r) => r.groupDisabled),
  };
});
check('qds-radio-group syncs its options after hydration',
  radioSync.checked.join() === 'standard' && radioSync.disabledSynced, JSON.stringify(radioSync));

// ── Text field: slotted hint survives hydration ──────────────────────────────
/**
 * A slotted hint is already assigned when the server-rendered field hydrates, so
 * no slotchange arrives. A field that only checked on slotchange kept it hidden.
 */
await gotoReady('/components/text-field/');
const slottedHint = await page.evaluate(() => {
  const field = [...document.querySelectorAll('qds-text-field')].find((f) =>
    f.querySelector('[slot="hint"]'),
  );
  const hint = field.shadowRoot.querySelector('#hint');
  return {
    visible: !!hint && !hint.hidden && hint.getBoundingClientRect().height > 0,
    describedBy: field.shadowRoot.querySelector('input').getAttribute('aria-describedby'),
  };
});
check('qds-text-field shows a slotted hint after hydration',
  slottedHint.visible && slottedHint.describedBy === 'hint', JSON.stringify(slottedHint));

// ── Chip: remove example ─────────────────────────────────────────────────────
await gotoReady('/components/chip/');
const chipRemoval = await page.evaluate(() => {
  const list = document.getElementById('filters');
  const before = list.querySelectorAll('qds-chip').length;
  list.querySelector('qds-chip').shadowRoot.querySelector('button').click();
  return { before, after: list.querySelectorAll('qds-chip').length };
});
check('qds-chip remove button fires qds-remove, and the example removes the chip',
  chipRemoval.after === chipRemoval.before - 1, JSON.stringify(chipRemoval));

// A disabled filter chip must not react to hover. Needs a real pointer.
const disabledChip = page.locator('qds-chip[selectable][disabled]');
const chipFill = () =>
  disabledChip.evaluate((chip) => getComputedStyle(chip.shadowRoot.querySelector('.base')).backgroundColor);
await page.mouse.move(0, 0);
const fillAtRest = await chipFill();
await disabledChip.hover({ force: true });
const fillHovered = await chipFill();
check('a disabled filter chip does not change on hover',
  fillAtRest === fillHovered, JSON.stringify({ fillAtRest, fillHovered }));

// ── Accordion: interaction after hydration ───────────────────────────────────
await gotoReady('/components/accordion/');
const accordionToggle = await page.evaluate(() => {
  const exclusive = document.querySelector('qds-accordion[exclusive]');
  const items = [...exclusive.querySelectorAll('qds-accordion-item')];
  items[1].shadowRoot.querySelector('button').click();
  return items.map((item) => item.open);
});
check('qds-accordion opens an item on click and closes the others when exclusive',
  accordionToggle.join() === 'false,true,false', JSON.stringify(accordionToggle));

// ── Tabs: selection survives hydration ───────────────────────────────────────
/**
 * Server-rendered tabs are already slotted when qds-tabs hydrates, so selection
 * has to be resolved without slotchange. Panels are hidden until it is, so a
 * failure shows up as every panel hidden.
 */
await gotoReady('/components/tabs/');
const tabsState = await page.evaluate(async () => {
  // The examples' tabs, not the playground's, which comes first on the page.
  const [basic, initial] = document.querySelectorAll('.example qds-tabs');
  const visible = (tabs) =>
    [...tabs.querySelectorAll('qds-tab-panel')].map((p) => getComputedStyle(p).display !== 'none');
  const before = { basic: visible(basic), initial: visible(initial) };
  basic.querySelectorAll('qds-tab')[2].click();
  // Selection renders on Lit's next update, not synchronously with the click.
  await basic.updateComplete;
  return { before, afterClick: visible(basic) };
});
check('qds-tabs shows the selected panel after hydration, and switches on click',
  tabsState.before.basic.join() === 'true,false,false,false' &&
    tabsState.before.initial.join() === 'false,true,false' &&
    tabsState.afterClick.join() === 'false,false,true,false',
  JSON.stringify(tabsState));

// ── Modal: real keyboard, inert page, focus return ───────────────────────────
/**
 * The native dialog supplies Escape, inertness, and focus return. Driven with a
 * real key press, since a synthetic event exercises none of them.
 */
await gotoReady('/components/modal/');
const opener = page.locator('qds-button', { hasText: 'Delete project' }).first();
await opener.click();
await page.waitForFunction(() => document.getElementById('delete-modal').open);
const whileOpen = await page.evaluate(() => {
  const dialog = document.getElementById('delete-modal').shadowRoot.querySelector('dialog');
  // Inert content refuses focus, so a link behind the modal stays unfocused.
  const link = document.querySelector('a[href]');
  link.focus();
  return { modal: dialog.matches(':modal'), pageInert: document.activeElement !== link };
});
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.getElementById('delete-modal').open);
const focusReturned = await page.evaluate(() => {
  const active = document.activeElement;
  return active?.tagName === 'QDS-BUTTON' && active.textContent.includes('Delete project');
});
check('qds-modal opens modally, closes on Escape, and returns focus to its opener',
  whileOpen.modal && whileOpen.pageInert && focusReturned,
  JSON.stringify({ ...whileOpen, focusReturned }));

// A slotted <form method="dialog"> cannot reach the shadow dialog natively.
await opener.click();
await page.waitForFunction(() => document.getElementById('delete-modal').open);
await page.locator('#delete-modal qds-button', { hasText: 'Cancel' }).click();
const closedByForm = await page
  .waitForFunction(() => !document.getElementById('delete-modal').open, null, { timeout: 2000 })
  .then(() => true, () => false);
const returned = await page.evaluate(() => document.getElementById('delete-result').textContent);
check('qds-modal closes from a slotted form with method="dialog", reporting the qds-button value',
  closedByForm && returned === 'Closed with: cancel', returned);

// Light dismiss with a real mouse: a click on the dialog's own border must not
// close it, since the dialog is the event target there just as on the backdrop.
await page.locator('qds-button', { hasText: "What's new" }).click();
await page.waitForFunction(() => document.getElementById('info-modal').open);
const box = await page.evaluate(() => {
  const r = document.getElementById('info-modal').shadowRoot.querySelector('dialog').getBoundingClientRect();
  return { left: r.left, top: r.top, height: r.height };
});
await page.mouse.click(box.left + 0.5, box.top + box.height / 2);
const openAfterBorder = await page.evaluate(() => document.getElementById('info-modal').open);
await page.mouse.click(5, 5);
const openAfterBackdrop = await page
  .waitForFunction(() => !document.getElementById('info-modal').open, null, { timeout: 2000 })
  .then(() => false, () => true);
check('qds-modal light dismiss: a border click keeps it open, a backdrop click closes it',
  openAfterBorder && !openAfterBackdrop, JSON.stringify({ openAfterBorder, openAfterBackdrop }));

// ── Component descriptions are escaped exactly once ──────────────────────────
// The modal's description mentions <dialog>: double-escaping printed "&lt;dialog&gt;".
await gotoReady('/components/modal/');
const about = await page.evaluate(() => {
  const heading = document.getElementById('about');
  let text = '';
  for (let n = heading?.nextElementSibling; n && n.tagName === 'P'; n = n.nextElementSibling) text += n.textContent;
  return { text, meta: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '' };
});
check('component descriptions are not double-escaped',
  about.text.includes('<dialog>') && !about.text.includes('&lt;') && !about.meta.includes('&amp;'),
  about.text.slice(0, 120));

// ── Focus ring: drawn, and following the semantic token ─────────────────────
/**
 * Components draw the ring on different elements (here an inner button, a drawn
 * box, and the host). Override the semantic focus color and focus each with a
 * real Tab press, since :focus-visible needs keyboard focus: each ring must
 * appear, in the overridden color.
 */
const ringColor = async (path, tag, ringSelector) => {
  await gotoReady(path);
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--qds-semantic-color-border-primary', 'rgb(1, 2, 3)'),
  );
  await page.evaluate(() => document.activeElement?.blur());
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const reached = await page.evaluate((t) => document.activeElement?.tagName === t.toUpperCase(), tag);
    if (reached) break;
  }
  return page.evaluate(
    ({ tag, ringSelector }) => {
      const host = document.activeElement;
      if (host?.tagName !== tag.toUpperCase()) return 'never focused';
      const ring = ringSelector ? host.shadowRoot.querySelector(ringSelector) : host;
      return getComputedStyle(ring).outlineColor;
    },
    { tag, ringSelector },
  );
};
const rings = {
  button: await ringColor('/components/button/', 'qds-button', 'button'),
  checkbox: await ringColor('/components/checkbox/', 'qds-checkbox', '.control'),
  tab: await ringColor('/components/tabs/', 'qds-tab', null),
};
check('focus rings appear on keyboard focus and follow the semantic focus color',
  Object.values(rings).every((color) => color === 'rgb(1, 2, 3)'), JSON.stringify(rings));

// ── Search ──────────────────────────────────────────────────────────────────
/**
 * Every link in the index must land somewhere: each URL's page must exist and,
 * if it has a fragment, contain an element with that id. This is what keeps the
 * index from drifting from the pages it points into.
 */
{
  const index = JSON.parse(await readFile(join(SITE, 'search-index.json'), 'utf8'));
  const pageCache = new Map();
  const broken = [];
  for (const entry of index) {
    const [path, hash] = entry.url.split('#');
    const file = join(SITE, path, path.endsWith('/') ? 'index.html' : '');
    if (!pageCache.has(file)) pageCache.set(file, await readFile(file, 'utf8').catch(() => null));
    const html = pageCache.get(file);
    if (html === null || (hash && !html.includes(`id="${hash}"`))) broken.push(entry.url);
  }
  check('every search result links to a page and anchor that exist',
    index.length > 500 && broken.length === 0,
    broken.length ? broken.slice(0, 5).join(', ') : `${index.length} entries`);
}

// Real keyboard, end to end: "/" opens it, typing searches, Enter goes there.
await gotoReady('/');
await page.keyboard.press('/');
await page.waitForFunction(() => document.activeElement?.id === 'search-input');
await page.keyboard.type('toggle');
await page.waitForFunction(() => document.querySelectorAll('.search__option').length > 0);
const firstResult = await page.evaluate(() => document.querySelector('.search__option .search__title').textContent);
await page.keyboard.press('Enter');
await page.waitForURL('**/components/toggle/');
check('search opens on "/", ranks the component first, and Enter goes to it',
  firstResult === 'Toggle' && page.url().endsWith('/components/toggle/'), firstResult);

// A token result lands on its own row.
await gotoReady('/');
await page.keyboard.press('Control+K');
await page.waitForFunction(() => document.activeElement?.id === 'search-input');
await page.keyboard.type('background primary rest');
await page.waitForFunction(() => document.querySelectorAll('.search__option').length > 0);
await page.keyboard.press('Enter');
await page.waitForURL('**/foundations/tokens/#qds-semantic-color-background-primary-rest');
// The row is in the Semantic tab: token-reference.js has to open it.
await page.waitForFunction(() => {
  const row = document.querySelector(':target');
  return row && row.getBoundingClientRect().height > 0;
});
const landed = await page.evaluate(() => ({
  id: document.querySelector(':target')?.id,
  tab: document.querySelector('qds-tab[selected]')?.dataset.tier,
}));
check('a token search result opens its tier\'s tab and lands on its row',
  landed.id === 'qds-semantic-color-background-primary-rest' && landed.tab === 'semantic',
  JSON.stringify(landed));

// "/" typed into a component's input is text, not the shortcut. The keypress
// is retargeted to the component host, which is not itself an input.
await gotoReady('/components/text-field/');
await page.locator('qds-text-field').first().click();
await page.keyboard.type('a/b');
const typed = await page.evaluate(() => ({
  value: document.querySelector('qds-text-field').value,
  searchOpen: document.getElementById('search').open,
}));
check('"/" typed in a qds-text-field stays in the field',
  typed.value === 'a/b' && !typed.searchOpen, JSON.stringify(typed));

// ── Roadmap: the budget, and nothing shipped off the books ───────────────────
/**
 * The roadmap's whole premise is a budget, so the build enforces it: at most
 * `budget` components, and every shipped element accounted for on the roadmap —
 * a component added to the library without a roadmap entry would otherwise
 * slip past the count.
 */
{
  const { default: loadRoadmap } = await import('./src/_data/roadmap.js');
  const roadmap = await loadRoadmap();
  check('the roadmap stays within its component budget',
    roadmap.total <= roadmap.budget, `${roadmap.total} of ${roadmap.budget}`);
  check('every shipped element is on the roadmap',
    roadmap.unlisted.length === 0, roadmap.unlisted.join(', ') || 'all listed');

  await gotoReady('/roadmap/');
  const rendered = await page.evaluate(() =>
    [...document.querySelectorAll('#shipped + .table-scroll tbody th a')].map((a) => a.textContent.trim()),
  );
  const expected = roadmap.shipped.map((component) => component.name);
  check('the roadmap page lists exactly the shipped components',
    rendered.join() === expected.join(), `${rendered.length} shipped`);
}

// ── Information architecture ─────────────────────────────────────────────────
/**
 * Every old address in _redirects must lead to a page that exists, and every
 * element that used to have its own page must have a redirect — or a link
 * someone saved before the restructure ends in a 404.
 */
{
  const lines = (await readFile(join(SITE, '_redirects'), 'utf8'))
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'));
  const pairs = lines.map((line) => line.trim().split(/\s+/));
  const dangling = pairs.filter(([, to]) => !builtPages.includes(to)).map(([from, to]) => `${from} → ${to}`);
  const manifest = JSON.parse(await readFile(require.resolve('@quieto/ui/custom-elements.json'), 'utf8'));
  const tags = manifest.modules.flatMap((mod) => mod.declarations ?? []).map((d) => d.tagName).filter(Boolean);
  const missing = tags.filter((tag) => !pairs.some(([from]) => from === `/components/${tag}/`));
  check('every old address redirects to a page that exists',
    pairs.length > 0 && dangling.length === 0 && missing.length === 0,
    [...dangling, ...missing.map((tag) => `no redirect for /components/${tag}/`)].join(', ') || `${pairs.length} redirects`);
}

// The sidebar marks the page being read, and long pages list their sections.
await gotoReady('/components/tabs/api/');
const chrome = await page.evaluate(() => ({
  sidebarCurrent: document.querySelector('.sidebar [aria-current="page"]')?.textContent.trim(),
  headerCurrent: document.querySelector('.site-nav [aria-current]')?.textContent.trim(),
  tabCurrent: document.querySelector('.page-tabs [aria-current="page"]')?.textContent.trim(),
  contents: [...document.querySelectorAll('.page-contents a')].map((a) => a.textContent.trim()),
}));
check('a component API page marks its place in the header, sidebar, and tabs, and lists its sections',
  chrome.sidebarCurrent === 'Tabs' && chrome.headerCurrent === 'Components' && chrome.tabCurrent === 'API' &&
    chrome.contents.join() === '<qds-tabs>,<qds-tab>,<qds-tab-panel>',
  JSON.stringify(chrome));

// The token reference filter narrows every tier, and switches to one with matches.
await gotoReady('/foundations/tokens/');
await page.locator('#token-filter').click();
await page.keyboard.type('semantic background primary rest');
await page.waitForFunction(() => document.getElementById('token-filter-status').textContent.includes('match'));
const filtered = await page.evaluate(() => ({
  status: document.getElementById('token-filter-status').textContent,
  counts: [...document.querySelectorAll('qds-tab .tab-count')].map((c) => c.textContent),
  tab: document.querySelector('qds-tab[selected]')?.dataset.tier,
  visible: [...document.querySelectorAll('qds-tab-panel[active] tbody tr:not([hidden])')].map((r) => r.id),
}));
check('the token filter narrows every tier and opens the one with matches',
  filtered.counts.join() === '0,1' && filtered.tab === 'semantic' &&
    filtered.visible.join() === 'qds-semantic-color-background-primary-rest',
  JSON.stringify(filtered));

// Every color role meets its contrast minimum, in both modes. The ratios are
// computed at build time from the shipped values; a failure here is a token
// that is not accessible, not a page bug.
await gotoReady('/styles/color/');
const contrast = await page.evaluate(() => ({
  judged: document.querySelectorAll('.role-state__contrast qds-chip').length,
  failing: [...document.querySelectorAll('.role-state__contrast qds-chip[variant="error"]')].map((chip) =>
    `${chip.closest('.role-state').querySelector('code').textContent} ${chip.textContent.trim()}`),
}));
check('every content and border role meets its contrast minimum in both modes',
  contrast.judged > 20 && contrast.failing.length === 0,
  contrast.failing.join('; ') || `${contrast.judged} ratios, all passing`);

// ── Component playgrounds ────────────────────────────────────────────────────
/**
 * Every component page has a playground, and every control in it works: each is
 * exercised as a reader would (a radio picked, a toggle flipped, a field typed
 * into) and must change the rendered component and the code shown. This is what
 * keeps a playground from quietly drifting from its component.
 */
{
  const { default: loadPlaygrounds } = await import('./src/_data/playgrounds.js');
  const playgrounds = await loadPlaygrounds();
  const broken = [];
  let exercised = 0;

  for (const playground of playgrounds) {
    await gotoReady(`/components/${playground.slug}/`);
    const result = await page.evaluate((tag) => {
      const root = document.querySelector('[data-playground]');
      if (!root) return { problems: ['no playground'], exercised: 0 };
      const preview = () => root.querySelector(`.playground__preview ${tag}`);
      const code = () => root.querySelector('.playground__code code').textContent;
      const problems = [];
      if (!preview()) problems.push('preview has no component');
      if (!code().startsWith('<') || code().includes('&lt;')) problems.push('code is not plain markup');

      let exercised = 0;
      for (const control of root.querySelectorAll('.playground__controls [data-control]')) {
        const name = control.dataset.control;
        if (name === 'content') continue;
        let expect;
        if (control.localName === 'qds-radio-group') {
          const other = [...control.querySelectorAll('qds-radio')].find((radio) => radio.value !== control.value);
          other.click();
          expect = (el) => el.getAttribute(name) === other.value || (!el.hasAttribute(name) && code().includes(`<${tag}`));
          // A choice back to the default is omitted; anything else must be shown.
          if (!code().includes(`${name}="${other.value}"`) && preview()?.getAttribute(name) !== null) {
            problems.push(`${name}: code does not show "${other.value}"`);
          }
        } else if (control.localName === 'qds-toggle') {
          const was = preview()?.hasAttribute(name);
          control.shadowRoot.querySelector('button').click();
          expect = (el) => el.hasAttribute(name) !== was;
        } else {
          const input = control.shadowRoot.querySelector('input');
          const value = input.type === 'number' ? '7' : 'Changed';
          input.value = value;
          input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
          expect = (el) => el.getAttribute(name) === value && code().includes(`${name}="${value}"`);
        }
        const el = preview();
        if (!el || !expect(el)) problems.push(`${name} did not change the component`);
        exercised++;
      }
      return { problems, exercised };
    }, playground.tag);
    exercised += result.exercised;
    broken.push(...result.problems.map((problem) => `${playground.tag}: ${problem}`));
  }

  check('every component has a playground, and every control changes the component and its code',
    broken.length === 0 && exercised > 40,
    broken.slice(0, 6).join('; ') || `${playgrounds.length} playgrounds, ${exercised} controls`);
}

// Example source is shown as markup, not as escaped markup.
{
  const doubled = [];
  for (const path of builtPages.filter((p) => p.startsWith('/components/') && !p.endsWith('/api/'))) {
    await gotoReady(path);
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('.example__source code')].filter((code) => code.textContent.includes('&lt;')).length,
    );
    if (bad) doubled.push(`${path} (${bad})`);
  }
  check('example source is shown as markup, not escaped twice',
    doubled.length === 0, doubled.join(', ') || 'all examples');
}

// Each shipped component on the roadmap links to its own page.
await gotoReady('/roadmap/');
const roadmapLinks = await page.evaluate(() =>
  [...document.querySelectorAll('#shipped + .table-scroll tbody th a')].map((a) => [a.textContent.trim(), a.getAttribute('href')]),
);
const wrongLinks = roadmapLinks.filter(([name, href]) => href !== `/components/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`);
check('each shipped component on the roadmap links to its own page',
  roadmapLinks.length > 0 && wrongLinks.length === 0,
  wrongLinks.map(([name, href]) => `${name} → ${href}`).join(', ') || `${roadmapLinks.length} links`);

// ── Component tokens live on their components' pages ─────────────────────────
/**
 * Every component token is listed on exactly one component's Tokens tab, and
 * none is left on the Tokens page: the move must not lose or duplicate a token.
 */
{
  const { tokens: manifestTokens } = await import('@quieto/design-tokens');
  const expected = manifestTokens.filter((token) => token.tier === 'component').map((token) => token.name);
  const seen = new Map();
  for (const path of builtPages.filter((p) => p.endsWith('/tokens/'))) {
    const html = await readFile(join(SITE, path, 'index.html'), 'utf8');
    for (const [, id] of html.matchAll(/<tr id="(qds-component-[^"]+)"/g)) {
      seen.set(id, [...(seen.get(id) ?? []), path]);
    }
  }
  const missing = expected.filter((name) => !seen.has(name));
  const duplicated = [...seen].filter(([, paths]) => paths.length > 1).map(([name]) => name);
  const onTokensPage = [...seen].filter(([, paths]) => paths.includes('/foundations/tokens/')).map(([name]) => name);
  check('every component token is on exactly one component page, and none on the Tokens page',
    expected.length > 200 && missing.length === 0 && duplicated.length === 0 && onTokensPage.length === 0,
    [...missing.slice(0, 3).map((n) => `missing ${n}`), ...duplicated.slice(0, 3).map((n) => `twice ${n}`),
      ...onTokensPage.slice(0, 3).map((n) => `still on Tokens: ${n}`)].join(', ') || `${expected.length} tokens`);
}

// A component token's search result lands on its row, on its component's Tokens tab.
await gotoReady('/');
await page.keyboard.press('/');
await page.waitForFunction(() => document.activeElement?.id === 'search-input');
await page.keyboard.type('chip selected background rest');
await page.waitForFunction(() => document.querySelectorAll('.search__option').length > 0);
await page.keyboard.press('Enter');
await page.waitForURL('**/components/chip/tokens/**');
const componentTarget = await page.evaluate(() => document.querySelector(':target')?.id);
check('a component token search result lands on its row on the component\'s Tokens tab',
  componentTarget === 'qds-component-chip-selected-color-background-rest', String(componentTarget));

// A link to a component token on the Tokens page, from before the move, is forwarded.
await page.goto(`${BASE}/foundations/tokens/#qds-component-radio-group-gap`);
const forwarded = await page
  .waitForURL('**/components/radio-group/tokens/#qds-component-radio-group-gap', { timeout: 5000 })
  .then(() => true, () => false);
check('an old link to a component token on the Tokens page forwards to its component',
  forwarded, page.url().replace(BASE, ''));

// ── 8. Console cleanliness across every page ─────────────────────────────────
const narrow = [];
const noFooter = [];
for (const path of builtPages) {
  await gotoReady(path);
  // A layout regression can collapse the content column without any error: the
  // page still renders, one word per line. At this window size every page's
  // column should be most of its 52rem maximum.
  const width = await page.evaluate(() => document.querySelector('main').getBoundingClientRect().width);
  if (width < 600) narrow.push(`${path} (${Math.round(width)}px)`);
  if (!(await page.locator('.site-footer__columns a').count())) noFooter.push(path);
}
// The AI section: the MCP server's client tabs work, and both tools' tables are there.
await gotoReady('/ai/mcp/');
const mcpPage = await page.evaluate(async () => {
  const tabs = document.querySelector('.client-tabs');
  const names = [...tabs.querySelectorAll('qds-tab')].map((tab) => tab.textContent.trim());
  tabs.selectedIndex = names.indexOf('Cursor');
  await tabs.updateComplete;
  const open = [...tabs.querySelectorAll('qds-tab-panel')].find((panel) => panel.checkVisibility());
  return {
    names,
    cursorShowsConfig: open?.textContent.includes('"mcpServers"') ?? false,
    tools: document.querySelectorAll('#tools ~ .table-scroll tbody tr').length,
  };
});
check('the MCP server page switches between clients and lists its tools',
  mcpPage.names.length === 5 && mcpPage.cursorShowsConfig && mcpPage.tools === 7,
  `tabs=${mcpPage.names.join('/')} cursor=${mcpPage.cursorShowsConfig} tools=${mcpPage.tools}`);

await gotoReady('/ai/skills/');
const skillsPage = await page.evaluate(() => ({
  skills: [...document.querySelectorAll('tbody td:first-child code')].map((code) => code.textContent),
  npm: !!document.querySelector('.package-links a[href="https://www.npmjs.com/package/@quieto/skills"]'),
}));
check('the Skills page lists every skill and links to the package',
  skillsPage.skills.length === 7 && skillsPage.skills.every((name) => name.startsWith('/design-token-')) && skillsPage.npm,
  skillsPage.skills.join(' '));

// The home page: the hero's numbers, the AI band, and the site footer.
await gotoReady('/');
const home = await page.evaluate(() => ({
  stats: [...document.querySelectorAll('.hero-stats dd')].map((dd) => dd.textContent.trim()),
  aiLinks: [...document.querySelectorAll('.home-band--ai .link-card a')].map((a) => a.getAttribute('href')),
  footerLinks: document.querySelectorAll('.site-footer__columns a').length,
}));
check('the home page shows its numbers, the AI tools, and the footer links',
  /^\d+$/.test(home.stats[0]) && /^\d+$/.test(home.stats[1]) &&
    home.aiLinks.join() === '/ai/mcp/,/ai/skills/' && home.footerLinks >= 10,
  `stats=${home.stats.join(' / ')} ai=${home.aiLinks.join(' ')} footer links=${home.footerLinks}`);

const searchIndex = JSON.parse(await readFile(join(SITE, 'search-index.json'), 'utf8'));
const indexText = JSON.stringify(searchIndex);
check('the AI pages are searchable, and the footer headings are not indexed as sections',
  indexText.includes('/ai/mcp/') && indexText.includes('/ai/skills/') && !indexText.includes('"Packages"'));

// ── The Tier 1 components, server-rendered and hydrated ─────────────────────
await gotoReady('/styles/icons/');
const iconsPage = await page.evaluate(() => {
  const icons = [...document.querySelectorAll('.icon-grid qds-icon')];
  return {
    count: icons.length,
    empty: icons.filter((icon) => !icon.shadowRoot?.querySelector('svg')?.children.length).map((icon) => icon.getAttribute('name')),
    sizes: [...document.querySelectorAll('tbody td:first-child qds-icon')].map((icon) => Math.round(icon.getBoundingClientRect().width)),
  };
});
check('the Icons page draws every built-in icon, at the three token sizes',
  iconsPage.count >= 14 && iconsPage.empty.length === 0 && iconsPage.sizes.join() === '16,20,24',
  `${iconsPage.count} icons, empty: ${iconsPage.empty.join(', ') || 'none'}, sizes ${iconsPage.sizes.join('/')}`);

await gotoReady('/components/select/');
const selectPage = await page.evaluate(() => {
  const select = document.querySelector('.example qds-select');
  const native = select?.shadowRoot?.querySelector('select');
  return { options: native ? [...native.options].map((option) => option.textContent) : [], value: select?.value };
});
check('a server-rendered select gets its options when it hydrates',
  selectPage.options.join('|') === 'Choose a country|Canada|Mexico|United States' && selectPage.value === '',
  selectPage.options.join(' | '));

await gotoReady('/components/menu/');
const menuPopup = await page.evaluate(() =>
  document.querySelector('#file-menu qds-button').shadowRoot.querySelector('button').getAttribute('aria-haspopup'));
const menuTrigger = page.locator('#file-menu qds-button');
await menuTrigger.click();
const menuOpened = await page.evaluate(() => ({
  open: document.querySelector('#file-menu').shadowRoot.querySelector('.menu').matches(':popover-open'),
  focused: document.activeElement?.textContent?.trim(),
}));
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
const menuResult = await page.evaluate(() => ({
  result: document.getElementById('file-menu-result').textContent,
  closed: !document.querySelector('#file-menu').shadowRoot.querySelector('.menu').matches(':popover-open'),
}));
check('the menu example opens on click, moves with the keyboard, and reports the choice',
  menuPopup === 'menu' && menuOpened.open && menuOpened.focused === 'Rename' &&
    menuResult.result === 'Chose: duplicate' && menuResult.closed,
  `haspopup=${menuPopup} opened=${menuOpened.open} focused=${menuOpened.focused} → ${menuResult.result}`);

await gotoReady('/components/tooltip/');
await page.locator('.example qds-tooltip qds-button').first().focus();
const tooltipShown = await page.evaluate(() => {
  const tooltip = document.querySelector('.example qds-tooltip');
  const bubble = tooltip.shadowRoot.querySelector('.tooltip');
  const button = tooltip.querySelector('qds-button').shadowRoot.querySelector('button');
  return { open: bubble.matches(':popover-open'), text: bubble.textContent, name: button.getAttribute('aria-label') };
});
check('a tooltip shows on focus and names its icon-only button',
  tooltipShown.open && tooltipShown.text === 'Add' && tooltipShown.name === 'Add',
  `open=${tooltipShown.open} text=${tooltipShown.text} name=${tooltipShown.name}`);

await gotoReady('/components/alert/');
await page.locator('.example qds-button', { hasText: 'Save' }).click();
await page.waitForTimeout(300);
const alertShown = await page.evaluate(() => ({
  visible: document.getElementById('save-alert').checkVisibility(),
  announced: document.querySelector('[data-qds-announcer="polite"]')?.textContent ?? '',
}));
check('an alert shown after load is visible and announced',
  alertShown.visible && alertShown.announced.includes('Your draft was saved'),
  `visible=${alertShown.visible} announced="${alertShown.announced}"`);

await gotoReady('/roadmap/');
const roadmapTier1 = await page.evaluate(() => {
  const shipped = [...document.querySelectorAll('table')][0];
  return {
    shipped: ['Icon', 'Select', 'Alert', 'Tooltip', 'Menu'].every((name) => shipped.textContent.includes(name)),
    tierDone: (document.body.textContent.match(/Everything in this tier has shipped/g)?.length ?? 0) === 2,
    built: document.body.textContent.match(/Built in 0\.2\.0/g)?.length ?? 0,
  };
});
check('the roadmap lists Tiers 1 and 2 as shipped, and the foundations as built',
  roadmapTier1.shipped && roadmapTier1.tierDone && roadmapTier1.built === 3,
  JSON.stringify(roadmapTier1));

// ── The Tier 2 components, server-rendered and hydrated ─────────────────────
await gotoReady('/components/toast/');
await page.locator('.example qds-button', { hasText: 'Save' }).click();
await page.waitForTimeout(300);
const toastShown = await page.evaluate(() => {
  const stack = document.querySelector('[data-qds-toast-stack]');
  const shown = stack?.querySelector('qds-toast[open]');
  return {
    onTop: stack?.matches(':popover-open') ?? false,
    text: shown?.textContent?.trim(),
    announced: document.querySelector('[data-qds-announcer="polite"]')?.textContent ?? '',
  };
});
check('toast() shows a toast in the stack, on top, and announces it',
  toastShown.onTop && toastShown.text === 'Changes saved.' && toastShown.announced === 'Changes saved.',
  JSON.stringify(toastShown));

await gotoReady('/components/checkbox-group/');
const groupBefore = await page.evaluate(() => {
  const group = document.querySelector('.example qds-checkbox-group');
  return { names: group.checkboxes.map((box) => box.getAttribute('name')), value: group.value };
});
await page.locator('.example qds-checkbox-group qds-checkbox', { hasText: 'Mentions' }).click();
await page.waitForTimeout(100);
const groupAfter = await page.evaluate(() => {
  const group = document.querySelector('.example qds-checkbox-group');
  return { valid: group.checkValidity(), error: group.shadowRoot.querySelector('.error')?.textContent ?? '' };
});
check('a server-rendered checkbox group names its boxes, and requires one after hydration',
  groupBefore.names.every((name) => name === 'notify') && groupBefore.value.join() === 'mentions' &&
    !groupAfter.valid && groupAfter.error === 'Select at least one option.',
  `${JSON.stringify(groupBefore)} → ${JSON.stringify(groupAfter)}`);

await gotoReady('/components/pagination/');
await page.locator('#results-pages').evaluate((element) =>
  element.shadowRoot.querySelector('[aria-label="Page 11"]').click());
await page.waitForTimeout(100);
const paged = await page.evaluate(() => ({
  current: document.getElementById('results-pages').current,
  status: document.getElementById('results-page').textContent,
  links: [...document.querySelectorAll('.example qds-pagination')[1].shadowRoot.querySelectorAll('a[href]')].length,
}));
check('pagination moves in place as buttons, and renders links from an href template',
  paged.current === 11 && paged.status === 'Showing page 11 of 20' && paged.links > 5,
  JSON.stringify(paged));

await gotoReady('/components/breadcrumbs/');
const crumbs = await page.evaluate(() => {
  const items = [...document.querySelectorAll('.example qds-breadcrumbs qds-breadcrumb-item')];
  return {
    current: items.map((item) => item.current),
    marked: [...document.querySelectorAll('.example qds-breadcrumbs [aria-current="page"]')].map((el) => el.textContent.trim()),
    separators: items.map((item) => getComputedStyle(item.shadowRoot.querySelector('.separator')).display !== 'none'),
  };
});
check('server-rendered breadcrumbs mark the last item as the current page',
  crumbs.current.join() === 'false,false,true' && crumbs.marked.join() === 'Breadcrumbs' &&
    crumbs.separators.join() === 'true,true,false',
  JSON.stringify(crumbs));

await gotoReady('/components/avatar/');
await page.waitForTimeout(300);
const avatars = await page.evaluate(() =>
  [...document.querySelectorAll('.example qds-avatar')].slice(0, 4).map((avatar) =>
    avatar.shadowRoot.querySelector('[part="initials"]')?.textContent ??
      (avatar.shadowRoot.querySelector('img') ? 'img' : avatar.shadowRoot.querySelector('qds-icon')?.getAttribute('name'))));
check('avatars show initials, fall back from a broken image, and show a person without a name',
  avatars.join() === 'AL,GH,AT,user', avatars.join(', '));

// ── The variants: a textarea, and drawers ──────────────────────────────────
await gotoReady('/components/text-field/');
const textarea = await page.evaluate(() => {
  const field = [...document.querySelectorAll('.example qds-text-field')].find((each) => each.multiline);
  const area = field?.shadowRoot.querySelector('textarea');
  return { rows: area?.rows, label: area?.labels[0]?.textContent.trim(), hint: area?.getAttribute('aria-describedby') };
});
check('a multiline text field is a labeled, described textarea',
  textarea.rows === 4 && textarea.label === 'Delivery instructions' && textarea.hint === 'hint', JSON.stringify(textarea));

await gotoReady('/components/modal/');
await page.locator('.example qds-button', { hasText: 'Filters' }).click();
await page.waitForTimeout(400);
const drawer = await page.evaluate(() => {
  const dialog = document.getElementById('filters-drawer').shadowRoot.querySelector('dialog');
  const box = dialog.getBoundingClientRect();
  return {
    modal: dialog.matches(':modal'),
    right: Math.round(box.right) === document.documentElement.clientWidth,
    fullHeight: Math.round(box.height) === window.innerHeight,
  };
});
await page.keyboard.press('Escape');
check('a drawer is a modal dialog against the end edge, full height',
  drawer.modal && drawer.right && drawer.fullHeight, JSON.stringify(drawer));

// ── Color ramps run lightest first ─────────────────────────────────────────────
// Sorted as text, "50" lands between "400" and "500"; every ramp must ascend.
const unordered = [];
await gotoReady('/styles/color/');
unordered.push(...await page.evaluate(() =>
  [...document.querySelectorAll('.ramp')]
    .map((ramp) => [...ramp.querySelectorAll('.ramp__label')].map((label) => Number(label.textContent)))
    .filter((steps) => steps.some((step, i) => i > 0 && step <= steps[i - 1]))
    .map((steps) => `Color page: ${steps.join(' ')}`)));
await gotoReady('/foundations/tokens/');
unordered.push(...await page.evaluate(() => {
  const ramps = new Map();
  for (const row of document.querySelectorAll('qds-tab-panel[data-tier="primitive"] tbody tr[id^="qds-color-"]')) {
    const [, hue, step] = row.id.match(/^qds-color-([a-z]+)-(\d+)$/) ?? [];
    if (!hue) continue;
    if (!ramps.has(hue)) ramps.set(hue, []);
    ramps.get(hue).push(Number(step));
  }
  return [...ramps].filter(([, steps]) => steps.some((step, i) => i > 0 && step <= steps[i - 1]))
    .map(([hue, steps]) => `Tokens page ${hue}: ${steps.join(' ')}`);
}));
check('every color ramp runs from its lightest step to its darkest, on both pages',
  unordered.length === 0, unordered.join('; ') || 'in order');

// ── llms.txt and llms-full.txt ────────────────────────────────────────────────
// Plain Markdown for AI assistants: an index of every page, and the full API.
const llmsIndex = await readFile(join(SITE, 'llms.txt'), 'utf8');
const llmsFull = await readFile(join(SITE, 'llms-full.txt'), 'utf8');
const componentManifest = JSON.parse(
  await readFile(require.resolve('@quieto/ui/custom-elements.json'), 'utf8'),
);
const allTags = componentManifest.modules.flatMap((module) =>
  (module.declarations ?? []).filter((declaration) => declaration.tagName).map((declaration) => declaration.tagName));
const llmsLinks = [...llmsIndex.matchAll(/\]\((https:\/\/quieto\.dev[^)]*)\)/g)].map(([, url]) => new URL(url).pathname);
const llmsMissingPages = llmsLinks.filter((path) => !builtPages.includes(path) && !existsSync(join(SITE, path)));
const llmsMissingTags = allTags.filter((tag) => !llmsFull.includes(`### \`<${tag}>\``));
check('llms.txt links only to pages that exist, and llms-full.txt documents every element',
  llmsIndex.startsWith('# Quieto Design System') && llmsLinks.length > 30 && llmsMissingPages.length === 0 &&
    llmsMissingTags.length === 0 && !/&(#\d+|quot|lt|gt|amp);/.test(llmsIndex + llmsFull),
  `${llmsLinks.length} links, ${allTags.length} elements` +
    (llmsMissingPages.length ? `; missing pages: ${llmsMissingPages.join(', ')}` : '') +
    (llmsMissingTags.length ? `; missing elements: ${llmsMissingTags.join(', ')}` : ''));

// Every component page, on every tab, and the Components landing page name the
// package they ship in.
const uiPackage = JSON.parse(await readFile(new URL('../../packages/ui/package.json', import.meta.url), 'utf8'));
const componentPages = builtPages.filter((path) => path.startsWith('/components/'));
const missingPackage = [];
for (const path of componentPages) {
  await gotoReady(path);
  const links = await page.evaluate(() => ({
    text: document.querySelector('.package-links')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    npm: [...document.querySelectorAll('.package-links a')].some((a) => a.href === 'https://www.npmjs.com/package/@quieto/ui'),
    // The links are icon-only; each takes its name from the qds-tooltip around it.
    unnamed: [...document.querySelectorAll('.package-links a')].filter((a) => !a.getAttribute('aria-label')).length,
  }));
  if (!links.text.includes(`@quieto/ui ${uiPackage.version}`) || !links.npm || links.unnamed) missingPackage.push(path);
}
check('every component page links to @quieto/ui on npm and GitHub, each icon link named',
  componentPages.length > 0 && missingPackage.length === 0,
  missingPackage.join(', ') || `${componentPages.length} pages, version ${uiPackage.version}`);
check('every page\'s content column is full width, not collapsed',
  narrow.length === 0, narrow.join(', ') || `${builtPages.length} pages`);
// On a page shorter than the window, the footer sits at the window's bottom
// edge rather than straight after the content.
await gotoReady('/404.html');
const footerGap = await page.evaluate(() =>
  Math.round(innerHeight - document.querySelector('.site-footer').getBoundingClientRect().bottom));
check('on a short page the footer sits at the bottom of the window', footerGap === 0, `gap=${footerGap}px`);
check('every page has the footer links', noFooter.length === 0, noFooter.join(', ') || `${builtPages.length} pages`);

// ── Search and social metadata ─────────────────────────────────────────────────
// Read from the built HTML, as a crawler sees it, before any script runs.
const ORIGIN = 'https://quieto.dev';
const meta = (html, attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const seo = [];
const titles = new Map();
for (const path of builtPages) {
  const html = await readFile(join(SITE, path.endsWith('/') ? `${path}index.html` : path), 'utf8');
  const problems = [];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const description = meta(html, 'name', 'description') ?? '';
  if (!title.includes('Quieto Design System')) problems.push('title');
  if (description.length < 30 || description.length > 170) problems.push(`description length ${description.length}`);
  if (path === '/404.html') {
    if (!html.includes('<meta name="robots" content="noindex" />')) problems.push('404 not noindex');
  } else {
    titles.set(title, [...(titles.get(title) ?? []), path]);
    if (!html.includes(`<link rel="canonical" href="${ORIGIN}${path}" />`)) problems.push('canonical');
    if (meta(html, 'property', 'og:url') !== `${ORIGIN}${path}`) problems.push('og:url');
    // The home page has the designed card; every other page its own generated one, 1200×630.
    const card = path === '/' ? '/assets/og-image.png' : `/og/${path.replace(/^\/|\/$/g, '')}.png`;
    if (meta(html, 'property', 'og:image') !== `${ORIGIN}${card}`) problems.push('og:image');
    else if (!existsSync(join(SITE, card))) problems.push(`missing ${card}`);
    else {
      const png = await readFile(join(SITE, card));
      if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) problems.push(`${card} not 1200×630`);
    }
    if (meta(html, 'name', 'twitter:card') !== 'summary_large_image') problems.push('twitter:card');
    for (const json of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
      try { JSON.parse(json[1]); } catch { problems.push('json-ld'); }
    }
  }
  if (problems.length) seo.push(`${path} (${problems.join(', ')})`);
}
const duplicateTitles = [...titles].filter(([, paths]) => paths.length > 1).map(([title]) => title);
check('every page is titled, described, canonical, with Open Graph and Twitter tags and its own 1200×630 card',
  seo.length === 0 && duplicateTitles.length === 0,
  [...seo.slice(0, 5), ...duplicateTitles.map((t) => `duplicate title: ${t}`)].join('; ') || `${builtPages.length} pages`);

const ogImage = await readFile(join(SITE, 'assets/og-image.png'));
check('the home page’s designed social card is a 1200×630 PNG',
  ogImage.readUInt32BE(16) === 1200 && ogImage.readUInt32BE(20) === 630,
  `${ogImage.readUInt32BE(16)}×${ogImage.readUInt32BE(20)}`);

const sitemap = await readFile(join(SITE, 'sitemap.xml'), 'utf8');
const listed = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, ''));
const indexable = builtPages.filter((path) => path !== '/404.html');
const unlisted = indexable.filter((path) => !listed.includes(path));
const robots = await readFile(join(SITE, 'robots.txt'), 'utf8');
check('the sitemap lists every page but the 404, and robots.txt points to it',
  unlisted.length === 0 && listed.length === indexable.length && robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`),
  unlisted.join(', ') || `${listed.length} URLs`);
check('no console errors on any page', consoleErrors.length === 0,
  consoleErrors.slice(0, 5).join('\n    ') || 'clean');

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n── ${results.length - failed.length} passed, ${failed.length} failed ──`);
process.exit(failed.length ? 1 : 0);
