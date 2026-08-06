/**
 * `name/qds` — the QDS naming grammar as a Style Dictionary name transform.
 *
 * ## Why a custom transform is unavoidable
 *
 * The grammar puts the tier identifier in the CSS variable name but NOT in the
 * JSON/Figma token path:
 *
 *   tier       JSON path                                CSS variable
 *   ---------  ---------------------------------------  --------------------------------------------------------
 *   primitive  color.blue.400                           --qds-color-blue-400
 *   semantic   color.background.default.hover           --qds-semantic-color-background-default-hover
 *   component  button.primary.color.background.hover    --qds-component-button-primary-color-background-hover
 *
 * Style Dictionary derives names from token paths, so the built-in `name/kebab`
 * plus a `prefix` would emit `--qds-color-background-default-hover` for that
 * semantic token — silently dropping the `semantic` segment. The tier has to
 * come from somewhere the path doesn't carry it: the source file.
 *
 * ## Where the tier comes from
 *
 * From `token.filePath`. `tokens/semantic/light.json` → tier `semantic`.
 *
 * Only the tier is taken from the file path; the rest of the set name is always
 * discarded, because in every tier it is either redundant or actively harmful:
 *
 *   - `primitive/color`  → `color` already leads the token path
 *   - `component/button` → `button` already leads the token path
 *   - `semantic/light`   → the mode MUST NOT appear in the name (see below)
 *
 * ## The mode-stripping rule
 *
 * This is the most important line in this file. `semantic/light.json` and
 * `semantic/dark.json` must produce IDENTICAL variable names, differing only in
 * the CSS selector they are emitted under (`:root` vs `[data-theme="dark"]`).
 *
 * If the mode leaked into the name you would get:
 *
 *   --qds-semantic-light-color-background-default   (in :root)
 *   --qds-semantic-dark-color-background-default    ([data-theme="dark"])
 *
 * Two different variables that no stylesheet could switch between — theming
 * would be structurally impossible, not merely broken. Discarding the whole set
 * name remainder makes this the default rather than something to remember.
 */

import { PREFIX, TIERS, TIER_IDENTIFIERS } from '../nomenclature.js';

/** Lowercase a segment and hyphenate camelCase / spaces / underscores. */
const kebab = (segment) =>
  String(segment)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

/**
 * Resolve a token's tier from its source file path.
 *
 * Scans path segments rather than matching a prefix so it works whether Style
 * Dictionary hands us an absolute path or one relative to the package.
 *
 * @param {string} filePath
 * @returns {'primitive' | 'semantic' | 'component'}
 */
export function tierFromFilePath(filePath) {
  if (!filePath) {
    throw new Error(
      'name/qds: token has no filePath, so its tier cannot be determined. ' +
        'Every token must live under tokens/{primitive,semantic,component}/.',
    );
  }

  const segments = filePath.split('/');
  const tier = TIERS.find((candidate) => segments.includes(candidate));

  if (!tier) {
    throw new Error(
      `name/qds: cannot determine tier for "${filePath}". ` +
        `Expected one of ${TIERS.join(', ')} in the path. ` +
        'Token files belong in tokens/{primitive,semantic,component}/.',
    );
  }

  return tier;
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
 * Does not set a `prefix` itself — it reads `options.prefix` when the platform
 * supplies one and otherwise falls back to `PREFIX` from `nomenclature.js`, so
 * the prefix has exactly one definition either way.
 */
export const nameQds = {
  name: 'name/qds',
  type: 'name',
  transform: (token, options) =>
    buildTokenName({
      tier: tierFromFilePath(token.filePath),
      path: token.path,
      prefix: options?.prefix ?? PREFIX,
    }),
};

export default nameQds;
