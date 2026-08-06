/**
 * `name/qds` — the QDS naming grammar as a Style Dictionary name transform.
 *
 * ## Why a custom transform is unavoidable
 *
 * The grammar puts the tier identifier in the CSS variable name but NOT in the
 * token path:
 *
 *   tier       token path                               CSS variable
 *   ---------  ---------------------------------------  --------------------------------------------------------
 *   primitive  color.blue.400                           --qds-color-blue-400
 *   semantic   color.background.default.hover           --qds-semantic-color-background-default-hover
 *   component  button.primary.color.background.hover    --qds-component-button-primary-color-background-hover
 *
 * Style Dictionary derives names from token paths, so the built-in `name/kebab`
 * plus a `prefix` would emit `--qds-color-background-default-hover` for that
 * semantic token — silently dropping the `semantic` segment. The tier has to come
 * from somewhere the path doesn't carry it: the token set it was declared in.
 *
 * ## Where the tier comes from
 *
 * From the token's own provenance, stamped on by `build.js` when it merges the
 * sets: `$extensions['com.quieto.qds'].set` holds `semantic/light`, whose first
 * segment is the tier.
 *
 * It cannot come from the file path. The source is a single `tokens.json` (Tokens
 * Studio's single-file format), so every token in the build shares one file path
 * and it carries no tier at all. Nor can it come from the token path: references
 * are written across sets as `{color.blue.600}`, which only resolves once the sets
 * are merged into one flat tree — and merging is exactly what erases the set
 * layer. Hence the stamp.
 *
 * ## The mode-stripping rule
 *
 * Only the FIRST segment of the set name is used; the rest is always discarded.
 * That is what keeps the mode out of the name.
 *
 * `semantic/light` and `semantic/dark` must produce IDENTICAL variable names,
 * differing only in the CSS selector they are emitted under (`:root` vs
 * `[data-theme="dark"]`). If the mode leaked in you would get:
 *
 *   --qds-semantic-light-color-background-default   (in :root)
 *   --qds-semantic-dark-color-background-default    ([data-theme="dark"])
 *
 * Two different variables that no stylesheet could switch between — theming would
 * be structurally impossible, not merely broken. Taking only the tier segment
 * makes this the default rather than something to remember.
 */

import { PREFIX, TIERS, TIER_IDENTIFIERS } from '../nomenclature.js';

/** Namespaced key under `$extensions`, per the DTCG convention for custom data. */
export const EXTENSION_KEY = 'com.quieto.qds';

/** Lowercase a segment and hyphenate camelCase / spaces / underscores. */
const kebab = (segment) =>
  String(segment)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

/**
 * Resolve a tier from a token set name.
 *
 * @param {string} setName e.g. `semantic/light`
 * @returns {'primitive' | 'semantic' | 'component'}
 */
export function tierFromSetName(setName) {
  if (!setName) {
    throw new Error(
      'name/qds: token has no set name, so its tier cannot be determined. ' +
        'build.js stamps this on while merging; a token reaching the transform ' +
        'without it means the merge was bypassed.',
    );
  }

  const [first] = String(setName).split('/');
  if (!TIERS.includes(first)) {
    throw new Error(
      `name/qds: cannot determine tier for set "${setName}". ` +
        `Expected it to start with one of: ${TIERS.join(', ')}.`,
    );
  }

  return first;
}

/** Read the set name a token was declared in, as stamped by `build.js`. */
export function setNameOf(token) {
  const extensions = token.$extensions ?? token.extensions;
  return extensions?.[EXTENSION_KEY]?.set;
}

/**
 * Build a token name from its tier and path. Pure, so the validator and unit
 * tests can call it without constructing a Style Dictionary token.
 *
 * @param {object} args
 * @param {'primitive' | 'semantic' | 'component'} args.tier
 * @param {string[]} args.path  Token path, tier identifier excluded.
 * @param {string} [args.prefix]
 * @returns {string} e.g. `qds-semantic-color-background-default-hover`
 */
export function buildTokenName({ tier, path, prefix = PREFIX }) {
  const tierIdentifier = TIER_IDENTIFIERS[tier];

  return [prefix, tierIdentifier, ...path]
    .filter((segment) => segment !== null && segment !== undefined && segment !== '')
    .map(kebab)
    .join('-');
}

/**
 * The Style Dictionary transform. Register with `hooks.transforms` or
 * `StyleDictionary.registerTransform`, and use it in place of `name/kebab`.
 *
 * Reads `options.prefix` when the platform supplies one and otherwise falls back
 * to `PREFIX`, so the prefix has exactly one definition either way.
 */
export const nameQds = {
  name: 'name/qds',
  type: 'name',
  transform: (token, options) =>
    buildTokenName({
      tier: tierFromSetName(setNameOf(token)),
      path: token.path,
      prefix: options?.prefix ?? PREFIX,
    }),
};

export default nameQds;
