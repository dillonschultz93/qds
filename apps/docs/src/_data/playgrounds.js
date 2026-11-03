/**
 * Component playgrounds, as Spectrum's component pages have: a live preview,
 * controls for its attributes, and the markup for the current settings.
 *
 * The controls are generated, not written. Each attribute of the family's
 * primary element (from the custom elements manifest) becomes one:
 *
 *   a union of string literals  → a qds-radio-group of its options
 *   boolean                     → a qds-toggle
 *   string or number            → a qds-input
 *
 * The manifest records a union only by its type alias's name (QdsButtonVariant),
 * so aliases are resolved here from the component source, where every one is a
 * plain `export type X = 'a' | 'b'` — following an alias of an alias too.
 *
 * CONFIG holds only what cannot be inferred: the editable content and its
 * starting text, child markup for families (tabs, radios), initial values that
 * differ from the component's defaults, and attributes not worth a control.
 */

import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { renderPlayground } from '../assets/playground-markup.js';
import loadDocs from './docs.js';
import icons from './icons.js';

const require = createRequire(import.meta.url);
// The package's exports do not include its source, so go from its entry point.
const UI_SRC = join(dirname(require.resolve('@quieto/ui')), '..', 'src');

/** Never a control: form plumbing set by the page, not a look to try. */
const ALWAYS_HIDDEN = new Set(['name']);

const CONFIG = {
  'qds-accordion': {
    template: `
  <qds-accordion-item heading="How long does shipping take?" open>
    Orders ship within one business day.
  </qds-accordion-item>
  <qds-accordion-item heading="Can I return an item?">
    Returns are free for 30 days.
  </qds-accordion-item>
  <qds-accordion-item heading="Is there a warranty?">
    Two years, parts and labour.
  </qds-accordion-item>
`,
  },
  'qds-avatar': { initial: { name: 'Ada Lovelace' }, hide: ['src'] },
  'qds-alert': {
    content: 'Your changes are live.',
    initial: { heading: 'Changes saved' },
    hide: ['dismiss-label', 'hidden'],
  },
  'qds-breadcrumbs': {
    template: `
  <qds-breadcrumb-item><a href="/">Home</a></qds-breadcrumb-item>
  <qds-breadcrumb-item><a href="/components/">Components</a></qds-breadcrumb-item>
  <qds-breadcrumb-item>Breadcrumbs</qds-breadcrumb-item>
`,
  },
  'qds-button': { content: 'Button', hide: ['type', 'value', 'label', 'aria-haspopup', 'aria-expanded'] },
  'qds-card': {
    content: 'Cards group related content and actions.',
    template: `
  <h3 slot="header">Card title</h3>
  {content}
`,
  },
  'qds-checkbox-group': {
    initial: { label: 'Notify me about' },
    hide: ['name'],
    template: `
  <qds-checkbox value="mentions" checked>Mentions</qds-checkbox>
  <qds-checkbox value="replies">Replies</qds-checkbox>
  <qds-checkbox value="digest">Weekly digest</qds-checkbox>
`,
  },
  'qds-checkbox': { content: 'Accept the terms', hide: ['value'] },
  'qds-chip': { content: 'Design', hide: ['remove-label'] },
  'qds-icon': {
    initial: { name: 'circle-check' },
    // The name is free text in the manifest; offer the built-in icons.
    options: { name: icons.builtIn },
  },
  'qds-input': {
    initial: { label: 'Search', placeholder: 'Search' },
    hide: ['minlength', 'maxlength', 'pattern', 'autocomplete'],
  },
  'qds-menu': {
    hide: ['open', 'label'],
    template: `
  <qds-button slot="trigger" variant="secondary">Actions</qds-button>
  <qds-menu-item>Rename</qds-menu-item>
  <qds-menu-item>Duplicate</qds-menu-item>
  <qds-menu-item variant="danger">Delete</qds-menu-item>
`,
  },
  'qds-modal': {
    initial: { heading: 'Delete this project?' },
    hide: ['open', 'close-label'],
    content: 'This cannot be undone.',
    template: `
  <p>{content}</p>
  <form method="dialog" slot="footer">
    <qds-button type="submit" variant="ghost" value="cancel">Cancel</qds-button>
    <qds-button type="submit" value="confirm">Confirm</qds-button>
  </form>
`,
    // A modal is not visible until opened, so the preview needs a way to open it.
    wrap: `<qds-button variant="secondary" onclick="this.nextElementSibling.show()">Open the modal</qds-button>
{element}`,
  },
  'qds-pagination': { initial: { total: '12', current: '5' }, hide: ['href', 'label'] },
  'qds-progress-bar': { initial: { label: 'Uploading', value: '40' } },
  'qds-radio-group': {
    initial: { label: 'Delivery', value: 'standard' },
    // The value is one of the radios below, not free text.
    options: { value: ['standard', 'express', 'pickup'] },
    template: `
  <qds-radio value="standard">Standard</qds-radio>
  <qds-radio value="express">Express</qds-radio>
  <qds-radio value="pickup">Pick up in store</qds-radio>
`,
  },
  'qds-select': {
    initial: { label: 'Country', placeholder: 'Choose a country' },
    hide: ['value'],
    template: `
  <option value="ca">Canada</option>
  <option value="mx">Mexico</option>
  <option value="us">United States</option>
`,
  },
  'qds-spinner': {},
  'qds-stack': {
    initial: { direction: 'inline', gap: '300' },
    template: `
  <qds-button>First</qds-button>
  <qds-button variant="secondary">Second</qds-button>
  <qds-button variant="ghost">Third</qds-button>
`,
  },
  'qds-tabs': {
    initial: { label: 'Account settings' },
    hide: ['selected-index'],
    template: `
  <qds-tab slot="tab">Profile</qds-tab>
  <qds-tab slot="tab">Security</qds-tab>
  <qds-tab slot="tab">Billing</qds-tab>
  <qds-tab-panel>Your name, photo, and bio.</qds-tab-panel>
  <qds-tab-panel>Password and two-factor authentication.</qds-tab-panel>
  <qds-tab-panel>Plan, payment method, and invoices.</qds-tab-panel>
`,
  },
  'qds-tooltip': {
    initial: { text: 'More actions' },
    template: `
  <qds-button variant="secondary">Hover or focus me</qds-button>
`,
  },
  'qds-toast': {
    content: 'Changes saved.',
    initial: { heading: 'Saved' },
    hide: ['open', 'dismiss-label', 'duration'],
    // A toast is not visible until shown, so the preview needs a way to show it.
    wrap: `<qds-button variant="secondary" onclick="this.nextElementSibling.show()">Show the toast</qds-button>
{element}`,
  },
  'qds-text-field': {
    initial: { label: 'Email', hint: 'We never share it.', type: 'email' },
    hide: ['minlength', 'maxlength', 'pattern', 'autocomplete'],
  },
  'qds-toggle': { content: 'Notifications', hide: ['value'] },
};

