import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  Ellipsis,
  Info,
  Minus,
  Plus,
  Search,
  TriangleAlert,
  X,
} from 'lucide';

/**
 * An icon's drawing: the child elements of a 24 × 24 outlined SVG, as Lucide
 * publishes them — `[['path', { d: 'M20 6 9 17l-5-5' }]]`. Every Lucide icon
 * export is one, so any of them can be registered as it is.
 */
export type QdsIconData = ReadonlyArray<
  readonly [tag: string, attributes: Record<string, string | number | undefined>]
>;

/**
 * The icons QDS's own components draw, registered on import so they always
 * resolve. Kept small on purpose: every icon here ships to every app. Apps add
 * the rest of Lucide's set with `registerIcons`, one import at a time, so a
 * bundle carries only the icons it uses.
 */
const BUILT_IN: Record<string, QdsIconData> = {
  'arrow-right': ArrowRight,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  ellipsis: Ellipsis,
  info: Info,
  minus: Minus,
  plus: Plus,
  search: Search,
  'triangle-alert': TriangleAlert,
  x: X,
};

const registry = new Map<string, QdsIconData>(Object.entries(BUILT_IN));

/** Notified when icons are registered, so an icon already on the page can draw. */
export const iconRegistryEvents = new EventTarget();

/**
 * Makes icons available to `qds-icon` by name.
 *
 * ```js
 * import { registerIcons } from '@quieto/ui';
 * import { Trash2, Pencil } from 'lucide';
 *
 * registerIcons({ trash: Trash2, pencil: Pencil });
 * ```
 *
 * Registering a name that exists replaces it, which is how an app swaps one of
 * the built-in icons for its own. An icon on the page that was waiting for its
 * name draws as soon as it is registered.
 */
export function registerIcons(icons: Record<string, QdsIconData>): void {
  for (const [name, data] of Object.entries(icons)) registry.set(name, data);
  iconRegistryEvents.dispatchEvent(new Event('change'));
}

/** The drawing registered under `name`, if any. */
export function getIcon(name: string): QdsIconData | undefined {
  return registry.get(name);
}

const escapeAttribute = (value: string | number): string =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** An icon's child elements as SVG markup. */
export function iconMarkup(data: QdsIconData): string {
  return data
    .map(([tag, attributes]) => {
      const attrs = Object.entries(attributes)
        // Lucide includes a `key` on some nodes for its React build; it is not an SVG attribute.
        .filter(([name, value]) => name !== 'key' && value !== undefined)
        .map(([name, value]) => ` ${name}="${escapeAttribute(value!)}"`)
        .join('');
      return `<${tag}${attrs}></${tag}>`;
    })
    .join('');
}
