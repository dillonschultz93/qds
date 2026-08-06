#!/usr/bin/env node
/**
 * Enforces the QDS naming grammar from `docs/nomenclature.md`.
 *
 * Wired ahead of `build` in turbo.json, so a token that violates the grammar
 * fails the build instead of shipping. That matters most for tokens arriving
 * from Figma: Token Studio syncs this folder bidirectionally, so a designer
 * inventing `color.background.brand` lands here as a pull request, and CI is
 * what tells them `brand` is not a registered role.
 *
 * Four classes of check:
 *
 *   1. Grammar          — every segment against its tier's vocabulary
 *   2. Reference direction — primitives raw, semantics → primitives,
 *                            components → semantics or primitives
 *   3. Theme completeness  — light and dark define the same keys
 *   4. Set registration    — every file on disk appears in $metadata.json
 *
 * Run: `node validate.js` (or `pnpm validate`). Exits 1 on any error.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MODES,
  STATES,
  TIERS,
  primitive,
  semantic,
  component,
  isKebabCase,
} from './nomenclature.js';
import { extractReferences } from './lib/references.js';

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Defaults to this package's `tokens/`. Overridable by argument so the rules can
 * be exercised against throwaway copies — a validator nobody has watched fail is
 * only assumed to work.
 */
const TOKENS_DIR = process.argv[2] ? resolve(process.argv[2]) : join(PACKAGE_DIR, 'tokens');

/** @typedef {{ setName: string, tier: string, mode: string|null, path: string[], key: string, value: unknown, type: string|undefined }} Token */

const errors = [];
const warnings = [];

const fail = (setName, path, message) =>
  errors.push({ setName, token: path.join('.'), message });

const warn = (setName, path, message) =>
  warnings.push({ setName, token: path.join('.'), message });

/** Format an "expected one of" list, truncated so errors stay readable. */
const oneOf = (list) => {
  const shown = list.slice(0, 12).join(', ');
  return list.length > 12 ? `${shown}, … (${list.length} total)` : shown;
};

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Recursively collect `*.json` set files under tokens/, excluding `$*.json`. */
async function findSetFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSetFiles(full)));
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('$')) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Flatten a DTCG token tree into leaf tokens. A node is a token when it carries
 * `$value`; everything else is a group.
 *
 * Also enforces the token-or-group rule: DTCG forbids a node from being both, so
 * a role cannot hold a resting value *and* contain state children. This is the
 * constraint that `rest` exists to resolve (see nomenclature.js § STATES). Left
 * undetected it fails silently — the walk stops at `$value` and every nested
 * state is dropped from the build without a word.
 */
function flatten(node, path, collected, setName) {
  if (node === null || typeof node !== 'object') return collected;

  if ('$value' in node) {
    const childKeys = Object.keys(node).filter((key) => !key.startsWith('$'));

    if (childKeys.length > 0) {
      fail(
        setName,
        path,
        `node is both a token and a group — it has a $value and the children ` +
          `[${childKeys.join(', ')}], which DTCG does not allow and which would ` +
          `silently drop those children from the build. Give the resting value an ` +
          `explicit state instead: ${[...path, 'rest'].join('.')}`,
      );
    }

    collected.push({ path: [...path], value: node.$value, type: node.$type });
    return collected;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flatten(child, [...path, key], collected, setName);
  }

  return collected;
}

// ---------------------------------------------------------------------------
// Grammar: primitive
// ---------------------------------------------------------------------------

