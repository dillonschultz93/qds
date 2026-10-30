import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsChipVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * A compact label for a status, category, or applied filter.
 *
 * A chip is not interactive on its own. With `removable` it gains a remove
 * button — the only focusable thing in it — which fires `qds-remove` and leaves
 * the decision to the page: the chip does not delete itself, because the page
 * usually needs to update its own state (a filter list, a set of tags) first.
 *
 * Meaning is never carried by color alone: the variant tints the chip, but the
 * text has to say what it means.
 *
 * @element qds-chip
 *
 * @slot - The chip text.
 * @slot start - Content before the text, typically an icon.
 *
 * @fires {CustomEvent<void>} qds-remove - Fired when the remove button is
 * activated. The chip stays in the DOM; remove it in the handler.
 *
 * @csspart base - The chip body.
 * @csspart label - The wrapper around the default slot.
 * @csspart remove - The remove button.
 *
 * @cssprop [--qds-component-chip-gap] - Space between the icon, text, and remove button.
 * @cssprop [--qds-component-chip-padding-block] - Vertical padding.
 * @cssprop [--qds-component-chip-padding-inline] - Horizontal padding.
 * @cssprop [--qds-component-chip-border-radius] - Corner radius.
 * @cssprop [--qds-component-chip-border-width] - Border thickness.
 * @cssprop [--qds-component-chip-font-size] - Text size.
 * @cssprop [--qds-component-chip-font-weight] - Text weight.
 * @cssprop [--qds-component-chip-line-height] - Text line height.
 * @cssprop [--qds-component-chip-{variant}-color-background-rest] - Fill per variant.
 * @cssprop [--qds-component-chip-{variant}-color-content-rest] - Text color per variant.
 * @cssprop [--qds-component-chip-{variant}-color-border-rest] - Border color per variant.
 */
@customElement('qds-chip')
export class QdsChip extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;

        --_bg: var(--qds-component-chip-neutral-color-background-rest, #f1f5f9);
        --_fg: var(--qds-component-chip-neutral-color-content-rest, #0f172a);
        --_border: var(--qds-component-chip-neutral-color-border-rest, #cbd5e1);
      }

      :host([variant='info']) {
        --_bg: var(--qds-component-chip-info-color-background-rest, #dbeafe);
        --_fg: var(--qds-component-chip-info-color-content-rest, #1d4ed8);
        --_border: var(--qds-component-chip-info-color-border-rest, transparent);
      }

      :host([variant='success']) {
        --_bg: var(--qds-component-chip-success-color-background-rest, #dcfce7);
        --_fg: var(--qds-component-chip-success-color-content-rest, #15803d);
        --_border: var(--qds-component-chip-success-color-border-rest, transparent);
      }

      :host([variant='warning']) {
        --_bg: var(--qds-component-chip-warning-color-background-rest, #fef9c3);
        --_fg: var(--qds-component-chip-warning-color-content-rest, #854d0e);
        --_border: var(--qds-component-chip-warning-color-border-rest, transparent);
      }

      :host([variant='danger']) {
        --_bg: var(--qds-component-chip-danger-color-background-rest, #f8fafc);
        --_fg: var(--qds-component-chip-danger-color-content-rest, #b91c1c);
        --_border: var(--qds-component-chip-danger-color-border-rest, #dc2626);
      }

      .base {
        display: inline-flex;
        align-items: center;
        gap: var(--qds-component-chip-gap, 0.25rem);
        padding: var(--qds-component-chip-padding-block, 0.25rem)
          var(--qds-component-chip-padding-inline, 0.75rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-chip-font-size, 0.75rem);
        font-weight: var(--qds-component-chip-font-weight, 500);
        line-height: var(--qds-component-chip-line-height, 1.375);
        white-space: nowrap;

        color: var(--_fg);
        background-color: var(--_bg);
        border: var(--qds-component-chip-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-chip-border-radius, 9999px);
      }

      /* Pull the remove button toward the edge so the padding looks even. */
      :host([removable]) .base {
        padding-inline-end: var(--qds-component-chip-padding-block, 0.25rem);
      }

      .remove {
        display: inline-grid;
        place-items: center;
        width: 1.25em;
        height: 1.25em;
        margin: 0;
        padding: 0;

        font: inherit;
        line-height: 1;
        color: inherit;
        background: none;
        border: 0;
        border-radius: 50%;
        cursor: pointer;
      }

      /*
       * Tinted from the text color, so the hover state works on every variant
       * without a token per variant.
       */
      .remove:hover {
        background-color: color-mix(in srgb, currentColor 15%, transparent);
      }

      .remove:focus-visible {
        outline: var(--qds-semantic-border-primary, 0.125rem) solid
          var(--qds-semantic-color-border-primary, currentColor);
        outline-offset: 0.0625rem;
      }

      .remove svg {
        width: 0.75em;
        height: 0.75em;
      }

      @media (forced-colors: active) {
        .base {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** Tone. Pair it with text that states the meaning; color alone does not. */
  @property({ reflect: true })
  variant: QdsChipVariant = 'neutral';

  /** Adds a remove button that fires `qds-remove`. */
  @property({ type: Boolean, reflect: true })
  removable = false;

  /**
   * Accessible name for the remove button. Defaults to "Remove" followed by the
   * chip's text, so a list of chips does not read as a list of identical
   * "Remove" buttons. Set it when the chip text alone would not make sense after
   * "Remove", or to translate it.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = '';

  #handleRemove(): void {
    this.dispatchEvent(new CustomEvent('qds-remove', { bubbles: true, composed: true }));
  }

  override render(): TemplateResult {
    return html`
      <span class="base" part="base">
        <slot name="start"></slot>
        <span id="label" part="label"><slot></slot></span>
        ${this.removable
          ? html`<button
              class="remove"
              part="remove"
              type="button"
              aria-label=${this.removeLabel || nothing}
              aria-labelledby=${this.removeLabel ? nothing : 'remove-text label'}
              @click=${this.#handleRemove}
            >
              <!--
                Named by reference rather than by reading textContent: the
                server has no light DOM to read, and a hydrating render does not
                correct an attribute that differs from the server's.
              -->
              <span id="remove-text" hidden>Remove</span>
              <svg viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
                <path d="M3 3l6 6M9 3l-6 6"></path>
              </svg>
            </button>`
          : nothing}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-chip': QdsChip;
  }
}
