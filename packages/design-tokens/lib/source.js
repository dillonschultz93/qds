/**
 * Reading the single-file token source, shared by `build.js` and `validate.js`.
 *
 * `tokens.json` is in Tokens Studio's single-file format: each token set is a
 * top-level key (`semantic/light`), alongside `$themes` and `$metadata`.
 *
 * That format is used because multi-file (folder) sync requires a Tokens Studio
 * Pro licence, while single-file sync does not. The cost is paid here: the set
 * layer has to be flattened before Style Dictionary can resolve anything, and
 * flattening is what destroys each token's tier.
 */

import { readFile } from 'node:fs/promises';

import { EXTENSION_KEY } from '../transforms/name-qds.js';

/** True for a DTCG token node (as opposed to a group). */
export const isToken = (node) => node !== null && typeof node === 'object' && '$value' in node;

/**
 * Read `tokens.json` and separate the sets from the plugin's metadata.
 *
 * @param {string} path
 * @returns {Promise<{ sets: Record<string, object>, themes: object[], metadata: object, setOrder: string[] }>}
 */
export async function loadTokensFile(path) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const { $themes: themes = [], $metadata: metadata = {}, ...sets } = raw;

  return {
    sets,
    themes,
    metadata,
    setOrder: metadata.tokenSetOrder ?? Object.keys(sets),
  };
}

/**
 * Deep-merge the named sets into one token tree, stamping each token with the set
 * it came from.
 *
 * ## Why flatten at all
 *
 * References are written across sets as `{color.blue.600}`, with no set prefix,
 * because that is how the plugin resolves them. Style Dictionary can only resolve
 * that once every set occupies the same namespace, so the set layer has to go.
 *
 * ## Why stamp
 *
 * Flattening erases the only remaining record of which tier a token belongs to.
 * The token path never carried it, and with a single source file neither does
 * `filePath`. The stamp under `$extensions` is what `name/qds` reads to put
 * `semantic`/`component` back into the variable name.
 *
 * Later sets win, which is why `setOrder` matters: `$metadata.tokenSetOrder` is
 * the plugin's own resolution order, so following it keeps the build and Figma in
 * agreement about which definition of a token is the live one.
 *
 * @param {string[]} setNames Sets to include, in resolution order.
 * @param {Record<string, object>} sets
 * @returns {object} A single DTCG token tree.
 */
export function mergeSets(setNames, sets) {
  const merged = {};

  for (const setName of setNames) {
    const tree = sets[setName];
    if (!tree) {
      throw new Error(`token set "${setName}" is referenced but not present in tokens.json`);
    }
    graft(merged, tree, setName);
  }

  return merged;
}

/** Recursively copy `source` into `target`, stamping tokens with `setName`. */
function graft(target, source, setName) {
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('$')) continue;

    if (isToken(value)) {
      target[key] = {
        ...value,
        $extensions: {
          ...value.$extensions,
          [EXTENSION_KEY]: { ...value.$extensions?.[EXTENSION_KEY], set: setName },
        },
      };
      continue;
    }

    if (value !== null && typeof value === 'object') {
      // A group in one set and a token in another would silently drop one of them;
      // the validator's token-or-group rule catches that case with a real message.
      if (isToken(target[key])) {
        throw new Error(
          `"${key}" is a token in one set and a group in "${setName}" — ` +
            'merging would discard one of them',
        );
      }
      target[key] ??= {};
      graft(target[key], value, setName);
    }
  }
}

/**
 * Flatten a token tree to leaves, carrying each token's path and set.
 *
 * @param {object} tree
 * @returns {{ path: string[], value: unknown, type: string|undefined, set: string|undefined, description: string|null }[]}
 */
export function flattenTokens(tree) {
  const out = [];

  const walk = (node, path) => {
    if (node === null || typeof node !== 'object') return;

    if (isToken(node)) {
      out.push({
        path: [...path],
        value: node.$value,
        type: node.$type,
        set: node.$extensions?.[EXTENSION_KEY]?.set,
        description: node.$description ?? null,
      });
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      walk(child, [...path, key]);
    }
  };

  walk(tree, []);
  return out;
}
