import { css, html, isServer, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsAccordionItemHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * One collapsible section of a `qds-accordion`.
 *
 * Follows the ARIA accordion pattern: a heading wrapping a button that reports
 * `aria-expanded`, and a panel labelled by that button. The heading level is
 * configurable because it has to fit the outline of the page around it — an
 * accordion under an h2 needs h3 headings, not whatever the component assumed.
 *
 * A closed panel is `hidden="until-found"` rather than plainly hidden, so the
 * browser's find-in-page can search collapsed content and opens the item when
 * it finds a match. Where that is not supported it behaves as `hidden`.
 *
 * Works on its own as a single disclosure, too.
 *
 * @element qds-accordion-item
 *
 * @slot - The panel content.
 * @slot heading - The heading text, in place of the `heading` attribute when it needs markup.
 *
 * @fires {CustomEvent<void>} qds-open - Fired when the user opens the item.
 * @fires {CustomEvent<void>} qds-close - Fired when the user closes the item.
 *
 * @csspart heading - The element carrying the heading role.
 * @csspart trigger - The button that opens and closes the panel.
 * @csspart icon - The chevron.
 * @csspart panel - The collapsible region.
 *
 * @cssprop [--qds-component-accordion-border-width] - Divider thickness.
 * @cssprop [--qds-component-accordion-duration] - Chevron rotation duration.
 * @cssprop [--qds-component-accordion-color-border-rest] - Divider color.
 * @cssprop [--qds-component-accordion-trigger-gap] - Space between the heading text and the chevron.
 * @cssprop [--qds-component-accordion-trigger-padding-block] - Trigger vertical padding.
 * @cssprop [--qds-component-accordion-trigger-padding-inline] - Trigger horizontal padding.
 * @cssprop [--qds-component-accordion-trigger-font-size] - Heading size.
 * @cssprop [--qds-component-accordion-trigger-font-weight] - Heading weight.
 * @cssprop [--qds-component-accordion-trigger-line-height] - Heading line height.
 * @cssprop [--qds-component-accordion-trigger-color-content-{state}] - Heading color: `rest`, `disabled`.
 * @cssprop [--qds-component-accordion-trigger-color-background-hover] - Trigger fill under the pointer.
 * @cssprop [--qds-component-accordion-panel-padding-block] - Panel vertical padding.
 * @cssprop [--qds-component-accordion-panel-padding-inline] - Panel horizontal padding.
 * @cssprop [--qds-component-accordion-panel-font-size] - Panel text size.
 * @cssprop [--qds-component-accordion-panel-line-height] - Panel line height.
 * @cssprop [--qds-component-accordion-panel-color-content-rest] - Panel text color.
 */
@customElement('qds-accordion-item')
export class QdsAccordionItem extends QdsElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...QdsElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
        font-family: var(--qds-typography-font-family-sans, inherit);
        border-block-end: var(--qds-component-accordion-border-width, 0.0625rem) solid
          var(--qds-component-accordion-color-border-rest, #e2e8f0);
      }

      .heading {
        margin: 0;
      }

      button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--qds-component-accordion-trigger-gap, 0.75rem);
        width: 100%;
        margin: 0;
        padding: var(--qds-component-accordion-trigger-padding-block, 0.75rem)
          var(--qds-component-accordion-trigger-padding-inline, 0.5rem);

        font: inherit;
        font-size: var(--qds-component-accordion-trigger-font-size, 1rem);
        font-weight: var(--qds-component-accordion-trigger-font-weight, 500);
        line-height: var(--qds-component-accordion-trigger-line-height, 1.375);
        text-align: start;
        color: var(--qds-component-accordion-trigger-color-content-rest, #0f172a);

        background: none;
        border: 0;
        cursor: pointer;
      }

      button:where(:hover) {
        background-color: var(--qds-component-accordion-trigger-color-background-hover, #f1f5f9);
      }

      button:focus-visible {
        outline: var(--_focus-ring);
        outline-offset: -0.125rem;
      }

      button:disabled {
        color: var(--qds-component-accordion-trigger-color-content-disabled, #64748b);
        background: none;
        cursor: not-allowed;
      }

      .icon {
        flex: none;
        width: 1em;
        height: 1em;
        transition: rotate var(--qds-component-accordion-duration, 120ms);
      }

      :host([open]) .icon {
        rotate: 180deg;
      }

      .panel {
        padding: 0 var(--qds-component-accordion-panel-padding-inline, 0.5rem)
          var(--qds-component-accordion-panel-padding-block, 0.75rem);
        font-size: var(--qds-component-accordion-panel-font-size, 0.875rem);
        line-height: var(--qds-component-accordion-panel-line-height, 1.5);
        color: var(--qds-component-accordion-panel-color-content-rest, #0f172a);
      }

      /*
       * until-found panels are hidden with content-visibility rather than
       * display:none, so they keep their padding box unless it is removed.
       */
      .panel[hidden] {
        padding: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .icon {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        button:disabled {
          color: GrayText;
        }
      }
    `,
  ];

  /** Whether the panel is shown. */
  @property({ type: Boolean, reflect: true })
  get open(): boolean {
    return this.#open;
  }

  set open(open: boolean) {
    const old = this.#open;
    this.#open = open;
    this.requestUpdate('open', old);
    // Announced from the setter, synchronously, so that qds-accordion can enforce
    // exclusive however the item opened — a click or code — and in the order
    // items were opened: when two open in one tick, the last one wins.
    // Not before the first render: the open state in markup is reconciled by the
    // accordion itself, keeping the first, as native exclusive <details> does.
    // qds-open is the public event, and only fires for the user.
    if (open && !old && this.hasUpdated && !isServer) {
      this.dispatchEvent(new Event('qds-accordion-item-opened', { bubbles: true }));
    }
  }

  #open = false;

  /** Prevents opening or closing, and takes the heading out of the tab order. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** The heading text. */
  @property()
  heading = '';

  /** The heading level, to fit the page outline. */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel: QdsAccordionItemHeadingLevel = 3;

  #setOpen(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    this.dispatchEvent(
      new CustomEvent(open ? 'qds-open' : 'qds-close', { bubbles: true, composed: true }),
    );
  }

  /**
   * Find-in-page matched text in the collapsed panel. The browser has already
   * revealed it; mirror that into `open` so the item's state and aria-expanded
   * agree. Listened for on the panel itself: beforematch is not composed, so it
   * never reaches the host.
   */
  #handleBeforeMatch(): void {
    this.#setOpen(true);
  }

  #handleClick(): void {
    if (this.disabled) return;
    this.#setOpen(!this.open);
  }

  override render(): TemplateResult {
    return html`
      <div class="heading" part="heading" role="heading" aria-level=${this.headingLevel}>
        <button
          id="trigger"
          part="trigger"
          type="button"
          aria-expanded=${String(this.open)}
          aria-controls="panel"
          ?disabled=${this.disabled}
          @click=${this.#handleClick}
        >
          <slot name="heading">${this.heading}</slot>
          <svg class="icon" part="icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 6 8 10 12 6"></polyline>
          </svg>
        </button>
      </div>
      <div
        id="panel"
        class="panel"
        part="panel"
        role="region"
        aria-labelledby="trigger"
        hidden=${this.open ? nothing : 'until-found'}
        @beforematch=${this.#handleBeforeMatch}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-accordion-item': QdsAccordionItem;
  }
}
