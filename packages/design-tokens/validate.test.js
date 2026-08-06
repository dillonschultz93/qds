/**
 * Adversarial tests for the nomenclature validator.
 *
 * Each case copies `tokens.json` to a temp directory, introduces one specific
 * violation, and asserts the validator rejects it *for the right reason*. A
 * validator nobody has watched fail is only assumed to work — and the failure
 * mode that matters is a rule that silently passes everything.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Apply `mutate` to a throwaway copy of tokens.json and run the validator on it.
 *
 * `mutate` receives the parsed document, whose top-level keys are the token set
 * names plus `$themes` and `$metadata`. Mutate it in place, or return a
 * replacement.
 */
function validateWithMutation(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'qds-tokens-'));
  const file = join(dir, 'tokens.json');

  const document = JSON.parse(readFileSync(join(PACKAGE_DIR, 'tokens.json'), 'utf8'));

  try {
    const mutated = mutate(document) ?? document;
    writeFileSync(file, JSON.stringify(mutated, null, 2));

    try {
      const stdout = execFileSync('node', [join(PACKAGE_DIR, 'validate.js'), file], {
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
  const { rejected, output } = validateWithMutation((doc) => doc);
  assert.ok(rejected === false, `committed tokens should validate cleanly.\n${output}`);
  assert.match(output, /conform to the QDS nomenclature/);
});

describe('grammar', () => {
  test('rejects an unregistered semantic role', () => {
    assertRejected((doc) => {
      doc['semantic/light'].color.background.brand = { $value: '{color.blue.500}', $type: 'color' };
    }, /unknown role "brand"/);
  });

  test('rejects an unregistered hue', () => {
    assertRejected((doc) => {
      doc['primitive/color'].color.fuchsia = { 500: { $value: '#d946ef', $type: 'color' } };
    }, /unknown hue "fuchsia"/);
  });

  test('rejects an unknown component property', () => {
    assertRejected((doc) => {
      doc['component/button'].button['backdrop-filter'] = {
        $value: '{spacing.100}',
        $type: 'dimension',
      };
    }, /no valid property found/);
  });

  test('rejects a node that is both a token and a group', () => {
    assertRejected((doc) => {
      doc['semantic/light'].color.background.default = {
        $value: '{color.neutral.50}',
        $type: 'color',
        hover: { $value: '{color.neutral.100}', $type: 'color' },
      };
    }, /both a token and a group/);
  });
});

describe('reference direction', () => {
  test('rejects a reference inside a primitive', () => {
    assertRejected((doc) => {
      doc['primitive/color'].color.blue['500'] = { $value: '{color.blue.600}', $type: 'color' };
    }, /raw values only/);
  });

  test('rejects a raw value at the semantic tier', () => {
    assertRejected((doc) => {
      doc['semantic/light'].color.background.default = { $value: '#ff00ff', $type: 'color' };
    }, /must alias a primitive/);
  });

  test('rejects a semantic token reaching up to a component token', () => {
    assertRejected((doc) => {
      doc['semantic/light'].color.background.info = { $value: '{button.md.gap}', $type: 'color' };
    }, /may only reference primitive/);
  });

  test('rejects a dangling reference', () => {
    assertRejected((doc) => {
      doc['semantic/light'].color.background.default = { $value: '{color.blue.1000}', $type: 'color' };
    }, /unresolved reference/);
  });
});

describe('theme completeness', () => {
  test('rejects a token defined in light but missing from dark', () => {
    assertRejected((doc) => {
      delete doc['semantic/dark'].color.background.subtle;
    }, /missing from: dark/);
  });
});

describe('set registration', () => {
  test('rejects a set present in the file but absent from tokenSetOrder', () => {
    assertRejected((doc) => {
      doc['semantic/contrast'] = {
        color: { background: { default: { $value: '{color.neutral.50}', $type: 'color' } } },
      };
    }, /missing from \$metadata\.tokenSetOrder/);
  });

  test('rejects a set in tokenSetOrder that is not in the file', () => {
    assertRejected((doc) => {
      doc.$metadata.tokenSetOrder.push('semantic/high-contrast');
    }, /not present in tokens\.json/);
  });
});
