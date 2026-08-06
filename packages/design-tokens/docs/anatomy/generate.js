#!/usr/bin/env node
/**
 * Generates the three token-anatomy diagrams as standalone SVG.
 *
 * The originals were Obsidian wikilink embeds (`![[Primitive Tokens Anatomy.png]]`)
 * pointing at PNGs that were never committed, and which no Markdown renderer
 * would have resolved anyway. Generating them from `nomenclature.js` instead
 * means:
 *
 *   - the vocabulary counts in each diagram cannot drift from the vocabulary the
 *     validator enforces
 *   - they inherit the reader's light/dark theme
 *   - they stay legible at any zoom, unlike a raster export
 *
 * Run: `node docs/anatomy/generate.js`
 */

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PREFIX, STATES, primitive, semantic, component } from '../../nomenclature.js';

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

// Advance widths at the sizes used below. Monospace is uniform; the sans figure
// is an average, which is why segments are padded generously.
const MONO_CHAR = 8.45; // 14px monospace
const SANS_CHAR = 6.3; // 12px sans-serif

const monoWidth = (text) => text.length * MONO_CHAR;
const sansWidth = (text) => text.length * SANS_CHAR;

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @typedef {object} Segment
 * @property {string} text   The literal segment as it appears in the variable.
 * @property {string} label  What that slot is called in the grammar.
 * @property {string} [note] Vocabulary size or constraint, drawn under the label.
 * @property {number} hue    Index into the palette.
 */

/** @param {{ title: string, subtitle: string, segments: Segment[] }} spec */
function renderDiagram({ title, subtitle, segments }) {
  const PAD = 24;
  const BOX_H = 46;
  const BOX_Y = 74;
  const LABEL_Y = BOX_Y + BOX_H + 26;
  const NOTE_Y = LABEL_Y + 17;

  // Each box is wide enough for the widest of its three texts, so labels never
  // collide and no leader lines are needed.
  const widths = segments.map((segment) =>
    Math.max(
      monoWidth(segment.text),
      sansWidth(segment.label),
      segment.note ? sansWidth(segment.note) : 0,
    ) + 26,
  );

  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  const width = totalWidth + PAD * 2;
  const height = NOTE_Y + 22;

  let x = PAD;
  const boxes = segments.map((segment, index) => {
    const boxWidth = widths[index];
    const centerX = x + boxWidth / 2;
    const box = `
    <g class="seg seg-${segment.hue}">
      <rect x="${x.toFixed(1)}" y="${BOX_Y}" width="${boxWidth.toFixed(1)}" height="${BOX_H}" rx="7"/>
      <text class="mono" x="${centerX.toFixed(1)}" y="${BOX_Y + 29}">${escape(segment.text)}</text>
      <text class="label" x="${centerX.toFixed(1)}" y="${LABEL_Y}">${escape(segment.label)}</text>
      ${segment.note ? `<text class="note" x="${centerX.toFixed(1)}" y="${NOTE_Y}">${escape(segment.note)}</text>` : ''}
    </g>`;
    x += boxWidth;
    return box;
  });

  // The full variable name, drawn above the exploded view so the reader sees what
  // is being taken apart before the parts.
  const fullName = `--${segments.map((segment) => segment.text).join('-')}`;

  /**
   * Every selector is scoped to `.qds-anatomy`, and the custom properties are set
   * on the svg element rather than `:root`.
   *
   * This matters because these are meant to be INLINED into the docs page, and an
   * inlined SVG's <style> is not scoped to the SVG — it applies to the whole
   * document. An unscoped `text { font-family: … }` or `:root { --fg: … }` would
   * quietly restyle the page around it.
   */
  const palette = (scheme) =>
    scheme === 'dark'
      ? `--fg: #f1f5f9; --muted: #94a3b8;
      --h0: #94a3b8; --h0-bg: #94a3b829;
      --h1: #a78bfa; --h1-bg: #a78bfa29;
      --h2: #60a5fa; --h2-bg: #60a5fa29;
      --h3: #2dd4bf; --h3-bg: #2dd4bf29;
      --h4: #fbbf24; --h4-bg: #fbbf2429;
      --h5: #fb7185; --h5-bg: #fb718529;`
      : `--fg: #0f172a; --muted: #64748b;
      --h0: #64748b; --h0-bg: #64748b1f;
      --h1: #7c3aed; --h1-bg: #7c3aed1f;
      --h2: #2563eb; --h2-bg: #2563eb1f;
      --h3: #0d9488; --h3-bg: #0d94881f;
      --h4: #b45309; --h4-bg: #b453091f;
      --h5: #be123c; --h5-bg: #be123c1f;`;

  return `<svg xmlns="http://www.w3.org/2000/svg" class="qds-anatomy" viewBox="0 0 ${width.toFixed(0)} ${height}" width="${width.toFixed(0)}" height="${height}" role="img" aria-label="${escape(title)}: ${escape(fullName)}">
  <title>${escape(title)}</title>
  <desc>${escape(subtitle)} Anatomy of ${escape(fullName)}: ${segments.map((s) => `${s.text} is the ${s.label.toLowerCase()}`).join('; ')}.</desc>
  <style>
    /* Light is the base. */
    .qds-anatomy { ${palette('light')} }

    /* Standalone or OS-dark. Applies when nothing has stated a preference. */
    @media (prefers-color-scheme: dark) {
      .qds-anatomy { ${palette('dark')} }
    }

    /*
     * An explicit theme must beat the OS, in both directions.
     *
     * Matched on any ancestor rather than :root specifically, so this works
     * whether the theme is set on the html element (the docs site's toggle), on a
     * section wrapping one example, or on the svg itself. Scoping these to
     * :root[data-theme] instead would silently fall through to the media query
     * whenever the attribute sits anywhere else — and a reader on a dark-mode OS
     * viewing a light-themed section would get a dark palette on a light
     * background, which renders the labels invisible.
     *
     * Note: no left angle bracket may appear anywhere in this stylesheet. An SVG
     * is parsed as XML, so even inside a CSS comment one is read as the start of
     * a tag and the whole file fails to parse.
     */
    [data-theme="dark"] .qds-anatomy,
    .qds-anatomy[data-theme="dark"] { ${palette('dark')} }
    [data-theme="light"] .qds-anatomy,
    .qds-anatomy[data-theme="light"] { ${palette('light')} }

    .qds-anatomy text { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    .qds-anatomy .title { font-size: 13px; font-weight: 600; fill: var(--fg); }
    .qds-anatomy .subtitle { font-size: 12px; fill: var(--muted); }
    .qds-anatomy .full { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; fill: var(--muted); }
    .qds-anatomy .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; font-weight: 600; text-anchor: middle; }
    .qds-anatomy .label { font-size: 12px; font-weight: 500; fill: var(--fg); text-anchor: middle; }
    .qds-anatomy .note { font-size: 11px; fill: var(--muted); text-anchor: middle; }
    .qds-anatomy .seg rect { stroke-width: 1.25; }
    ${[0, 1, 2, 3, 4, 5]
      .map(
        (hue) =>
          `.qds-anatomy .seg-${hue} rect { fill: var(--h${hue}-bg); stroke: var(--h${hue}); } .qds-anatomy .seg-${hue} .mono { fill: var(--h${hue}); }`,
      )
      .join('\n    ')}
  </style>
  <text class="title" x="${PAD}" y="26">${escape(title)}</text>
  <text class="subtitle" x="${PAD}" y="46">${escape(subtitle)}</text>
  <text class="full" x="${PAD}" y="${BOX_Y - 12}">${escape(fullName)}</text>
${boxes.join('')}
</svg>
`;
}

