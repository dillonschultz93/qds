import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { announce } from '../../internal/announcer.js';
import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

export type QdsAlertVariant = 'info' | 'success' | 'warning' | 'error';

const ICONS: Record<QdsAlertVariant, string> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-alert',
};

/**
 * An inline message: information, a success, a warning, or an error, such as a
 * form-level error above the fields or a "saved" notice.
 *
 * An alert that appears after the page has loaded — inserted, or shown by
 * removing `hidden` — is read aloud by screen readers through the shared
 * announcer: errors and warnings at once, interrupting, and the others when the
 * reader pauses. One already on the page when it loads is not announced, since
 * it is part of the page rather than news; a reader finds it by reading the
 * page. Call `announce()` to read one out again.
 *
 * The variant's icon is decorative: the heading and message carry the meaning,
 * so an alert is never told apart by color or icon alone.
 *
 * @element qds-alert
 *
 * @slot - The message.
 * @slot heading - The heading, in place of the `heading` attribute when it needs markup.
 * @slot icon - An icon in place of the variant's own.
 * @slot actions - Buttons or links below the message.
 *
 * @fires {CustomEvent<void>} qds-dismiss - Fired when the dismiss button is
 * pressed. The alert hides itself afterwards; call `preventDefault()` to keep it.
 *
 * @csspart base - The alert's box.
 * @csspart icon - The wrapper around the icon.
 * @csspart heading - The heading.
 * @csspart message - The wrapper around the message.
 * @csspart dismiss - The dismiss button.
 *
 * @cssprop [--qds-component-alert-gap] - Space between the icon, text, and dismiss button.
 * @cssprop [--qds-component-alert-padding] - Inner padding.
 * @cssprop [--qds-component-alert-border-radius] - Corner radius.
 * @cssprop [--qds-component-alert-border-width] - Border thickness.
 * @cssprop [--qds-component-alert-font-size] - Text size.
 * @cssprop [--qds-component-alert-line-height] - Text line height.
 * @cssprop [--qds-component-alert-color-content-rest] - Message color.
 * @cssprop [--qds-component-alert-heading-font-weight] - Heading weight.
 * @cssprop [--qds-component-alert-{variant}-color-background-rest] - Fill per variant: `info`, `success`, `warning`, `error`.
 * @cssprop [--qds-component-alert-{variant}-color-border-rest] - Border per variant.
 * @cssprop [--qds-component-alert-{variant}-color-content-rest] - Icon and heading color per variant.
 */
