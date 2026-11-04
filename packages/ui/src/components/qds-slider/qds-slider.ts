import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * A slider, for choosing a number from a range where the rough position matters
 * more than the exact figure: volume, a price ceiling, a zoom level.
 *
 * ```html
 * <qds-slider label="Volume" name="volume" value="40" show-value></qds-slider>
 * ```
 *
 * A native range input sits inside, so the keyboard works as it does everywhere:
 * the arrow keys move by one `step`, Page Up and Page Down by larger jumps, Home
 * and End to the ends. Screen readers announce it as a slider with its label
 * and value. `show-value` writes the value beside the label for everyone.
 *
 * When the exact number matters, or the range is large, a number input is
 * easier to use; a slider suits a value people judge by eye.
 *
 * @element qds-slider
 *
 * @slot label - The label, in place of the `label` attribute when it needs markup.
 * @slot hint - The hint, in place of the `hint` attribute when it needs markup.
 *
 * @fires {CustomEvent<{ value: number }>} qds-input - Fired continuously while the value changes.
 * @fires {CustomEvent<{ value: number }>} qds-change - Fired when the user lets go, or after a key press.
 *
 * @csspart base - The wrapper around the whole field.
 * @csspart label - The label element.
 * @csspart value - The value shown beside the label.
 * @csspart input - The native range input.
 * @csspart hint - The hint text.
 *
 * @cssprop [--qds-component-slider-gap] - Space between the label, slider, and hint.
 * @cssprop [--qds-component-slider-duration] - Color transition duration.
 * @cssprop [--qds-component-slider-label-font-size] - Label and value size.
 * @cssprop [--qds-component-slider-label-font-weight] - Label weight.
 * @cssprop [--qds-component-slider-label-color-content-{state}] - Label color: `rest`, `disabled`.
 * @cssprop [--qds-component-slider-value-color-content-rest] - Value color.
 * @cssprop [--qds-component-slider-hint-font-size] - Hint size.
 * @cssprop [--qds-component-slider-hint-color-content-rest] - Hint color.
 * @cssprop [--qds-component-slider-track-height] - Track thickness.
 * @cssprop [--qds-component-slider-track-border-radius] - Track corner radius.
 * @cssprop [--qds-component-slider-track-color-background-{state}] - Track fill: `rest`, `disabled`.
 * @cssprop [--qds-component-slider-fill-color-background-{state}] - The track below the value: `rest`, `hover`, `disabled`.
 * @cssprop [--qds-component-slider-thumb-width] - Thumb width.
 * @cssprop [--qds-component-slider-thumb-height] - Thumb height.
 * @cssprop [--qds-component-slider-thumb-border-width] - Thumb border thickness.
 * @cssprop [--qds-component-slider-thumb-box-shadow] - Thumb elevation.
 * @cssprop [--qds-component-slider-thumb-color-background-rest] - Thumb fill.
 * @cssprop [--qds-component-slider-thumb-color-border-{state}] - Thumb border: `rest`, `disabled`.
 */
@customElement('qds-slider')
export class QdsSlider extends QdsElement {
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

