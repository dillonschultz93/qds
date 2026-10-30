import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsModalSize = 'sm' | 'md' | 'lg';

/**
 * A modal dialog.
 *
 * Built on the native `<dialog>` and `showModal()`, which is what provides the
 * hard parts: the dialog renders in the top layer above everything, the rest of
 * the page becomes inert (unreachable by Tab, click, or screen reader), focus
 * moves into the dialog on open and returns to where it was on close, and
 * Escape closes it. None of that is reimplemented here.
 *
 * Escape always closes the dialog. Clicking the backdrop does only with
 * `light-dismiss`, since a stray click should not throw away a half-filled form.
 *
 * @element qds-modal
 *
 * @slot - The body.
 * @slot heading - The title, in place of the `heading` attribute when it needs markup.
 * @slot footer - Actions, typically buttons, aligned to the inline end.
 *
 * @fires {CustomEvent<void>} qds-open - Fired after the dialog opens.
 * @fires {CustomEvent<{ returnValue: string }>} qds-close - Fired after the
 * dialog closes, however it was closed. `returnValue` is the value passed to
 * `close()`, or the `value` of the `<form method="dialog">` button that closed it.
 *
 * @csspart dialog - The native dialog element.
 * @csspart header - The row holding the heading and the close button.
 * @csspart heading - The heading.
 * @csspart close - The close button.
 * @csspart body - The wrapper around the default slot.
 *
 * @cssprop [--qds-component-modal-padding] - Inner padding.
 * @cssprop [--qds-component-modal-gap] - Space between the header, body, and footer.
 * @cssprop [--qds-component-modal-border-radius] - Corner radius.
 * @cssprop [--qds-component-modal-border-width] - Border thickness.
 * @cssprop [--qds-component-modal-box-shadow] - Shadow.
 * @cssprop [--qds-component-modal-duration] - Open animation duration.
 * @cssprop [--qds-component-modal-color-background-rest] - Fill.
 * @cssprop [--qds-component-modal-color-border-rest] - Border color.
 * @cssprop [--qds-component-modal-color-content-rest] - Text color.
 * @cssprop [--qds-component-modal-header-font-size] - Heading size.
 * @cssprop [--qds-component-modal-header-font-weight] - Heading weight.
 * @cssprop [--qds-component-modal-header-line-height] - Heading line height.
 * @cssprop [--qds-component-modal-backdrop-color-background-rest] - Backdrop color.
 * @cssprop [--qds-component-modal-backdrop-opacity] - Backdrop opacity.
 * @cssprop [--qds-component-modal-{size}-max-width] - Maximum width per size.
 */
