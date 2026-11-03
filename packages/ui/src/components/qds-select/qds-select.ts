import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

/** An option or a group of options, read from the light DOM. */
type Entry =
  | { kind: 'option'; value: string; label: string; disabled: boolean }
  | { kind: 'group'; label: string; disabled: boolean; options: Entry[] };

/**
 * A select: a visible label, a native dropdown, an optional hint, and an error
 * message, with the same layout and validation as `qds-text-field`.
 *
 * Write the options as ordinary `<option>` and `<optgroup>` children:
 *
 * ```html
 * <qds-select label="Country" name="country" placeholder="Choose a country" required>
 *   <option value="ca">Canada</option>
 *   <option value="mx">Mexico</option>
 *   <option value="us">United States</option>
 * </qds-select>
 * ```
 *
 * They are copied into a native `<select>` inside the component, and copied
 * again whenever they change. Keeping the native element is the point: it brings
 * the platform's keyboard handling, type-to-select, screen reader support, and
 * the phone's own picker, none of which a drawn listbox matches.
 *
 * The initial value is the `value` attribute, or the option marked `selected`,
 * or — as with a native select — the first option. A `placeholder` adds an empty
 * first choice instead, which a `required` select will not accept.
 *
 * @element qds-select
 *
 * @slot label - The label, in place of the `label` attribute when it needs markup.
 * @slot hint - The hint, in place of the `hint` attribute when it needs markup.
 *
 * @fires {CustomEvent<{ value: string }>} qds-change - Fired when the user chooses an option.
 *
 * @csspart base - The wrapper around the whole field.
 * @csspart label - The label element.
 * @csspart control - The box drawn around the select.
 * @csspart select - The native select.
 * @csspart icon - The chevron.
 * @csspart hint - The hint text.
 * @csspart error - The error message.
 *
 * @cssprop [--qds-component-select-gap] - Space between the label, control, and messages.
 * @cssprop [--qds-component-select-duration] - Border transition duration.
 * @cssprop [--qds-component-select-label-font-size] - Label size.
 * @cssprop [--qds-component-select-label-font-weight] - Label weight.
 * @cssprop [--qds-component-select-label-color-content-{state}] - Label color: `rest`, `disabled`.
 * @cssprop [--qds-component-select-hint-font-size] - Hint and error size.
 * @cssprop [--qds-component-select-hint-color-content-rest] - Hint color.
 * @cssprop [--qds-component-select-error-color-content-rest] - Error message color.
 * @cssprop [--qds-component-select-control-padding-block] - Control vertical padding.
 * @cssprop [--qds-component-select-control-padding-inline] - Control horizontal padding.
 * @cssprop [--qds-component-select-control-font-size] - Text size.
 * @cssprop [--qds-component-select-control-line-height] - Line height.
 * @cssprop [--qds-component-select-control-border-radius] - Control corner radius.
 * @cssprop [--qds-component-select-control-border-width] - Control border thickness.
 * @cssprop [--qds-component-select-control-color-background-{state}] - Control fill: `rest`, `disabled`.
 * @cssprop [--qds-component-select-control-color-border-{state}] - Control border: `rest`, `focus`, `disabled`.
 * @cssprop [--qds-component-select-control-color-content-{state}] - Text: `rest`, `disabled`.
 * @cssprop [--qds-component-select-invalid-color-border-rest] - Control border while showing an error.
 * @cssprop [--qds-component-select-placeholder-color-content-rest] - Text while the placeholder is chosen.
 * @cssprop [--qds-component-select-icon-color-content-rest] - Chevron color.
 */
@customElement('qds-select')
export class QdsSelect extends QdsElement {
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

        --_border: var(--qds-component-select-control-color-border-rest, #64748b);
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-select-gap, 0.25rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
      }

