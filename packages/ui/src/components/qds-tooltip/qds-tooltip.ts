import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import {
  hidePanel,
  lengthOf,
  panelStyles,
  placePanel,
  showPanel,
  whileOpen,
  type QdsSide,
} from '../../internal/floating.js';
import { QdsElement } from '../../internal/qds-element.js';

export type QdsTooltipPlacement = QdsSide;

/** How long the pointer rests on the trigger before the tooltip shows. */
const SHOW_DELAY = 400;

/**
 * How long the tooltip stays after the pointer leaves the trigger, so it can
 * cross the gap onto the tooltip — which keeps it open, as WCAG 1.4.13 asks.
 */
const HIDE_DELAY = 150;

/**
 * A short label shown beside an element on hover and on keyboard focus, such as
 * the name of an icon-only button.
 *
 * Wrap the element it describes:
 *
 * ```html
 * <qds-tooltip text="Delete">
 *   <qds-button variant="ghost"><qds-icon name="x"></qds-icon></qds-button>
 * </qds-tooltip>
 * ```
 *
 * The text reaches assistive technology through the element, not the tooltip.
 * When the element has no accessible name of its own — an icon-only button —
 * the text becomes its name, set through the button's `label`, or `aria-label`
 * on a native element. When it already has one, the text becomes its
 * description (`aria-description`), read after the name. The tooltip itself is
 * hidden from assistive technology, so nothing is read twice.
 *
 * It shows after a short pause on hover and at once on focus, stays while the
 * pointer moves onto it, and closes on Escape — so it can be read, and
 * dismissed without moving away. Touch has no hover: put anything essential in
 * the page, not only in a tooltip.
 *
 * @element qds-tooltip
 *
 * @slot - The element the tooltip describes. One element.
 *
 * @csspart tooltip - The tooltip's box.
 *
 * @cssprop [--qds-component-tooltip-gap] - Distance from the element.
 * @cssprop [--qds-component-tooltip-padding-block] - Vertical padding.
 * @cssprop [--qds-component-tooltip-padding-inline] - Horizontal padding.
 * @cssprop [--qds-component-tooltip-max-width] - Widest the tooltip grows before wrapping.
 * @cssprop [--qds-component-tooltip-border-radius] - Corner radius.
 * @cssprop [--qds-component-tooltip-font-size] - Text size.
 * @cssprop [--qds-component-tooltip-line-height] - Text line height.
 * @cssprop [--qds-component-tooltip-duration] - Fade duration.
 * @cssprop [--qds-component-tooltip-color-background-rest] - Fill.
 * @cssprop [--qds-component-tooltip-color-content-rest] - Text color.
 */