/** {category}.{sub-category?}.{value} — e.g. color.blue.400, spacing.400 */
function validatePrimitive(token) {
  const { setName, path } = token;
  const [category, second] = path;

  if (path.length < 2) {
    return fail(
      setName,
      path,
      'primitive tokens need at least {category}.{value}, e.g. spacing.400',
    );
  }

  if (!primitive.categories.includes(category)) {
    return fail(
      setName,
      path,
      `unknown primitive category "${category}". Expected one of: ${oneOf(primitive.categories)}`,
    );
  }

  // With three or more segments the second is a sub-category. Colors take a hue
  // name there; everything else takes a fixed sub-category.
  if (path.length >= 3) {
    if (category === 'color') {
      if (!primitive.hues.includes(second)) {
        fail(
          setName,
          path,
          `unknown hue "${second}". Registered hues: ${oneOf(primitive.hues)}. ` +
            'Add it to `primitive.hues` in nomenclature.js if it is intentional.',
        );
      }
    } else if (!primitive.subCategories.includes(second)) {
      fail(
        setName,
        path,
        `unknown sub-category "${second}" for category "${category}". ` +
          `Expected one of: ${oneOf(primitive.subCategories)}`,
      );
    }
  }

  for (const segment of path) {
    if (!isKebabCase(segment)) {
      fail(setName, path, `segment "${segment}" is not lowercase kebab-case`);
    }
  }
}

// ---------------------------------------------------------------------------
// Grammar: semantic
// ---------------------------------------------------------------------------

/**
 * {category}.{property}.{role}.{state?} for color
 * {category}.{role}.{state?}            for everything else
 *
 * Properties are the three color surfaces (content/background/border), so only
 * `color` uses that slot; other categories address one property implicitly.
 */
function validateSemantic(token) {
  const { setName, path } = token;
  const [category] = path;

  if (!semantic.categories.includes(category)) {
    return fail(
      setName,
      path,
      `unknown semantic category "${category}". Expected one of: ${oneOf(semantic.categories)}`,
    );
  }

  const isColor = category === 'color';
  const expected = isColor
    ? '{category}.{property}.{role}.{state?}'
    : '{category}.{role}.{state?}';

  // Peel an optional trailing state, then check what remains.
  const rest = path.slice(1);
  const maybeState = rest.at(-1);
  const hasState = rest.length > (isColor ? 2 : 1) && STATES.includes(maybeState);
  const core = hasState ? rest.slice(0, -1) : rest;

  if (hasState === false && rest.length > (isColor ? 2 : 1)) {
    return fail(
      setName,
      path,
      `too many segments — expected ${expected}. ` +
        `If "${maybeState}" is a state, it must be one of: ${oneOf(STATES)}`,
    );
  }

  if (isColor) {
    if (core.length !== 2) {
      return fail(setName, path, `expected ${expected}`);
    }
    const [property, role] = core;
    if (!semantic.properties.includes(property)) {
      fail(
        setName,
        path,
        `unknown property "${property}". Color tokens address one of: ${oneOf(semantic.properties)}`,
      );
    }
    if (!semantic.roles.includes(role)) {
      fail(setName, path, `unknown role "${role}". Expected one of: ${oneOf(semantic.roles)}`);
    }
  } else {
    if (core.length !== 1) {
      return fail(setName, path, `expected ${expected}`);
    }
    const [role] = core;
    if (!semantic.roles.includes(role)) {
      fail(setName, path, `unknown role "${role}". Expected one of: ${oneOf(semantic.roles)}`);
    }
  }

  for (const segment of path) {
    if (!isKebabCase(segment)) {
      fail(setName, path, `segment "${segment}" is not lowercase kebab-case`);
    }
  }
}

// ---------------------------------------------------------------------------
// Grammar: component
// ---------------------------------------------------------------------------

/**
 * {component-name}.{variant?}.{property}.{state?}
 *
 * Parsed right-to-left, because the property may be one segment
 * (`padding-inline`) or two (`color.background` → `color-background`), which
 * makes the position of everything to its left ambiguous from the front.
 */
