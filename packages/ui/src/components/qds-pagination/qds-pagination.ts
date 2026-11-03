import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

/**
 * The pages to show: the first and last, the current page with `siblings` on
 * each side, and an ellipsis for each gap. A gap of a single page shows that
 * page instead, since an ellipsis would take the same room and hide it.
 */
export function pageRange(total: number, current: number, siblings: number): Array<number | 'ellipsis'> {
  const pages: Array<number | 'ellipsis'> = [];
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);
  pages.push(1);
  if (start === 3) pages.push(2);
  else if (start > 3) pages.push('ellipsis');
  for (let page = start; page <= end; page++) pages.push(page);
  if (end === total - 2) pages.push(total - 1);
  else if (end < total - 2) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
}

/**
 * Moving through a list or table split into pages.
 *
 * Two ways to use it:
 *
 *   - **Links**, with `href`: each page is a link to the URL the template
 *     makes, `{page}` replaced by its number — `href="?page={page}"`. The page
 *     loads with the new `current`. Works without JavaScript beyond the
 *     component, and every page can be opened in a new tab.
 *   - **Buttons**, without `href`: each page is a button, and choosing one
 *     moves `current` there and fires `qds-change`, for a list that pages
 *     itself in place.
 *
 * Either way `qds-change` fires first and can be canceled, so an app with its
 * own router can take over a link's navigation.
 *
 * Follows the usual accessible pattern: a navigation landmark around a list,
 * the current page marked with `aria-current="page"`, each page named "Page 3"
 * and the arrows "Previous page" and "Next page". At either end the arrow is
 * shown, disabled, so the layout does not shift as the reader moves.
 *
 * @element qds-pagination
 *
 * @fires {CustomEvent<{ page: number }>} qds-change - Fired when a page is
 * chosen, before it is shown or navigated to. Call `preventDefault()` to stop
 * both.
 *
 * @csspart base - The navigation landmark.
 * @csspart list - The list of pages.
 * @csspart page - Each page, and the previous and next arrows.
 * @csspart current - The current page.
 * @csspart ellipsis - Each ellipsis.
 *
 * @cssprop [--qds-component-pagination-gap] - Space between pages.
 * @cssprop [--qds-component-pagination-min-width] - Narrowest a page can be.
 * @cssprop [--qds-component-pagination-height] - Page height.
 * @cssprop [--qds-component-pagination-padding-inline] - Space either side of a page number.
 * @cssprop [--qds-component-pagination-border-radius] - Corner radius.
 * @cssprop [--qds-component-pagination-font-size] - Text size.
 * @cssprop [--qds-component-pagination-font-weight] - Text weight.
 * @cssprop [--qds-component-pagination-duration] - Hover transition duration.
 * @cssprop [--qds-component-pagination-color-content-{state}] - Page color: `rest`, `disabled`.
 * @cssprop [--qds-component-pagination-color-background-hover] - Page fill under the pointer.
 * @cssprop [--qds-component-pagination-current-color-background-rest] - The current page's fill.
 * @cssprop [--qds-component-pagination-current-color-content-rest] - The current page's text.
 * @cssprop [--qds-component-pagination-ellipsis-color-content-rest] - Ellipsis color.
 */
