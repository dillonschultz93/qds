#!/usr/bin/env node
/**
 * Builds the QDS token outputs from the Token Studio source in `tokens/`.
 *
 * ## What this does and does not produce
 *
 * It does NOT emit anything for Figma. `tokens/` is already in Token Studio's
 * multi-file layout, so the plugin syncs that folder straight from Git —
 * bidirectionally. There is no emitter to keep in step with the plugin's format,
 * and designer edits flow back into the repo as pull requests.
 *
 * So Style Dictionary's job here is narrow: turn the DTCG source into CSS custom
 * properties and a JS/JSON manifest.
 *
 * ## Outputs
 *
 *   dist/css/qds.css        light under :root, dark overrides under
 *                           [data-theme="dark"] plus a prefers-color-scheme
 *                           block — the single file consumers load
 *   dist/css/qds.light.css  one complete mode, standalone
 *   dist/css/qds.dark.css   one complete mode, standalone
 *   dist/js/tokens.js       typed manifest: values per mode, plus each token's
 *                           tier, path, type and unresolved reference
 *   dist/tokens.json        the same manifest as data, for the docs site
 *   dist/nomenclature.json  the vocabularies, so the docs site need not reach
 *                           across packages to render its reference tables
 *
 * ## The part to not break
 *
 * `outputReferences: true`. It makes semantic tokens emit
 * `var(--qds-color-blue-600)` instead of a flattened `#2563eb`. Without it the
 * three-tier structure is erased from the CSS — every variable becomes a literal,
 * theming stops working, and the entire nomenclature becomes decorative.
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import StyleDictionary from 'style-dictionary';
import { formattedVariables } from 'style-dictionary/utils';
import { register, permutateThemes } from '@tokens-studio/sd-transforms';

import { nameQds } from './transforms/name-qds.js';
import * as nomenclature from './nomenclature.js';
import { MODES, TIERS } from './nomenclature.js';
import { extractReferences } from './lib/references.js';

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = join(PACKAGE_DIR, 'tokens');
const DIST_DIR = join(PACKAGE_DIR, 'dist');

// Registers the Tokens Studio transforms, preprocessor, and the `tokens-studio`
// transformGroup. That group ends with `name/camel`, so appending `name/qds` in
// the platform's `transforms` overrides it — Style Dictionary concatenates
// `transforms` onto `transformGroup` and the last name transform wins.
register(StyleDictionary);
StyleDictionary.registerTransform(nameQds);

/**
 * Emits only `--name: value;` declarations, with no selector.
 *
 * Selectors are assembled in JS instead, because the same set of dark
 * declarations has to appear under two different selectors — `[data-theme=
 * "dark"]` and a `prefers-color-scheme` block — and re-running the build to vary
 * only the wrapper would be wasteful.
 */
StyleDictionary.registerFormat({
  name: 'css/qds-declarations',
  format: ({ dictionary, options }) =>
    formattedVariables({
      format: 'css',
      dictionary,
      outputReferences: options.outputReferences,
      usesDtcg: true,
    }),
});

/** Dumps the resolved token set as JSON, keeping tier, path, and references. */
StyleDictionary.registerFormat({
  name: 'json/qds-manifest',
  format: ({ dictionary }) =>
    JSON.stringify(
      dictionary.allTokens.map((token) => {
        const segments = (token.filePath ?? '').split('/');

        return {
          name: token.name,
          path: token.path,
          type: token.$type ?? token.type,
          value: token.$value ?? token.value,
          // Reference paths from the UNRESOLVED value, so a token's aliases
          // survive into the manifest. Walks composites, whose references live in
          // sub-fields rather than a top-level string.
          references: extractReferences(token.original?.$value ?? token.original?.value),
          tier: TIERS.find((tier) => segments.includes(tier)) ?? null,
          set: segments.slice(segments.indexOf('tokens') + 1).join('/').replace(/\.json$/, ''),
          description: token.$description ?? token.description ?? null,
        };
      }),
      null,
      2,
    ),
});

/** True for tokens belonging to a mode-specific semantic set. */
const isModeToken = (token, mode) =>
  (token.filePath ?? '').includes(`/semantic/${mode}.json`);

/**
 * One Style Dictionary build per theme permutation.
 *
 * @param {string} theme  Theme name from permutateThemes, e.g. `light`.
 * @param {string[]} sets Token set names, source sets included — dropping them
 *                        would leave every semantic alias unresolvable.
 */
