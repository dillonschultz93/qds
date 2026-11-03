/**
 * The component source's type aliases, resolved to the literals they stand for.
 *
 * The custom elements manifest records a union only by its alias's name
 * (QdsButtonVariant), which says nothing to a reader. Every alias in the source
 * is a plain `export type X = 'a' | 'b'`, so they are read from there.
 *
 * Used by the playgrounds (a union becomes a radio group of its options) and by
 * llms-full.txt (a property's type is written out as its options). Kept outside
 * _data, since Eleventy would publish a data file's every export as data.
 */

import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// The package's exports do not include its source, so go from its entry point.
const UI_SRC = join(dirname(require.resolve('@quieto/ui')), '..', 'src');

/** Every `export type X = …;` in the component source, by name. */
export async function typeAliases() {
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
export function optionsOf(type, aliases, seen = new Set()) {
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

