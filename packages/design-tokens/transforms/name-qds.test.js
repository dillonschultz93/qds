import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTokenName, tierFromSetName, setNameOf, nameQds, EXTENSION_KEY } from './name-qds.js';

/** A token as it reaches the transform: stamped with its set by build.js. */
const token = (setName, path) => ({
  path,
  $extensions: { [EXTENSION_KEY]: { set: setName } },
});

test('tier is read from the set name', () => {
  assert.equal(tierFromSetName('primitive/color'), 'primitive');
  assert.equal(tierFromSetName('semantic/light'), 'semantic');
  assert.equal(tierFromSetName('semantic/base'), 'semantic');
  assert.equal(tierFromSetName('component/button'), 'component');
});

test('a set name that does not start with a tier fails loudly', () => {
  assert.throws(() => tierFromSetName('misc/extra'), /cannot determine tier/);
  assert.throws(() => tierFromSetName(undefined), /no set name/);
});

test('the set stamp is read from $extensions', () => {
  assert.equal(setNameOf(token('semantic/dark', ['a'])), 'semantic/dark');
  assert.equal(setNameOf({ path: ['a'] }), undefined);
});

test('the three tiers produce the names in docs/nomenclature.md', () => {
  assert.equal(
    buildTokenName({ tier: 'primitive', path: ['color', 'blue', '400'] }),
    'qds-color-blue-400',
  );
  assert.equal(
    buildTokenName({ tier: 'semantic', path: ['color', 'background', 'default', 'hover'] }),
    'qds-semantic-color-background-default-hover',
  );
  assert.equal(
    buildTokenName({
      tier: 'component',
      path: ['button', 'primary', 'color', 'background', 'hover'],
    }),
    'qds-component-button-primary-color-background-hover',
  );
});

test('primitives carry no tier identifier', () => {
  const name = buildTokenName({ tier: 'primitive', path: ['spacing', '400'] });
  assert.equal(name, 'qds-spacing-400');
  assert.ok(!name.includes('primitive'));
});

/**
 * The regression test that matters most in this file.
 *
 * Light and dark must resolve to the SAME variable name — the mode is carried by
 * the CSS selector, never the name. If the mode leaked in, the two modes would
 * emit different variables and no stylesheet could switch between them: theming
 * would be structurally impossible rather than merely wrong.
 */
test('the mode never reaches the token name', () => {
  const path = ['color', 'background', 'primary', 'rest'];

  const light = nameQds.transform(token('semantic/light', path), {});
  const dark = nameQds.transform(token('semantic/dark', path), {});

  assert.equal(light, dark, 'light and dark must produce identical variable names');
  assert.equal(light, 'qds-semantic-color-background-primary-rest');
  assert.ok(!light.includes('light'));
  assert.ok(!dark.includes('dark'));
});

test('only the tier segment of the set name is used', () => {
  // `semantic/base` and `semantic/light` differ after the tier, and that
  // difference must not reach the name either.
  const path = ['radius', 'default'];
  assert.equal(
    nameQds.transform(token('semantic/base', path), {}),
    nameQds.transform(token('semantic/light', path), {}),
  );
  assert.equal(nameQds.transform(token('semantic/base', path), {}), 'qds-semantic-radius-default');
});

test('the set name never duplicates the token path', () => {
  // Set `primitive/color` and path `color.blue.400` both start with "color".
  assert.equal(
    nameQds.transform(token('primitive/color', ['color', 'blue', '400']), {}),
    'qds-color-blue-400',
  );
  // Set `component/button` and path `button.md.gap` both start with "button".
  assert.equal(
    nameQds.transform(token('component/button', ['button', 'md', 'gap']), {}),
    'qds-component-button-md-gap',
  );
});

test('segments are normalized to kebab-case', () => {
  assert.equal(
    buildTokenName({ tier: 'primitive', path: ['typography', 'fontSize', '400'] }),
    'qds-typography-font-size-400',
  );
  assert.equal(
    buildTokenName({ tier: 'primitive', path: ['color', 'Blue Grey', '400'] }),
    'qds-color-blue-grey-400',
  );
});

test('a platform-supplied prefix wins over the default', () => {
  assert.equal(
    nameQds.transform(token('primitive/color', ['color', 'red', '500']), { prefix: 'acme' }),
    'acme-color-red-500',
  );
});

test('an unstamped token fails rather than emitting a name without its tier', () => {
  // Silently omitting the tier would produce a plausible-looking but wrong
  // variable, so this must throw.
  assert.throws(() => nameQds.transform({ path: ['color', 'background', 'default'] }, {}), /no set name/);
});
