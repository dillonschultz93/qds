import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * One tab in a `qds-tabs` tab list.
 *
 * The host takes the `tab` role itself rather than wrapping a button, because
 * `aria-controls` must point at its panel by ID, and an ID reference only
 * resolves within one tree: the tab host and the `qds-tab-panel` host are both
 * in the light DOM, so the reference works. `qds-tabs` manages the IDs, the
 * selection, and the tab order.
 *
 * The role and states are host attributes, not ElementInternals ARIA. Browsers
 * read either, but auditing tools such as axe only read attributes, and would
 * report a tab list with no tabs in it.
 *
 * Put it in the `tab` slot: `<qds-tab slot="tab">`. If the slot is left off the
 * tab assigns it when it upgrades, but setting it in the markup keeps the tab
 * in the tab list before then, too.
 *
 * @element qds-tab
 *
 * @slot - The tab label.
 *
 * @cssprop [--qds-component-tabs-tab-padding-block] - Vertical padding.
 * @cssprop [--qds-component-tabs-tab-padding-inline] - Horizontal padding.
 * @cssprop [--qds-component-tabs-tab-font-size] - Label size.
 * @cssprop [--qds-component-tabs-tab-font-weight] - Label weight.
 * @cssprop [--qds-component-tabs-tab-line-height] - Label line height.
 * @cssprop [--qds-component-tabs-tab-color-content-{state}] - Label color: `rest`, `hover`, `selected`, `disabled`.
 * @cssprop [--qds-component-tabs-tab-color-background-hover] - Fill under the pointer.
 * @cssprop [--qds-component-tabs-indicator-border-width] - Thickness of the selected tab's underline.
 * @cssprop [--qds-component-tabs-indicator-color-border-selected] - Color of the selected tab's underline.
 * @cssprop [--qds-component-tabs-duration] - Color transition duration.
 */
@customElement('qds-tab')
export class QdsTab extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        padding: var(--qds-component-tabs-tab-padding-block, 0.5rem)
          var(--qds-component-tabs-tab-padding-inline, 0.75rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-tabs-tab-font-size, 0.875rem);
        font-weight: var(--qds-component-tabs-tab-font-weight, 500);
        line-height: var(--qds-component-tabs-tab-line-height, 1.375);
        white-space: nowrap;
        color: var(--qds-component-tabs-tab-color-content-rest, #64748b);

        /* The underline sits over the tab list's own bottom border. */
        margin-block-end: calc(-1 * var(--qds-component-tabs-border-width, 0.0625rem));
        border-block-end: var(--qds-component-tabs-indicator-border-width, 0.125rem) solid
          transparent;

        cursor: pointer;
        user-select: none;
        transition:
          color var(--qds-component-tabs-duration, 120ms),
          border-color var(--qds-component-tabs-duration, 120ms);
      }

      :host(:where(:hover)) {
        color: var(--qds-component-tabs-tab-color-content-hover, #0f172a);
        background-color: var(--qds-component-tabs-tab-color-background-hover, #f1f5f9);
      }

      :host([selected]) {
        color: var(--qds-component-tabs-tab-color-content-selected, #1d4ed8);
        border-block-end-color: var(
          --qds-component-tabs-indicator-color-border-selected,
          #2563eb
        );
      }

      :host(:focus-visible) {
        outline: var(--_focus-ring);
        outline-offset: -0.125rem;
      }

      :host([disabled]) {
        color: var(--qds-component-tabs-tab-color-content-disabled, #94a3b8);
        background: none;
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
      }

      /* The underline is the only selected cue; give it a system color. */
      @media (forced-colors: active) {
        :host([selected]) {
          border-block-end-color: Highlight;
        }

        :host([disabled]) {
          color: GrayText;
        }
      }
    `,
  ];

  /**
   * Whether this tab is the selected one. `qds-tabs` manages this; as an
   * attribute in markup it marks the tab selected initially.
   */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /** Prevents selecting this tab. Arrow keys skip it. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  constructor() {
    super();
    this.addEventListener('click', this.#handleClick);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Not in the constructor: a custom element must not gain attributes there.
    this.setAttribute('role', 'tab');
    if (!this.slot) this.slot = 'tab';
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('selected')) {
      this.setAttribute('aria-selected', String(this.selected));
    }
    if (changed.has('disabled')) {
      if (this.disabled) this.setAttribute('aria-disabled', 'true');
      else this.removeAttribute('aria-disabled');
    }
  }

  #handleClick = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(new Event('qds-tab-select', { bubbles: true }));
  };

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-tab': QdsTab;
  }
}