      label {
        font-size: var(--qds-component-select-label-font-size, 0.875rem);
        font-weight: var(--qds-component-select-label-font-weight, 500);
        color: var(--qds-component-select-label-color-content-rest, #0f172a);
      }

      .required {
        margin-inline-start: 0.125em;
        color: var(--qds-component-select-error-color-content-rest, #b91c1c);
      }

      .control {
        position: relative;
        display: flex;
        align-items: center;

        font-size: var(--qds-component-select-control-font-size, 0.875rem);
        line-height: var(--qds-component-select-control-line-height, 1.5);
        color: var(--qds-component-select-control-color-content-rest, #0f172a);

        background-color: var(--qds-component-select-control-color-background-rest, #f8fafc);
        border: var(--qds-component-select-control-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-select-control-border-radius, 0.375rem);

        transition: border-color var(--qds-component-select-duration, 120ms);
      }

      .invalid .control {
        --_border: var(--qds-component-select-invalid-color-border-rest, #dc2626);
      }

      .control:focus-within {
        border-color: var(--qds-component-select-control-color-border-focus, #2563eb);
        outline: var(--_focus-ring);
        outline-offset: 0.0625rem;
      }

      select {
        flex: 1;
        min-width: 0;
        margin: 0;
        /* Room on the end for the chevron, which sits over the select. */
        padding: var(--qds-component-select-control-padding-block, 0.5rem)
          calc(var(--qds-component-select-control-padding-inline, 0.75rem) * 2 + 1rem)
          var(--qds-component-select-control-padding-block, 0.5rem)
          var(--qds-component-select-control-padding-inline, 0.75rem);

        font: inherit;
        color: inherit;
        background: none;
        border: 0;
        border-radius: inherit;
        outline: none;
        appearance: none;
        cursor: pointer;
      }

      .placeholder select {
        color: var(--qds-component-select-placeholder-color-content-rest, #64748b);
      }

      /* The open list's options keep the page's text color, not the placeholder's. */
      option,
      optgroup {
        color: var(--qds-component-select-control-color-content-rest, #0f172a);
      }

      .icon {
        position: absolute;
        inset-inline-end: var(--qds-component-select-control-padding-inline, 0.75rem);
        color: var(--qds-component-select-icon-color-content-rest, #64748b);
        pointer-events: none;
      }

      .hint,
      .error {
        font-size: var(--qds-component-select-hint-font-size, 0.75rem);
      }

      .hint {
        color: var(--qds-component-select-hint-color-content-rest, #64748b);
      }

      .error {
        color: var(--qds-component-select-error-color-content-rest, #b91c1c);
      }

      :host(:disabled) label {
        color: var(--qds-component-select-label-color-content-disabled, #64748b);
      }

      :host(:disabled) .control {
        color: var(--qds-component-select-control-color-content-disabled, #64748b);
        background-color: var(--qds-component-select-control-color-background-disabled, #f1f5f9);
        border-color: var(--qds-component-select-control-color-border-disabled, #e2e8f0);
      }

      :host(:disabled) select {
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

  /** The visible label. Also the select's accessible name. */
  @property()
  label = '';

  /** Help text shown under the select, and read out with it. */
  @property()
  hint = '';

  /**
   * An error message to show, for errors the browser cannot detect. Shown
   * immediately, and marks the field invalid to assistive technology, but does
   * not block form submission.
   */
  @property()
  error = '';

  /** The chosen option's value. The `value` attribute sets the initial value, restored on form reset. */
  @property()
  value = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Adds an empty first choice with this text, chosen until the user picks another. */
  @property()
  placeholder = '';

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Makes the form invalid until an option other than the placeholder is chosen. */
  @property({ type: Boolean, reflect: true })
  required = false;

  @query('select')
  private readonly select!: HTMLSelectElement;

  /** The options, read from the light DOM after the element connects. */
  @state()
  private entries: Entry[] = [];

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  private formDisabled = false;

  /** Whether native validation messages may be shown yet, as in qds-text-field. */
  @state()
  private touched = false;

  @state()
  private hasHintSlot = false;

  #nativeError = '';
  /** The value to restore on form reset: the one the markup declared. */
  #defaultValue = '';
  #observer: MutationObserver | null = null;
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.addEventListener('invalid', () => (this.touched = true));
  }

  /** The form this select belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** Same as the native `checkValidity()`. */
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  /** Same as the native `reportValidity()`, and shows the field's message. */
  reportValidity(): boolean {
    this.touched = true;
    return this.#internals.reportValidity();
  }

  /** Same as the native `validity`. */
  get validity(): ValidityState {
    return this.#internals.validity;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => this.#readOptions());
    this.#observer.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  protected override firstUpdated(): void {
    // A separate, later update, as in qds-text-field: the first client update of
    // a server-rendered element adopts the server's DOM, which has no options,
    // since the server cannot read light-DOM children.
    void this.updateComplete.then(() => {
      this.hasHintSlot = this.querySelector(':scope > [slot="hint"]') !== null;
      this.#readOptions();
      // The initial value: the attribute, the selected option, the placeholder, or the first option.
      if (!this.hasAttribute('value') && this.value === '') {
        const selected = this.querySelector<HTMLOptionElement>('option[selected]');
        this.value = selected ? selected.value : this.placeholder ? '' : (this.#firstValue() ?? '');
      }
      this.#defaultValue = this.value;
    });
  }

  #readOptions(): void {
    const read = (parent: Element): Entry[] =>
      [...parent.children].flatMap((child): Entry[] => {
        if (child instanceof HTMLOptionElement) {
          return [{ kind: 'option', value: child.value, label: child.label || child.text, disabled: child.disabled }];
        }
        if (child instanceof HTMLOptGroupElement) {
          return [{ kind: 'group', label: child.label, disabled: child.disabled, options: read(child) }];
        }
        return [];
      });
    this.entries = read(this);
  }

  #firstValue(): string | undefined {
    const first = (entries: Entry[]): string | undefined => {
      for (const entry of entries) {
        if (entry.kind === 'option' && !entry.disabled) return entry.value;
        if (entry.kind === 'group' && !entry.disabled) {
          const value = first(entry.options);
          if (value !== undefined) return value;
        }
      }
      return undefined;
    };
    return first(this.entries);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('value')) this.#internals.setFormValue(this.value);
  }

  protected override updated(): void {
    // Set after the options render, not bound in the template: a value bound
    // before its option exists matches nothing, and the select shows the first.
    if (this.select.value !== this.value) this.select.value = this.value;
    this.#syncValidity();
  }

  #syncValidity(): void {
    const { validity, validationMessage, willValidate } = this.select;
    if (validity.valid || !willValidate) {
      this.#internals.setValidity({});
    } else {
      this.#internals.setValidity(validity, validationMessage, this.select);
    }
    const stale = this.touched && !this.error && this.#nativeError !== validationMessage;
    this.#nativeError = validationMessage;
    if (stale) this.requestUpdate();
  }

  /** Called by the form on reset: restore the declared value and hide messages again. */
  formResetCallback(): void {
    this.value = this.#defaultValue;
    this.touched = false;
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  #onChange(): void {
    this.value = this.select.value;
    this.touched = true;
    // Synchronously, so a qds-change listener reading FormData or validity sees the new state.
    this.#internals.setFormValue(this.value);
    this.#syncValidity();
    this.dispatchEvent(
      new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }),
    );
  }

  #renderEntries(entries: Entry[]): TemplateResult[] {
    return entries.map((entry) =>
      entry.kind === 'option'
        ? html`<option value=${entry.value} ?disabled=${entry.disabled}>${entry.label}</option>`
        : html`<optgroup label=${entry.label} ?disabled=${entry.disabled}>${this.#renderEntries(entry.options)}</optgroup>`,
    );
  }

  override render(): TemplateResult {
    const error = this.error || (this.touched ? this.#nativeError : '');
    const hasHint = Boolean(this.hint) || this.hasHintSlot;
    const describedBy = [hasHint ? 'hint' : '', error ? 'error' : ''].filter(Boolean).join(' ');
    const classes = ['base', error ? 'invalid' : '', this.placeholder && this.value === '' ? 'placeholder' : '']
      .filter(Boolean)
      .join(' ');

    return html`
      <div class=${classes} part="base">
        <label for="select" part="label">
          <slot name="label">${this.label}</slot>
          ${this.required ? html`<span class="required" aria-hidden="true">*</span>` : nothing}
        </label>
        <div class="control" part="control">
          <select
            id="select"
            part="select"
            name=${this.name || nothing}
            aria-describedby=${describedBy || nothing}
            aria-invalid=${error ? 'true' : nothing}
            ?disabled=${this.disabled || this.formDisabled}
            ?required=${this.required}
            @change=${this.#onChange}
            @blur=${() => (this.touched = true)}
          >
            ${this.placeholder ? html`<option value="">${this.placeholder}</option>` : nothing}
            ${this.#renderEntries(this.entries)}
          </select>
          <qds-icon class="icon" part="icon" name="chevron-down" size="sm"></qds-icon>
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
    'qds-select': QdsSelect;
  }
}
