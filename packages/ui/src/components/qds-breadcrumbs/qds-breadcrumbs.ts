import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import { QdsBreadcrumbItem } from '../qds-breadcrumb-item/qds-breadcrumb-item.js';

/**
 * The trail of pages above the current one, each a link back up.
 *
 * ```html
 * <qds-breadcrumbs>
 *   <qds-breadcrumb-item><a href="/">Home</a></qds-breadcrumb-item>
 *   <qds-breadcrumb-item><a href="/components/">Components</a></qds-breadcrumb-item>
 *   <qds-breadcrumb-item>Button</qds-breadcrumb-item>
 * </qds-breadcrumbs>
 * ```
 *
 * Follows the WAI-ARIA breadcrumb pattern: a navigation landmark named
 * "Breadcrumb", around an ordered list. The last item is the current page.
 * Separators are drawn between items and hidden from assistive technology,
 * which announces the list instead.
 *
 * @element qds-breadcrumbs
 *
 * @slot - The `qds-breadcrumb-item` elements, from the top of the hierarchy down.
 *
 * @csspart base - The navigation landmark.
 * @csspart list - The ordered list.
 *
 * @cssprop [--qds-component-breadcrumbs-gap] - Space between an item and its separator.
 * @cssprop [--qds-component-breadcrumbs-font-size] - Text size.
 * @cssprop [--qds-component-breadcrumbs-line-height] - Line height.
 * @cssprop [--qds-component-breadcrumbs-color-content-{state}] - Link color: `rest`, `hover`.
 * @cssprop [--qds-component-breadcrumbs-current-color-content-rest] - The current page's color.
 * @cssprop [--qds-component-breadcrumbs-separator-color-content-rest] - Separator color.
 */
@customElement('qds-breadcrumbs')
export class QdsBreadcrumbs extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
      }

      ol {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--qds-component-breadcrumbs-gap, 0.5rem);
        margin: 0;
        padding: 0;
        list-style: none;

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-breadcrumbs-font-size, 0.875rem);
        line-height: var(--qds-component-breadcrumbs-line-height, 1.5);
      }
    `,
  ];

  /** The landmark's accessible name. */
  @property()
  label = 'Breadcrumb';

  protected override firstUpdated(): void {
    // As in qds-text-field: slotchange never fires for server-rendered content.
    void this.updateComplete.then(() => this.#markCurrent());
  }

  /** Marks the last item as the current page, and only that one. */
  #markCurrent(): void {
    const items = [...this.children].filter((child): child is QdsBreadcrumbItem => child instanceof QdsBreadcrumbItem);
    items.forEach((item, index) => (item.current = index === items.length - 1));
  }

  override render(): TemplateResult {
    return html`
      <nav part="base" aria-label=${this.label}>
        <ol part="list"><slot @slotchange=${this.#markCurrent}></slot></ol>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-breadcrumbs': QdsBreadcrumbs;
  }
}
