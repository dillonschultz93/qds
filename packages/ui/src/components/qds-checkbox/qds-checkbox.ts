import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * A checkbox.
 *
 * A native `<input type="checkbox">` sits inside the shadow root, visually
 * hidden, with a token-styled box drawn over it. Keeping the native input is
 * what gives the component keyboard handling, `indeterminate`, and a correct
 * accessibility role for free; the drawn box is purely presentational.
 *
 * @element qds-checkbox
 *
 * @slot - The label.
 *
 * @fires {CustomEvent<{ checked: boolean }>} qds-change - Fired when the user
 * toggles the checkbox. Not fired for programmatic changes.
 *
 * @csspart base - The label element wrapping the control and its text.
 * @csspart control - The drawn box.
 * @csspart label - The wrapper around the default slot.
 *
 * @cssprop [--qds-component-checkbox-gap] - Space between the box and the label.
 * @cssprop [--qds-component-checkbox-font-size] - Label size.
 * @cssprop [--qds-component-checkbox-line-height] - Label line height.
 * @cssprop [--qds-component-checkbox-duration] - State transition duration.
 * @cssprop [--qds-component-checkbox-control-width] - Box width.
 * @cssprop [--qds-component-checkbox-control-height] - Box height.
 * @cssprop [--qds-component-checkbox-control-border-radius] - Box corner radius.
 * @cssprop [--qds-component-checkbox-control-border-width] - Box border thickness.
 * @cssprop [--qds-component-checkbox-control-color-background-{state}] - Box fill: `unchecked`, `checked`, `hover` (checked, under the pointer), `disabled`.
 * @cssprop [--qds-component-checkbox-control-color-border-{state}] - Box border: `unchecked`, `hover` (unchecked, under the pointer), `checked`, `disabled`.
 * @cssprop [--qds-component-checkbox-control-color-content-{state}] - Check mark color: `checked`, `disabled`.
 * @cssprop [--qds-component-checkbox-label-color-content-{state}] - Label color: `rest`, `disabled`.
 */
