import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

/**
 * The content shown for one tab in a `qds-tabs`.
 *
 * Panels pair with tabs by position: the first panel belongs to the first tab.
 * Each is hidden until `qds-tabs` marks it active, so a page never shows every
 * panel stacked on top of one another, even before the components upgrade.
 *
 * @element qds-tab-panel
 *
 * @slot - The panel content.
 *
 * @cssprop [--qds-component-tabs-panel-padding-block] - Space above and below the content.
 */
@customElement('qds-tab-panel')
export class QdsTabPanel extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
        padding-block: var(--qds-component-tabs-panel-padding-block, 1rem);
      }

      :host(:not([active])) {
        display: none;
      }

      :host(:focus-visible) {
        outline: var(--_focus-ring);
        outline-offset: 0.125rem;
      }
    `,
  ];

  /**
   * Whether this panel is shown. Managed by `qds-tabs`.
   *
   * @internal
   */
  @property({ type: Boolean, reflect: true })
  active = false;

  override connectedCallback(): void {
    super.connectedCallback();
    // A host attribute rather than ElementInternals ARIA, for the same reason as
    // qds-tab: auditing tools only read attributes.
    this.setAttribute('role', 'tabpanel');
    // Focusable, so a keyboard user can reach a panel that has nothing
    // focusable inside it, as the ARIA tabs pattern recommends.
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
  }

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-tab-panel': QdsTabPanel;
  }
}
