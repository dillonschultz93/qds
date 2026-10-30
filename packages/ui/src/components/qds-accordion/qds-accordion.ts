import { css, html, type TemplateResult } from 'lit';
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
 * server. `exclusive` is only enforced when the user opens an item, so markup
 * that opens two items in an exclusive accordion shows both until one is
 * toggled.
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
    this.addEventListener('qds-open', this.#handleOpen);
    this.addEventListener('keydown', this.#handleKeydown);
  }

  get #items(): QdsAccordionItem[] {
    return [...this.querySelectorAll(':scope > qds-accordion-item')] as QdsAccordionItem[];
  }

  #handleOpen = (event: Event): void => {
    if (!this.exclusive) return;
    const opened = event.target as QdsAccordionItem;
    // Only this accordion's own items: a nested accordion's events bubble here too.
    if (opened.parentElement !== this) return;
    for (const item of this.#items) {
      // Set directly rather than through a click, so closing the others does not
      // fire qds-close for changes the user did not make.
      if (item !== opened) item.open = false;
    }
  };

  #handleKeydown = (event: KeyboardEvent): void => {
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
    return html`<div part="base"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-accordion': QdsAccordion;
  }
}