@customElement('qds-pagination')
export class QdsPagination extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    QdsElement.focusRingStyles,
    css`
      :host {
        display: block;
      }

      ul {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--qds-component-pagination-gap, 0.25rem);
        margin: 0;
        padding: 0;
        list-style: none;

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-pagination-font-size, 0.875rem);
        font-weight: var(--qds-component-pagination-font-weight, 500);
      }

      .page,
      .ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--qds-component-pagination-min-width, 2rem);
        height: var(--qds-component-pagination-height, 2rem);
        padding: 0 var(--qds-component-pagination-padding-inline, 0.5rem);
        font-variant-numeric: tabular-nums;
      }

      .page {
        margin: 0;
        font: inherit;
        color: var(--qds-component-pagination-color-content-rest, #0f172a);
        text-decoration: none;
        background: none;
        border: 0;
        border-radius: var(--qds-component-pagination-border-radius, 0.375rem);
        cursor: pointer;
        transition: background-color var(--qds-component-pagination-duration, 120ms);
      }

      .page:hover {
        background-color: var(--qds-component-pagination-color-background-hover, #f1f5f9);
      }

      .page[aria-current='page'] {
        color: var(--qds-component-pagination-current-color-content-rest, #f8fafc);
        background-color: var(--qds-component-pagination-current-color-background-rest, #2563eb);
        cursor: default;
      }

      .page:disabled,
      .page[aria-disabled='true'] {
        color: var(--qds-component-pagination-color-content-disabled, #64748b);
        background: none;
        cursor: not-allowed;
      }

      .ellipsis {
        color: var(--qds-component-pagination-ellipsis-color-content-rest, #64748b);
      }

      @media (prefers-reduced-motion: reduce) {
        .page {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        .page[aria-current='page'] {
          color: HighlightText;
          background-color: Highlight;
        }

        .page:disabled,
        .page[aria-disabled='true'] {
          color: GrayText;
        }
      }
    `,
  ];

  /** How many pages there are. */
  @property({ type: Number })
  total = 1;

  /** The page being shown, counting from 1. */
  @property({ type: Number, reflect: true })
  current = 1;

  /** How many pages to show on each side of the current one. */
  @property({ type: Number })
  siblings = 1;

  /** Makes each page a link: a URL with `{page}` where the number goes, such as `?page={page}`. */
  @property()
  href = '';

  /** The landmark's accessible name, to tell it apart when a page has more than one. */
  @property()
  label = 'Pagination';

  /** Restores focus to the chosen page after it re-renders, in button mode. */
  #refocus = false;

  #pageOf(target: number): number {
    return Math.min(Math.max(1, Math.round(target)), Math.max(1, this.total));
  }

  #choose(event: Event, page: number): void {
    const proceed = this.dispatchEvent(
      new CustomEvent('qds-change', { detail: { page }, bubbles: true, composed: true, cancelable: true }),
    );
    if (!proceed) {
      event.preventDefault();
      return;
    }
    if (!this.href) {
      this.#refocus = true;
      this.current = page;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    // The list re-renders with different pages in each position, so focus would
    // be left on whatever page now sits where the chosen one was.
    if (changed.has('current') && this.#refocus) {
      this.#refocus = false;
      this.renderRoot.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    }
  }

  #renderPage(page: number, label: string, content: TemplateResult | number, part = 'page'): TemplateResult {
    const isCurrent = part === 'page' && page === this.#pageOf(this.current) && typeof content === 'number';
    const parts = isCurrent ? 'page current' : 'page';
    if (this.href) {
      return html`<a
        class="page focus-ring"
        part=${parts}
        href=${this.href.replaceAll('{page}', String(page))}
        aria-label=${label}
        aria-current=${isCurrent ? 'page' : nothing}
        @click=${(event: Event) => this.#choose(event, page)}
        >${content}</a
      >`;
    }
    return html`<button
      class="page focus-ring"
      part=${parts}
      type="button"
      aria-label=${label}
      aria-current=${isCurrent ? 'page' : nothing}
      @click=${(event: Event) => !isCurrent && this.#choose(event, page)}
    >
      ${content}
    </button>`;
  }

  /** An arrow, disabled at either end so the layout does not shift. */
  #renderArrow(page: number, label: string, icon: string, disabled: boolean): TemplateResult {
    const content = html`<qds-icon name=${icon} size="sm"></qds-icon>`;
    if (!disabled) return this.#renderPage(page, label, content, 'arrow');
    return this.href
      ? html`<a class="page" part="page" role="link" aria-disabled="true" aria-label=${label}>${content}</a>`
      : html`<button class="page" part="page" type="button" disabled aria-label=${label}>${content}</button>`;
  }

  override render(): TemplateResult {
    const total = Math.max(1, Math.floor(this.total));
    const current = this.#pageOf(this.current);
    return html`
      <nav part="base" aria-label=${this.label}>
        <ul part="list">
          <li>${this.#renderArrow(current - 1, 'Previous page', 'chevron-left', current <= 1)}</li>
          ${pageRange(total, current, Math.max(0, this.siblings)).map((entry) =>
            entry === 'ellipsis'
              ? html`<li class="ellipsis" part="ellipsis" aria-hidden="true">…</li>`
              : html`<li>${this.#renderPage(entry, `Page ${entry}`, entry)}</li>`,
          )}
          <li>${this.#renderArrow(current + 1, 'Next page', 'chevron-right', current >= total)}</li>
        </ul>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-pagination': QdsPagination;
  }
}
