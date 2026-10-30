import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * An on/off switch.
 *
 * Use a toggle for a setting that takes effect immediately, and a checkbox for a
 * choice that is only applied when a form is submitted. It is announced as a
 * switch ("on"/"off") rather than a checkbox ("checked"/"not checked"), which is
 * the whole difference to a screen reader user.
 *
 * Rendered as a native `<button role="switch">`, so Space and Enter both toggle
 * it and it is focusable without a tabindex.
 *
 * @element qds-toggle
 *
 * @slot - The label.
 *
 * @fires {CustomEvent<{ checked: boolean }>} qds-change - Fired when the user
 * toggles the switch. Not fired for programmatic changes.
 *
 * @csspart base - The native button carrying the switch role.
 * @csspart track - The pill the thumb slides along.
 * @csspart thumb - The sliding circle.
 * @csspart label - The wrapper around the default slot.
 *
 * @cssprop [--qds-component-toggle-gap] - Space between the track and the label.
 * @cssprop [--qds-component-toggle-font-size] - Label size.
 * @cssprop [--qds-component-toggle-line-height] - Label line height.
 * @cssprop [--qds-component-toggle-duration] - Thumb and color transition duration.
 * @cssprop [--qds-component-toggle-track-width] - Track width.
 * @cssprop [--qds-component-toggle-track-height] - Track height. The thumb is this minus twice the padding.
 * @cssprop [--qds-component-toggle-track-padding] - Space between the thumb and the track edge.
 * @cssprop [--qds-component-toggle-track-border-radius] - Track corner radius.
 * @cssprop [--qds-component-toggle-track-color-background-{state}] - Track fill: `unchecked`, `checked`, `hover` (checked, under the pointer), `disabled`.
 * @cssprop [--qds-component-toggle-thumb-color-background-{state}] - Thumb fill: `rest`, `disabled`.
 * @cssprop [--qds-component-toggle-label-color-content-{state}] - Label color: `rest`, `disabled`.
 */
@customElement('qds-toggle')
export class QdsToggle extends QdsElement {
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

        --_track-width: var(--qds-component-toggle-track-width, 3rem);
        --_track-height: var(--qds-component-toggle-track-height, 1.5rem);
        --_padding: var(--qds-component-toggle-track-padding, 0.25rem);
        --_thumb: calc(var(--_track-height) - 2 * var(--_padding));
        --_duration: var(--qds-component-toggle-duration, 120ms);
      }

      button {
        display: inline-flex;
        align-items: center;
        gap: var(--qds-component-toggle-gap, 0.5rem);

        margin: 0;
        padding: 0;

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-toggle-font-size, 0.875rem);
        line-height: var(--qds-component-toggle-line-height, 1.375);
        text-align: start;
        color: var(--qds-component-toggle-label-color-content-rest, #0f172a);

        background: none;
        border: 0;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
      }

      .track {
        display: inline-flex;
        align-items: center;
        flex: none;
        width: var(--_track-width);
        height: var(--_track-height);
        padding: var(--_padding);
        border-radius: var(--qds-component-toggle-track-border-radius, 9999px);
        background-color: var(--qds-component-toggle-track-color-background-unchecked, #64748b);
        transition: background-color var(--_duration);
      }

      .thumb {
        width: var(--_thumb);
        height: var(--_thumb);
        border-radius: 50%;
        background-color: var(--qds-component-toggle-thumb-color-background-rest, #f8fafc);
        transition: translate var(--_duration);
      }

      [aria-checked='true'] .track {
        background-color: var(--qds-component-toggle-track-color-background-checked, #2563eb);
      }

      [aria-checked='true']:where(:hover) .track {
        background-color: var(--qds-component-toggle-track-color-background-hover, #1d4ed8);
      }

      /*
       * Logical travel: the distance is the same either way, and the sign flips
       * under RTL so "on" is always toward the inline end.
       */
      [aria-checked='true'] .thumb {
        translate: calc(var(--_track-width) - var(--_thumb) - 2 * var(--_padding));
      }

      :host(:dir(rtl)) [aria-checked='true'] .thumb {
        translate: calc(-1 * (var(--_track-width) - var(--_thumb) - 2 * var(--_padding)));
      }

      button:focus-visible {
        outline: none;
      }

      button:focus-visible .track {
        outline: var(--qds-semantic-border-primary, 0.125rem) solid
          var(--qds-semantic-color-border-primary, currentColor);
        outline-offset: 0.125rem;
      }

      button:disabled {
        color: var(--qds-component-toggle-label-color-content-disabled, #64748b);
        cursor: not-allowed;
      }

      button:disabled .track {
        background-color: var(--qds-component-toggle-track-color-background-disabled, #f1f5f9);
      }

      button:disabled .thumb {
        background-color: var(--qds-component-toggle-thumb-color-background-disabled, #f8fafc);
      }

      @media (prefers-reduced-motion: reduce) {
        .track,
        .thumb {
          transition: none;
        }
      }

      /*
       * Forced colors flattens the track and thumb to the same color, leaving
       * only position to tell on from off. Outline the track and fill the thumb
       * with a system color so the thumb stays visible.
       */
      @media (forced-colors: active) {
        .track {
          border: 0.0625rem solid ButtonText;
        }

        .thumb {
          background-color: ButtonText;
        }

        [aria-checked='true'] .thumb {
          background-color: Highlight;
        }

        button:disabled .track {
          border-color: GrayText;
        }

        button:disabled .thumb {
          background-color: GrayText;
        }
      }
    `,
  ];

  /** Whether the switch is on. The `checked` attribute sets the initial state, restored on form reset. */
  @property({ type: Boolean })
  checked = false;

  /** Prevents interaction and excludes the value from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** Value submitted while on. */
  @property()
  value = 'on';

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  private formDisabled = false;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  /** The form this toggle belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('checked') || changed.has('value')) {
      this.#internals.setFormValue(this.checked ? this.value : null);
    }
  }

  /** Called by the form on reset: restore the state the markup declared. */
  formResetCallback(): void {
    this.checked = this.hasAttribute('checked');
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  #handleClick(): void {
    this.checked = !this.checked;
    // Synchronously, not left to willUpdate: a qds-change listener reading
    // FormData would otherwise see the previous state.
    this.#internals.setFormValue(this.checked ? this.value : null);
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
      <button
        part="base"
        type="button"
        role="switch"
        aria-checked=${String(this.checked)}
        ?disabled=${this.disabled || this.formDisabled}
        @click=${this.#handleClick}
      >
        <span class="track" part="track"><span class="thumb" part="thumb"></span></span>
        <span part="label"><slot></slot></span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-toggle': QdsToggle;
  }
}
