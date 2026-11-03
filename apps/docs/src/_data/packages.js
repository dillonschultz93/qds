/**
 * The published packages: name, current version, and where each lives, for
 * the links at the top of the pages that document them.
 *
 * The two in this repository are read from their package.json, so the version
 * shown is the one in the repository. The AI tools live in their own
 * repositories, so their version comes from the npm registry at build time; if
 * the registry cannot be reached, the page shows no version rather than failing
 * the build.
 */

import { readFile } from 'node:fs/promises';

import site from './site.js';

const OWNER = 'https://github.com/dillonschultz93';
const REPO = `${OWNER}/qds`;

/** A package in this repository's packages/ directory. */
async function local(directory) {
  const manifest = JSON.parse(
    await readFile(new URL(`../../../../packages/${directory}/package.json`, import.meta.url), 'utf8'),
  );
  return {
    name: manifest.name,
    version: manifest.version,
    npm: `https://www.npmjs.com/package/${manifest.name}`,
    source: `${REPO}/tree/main/packages/${directory}`,
    changelog: `${REPO}/blob/main/packages/${directory}/CHANGELOG.md`,
    install: `npm install ${manifest.name}`,
  };
}

/** The latest published version of `name`, or null if the registry cannot say. */
async function published(name) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${name}/latest`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? (await response.json()).version : null;
  } catch {
    return null;
  }
}

export default async function () {
  const { figma } = site();
  return {
    tokens: { ...(await local('design-tokens')), figma: figma.tokens },
    ui: { ...(await local('ui')), figma: figma.components },
    skills: {
      name: '@quieto/skills',
      version: await published('@quieto/skills'),
      npm: 'https://www.npmjs.com/package/@quieto/skills',
      source: `${OWNER}/quieto-skills`,
      changelog: `${OWNER}/quieto-skills/blob/main/CHANGELOG.md`,
      install: 'npx @quieto/skills install',
    },
    // Not on npm: the server is used where it is hosted, at quieto.dev/mcp,
    // and how to connect differs by client, so its page shows each one.
    mcp: {
      name: '@quieto/mcp',
      version: null,
      source: `${OWNER}/quieto-mcp`,
    },
  };
}
