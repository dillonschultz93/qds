/**
 * The icons @quieto/ui registers itself (packages/ui/src/internal/icons.ts),
 * for the Icons page's grid and the icon playground's choices. The docs checks
 * render every one, so a name here that the package does not register fails
 * the build's checks rather than showing an empty square.
 */
import { readFile } from 'node:fs/promises';

const ui = JSON.parse(await readFile(new URL('../../../../packages/ui/package.json', import.meta.url), 'utf8'));

export default {
  builtIn: [
    'arrow-right',
    'check',
    'chevron-down',
    'chevron-left',
    'chevron-right',
    'circle-alert',
    'circle-check',
    'circle-x',
    'ellipsis',
    'file',
    'info',
    'minus',
    'plus',
    'search',
    'triangle-alert',
    'upload',
    'user',
    'x',
  ],
  /** The Lucide release @quieto/ui draws from, as its package.json pins it. */
  lucideVersion: ui.dependencies.lucide,
};
