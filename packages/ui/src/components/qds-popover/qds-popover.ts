import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import {
  hidePanel,
  lengthOf,
  panelStyles,
  placePanel,
  showPanel,
  whileOpen,
  type QdsAlign,
  type QdsSide,
} from '../../internal/floating.js';
import { QdsElement } from '../../internal/qds-element.js';

export type QdsPopoverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/** What can be a popover's trigger: a button, a QDS button, or anything focusable. */
const FOCUSABLE = 'button, qds-button, a[href], [tabindex]';

/**
 * A panel of content opened by a button, beside it and above the page: a short
 * form, a filter, details that do not need a whole dialog.
 *
 * ```html
 * <qds-popover label="Share">
 *   <qds-button slot="trigger" variant="secondary">Share</qds-button>
 *   <qds-text-field label="Link" value="https://quieto.dev" autofocus></qds-text-field>
 * </qds-popover>
 * ```
 *
 * It is a non-modal dialog: the rest of the page stays usable. Pressing the
 * trigger opens it and moves focus into it — to the element marked `autofocus`,
 * or else to the panel itself, so the next Tab reaches its first control.
 * Escape closes it and returns focus to the trigger; a click outside, or focus
 * moving elsewhere on the page, closes it too. The trigger is marked as opening
 * a dialog and whether it is open.
 *
 * For a list of actions, use `qds-menu`; for a label on hover, `qds-tooltip`;
 * for content that needs the rest of the page held still, `qds-modal`.
 *
 * @element qds-popover
 *
 * @slot trigger - The button that opens the popover. One element: a button, or
 * an element wrapping one, such as a `qds-tooltip` around an icon-only button.
 * @slot - The popover's content.
 *
 * @fires {CustomEvent<void>} qds-open - Fired after the popover opens.
 * @fires {CustomEvent<void>} qds-close - Fired after the popover closes.
 *
 * @csspart panel - The popover's box.
 *
 * @cssprop [--qds-component-popover-gap] - Distance from the trigger.
 * @cssprop [--qds-component-popover-padding] - Space inside the box.
 * @cssprop [--qds-component-popover-max-width] - Widest the box grows.
 * @cssprop [--qds-component-popover-border-radius] - Corner radius.
 * @cssprop [--qds-component-popover-border-width] - Border thickness.
 * @cssprop [--qds-component-popover-box-shadow] - Elevation.
 * @cssprop [--qds-component-popover-font-size] - Text size.
 * @cssprop [--qds-component-popover-line-height] - Line height.
 * @cssprop [--qds-component-popover-color-background-rest] - Fill.
 * @cssprop [--qds-component-popover-color-border-rest] - Border color.
 * @cssprop [--qds-component-popover-color-content-rest] - Text color.
 */