@customElement('qds-checkbox')
export class QdsCheckbox extends QdsElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...QdsElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-block;
      }

      label {
        position: relative;
        display: inline-flex;
        align-items: flex-start;
        gap: var(--qds-component-checkbox-gap, 0.5rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-checkbox-font-size, 0.875rem);
        line-height: var(--qds-component-checkbox-line-height, 1.375);
        color: var(--qds-component-checkbox-label-color-content-rest, #0f172a);

        cursor: pointer;
      }

      /*
       * Visually hidden, not display:none: the native input has to stay focusable
       * and in the accessibility tree, since it is the actual control.
       */
      input {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        width: var(--qds-component-checkbox-control-width, 1rem);
        height: var(--qds-component-checkbox-control-height, 1rem);
        margin: 0;
        opacity: 0;
        cursor: inherit;
      }

      .control {
        display: inline-grid;
        place-items: center;
        flex: none;
        width: var(--qds-component-checkbox-control-width, 1rem);
        height: var(--qds-component-checkbox-control-height, 1rem);
        /* Centre the box on the first line of the label, however tall the text. */
        margin-block-start: calc((1lh - var(--qds-component-checkbox-control-height, 1rem)) / 2);

        color: var(--qds-component-checkbox-control-color-content-checked, #f8fafc);
        background-color: var(--qds-component-checkbox-control-color-background-unchecked, #f8fafc);
        border: var(--qds-component-checkbox-control-border-width, 0.0625rem) solid
          var(--qds-component-checkbox-control-color-border-unchecked, #64748b);
        border-radius: var(--qds-component-checkbox-control-border-radius, 0.25rem);

        transition:
          background-color var(--qds-component-checkbox-duration, 120ms),
          border-color var(--qds-component-checkbox-duration, 120ms);
      }

      /* Both marks share the one grid cell; only one is ever visible. */
      .mark {
        grid-area: 1 / 1;
        width: 100%;
        height: 100%;
        visibility: hidden;
      }

      :where(label:hover) .control {
        border-color: var(--qds-component-checkbox-control-color-border-hover, #2563eb);
      }

      input:checked + .control,
      input:indeterminate + .control {
        background-color: var(--qds-component-checkbox-control-color-background-checked, #2563eb);
        border-color: var(--qds-component-checkbox-control-color-border-checked, #2563eb);
      }

      :where(label:hover) input:checked + .control,
      :where(label:hover) input:indeterminate + .control {
        background-color: var(--qds-component-checkbox-control-color-background-hover, #1d4ed8);
      }

      input:checked:not(:indeterminate) + .control .check,
      input:indeterminate + .control .dash {
        visibility: visible;
      }

      input:focus-visible + .control {
        outline: var(--qds-semantic-border-primary, 0.125rem) solid
          var(--qds-semantic-color-border-primary, currentColor);
        outline-offset: 0.125rem;
      }

      /*
       * :disabled rather than [disabled]: a form-associated element matches it
       * when either its own attribute or an ancestor fieldset disables it.
       */
      :host(:disabled) label {
        color: var(--qds-component-checkbox-label-color-content-disabled, #64748b);
        cursor: not-allowed;
      }

      :host(:disabled) .control,
      :host(:disabled) input:checked + .control,
      :host(:disabled) input:indeterminate + .control {
        color: var(--qds-component-checkbox-control-color-content-disabled, #64748b);
        background-color: var(--qds-component-checkbox-control-color-background-disabled, #f1f5f9);
        border-color: var(--qds-component-checkbox-control-color-border-disabled, #e2e8f0);
      }

      @media (prefers-reduced-motion: reduce) {
        .control {
          transition: none;
        }
      }

      /*
       * Forced colors discards the drawn box's fill, so a checked box would be
       * indistinguishable from an unchecked one apart from the mark. Give the mark
       * a system color, and keep the border visible.
       */
      @media (forced-colors: active) {
        .control {
          border-color: ButtonText;
          color: Highlight;
        }

        :host(:disabled) .control {
          border-color: GrayText;
          color: GrayText;
        }
      }
    `,
  ];

  /** Whether the box is checked. The `checked` attribute sets the initial state, restored on form reset. */
  @property({ type: Boolean })
  checked = false;

  /**
   * Shows a dash instead of a check, for a parent checkbox whose children are
   * partly checked. Cleared as soon as the user toggles the box, like the native
   * property.
   */
  @property({ type: Boolean, reflect: true })
  indeterminate = false;

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Makes the form invalid until the box is checked. */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Value submitted when checked. */
  @property()
  value = 'on';

  @query('input')
  private readonly input!: HTMLInputElement;

  /**
   * Disabled by the form machinery: this element's own attribute OR an ancestor
   * `<fieldset disabled>`. Kept apart from `disabled` so that re-enabling the
   * fieldset does not clear a checkbox that was disabled on its own.
   */
  @state()
  private formDisabled = false;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  /** The form this checkbox belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** Same as the native `checkValidity()`. */
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  /** Same as the native `reportValidity()`. */
  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }

  /** Same as the native `validity`. */
  get validity(): ValidityState {
    return this.#internals.validity;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('checked') || changed.has('value')) {
      this.#internals.setFormValue(this.checked ? this.value : null);
    }
  }

  protected override updated(): void {
    this.#syncValidity();
  }

  /**
   * Validity is anchored to the native input so reportValidity() points the
   * browser's bubble at the box rather than the host's corner. Not run before the
   * first render, because the input does not exist until then.
   */
  #syncValidity(): void {
    if (this.required && !this.checked) {
      this.#internals.setValidity(
        { valueMissing: true },
        this.input.validationMessage || 'Check this box to continue.',
        this.input,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  /** Called by the form on reset: restore the state the markup declared. */
  formResetCallback(): void {
    this.checked = this.hasAttribute('checked');
    this.indeterminate = false;
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  #handleChange(): void {
    this.checked = this.input.checked;
    this.indeterminate = false;
    // Synchronously, not left to willUpdate and updated: a qds-change listener
    // reading FormData or validity would otherwise see the previous state.
    this.#internals.setFormValue(this.checked ? this.value : null);
    this.#syncValidity();
    this.dispatchEvent(
      new CustomEvent('qds-change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render(): TemplateResult {
    return html`
      <label part="base">
        <input
          type="checkbox"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.disabled || this.formDisabled}
          ?required=${this.required}
          @change=${this.#handleChange}
        />
        <span class="control" part="control" aria-hidden="true">
          <svg class="mark check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3.5 8.5 6.5 11.5 12.5 4.5"></polyline>
          </svg>
          <svg class="mark dash" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="8" x2="12" y2="8"></line>
          </svg>
        </span>
        <span part="label"><slot></slot></span>
      </label>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-checkbox': QdsCheckbox;
  }
}
