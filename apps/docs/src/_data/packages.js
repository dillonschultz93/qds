/**
 * The published packages: name, current version, and where each lives, for
 * the links at the top of the pages that document them. Read from each
 * package's package.json, so the version shown is the one in the repository.
 */

import { readFile } from 'node:fs/promises';

const REPO = 'https://github.com/dillonschultz93/qds';

async function load(directory) {
  const manifest = JSON.parse(
    await readFile(new URL(`../../../../packages/${directory}/package.json`, import.meta.url), 'utf8'),
  );
  return {
    name: manifest.name,
    version: manifest.version,
    npm: `https://www.npmjs.com/package/${manifest.name}`,
    source: `${REPO}/tree/main/packages/${directory}`,
    changelog: `${REPO}/blob/main/packages/${directory}/CHANGELOG.md`,
  };
}

export default async function () {
  return {
    tokens: await load('design-tokens'),
    ui: await load('ui'),
  };
}
