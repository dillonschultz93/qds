import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsTextFieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

/**
 * A complete text field: a visible label, the input, an optional hint, and an
 * error message.
 *
 * All four live in one shadow root, which is what makes the wiring possible.
 * `<label for>` and `aria-describedby` are ID references, and an ID reference
 * cannot cross a shadow boundary — so a label outside the component could never
 * name the input inside it, and a hint outside could never describe it.
 *
 * Errors come from two places. An `error` message set by the author is always
 * shown. Otherwise, once the user has left the field (or tried to submit the
 * form), the browser's own validation message is shown for any failing
 * constraint — `required`, `type="email"`, `minlength`, `pattern` — so the common
 * cases need no code at all.
 *
 * @element qds-text-field
 *
 * @slot label - The label, in place of the `label` attribute when it needs markup.
 * @slot hint - The hint, in place of the `hint` attribute when it needs markup, such as a link.
 * @slot start - Content before the text, such as an icon or a prefix.
 * @slot end - Content after the text, such as a unit or a button.
 *
 * @fires {CustomEvent<{ value: string }>} qds-input - Fired on every keystroke.
 * @fires {CustomEvent<{ value: string }>} qds-change - Fired when the value is
 * committed: on blur after editing, or on Enter.
 *
 * @csspart base - The wrapper around the whole field.
 * @csspart label - The label element.
 * @csspart control - The box drawn around the input and its affixes.
 * @csspart input - The native input.
 * @csspart hint - The hint text.
 * @csspart error - The error message.
 *
 * @cssprop [--qds-component-text-field-gap] - Space between the label, control, and messages.
 * @cssprop [--qds-component-text-field-duration] - Border transition duration.
 * @cssprop [--qds-component-text-field-label-font-size] - Label size.
 * @cssprop [--qds-component-text-field-label-font-weight] - Label weight.
 * @cssprop [--qds-component-text-field-label-color-content-{state}] - Label color: `rest`, `disabled`.
 * @cssprop [--qds-component-text-field-hint-font-size] - Hint and error size.
 * @cssprop [--qds-component-text-field-hint-color-content-rest] - Hint color.
 * @cssprop [--qds-component-text-field-error-color-content-rest] - Error message color.
 * @cssprop [--qds-component-text-field-control-gap] - Space between the text and the affixes.
 * @cssprop [--qds-component-text-field-control-padding-block] - Control vertical padding.
 * @cssprop [--qds-component-text-field-control-padding-inline] - Control horizontal padding.
 * @cssprop [--qds-component-text-field-control-font-size] - Input text size.
 * @cssprop [--qds-component-text-field-control-line-height] - Input line height.
 * @cssprop [--qds-component-text-field-control-border-radius] - Control corner radius.
 * @cssprop [--qds-component-text-field-control-border-width] - Control border thickness.
 * @cssprop [--qds-component-text-field-control-color-background-{state}] - Control fill: `rest`, `disabled`.
 * @cssprop [--qds-component-text-field-control-color-border-{state}] - Control border: `rest`, `focus`, `disabled`.
 * @cssprop [--qds-component-text-field-control-color-content-{state}] - Input text: `rest`, `disabled`.
 * @cssprop [--qds-component-text-field-invalid-color-border-rest] - Control border while showing an error.
 * @cssprop [--qds-component-text-field-placeholder-color-content-rest] - Placeholder text.
 * @cssprop [--qds-component-text-field-affix-color-content-rest] - Color of slotted start and end content.
 */