function validateComponent(token) {
  const { setName, path } = token;

  if (path.length < 2) {
    return fail(
      setName,
      path,
      'component tokens need at least {component-name}.{property}, e.g. button.padding',
    );
  }

  let remaining = [...path];

  // 1. Optional trailing state.
  if (remaining.length > 2 && STATES.includes(remaining.at(-1))) {
    remaining = remaining.slice(0, -1);
  }

  // 2. Property: two-segment color property first, then single-segment CSS one.
  const lastTwo = remaining.slice(-2).join('-');
  if (component.colorProperties.includes(lastTwo)) {
    remaining = remaining.slice(0, -2);
  } else if (component.cssProperties.includes(remaining.at(-1))) {
    remaining = remaining.slice(0, -1);
  } else {
    return fail(
      setName,
      path,
      `no valid property found. Expected a color property (${oneOf(component.colorProperties)}) ` +
        `or a CSS property (${oneOf(component.cssProperties)}). ` +
        'Add it to `component.cssProperties` in nomenclature.js if it is intentional.',
    );
  }

  // 3. What's left is the component name plus an optional variant.
  if (remaining.length === 0) {
    return fail(setName, path, 'missing component name before the property');
  }
  if (remaining.length > 2) {
    return fail(
      setName,
      path,
      `expected {component-name}.{variant?}.{property}.{state?} but found extra segments: ` +
        `${remaining.join('.')}`,
    );
  }

  for (const segment of path) {
    if (!isKebabCase(segment)) {
      fail(
        setName,
        path,
        `segment "${segment}" is not lowercase kebab-case ` +
          '(multi-word component names use dashes, e.g. text-field)',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Reference direction
// ---------------------------------------------------------------------------

/**
 * The tier contract, enforced rather than trusted. Without this the three tiers
 * are a naming convention; with it they are an architecture.
 */
const ALLOWED_REFERENCE_TIERS = {
  primitive: [],
  semantic: ['primitive'],
  component: ['semantic', 'primitive'],
};

function validateReferences(token, tierByPath) {
  const { setName, tier, path, value } = token;
  const references = extractReferences(value);
  const allowed = ALLOWED_REFERENCE_TIERS[tier];

  if (tier === 'primitive' && references.length > 0) {
    return fail(
      setName,
      path,
      `primitive tokens hold raw values only, but this references ${references
        .map((r) => `{${r}}`)
        .join(', ')}. Move the alias to the semantic tier.`,
    );
  }

  for (const reference of references) {
    const targetTiers = tierByPath.get(reference);

    if (!targetTiers) {
      fail(setName, path, `unresolved reference {${reference}} — no token with that path exists`);
      continue;
    }

    const illegal = [...targetTiers].filter((target) => !allowed.includes(target));
    if (illegal.length > 0) {
      fail(
        setName,
        path,
        `${tier} tokens may only reference ${allowed.join(' or ')} tokens, ` +
          `but {${reference}} is ${illegal.join('/')}.`,
      );
    }
  }

  // A semantic token with no reference is a raw value that bypasses the palette
  // entirely — precisely how one-off colors creep into a design system. The tier
  // contract only holds if every semantic token aliases something.
  //
  // This is an error rather than a warning because no legitimate exception exists
  // in practice: composite typography and shadow tokens reference primitives in
  // their sub-fields, which `extractReferences` walks into. If you hit this and
  // there is genuinely no primitive to point at, the fix is to add the primitive,
  // not to inline the value here.
  if (tier === 'semantic' && references.length === 0) {
    fail(
      setName,
      path,
      'semantic tokens must alias a primitive, but this holds a raw value. ' +
        'Add a primitive for it and reference that instead.',
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const metadata = JSON.parse(await readFile(join(TOKENS_DIR, '$metadata.json'), 'utf8'));
  const setOrder = metadata.tokenSetOrder ?? [];

  const files = await findSetFiles(TOKENS_DIR);

  // A set on disk but absent from tokenSetOrder loads in neither Token Studio
  // nor the build — it silently does nothing, which is worse than an error.
  const onDisk = files.map((file) =>
    relative(TOKENS_DIR, file).replace(/\.json$/, ''),
  );
  for (const setName of onDisk) {
    if (!setOrder.includes(setName)) {
      errors.push({
        setName,
        token: '—',
        message: 'set exists on disk but is missing from $metadata.json tokenSetOrder',
      });
    }
  }
  for (const setName of setOrder) {
    if (!onDisk.includes(setName)) {
      errors.push({
        setName,
        token: '—',
        message: 'set listed in $metadata.json tokenSetOrder but no such file exists',
      });
    }
  }

  /** @type {Token[]} */
  const tokens = [];

  for (const file of files) {
    const setName = relative(TOKENS_DIR, file).replace(/\.json$/, '');
    const [tierSegment, ...restOfSet] = setName.split('/');

    if (!TIERS.includes(tierSegment)) {
      errors.push({
        setName,
        token: '—',
        message: `set is not under a tier directory. Expected tokens/{${TIERS.join('|')}}/…`,
      });
      continue;
    }

    const mode = restOfSet.find((segment) => MODES.includes(segment)) ?? null;
    const tree = JSON.parse(await readFile(file, 'utf8'));

    for (const leaf of flatten(tree, [], [], setName)) {
      tokens.push({ ...leaf, setName, tier: tierSegment, mode, key: leaf.path.join('.') });
    }
  }

  // Index every token path to the tier(s) that define it, so references can be
  // resolved. Light and dark both define the same semantic paths, hence a Set.
  const tierByPath = new Map();
  for (const token of tokens) {
    if (!tierByPath.has(token.key)) tierByPath.set(token.key, new Set());
    tierByPath.get(token.key).add(token.tier);
  }

  for (const [key, tiers] of tierByPath) {
    if (tiers.size > 1) {
      warnings.push({
        setName: [...tiers].join('/'),
        token: key,
        message: `path is defined in more than one tier (${[...tiers].join(', ')}), ` +
          'making references to it ambiguous',
      });
    }
  }

  // Grammar + references.
  const grammarByTier = {
    primitive: validatePrimitive,
    semantic: validateSemantic,
    component: validateComponent,
  };

  for (const token of tokens) {
    grammarByTier[token.tier](token);
    validateReferences(token, tierByPath);
  }

  // Theme completeness: every mode must define the same semantic keys. A token
  // present in light but missing in dark shows up as an unstyled element only in
  // dark mode — exactly the bug that reaches production.
  const keysByMode = new Map();
  for (const token of tokens) {
    if (token.tier !== 'semantic' || !token.mode) continue;
    if (!keysByMode.has(token.mode)) keysByMode.set(token.mode, new Set());
    keysByMode.get(token.mode).add(token.key);
  }

  const presentModes = [...keysByMode.keys()];
  if (presentModes.length > 1) {
    const union = new Set(presentModes.flatMap((mode) => [...keysByMode.get(mode)]));
    for (const key of union) {
      const missingFrom = presentModes.filter((mode) => !keysByMode.get(mode).has(key));
      if (missingFrom.length > 0) {
        errors.push({
          setName: `semantic/${presentModes.join(',')}`,
          token: key,
          message: `defined in some modes but missing from: ${missingFrom.join(', ')}`,
        });
      }
    }
  }

  // Report.
  const label = (entry) => `  ${entry.setName}  ${entry.token}\n    ${entry.message}`;

  if (warnings.length > 0) {
    console.warn(`\n${warnings.length} warning(s):\n`);
    console.warn(warnings.map(label).join('\n\n'));
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} nomenclature error(s):\n`);
    console.error(errors.map(label).join('\n\n'));
    console.error('\nSee packages/design-tokens/docs/nomenclature.md for the grammar.\n');
    process.exit(1);
  }

  console.log(
    `✓ ${tokens.length} tokens across ${files.length} sets conform to the QDS nomenclature.`,
  );
}

main().catch((error) => {
  console.error(`\n✗ validate.js failed: ${error.message}\n`);
  process.exit(1);
});
