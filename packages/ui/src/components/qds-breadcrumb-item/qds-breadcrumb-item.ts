import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

/**
 * One step in a `qds-breadcrumbs` trail: a link to an ancestor page, or the
 * current page's name.
 *
 * Put an ordinary link inside it. The link stays in the page's DOM, so it
 * navigates, can be styled, and shows as visited like any other link, and the
 * item is a list item around it. The trail marks its last item as the current
 * page, which sets `aria-current="page"` on its link (or on the item, when the
 * current page is plain text).
 *
 * @element qds-breadcrumb-item
 *
 * @slot - A link, or the current page's name as text.
 *
 * @csspart separator - The chevron after the item.
 */
@customElement('qds-breadcrumb-item')
export class QdsBreadcrumbItem extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--qds-component-breadcrumbs-gap, 0.5rem);
        color: var(--qds-component-breadcrumbs-current-color-content-rest, #0f172a);
      }

      ::slotted(a) {
        color: var(--qds-component-breadcrumbs-color-content-rest, #1d4ed8);
        text-decoration: underline;
        text-underline-offset: 0.15em;
      }

      ::slotted(a:hover) {
        color: var(--qds-component-breadcrumbs-color-content-hover, #1e40af);
      }

      :host([current]) ::slotted(a) {
        color: var(--qds-component-breadcrumbs-current-color-content-rest, #0f172a);
        text-decoration: none;
      }

      .separator {
        display: inline-flex;
        color: var(--qds-component-breadcrumbs-separator-color-content-rest, #64748b);
      }

      /* Drawn by position rather than by the current flag, so it is right before hydration too. */
      :host(:last-of-type) .separator {
        display: none;
      }
    `,
  ];

  /** Set by the trail on its last item: the page the reader is on. */
  @property({ type: Boolean, reflect: true })
  current = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('current')) return;
    // On the link when there is one, since that is what a screen reader reads.
    const link = this.querySelector(':scope > a');
    const target = link ?? this;
    if (link) this.removeAttribute('aria-current');
    if (this.current) target.setAttribute('aria-current', 'page');
    else target.removeAttribute('aria-current');
  }

  override render(): TemplateResult {
    return html`<slot></slot
      ><span class="separator" part="separator" aria-hidden="true"
        ><qds-icon name="chevron-right" size="sm"></qds-icon
      ></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-breadcrumb-item': QdsBreadcrumbItem;
  }
}
