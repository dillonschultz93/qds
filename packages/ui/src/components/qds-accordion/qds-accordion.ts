import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import { QdsAccordionItem } from '../qds-accordion-item/qds-accordion-item.js';

/**
 * A stack of `qds-accordion-item` sections.
 *
 * Adds two things the items cannot do alone: `exclusive`, which keeps at most one
 * item open, and arrow-key movement between headings (Up, Down, Home, End), as
 * the ARIA accordion pattern recommends. Tab still moves through the headings
 * and into open panels as usual.
 *
 * The open state lives on each item, so it is rendered correctly from the
 * server. `exclusive` holds however an item opens — by the user, from code, or
 * in markup; when markup opens several, the first stays open.
 *
 * @element qds-accordion
 *
 * @slot - The `qds-accordion-item` sections.
 *
 * @csspart base - The wrapper around the items.
 *
 * @cssprop [--qds-component-accordion-border-width] - Divider thickness, including the top border.
 * @cssprop [--qds-component-accordion-color-border-rest] - Divider color.
 */
@customElement('qds-accordion')
export class QdsAccordion extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
        border-block-start: var(--qds-component-accordion-border-width, 0.0625rem) solid
          var(--qds-component-accordion-color-border-rest, #e2e8f0);
      }
    `,
  ];

  /** Keeps at most one item open: opening one closes the others. */
  @property({ type: Boolean, reflect: true })
  exclusive = false;

  constructor() {
    super();
    this.addEventListener('qds-accordion-item-opened', this.#handleOpen);
    this.addEventListener('keydown', this.#handleKeydown);
  }

  get #items(): QdsAccordionItem[] {
    return [...this.querySelectorAll(':scope > qds-accordion-item')] as QdsAccordionItem[];
  }

  protected override firstUpdated(): void {
    // Items opened in markup may have upgraded before this element was
    // listening, so check once everything has rendered.
    void this.updateComplete.then(() => this.#enforceExclusive());
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('exclusive') && this.hasUpdated) this.#enforceExclusive();
  }

  /** Close every item but `keep` — by default, the first open one. */
  #enforceExclusive(keep?: QdsAccordionItem): void {
    if (!this.exclusive) return;
    const items = this.#items;
    const kept = keep ?? items.find((item) => item.open);
    for (const item of items) {
      // Set directly rather than through a click, so closing the others does not
      // fire qds-close for changes the user did not make.
      if (item !== kept) item.open = false;
    }
  }

  #handleOpen = (event: Event): void => {
    const opened = event.target as QdsAccordionItem;
    // Only this accordion's own items: a nested accordion's events bubble here too.
    if (opened.parentElement !== this) return;
    this.#enforceExclusive(opened);
  };

  #handleKeydown = (event: KeyboardEvent): void => {
    // Alt+Up and the like belong to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const items = this.#items.filter((item) => !item.disabled);
    // Keydown from inside an item is retargeted to the item host here.
    const current = items.indexOf(event.target as QdsAccordionItem);
    if (current === -1) return;

    // Only act when focus is on a heading, not on something inside an open panel.
    const focused = (event.target as QdsAccordionItem).shadowRoot?.activeElement;
    if (focused?.id !== 'trigger') return;

    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (current + 1) % items.length;
        break;
      case 'ArrowUp':
        next = (current - 1 + items.length) % items.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    items[next]!.focus();
  };

  override render(): TemplateResult {
    // On slotchange too: an item added later with `open` already set does not
    // announce itself, and is reconciled here the same way as initial markup.
    return html`<div part="base"><slot @slotchange=${() => this.#enforceExclusive()}></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-accordion': QdsAccordion;
  }
}