@customElement('qds-tooltip')
export class QdsTooltip extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    panelStyles,
    css`
      :host {
        display: inline-block;
      }

      .tooltip {
        max-width: min(var(--qds-component-tooltip-max-width, 24rem), calc(100vw - 1rem));
        padding: var(--qds-component-tooltip-padding-block, 0.25rem) var(--qds-component-tooltip-padding-inline, 0.5rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-tooltip-font-size, 0.75rem);
        line-height: var(--qds-component-tooltip-line-height, 1.375);
        color: var(--qds-component-tooltip-color-content-rest, #f8fafc);
        overflow-wrap: break-word;

        background-color: var(--qds-component-tooltip-color-background-rest, #0f172a);
        border: 0;
        border-radius: var(--qds-component-tooltip-border-radius, 0.25rem);

        animation: fade-in var(--qds-component-tooltip-duration, 120ms) ease-out;
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .tooltip {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        .tooltip {
          border: 1px solid CanvasText;
        }
      }
    `,
  ];

  /** The tooltip's text. Plain text, and short: a name or a few words. */
  @property()
  text = '';

  /** The side of the element it appears on. Flips to the other side when there is not room. */
  @property({ reflect: true })
  placement: QdsTooltipPlacement = 'top';

  /** Stops the tooltip from showing. The text still names or describes the element. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Whether the tooltip is showing. */
  @state()
  private open = false;

  @query('.tooltip')
  private readonly tooltip!: HTMLElement;

  #trigger: HTMLElement | null = null;
  /** How the text was given to the trigger, so it can be taken back. */
  #applied: 'label' | 'aria-label' | 'aria-description' | null = null;
  #showTimer = 0;
  #hideTimer = 0;
  #stopTracking: (() => void) | null = null;

  constructor() {
    super();
    this.addEventListener('pointerenter', () => this.#schedule(true, SHOW_DELAY));
    this.addEventListener('pointerleave', () => this.#schedule(false, HIDE_DELAY));
    this.addEventListener('focusin', () => this.#schedule(true, 0));
    this.addEventListener('focusout', () => this.#schedule(false, 0));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#schedule(false, 0);
  }

  /** Shows the tooltip now. */
  show(): void {
    this.#schedule(true, 0);
  }

  /** Hides the tooltip now. */
  hide(): void {
    this.#schedule(false, 0);
  }

  #schedule(open: boolean, delay: number): void {
    clearTimeout(this.#showTimer);
    clearTimeout(this.#hideTimer);
    const apply = (): void => {
      this.open = open && !this.disabled && Boolean(this.text);
    };
    if (delay === 0) apply();
    else if (open) this.#showTimer = window.setTimeout(apply, delay);
    else this.#hideTimer = window.setTimeout(apply, delay);
  }

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      this.open = false;
    }
  };

  // Untyped: `open` is private state, which PropertyValues<this> cannot name.
  protected override updated(changed: PropertyValues): void {
    if (changed.has('text')) this.#applyText();
    if (changed.has('disabled') && this.disabled) this.open = false;
    if (changed.has('open')) {
      if (this.open) {
        showPanel(this.tooltip);
        this.#place();
        this.#stopTracking = whileOpen(this.#trigger ?? this, this.tooltip, () => this.#place());
        document.addEventListener('keydown', this.#onKeydown);
      } else if (changed.get('open') !== undefined) {
        hidePanel(this.tooltip);
        this.#stopTracking?.();
        this.#stopTracking = null;
        document.removeEventListener('keydown', this.#onKeydown);
      }
    }
  }

  #place(): void {
    placePanel(this.#trigger ?? this, this.tooltip, {
      side: this.placement,
      gap: lengthOf(this, '--qds-component-tooltip-gap', 8),
    });
  }

  protected override firstUpdated(): void {
    // Server-rendered content is already slotted when the element hydrates, so
    // slotchange never fires for it: read the slot once, as qds-text-field does.
    void this.updateComplete.then(() => this.#readTrigger());
  }

  #onSlotChange(): void {
    this.#readTrigger();
  }

  #readTrigger(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    const element = slot?.assignedElements()[0] as HTMLElement | undefined;
    if (element === this.#trigger) return;
    this.#removeText();
    this.#trigger = element ?? null;
    this.#applyText();
  }

  /** Gives the trigger the text as its name, or as its description when it has a name. */
  #applyText(): void {
    this.#removeText();
    const trigger = this.#trigger;
    if (!trigger || !this.text) return;

    const hasVisibleText = (trigger.textContent ?? '').trim() !== '';
    if ('label' in trigger && trigger.localName.startsWith('qds-')) {
      // A QDS control names its inner native element from its `label`.
      const control = trigger as HTMLElement & { label: string | null };
      if (!control.label && !hasVisibleText) {
        control.label = this.text;
        this.#applied = 'label';
      }
      return;
    }
    if (!trigger.hasAttribute('aria-label') && !trigger.hasAttribute('aria-labelledby') && !hasVisibleText) {
      trigger.setAttribute('aria-label', this.text);
      this.#applied = 'aria-label';
    } else if (!trigger.hasAttribute('aria-description')) {
      trigger.setAttribute('aria-description', this.text);
      this.#applied = 'aria-description';
    }
  }

  #removeText(): void {
    const trigger = this.#trigger;
    if (!trigger || !this.#applied) return;
    if (this.#applied === 'label') (trigger as HTMLElement & { label: string | null }).label = null;
    else trigger.removeAttribute(this.#applied);
    this.#applied = null;
  }

  override render(): TemplateResult {
    return html`
      <slot @slotchange=${this.#onSlotChange}></slot>
      <div
        class="tooltip panel"
        part="tooltip"
        popover="manual"
        aria-hidden="true"
        @pointerenter=${() => this.#schedule(true, 0)}
        @pointerleave=${() => this.#schedule(false, HIDE_DELAY)}
      >${this.text}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-tooltip': QdsTooltip;
  }
}
