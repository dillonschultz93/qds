import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import { QdsCheckbox } from '../qds-checkbox/qds-checkbox.js';

export type QdsCheckboxGroupOrientation = 'block' | 'inline';

/**
 * A set of `qds-checkbox` options, of which any number may be chosen, under one
 * label.
 *
 * What it adds to the checkboxes inside it is what a set of them has had no way
 * to say: a group label that names them together, a hint, "choose at least one"
 * (`required`), and an error for the group as a whole. Each checkbox still
 * submits its own value; a `name` on the group is given to every checkbox
 * without one, so a set of choices submits as one field with many values.
 *
 * The checkboxes' own `qds-change` events stop at the group, which fires one
 * `qds-change` of its own with every chosen value — one event to listen to for
 * the set.
 *
 * @element qds-checkbox-group
 *
 * @slot - The `qds-checkbox` options.
 * @slot label - The group label, in place of the `label` attribute when it needs markup.
 * @slot hint - The hint, in place of the `hint` attribute when it needs markup.
 *
 * @fires {CustomEvent<{ value: string[] }>} qds-change - Fired when the user
 * checks or unchecks an option, with the values of all the checked ones.
 *
 * @csspart base - The element carrying the group role.
 * @csspart label - The group label.
 * @csspart options - The wrapper around the options.
 * @csspart hint - The hint text.
 * @csspart error - The error message.
 *
 * @cssprop [--qds-component-checkbox-group-gap] - Space between options, and around the label and messages.
 * @cssprop [--qds-component-checkbox-group-label-font-size] - Group label size.
 * @cssprop [--qds-component-checkbox-group-label-font-weight] - Group label weight.
 * @cssprop [--qds-component-checkbox-group-label-color-content-{state}] - Group label color: `rest`, `disabled`.
 * @cssprop [--qds-component-checkbox-group-hint-font-size] - Hint and error size.
 * @cssprop [--qds-component-checkbox-group-hint-color-content-rest] - Hint color.
 * @cssprop [--qds-component-checkbox-group-error-color-content-rest] - Error message color.
 */
