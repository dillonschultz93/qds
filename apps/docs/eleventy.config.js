import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';

import { RenderPlugin } from '@11ty/eleventy';
import litPlugin from '@lit-labs/eleventy-plugin-lit';

import { createSearchIndex } from './search-index.js';

const require = createRequire(import.meta.url);
const HERE = dirname(new URL(import.meta.url).pathname);

/** Directory of the design-tokens package, resolved through the workspace link. */
const TOKENS_PKG = dirname(require.resolve('@quieto/design-tokens/nomenclature'));
const UI_DIST = dirname(require.resolve('@quieto/ui'));

const REPO = 'https://github.com/dillonschultz93/qds/blob/main/packages/design-tokens';

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Prepare an SVG for inlining into Markdown or Nunjucks output.
 *
 * Blank lines are the problem. markdown-it ends an HTML block at the first blank
 * line, so a multi-line SVG containing any gets split: everything after the gap is
 * re-parsed as Markdown and wrapped in a paragraph, and the HTML parser then
 * cannot nest those elements inside the svg. The result is a diagram whose frame
 * and stylesheet survive while every text element lands outside the SVG — so it
 * renders as empty boxes, with nothing in the console to explain why.
 */
const inlineSvg = (svg) => svg.replace(/\n[ \t]*\n/g, '\n').trim();

/** Strip the common leading indentation so shortcode source reads cleanly. */
function dedent(text) {
  const lines = text.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)[0].length);
  const shortest = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(shortest)).join('\n');
}

