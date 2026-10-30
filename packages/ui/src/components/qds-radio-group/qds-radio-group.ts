import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import { QdsRadio } from '../qds-radio/qds-radio.js';

export type QdsRadioGroupOrientation = 'block' | 'inline';

/**
 * A set of `qds-radio` options, of which at most one is chosen.
 *
 * The group owns everything that makes radios a group: the value, form
 * submission, required validation, and keyboard navigation. Tab moves into the
 * group and lands on the chosen option (or the first, if none is chosen); arrow
 * keys then move between options and choose as they go, following the ARIA
 * radio group pattern.
 *
 * @element qds-radio-group
 *
 * @slot - The `qds-radio` options.
 * @slot label - The group label, in place of the `label` attribute when it needs markup.
 *
 * @fires {CustomEvent<{ value: string }>} qds-change - Fired when the user
 * chooses an option. Not fired for programmatic changes.
 *
 * @csspart base - The element carrying the radiogroup role.
 * @csspart label - The group label.
 * @csspart options - The wrapper around the options.
 *
 * @cssprop [--qds-component-radio-group-gap] - Space between options.
 * @cssprop [--qds-component-radio-group-font-size] - Group label size.
 * @cssprop [--qds-component-radio-group-font-weight] - Group label weight.
 * @cssprop [--qds-component-radio-group-color-content-rest] - Group label color.
 */
