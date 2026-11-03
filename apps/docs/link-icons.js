/**
 * The icons the site's icon buttons draw: GitHub, npm, Figma, and a changelog
 * for the package links, and a sun and moon for the header's theme toggle.
 *
 * Lucide, the icon set QDS draws, has no brand logos, so the three marks come
 * from Simple Icons (CC0). They are filled shapes on the same 24-pixel grid,
 * while qds-icon draws an outline, so each path turns the fill on and the stroke
 * off. The rest are Lucide's own.
 *
 * Imported twice, so the icons exist wherever qds-icon renders: by the server
 * render (componentModules in eleventy.config.js) and by the browser bundle
 * (client.js). Without the first, the icons would appear only after hydration.
 */
import { registerIcons } from '@quieto/ui';
import { History, Moon, Sun } from 'lucide';
import { siFigma, siGithub, siNpm } from 'simple-icons';

const filled = (icon) => [['path', { d: icon.path, fill: 'currentColor', stroke: 'none' }]];

registerIcons({
  github: filled(siGithub),
  npm: filled(siNpm),
  figma: filled(siFigma),
  history: History,
  moon: Moon,
  sun: Sun,
});
