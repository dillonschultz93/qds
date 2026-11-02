import { css } from 'lit';

/**
 * Floating panels: tooltips and menus, positioned beside the element that
 * opened them and drawn above everything else on the page.
 *
 * Two problems, solved separately:
 *
 *   - **Staying on top.** A panel inside a component inherits every ancestor's
 *     `overflow: hidden` and stacking context, so a menu in a card or dialog
 *     would be clipped. The native Popover API moves the open panel into the
 *     browser's top layer, above all of that, without moving it in the DOM.
 *     Where the API is missing, the panel is shown in place instead: clippable,
 *     but present.
 *
 *   - **Position.** CSS anchor positioning would do this declaratively, but it is
 *     not yet in every browser QDS supports, so the panel is placed from the
 *     anchor's bounding box — flipped to the other side when it would not fit,
 *     and shifted along its side to stay inside the viewport — and placed again
 *     while it is open, as the page scrolls or resizes.
 *
 * Panels use `popover="manual"`: the components decide when to close (Escape, a
 * click elsewhere, a choice), because the automatic kind closes on the press
 * that lands on the trigger, and the click that follows would reopen it.
 */

export type QdsSide = 'top' | 'bottom' | 'left' | 'right';
export type QdsAlign = 'start' | 'center' | 'end';

/** Space kept between a panel and the viewport's edge. */
const VIEWPORT_MARGIN = 8;

const OPPOSITE: Record<QdsSide, QdsSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

const supportsPopover = (): boolean =>
  typeof HTMLElement !== 'undefined' && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');

/**
 * Shows a panel. The panel carries `popover="manual"` in its markup, and the
 * `open` class, which the component's styles show it by, as a fallback for
 * browsers without the Popover API.
 */
export function showPanel(panel: HTMLElement): void {
  panel.classList.add('open');
  if (supportsPopover() && !panel.matches(':popover-open')) panel.showPopover();
}

export function hidePanel(panel: HTMLElement): void {
  panel.classList.remove('open');
  if (supportsPopover() && panel.matches(':popover-open')) panel.hidePopover();
}

/**
 * Places `panel` on `side` of `anchor`, `gap` pixels away, aligned to its
 * `align` edge. Returns the side it was placed on, which differs from the one
 * asked for when there was not room.
 */
export function placePanel(
  anchor: Element,
  panel: HTMLElement,
  { side, align = 'center', gap }: { side: QdsSide; align?: QdsAlign; gap: number },
): QdsSide {
  const a = anchor.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  // The room on each side of the anchor, less the gap.
  const room: Record<QdsSide, number> = {
    top: a.top - gap - VIEWPORT_MARGIN,
    bottom: vh - a.bottom - gap - VIEWPORT_MARGIN,
    left: a.left - gap - VIEWPORT_MARGIN,
    right: vw - a.right - gap - VIEWPORT_MARGIN,
  };
  const needed = side === 'top' || side === 'bottom' ? p.height : p.width;
  const placed = room[side] < needed && room[OPPOSITE[side]] > room[side] ? OPPOSITE[side] : side;

  let top: number;
  let left: number;
  if (placed === 'top' || placed === 'bottom') {
    top = placed === 'top' ? a.top - gap - p.height : a.bottom + gap;
    left = align === 'start' ? a.left : align === 'end' ? a.right - p.width : a.left + (a.width - p.width) / 2;
    left = clamp(left, VIEWPORT_MARGIN, vw - VIEWPORT_MARGIN - p.width);
  } else {
    left = placed === 'left' ? a.left - gap - p.width : a.right + gap;
    top = align === 'start' ? a.top : align === 'end' ? a.bottom - p.height : a.top + (a.height - p.height) / 2;
    top = clamp(top, VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN - p.height);
  }

  // The panel is position: fixed, so these are viewport coordinates. A panel
  // shown in place, without the Popover API, is fixed too, so the same holds.
  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
  panel.dataset.side = placed;
  return placed;
}

/** `value`, kept within `min` and `max` — or at `min` when the two cross. */
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max));

/**
 * Calls `update` whenever the panel's position could have changed — on any
 * scroll, on a window resize, or when either element changes size — at most
 * once a frame. Returns a function that stops it.
 */
export function whileOpen(anchor: Element, panel: HTMLElement, update: () => void): () => void {
  let frame = 0;
  const schedule = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };
  // Capture, so a scroll in any scrolling ancestor is seen, not only the page's.
  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  const observer = new ResizeObserver(schedule);
  observer.observe(anchor);
  observer.observe(panel);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('resize', schedule);
    observer.disconnect();
  };
}

/** A length custom property on `element`, in pixels, or `fallback` if it is unset. */
export function lengthOf(element: Element, property: string, fallback: number): number {
  const value = getComputedStyle(element).getPropertyValue(property).trim();
  if (!value) return fallback;
  if (value.endsWith('rem')) {
    return parseFloat(value) * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
  const pixels = parseFloat(value);
  return Number.isNaN(pixels) ? fallback : pixels;
}

/** Styles every floating panel shares. */
export const panelStyles = css`
  .panel {
    position: fixed;
    inset: auto;
    margin: 0;
    display: none;
  }

  .panel.open {
    display: block;
  }
`;