const countNote = (n, noun) => `${n} ${noun}`;

const diagrams = {
  'primitive.svg': {
    title: 'Primitive token anatomy',
    subtitle: 'Tier 1 — raw values, no tier identifier, no references.',
    segments: [
      { text: PREFIX, label: 'Global prefix', note: 'always', hue: 0 },
      {
        text: 'color',
        label: 'Category',
        note: countNote(primitive.categories.length, 'categories'),
        hue: 2,
      },
      {
        text: 'blue',
        label: 'Sub-category',
        note: `optional · ${primitive.hues.length} hues`,
        hue: 3,
      },
      { text: '400', label: 'Value', note: 'ramp or t-shirt', hue: 4 },
    ],
  },
  'semantic.svg': {
    title: 'Semantic token anatomy',
    subtitle: 'Tier 2 — intent, referencing primitives. Light and dark differ only here.',
    segments: [
      { text: PREFIX, label: 'Global prefix', note: 'always', hue: 0 },
      { text: 'semantic', label: 'Tier identifier', note: 'literal', hue: 1 },
      {
        text: 'color',
        label: 'Category',
        note: countNote(semantic.categories.length, 'categories'),
        hue: 2,
      },
      {
        text: 'background',
        label: 'Property',
        note: `color only · ${semantic.properties.length}`,
        hue: 3,
      },
      { text: 'default', label: 'Role', note: countNote(semantic.roles.length, 'roles'), hue: 4 },
      { text: 'hover', label: 'State', note: `optional · ${STATES.length} states`, hue: 5 },
    ],
  },
  'component.svg': {
    title: 'Component token anatomy',
    subtitle: "Tier 3 — a component's public styling API, referencing semantics or primitives.",
    segments: [
      { text: PREFIX, label: 'Global prefix', note: 'always', hue: 0 },
      { text: 'component', label: 'Tier identifier', note: 'literal', hue: 1 },
      { text: 'button', label: 'Component name', note: 'kebab-case', hue: 2 },
      { text: 'primary', label: 'Variant', note: 'optional', hue: 3 },
      {
        text: 'color-background',
        label: 'Property',
        note: `${component.colorProperties.length} color · ${component.cssProperties.length} CSS`,
        hue: 4,
      },
      { text: 'hover', label: 'State', note: `optional · ${STATES.length} states`, hue: 5 },
    ],
  },
};

await Promise.all(
  Object.entries(diagrams).map(async ([file, spec]) => {
    const svg = renderDiagram(spec);

    // An SVG is XML: a stray "<" in the stylesheet (even inside a CSS comment)
    // makes the whole file unparseable, and the failure only shows up when
    // something tries to render it. Catch it here instead.
    const stylesheet = svg.slice(svg.indexOf('<style>') + 7, svg.indexOf('</style>'));
    const offender = stylesheet.match(/[<]|&(?!(amp|lt|gt|quot|apos|#\d+);)/);
    if (offender) {
      throw new Error(
        `${file}: stylesheet contains "${offender[0]}" at index ${offender.index}, ` +
          'which makes the SVG invalid XML. Rephrase to avoid it.',
      );
    }

    await writeFile(join(OUT_DIR, file), svg);
  }),
);

console.log(`✓ generated ${Object.keys(diagrams).length} anatomy diagrams in docs/anatomy/`);
