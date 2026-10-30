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

// ── Radio group: state survives hydration ─────────────────────────────────────
/**
 * Server-rendered radios are already slotted when the group hydrates, so no
 * slotchange arrives. A group that only synced on slotchange showed nothing
 * checked and stayed enabled when disabled. Only a hydrated page shows it.
 */
await gotoReady('/components/qds-radio-group/');
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
await gotoReady('/components/qds-text-field/');
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
await gotoReady('/components/qds-chip/');
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
await gotoReady('/components/qds-accordion/');
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
await gotoReady('/components/qds-tabs/');
const tabsState = await page.evaluate(async () => {
  const [basic, initial] = document.querySelectorAll('qds-tabs');
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
await gotoReady('/components/qds-modal/');
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

// ── Component summaries are escaped exactly once ─────────────────────────────
await gotoReady('/components/qds-modal/');
const lede = await page.evaluate(() => document.querySelector('.lede')?.textContent ?? '');
check('component page summaries are not double-escaped',
  lede.includes('<dialog>') && !lede.includes('&lt;'), lede.slice(0, 120));

// ── 8. Console cleanliness across every page ─────────────────────────────────
for (const path of ['/', '/tokens/', '/components/', '/components/qds-stack/', '/components/qds-checkbox/', '/components/qds-radio-group/', '/components/qds-radio/', '/components/qds-toggle/', '/components/qds-input/', '/components/qds-text-field/', '/components/qds-chip/', '/components/qds-card/', '/components/qds-progress-bar/', '/components/qds-accordion/', '/components/qds-accordion-item/', '/components/qds-tabs/', '/components/qds-tab/', '/components/qds-tab-panel/', '/components/qds-modal/']) {
  await gotoReady(path);
}
check('no console errors on any page', consoleErrors.length === 0,
  consoleErrors.slice(0, 5).join('\n    ') || 'clean');

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n── ${results.length - failed.length} passed, ${failed.length} failed ──`);
process.exit(failed.length ? 1 : 0);
