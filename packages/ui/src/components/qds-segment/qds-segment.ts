import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * One option in a `qds-segmented-control`: text, an icon, or both.
 *
 * Like `qds-radio`, the host takes the `radio` role itself, and the control
 * supplies the grouping. An icon-only segment needs a `label`, its accessible
 * name; pair it with a `qds-tooltip` so sighted users get the name too.
 *
 * Use only inside a `qds-segmented-control`; on its own it does nothing when clicked.
 *
 * @element qds-segment
 *
 * @slot - The segment's text, an icon, or both.
 *
 * @csspart base - The wrapper around the content.
 */
@customElement('qds-segment')
export class QdsSegment extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-flex;
        flex: 1 1 auto;
        align-items: center;
        justify-content: center;
        gap: var(--qds-component-segmented-control-segment-gap, 0.5rem);
        padding: var(--qds-component-segmented-control-segment-padding-block, 0.25rem)
          var(--qds-component-segmented-control-segment-padding-inline, 0.75rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-segmented-control-segment-font-size, 0.875rem);
        font-weight: var(--qds-component-segmented-control-segment-font-weight, 500);
        line-height: var(--qds-component-segmented-control-segment-line-height, 1.5);
        white-space: nowrap;
        color: var(--qds-component-segmented-control-segment-color-content-rest, #64748b);

        border-radius: var(--qds-component-segmented-control-segment-border-radius, 0.125rem);
        cursor: pointer;
        user-select: none;
        outline: none;

        transition:
          background-color var(--qds-component-segmented-control-duration, 120ms),
          color var(--qds-component-segmented-control-duration, 120ms);
      }

      .base {
        display: contents;
      }

      :host(:where(:hover):not([checked], [disabled], [group-disabled])) {
        color: var(--qds-component-segmented-control-segment-color-content-hover, #0f172a);
        background-color: var(--qds-component-segmented-control-segment-color-background-hover, #e2e8f0);
      }

      :host([checked]) {
        color: var(--qds-component-segmented-control-segment-color-content-selected, #0f172a);
        background-color: var(--qds-component-segmented-control-segment-color-background-selected, #f8fafc);
        box-shadow: var(--qds-component-segmented-control-segment-box-shadow, 0 1px 2px rgb(0 0 0 / 0.1));
      }

      :host(:focus-visible) {
        outline: var(--_focus-ring);
        outline-offset: 0.125rem;
      }

      :host([disabled]),
      :host([group-disabled]) {
        color: var(--qds-component-segmented-control-segment-color-content-disabled, #64748b);
        cursor: not-allowed;
        opacity: 0.6;
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        :host([checked]) {
          color: HighlightText;
          background-color: Highlight;
          forced-color-adjust: none;
        }

        :host([disabled]),
        :host([group-disabled]) {
          color: GrayText;
        }
      }
    `,
  ];

  /** The value the control takes when this segment is chosen. */
  @property()
  value = '';

  /** The accessible name, for a segment showing only an icon. */
  @property()
  label = '';

  /**
   * Whether this segment is chosen. The control manages this; set the control's
   * `value` instead. As an attribute in markup it marks the initial choice when
   * the control has no `value` of its own.
   */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /** Prevents choosing this segment. Arrow keys skip it. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * Set by the control while the whole control is disabled.
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
    // On the host, as qds-radio does: the control's roving tabindex focuses
    // these hosts directly. Not set in the constructor, where a custom element
    // must not gain attributes.
    this.setAttribute('role', 'radio');
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('checked')) this.setAttribute('aria-checked', String(this.checked));
    if (changed.has('label')) {
      if (this.label) this.setAttribute('aria-label', this.label);
      else this.removeAttribute('aria-label');
    }
    if (changed.has('disabled') || changed.has('groupDisabled')) {
      if (this.disabled || this.groupDisabled) this.setAttribute('aria-disabled', 'true');
      else this.removeAttribute('aria-disabled');
    }
  }

  #handleClick = (): void => {
    if (this.disabled || this.groupDisabled) return;
    // The control does the selecting, so "only one chosen" is enforced in one place.
    this.dispatchEvent(new Event('qds-segment-select', { bubbles: true }));
  };

  override render(): TemplateResult {
    return html`<span class="base" part="base"><slot></slot></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-segment': QdsSegment;
  }
}