@customElement('qds-popover')
export class QdsPopover extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    panelStyles,
    css`
      :host {
        display: inline-block;
      }

      .panel {
        max-width: min(var(--qds-component-popover-max-width, 24rem), calc(100vw - 1rem));
        max-height: calc(100vh - 1rem);
        overflow-y: auto;
        padding: var(--qds-component-popover-padding, 1rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-popover-font-size, 0.875rem);
        line-height: var(--qds-component-popover-line-height, 1.5);
        color: var(--qds-component-popover-color-content-rest, #0f172a);

        background-color: var(--qds-component-popover-color-background-rest, #f8fafc);
        border: var(--qds-component-popover-border-width, 0.0625rem) solid
          var(--qds-component-popover-color-border-rest, #e2e8f0);
        border-radius: var(--qds-component-popover-border-radius, 0.5rem);
        box-shadow: var(--qds-component-popover-box-shadow, 0 4px 12px rgb(0 0 0 / 0.15));
      }

      /* Focus lands on the panel only as a starting point; the ring would be noise. */
      .panel:focus {
        outline: none;
      }

      @media (forced-colors: active) {
        .panel {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** Whether the popover is open. */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Where the popover appears, relative to the trigger. Flips to the other side when there is not room. */
  @property({ reflect: true })
  placement: QdsPopoverPlacement = 'bottom';

  /** The dialog's accessible name. Defaults to the trigger's text. */
  @property()
  label = '';

  @query('.panel')
  private readonly panel!: HTMLElement;

  #trigger: HTMLElement | null = null;
  #stopTracking: (() => void) | null = null;

  /** Opens the popover. */
  show(): void {
    this.open = true;
  }

  /** Closes the popover, returning focus to the trigger. */
  hide(): void {
    this.#close(true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopListening();
  }

  #close(returnFocus: boolean): void {
    if (!this.open) return;
    this.open = false;
    if (returnFocus) this.#trigger?.focus();
  }

  protected override firstUpdated(): void {
    // Server-rendered content is already slotted when the element hydrates, so
    // slotchange never fires for it: read the slot once, as qds-menu does.
    void this.updateComplete.then(() => this.#readTrigger());
    // Assigned here, not with a template listener: focus can leave from the
    // slotted content or from the panel, and both bubble to the host.
    this.addEventListener('focusout', this.#onFocusout);
  }

  #readTrigger(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="trigger"]');
    const slotted = slot?.assignedElements()[0] as HTMLElement | undefined;
    this.#trigger = slotted?.matches(FOCUSABLE)
      ? slotted
      : (slotted?.querySelector<HTMLElement>(FOCUSABLE) ?? slotted ?? null);
    this.#syncTrigger();
    this.requestUpdate();
  }

  #syncTrigger(): void {
    this.#trigger?.setAttribute('aria-haspopup', 'dialog');
    this.#trigger?.setAttribute('aria-expanded', String(this.open));
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    this.#syncTrigger();
    if (this.open) {
      showPanel(this.panel);
      this.#place();
      this.#stopTracking = whileOpen(this.#trigger ?? this, this.panel, () => this.#place());
      document.addEventListener('pointerdown', this.#onDocumentPointerdown, true);
      const autofocus = this.querySelector<HTMLElement>(':scope > :not([slot]) [autofocus], :scope > [autofocus]:not([slot])');
      (autofocus ?? this.panel).focus();
      this.dispatchEvent(new CustomEvent('qds-open', { bubbles: true, composed: true }));
    } else if (changed.get('open') !== undefined) {
      hidePanel(this.panel);
      this.#stopListening();
      this.dispatchEvent(new CustomEvent('qds-close', { bubbles: true, composed: true }));
    }
  }

  #stopListening(): void {
    this.#stopTracking?.();
    this.#stopTracking = null;
    document.removeEventListener('pointerdown', this.#onDocumentPointerdown, true);
  }

  #place(): void {
    const [side, align = 'center'] = this.placement.split('-') as [QdsSide, QdsAlign?];
    placePanel(this.#trigger ?? this, this.panel, {
      side,
      align,
      gap: lengthOf(this, '--qds-component-popover-gap', 8),
    });
  }

  /** A press outside the popover and its trigger closes it, leaving focus where the press put it. */
  #onDocumentPointerdown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) this.#close(false);
  };

  /**
   * Focus moving to something else on the page closes the popover. Focus leaving
   * the window entirely (no related target) does not: switching tabs and back
   * should find it still open.
   */
  #onFocusout = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && next !== this && !this.contains(next)) this.#close(false);
  };

  #onTriggerClick(): void {
    if (this.open) this.#close(true);
    else this.show();
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      // A popover inside another closes alone.
      event.stopPropagation();
      this.#close(true);
    }
  }

  override render(): TemplateResult {
    const label = this.label || (this.#trigger?.textContent ?? '').trim();
    return html`
      <span @click=${this.#onTriggerClick} @keydown=${this.#onKeydown}>
        <slot name="trigger" @slotchange=${this.#readTrigger}></slot>
      </span>
      <div
        class="panel"
        part="panel"
        role="dialog"
        tabindex="-1"
        popover="manual"
        aria-label=${label || 'Popover'}
        @keydown=${this.#onKeydown}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-popover': QdsPopover;
  }
}