function configFor(theme, sets) {
  return {
    source: sets.map((set) => join(TOKENS_DIR, `${set}.json`)),
    preprocessors: ['tokens-studio'],
    // Composite typography becomes one CSS `font` shorthand unless expanded, and
    // a shorthand cannot be overridden a property at a time. Shadows are left
    // composite on purpose: `box-shadow` genuinely wants the shorthand.
    expand: { include: ['typography'] },
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: {
      css: {
        transformGroup: 'tokens-studio',
        transforms: ['name/qds'],
        buildPath: `${DIST_DIR}/`,
        files: [
          {
            destination: `_${theme}.all.css`,
            format: 'css/qds-declarations',
            options: { outputReferences: true },
          },
          {
            destination: `_${theme}.mode.css`,
            format: 'css/qds-declarations',
            filter: (token) => isModeToken(token, theme),
            options: { outputReferences: true },
          },
          {
            destination: `_${theme}.manifest.json`,
            format: 'json/qds-manifest',
          },
        ],
      },
    },
  };
}

const wrap = (selector, declarations) => `${selector} {\n${declarations}\n}\n`;

const BANNER = `/**
 * Quieto Design System — design tokens
 * GENERATED FILE. Do not edit.
 *
 * Source: packages/design-tokens/tokens/ (DTCG, Token Studio multi-file layout)
 * Regenerate: pnpm --filter @quieto/design-tokens build
 */
`;

