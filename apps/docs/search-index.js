/**
 * The docs site's search index, written to `_site/search-index.json`.
 *
 * Built rather than borrowed. A page-level indexer would answer a search for
 * "background primary" with "the Tokens page", which has 500 rows on it; this
 * index has an entry per token, per component, and per property, event, slot,
 * and part, each linking to the exact place it is documented.
 *
 * Entries come from two places, each the one that cannot drift:
 *
 *   - Pages and their sections are read from the RENDERED HTML, as each page is
 *     written. The same pass gives every h2 and h3 an id, so a section's link and
 *     its anchor are produced by one function and cannot disagree.
 *   - Components and tokens are read from the same data the pages render from,
 *     which knows more than the HTML does (a token's value in each mode, which
 *     component a property belongs to).
 *
 * The index is written once the build is done, because sections are only known
 * after every page has been transformed.
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { tokens as manifest } from '@quieto/design-tokens';

import loadComponents from './src/_data/components.js';

/**
 * Pages whose headings are not indexed as sections: each component page, and the
 * components index, whose headings are component names. Component and API
 * entries cover them, and would otherwise be listed twice.
 */
const isComponentPage = (url) => url.startsWith('/components/');

const decodeEntities = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const textOf = (html) => decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/** "Why `rest` exists" → "why-rest-exists". Shared by the anchors and the index. */
export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Trim a description to one short line for a result. */
const summarize = (text, length = 110) => {
  const flat = text.replace(/`/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
};

export function createSearchIndex() {
  /** url → { title, description, sections: [{ id, title }] }, filled as pages are written. */
  const pages = new Map();

  /**
   * Eleventy transform: give each h2 and h3 without attributes an id taken from
   * its text, and record the page's title, description, and sections.
   */
  function transform(content) {
    const url = this.page.url;
    if (!this.page.outputPath?.endsWith('.html') || typeof url !== 'string') return content;

    const used = new Set();
    const html = content.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (match, level, inner) => {
      const base = slugify(textOf(inner));
      if (!base) return match;
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      return `<h${level} id="${id}">${inner}</h${level}>`;
    });

    const title = textOf(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').replace(/ · QDS$/, '');
    const description = decodeEntities(
      html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '',
    );
    // An h3 is labelled with the h2 it sits under: on the Tokens page, "toggle"
    // alone does not say it is the component tier's toggle tokens.
    const sections = [];
    let parent = '';
    if (!isComponentPage(url)) {
      for (const [, level, id, inner] of html.matchAll(/<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
        // The Tokens page's tier headings carry a count badge: "Primitive 147 tokens".
        const heading = textOf(inner).replace(/\s*\d+ tokens$/, '');
        if (level === '2') parent = heading;
        sections.push({ id, title: heading, parent: level === '3' ? parent : '' });
      }
    }

    pages.set(url, { title, description, sections });
    return html;
  }

  /** Every entry, in the shape the client searches. */
  async function entries() {
    const out = [];

    for (const [url, page] of [...pages.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (isComponentPage(url) && url !== '/components/') continue;
      // Not a destination: it is what an unknown address shows.
      if (url === '/404.html') continue;
      out.push({ type: 'page', title: page.title, detail: summarize(page.description), url });
      for (const section of page.sections) {
        out.push({
          type: 'section',
          title: section.title,
          detail: section.parent ? `${page.title} › ${section.parent}` : page.title,
          url: `${url}#${section.id}`,
        });
      }
    }

    for (const component of await loadComponents()) {
      const tag = component.tagName;
      const url = `/components/${tag}/`;
      out.push({
        type: 'component',
        title: `<${tag}>`,
        detail: summarize(component.summary),
        url,
        // So "toggle" is an exact match for <qds-toggle>, as it would be for a person.
        keywords: tag.replace(/^qds-/, ''),
      });

      const api = [
        ['property', 'properties', component.properties],
        ['event', 'events', component.events],
        ['slot', 'slots', component.slots.filter((slot) => slot.name !== '(default)')],
        ['part', 'css-parts', component.cssParts],
      ];
      for (const [type, section, items] of api) {
        // An unnamed entry is an analyzer artifact, and would be a blank result.
        for (const item of items.filter((entry) => entry.name)) {
          out.push({
            type,
            title: item.name,
            detail: summarize(`<${tag}> · ${item.description}`),
            url: `${url}#${section}`,
            // A property is found by its attribute name too: full-width → fullWidth.
            keywords: item.attribute && item.attribute !== item.name ? item.attribute : undefined,
          });
        }
      }
    }

    for (const token of manifest) {
      const { light, dark } = token.modes;
      const value = (v) => (v !== null && typeof v === 'object' ? 'composite' : String(v));
      out.push({
        type: 'token',
        title: `--${token.name}`,
        detail: light === dark ? value(light) : `${value(light)} · dark ${value(dark)}`,
        url: `/tokens/#${token.name}`,
        color: token.type === 'color' ? true : undefined,
      });
    }

    return out;
  }

  /** Eleventy `eleventy.after` handler: write the index next to the pages. */
  async function write({ dir }) {
    const index = await entries();
    await writeFile(join(dir.output, 'search-index.json'), JSON.stringify(index));
  }

  return { transform, write };
}