export default async function (eleventyConfig) {
  /**
   * Server-renders the Lit components into declarative shadow DOM at build time,
   * then hydrates. Components appear fully styled in the initial HTML, so an
   * example never flashes as unstyled markup before its definition loads.
   */
  eleventyConfig.addPlugin(litPlugin, {
    mode: 'worker',
    // link-icons.js registers the icons the package links draw: GitHub, npm, Figma, history.
    componentModules: [join(UI_DIST, 'index.js'), join(HERE, 'link-icons.js')],
  });

  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Search: ids on every h2 and h3 as pages are written, and the index once the
  // build is done. See search-index.js.
  const search = createSearchIndex();
  eleventyConfig.addTransform('search-anchors', search.transform);
  eleventyConfig.on('eleventy.after', search.write);

  // Social cards: one PNG per page, written once the pages exist, from each
  // page's own title and description. See og-images.js; base.njk links them
  // through the ogImage filter, which gives the path the cards are written to.
  //
  // og-images.js is imported only when the hook runs: loading satori (and its
  // WebAssembly layout engine) while the config loads stalls the build before
  // any page is written.
  eleventyConfig.addFilter('ogImage', (url) => `/og/${url.replace(/^\/|\/$/g, '')}.png`);
  eleventyConfig.on('eleventy.after', async ({ results, dir }) => {
    const started = performance.now();
    const { writeOgImages } = await import('./og-images.js');
    const count = await writeOgImages(results, dir.output, { suffix: ' · Quieto Design System' });
    console.log(`[og] ${count} social cards in ${Math.round(performance.now() - started)}ms`);
  });

  /**
   * "On this page": the page's h2s, listed beside the content. Built here
   * rather than in the layout, because the layout renders before the content's
   * headings exist. Runs after search-anchors, so every h2 already has the id it
   * links to. Pages with fewer than two h2s get no list.
   */
  eleventyConfig.addTransform('page-contents', function (content) {
    if (!this.page.outputPath?.endsWith('.html')) return content;
    const marker = '<!-- page-contents -->';
    if (!content.includes(marker)) return content;

    const main = content.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
    const headings = [...main.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(([, id, inner]) => ({
      id,
      text: inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    }));
    if (headings.length < 2) return content.replace(marker, '');

    const items = headings
      .map(({ id, text }) => `<li><a href="#${id}">${text}</a></li>`)
      .join('');
    return content.replace(
      marker,
      `<nav class="page-contents" aria-label="On this page"><p class="page-contents__title">On this page</p><ul>${items}</ul></nav>`,
    );
  });

  // Renders the token spec's Markdown inside the Tokens page (renderContent).
  eleventyConfig.addPlugin(RenderPlugin);

  // The built token CSS and the component JS are consumed as static assets, so
  // the site works without a bundler.
  eleventyConfig.addPassthroughCopy({
    [`${TOKENS_PKG}/dist/css/qds.css`]: 'assets/qds.css',
  });

  eleventyConfig.addWatchTarget(`${TOKENS_PKG}/dist/`);
  eleventyConfig.addWatchTarget(UI_DIST);

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  // For markup built in JavaScript (the example shortcode). In a template, let
  // Nunjucks' autoescaping do it: running this first as well escaped every
  // example's source twice, showing &lt;qds-button&gt; instead of <qds-button>.
  eleventyConfig.addFilter('escapeHtml', escapeHtml);

  /**
   * The first item whose `key` equals `value`. Nunjucks' selectattr only tests
   * an attribute for truthiness — selectattr('name', 'equalto', x) ignores the
   * comparison and returns everything — so a lookup needs its own filter.
   */
  eleventyConfig.addFilter('findBy', (items, key, value) => (items ?? []).find((item) => item?.[key] === value));

  /** `qds-color-blue-400` → `var(--qds-color-blue-400)` */
  eleventyConfig.addFilter('cssVar', (name) => `var(--${name})`);

  /** Renders a token value for display, flattening composite objects. */
  eleventyConfig.addFilter('tokenValue', (value) =>
    value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value),
  );

  /**
   * JSON for a <script type="application/json">, with < escaped so no value can
   * close the script element early.
   */
  eleventyConfig.addFilter('json', (value) => JSON.stringify(value).replace(/</g, '\\u003c'));

  eleventyConfig.addFilter('startsWith', (value, prefix) => String(value).startsWith(prefix));

  /**
   * A JSDoc description as paragraphs of plain text: fenced code examples are
   * dropped (the page shows live examples instead), and inline code marks are
   * removed, since the text is escaped rather than rendered as Markdown.
   */
  eleventyConfig.addFilter('paragraphs', (text) =>
    String(text ?? '')
      .replace(/```[\s\S]*?```/g, '')
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/`/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  );

  /** The section a URL belongs to, for the header and the sidebar: /styles/color/ → Styles. */
  eleventyConfig.addFilter('sectionFor', (sections, url) =>
    sections.find((section) => String(url).startsWith(section.url)) ?? null,
  );

  // ---------------------------------------------------------------------------
  // Shortcodes
  // ---------------------------------------------------------------------------

  /**
   * Renders a live example and its source from ONE block of markup.
   *
   * The point is that the two cannot disagree: there is no second copy of the
   * markup to forget to update when the demo changes.
   *
   * ```njk
   * {% example "Variants" %}
   *   <qds-button>Save</qds-button>
   * {% endexample %}
   * ```
   */
  eleventyConfig.addPairedShortcode('example', (content, title = '') => {
    const source = dedent(content);
    return `<figure class="example">
  ${title ? `<figcaption class="example__title">${escapeHtml(title)}</figcaption>` : ''}
  <div class="example__preview">${content}</div>
  <details class="example__source">
    <summary>Source</summary>
    <pre><code class="language-html">${escapeHtml(source)}</code></pre>
  </details>
</figure>`;
  });

  /** Inlines one of the generated token-anatomy diagrams. */
  const anatomyDir = join(TOKENS_PKG, 'docs/anatomy');
  const anatomy = Object.fromEntries(
    await Promise.all(
      (await readdir(anatomyDir))
        .filter((file) => file.endsWith('.svg'))
        .map(async (file) => [
          basename(file, '.svg'),
          inlineSvg(await readFile(join(anatomyDir, file), 'utf8')),
        ]),
    ),
  );

  eleventyConfig.addShortcode('anatomy', (tier) => {
    const svg = anatomy[tier];
    if (!svg) throw new Error(`No anatomy diagram for tier "${tier}"`);
    // Inlined rather than referenced with <img>, so the diagram sees the page's
    // data-theme attribute. An <img> only ever sees the OS color scheme, which
    // would leave it light-on-dark whenever the reader overrides the OS setting.
    return `<div class="anatomy">${svg}</div>`;
  });

  // ---------------------------------------------------------------------------
  // The nomenclature spec, pulled in from the token package
  // ---------------------------------------------------------------------------

  /**
   * The spec lives with the tokens it governs, not in this app, so it is injected
   * as a virtual template rather than copied. Copying it would create a second
   * copy to drift.
   *
   * Two rewrites are needed on the way in:
   *   1. Relative image links become inlined SVG, so the diagrams follow the
   *      site's theme toggle.
   *   2. Relative source links become GitHub URLs, since ../nomenclature.js does
   *      not exist in the built site.
   */
  const spec = (await readFile(join(TOKENS_PKG, 'docs/nomenclature.md'), 'utf8'))
    .replace(/!\[[^\]]*\]\(anatomy\/([a-z]+)\.svg\)/g, (_match, tier) => {
      const svg = anatomy[tier];
      if (!svg) throw new Error(`Spec references a missing anatomy diagram: ${tier}`);
      return `<div class="anatomy">${svg}</div>`;
    })
    .replace(/\]\(\.\.\/([a-z/.-]+\.js)\)/g, `](${REPO}/$1)`)
    .replace(/\]\(anatomy\/generate\.js\)/g, `](${REPO}/docs/anatomy/generate.js)`)
    // The first heading is replaced by the layout's page title.
    .replace(/^# Design Tokens\n/, '');

  // Rendered by the Nomenclature page (foundations/nomenclature.njk).
  eleventyConfig.addGlobalData('spec', spec);

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
