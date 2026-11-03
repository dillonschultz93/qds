import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { announce } from '../../internal/announcer.js';
import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

export type QdsToastVariant = 'info' | 'success' | 'warning' | 'error';

const ICONS: Record<QdsToastVariant, string> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-alert',
};

/** How long a toast stays, by default, before it hides itself. */
const DEFAULT_DURATION = 5000;

/**
 * The stack every toast shows in: one, at the end of the body, in the corner of
 * the viewport. Created when the first toast shows.
 *
 * It is a manual popover, so it sits in the browser's top layer above anything
 * the page stacks, and it is shown again each time a toast joins it, which
 * lifts it above anything that reached the top layer since — a menu or a modal
 * opened after the last toast.
 */
let stack: HTMLElement | null = null;

function stackElement(): HTMLElement {
  if (stack?.isConnected) return stack;
  stack = document.createElement('div');
  stack.dataset.qdsToastStack = '';
  stack.setAttribute('popover', 'manual');
  Object.assign(stack.style, {
    position: 'fixed',
    inset: 'auto var(--qds-component-toast-margin, 1rem) var(--qds-component-toast-margin, 1rem) auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 'var(--qds-component-toast-gap, 0.75rem)',
    width: 'max-content',
    maxWidth: 'calc(100vw - 2 * var(--qds-component-toast-margin, 1rem))',
    margin: '0',
    padding: '0',
    overflow: 'visible',
    background: 'none',
    border: '0',
    // The stack spans the gaps between toasts; only the toasts take the pointer.
    pointerEvents: 'none',
  });
  document.body.append(stack);
  return stack;
}

function raiseStack(): void {
  const element = stackElement();
  if (!('showPopover' in element)) return;
  if (element.matches(':popover-open')) element.hidePopover();
  element.showPopover();
}

/**
 * A short, temporary message about something that just happened — "Saved",
 * "Link copied" — shown in the corner of the screen without taking focus.
 *
 * Show one from code with `toast()`:
 *
 * ```js
 * import { toast } from '@quieto/ui';
 *
 * toast('Changes saved.', { variant: 'success' });
 * ```
 *
 * or place a `qds-toast` in the page and call `show()`, for a toast with
 * markup, such as an Undo button. Either way it joins the stack in the corner
 * and is read out by screen readers through the shared announcer: errors and
 * warnings at once, the others when the reader pauses.
 *
 * A toast hides itself after `duration` milliseconds, but never while the
 * pointer is over it or focus is in it, so it cannot disappear mid-read or
 * under a hand reaching for its button; the time left resumes after. A
 * `duration` of 0 keeps it until it is dismissed, which a toast with an action
 * should do. Anything a reader must not miss belongs in the page, as a
 * `qds-alert`, not only in a toast.
 *
 * @element qds-toast
 *
 * @slot - The message.
 * @slot heading - The heading, in place of the `heading` attribute when it needs markup.
 * @slot actions - A button, such as Undo.
 *
 * @fires {CustomEvent<void>} qds-show - Fired when the toast shows.
 * @fires {CustomEvent<void>} qds-hide - Fired when it hides, by its timer or by being dismissed.
 *
 * @csspart base - The toast's box.
 * @csspart icon - The wrapper around the icon.
 * @csspart heading - The heading.
 * @csspart message - The wrapper around the message.
 * @csspart dismiss - The dismiss button.
 *
 * @cssprop [--qds-component-toast-gap] - Space between the icon and text, and between toasts.
 * @cssprop [--qds-component-toast-padding] - Inner padding.
 * @cssprop [--qds-component-toast-margin] - Distance of the stack from the viewport's edge.
 * @cssprop [--qds-component-toast-max-width] - Widest a toast grows.
 * @cssprop [--qds-component-toast-border-radius] - Corner radius.
 * @cssprop [--qds-component-toast-border-width] - Border thickness.
 * @cssprop [--qds-component-toast-box-shadow] - Elevation.
 * @cssprop [--qds-component-toast-font-size] - Text size.
 * @cssprop [--qds-component-toast-line-height] - Text line height.
 * @cssprop [--qds-component-toast-duration] - Entrance animation duration.
 * @cssprop [--qds-component-toast-color-background-rest] - Fill.
 * @cssprop [--qds-component-toast-color-border-rest] - Border color.
 * @cssprop [--qds-component-toast-color-content-rest] - Text color.
 * @cssprop [--qds-component-toast-heading-font-weight] - Heading weight.
 * @cssprop [--qds-component-toast-{variant}-color-content-rest] - Icon color per variant: `info`, `success`, `warning`, `error`.
 */