@customElement('qds-checkbox-group')
export class QdsCheckboxGroup extends QdsElement {
  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-checkbox-group-gap, 0.5rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
      }

      .label {
        font-size: var(--qds-component-checkbox-group-label-font-size, 0.875rem);
        font-weight: var(--qds-component-checkbox-group-label-font-weight, 600);
        color: var(--qds-component-checkbox-group-label-color-content-rest, #0f172a);
      }

      .required {
        margin-inline-start: 0.125em;
        color: var(--qds-component-checkbox-group-error-color-content-rest, #b91c1c);
      }

      .options {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--qds-component-checkbox-group-gap, 0.5rem);
      }

      :host([orientation='inline']) .options {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--qds-component-checkbox-group-gap, 0.5rem) calc(var(--qds-component-checkbox-group-gap, 0.5rem) * 3);
      }

      .hint,
      .error {
        font-size: var(--qds-component-checkbox-group-hint-font-size, 0.75rem);
      }

      .hint {
        color: var(--qds-component-checkbox-group-hint-color-content-rest, #64748b);
      }

      .error {
        color: var(--qds-component-checkbox-group-error-color-content-rest, #b91c1c);
      }

      :host([disabled]) .label {
        color: var(--qds-component-checkbox-group-label-color-content-disabled, #64748b);
      }
    `,
  ];

  /** The group label: names the set for every checkbox in it. */
  @property()
  label = '';

  /** Help text under the options, read out with the group. */
  @property()
  hint = '';

  /** An error message to show for the group, such as a server-side check. Shown immediately. */
  @property()
  error = '';

  /** Requires at least one option to be checked. */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Disables every option in the group. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Given to every checkbox in the group that has no `name` of its own. */
  @property()
  name = '';

  /** Options in a column (`block`) or a wrapping row (`inline`). */
  @property({ reflect: true })
  orientation: QdsCheckboxGroupOrientation = 'block';

  /** Whether the required message may show: after a change, or a submit attempt. */
  @state()
  private touched = false;

  /** The required message, kept as state so the field re-renders when it changes. */
  @state()
  private validationMessage = '';

  @state()
  private hasLabelSlot = false;

  @state()
  private hasHintSlot = false;

  /** The checkboxes' own disabled state, kept while the group disables them. */
  readonly #ownDisabled = new WeakMap<QdsCheckbox, boolean>();
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.addEventListener('invalid', () => (this.touched = true));
    this.addEventListener('qds-change', this.#onCheckboxChange);
  }

  /** The checkboxes in the group, in order. */
  get checkboxes(): QdsCheckbox[] {
    return [...this.querySelectorAll('qds-checkbox')].filter((box): box is QdsCheckbox => box instanceof QdsCheckbox);
  }

  /** The values of the checked options. */
  get value(): string[] {
    return this.checkboxes.filter((box) => box.checked).map((box) => box.value);
  }

  /** The form this group belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** Same as the native `checkValidity()`. */
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  /** Same as the native `reportValidity()`, and shows the group's message. */
  reportValidity(): boolean {
    this.touched = true;
    return this.#internals.reportValidity();
  }

  /** Same as the native `validity`. */
  get validity(): ValidityState {
    return this.#internals.validity;
  }

  protected override firstUpdated(): void {
    // As in qds-text-field: slotchange never fires for server-rendered content.
    void this.updateComplete.then(() => {
      this.hasLabelSlot = this.querySelector(':scope > [slot="label"]') !== null;
      this.hasHintSlot = this.querySelector(':scope > [slot="hint"]') !== null;
      this.#syncCheckboxes();
    });
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('disabled') || changed.has('name')) this.#syncCheckboxes();
    this.#syncValidity();
  }

  /** Passes the group's name and disabled state to its checkboxes. */
  #syncCheckboxes(): void {
    for (const box of this.checkboxes) {
      // The attribute, not the property: a form-associated element submits
      // under its name attribute.
      if (this.name && !box.hasAttribute('name')) box.setAttribute('name', this.name);
      if (this.disabled) {
        if (!this.#ownDisabled.has(box)) this.#ownDisabled.set(box, box.disabled);
        box.disabled = true;
      } else if (this.#ownDisabled.has(box)) {
        box.disabled = this.#ownDisabled.get(box)!;
        this.#ownDisabled.delete(box);
      }
    }
    this.#syncValidity();
  }

  #syncValidity(): void {
    const first = this.checkboxes[0];
    if (this.required && !this.disabled && this.value.length === 0 && first) {
      this.#internals.setValidity({ valueMissing: true }, 'Select at least one option.', first);
    } else {
      this.#internals.setValidity({});
    }
    // Only on a change, so syncing from updated() does not schedule another update.
    if (this.validationMessage !== this.#internals.validationMessage) {
      this.validationMessage = this.#internals.validationMessage;
    }
  }

  #onCheckboxChange = (event: Event): void => {
    // Our own event, re-dispatched below, passes through untouched.
    if (event.target === this) return;
    event.stopPropagation();
    this.touched = true;
    this.#syncValidity();
    this.dispatchEvent(
      new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }),
    );
  };

  /** Called by the form on reset. */
  formResetCallback(): void {
    this.touched = false;
  }

  override render(): TemplateResult {
    const labeled = Boolean(this.label) || this.hasLabelSlot;
    const hasHint = Boolean(this.hint) || this.hasHintSlot;
    const error = this.error || (this.touched ? this.validationMessage : '');
    const describedBy = [hasHint ? 'hint' : '', error ? 'error' : ''].filter(Boolean).join(' ');

    return html`
      <div
        class="base"
        part="base"
        role="group"
        aria-labelledby=${labeled ? 'label' : nothing}
        aria-describedby=${describedBy || nothing}
        aria-invalid=${error ? 'true' : nothing}
      >
        <div id="label" class="label" part="label" ?hidden=${!labeled}>
          <slot
            name="label"
            @slotchange=${(event: Event) => {
              this.hasLabelSlot = (event.target as HTMLSlotElement).assignedNodes().length > 0;
            }}
            >${this.label}</slot
          >${this.required ? html`<span class="required" aria-hidden="true">*</span>` : nothing}
        </div>
        <div class="options" part="options">
          <slot @slotchange=${this.#syncCheckboxes}></slot>
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
    'qds-checkbox-group': QdsCheckboxGroup;
  }
}
