import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTokenName, tierFromFilePath, nameQds } from './name-qds.js';

test('tier is read from the file path, not the token path', () => {
  assert.equal(tierFromFilePath('tokens/primitive/color.json'), 'primitive');
  assert.equal(tierFromFilePath('tokens/semantic/light.json'), 'semantic');
  assert.equal(tierFromFilePath('tokens/component/button.json'), 'component');

  // Absolute paths must work too — Style Dictionary resolves `source` globs to
  // absolute paths depending on how the build is invoked.
  assert.equal(
    tierFromFilePath('/Users/x/qds/packages/design-tokens/tokens/semantic/dark.json'),
    'semantic',
  );
});

test('a file outside a tier directory fails loudly', () => {
  assert.throws(() => tierFromFilePath('tokens/misc/extra.json'), /cannot determine tier/);
  assert.throws(() => tierFromFilePath(undefined), /no filePath/);
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

  const light = nameQds.transform({ filePath: 'tokens/semantic/light.json', path }, {});
  const dark = nameQds.transform({ filePath: 'tokens/semantic/dark.json', path }, {});

  assert.equal(light, dark, 'light and dark must produce identical variable names');
  assert.equal(light, 'qds-semantic-color-background-primary-rest');
  assert.ok(!light.includes('light'));
  assert.ok(!dark.includes('dark'));
});

test('the set name is discarded, so it cannot duplicate the token path', () => {
  // Set `primitive/color` and path `color.blue.400` both start with "color".
  assert.equal(
    nameQds.transform({ filePath: 'tokens/primitive/color.json', path: ['color', 'blue', '400'] }, {}),
    'qds-color-blue-400',
  );
  // Set `component/button` and path `button.md.gap` both start with "button".
  assert.equal(
    nameQds.transform({ filePath: 'tokens/component/button.json', path: ['button', 'md', 'gap'] }, {}),
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
    nameQds.transform({ filePath: 'tokens/primitive/color.json', path: ['color', 'red', '500'] }, { prefix: 'acme' }),
    'acme-color-red-500',
  );
});
