/**
 * Social cards: a 1200×630 PNG for every page, written to _site/og/ after the
 * build, so a link shared from any page previews that page rather than the site.
 *
 * Satori lays the card out from a small element tree and returns SVG; resvg
 * renders the SVG to PNG. Neither needs a browser, so this runs in any build
 * environment. Colors are the tokens' dark-mode values, read from the
 * @quieto/design-tokens manifest, and the type is the system's own: JetBrains
 * Mono for the title, Inter for the rest (from @fontsource, since satori needs
 * the font files).
 *
 * The home page keeps its designed card (site.ogImage), made in Figma; base.njk
 * points every other page at /og/<path>.png, the same path this writes.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { tokens } from '@quieto/design-tokens';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const require = createRequire(import.meta.url);
const HERE = dirname(new URL(import.meta.url).pathname);
export const WIDTH = 1200;
export const HEIGHT = 630;

/** The image path for a page URL: /components/button/ → /og/components/button.png. */
export const ogPath = (url) => `/og/${url.replace(/^\/|\/$/g, '')}.png`;

const dark = (name) => {
  const token = tokens.find((t) => t.name === `qds-semantic-color-${name}`);
  if (!token) throw new Error(`og-images: no token qds-semantic-color-${name}`);
  return token.modes.dark;
};

const font = (pkg, file) => readFile(join(dirname(require.resolve(`${pkg}/package.json`)), 'files', file));

/** A satori element: { type, props: { style, children } }. */
const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

const ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
const unescape = (text) => text.replace(/&(amp|quot|#39|lt|gt|nbsp);/g, (m) => ENTITIES[m]);

/** The section a URL belongs to, as the eyebrow above the title. */
const SECTIONS = { components: 'Components', foundations: 'Foundations', styles: 'Styles', ai: 'AI', roadmap: 'Roadmap' };

export async function writeOgImages(results, outDir, { suffix }) {
  const fonts = [
    { name: 'Inter', data: await font('@fontsource/inter', 'inter-latin-400-normal.woff'), weight: 400 },
    { name: 'Inter', data: await font('@fontsource/inter', 'inter-latin-600-normal.woff'), weight: 600 },
    { name: 'JetBrains Mono', data: await font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff'), weight: 700 },
  ];
  const partial = await readFile(join(HERE, 'src/_includes/partials/logo.svg.njk'), 'utf8');
  const markPath = partial.match(/ d="([^"]+)"/)[1];
  const color = {
    background: dark('background-default'),
    raised: dark('background-raised'),
    border: dark('border-subtle'),
    text: dark('content-default'),
    subtle: dark('content-subtle'),
    primary: dark('content-primary-rest'),
  };
  const mark = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="${color.primary}" d="${markPath}"/></svg>`,
  ).toString('base64')}`;

  const pages = results.filter((r) => r.url && r.url !== '/' && r.url.endsWith('/') && r.outputPath?.endsWith('.html'));
  for (const page of pages) {
    const title = unescape(page.content.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').replace(suffix, '');
    const description = unescape(page.content.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
    const section = SECTIONS[page.url.split('/')[1]] ?? '';

    const card = h('div', {
      width: WIDTH, height: HEIGHT, display: 'flex', flexDirection: 'column', gap: 120,
      padding: 72, backgroundColor: color.background, color: color.text, fontFamily: 'Inter',
    },
      h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: WIDTH - 144 },
        h('div', { display: 'flex', alignItems: 'center', gap: 20 },
          { type: 'img', props: { src: mark, width: 56, height: 56 } },
          h('div', { fontSize: 30, fontWeight: 600, color: color.text }, 'Quieto Design System'),
        ),
        h('div', { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 24, color: color.subtle }, 'quieto.dev'),
      ),
      h('div', { display: 'flex', flexDirection: 'column', gap: 20, width: WIDTH - 144 },
        ...(section && section !== title ? [h('div', { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 24, letterSpacing: 2, color: color.primary, textTransform: 'uppercase' }, section)] : []),
        h('div', { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: title.length > 18 ? 64 : 84, lineHeight: 1.1 }, title),
        h('div', { fontSize: 30, lineHeight: 1.4, color: color.subtle, maxWidth: 980, display: 'block', lineClamp: 2 }, description),
      ),
    );

    const svg = await satori(card, { width: WIDTH, height: HEIGHT, fonts });
    // satori draws text as paths, so resvg needs no fonts; loading the system's
    // (its default) costs about a second per card.
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH }, font: { loadSystemFonts: false } }).render().asPng();
    const out = join(outDir, ogPath(page.url));
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, png);
  }
  return pages.length;
}
