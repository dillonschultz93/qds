import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * One option in a `qds-radio-group`.
 *
 * Unlike `qds-checkbox`, there is no native input inside. Native radios group by
 * `name` within a single tree, so radios in separate shadow roots never form a
 * group: arrow keys would not move between them and checking one would not
 * uncheck the others. The host takes the `radio` role itself instead, and the
 * group supplies the grouping behavior.
 *
 * Use only inside a `qds-radio-group`; on its own it does nothing when clicked.
 *
 * @element qds-radio
 *
 * @slot - The label.
 *
 * @csspart control - The drawn circle.
 * @csspart label - The wrapper around the default slot.
 *
 * @cssprop [--qds-component-radio-gap] - Space between the circle and the label.
 * @cssprop [--qds-component-radio-font-size] - Label size.
 * @cssprop [--qds-component-radio-line-height] - Label line height.
 * @cssprop [--qds-component-radio-duration] - State transition duration.
 * @cssprop [--qds-component-radio-control-width] - Circle width.
 * @cssprop [--qds-component-radio-control-height] - Circle height.
 * @cssprop [--qds-component-radio-control-border-width] - Circle border thickness.
 * @cssprop [--qds-component-radio-control-color-background-{state}] - Circle fill: `unchecked`, `checked`, `hover` (checked, under the pointer), `disabled`.
 * @cssprop [--qds-component-radio-control-color-border-{state}] - Circle border: `unchecked`, `hover` (unchecked, under the pointer), `checked`, `disabled`.
 * @cssprop [--qds-component-radio-control-color-content-{state}] - Dot color: `checked`, `disabled`.
 * @cssprop [--qds-component-radio-label-color-content-{state}] - Label color: `rest`, `disabled`.
 */
@customElement('qds-radio')
export class QdsRadio extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-flex;
        align-items: flex-start;
        gap: var(--qds-component-radio-gap, 0.5rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-radio-font-size, 0.875rem);
        line-height: var(--qds-component-radio-line-height, 1.375);
        color: var(--qds-component-radio-label-color-content-rest, #0f172a);

        cursor: pointer;
        outline: none;
      }

      .control {
        display: inline-grid;
        place-items: center;
        flex: none;
        width: var(--qds-component-radio-control-width, 1rem);
        height: var(--qds-component-radio-control-height, 1rem);
        margin-block-start: calc((1lh - var(--qds-component-radio-control-height, 1rem)) / 2);

        color: var(--qds-component-radio-control-color-content-checked, #f8fafc);
        background-color: var(--qds-component-radio-control-color-background-unchecked, #f8fafc);
        border: var(--qds-component-radio-control-border-width, 0.0625rem) solid
          var(--qds-component-radio-control-color-border-unchecked, #64748b);
        border-radius: 50%;

        transition:
          background-color var(--qds-component-radio-duration, 120ms),
          border-color var(--qds-component-radio-duration, 120ms);
      }

      .dot {
        width: 37.5%;
        height: 37.5%;
        border-radius: 50%;
        background-color: currentColor;
        visibility: hidden;
      }

      :host(:where(:hover)) .control {
        border-color: var(--qds-component-radio-control-color-border-hover, #2563eb);
      }

      :host([checked]) .control {
        background-color: var(--qds-component-radio-control-color-background-checked, #2563eb);
        border-color: var(--qds-component-radio-control-color-border-checked, #2563eb);
      }

      :host([checked]:where(:hover)) .control {
        background-color: var(--qds-component-radio-control-color-background-hover, #1d4ed8);
      }

      :host([checked]) .dot {
        visibility: visible;
      }

      /* The host is what takes focus, so the ring is drawn on the circle from here. */
      :host(:focus-visible) .control {
        outline: var(--_focus-ring);
        outline-offset: 0.125rem;
      }

      :host([disabled]),
      :host([group-disabled]) {
        color: var(--qds-component-radio-label-color-content-disabled, #64748b);
        cursor: not-allowed;
      }

      :host([disabled]) .control,
      :host([group-disabled]) .control {
        color: var(--qds-component-radio-control-color-content-disabled, #64748b);
        background-color: var(--qds-component-radio-control-color-background-disabled, #f1f5f9);
        border-color: var(--qds-component-radio-control-color-border-disabled, #e2e8f0);
      }

      @media (prefers-reduced-motion: reduce) {
        .control {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        .control {
          border-color: ButtonText;
          color: Highlight;
        }

        :host([disabled]) .control,
        :host([group-disabled]) .control {
          border-color: GrayText;
          color: GrayText;
        }
      }
    `,
  ];

  /** The value the group takes when this option is chosen. */
  @property()
  value = '';

  /**
   * Whether this option is chosen. The group manages this; set the group's
   * `value` instead. As an attribute in markup it marks the initial choice when
   * the group has no `value` of its own.
   */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /** Prevents choosing this option. Arrow keys skip it. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * Set by the group while the whole group is disabled.
   *
   * @internal
   */
  @property({ type: Boolean, reflect: true, attribute: 'group-disabled' })
  groupDisabled = false;

  constructor() {
    super();
    this.addEventListener('click', this.#handleClick);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // The role lives on the host so it sits in the same tree as the other radios
    // and the group: the group's roving tabindex focuses these hosts directly.
    //
    // As host attributes rather than ElementInternals ARIA: browsers read either,
    // but auditing tools such as axe only read attributes. Not set in the
    // constructor, where a custom element must not gain attributes.
    this.setAttribute('role', 'radio');
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('checked')) {
      this.setAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('disabled') || changed.has('groupDisabled')) {
      if (this.disabled || this.groupDisabled) this.setAttribute('aria-disabled', 'true');
      else this.removeAttribute('aria-disabled');
    }
  }

  #handleClick = (): void => {
    if (this.disabled || this.groupDisabled) return;
    // The group listens for this and does the selecting, so that the "only one
    // checked" rule is enforced in exactly one place.
    this.dispatchEvent(new Event('qds-radio-select', { bubbles: true }));
  };

  override render(): TemplateResult {
    return html`
      <span class="control" part="control"><span class="dot"></span></span>
      <span part="label"><slot></slot></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-radio': QdsRadio;
  }
}
