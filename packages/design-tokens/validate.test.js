/**
 * Adversarial tests for the nomenclature validator.
 *
 * Each case copies `tokens/` to a temp directory, introduces one specific
 * violation, and asserts the validator rejects it *for the right reason*. A
 * validator nobody has watched fail is only assumed to work — and the failure
 * mode that matters is a rule that silently passes everything.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));

/** Apply `mutate` to a throwaway copy of tokens/ and run the validator on it. */
function validateWithMutation(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'qds-tokens-'));
  const tokens = join(dir, 'tokens');
  cpSync(join(PACKAGE_DIR, 'tokens'), tokens, { recursive: true });

  const read = (relativePath) => JSON.parse(readFileSync(join(tokens, relativePath), 'utf8'));
  const write = (relativePath, data) =>
    writeFileSync(join(tokens, relativePath), JSON.stringify(data, null, 2));

  try {
    mutate({ read, write, tokensDir: tokens });

    try {
      const stdout = execFileSync('node', [join(PACKAGE_DIR, 'validate.js'), tokens], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { rejected: false, output: stdout };
    } catch (error) {
      return { rejected: true, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Assert the mutation is rejected, and that the message explains why. */
function assertRejected(mutate, expected) {
  const { rejected, output } = validateWithMutation(mutate);
  assert.ok(rejected, `validator accepted an invalid token set.\n${output}`);
  assert.match(output, expected);
}

test('the committed token set passes', () => {
  const { rejected, output } = validateWithMutation(() => {});
  assert.ok(rejected === false, `committed tokens should validate cleanly.\n${output}`);
  assert.match(output, /conform to the QDS nomenclature/);
});

describe('grammar', () => {
  test('rejects an unregistered semantic role', () => {
    assertRejected(({ read, write }) => {
      const light = read('semantic/light.json');
      light.color.background.brand = { $value: '{color.blue.500}', $type: 'color' };
      write('semantic/light.json', light);
    }, /unknown role "brand"/);
  });

  test('rejects an unregistered hue', () => {
    assertRejected(({ read, write }) => {
      const color = read('primitive/color.json');
      color.color.fuchsia = { 500: { $value: '#d946ef', $type: 'color' } };
      write('primitive/color.json', color);
    }, /unknown hue "fuchsia"/);
  });

  test('rejects an unknown component property', () => {
    assertRejected(({ read, write }) => {
      const button = read('component/button.json');
      button.button['backdrop-filter'] = { $value: '{spacing.100}', $type: 'dimension' };
      write('component/button.json', button);
    }, /no valid property found/);
  });

  test('rejects a node that is both a token and a group', () => {
    assertRejected(({ read, write }) => {
      const light = read('semantic/light.json');
      light.color.background.default = {
        $value: '{color.neutral.50}',
        $type: 'color',
        hover: { $value: '{color.neutral.100}', $type: 'color' },
      };
      write('semantic/light.json', light);
    }, /both a token and a group/);
  });
});

describe('reference direction', () => {
  test('rejects a reference inside a primitive', () => {
    assertRejected(({ read, write }) => {
      const color = read('primitive/color.json');
      color.color.blue['500'] = { $value: '{color.blue.600}', $type: 'color' };
      write('primitive/color.json', color);
    }, /raw values only/);
  });

  test('rejects a raw value at the semantic tier', () => {
    assertRejected(({ read, write }) => {
      const light = read('semantic/light.json');
      light.color.background.default = { $value: '#ff00ff', $type: 'color' };
      write('semantic/light.json', light);
    }, /must alias a primitive/);
  });

  test('rejects a semantic token reaching up to a component token', () => {
    assertRejected(({ read, write }) => {
      const light = read('semantic/light.json');
      light.color.background.info = { $value: '{button.md.gap}', $type: 'color' };
      write('semantic/light.json', light);
    }, /may only reference primitive/);
  });

  test('rejects a dangling reference', () => {
    assertRejected(({ read, write }) => {
      const light = read('semantic/light.json');
      light.color.background.default = { $value: '{color.blue.1000}', $type: 'color' };
      write('semantic/light.json', light);
    }, /unresolved reference/);
  });
});

describe('theme completeness', () => {
  test('rejects a token defined in light but missing from dark', () => {
    assertRejected(({ read, write }) => {
      const dark = read('semantic/dark.json');
      delete dark.color.background.subtle;
      write('semantic/dark.json', dark);
    }, /missing from: dark/);
  });
});

describe('set registration', () => {
  test('rejects a set on disk but absent from tokenSetOrder', () => {
    assertRejected(({ write }) => {
      write('semantic/contrast.json', {
        color: { background: { default: { $value: '{color.neutral.50}', $type: 'color' } } },
      });
    }, /missing from \$metadata\.json/);
  });

  test('rejects a set in tokenSetOrder with no file on disk', () => {
    assertRejected(({ read, write }) => {
      const metadata = read('$metadata.json');
      metadata.tokenSetOrder.push('semantic/high-contrast');
      write('$metadata.json', metadata);
    }, /no such file exists/);
  });
});
