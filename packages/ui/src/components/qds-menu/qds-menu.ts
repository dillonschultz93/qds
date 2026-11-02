import { css, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import {
  hidePanel,
  lengthOf,
  panelStyles,
  placePanel,
  showPanel,
  whileOpen,
} from '../../internal/floating.js';
import { QdsElement } from '../../internal/qds-element.js';
import type { QdsMenuItem } from '../qds-menu-item/qds-menu-item.js';
import '../qds-menu-item/qds-menu-item.js';

export type QdsMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/**
 * A menu of actions, opened by a button: the "More ⋯" menu.
 *
 * ```html
 * <qds-menu>
 *   <qds-button slot="trigger" variant="secondary">Actions</qds-button>
 *   <qds-menu-item>Rename</qds-menu-item>
 *   <qds-menu-item variant="danger">Delete</qds-menu-item>
 * </qds-menu>
 * ```
 *
 * Follows the WAI-ARIA menu button pattern. The trigger is marked as opening a
 * menu and whether it is open. Pressing it, or Down Arrow, opens the menu with
 * the first item focused; Up Arrow opens it at the last. In the menu, the arrow
 * keys, Home, and End move between items, typing a letter jumps to the next item
 * starting with it, Enter or Space chooses, and Escape closes the menu and
 * returns focus to the trigger. Tab, or a click anywhere else, closes it too.
 *
 * Choosing an item fires `qds-select` with its value and closes the menu. A menu
 * is for actions; for choosing a value in a form, use `qds-select`.
 *
 * @element qds-menu
 *
 * @slot trigger - The button that opens the menu. One element.
 * @slot - The menu's `qds-menu-item` elements.
 *
 * @fires {CustomEvent<{ value: string, item: QdsMenuItem }>} qds-select - Fired
 * when an item is chosen. Call `preventDefault()` to keep the menu open.
 *
 * @csspart menu - The menu's box.
 *
 * @cssprop [--qds-component-menu-gap] - Distance from the trigger.
 * @cssprop [--qds-component-menu-padding-block] - Space above the first item and below the last.
 * @cssprop [--qds-component-menu-border-radius] - Corner radius.
 * @cssprop [--qds-component-menu-border-width] - Border thickness.
 * @cssprop [--qds-component-menu-box-shadow] - Elevation.
 * @cssprop [--qds-component-menu-color-background-rest] - Fill.
 * @cssprop [--qds-component-menu-color-border-rest] - Border color.
 */
@customElement('qds-menu')
export class QdsMenu extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    panelStyles,
    css`
      :host {
        display: inline-block;
      }

      .menu {
        min-width: max-content;
        max-height: calc(100vh - 1rem);
        overflow-y: auto;
        padding: var(--qds-component-menu-padding-block, 0.25rem) 0;

        background-color: var(--qds-component-menu-color-background-rest, #f8fafc);
        border: var(--qds-component-menu-border-width, 0.0625rem) solid
          var(--qds-component-menu-color-border-rest, #e2e8f0);
        border-radius: var(--qds-component-menu-border-radius, 0.375rem);
        box-shadow: var(--qds-component-menu-box-shadow, 0 4px 12px rgb(0 0 0 / 0.15));
      }

      @media (forced-colors: active) {
        .menu {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** Whether the menu is open. */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Where the menu appears, relative to the trigger. Flips above or below when there is not room. */
  @property({ reflect: true })
  placement: QdsMenuPlacement = 'bottom-start';

  /** The menu's accessible name. Defaults to the trigger's text. */
  @property()
  label = '';

  @query('.menu')
  private readonly menu!: HTMLElement;

  #trigger: HTMLElement | null = null;
  #stopTracking: (() => void) | null = null;
  /** Where focus goes when the menu opens: the first item or the last. */
  #focusOnOpen: 'first' | 'last' = 'first';

  /** The menu's items, in order. */
  get items(): QdsMenuItem[] {
    return [...this.querySelectorAll<QdsMenuItem>(':scope > qds-menu-item')];
  }

  /** Opens the menu, with its first item focused. */
  show(): void {
    this.#focusOnOpen = 'first';
    this.open = true;
  }

  /** Closes the menu, returning focus to the trigger. */
  hide(): void {
    this.#close(true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopListening();
  }

  #close(returnFocus: boolean): void {
    if (!this.open) return;
    this.open = false;
    if (returnFocus) this.#trigger?.focus();
  }

  #onTriggerSlotChange(event: Event): void {
    this.#trigger = ((event.target as HTMLSlotElement).assignedElements()[0] as HTMLElement | undefined) ?? null;
    this.#syncTrigger();
    // The menu's default name is the trigger's text, which is only known now.
    this.requestUpdate();
  }

  #syncTrigger(): void {
    this.#trigger?.setAttribute('aria-haspopup', 'menu');
    this.#trigger?.setAttribute('aria-expanded', String(this.open));
  }

  #onTriggerClick(): void {
    if (this.open) {
      this.#close(true);
    } else {
      this.show();
    }
  }

  #onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.#focusOnOpen = event.key === 'ArrowDown' ? 'first' : 'last';
      if (this.open) this.#focusItem(this.#focusOnOpen === 'first' ? 0 : -1);
      else this.open = true;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    this.#syncTrigger();
    if (this.open) {
      showPanel(this.menu);
      this.#place();
      this.#stopTracking = whileOpen(this.#trigger ?? this, this.menu, () => this.#place());
      document.addEventListener('pointerdown', this.#onDocumentPointerdown, true);
      this.#focusItem(this.#focusOnOpen === 'first' ? 0 : -1);
    } else if (changed.get('open') !== undefined) {
      hidePanel(this.menu);
      this.#stopListening();
    }
  }

  #stopListening(): void {
    this.#stopTracking?.();
    this.#stopTracking = null;
    document.removeEventListener('pointerdown', this.#onDocumentPointerdown, true);
  }

  #place(): void {
    const [side, align] = this.placement.split('-') as ['top' | 'bottom', 'start' | 'end'];
    placePanel(this.#trigger ?? this, this.menu, {
      side,
      align,
      gap: lengthOf(this, '--qds-component-menu-gap', 4),
    });
  }

  /** A press outside the menu and its trigger closes it, leaving focus where the press put it. */
  #onDocumentPointerdown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) this.#close(false);
  };

  /** Focuses the item at `index`; a negative index counts from the end. */
  #focusItem(index: number): void {
    const items = this.items;
    if (items.length === 0) return;
    items.at(index < 0 ? items.length + index : index)?.focus();
  }

  #onMenuKeydown(event: KeyboardEvent): void {
    const items = this.items;
    // The item the key was pressed on, which is the focused one when a person
    // types; read from the event so a scripted keypress acts on its target.
    const current = items.indexOf(this.#itemIn(event) ?? (document.activeElement as QdsMenuItem));
    const move = (index: number): void => {
      event.preventDefault();
      items[(index + items.length) % items.length]?.focus();
    };

    switch (event.key) {
      case 'ArrowDown':
        move(current + 1);
        break;
      case 'ArrowUp':
        move(current - 1);
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.#close(true);
        break;
      case 'Tab':
        // Let Tab move focus on from the trigger, as if the menu were not there.
        this.#close(false);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (items[current]) this.#choose(items[current]);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          // Type-ahead: the next item, after the focused one, starting with the letter.
          const letter = event.key.toLowerCase();
          const order = [...items.slice(current + 1), ...items.slice(0, current + 1)];
          const match = order.find((item) => (item.textContent ?? '').trim().toLowerCase().startsWith(letter));
          if (match) move(items.indexOf(match));
        }
    }
  }

  /** The menu item an event happened on, if any. */
  #itemIn(event: Event): QdsMenuItem | undefined {
    return event
      .composedPath()
      .find((node): node is QdsMenuItem => node instanceof HTMLElement && node.localName === 'qds-menu-item');
  }

  #onMenuClick(event: MouseEvent): void {
    const item = this.#itemIn(event);
    if (item) this.#choose(item);
  }

  #choose(item: QdsMenuItem): void {
    if (item.disabled) return;
    const proceed = this.dispatchEvent(
      new CustomEvent('qds-select', {
        detail: { value: item.resolvedValue, item },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    if (proceed) this.#close(true);
  }

  override render(): TemplateResult {
    const label = this.label || (this.#trigger?.textContent ?? '').trim();
    return html`
      <span @click=${this.#onTriggerClick} @keydown=${this.#onTriggerKeydown}>
        <slot name="trigger" @slotchange=${this.#onTriggerSlotChange}></slot>
      </span>
      <div
        class="menu panel"
        part="menu"
        role="menu"
        popover="manual"
        aria-label=${label || 'Menu'}
        @keydown=${this.#onMenuKeydown}
        @click=${this.#onMenuClick}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-menu': QdsMenu;
  }
}
