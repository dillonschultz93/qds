/**
 * Announcements to assistive technology: one shared way to have a screen reader
 * read a message aloud without moving focus.
 *
 * A component could carry its own `role="alert"` or `aria-live` instead, but
 * then two components reporting the same event (an alert and a toast both
 * saying "Saved") would each be announced, and two live regions updating at
 * once can interrupt each other. Routing every announcement through one pair of
 * regions avoids both: a message repeated within a moment is announced once,
 * and polite messages queue behind one another rather than competing.
 *
 * The regions live in the document's light DOM, at the end of the body, where
 * every screen reader watches live regions reliably. They are created on the
 * first announcement, so a page that never announces anything has none.
 */

export type QdsPoliteness = 'polite' | 'assertive';

/** A repeat of the last message within this long is the same event, not a new one. */
const REPEAT_WINDOW = 1000;

/**
 * Screen readers miss a change made in the same moment a region is created, or
 * one that replaces identical text. The region is cleared, then filled after
 * this delay, so every announcement is a change they see.
 */
const SETTLE_DELAY = 100;

const regions = new Map<QdsPoliteness, HTMLElement>();
let last: { message: string; at: number } | null = null;

function regionFor(politeness: QdsPoliteness): HTMLElement {
  let region = regions.get(politeness);
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.dataset.qdsAnnouncer = politeness;
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  // Visually hidden, but rendered: display: none would remove it from the
  // accessibility tree, and nothing would be announced.
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  document.body.append(region);
  regions.set(politeness, region);
  return region;
}

/**
 * Has screen readers read `message` aloud. `assertive` interrupts whatever is
 * being read, so it is for errors and warnings; everything else is `polite`,
 * read when the reader pauses.
 *
 * ```js
 * import { announce } from '@quieto/ui';
 *
 * announce('Changes saved.');
 * announce('Could not save. Check your connection.', 'assertive');
 * ```
 */
export function announce(message: string, politeness: QdsPoliteness = 'polite'): void {
  const text = message.replace(/\s+/g, ' ').trim();
  if (!text || typeof document === 'undefined') return;

  const now = Date.now();
  if (last && last.message === text && now - last.at < REPEAT_WINDOW) return;
  last = { message: text, at: now };

  const region = regionFor(politeness);
  region.textContent = '';
  setTimeout(() => {
    region.textContent = text;
  }, SETTLE_DELAY);
}