@customElement('qds-alert')
export class QdsAlert extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    QdsElement.focusRingStyles,
    css`
      :host {
        --_background: var(--qds-component-alert-info-color-background-rest, #dbeafe);
        --_border: var(--qds-component-alert-info-color-border-rest, #2563eb);
        --_accent: var(--qds-component-alert-info-color-content-rest, #1d4ed8);

        display: block;
      }

      :host([variant='success']) {
        --_background: var(--qds-component-alert-success-color-background-rest, #dcfce7);
        --_border: var(--qds-component-alert-success-color-border-rest, #16a34a);
        --_accent: var(--qds-component-alert-success-color-content-rest, #15803d);
      }

      :host([variant='warning']) {
        --_background: var(--qds-component-alert-warning-color-background-rest, #fef9c3);
        --_border: var(--qds-component-alert-warning-color-border-rest, #ca8a04);
        --_accent: var(--qds-component-alert-warning-color-content-rest, #854d0e);
      }

      :host([variant='error']) {
        --_background: var(--qds-component-alert-error-color-background-rest, #fee2e2);
        --_border: var(--qds-component-alert-error-color-border-rest, #dc2626);
        --_accent: var(--qds-component-alert-error-color-content-rest, #b91c1c);
      }

      .base {
        display: flex;
        align-items: flex-start;
        gap: var(--qds-component-alert-gap, 0.75rem);
        padding: var(--qds-component-alert-padding, 1rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-alert-font-size, 0.875rem);
        line-height: var(--qds-component-alert-line-height, 1.5);
        color: var(--qds-component-alert-color-content-rest, #0f172a);

        background-color: var(--_background);
        border: var(--qds-component-alert-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-alert-border-radius, 0.375rem);
      }

      .icon {
        display: inline-flex;
        flex: none;
        /* Center a body-sized icon on the first line of text. */
        height: 1lh;
        align-items: center;
        color: var(--_accent);
      }

      .text {
        flex: 1;
        min-width: 0;
      }

      .heading {
        margin: 0;
        font-weight: var(--qds-component-alert-heading-font-weight, 600);
        color: var(--_accent);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--qds-component-alert-gap, 0.75rem);
        margin-block-start: var(--qds-component-alert-gap, 0.75rem);
      }

      .dismiss {
        display: inline-grid;
        place-items: center;
        flex: none;
        /* As tall as a line of text, so it sits level with the first line. */
        width: 1lh;
        height: 1lh;
        padding: 0;
        color: inherit;
        background: none;
        border: 0;
        border-radius: var(--qds-component-alert-border-radius, 0.375rem);
        cursor: pointer;
      }

      @media (forced-colors: active) {
        .base {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** What kind of message: sets the color and icon. */
  @property({ reflect: true })
  variant: QdsAlertVariant = 'info';

  /** A short heading above the message. */
  @property()
  heading = '';

  /** Shows a button that hides the alert. */
  @property({ type: Boolean, reflect: true })
  dismissible = false;

  /** The dismiss button's accessible name. */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Dismiss';

  /**
   * Declared so that removing it is seen: an alert shown by removing `hidden`
   * is announced, as an inserted one is.
   */
  @property({ type: Boolean, reflect: true })
  override hidden = false;

  /** Whether markup is slotted into `heading` and `actions`, which show only when used. */
  @state()
  private hasHeadingSlot = false;

  @state()
  private hasActions = false;

  override connectedCallback(): void {
    super.connectedCallback();
    // Inserted after the page loaded: news, so read it out. Waits a frame, so
    // the message slotted into it is in place first.
    if (document.readyState === 'complete' && !this.hidden) {
      requestAnimationFrame(() => this.announce());
    }
  }

  protected override firstUpdated(): void {
    // A separate, later update, as in qds-text-field: server-rendered content is
    // already slotted when the element hydrates, so slotchange never fires for
    // it, and the first client update adopts the server's DOM unchanged.
    void this.updateComplete.then(() => this.#readSlots());
  }

  #readSlots(): void {
    this.hasHeadingSlot = this.querySelector(':scope > [slot="heading"]') !== null;
    this.hasActions = this.querySelector(':scope > [slot="actions"]') !== null;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.get('hidden') === true && !this.hidden) this.announce();
  }

  /** Reads the alert's heading and message aloud. */
  announce(): void {
    if (!this.isConnected || this.hidden) return;
    const heading = this.querySelector(':scope > [slot="heading"]')?.textContent ?? this.heading;
    const message = [...this.childNodes]
      .filter((node) => !(node instanceof Element && node.hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join(' ');
    announce(`${heading} ${message}`, this.variant === 'error' || this.variant === 'warning' ? 'assertive' : 'polite');
  }

  #dismiss(): void {
    const proceed = this.dispatchEvent(
      new CustomEvent('qds-dismiss', { bubbles: true, composed: true, cancelable: true }),
    );
    if (proceed) this.hidden = true;
  }

  override render(): TemplateResult {
    return html`
      <div class="base" part="base">
        <span class="icon" part="icon">
          <slot name="icon"><qds-icon name=${ICONS[this.variant] ?? 'info'}></qds-icon></slot>
        </span>
        <div class="text">
          <p class="heading" part="heading" ?hidden=${!this.heading && !this.hasHeadingSlot}>
            <slot name="heading" @slotchange=${this.#readSlots}>${this.heading}</slot>
          </p>
          <div part="message"><slot></slot></div>
          <div class="actions" ?hidden=${!this.hasActions}>
            <slot name="actions" @slotchange=${this.#readSlots}></slot>
          </div>
        </div>
        ${this.dismissible
          ? html`<button
              class="dismiss focus-ring"
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${this.#dismiss}
            >
              <qds-icon name="x" size="sm"></qds-icon>
            </button>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-alert': QdsAlert;
  }
}