        --_track: var(--qds-component-slider-track-color-background-rest, #e2e8f0);
        --_fill: var(--qds-component-slider-fill-color-background-rest, #2563eb);
        --_thumb-border: var(--qds-component-slider-thumb-color-border-rest, #2563eb);
        --_thumb-width: var(--qds-component-slider-thumb-width, 1rem);
        --_thumb-height: var(--qds-component-slider-thumb-height, 1rem);
        --_track-height: var(--qds-component-slider-track-height, 0.25rem);
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-slider-gap, 0.5rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--qds-component-slider-gap, 0.5rem);
        font-size: var(--qds-component-slider-label-font-size, 0.875rem);
      }

      label {
        font-weight: var(--qds-component-slider-label-font-weight, 500);
        color: var(--qds-component-slider-label-color-content-rest, #0f172a);
      }

      .value {
        color: var(--qds-component-slider-value-color-content-rest, #64748b);
        font-variant-numeric: tabular-nums;
      }

      input {
        width: 100%;
        height: var(--_thumb-height);
        margin: 0;
        background: transparent;
        cursor: pointer;
        appearance: none;
      }

      input:hover {
        --_fill: var(--qds-component-slider-fill-color-background-hover, #1d4ed8);
      }

      input:focus {
        outline: none;
      }

      /*
       * The two engines style a range input through different pseudo-elements,
       * and a selector list holding both is dropped whole by each, so the rules
       * are written twice. The filled part is a gradient stop at --_percent.
       */
      input::-webkit-slider-runnable-track {
        height: var(--_track-height);
        border-radius: var(--qds-component-slider-track-border-radius, 9999px);
        background: linear-gradient(
          to right,
          var(--_fill) var(--_percent, 0%),
          var(--_track) var(--_percent, 0%)
        );
        transition: background var(--qds-component-slider-duration, 120ms);
      }

      input::-moz-range-track {
        height: var(--_track-height);
        border-radius: var(--qds-component-slider-track-border-radius, 9999px);
        background: var(--_track);
      }

      input::-moz-range-progress {
        height: var(--_track-height);
        border-radius: var(--qds-component-slider-track-border-radius, 9999px);
        background: var(--_fill);
      }

      input::-webkit-slider-thumb {
        width: var(--_thumb-width);
        height: var(--_thumb-height);
        /* Centered on the track, whose height the thumb's position is measured from. */
        margin-top: calc((var(--_track-height) - var(--_thumb-height)) / 2);
        background-color: var(--qds-component-slider-thumb-color-background-rest, #f8fafc);
        border: var(--qds-component-slider-thumb-border-width, 0.125rem) solid var(--_thumb-border);
        border-radius: 50%;
        box-shadow: var(--qds-component-slider-thumb-box-shadow, 0 1px 2px rgb(0 0 0 / 0.1));
        appearance: none;
      }

      input::-moz-range-thumb {
        width: var(--_thumb-width);
        height: var(--_thumb-height);
        background-color: var(--qds-component-slider-thumb-color-background-rest, #f8fafc);
        border: var(--qds-component-slider-thumb-border-width, 0.125rem) solid var(--_thumb-border);
        border-radius: 50%;
        box-shadow: var(--qds-component-slider-thumb-box-shadow, 0 1px 2px rgb(0 0 0 / 0.1));
      }

      input:focus-visible::-webkit-slider-thumb {
        outline: var(--_focus-ring);
        outline-offset: 0.125rem;
      }

      input:focus-visible::-moz-range-thumb {
        outline: var(--_focus-ring);
        outline-offset: 0.125rem;
      }

      .hint {
        font-size: var(--qds-component-slider-hint-font-size, 0.75rem);
        color: var(--qds-component-slider-hint-color-content-rest, #64748b);
      }

      :host(:disabled) {
        --_track: var(--qds-component-slider-track-color-background-disabled, #f1f5f9);
        --_fill: var(--qds-component-slider-fill-color-background-disabled, #93c5fd);
        --_thumb-border: var(--qds-component-slider-thumb-color-border-disabled, #cbd5e1);
      }

      :host(:disabled) label {
        color: var(--qds-component-slider-label-color-content-disabled, #64748b);
      }

      :host(:disabled) input {
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        input::-webkit-slider-runnable-track {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        input {
          appearance: auto;
        }
      }
    `,
  ];

  /** The visible label. Also the slider's accessible name. */
  @property()
  label = '';

  /** Help text shown under the slider, and read out with it. */
  @property()
  hint = '';

  /** The current value, kept between `min` and `max`. The `value` attribute sets the initial value, restored on form reset. */
  @property({ type: Number })
  value = 50;

  /** The lowest value. */
  @property({ type: Number })
  min = 0;

  /** The highest value. */
  @property({ type: Number })
  max = 100;

  /** The amount each arrow key moves the value by, and the values it snaps to. */
  @property({ type: Number })
  step = 1;

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Writes the current value beside the label. */
  @property({ type: Boolean, attribute: 'show-value', reflect: true })
  showValue = false;

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  @query('input')
  private readonly input!: HTMLInputElement;

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  private formDisabled = false;

  @state()
  private hasHintSlot = false;

  #defaultValue: number | null = null;
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  /** The form this slider belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  protected override firstUpdated(): void {
    void this.updateComplete.then(() => {
      this.hasHintSlot = this.querySelector(':scope > [slot="hint"]') !== null;
    });
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('value') || changed.has('min') || changed.has('max') || changed.has('step')) {
      this.value = this.#settle(this.value);
      this.#internals.setFormValue(String(this.value));
    }
    this.#defaultValue ??= this.value;
  }

  /**
   * `value` as the native input would settle it: within the range, on a step
   * counted from `min`, and never past `max` by rounding up to a step.
   */
  #settle(value: number): number {
    const low = Math.min(this.min, this.max);
    const high = Math.max(this.min, this.max);
    if (!Number.isFinite(value)) value = low + (high - low) / 2;
    const step = this.step > 0 ? this.step : 1;
    let settled = low + Math.round((value - low) / step) * step;
    if (settled > high) settled -= step;
    // Rounded to the step's own decimal places, so 0.1 steps do not drift to 0.30000000000000004.
    const places = (String(step).split('.')[1] ?? '').length;
    return Number(Math.min(high, Math.max(low, settled)).toFixed(places));
  }

  /** Called by the form on reset: restore the declared value. */
  formResetCallback(): void {
    this.value = this.#defaultValue ?? this.value;
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  #onInput(): void {
    this.value = Number(this.input.value);
    // Synchronously, so a listener reading FormData sees the new value.
    this.#internals.setFormValue(String(this.value));
    this.dispatchEvent(new CustomEvent('qds-input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  #onChange(): void {
    this.dispatchEvent(new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  override render(): TemplateResult {
    const hasHint = Boolean(this.hint) || this.hasHintSlot;
    const span = this.max - this.min;
    const percent = span > 0 ? ((this.value - this.min) / span) * 100 : 0;

    return html`
      <div class="base" part="base">
        <div class="header">
          <label for="input" part="label"><slot name="label">${this.label}</slot></label>
          ${this.showValue
            ? html`<span class="value" part="value" aria-hidden="true">${this.value}</span>`
            : nothing}
        </div>
        <input
          id="input"
          part="input"
          type="range"
          style="--_percent: ${percent}%"
          name=${this.name || nothing}
          min=${this.min}
          max=${this.max}
          step=${this.step}
          .value=${String(this.value)}
          aria-describedby=${hasHint ? 'hint' : nothing}
          ?disabled=${this.disabled || this.formDisabled}
          @input=${this.#onInput}
          @change=${this.#onChange}
        />
        <div id="hint" class="hint" part="hint" ?hidden=${!hasHint}>
          <slot
            name="hint"
            @slotchange=${(event: Event) => {
              this.hasHintSlot = (event.target as HTMLSlotElement).assignedNodes().length > 0;
            }}
            >${this.hint}</slot
          >
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-slider': QdsSlider;
  }
}