@customElement('qds-modal')
export class QdsModal extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: contents;

        --_max-width: var(--qds-component-modal-md-max-width, 32rem);
        --_padding: var(--qds-component-modal-padding, 1.5rem);
      }

      :host([size='sm']) {
        --_max-width: var(--qds-component-modal-sm-max-width, 24rem);
      }

      :host([size='lg']) {
        --_max-width: var(--qds-component-modal-lg-max-width, 48rem);
      }

      dialog {
        width: calc(100% - 2 * var(--qds-spacing-400, 1rem));
        max-width: var(--_max-width);
        max-height: calc(100% - 2 * var(--qds-spacing-400, 1rem));
        margin: auto;
        padding: 0;

        font-family: var(--qds-typography-font-family-sans, inherit);
        color: var(--qds-component-modal-color-content-rest, #0f172a);

        background-color: var(--qds-component-modal-color-background-rest, #f8fafc);
        border: var(--qds-component-modal-border-width, 0.0625rem) solid
          var(--qds-component-modal-color-border-rest, #e2e8f0);
        border-radius: var(--qds-component-modal-border-radius, 0.5rem);
        box-shadow: var(
          --qds-component-modal-box-shadow,
          0 0.375rem 1rem 0.0625rem rgb(15 23 42 / 0.2)
        );

        /* Scrolling inside the dialog must not chain to the page behind it. */
        overscroll-behavior: contain;
      }

      dialog[open] {
        display: flex;
        flex-direction: column;
        animation: enter var(--qds-component-modal-duration, 200ms) ease-out;
      }

      /*
       * ::backdrop inherits custom properties from the dialog, so the tokens
       * reach it. The color and opacity are separate tokens, which is why the
       * opacity is applied with color-mix rather than to the whole pseudo-element.
       */
      dialog::backdrop {
        background-color: color-mix(
          in srgb,
          var(--qds-component-modal-backdrop-color-background-rest, #020617)
            calc(var(--qds-component-modal-backdrop-opacity, 0.5) * 100%),
          transparent
        );
      }

      @keyframes enter {
        from {
          opacity: 0;
          translate: 0 0.5rem;
        }
      }

      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--qds-component-modal-gap, 1rem);
        padding: var(--_padding) var(--_padding) 0;
      }

      .heading {
        margin: 0;
        font-size: var(--qds-component-modal-header-font-size, 1.25rem);
        font-weight: var(--qds-component-modal-header-font-weight, 600);
        line-height: var(--qds-component-modal-header-line-height, 1.375);
      }

      .close {
        display: inline-grid;
        place-items: center;
        flex: none;
        width: 2rem;
        height: 2rem;
        margin: -0.25rem -0.5rem 0 0;
        padding: 0;

        color: inherit;
        background: none;
        border: 0;
        border-radius: var(--qds-semantic-radius-default, 0.375rem);
        cursor: pointer;
      }

      .close:hover {
        background-color: var(--qds-semantic-color-background-subtle, #f1f5f9);
      }

      .close:focus-visible {
        outline: var(--qds-semantic-border-primary, 0.125rem) solid
          var(--qds-semantic-color-border-primary, currentColor);
        outline-offset: 0;
      }

      .close svg {
        width: 1rem;
        height: 1rem;
      }

      .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: var(--qds-component-modal-gap, 1rem) var(--_padding);
      }

      /*
       * Unwrapped, like qds-card's regions: an empty footer slot is
       * display: contents and takes no space at all.
       */
      ::slotted([slot='footer']) {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--qds-spacing-200, 0.5rem);
        padding: 0 var(--_padding) var(--_padding);
      }

      @media (prefers-reduced-motion: reduce) {
        dialog[open] {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        dialog {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** Whether the dialog is open. Setting it opens or closes the dialog. */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** The title. Also the dialog's accessible name. */
  @property()
  heading = '';

  /** Maximum width. */
  @property({ reflect: true })
  size: QdsModalSize = 'md';

  /** Closes the dialog when the backdrop is clicked, as well as on Escape. */
  @property({ type: Boolean, reflect: true, attribute: 'light-dismiss' })
  lightDismiss = false;

  /** Accessible name for the close button. */
  @property({ attribute: 'close-label' })
  closeLabel = 'Close';

  @query('dialog')
  private readonly dialog!: HTMLDialogElement;

  constructor() {
    super();
    this.addEventListener('submit', this.#handleSubmit);
  }

  /** Opens the dialog. */
  show(): void {
    this.open = true;
  }

  /** Closes the dialog, reporting `returnValue` in the `qds-close` event. */
  close(returnValue?: string): void {
    if (!this.dialog?.open) {
      this.open = false;
      return;
    }
    this.dialog.close(returnValue);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;

    if (this.open && !this.dialog.open) {
      // showModal, not show: only the modal form makes the page inert and
      // renders in the top layer.
      this.dialog.showModal();
      this.dispatchEvent(new CustomEvent('qds-open', { bubbles: true, composed: true }));
    } else if (!this.open && this.dialog.open) {
      this.dialog.close();
    }
  }

  /** The dialog closed, by Escape, a dialog form, close(), or `open = false`. */
  #handleClose(): void {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('qds-close', {
        detail: { returnValue: this.dialog.returnValue },
        bubbles: true,
        composed: true,
      }),
    );
    this.dialog.returnValue = '';
  }

  /**
   * `<form method="dialog">` closes the nearest ancestor dialog in its own tree.
   * A form slotted into this component has none — the dialog is in the shadow
   * root — so natively it would do nothing. Do what it would have done.
   */
  #handleSubmit = (event: SubmitEvent): void => {
    const form = event.target as HTMLFormElement;
    if (form.method !== 'dialog' || form.closest('qds-modal') !== this) return;
    // Read now: a qds-button submits through a temporary submitter that is gone
    // once the event has been dispatched.
    const submitter = event.submitter as HTMLButtonElement | HTMLInputElement | null;
    const returnValue = submitter?.value ?? '';
    // Decide after the event has reached every listener, as the native dialog
    // does: one on the document runs after this one, and may still cancel. No
    // preventDefault here — natively this form, with no dialog ancestor, does
    // nothing anyway.
    setTimeout(() => {
      if (!event.defaultPrevented) this.close(returnValue);
    });
  };

  /** Whether the current press started outside the dialog box. */
  #pressedOnBackdrop = false;

  /**
   * Whether a pointer event lies outside the dialog's box. The target alone
   * cannot say: the dialog is also the target for a click on its own border,
   * and for the release of a drag that started inside it.
   */
  #isOutside(event: MouseEvent): boolean {
    const box = this.dialog.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }

  #handlePointerDown(event: PointerEvent): void {
    this.#pressedOnBackdrop = event.target === this.dialog && this.#isOutside(event);
  }

  #handleClick(event: MouseEvent): void {
    // Both the press and the release must be on the backdrop: a text selection
    // dragged out of the dialog ends with a click on it too.
    const pressedOnBackdrop = this.#pressedOnBackdrop;
    this.#pressedOnBackdrop = false;
    if (
      this.lightDismiss &&
      pressedOnBackdrop &&
      event.target === this.dialog &&
      this.#isOutside(event)
    ) {
      this.dialog.close();
    }
  }

  override render(): TemplateResult {
    return html`
      <dialog
        part="dialog"
        aria-labelledby="heading"
        @close=${this.#handleClose}
        @pointerdown=${this.#handlePointerDown}
        @click=${this.#handleClick}
      >
        <div class="header" part="header">
          <h2 id="heading" class="heading" part="heading">
            <slot name="heading">${this.heading}</slot>
          </h2>
          <button
            class="close"
            part="close"
            type="button"
            aria-label=${this.closeLabel || nothing}
            @click=${() => this.dialog.close()}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
              <path d="M4 4l8 8M12 4l-8 8"></path>
            </svg>
          </button>
        </div>
        <div class="body" part="body"><slot></slot></div>
        <slot name="footer"></slot>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-modal': QdsModal;
  }
}