/** Every `export type X = …;` in the component source, by name. */
async function typeAliases() {
  const files = (await readdir(UI_SRC, { recursive: true })).filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
  );
  const aliases = new Map();
  for (const file of files) {
    const source = await readFile(join(UI_SRC, file), 'utf8');
    for (const [, name, body] of source.matchAll(/export type (\w+)\s*=\s*([^;]+);/g)) {
      aliases.set(name, body.trim());
    }
  }
  return aliases;
}

/**
 * The options of a union of literals, following aliases (including an alias of
 * an alias), or null if the type is not one. `undefined` and `null` are dropped:
 * an optional property's type is `QdsStackAlign | undefined`.
 */
function optionsOf(type, aliases, seen = new Set()) {
  const options = [];
  for (const part of type.split('|').map((piece) => piece.trim())) {
    if (part === 'undefined' || part === 'null') continue;
    if (aliases.has(part) && !seen.has(part)) {
      const expanded = optionsOf(aliases.get(part), aliases, new Set([...seen, part]));
      if (!expanded) return null;
      options.push(...expanded);
      continue;
    }
    const literal = /^'([^']*)'$/.exec(part)?.[1] ?? (/^\d+$/.test(part) ? part : null);
    if (literal === null) return null;
    options.push(literal);
  }
  return options.length > 1 ? options : null;
}

/** A manifest default as the string an attribute would hold: "'primary'" → "primary", "null" → "". */
const unquote = (value) => {
  if (value === null || value === undefined || value === 'null' || value === 'undefined') return '';
  return String(value).replace(/^'(.*)'$/, '$1');
};

export default async function () {
  const aliases = await typeAliases();
  const { families } = await loadDocs();

  return families.map((family) => {
    const element = family.primary;
    const config = CONFIG[element.tagName] ?? {};
    const hidden = new Set([...ALWAYS_HIDDEN, ...(config.hide ?? [])]);

    const controls = element.properties
      .filter((property) => property.attribute && !hidden.has(property.attribute))
      .map((property) => {
        const options = config.options?.[property.attribute] ?? optionsOf(property.type, aliases);
        const kind = property.type === 'boolean' ? 'boolean' : options ? 'choice' : /number/.test(property.type) ? 'number' : 'text';
        return {
          attribute: property.attribute,
          kind,
          options: options ?? undefined,
          default: kind === 'boolean' ? property.default === 'true' : unquote(property.default),
        };
      });

    const values = Object.fromEntries(controls.map((control) => [control.attribute, control.default]));
    Object.assign(values, config.initial ?? {});
    const hasContent = 'content' in config;
    if (hasContent) values.content = config.content;

    const spec = {
      tag: element.tagName,
      controls,
      // The template's leading newline and indentation are for the code view;
      // a template that is just {content} keeps the element on one line.
      template: config.template ?? undefined,
      wrap: config.wrap ?? undefined,
    };

    return {
      slug: family.slug,
      tag: element.tagName,
      spec,
      values,
      hasContent,
      markup: renderPlayground(spec, values),
    };
  });
}