@customElement('qds-text-field')
export class QdsTextField extends QdsElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...QdsElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;

        --_border: var(--qds-component-text-field-control-color-border-rest, #64748b);
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-text-field-gap, 0.25rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
      }

      label {
        font-size: var(--qds-component-text-field-label-font-size, 0.875rem);
        font-weight: var(--qds-component-text-field-label-font-weight, 500);
        color: var(--qds-component-text-field-label-color-content-rest, #0f172a);
      }

      .required {
        margin-inline-start: 0.125em;
        color: var(--qds-component-text-field-error-color-content-rest, #b91c1c);
      }

      .control {
        display: flex;
        align-items: center;
        gap: var(--qds-component-text-field-control-gap, 0.5rem);
        padding: 0 var(--qds-component-text-field-control-padding-inline, 0.75rem);

        font-size: var(--qds-component-text-field-control-font-size, 0.875rem);
        line-height: var(--qds-component-text-field-control-line-height, 1.5);
        color: var(--qds-component-text-field-control-color-content-rest, #0f172a);

        background-color: var(--qds-component-text-field-control-color-background-rest, #f8fafc);
        border: var(--qds-component-text-field-control-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-text-field-control-border-radius, 0.375rem);
        cursor: text;

        transition: border-color var(--qds-component-text-field-duration, 120ms);
      }

      .invalid .control {
        --_border: var(--qds-component-text-field-invalid-color-border-rest, #dc2626);
      }

      .control:focus-within {
        border-color: var(--qds-component-text-field-control-color-border-focus, #2563eb);
        outline: var(--_focus-ring);
        outline-offset: 0.0625rem;
      }

      input {
        flex: 1;
        min-width: 0;
        margin: 0;
        padding: var(--qds-component-text-field-control-padding-block, 0.5rem) 0;

        font: inherit;
        color: inherit;
        background: none;
        border: 0;
        outline: none;
      }

      input::placeholder {
        color: var(--qds-component-text-field-placeholder-color-content-rest, #64748b);
        opacity: 1;
      }

      ::slotted([slot='start']),
      ::slotted([slot='end']) {
        flex: none;
        color: var(--qds-component-text-field-affix-color-content-rest, #64748b);
      }

      .hint,
      .error {
        font-size: var(--qds-component-text-field-hint-font-size, 0.75rem);
      }

      .hint {
        color: var(--qds-component-text-field-hint-color-content-rest, #64748b);
      }

      .error {
        color: var(--qds-component-text-field-error-color-content-rest, #b91c1c);
      }

      :host(:disabled) label {
        color: var(--qds-component-text-field-label-color-content-disabled, #64748b);
      }

      :host(:disabled) .control {
        color: var(--qds-component-text-field-control-color-content-disabled, #64748b);
        background-color: var(--qds-component-text-field-control-color-background-disabled, #f1f5f9);
        border-color: var(--qds-component-text-field-control-color-border-disabled, #e2e8f0);
        cursor: not-allowed;
      }

      :host(:disabled) input {
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        .control {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        .control {
          border-color: FieldText;
        }

        :host(:disabled) .control {
          border-color: GrayText;
        }
      }
    `,
  ];

  /** The visible label. Also the input's accessible name. */
  @property()
  label = '';

  /** Help text shown under the input, and read out with it. */
  @property()
  hint = '';

  /**
   * An error message to show, for errors the browser cannot detect, such as a
   * server-side check. Shown immediately, and marks the field invalid to
   * assistive technology, but does not block form submission.
   */
  @property()
  error = '';

  /** Input type. Only the single-line text types. */
  @property()
  type: QdsTextFieldType = 'text';

  /** The current value. The `value` attribute sets the initial value, restored on form reset. */
  @property()
  value = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Hint shown while empty. Not a substitute for the label. */
  @property()
  placeholder = '';

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Prevents editing but keeps the value focusable, selectable, and submitted. */
  @property({ type: Boolean, reflect: true })
  readonly = false;

  /** Makes the form invalid while empty, and marks the label with an asterisk. */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Minimum length, as on a native input. */
  @property({ type: Number })
  minlength?: number;

  /** Maximum length, as on a native input. */
  @property({ type: Number })
  maxlength?: number;

  /** A regular expression the value must match, as on a native input. */
  @property()
  pattern?: string;

  /** Autofill hint, as on a native input. */
  @property()
  autocomplete?: string;

  @query('input')
  private readonly input!: HTMLInputElement;

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  private formDisabled = false;

  /**
   * Whether native validation messages may be shown yet: after the user leaves
   * the field, or tries to submit the form. Before that, a required field that
   * nobody has touched is not an error.
   */
  @state()
  private touched = false;

  /**
   * The browser's message for the failing constraint, if any. A plain field, not
   * reactive state: it is read during render and refreshed after it, and making
   * it reactive would schedule a second render from inside updated().
   */
  #nativeError = '';

  @state()
  private hasHintSlot = false;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // The form fires `invalid` at each failing control when submission is
    // attempted. Treat that as touching the field, so its message appears.
    this.addEventListener('invalid', () => (this.touched = true));
  }

  /** The form this field belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** Same as the native `checkValidity()`. */
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  /** Same as the native `reportValidity()`. */
  reportValidity(): boolean {
    this.touched = true;
    return this.#internals.reportValidity();
  }

  /** Same as the native `validity`. */
  get validity(): ValidityState {
    return this.#internals.validity;
  }

  /** The message currently shown, or an empty string. */
  get #shownError(): string {
    return this.error || (this.touched ? this.#nativeError : '');
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('value')) {
      this.#internals.setFormValue(this.value);
    }
  }

  protected override firstUpdated(): void {
    // Not left to slotchange alone: server-rendered content is already slotted
    // when the element hydrates, so slotchange never fires for it.
    //
    // This has to be a separate, later update. The first client update of a
    // server-rendered element adopts the existing DOM rather than writing to it,
    // so a value that differs from the server's is silently not applied — the
    // hint would stay hidden. Waiting for updateComplete makes it an ordinary
    // follow-up render rather than a change scheduled from inside an update.
    void this.updateComplete.then(() => {
      this.hasHintSlot = this.querySelector(':scope > [slot="hint"]') !== null;
    });
  }

  protected override updated(): void {
    this.#syncValidity();
  }

  /** Called by the form on reset: restore the declared value and hide messages again. */
  formResetCallback(): void {
    this.value = this.getAttribute('value') ?? '';
    this.touched = false;
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  #syncValidity(): void {
    const { validity, validationMessage } = this.input;
    if (validity.valid) {
      this.#internals.setValidity({});
    } else {
      this.#internals.setValidity(validity, validationMessage, this.input);
    }
    // A programmatic value change can alter the message after this render
    // already showed the old one. Re-render only then, and only if it is shown.
    const stale = this.touched && !this.error && this.#nativeError !== validationMessage;
    this.#nativeError = validationMessage;
    if (stale) this.requestUpdate();
  }

  #handleInput(): void {
    this.value = this.input.value;
    // Synchronously, not left to willUpdate: a listener reading FormData from
    // this very event would otherwise see the previous value.
    this.#internals.setFormValue(this.value);
    this.#syncValidity();
    this.dispatchEvent(
      new CustomEvent('qds-input', { detail: { value: this.value }, bubbles: true, composed: true }),
    );
  }

  #handleChange(): void {
    this.dispatchEvent(
      new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }),
    );
  }

  #focusInput(event: MouseEvent): void {
    if (event.target !== this.input) this.input.focus();
  }

  override render(): TemplateResult {
    const error = this.#shownError;
    const hasHint = Boolean(this.hint) || this.hasHintSlot;
    const describedBy = [hasHint ? 'hint' : '', error ? 'error' : ''].filter(Boolean).join(' ');

    return html`
      <div class=${error ? 'base invalid' : 'base'} part="base">
        <label for="input" part="label">
          <slot name="label">${this.label}</slot>
          ${this.required ? html`<span class="required" aria-hidden="true">*</span>` : nothing}
        </label>
        <div class="control" part="control" @click=${this.#focusInput}>
          <slot name="start"></slot>
          <input
            id="input"
            part="input"
            type=${this.type}
            .value=${live(this.value)}
            name=${this.name || nothing}
            placeholder=${this.placeholder || nothing}
            aria-describedby=${describedBy || nothing}
            aria-invalid=${error ? 'true' : nothing}
            autocomplete=${this.autocomplete ?? nothing}
            minlength=${this.minlength ?? nothing}
            maxlength=${this.maxlength ?? nothing}
            pattern=${this.pattern ?? nothing}
            ?disabled=${this.disabled || this.formDisabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            @input=${this.#handleInput}
            @change=${this.#handleChange}
            @blur=${() => (this.touched = true)}
          />
          <slot name="end"></slot>
        </div>
        <div id="hint" class="hint" part="hint" ?hidden=${!hasHint}>
          <slot
            name="hint"
            @slotchange=${(event: Event) => {
              this.hasHintSlot = (event.target as HTMLSlotElement).assignedNodes().length > 0;
            }}
            >${this.hint}</slot
          >
        </div>
        ${error ? html`<div id="error" class="error" part="error">${error}</div>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-text-field': QdsTextField;
  }
}
