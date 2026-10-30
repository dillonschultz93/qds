import { type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { QdsElement } from './qds-element.js';

/** The single-line text types the text controls accept. */
export type QdsTextControlType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

/**
 * Shared base for the components that wrap one native `<input>`: `qds-input`
 * and `qds-text-field`.
 *
 * Holds everything about being a form control that the two would otherwise
 * duplicate — the native input's properties, form association, mirroring the
 * input's constraint validation onto the host, the input and change events, and
 * focusing the input from a click anywhere in the control. Subclasses render the
 * markup around the input, and bind their `<input>` to the handlers here.
 *
 * Not registered as an element, and not exported from the package.
 */
export class QdsTextControl extends QdsElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...QdsElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static formAssociated = true;

  /** Input type. Only the single-line text types; use a dedicated component for dates or files. */
  @property()
  type: QdsTextControlType = 'text';

  /** The current value. The `value` attribute sets the initial value, restored on form reset. */
  @property()
  value = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Hint shown while empty. Not a substitute for a label. */
  @property()
  placeholder = '';

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Prevents editing but keeps the value focusable, selectable, and submitted. */
  @property({ type: Boolean, reflect: true })
  readonly = false;

  /** Makes the form invalid while empty. */
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
  protected readonly input!: HTMLInputElement;

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  protected formDisabled = false;

  protected readonly internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  /** The form this control belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** Same as the native `checkValidity()`. */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /** Same as the native `reportValidity()`. */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /** Same as the native `validity`. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /** Selects all of the text, as the native `select()`. */
  select(): void {
    this.input.select();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('value')) {
      this.internals.setFormValue(this.value);
    }
  }

  protected override updated(): void {
    this.syncValidity();
  }

  /** Called by the form on reset: restore the value the markup declared. */
  formResetCallback(): void {
    this.value = this.getAttribute('value') ?? '';
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  /**
   * Mirror the native input's validity onto the host, anchored to the input so
   * the browser's validation bubble points at the text rather than the host.
   */
  protected syncValidity(): void {
    const { validity, validationMessage } = this.input;
    if (validity.valid) {
      this.internals.setValidity({});
    } else {
      this.internals.setValidity(validity, validationMessage, this.input);
    }
  }

  /** Bind to the native input's `input` event. */
  protected handleInput(): void {
    this.value = this.input.value;
    // Synchronously, not left to willUpdate: a listener reading FormData from
    // this very event would otherwise see the previous value.
    this.internals.setFormValue(this.value);
    this.syncValidity();
    this.dispatchEvent(
      new CustomEvent('qds-input', { detail: { value: this.value }, bubbles: true, composed: true }),
    );
  }

  /** Bind to the native input's `change` event. */
  protected handleChange(): void {
    this.dispatchEvent(
      new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }),
    );
  }

  /**
   * Bind to the click of the box drawn around the input. Clicking its padding or
   * an affix should land in the text, as it would on a native input whose box is
   * the whole control.
   */
  protected focusInput(event: MouseEvent): void {
    if (event.target !== this.input) this.input.focus();
  }
}
