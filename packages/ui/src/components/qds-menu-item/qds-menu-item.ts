import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsMenuItemVariant = 'default' | 'danger';

/**
 * One action in a `qds-menu`.
 *
 * The element itself is the menu item: it carries `role="menuitem"`, so
 * assistive technology finds a `menuitem` directly inside the `menu`, with no
 * wrapper between them. The role is an attribute rather than an ElementInternals
 * default, which not every accessibility checker reads yet. The menu moves focus
 * between items with the arrow keys; an item is never in the page's tab order.
 *
 * A disabled item stays focusable, so arrowing through the menu still finds it
 * and a screen reader can say it exists, but choosing it does nothing.
 *
 * @element qds-menu-item
 *
 * @slot - The item's text.
 * @slot start - An icon before the text.
 *
 * @csspart base - The wrapper around the icon and text.
 *
 * @cssprop [--qds-component-menu-item-gap] - Space between the icon and text.
 * @cssprop [--qds-component-menu-item-padding-block] - Vertical padding.
 * @cssprop [--qds-component-menu-item-padding-inline] - Horizontal padding.
 * @cssprop [--qds-component-menu-item-border-radius] - Corner radius of the highlight.
 * @cssprop [--qds-component-menu-item-font-size] - Text size.
 * @cssprop [--qds-component-menu-item-line-height] - Text line height.
 * @cssprop [--qds-component-menu-item-color-content-{state}] - Text color: `rest`, `disabled`.
 * @cssprop [--qds-component-menu-item-color-background-hover] - Fill under the pointer and on focus.
 * @cssprop [--qds-component-menu-item-icon-color-content-rest] - Icon color.
 * @cssprop [--qds-component-menu-item-danger-color-content-rest] - Text and icon color of a `danger` item.
 */
@customElement('qds-menu-item')
export class QdsMenuItem extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
        border-radius: var(--qds-component-menu-item-border-radius, 0.25rem);
        outline: none;
        cursor: pointer;
        user-select: none;
      }

      .base {
        display: flex;
        align-items: center;
        gap: var(--qds-component-menu-item-gap, 0.5rem);
        padding: var(--qds-component-menu-item-padding-block, 0.5rem) var(--qds-component-menu-item-padding-inline, 0.75rem);

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--qds-component-menu-item-font-size, 0.875rem);
        line-height: var(--qds-component-menu-item-line-height, 1.5);
        color: var(--qds-component-menu-item-color-content-rest, #0f172a);
        white-space: nowrap;
        border-radius: inherit;
      }

      ::slotted([slot='start']) {
        flex: none;
        color: var(--qds-component-menu-item-icon-color-content-rest, #64748b);
      }

      :host(:hover) .base,
      :host(:focus) .base {
        background-color: var(--qds-component-menu-item-color-background-hover, #f1f5f9);
      }

      :host([variant='danger']) .base,
      :host([variant='danger']) ::slotted([slot='start']) {
        color: var(--qds-component-menu-item-danger-color-content-rest, #b91c1c);
      }

      :host([disabled]) {
        cursor: not-allowed;
      }

      :host([disabled]) .base,
      :host([disabled]) ::slotted([slot='start']) {
        color: var(--qds-component-menu-item-color-content-disabled, #64748b);
      }

      :host([disabled]:hover) .base {
        background-color: transparent;
      }

      @media (forced-colors: active) {
        :host(:focus) .base {
          outline: 2px solid Highlight;
          outline-offset: -2px;
        }

        :host([disabled]) .base {
          color: GrayText;
        }
      }
    `,
  ];

  /** Reported in the menu's `qds-select` event, to tell items apart. Defaults to the item's text. */
  @property()
  value = '';

  /** Keeps the item in the menu, but stops it being chosen. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** `danger` for a destructive action, such as Delete. */
  @property({ reflect: true })
  variant: QdsMenuItemVariant = 'default';

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'menuitem');
    // Focusable by script, never by Tab: the menu moves focus between items.
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1;
  }

  /** The value the menu reports: `value`, or the item's text. */
  get resolvedValue(): string {
    return this.value || (this.textContent ?? '').trim();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('disabled')) {
      if (this.disabled) this.setAttribute('aria-disabled', 'true');
      else this.removeAttribute('aria-disabled');
    }
  }

  override render(): TemplateResult {
    return html`<div class="base" part="base"><slot name="start"></slot><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-menu-item': QdsMenuItem;
  }
}
