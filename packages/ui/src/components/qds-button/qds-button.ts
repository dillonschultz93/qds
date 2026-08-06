import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type QdsButtonSize = 'sm' | 'md' | 'lg';
export type QdsButtonType = 'button' | 'submit' | 'reset';

/**
 * A button.
 *
 * Every visual property resolves through the component tier of the token system,
 * so `--qds-component-button-*` is simultaneously the token API and the styling
 * API — overriding one of those variables is the supported way to restyle a
 * button, and it is the same variable the design tokens define.
 *
 * @element qds-button
 *
 * @slot - The button label.
 * @slot start - Content before the label, typically an icon.
 * @slot end - Content after the label, typically an icon.
 *
 * @fires {CustomEvent<void>} qds-click - Fired on activation. Not fired when
 * disabled or loading. Prefer this over listening for `click`, which a disabled
 * host can still receive.
 *
 * @csspart button - The native button element.
 * @csspart label - The wrapper around the default slot.
 *
 * @cssprop [--qds-component-button-border-radius] - Corner radius.
 * @cssprop [--qds-component-button-border-width] - Border thickness.
 * @cssprop [--qds-component-button-font-weight] - Label weight.
 * @cssprop [--qds-component-button-duration] - State transition duration.
 * @cssprop [--qds-component-button-{variant}-color-background-{state}] - Background per variant and state.
 * @cssprop [--qds-component-button-{variant}-color-content-{state}] - Label color per variant and state.
 * @cssprop [--qds-component-button-{variant}-color-border-{state}] - Border color per variant and state.
 * @cssprop [--qds-component-button-{size}-padding-block] - Vertical padding per size.
 * @cssprop [--qds-component-button-{size}-padding-inline] - Horizontal padding per size.
 */
