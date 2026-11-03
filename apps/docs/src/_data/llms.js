/**
 * llms.txt and llms-full.txt: the docs, for AI coding assistants.
 *
 * Follows the llmstxt.org format, as Mantine's docs do:
 *
 *   /llms.txt       an index: what QDS is, how to set it up, and every page
 *                   with a one-line summary
 *   /llms-full.txt  the whole reference in one file: every component's API
 *                   and examples, every primitive and semantic token, and the
 *                   naming grammar
 *
 * Built from the same sources as the pages — the site's sections, the custom
 * elements manifest, the token manifest, the examples, and the spec — so the
 * two files cannot drift from the site. Written here, as plain strings, rather
 * than in Nunjucks, whose autoescaping would turn every quote and angle bracket
 * in the examples into an entity.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { tokens } from '@quieto/design-tokens';

import loadDocs from './docs.js';
import loadExamples from './examples.js';
import loadPackages from './packages.js';
import { optionsOf, typeAliases } from '../../lib/type-aliases.js';
import site from './site.js';

const require = createRequire(import.meta.url);
const TOKENS_PKG = dirname(require.resolve('@quieto/design-tokens/package.json'));

/** One line, for a summary: no line breaks, no runs of spaces. */
const oneLine = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

/** A manifest default as written in source, minus the quotes: "'primary'" → primary. */
const plainDefault = (value) =>
  value === null || value === undefined ? '' : String(value).replace(/^'(.*)'$/, '$1');

/** How to set QDS up, shared by both files. */
function setup(packages) {
  return `## Set up

\`\`\`sh
npm install @quieto/ui
\`\`\`

\`@quieto/design-tokens\` comes with it. Load the tokens once, at the top of the app, then register the components:

\`\`\`js
import '@quieto/design-tokens/css';
import '@quieto/ui';
\`\`\`

Or register only the components used: \`import '@quieto/ui/qds-button.js';\`.

## Rules for using QDS

- Components are custom elements named \`qds-*\`, used like HTML: \`<qds-button variant="secondary">Cancel</qds-button>\`. They work in any framework, or none.
- Restyle a component by overriding its component tokens (\`--qds-component-{name}-*\`), on one instance or a whole page. Do not style a component's internals; use its CSS parts (\`::part()\`) only when no token fits.
- In app CSS, use semantic tokens (\`--qds-semantic-*\`), which switch between light and dark mode. Avoid primitives (\`--qds-color-blue-600\`) except to define your own semantic tokens.
- Dark mode follows the operating system, or \`data-theme="dark"\` / \`data-theme="light"\` on the root element.
- Events are prefixed \`qds-\` (\`qds-change\`, \`qds-close\`), bubble, and cross shadow boundaries. They fire for what the user does, not for values set from code.
- Form controls take part in a surrounding \`<form>\` like native controls: they submit under their \`name\`, validate, and reset.
- Name controls that have no visible label with their \`label\` attribute, such as an icon-only \`qds-button\`, \`qds-input\`, or \`qds-progress-bar\`.
- Functions: \`toast(message, options)\` shows a toast; \`announce(message, politeness)\` reads a message to screen readers; \`registerIcons({ name: LucideIcon })\` adds icons beyond the built-in set.

Packages: [@quieto/ui](${packages.ui.npm}) ${packages.ui.version}, [@quieto/design-tokens](${packages.tokens.npm}) ${packages.tokens.version}. Source: ${site().repo}. Semantic versioning: removing or renaming any element, attribute, event, slot, CSS part, or token waits for a major version.`;
}

/** The index: every page, by section. */
function index(sections, families, packages) {
  const url = (path) => `${site().url}${path}`;
  const lines = [
    `# ${site().title}`,
    '',
    `> Design tokens and Lit web components that share one source of truth, in light and dark. Every color, space, and type style is a token; every component is styled by nothing else.`,
    '',
    setup(packages),
    '',
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`, '');
    for (const group of section.groups) {
      for (const page of group.pages) {
        const family = families.find((candidate) => candidate.url === page.url);
        const elements = family ? ` Elements: ${family.members.map((member) => `\`${member.tagName}\``).join(', ')}.` : '';
        lines.push(`- [${page.title}](${url(page.url)}): ${oneLine(page.summary)}${elements}`);
      }
    }
    lines.push('');
  }

  lines.push(
    '## Optional',
    '',
    `- [Full reference](${url('/llms-full.txt')}): every component's API and examples, every token, and the naming grammar, in one file.`,
    `- [Roadmap](${url('/roadmap/')}): what is shipped, what is planned, and what is left out on purpose.`,
    '',
  );
  return lines.join('\n');
}

