import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

import { hidePanel, lengthOf, panelStyles, placePanel, showPanel, whileOpen } from '../../internal/floating.js';
import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

/** An option, read from the light DOM. */
interface Option {
  value: string;
  label: string;
  disabled: boolean;
}

/**
 * A text field with a list of options that narrows as you type: for choosing
 * one value from a list too long to scan, such as a country or a time zone.
 *
 * Write the options as ordinary `<option>` children, as for `qds-select`:
 *
 * ```html
 * <qds-combobox label="Time zone" name="tz" placeholder="Search time zones">
 *   <option value="America/Los_Angeles">Los Angeles</option>
 *   <option value="America/New_York">New York</option>
 *   <option value="Europe/London">London</option>
 * </qds-combobox>
 * ```
 *
 * Follows the WAI-ARIA combobox pattern, with list autocomplete. Typing opens
 * the list, keeps the options whose text contains what was typed, and
 * highlights the first; Down Arrow and Up Arrow move the highlight, Enter or a
 * click chooses, and Escape closes the list. Down Arrow on a closed list opens
 * it, and Alt+Down Arrow opens it without moving. Focus stays in the text box
 * throughout, and screen readers follow the highlighted option.
 *
 * The value is always one of the options, or empty. Leaving the field with text
 * that names an option exactly chooses it; any other text goes back to the
 * chosen option's name, and empty text clears the value. With fewer than about
 * ten options, or on phones where the native picker suits, use `qds-select`.
 *
 * @element qds-combobox
 *
 * @slot label - The label, in place of the `label` attribute when it needs markup.
 * @slot hint - The hint, in place of the `hint` attribute when it needs markup.
 *
 * @fires {CustomEvent<{ value: string }>} qds-change - Fired when the user chooses an option, or clears the field.
 *
 * @csspart base - The wrapper around the whole field.
 * @csspart label - The label element.
 * @csspart control - The box drawn around the text box.
 * @csspart input - The text box.
 * @csspart icon - The chevron.
 * @csspart listbox - The list of options.
 * @csspart option - Each option.
 * @csspart hint - The hint text.
 * @csspart error - The error message.
 *
 * @cssprop [--qds-component-combobox-gap] - Space between the label, control, and messages.
 * @cssprop [--qds-component-combobox-duration] - Border transition duration.
 * @cssprop [--qds-component-combobox-label-font-size] - Label size.
 * @cssprop [--qds-component-combobox-label-font-weight] - Label weight.
 * @cssprop [--qds-component-combobox-label-color-content-{state}] - Label color: `rest`, `disabled`.
 * @cssprop [--qds-component-combobox-hint-font-size] - Hint and error size.
 * @cssprop [--qds-component-combobox-hint-color-content-rest] - Hint color.
 * @cssprop [--qds-component-combobox-error-color-content-rest] - Error message color.
 * @cssprop [--qds-component-combobox-control-padding-block] - Control vertical padding.
 * @cssprop [--qds-component-combobox-control-padding-inline] - Control horizontal padding.
 * @cssprop [--qds-component-combobox-control-font-size] - Text size, in the box and the list.
 * @cssprop [--qds-component-combobox-control-line-height] - Line height, in the box and the list.
 * @cssprop [--qds-component-combobox-control-border-radius] - Control corner radius.
 * @cssprop [--qds-component-combobox-control-border-width] - Control border thickness.
 * @cssprop [--qds-component-combobox-control-color-background-{state}] - Control fill: `rest`, `disabled`.
 * @cssprop [--qds-component-combobox-control-color-border-{state}] - Control border: `rest`, `focus`, `disabled`.
 * @cssprop [--qds-component-combobox-control-color-content-{state}] - Text: `rest`, `disabled`.
 * @cssprop [--qds-component-combobox-invalid-color-border-rest] - Control border while showing an error.
 * @cssprop [--qds-component-combobox-placeholder-color-content-rest] - Placeholder text.
 * @cssprop [--qds-component-combobox-icon-color-content-rest] - Chevron color.
 * @cssprop [--qds-component-combobox-listbox-gap] - Distance between the field and the list.
 * @cssprop [--qds-component-combobox-listbox-padding] - Space between the list's edge and its options.
 * @cssprop [--qds-component-combobox-listbox-border-radius] - List corner radius.
 * @cssprop [--qds-component-combobox-listbox-border-width] - List border thickness.
 * @cssprop [--qds-component-combobox-listbox-box-shadow] - List elevation.
 * @cssprop [--qds-component-combobox-listbox-color-background-rest] - List fill.
 * @cssprop [--qds-component-combobox-listbox-color-border-rest] - List border.
 * @cssprop [--qds-component-combobox-option-gap] - Space between an option's check mark and text.
 * @cssprop [--qds-component-combobox-option-padding-block] - Option vertical padding.
 * @cssprop [--qds-component-combobox-option-padding-inline] - Option horizontal padding.
 * @cssprop [--qds-component-combobox-option-border-radius] - Option corner radius.
 * @cssprop [--qds-component-combobox-option-color-background-hover] - The highlighted option's fill.
 * @cssprop [--qds-component-combobox-option-color-content-{state}] - Option text: `rest`, `disabled`.
 * @cssprop [--qds-component-combobox-option-icon-color-content-rest] - The chosen option's check mark.
 * @cssprop [--qds-component-combobox-empty-color-content-rest] - The "No matches" message.
 */