@customElement('qds-toast')
export class QdsToast extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    QdsElement.focusRingStyles,
    css`
      :host {
        --_accent: var(--qds-component-toast-info-color-content-rest, #1d4ed8);

        display: block;
        pointer-events: auto;
      }

      :host(:not([open])) {
        display: none;
      }

      :host([variant='success']) {
        --_accent: var(--qds-component-toast-success-color-content-rest, #15803d);
      }

      :host([variant='warning']) {
        --_accent: var(--qds-component-toast-warning-color-content-rest, #854d0e);
      }

      :host([variant='error']) {
        --_accent: var(--qds-component-toast-error-color-content-rest, #b91c1c);
      }

      .base {
        display: flex;
        align-items: flex-start;
        gap: var(--qds-component-toast-gap, 0.75rem);
        width: max-content;
        max-width: min(var(--qds-component-toast-max-width, 24rem), 100%);
        padding: var(--qds-component-toast-padding, 1rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-toast-font-size, 0.875rem);
        line-height: var(--qds-component-toast-line-height, 1.5);
        color: var(--qds-component-toast-color-content-rest, #0f172a);

        background-color: var(--qds-component-toast-color-background-rest, #f8fafc);
        border: var(--qds-component-toast-border-width, 0.0625rem) solid
          var(--qds-component-toast-color-border-rest, #e2e8f0);
        border-radius: var(--qds-component-toast-border-radius, 0.375rem);
        box-shadow: var(--qds-component-toast-box-shadow, 0 4px 12px rgb(0 0 0 / 0.15));

        animation: enter var(--qds-component-toast-duration, 200ms) ease-out;
      }

      @keyframes enter {
        from {
          opacity: 0;
          transform: translateY(0.5rem);
        }
      }

      .icon {
        display: inline-flex;
        flex: none;
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
        font-weight: var(--qds-component-toast-heading-font-weight, 600);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--qds-component-toast-gap, 0.75rem);
        margin-block-start: var(--qds-component-toast-gap, 0.75rem);
      }

      .dismiss {
        display: inline-grid;
        place-items: center;
        flex: none;
        width: 1lh;
        height: 1lh;
        padding: 0;
        color: inherit;
        background: none;
        border: 0;
        border-radius: var(--qds-component-toast-border-radius, 0.375rem);
        cursor: pointer;
      }

      @media (prefers-reduced-motion: reduce) {
        .base {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        .base {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** What kind of message: sets the icon and its color. */
  @property({ reflect: true })
  variant: QdsToastVariant = 'info';

  /** A short heading above the message. */
  @property()
  heading = '';

  /** Milliseconds before the toast hides itself. 0 keeps it until it is dismissed. */
  @property({ type: Number })
  duration = DEFAULT_DURATION;

  /** Shows a button that hides the toast. On by default, so a toast can always be put away. */
  @property({ type: Boolean, reflect: true })
  dismissible = true;

  /** The dismiss button's accessible name. */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Dismiss';

  /** Whether the toast is showing. Use `show()` and `hide()` rather than setting it. */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Removes the element when it hides, for toasts made by `toast()`. */
  removeOnHide = false;

  /** Whether markup is slotted into `heading` and `actions`, which show only when used. */
  @state()
  private hasHeadingSlot = false;

  @state()
  private hasActions = false;

  #timer = 0;
  /** Time left on the timer, kept while it is paused. */
  #remaining = 0;
  #startedAt = 0;
  #paused = false;

  constructor() {
    super();
    this.addEventListener('pointerenter', () => this.#pause());
    this.addEventListener('pointerleave', () => this.#resume());
    this.addEventListener('focusin', () => this.#pause());
    this.addEventListener('focusout', (event) => {
      if (!this.contains(event.relatedTarget as Node)) this.#resume();
    });
  }

  protected override firstUpdated(): void {
    // As in qds-alert: slotchange never fires for server-rendered content.
    void this.updateComplete.then(() => this.#readSlots());
  }

  #readSlots(): void {
    this.hasHeadingSlot = this.querySelector(':scope > [slot="heading"]') !== null;
    this.hasActions = this.querySelector(':scope > [slot="actions"]') !== null;
  }

  /** Shows the toast in the stack, reads it out, and starts its timer. */
  show(): void {
    const target = stackElement();
    if (this.parentElement !== target) target.append(this);
    raiseStack();
    this.open = true;
  }

  /** Hides the toast now. */
  hide(): void {
    this.open = false;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('open')) {
      if (this.open) {
        this.#announce();
        this.#start(this.duration);
        this.dispatchEvent(new CustomEvent('qds-show', { bubbles: true, composed: true }));
      } else if (changed.get('open') === true) {
        clearTimeout(this.#timer);
        this.dispatchEvent(new CustomEvent('qds-hide', { bubbles: true, composed: true }));
        if (this.removeOnHide) this.remove();
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
  }

  #start(duration: number): void {
    clearTimeout(this.#timer);
    if (duration <= 0) return;
    this.#remaining = duration;
    this.#startedAt = Date.now();
    if (!this.#paused) this.#timer = window.setTimeout(() => this.hide(), duration);
  }

  #pause(): void {
    if (this.#paused) return;
    this.#paused = true;
    if (!this.open || this.duration <= 0) return;
    clearTimeout(this.#timer);
    this.#remaining -= Date.now() - this.#startedAt;
  }

  #resume(): void {
    if (!this.#paused) return;
    this.#paused = false;
    if (this.open && this.duration > 0) this.#start(Math.max(this.#remaining, 1000));
  }

  #announce(): void {
    const heading = this.querySelector(':scope > [slot="heading"]')?.textContent ?? this.heading;
    const message = [...this.childNodes]
      .filter((node) => !(node instanceof Element && node.hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join(' ');
    announce(`${heading} ${message}`, this.variant === 'error' || this.variant === 'warning' ? 'assertive' : 'polite');
  }

  override render(): TemplateResult {
    return html`
      <div class="base" part="base">
        <span class="icon" part="icon"><qds-icon name=${ICONS[this.variant] ?? 'info'}></qds-icon></span>
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
          ? html`<button class="dismiss focus-ring" part="dismiss" type="button" aria-label=${this.dismissLabel} @click=${this.hide}>
              <qds-icon name="x" size="sm"></qds-icon>
            </button>`
          : nothing}
      </div>
    `;
  }
}

/** Options for `toast()`: any of the element's properties. */
export interface QdsToastOptions {
  variant?: QdsToastVariant;
  heading?: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Shows a toast with `message` and returns its element, which removes itself
 * once it hides.
 *
 * ```js
 * toast('Link copied.');
 * toast('Could not save. Check your connection.', { variant: 'error', duration: 0 });
 * ```
 */
export function toast(message: string, options: QdsToastOptions = {}): QdsToast {
  const element = document.createElement('qds-toast');
  Object.assign(element, options);
  element.textContent = message;
  element.removeOnHide = true;
  element.show();
  return element;
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-toast': QdsToast;
  }
}