async function main() {
  const themeDefinitions = JSON.parse(await readFile(join(TOKENS_DIR, '$themes.json'), 'utf8'));

  // permutateThemes keys off each theme's `name` ("Light"), which is the
  // human-readable label shown in the plugin. Lowercase it to get back to the
  // mode identifiers used by file names, selectors, and the CSS output.
  const themes = Object.fromEntries(
    Object.entries(permutateThemes(themeDefinitions, { separator: '-' })).map(([name, sets]) => [
      name.toLowerCase(),
      sets,
    ]),
  );
  const themeNames = Object.keys(themes);

  // The assembly below assumes a `light` and a `dark` build. Adding a second
  // theme dimension multiplies the permutations, at which point that assembly
  // needs revisiting — so say so here rather than emitting a subtly wrong file.
  const unexpected = themeNames.filter((name) => !MODES.includes(name));
  if (unexpected.length > 0) {
    throw new Error(
      `build.js expects one theme per mode (${MODES.join(', ')}) but permutateThemes ` +
        `produced: ${themeNames.join(', ')}. A new theme dimension in $themes.json ` +
        'means the CSS assembly in this file needs updating.',
    );
  }

  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(join(DIST_DIR, 'css'), { recursive: true });
  await mkdir(join(DIST_DIR, 'js'), { recursive: true });

  for (const [theme, sets] of Object.entries(themes)) {
    const sd = new StyleDictionary(configFor(theme, sets));
    await sd.buildAllPlatforms();
  }

  const read = (file) => readFile(join(DIST_DIR, file), 'utf8');
  const [lightAll, darkAll, darkMode] = await Promise.all([
    read('_light.all.css'),
    read('_dark.all.css'),
    read('_dark.mode.css'),
  ]);

  // The combined stylesheet. Dark contributes only the tokens that actually
  // change, so primitives and component tokens are not redeclared.
  //
  // `:root:not([data-theme="light"])` guards the prefers-color-scheme block so an
  // explicit user choice always beats the OS setting — without it, a user who
  // picked light on a dark-mode OS gets dark anyway.
  const combined = [
    BANNER,
    wrap(':root', lightAll),
    wrap('[data-theme="dark"]', darkMode),
    `@media (prefers-color-scheme: dark) {\n${wrap(':root:not([data-theme="light"])', darkMode)}}\n`,
  ].join('\n');

  await Promise.all([
    writeFile(join(DIST_DIR, 'css/qds.css'), combined),
    writeFile(join(DIST_DIR, 'css/qds.light.css'), BANNER + '\n' + wrap(':root', lightAll)),
    writeFile(join(DIST_DIR, 'css/qds.dark.css'), BANNER + '\n' + wrap(':root', darkAll)),
  ]);

  // Merge the per-theme manifests into one token list carrying both modes.
  const manifests = Object.fromEntries(
    await Promise.all(
      themeNames.map(async (theme) => [theme, JSON.parse(await read(`_${theme}.manifest.json`))]),
    ),
  );

  const byName = new Map();
  for (const theme of themeNames) {
    for (const token of manifests[theme]) {
      const existing = byName.get(token.name);
      if (existing) {
        existing.modes[theme] = token.value;
        // A token's references can differ per mode — that IS the theme.
        existing.references[theme] = token.references;
      } else {
        const { value, references, ...rest } = token;
        byName.set(token.name, {
          ...rest,
          modes: { [theme]: value },
          references: { [theme]: references },
        });
      }
    }
  }

  const tokens = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));

  // Resolve each reference path to the CSS variable name it actually points at.
  //
  // Without this every consumer has to guess, because a reference is a bare token
  // path: `{color.background.primary.rest}` gives no clue whether the target is a
  // primitive (`--qds-color-…`) or a semantic (`--qds-semantic-color-…`) variable,
  // since only the source file carries the tier. Resolving it once here is what
  // makes rendering a reference chain a lookup rather than a heuristic.
  const nameByPath = new Map(tokens.map((token) => [token.path.join('.'), token.name]));

  for (const token of tokens) {
    token.referenceNames = Object.fromEntries(
      themeNames.map((theme) => [
        theme,
        (token.references[theme] ?? []).map((path) => nameByPath.get(path) ?? null),
      ]),
    );
  }

  const unresolved = tokens.flatMap((token) =>
    themeNames.flatMap((theme) =>
      token.referenceNames[theme]
        .map((name, index) => (name === null ? `${token.name} → {${token.references[theme][index]}}` : null))
        .filter(Boolean),
    ),
  );
  if (unresolved.length > 0) {
    throw new Error(
      `${unresolved.length} reference(s) could not be resolved to a token name:\n  ` +
        `${[...new Set(unresolved)].slice(0, 10).join('\n  ')}`,
    );
  }

  // A token whose value is identical across modes is mode-invariant. Marking it
  // lets the docs site show "same in both modes" instead of a redundant pair.
  for (const token of tokens) {
    const values = Object.values(token.modes);
    token.modeInvariant = values.every((value) => JSON.stringify(value) === JSON.stringify(values[0]));
  }

  await writeFile(join(DIST_DIR, 'tokens.json'), `${JSON.stringify(tokens, null, 2)}\n`);
  await writeFile(
    join(DIST_DIR, 'nomenclature.json'),
    `${JSON.stringify(
      {
        prefix: nomenclature.PREFIX,
        tiers: nomenclature.TIERS,
        tierIdentifiers: nomenclature.TIER_IDENTIFIERS,
        modes: nomenclature.MODES,
        states: nomenclature.STATES,
        primitive: nomenclature.primitive,
        semantic: nomenclature.semantic,
        component: nomenclature.component,
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(
    join(DIST_DIR, 'js/tokens.js'),
    `${BANNER}
/** @type {import('./tokens.d.ts').Token[]} */
export const tokens = ${JSON.stringify(tokens, null, 2)};

/** Every token, keyed by its name without the leading \`--\`. */
export const byName = Object.fromEntries(tokens.map((token) => [token.name, token]));

/** \`cssVar('qds-color-blue-400')\` → \`'var(--qds-color-blue-400)'\` */
export const cssVar = (name) => \`var(--\${name})\`;

export default tokens;
`,
  );

  await writeFile(
    join(DIST_DIR, 'js/tokens.d.ts'),
    `${BANNER}
export type Tier = ${TIERS.map((tier) => `'${tier}'`).join(' | ')};
export type Mode = ${MODES.map((mode) => `'${mode}'`).join(' | ')};

export interface Token {
  /** CSS custom property name, without the leading \`--\`. */
  name: string;
  /** Token path in the DTCG source, tier identifier excluded. */
  path: string[];
  type: string | undefined;
  tier: Tier | null;
  /** Token Studio set this came from, e.g. \`semantic/light\`. */
  set: string;
  description: string | null;
  /** Resolved value per mode. */
  modes: Record<Mode, unknown>;
  /**
   * Reference paths this token aliases, per mode — \`['color.blue.600']\`.
   * Empty for a token holding a literal value. Composite tokens list one entry
   * per referencing sub-field.
   */
  references: Record<Mode, string[]>;
  /**
   * The same references resolved to CSS variable names, per mode —
   * \`['qds-color-blue-600']\`. Use this to walk a reference chain: a raw path
   * cannot tell you the target's tier, and therefore not its variable name.
   */
  referenceNames: Record<Mode, string[]>;
  /** True when every mode resolves to the same value. */
  modeInvariant: boolean;
}

export declare const tokens: Token[];
export declare const byName: Record<string, Token>;
export declare function cssVar(name: string): string;
export default tokens;
`,
  );

  // Remove the per-theme intermediates; only the assembled outputs ship.
  await Promise.all(
    themeNames.flatMap((theme) =>
      [`_${theme}.all.css`, `_${theme}.mode.css`, `_${theme}.manifest.json`].map((file) =>
        rm(join(DIST_DIR, file), { force: true }),
      ),
    ),
  );

  const modeVarying = tokens.filter((token) => !token.modeInvariant).length;
  console.log(
    `✓ built ${tokens.length} tokens for ${themeNames.join(' + ')} ` +
      `(${modeVarying} vary by mode)`,
  );
}

main().catch((error) => {
  console.error(`\n✗ build failed: ${error.message}\n`);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
});
