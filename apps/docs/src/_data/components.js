/**
 * Component API documentation, read from the Custom Elements Manifest that
 * `cem analyze` generates from the source.
 *
 * Nothing here is hand-written, which is the point: an API table copied by hand
 * is a table that disagrees with the code within a release or two. The tradeoff is
 * that the JSDoc in each component is load-bearing — an undocumented `@slot` is
 * an undocumented slot on the site.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Drop private fields and the statics that are implementation detail. */
const INTERNAL_MEMBERS = new Set([
  'styles',
  'baseStyles',
  'focusRingStyles',
  'shadowRootOptions',
  'formAssociated',
  'render',
]);

const isPublicMember = (member) =>
  member.kind === 'field' &&
  member.privacy !== 'private' &&
  member.privacy !== 'protected' &&
  !member.static &&
  !member.name.startsWith('#') &&
  !member.name.startsWith('_') &&
  !INTERNAL_MEMBERS.has(member.name);

export default async function () {
  const manifestPath = require.resolve('@quieto/ui/custom-elements.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const components = [];

  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.customElement || !declaration.tagName) continue;

      const attributeFor = (fieldName) =>
        (declaration.attributes ?? []).find((attribute) => attribute.fieldName === fieldName);

      components.push({
        tagName: declaration.tagName,
        name: declaration.name,
        /**
         * The class description, minus the JSDoc tags the analyzer already parsed.
         *
         * Backticks are stripped rather than rendered: this string is used both as
         * the page lede and as the `<meta name="description">` content, and
         * neither renders Markdown — so `--qds-*` would otherwise appear with its
         * backticks showing.
         */
        summary: (declaration.description ?? '').trim().replace(/`/g, ''),
        path: module.path,
        properties: (declaration.members ?? []).filter(isPublicMember).map((member) => ({
          name: member.name,
          attribute: attributeFor(member.name)?.name ?? null,
          type: member.type?.text ?? 'unknown',
          default: member.default ?? null,
          description: (member.description ?? '').trim(),
        })),
        slots: (declaration.slots ?? []).map((slot) => ({
          name: slot.name || '(default)',
          description: (slot.description ?? '').trim(),
        })),
        events: (declaration.events ?? []).map((event) => ({
          name: event.name,
          type: event.type?.text ?? 'Event',
          description: (event.description ?? '').trim(),
        })),
        cssParts: (declaration.cssParts ?? []).map((part) => ({
          name: part.name,
          description: (part.description ?? '').trim(),
        })),
        cssProperties: (declaration.cssProperties ?? []).map((property) => ({
          name: property.name,
          description: (property.description ?? '').trim(),
          default: property.default ?? null,
        })),
      });
    }
  }

  return components.sort((a, b) => a.tagName.localeCompare(b.tagName));
}