@customElement('qds-radio-group')
export class QdsRadioGroup extends QdsElement {
  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
      }

      .label {
        margin-block-end: var(--qds-component-radio-group-gap, 0.5rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-radio-group-font-size, 0.875rem);
        font-weight: var(--qds-component-radio-group-font-weight, 600);
        color: var(--qds-component-radio-group-color-content-rest, #0f172a);
      }

      .options {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--qds-component-radio-group-gap, 0.5rem);
      }

      :host([orientation='inline']) .options {
        flex-direction: row;
        flex-wrap: wrap;
        column-gap: calc(var(--qds-component-radio-group-gap, 0.5rem) * 2);
      }
    `,
  ];

  /** The chosen option's value, or an empty string when none is chosen. */
  @property()
  value = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Visible group label. Also the group's accessible name. */
  @property()
  label = '';

  /** Makes the form invalid until an option is chosen. */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Disables every option. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Lays the options out in a column (`block`) or a row (`inline`). */
  @property({ reflect: true })
  orientation: QdsRadioGroupOrientation = 'block';

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  private formDisabled = false;

  @state()
  private hasLabelSlot = false;

  readonly #internals: ElementInternals;

  /** The value restored on form reset, captured from the markup on first sync. */
  #defaultValue: string | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.addEventListener('qds-radio-select', this.#handleSelect);
    this.addEventListener('keydown', this.#handleKeydown);
  }

  /** The form this group belongs to, if any. */
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

  /**
   * This group's radios: every qds-radio inside it, however deeply wrapped for
   * layout, except those that belong to a group nested inside this one.
   */
  get #radios(): QdsRadio[] {
    return ([...this.querySelectorAll('qds-radio')] as QdsRadio[]).filter(
      (radio) => radio.closest('qds-radio-group') === this,
    );
  }

  get #enabledRadios(): QdsRadio[] {
    return this.#radios.filter((radio) => !radio.disabled);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('value')) {
      this.#internals.setFormValue(this.value || null);
    }
  }

  protected override firstUpdated(): void {
    // Not left to slotchange alone. When the docs site server-renders this into
    // declarative shadow DOM, the radios are already assigned to the slot before
    // the element hydrates, so slotchange never fires and nothing would sync.
    //
    // After updateComplete, because the first client update of a server-rendered
    // element adopts the existing DOM rather than writing to it: a label-slot
    // change made during it would silently not be applied.
    void this.updateComplete.then(() => {
      this.hasLabelSlot = this.querySelector(':scope > [slot="label"]') !== null;
      this.#captureDefault();
    });
  }

  protected override updated(): void {
    // Syncing before the default is captured would uncheck every radio while the
    // value is still empty, erasing a `checked` attribute in the markup before
    // #captureDefault gets the chance to read it.
    if (this.#defaultValue !== null) this.#syncRadios();
  }

  /** Called by the form on reset. */
  formResetCallback(): void {
    this.value = this.#defaultValue ?? '';
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  /**
   * Adopt a radio's `checked` attribute as the initial value, so markup can mark
   * the default on the option itself. The group's own value wins. Runs once, as
   * soon as there are radios to read: when the parser upgrades the group before
   * reaching its children, the first slotchange is what finds them.
   */
  #captureDefault(): void {
    const radios = this.#radios;
    if (this.#defaultValue !== null || radios.length === 0) return;
    if (!this.value) {
      this.value = radios.find((radio) => radio.hasAttribute('checked'))?.value ?? '';
    }
    this.#defaultValue = this.value;
    this.#syncRadios();
  }

  #handleSlotChange(): void {
    this.#captureDefault();
    if (this.#defaultValue !== null) this.#syncRadios();
  }

  #syncRadios(): void {
    const groupDisabled = this.disabled || this.formDisabled;
    const radios = this.#radios;

    for (const radio of radios) {
      radio.checked = this.value !== '' && radio.value === this.value;
      radio.groupDisabled = groupDisabled;
    }

    // Roving tabindex: exactly one option is in the tab order — the chosen one,
    // or the first enabled one when nothing is chosen yet.
    const tabbable = groupDisabled
      ? undefined
      : (radios.find((radio) => radio.checked && !radio.disabled) ?? this.#enabledRadios[0]);
    for (const radio of radios) {
      radio.tabIndex = radio === tabbable ? 0 : -1;
    }

    const anchor = radios[0];
    if (this.required && !this.value) {
      this.#internals.setValidity({ valueMissing: true }, 'Select one of these options.', anchor);
    } else {
      this.#internals.setValidity({});
    }
  }

  #choose(radio: QdsRadio): void {
    if (radio.value === this.value) return;
    this.value = radio.value;
    // Synchronously, not left to willUpdate and updated: a qds-change listener
    // reading FormData or validity would otherwise see the previous state.
    this.#internals.setFormValue(this.value);
    this.#syncRadios();
    this.dispatchEvent(
      new CustomEvent('qds-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleSelect = (event: Event): void => {
    if (this.disabled || this.formDisabled) return;
    const radio = event.target as QdsRadio;
    // A nested group's radio bubbles its event up through this one too.
    if (!this.#radios.includes(radio)) return;
    this.#choose(radio);
    radio.focus();
  };

  #handleKeydown = (event: KeyboardEvent): void => {
    if (this.disabled || this.formDisabled) return;
    // Alt+Left is the browser's Back; leave every modified key to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const radios = this.#enabledRadios;
    const current = radios.indexOf(event.target as QdsRadio);
    if (current === -1) return;

    // Left and Right follow the visual order, which reverses under RTL.
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward = (current + 1) % radios.length;
    const backward = (current - 1 + radios.length) % radios.length;

    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = forward;
        break;
      case 'ArrowUp':
        next = backward;
        break;
      case 'ArrowRight':
        next = rtl ? backward : forward;
        break;
      case 'ArrowLeft':
        next = rtl ? forward : backward;
        break;
      case ' ':
        next = current;
        break;
      default:
        return;
    }

    // Arrow keys and Space would otherwise scroll the page.
    event.preventDefault();
    const radio = radios[next]!;
    this.#choose(radio);
    radio.focus();
  };

  override render(): TemplateResult {
    const labelled = this.label || this.hasLabelSlot;
    return html`
      <div
        part="base"
        role="radiogroup"
        aria-labelledby=${labelled ? 'label' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-disabled=${this.disabled || this.formDisabled ? 'true' : nothing}
      >
        <div id="label" class="label" part="label" ?hidden=${!labelled}>
          <slot
            name="label"
            @slotchange=${(event: Event) => {
              this.hasLabelSlot = (event.target as HTMLSlotElement).assignedNodes().length > 0;
            }}
            >${this.label}</slot
          >
        </div>
        <div class="options" part="options">
          <slot @slotchange=${this.#handleSlotChange}></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-radio-group': QdsRadioGroup;
  }
}
