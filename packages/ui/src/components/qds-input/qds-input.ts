import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

import { QdsElement } from '../../internal/qds-element.js';
import { QdsTextControl, type QdsTextControlType } from '../../internal/qds-text-control.js';

export type QdsInputType = QdsTextControlType;
export type QdsInputSize = 'sm' | 'md' | 'lg';

/**
 * A single-line text input, on its own.
 *
 * This is the bare control. It has no visible label, so it takes its accessible
 * name from the `label` attribute — a `<label for>` outside cannot reach an input
 * inside a shadow root. Where a visible label, hint, or error message is wanted,
 * use `qds-text-field`, which renders all three inside its own shadow root so
 * they can be wired to the input.
 *
 * Constraint validation is the native input's: `required`, `minlength`,
 * `pattern`, and the type's own rules (`email`, `url`) are mirrored to the form,
 * and the error border appears only after the user has interacted, via
 * `:user-invalid`.
 *
 * @element qds-input
 *
 * @slot start - Content before the text, such as an icon or a prefix.
 * @slot end - Content after the text, such as a unit or a button.
 *
 * @fires {CustomEvent<{ value: string }>} qds-input - Fired on every keystroke.
 * @fires {CustomEvent<{ value: string }>} qds-change - Fired when the value is
 * committed: on blur after editing, or on Enter.
 *
 * @csspart base - The box drawn around the input and its affixes.
 * @csspart input - The native input.
 *
 * @cssprop [--qds-component-input-gap] - Space between the text and the affixes.
 * @cssprop [--qds-component-input-border-radius] - Corner radius.
 * @cssprop [--qds-component-input-border-width] - Border thickness.
 * @cssprop [--qds-component-input-line-height] - Text line height.
 * @cssprop [--qds-component-input-duration] - Border transition duration.
 * @cssprop [--qds-component-input-{size}-padding-block] - Vertical padding per size.
 * @cssprop [--qds-component-input-{size}-padding-inline] - Horizontal padding per size.
 * @cssprop [--qds-component-input-{size}-font-size] - Text size per size.
 * @cssprop [--qds-component-input-color-background-{state}] - Fill: `rest`, `disabled`.
 * @cssprop [--qds-component-input-color-border-{state}] - Border: `rest`, `focus`, `disabled`.
 * @cssprop [--qds-component-input-color-content-{state}] - Text: `rest`, `disabled`.
 * @cssprop [--qds-component-input-invalid-color-border-rest] - Border while invalid.
 * @cssprop [--qds-component-input-placeholder-color-content-rest] - Placeholder text.
 * @cssprop [--qds-component-input-affix-color-content-rest] - Color of slotted start and end content.
 */
@customElement('qds-input')
export class QdsInput extends QdsTextControl {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-block;

        --_padding-block: var(--qds-component-input-md-padding-block, 0.5rem);
        --_padding-inline: var(--qds-component-input-md-padding-inline, 0.75rem);
        --_font-size: var(--qds-component-input-md-font-size, 0.875rem);
        --_border: var(--qds-component-input-color-border-rest, #64748b);
      }

      :host([size='sm']) {
        --_padding-block: var(--qds-component-input-sm-padding-block, 0.25rem);
        --_padding-inline: var(--qds-component-input-sm-padding-inline, 0.5rem);
        --_font-size: var(--qds-component-input-sm-font-size, 0.75rem);
      }

      :host([size='lg']) {
        --_padding-block: var(--qds-component-input-lg-padding-block, 0.75rem);
        --_padding-inline: var(--qds-component-input-lg-padding-inline, 1rem);
        --_font-size: var(--qds-component-input-lg-font-size, 1rem);
      }

      /*
       * Invalid either because the author said so, or because the user has
       * interacted and native validation fails. :user-invalid rather than
       * :invalid, so an empty required field is not red before anyone touched it.
       *
       * Set on .base, not :host — :host(:has()) only sees light DOM children, so
       * it can never match the input inside this shadow root.
       */
      :host([invalid]) .base,
      .base:has(input:user-invalid) {
        --_border: var(--qds-component-input-invalid-color-border-rest, #dc2626);
      }

      .base {
        display: flex;
        align-items: center;
        gap: var(--qds-component-input-gap, 0.5rem);
        width: 100%;
        padding: 0 var(--_padding-inline);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--_font-size);
        line-height: var(--qds-component-input-line-height, 1.5);
        color: var(--qds-component-input-color-content-rest, #0f172a);

        background-color: var(--qds-component-input-color-background-rest, #f8fafc);
        border: var(--qds-component-input-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-input-border-radius, 0.375rem);
        cursor: text;

        transition: border-color var(--qds-component-input-duration, 120ms);
      }

      /*
       * The focus ring goes on the box rather than the input, so that it wraps
       * the affixes too and reads as one control.
       */
      .base:focus-within {
        border-color: var(--qds-component-input-color-border-focus, #2563eb);
        outline: var(--_focus-ring);
        outline-offset: 0.0625rem;
      }

      input {
        flex: 1;
        min-width: 0;
        margin: 0;
        padding: var(--_padding-block) 0;

        font: inherit;
        color: inherit;
        background: none;
        border: 0;
        outline: none;
      }

      input::placeholder {
        color: var(--qds-component-input-placeholder-color-content-rest, #64748b);
        opacity: 1;
      }

      ::slotted(*) {
        flex: none;
        color: var(--qds-component-input-affix-color-content-rest, #64748b);
      }

      :host(:disabled) .base {
        color: var(--qds-component-input-color-content-disabled, #64748b);
        background-color: var(--qds-component-input-color-background-disabled, #f1f5f9);
        border-color: var(--qds-component-input-color-border-disabled, #e2e8f0);
        cursor: not-allowed;
      }

      :host(:disabled) input {
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        .base {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        .base {
          border-color: FieldText;
        }

        :host(:disabled) .base {
          border-color: GrayText;
        }
      }
    `,
  ];

  /** Accessible name. Required, since this control has no visible label. */
  @property()
  label = '';

  /** Control size. */
  @property({ reflect: true })
  size: QdsInputSize = 'md';

  /**
   * Shows the error state and sets `aria-invalid`, for errors the form itself
   * cannot detect, such as a server-side check. Does not block submission.
   */
  @property({ type: Boolean, reflect: true })
  invalid = false;

  override render(): TemplateResult {
    return html`
      <div class="base" part="base" @click=${this.focusInput}>
        <slot name="start"></slot>
        <input
          part="input"
          type=${this.type}
          .value=${live(this.value)}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          aria-label=${this.label || nothing}
          aria-invalid=${this.invalid ? 'true' : nothing}
          autocomplete=${this.autocomplete ?? nothing}
          minlength=${this.minlength ?? nothing}
          maxlength=${this.maxlength ?? nothing}
          pattern=${this.pattern ?? nothing}
          ?disabled=${this.disabled || this.formDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.handleInput}
          @change=${this.handleChange}
        />
        <slot name="end"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-input': QdsInput;
  }
}