@customElement('qds-button')
export class QdsButton extends QdsElement {
  /**
   * `delegatesFocus` makes the host focusable by forwarding focus to the inner
   * button, so `qds-button.focus()` and tab order behave like a native button
   * without the host needing its own tabindex.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...QdsElement.shadowRootOptions,
    delegatesFocus: true,
  };

  /**
   * Form association is what lets a button inside shadow DOM submit the form
   * around it. `attachInternals().form` finds the containing form across the
   * shadow boundary, which `HTMLFormElement`'s own logic cannot do — a plain
   * shadow-DOM button silently fails to submit.
   */
  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    css`
      /*
       * Variant and size resolve to private custom properties here, because CSS
       * cannot interpolate an attribute value into a variable name — there is no
       * way to write var(--qds-component-button-{variant}-…). Each variant block
       * remaps the same eight private properties, and the button rules below are
       * written once against those.
       *
       * Fallbacks are second values inside var(), so the component still renders
       * sensibly if a consumer forgets to load @quieto/design-tokens/css.
       */
      :host {
        display: inline-block;

        --_bg: var(--qds-component-button-primary-color-background-rest, #2563eb);
        --_bg-hover: var(--qds-component-button-primary-color-background-hover, #1d4ed8);
        --_bg-active: var(--qds-component-button-primary-color-background-active, #1e40af);
        --_bg-disabled: var(--qds-component-button-primary-color-background-disabled, #e2e8f0);
        --_fg: var(--qds-component-button-primary-color-content-rest, #f8fafc);
        --_fg-disabled: var(--qds-component-button-primary-color-content-disabled, #64748b);
        --_border: var(--qds-component-button-primary-color-border-rest, transparent);
        --_border-disabled: var(--qds-component-button-primary-color-border-disabled, transparent);

        --_padding-block: var(--qds-component-button-md-padding-block, 0.5rem);
        --_padding-inline: var(--qds-component-button-md-padding-inline, 1rem);
        --_gap: var(--qds-component-button-md-gap, 0.5rem);
        --_font-size: var(--qds-component-button-md-font-size, 0.875rem);
      }

      :host([variant='secondary']) {
        --_bg: var(--qds-component-button-secondary-color-background-rest, #f1f5f9);
        --_bg-hover: var(--qds-component-button-secondary-color-background-hover, #e2e8f0);
        --_bg-active: var(--qds-component-button-secondary-color-background-active, #cbd5e1);
        --_bg-disabled: var(--qds-component-button-secondary-color-background-disabled, #f1f5f9);
        --_fg: var(--qds-component-button-secondary-color-content-rest, #0f172a);
        --_fg-disabled: var(--qds-component-button-secondary-color-content-disabled, #64748b);
        --_border: var(--qds-component-button-secondary-color-border-rest, #cbd5e1);
        --_border-disabled: var(--qds-component-button-secondary-color-border-disabled, #e2e8f0);
      }

      :host([variant='ghost']) {
        --_bg: var(--qds-component-button-ghost-color-background-rest, transparent);
        --_bg-hover: var(--qds-component-button-ghost-color-background-hover, #e2e8f0);
        --_bg-active: var(--qds-component-button-ghost-color-background-active, #cbd5e1);
        --_bg-disabled: var(--qds-component-button-ghost-color-background-disabled, transparent);
        --_fg: var(--qds-component-button-ghost-color-content-rest, #1d4ed8);
        --_fg-disabled: var(--qds-component-button-ghost-color-content-disabled, #94a3b8);
        --_border: var(--qds-component-button-ghost-color-border-rest, transparent);
        --_border-disabled: var(--qds-component-button-ghost-color-border-disabled, transparent);
      }

      :host([variant='danger']) {
        --_bg: var(--qds-component-button-danger-color-background-rest, #dc2626);
        --_bg-hover: var(--qds-component-button-danger-color-background-hover, #b91c1c);
        --_bg-active: var(--qds-component-button-danger-color-background-active, #991b1b);
        --_bg-disabled: var(--qds-component-button-danger-color-background-disabled, #e2e8f0);
        --_fg: var(--qds-component-button-danger-color-content-rest, #f8fafc);
        --_fg-disabled: var(--qds-component-button-danger-color-content-disabled, #64748b);
        --_border: var(--qds-component-button-danger-color-border-rest, transparent);
        --_border-disabled: var(--qds-component-button-danger-color-border-disabled, transparent);
      }

      :host([size='sm']) {
        --_padding-block: var(--qds-component-button-sm-padding-block, 0.25rem);
        --_padding-inline: var(--qds-component-button-sm-padding-inline, 0.75rem);
        --_gap: var(--qds-component-button-sm-gap, 0.25rem);
        --_font-size: var(--qds-component-button-sm-font-size, 0.75rem);
      }

      :host([size='lg']) {
        --_padding-block: var(--qds-component-button-lg-padding-block, 0.75rem);
        --_padding-inline: var(--qds-component-button-lg-padding-inline, 1.5rem);
        --_gap: var(--qds-component-button-lg-gap, 0.5rem);
        --_font-size: var(--qds-component-button-lg-font-size, 1rem);
      }

      :host([full-width]) {
        display: block;
      }

      :host([full-width]) button {
        width: 100%;
      }

      button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--_gap);

        margin: 0;
        padding: var(--_padding-block) var(--_padding-inline);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--_font-size);
        font-weight: var(--qds-component-button-font-weight, 500);
        line-height: var(--qds-component-button-line-height, 1.375);

        color: var(--_fg);
        background-color: var(--_bg);
        border: var(--qds-component-button-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-button-border-radius, 0.375rem);

        cursor: pointer;
        user-select: none;
        -webkit-appearance: none;
        appearance: none;

        transition:
          background-color var(--qds-component-button-duration, 120ms),
          border-color var(--qds-component-button-duration, 120ms),
          color var(--qds-component-button-duration, 120ms);
      }

      /* :where() keeps specificity at zero so the disabled rules below win. */
      button:where(:hover) {
        background-color: var(--_bg-hover);
      }

      button:where(:active) {
        background-color: var(--_bg-active);
      }

      button:focus-visible {
        outline: var(--qds-semantic-border-primary, 0.125rem) solid
          var(--qds-semantic-color-border-primary, currentColor);
        outline-offset: 0.125rem;
      }

      button:disabled,
      button[aria-disabled='true'] {
        color: var(--_fg-disabled);
        background-color: var(--_bg-disabled);
        border-color: var(--_border-disabled);
        cursor: not-allowed;
      }

      .content {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--_gap);
      }

      .label {
        display: contents;
      }

      /*
       * opacity, NOT visibility or display.
       *
       * visibility:hidden and display:none both remove the subtree from the
       * accessibility tree, which leaves the button with no accessible name for
       * exactly as long as it is loading — a screen reader announces an unnamed
       * button mid-submit. opacity:0 keeps the content in the a11y tree and keeps
       * it in layout, so the button also does not change width when the spinner
       * appears.
       *
       * Fading one wrapper rather than the label plus each slot matters: a bare
       * text child is not an element, so ::slotted(*) never matches it, and slots
       * are display:contents, which opacity does not apply to.
       */
      :host([loading]) .content {
        opacity: 0;
      }

      .spinner {
        position: absolute;
        inset: 0;
        width: 1em;
        height: 1em;
        margin: auto;
        border: 0.125em solid currentColor;
        border-block-start-color: transparent;
        border-radius: 50%;
        animation: spin 600ms linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /*
       * A continuous spin is a vestibular trigger. Stepping it into eight discrete
       * frames keeps the "work is happening" signal without smooth motion.
       */
      @media (prefers-reduced-motion: reduce) {
        .spinner {
          animation-duration: 1600ms;
          animation-timing-function: steps(8, end);
        }

        button {
          transition: none;
        }
      }

      /*
       * In forced-colors mode the author's colors are discarded, so the disabled
       * state would become visually identical to the resting one. GrayText is the
       * system keyword that survives.
       */
      @media (forced-colors: active) {
        button {
          border: 0.0625rem solid ButtonText;
        }

        button:disabled,
        button[aria-disabled='true'] {
          color: GrayText;
          border-color: GrayText;
        }
      }
    `,
  ];

  /** Visual emphasis. */
  @property({ reflect: true })
  variant: QdsButtonVariant = 'primary';

  /** Control size. */
  @property({ reflect: true })
  size: QdsButtonSize = 'md';

  /** Behavior within a form. */
  @property()
  type: QdsButtonType = 'button';

  /** Prevents interaction and removes the button from the tab order. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * Shows a spinner and blocks activation, while keeping the button focusable so
   * focus is not lost mid-interaction.
   */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /** Stretches the button to fill its container. */
  @property({ type: Boolean, reflect: true, attribute: 'full-width' })
  fullWidth = false;

  /** Accessible name, for when the button has no text (an icon-only button). */
  @property({ attribute: 'label' })
  label: string | null = null;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  /** True while the button should reject activation. */
  get #inert(): boolean {
    return this.disabled || this.loading;
  }

  #handleClick(event: MouseEvent): void {
    if (this.#inert) {
      // A `loading` button is not `disabled`, so the browser still dispatches its
      // click. Stop it here, and stop propagation too — otherwise the event
      // escapes the shadow root and any listener on the host fires anyway.
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.dispatchEvent(new CustomEvent('qds-click', { bubbles: true, composed: true }));

    // Submit and reset do not cross the shadow boundary on their own: the native
    // button's implicit form is its shadow root, which is not a form.
    const form = this.#internals.form;
    if (!form) return;

    if (this.type === 'submit') {
      // requestSubmit(), not submit(), so validation and the submit event still run.
      form.requestSubmit();
    } else if (this.type === 'reset') {
      form.reset();
    }
  }

  override render(): TemplateResult {
    return html`
      <button
        part="button"
        class="button"
        type="button"
        ?disabled=${this.disabled}
        aria-disabled=${this.loading ? 'true' : nothing}
        aria-busy=${this.loading ? 'true' : nothing}
        aria-label=${this.label ?? nothing}
        @click=${this.#handleClick}
      >
        ${this.loading ? html`<span class="spinner" part="spinner"></span>` : nothing}
        <span class="content" part="content">
          <slot name="start"></slot>
          <span class="label" part="label"><slot></slot></span>
          <slot name="end"></slot>
        </span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-button': QdsButton;
  }
}