@customElement('qds-combobox')
export class QdsCombobox extends QdsElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...QdsElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    panelStyles,
    css`
      :host {
        display: block;

        --_border: var(--qds-component-combobox-control-color-border-rest, #64748b);
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-combobox-gap, 0.25rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
      }

      label {
        font-size: var(--qds-component-combobox-label-font-size, 0.875rem);
        font-weight: var(--qds-component-combobox-label-font-weight, 500);
        color: var(--qds-component-combobox-label-color-content-rest, #0f172a);
      }

      .required {
        margin-inline-start: 0.125em;
        color: var(--qds-component-combobox-error-color-content-rest, #b91c1c);
      }

      .control {
        position: relative;
        display: flex;
        align-items: center;

        font-size: var(--qds-component-combobox-control-font-size, 0.875rem);
        line-height: var(--qds-component-combobox-control-line-height, 1.5);
        color: var(--qds-component-combobox-control-color-content-rest, #0f172a);

        background-color: var(--qds-component-combobox-control-color-background-rest, #f8fafc);
        border: var(--qds-component-combobox-control-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-combobox-control-border-radius, 0.375rem);

        transition: border-color var(--qds-component-combobox-duration, 120ms);
      }

      .invalid .control {
        --_border: var(--qds-component-combobox-invalid-color-border-rest, #dc2626);
      }

      .control:focus-within {
        border-color: var(--qds-component-combobox-control-color-border-focus, #2563eb);
        outline: var(--_focus-ring);
        outline-offset: 0.0625rem;
      }

      input {
        flex: 1;
        min-width: 0;
        margin: 0;
        /* Room on the end for the chevron. */
        padding: var(--qds-component-combobox-control-padding-block, 0.5rem)
          calc(var(--qds-component-combobox-control-padding-inline, 0.75rem) * 2 + 1rem)
          var(--qds-component-combobox-control-padding-block, 0.5rem)
          var(--qds-component-combobox-control-padding-inline, 0.75rem);

        font: inherit;
        color: inherit;
        background: none;
        border: 0;
        border-radius: inherit;
        outline: none;
      }

      input::placeholder {
        color: var(--qds-component-combobox-placeholder-color-content-rest, #64748b);
        opacity: 1;
      }

      .icon {
        position: absolute;
        inset-inline-end: var(--qds-component-combobox-control-padding-inline, 0.75rem);
        color: var(--qds-component-combobox-icon-color-content-rest, #64748b);
        pointer-events: none;
        transition: rotate var(--qds-component-combobox-duration, 120ms);
      }

      .open .icon {
        rotate: 180deg;
      }

      .panel {
        max-height: min(20rem, calc(100vh - 1rem));
        overflow-y: auto;
        padding: var(--qds-component-combobox-listbox-padding, 0.25rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-combobox-control-font-size, 0.875rem);
        line-height: var(--qds-component-combobox-control-line-height, 1.5);

        background-color: var(--qds-component-combobox-listbox-color-background-rest, #f8fafc);
        border: var(--qds-component-combobox-listbox-border-width, 0.0625rem) solid
          var(--qds-component-combobox-listbox-color-border-rest, #e2e8f0);
        border-radius: var(--qds-component-combobox-listbox-border-radius, 0.375rem);
        box-shadow: var(--qds-component-combobox-listbox-box-shadow, 0 4px 12px rgb(0 0 0 / 0.15));
      }

      .option {
        display: flex;
        align-items: center;
        gap: var(--qds-component-combobox-option-gap, 0.5rem);
        padding: var(--qds-component-combobox-option-padding-block, 0.5rem)
          var(--qds-component-combobox-option-padding-inline, 0.75rem);
        color: var(--qds-component-combobox-option-color-content-rest, #0f172a);
        border-radius: var(--qds-component-combobox-option-border-radius, 0.125rem);
        cursor: pointer;
      }

      .option.active {
        background-color: var(--qds-component-combobox-option-color-background-hover, #f1f5f9);
      }

      .option[aria-disabled='true'] {
        color: var(--qds-component-combobox-option-color-content-disabled, #64748b);
        cursor: not-allowed;
      }

      .check {
        flex: none;
        color: var(--qds-component-combobox-option-icon-color-content-rest, #1d4ed8);
        visibility: hidden;
      }

      .option[aria-selected='true'] .check {
        visibility: visible;
      }

      .empty {
        margin: 0;
        padding: var(--qds-component-combobox-option-padding-block, 0.5rem)
          var(--qds-component-combobox-option-padding-inline, 0.75rem);
        color: var(--qds-component-combobox-empty-color-content-rest, #64748b);
      }

      .hint,
      .error {
        font-size: var(--qds-component-combobox-hint-font-size, 0.75rem);
      }

      .hint {
        color: var(--qds-component-combobox-hint-color-content-rest, #64748b);
      }

      .error {
        color: var(--qds-component-combobox-error-color-content-rest, #b91c1c);
      }

      :host(:disabled) label {
        color: var(--qds-component-combobox-label-color-content-disabled, #64748b);
      }

      :host(:disabled) .control {
        color: var(--qds-component-combobox-control-color-content-disabled, #64748b);
        background-color: var(--qds-component-combobox-control-color-background-disabled, #f1f5f9);
        border-color: var(--qds-component-combobox-control-color-border-disabled, #e2e8f0);
      }

      :host(:disabled) input {
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        .control,
        .icon {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        .control {
          border-color: FieldText;
        }

        .panel {
          border-color: CanvasText;
        }

        .option.active {
          outline: 2px solid Highlight;
          outline-offset: -2px;
        }
      }
    `,
  ];

  /** The visible label. Also the text box's accessible name. */
  @property()
  label = '';

  /** Help text shown under the field, and read out with it. */
  @property()
  hint = '';

  /**
   * An error message to show, for errors the browser cannot detect. Shown
   * immediately, and marks the field invalid, but does not block form submission.
   */
  @property()
  error = '';

  /** The chosen option's value, or empty. The `value` attribute sets the initial value, restored on form reset. */
  @property()
  value = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Text shown in the empty box: "Search countries". */
  @property()
  placeholder = '';

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Makes the form invalid until an option is chosen. */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Whether the list of options is open. */
  @property({ type: Boolean, reflect: true })
  open = false;

  @query('input')
  private readonly input!: HTMLInputElement;

  @query('.panel')
  private readonly panel!: HTMLElement;

  @query('.control')
  private readonly control!: HTMLElement;

  @state()
  private options: Option[] = [];

  /** The text in the box. */
  @state()
  private text = '';

  /** Whether the list is narrowed to the text: after typing, not when opened by key or click. */
  @state()
  private filtering = false;

  /** The highlighted option, as an index into the shown options; -1 for none. */
  @state()
  private active = -1;

  @state()
  private formDisabled = false;

  @state()
  private touched = false;

  @state()
  private hasHintSlot = false;

  #defaultValue = '';
  #observer: MutationObserver | null = null;
  #stopTracking: (() => void) | null = null;
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.addEventListener('invalid', () => (this.touched = true));
    this.addEventListener('focusout', this.#onFocusout);
  }

  /** The form this combobox belongs to, if any. */
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
    this.#stopListening();
  }

  protected override firstUpdated(): void {
    // A later update, as in qds-select: a server-rendered element's first client
    // update adopts the server's DOM, which cannot have read the options.
    void this.updateComplete.then(() => {
      this.hasHintSlot = this.querySelector(':scope > [slot="hint"]') !== null;
      this.#readOptions();
      if (!this.hasAttribute('value') && this.value === '') {
        this.value = this.querySelector<HTMLOptionElement>(':scope > option[selected]')?.value ?? '';
      }
      this.#defaultValue = this.value;
      this.text = this.#labelOf(this.value);
    });
  }

  #readOptions(): void {
    this.options = [...this.querySelectorAll<HTMLOptionElement>(':scope > option')].map((option) => ({
      value: option.value,
      label: option.label || option.text,
      disabled: option.disabled,
    }));
  }

  #labelOf(value: string): string {
    return this.options.find((option) => option.value === value)?.label ?? '';
  }

  /** The options shown: all of them, or those containing the text while filtering. */
  get #shown(): Option[] {
    const query = this.text.trim().toLowerCase();
    if (!this.filtering || !query) return this.options;
    return this.options.filter((option) => option.label.toLowerCase().includes(query));
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('value')) {
      this.#internals.setFormValue(this.value || null);
      // A value set from code shows its option's name, unless the user is typing.
      if (!this.filtering) this.text = this.#labelOf(this.value);
    }
    if (changed.has('options') && !this.filtering) this.text = this.#labelOf(this.value);
    if (changed.has('value') || changed.has('required') || changed.has('options')) this.#syncValidity();
  }

  #syncValidity(): void {
    if (this.required && !this.value) {
      this.#internals.setValidity(
        { valueMissing: true },
        'Choose an option from the list.',
        this.renderRoot?.querySelector('input') ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('open')) {
      if (this.open) {
        showPanel(this.panel);
        this.#place();
        this.#stopTracking = whileOpen(this.control, this.panel, () => this.#place());
        document.addEventListener('pointerdown', this.#onDocumentPointerdown, true);
      } else if (changed.get('open') !== undefined) {
        hidePanel(this.panel);
        this.#stopListening();
      }
    }
    if (this.open && (changed.has('active') || changed.has('text'))) {
      this.renderRoot.querySelector('.option.active')?.scrollIntoView({ block: 'nearest' });
    }
  }

  #stopListening(): void {
    this.#stopTracking?.();
    this.#stopTracking = null;
    document.removeEventListener('pointerdown', this.#onDocumentPointerdown, true);
  }

  #place(): void {
    // As wide as the field, at least.
    this.panel.style.minWidth = `${this.control.getBoundingClientRect().width}px`;
    placePanel(this.control, this.panel, {
      side: 'bottom',
      align: 'start',
      gap: lengthOf(this, '--qds-component-combobox-listbox-gap', 4),
    });
  }

  #onDocumentPointerdown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) this.#close();
  };

  /** Leaving the field closes the list and settles the text. */
  #onFocusout = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next === this || (next && this.contains(next))) return;
    this.#close();
    this.#commitText();
    this.touched = true;
  };

  /** Opens the list, highlighting the chosen option, or the first or last. */
  #openList(highlight: 'chosen' | 'first' | 'last' | 'none'): void {
    if (this.disabled || this.formDisabled) return;
    this.filtering = false;
    const shown = this.options;
    const chosen = shown.findIndex((option) => option.value === this.value);
    this.active =
      highlight === 'none'
        ? chosen
        : highlight === 'last'
          ? this.#nextEnabled(shown, shown.length, -1)
          : highlight === 'chosen' && chosen !== -1
            ? chosen
            : this.#nextEnabled(shown, -1, 1);
    this.open = true;
  }

  #close(): void {
    this.open = false;
    this.active = -1;
  }

  /** The next enabled option from `from` in `direction`, wrapping; -1 if there is none. */
  #nextEnabled(shown: Option[], from: number, direction: 1 | -1): number {
    for (let step = 1; step <= shown.length; step++) {
      const index = (((from + direction * step) % shown.length) + shown.length) % shown.length;
      if (!shown[index]!.disabled) return index;
    }
    return -1;
  }

  #choose(option: Option): void {
    if (option.disabled) return;
    this.filtering = false;
    this.text = option.label;
    this.#close();
    this.#setValue(option.value);
  }

  #setValue(value: string): void {
    this.touched = true;
    if (value === this.value) return;
    this.value = value;
    // Synchronously, so a qds-change listener reading FormData or validity sees the new state.
    this.#internals.setFormValue(this.value || null);
    this.#syncValidity();
    this.dispatchEvent(new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  /** Settles typed text: an exact name chooses its option, empty clears, anything else is undone. */
  #commitText(): void {
    if (!this.filtering) return;
    this.filtering = false;
    const typed = this.text.trim().toLowerCase();
    if (!typed) {
      this.text = '';
      this.#setValue('');
      return;
    }
    const match = this.options.find((option) => !option.disabled && option.label.toLowerCase() === typed);
    if (match) {
      this.text = match.label;
      this.#setValue(match.value);
    } else {
      this.text = this.#labelOf(this.value);
    }
  }

  #onInput(): void {
    this.text = this.input.value;
    this.filtering = true;
    const shown = this.#shown;
    this.active = this.text.trim() ? this.#nextEnabled(shown, -1, 1) : -1;
    this.open = true;
  }

  #onKeydown(event: KeyboardEvent): void {
    const shown = this.#shown;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open) this.#openList(event.altKey ? 'none' : 'chosen');
        else if (!event.altKey) this.active = this.#nextEnabled(shown, this.active, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) this.#close();
        else if (!this.open) this.#openList('last');
        else this.active = this.#nextEnabled(shown, this.active === -1 ? shown.length : this.active, -1);
        break;
      case 'Enter':
        if (this.open && shown[this.active]) {
          event.preventDefault();
          this.#choose(shown[this.active]!);
        } else if (this.open) {
          event.preventDefault();
          this.#close();
          this.#commitText();
        }
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          event.stopPropagation();
          this.#close();
        }
        break;
      default:
    }
  }

  #onOptionClick(option: Option): void {
    this.#choose(option);
    this.input.focus();
  }

  override render(): TemplateResult {
    const error = this.error || (this.touched && this.required && !this.value ? 'Choose an option from the list.' : '');
    const hasHint = Boolean(this.hint) || this.hasHintSlot;
    const describedBy = [hasHint ? 'hint' : '', error ? 'error' : ''].filter(Boolean).join(' ');
    const shown = this.#shown;
    const classes = ['base', error ? 'invalid' : '', this.open ? 'open' : ''].filter(Boolean).join(' ');

    return html`
      <div class=${classes} part="base">
        <label id="label" for="input" part="label">
          <slot name="label">${this.label}</slot>
          ${this.required ? html`<span class="required" aria-hidden="true">*</span>` : nothing}
        </label>
        <div class="control" part="control" @click=${() => !this.open && this.#openList('chosen')}>
          <input
            id="input"
            part="input"
            type="text"
            role="combobox"
            autocomplete="off"
            spellcheck="false"
            aria-autocomplete="list"
            aria-controls="listbox"
            aria-expanded=${String(this.open)}
            aria-activedescendant=${this.open && shown[this.active] ? `option-${this.active}` : nothing}
            aria-describedby=${describedBy || nothing}
            aria-invalid=${error ? 'true' : nothing}
            aria-required=${this.required ? 'true' : nothing}
            placeholder=${this.placeholder || nothing}
            .value=${live(this.text)}
            ?disabled=${this.disabled || this.formDisabled}
            @input=${this.#onInput}
            @keydown=${this.#onKeydown}
          />
          <qds-icon class="icon" part="icon" name="chevron-down" size="sm"></qds-icon>
        </div>
        <div
          class="panel"
          popover="manual"
          @pointerdown=${(event: PointerEvent) => event.preventDefault()}
        >
          <div id="listbox" role="listbox" part="listbox" aria-labelledby="label">
            ${shown.map(
              (option, index) => html`
                <div
                  id="option-${index}"
                  class=${index === this.active ? 'option active' : 'option'}
                  part="option"
                  role="option"
                  aria-selected=${String(option.value === this.value && this.value !== '')}
                  aria-disabled=${option.disabled ? 'true' : nothing}
                  @pointermove=${() => !option.disabled && (this.active = index)}
                  @click=${() => this.#onOptionClick(option)}
                >
                  <qds-icon class="check" name="check" size="sm"></qds-icon>
                  <span>${option.label}</span>
                </div>
              `,
            )}
          </div>
          ${shown.length === 0 ? html`<p class="empty" role="status">No matches</p>` : nothing}
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

  /** Called by the form on reset: restore the declared value and hide messages again. */
  formResetCallback(): void {
    this.filtering = false;
    this.value = this.#defaultValue;
    this.text = this.#labelOf(this.value);
    this.touched = false;
    this.#close();
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    if (disabled) this.#close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-combobox': QdsCombobox;
  }
}