/** One element's API, as Markdown. */
function elementReference(element, aliases) {
  const lines = [`### \`<${element.tagName}>\``, '', element.description, ''];

  if (element.properties.length) {
    lines.push('Properties:', '');
    for (const property of element.properties) {
      const options = optionsOf(property.type, aliases);
      const type = options ? options.map((option) => `'${option}'`).join(' | ') : property.type;
      const attribute = property.attribute && property.attribute !== property.name ? ` (attribute \`${property.attribute}\`)` : '';
      const fallback = plainDefault(property.default);
      lines.push(
        `- \`${property.name}\`${attribute}: \`${type}\`${fallback !== '' ? `, default \`${fallback}\`` : ''}. ${oneLine(property.description)}`,
      );
    }
    lines.push('');
  }

  const lists = [
    ['Methods', element.methods.map((method) => `- \`${method.signature}\`: ${oneLine(method.description)}`)],
    ['Events', element.events.map((event) => `- \`${event.name}\` (\`${event.type}\`): ${oneLine(event.description)}`)],
    ['Slots', element.slots.map((slot) => `- \`${slot.name}\`: ${oneLine(slot.description)}`)],
    ['CSS parts', element.cssParts.map((part) => `- \`${part.name}\`: ${oneLine(part.description)}`)],
    ['Component tokens', element.cssProperties.map((property) => `- \`${property.name}\`: ${oneLine(property.description)}`)],
  ];
  for (const [title, items] of lists) {
    if (items.length) lines.push(`${title}:`, '', ...items, '');
  }
  return lines.join('\n');
}

/** A family's page: its elements, how to import them, and its examples. */
function familyReference(family, examples, aliases) {
  const lines = [
    `## ${family.name}`,
    '',
    `${oneLine(family.summary)} Docs: ${site().url}${family.url}`,
    '',
    '```js',
    ...family.members.map((member) => `import '@quieto/ui/${member.tagName}.js';`),
    '```',
    '',
    ...family.members.map((member) => elementReference(member, aliases)),
  ];

  const familyExamples = examples[family.primary.tagName] ?? [];
  if (familyExamples.length) {
    lines.push('### Examples', '');
    for (const example of familyExamples) {
      lines.push(`#### ${example.title}`, '');
      if (example.description) lines.push(oneLine(example.description), '');
      lines.push('```html', example.html.trim(), '```', '');
    }
  }
  return lines.join('\n');
}

/** Every primitive and semantic token with its value, by category. */
function tokenReference() {
  const lines = [
    '## Tokens',
    '',
    'Three tiers. **Primitives** are raw values (`--qds-color-blue-600`). **Semantic** tokens give them meaning and are the only tier that differs between light and dark mode (`--qds-semantic-color-background-primary-rest`). **Component** tokens apply semantic tokens to one component (`--qds-component-button-primary-color-background-rest`); they are listed with each component above. Every token is a CSS custom property, from `@quieto/design-tokens/css`.',
    '',
  ];
  for (const tier of ['primitive', 'semantic']) {
    lines.push(`### ${tier === 'primitive' ? 'Primitive' : 'Semantic'} tokens`, '');
    for (const token of tokens.filter((candidate) => candidate.tier === tier)) {
      const light = token.modes.light;
      const value = token.modeInvariant || light === token.modes.dark ? light : `${light} (dark: ${token.modes.dark})`;
      const description = token.description ? ` — ${oneLine(token.description)}` : '';
      lines.push(`- \`--${token.name}\`: \`${typeof value === 'object' ? JSON.stringify(value) : value}\`${description}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** The naming spec, without its diagrams, which are SVG drawings of what the prose says. */
async function specReference() {
  const spec = await readFile(join(TOKENS_PKG, 'docs/nomenclature.md'), 'utf8');
  const body = spec
    .replace(/^# .*\n/, '')
    .replace(/!\[[^\]]*\]\([^)]*\.svg\)\n?/g, '')
    // Headings move down a level, under this file's own.
    .replace(/^(#{1,5}) /gm, '#$1 ');
  return `## Token naming grammar\n\nHow every token name is built, and the vocabularies the build enforces. Docs: ${site().url}/foundations/nomenclature/\n\n${body.trim()}\n`;
}

export default async function () {
  const [{ sections, families }, packages, aliases] = await Promise.all([loadDocs(), loadPackages(), typeAliases()]);
  const examples = loadExamples();

  const full = [
    `# ${site().title}: full reference`,
    '',
    `> Every component's API and examples, every primitive and semantic token, and the token naming grammar. The index is ${site().url}/llms.txt.`,
    '',
    setup(packages),
    '',
    '# Components',
    '',
    ...families.map((family) => familyReference(family, examples, aliases)),
    tokenReference(),
    await specReference(),
  ].join('\n');

  return { index: index(sections, families, packages), full };
}
