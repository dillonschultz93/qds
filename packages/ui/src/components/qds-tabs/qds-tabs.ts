import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import { QdsTab } from '../qds-tab/qds-tab.js';
import { QdsTabPanel } from '../qds-tab-panel/qds-tab-panel.js';

let nextId = 0;

/**
 * A set of tabs, each showing one panel at a time.
 *
 * Follows the ARIA tabs pattern with automatic activation: Left and Right move
 * between tabs and select as they go, Home and End jump to the first and last,
 * and only the selected tab is in the tab order — Tab moves from it straight
 * into the panel. Tabs pair with panels by position.
 *
 * ```html
 * <qds-tabs label="Account">
 *   <qds-tab slot="tab">Profile</qds-tab>
 *   <qds-tab slot="tab">Security</qds-tab>
 *   <qds-tab-panel>…</qds-tab-panel>
 *   <qds-tab-panel>…</qds-tab-panel>
 * </qds-tabs>
 * ```
 *
 * @element qds-tabs
 *
 * @slot - The `qds-tab-panel` panels.
 * @slot tab - The `qds-tab` tabs.
 *
 * @fires {CustomEvent<{ index: number }>} qds-change - Fired when the user
 * selects a tab. Not fired for programmatic changes.
 *
 * @csspart tablist - The element carrying the tablist role.
 *
 * @cssprop [--qds-component-tabs-gap] - Space between tabs.
 * @cssprop [--qds-component-tabs-border-width] - Thickness of the line under the tab list.
 * @cssprop [--qds-component-tabs-color-border-rest] - Color of the line under the tab list.
 */
@customElement('qds-tabs')
export class QdsTabs extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
      }

      .tablist {
        display: flex;
        gap: var(--qds-component-tabs-gap, 0.25rem);
        overflow-x: auto;
        border-block-end: var(--qds-component-tabs-border-width, 0.0625rem) solid
          var(--qds-component-tabs-color-border-rest, #e2e8f0);
      }
    `,
  ];

  /** Accessible name for the tab list. */
  @property()
  label = '';

  /**
   * The selected tab's position, from 0. Set it to select a tab. Initially the
   * tab marked `selected` in the markup, or the first enabled tab.
   */
  @property({ type: Number, attribute: 'selected-index' })
  selectedIndex = -1;

  /** Prefix for the IDs given to tabs and panels that have none. */
  readonly #idBase = `qds-tabs-${nextId++}`;

  constructor() {
    super();
    this.addEventListener('qds-tab-select', this.#handleSelect);
    this.addEventListener('keydown', this.#handleKeydown);
  }

  get #tabs(): QdsTab[] {
    return [...this.querySelectorAll(':scope > qds-tab')] as QdsTab[];
  }

  get #panels(): QdsTabPanel[] {
    return [...this.querySelectorAll(':scope > qds-tab-panel')] as QdsTabPanel[];
  }

  protected override firstUpdated(): void {
    // Not left to slotchange alone: server-rendered children are already
    // slotted when the element hydrates, so slotchange never fires for them.
    // Panels stay hidden until this runs, so nothing flashes in the meantime.
    void this.updateComplete.then(() => this.#sync());
  }

  protected override updated(): void {
    // Only once a selection exists. Resolving the initial one assigns
    // selectedIndex, which from inside updated() would schedule a second render;
    // firstUpdated and slotchange do that instead.
    if (this.selectedIndex >= 0) this.#sync();
  }

  #sync(): void {
    const tabs = this.#tabs;
    const panels = this.#panels;
    if (tabs.length === 0) return;

    const current = tabs[this.selectedIndex];
    if (!current || current.disabled) {
      const marked = tabs.findIndex((tab) => tab.hasAttribute('selected') && !tab.disabled);
      // Assigning re-runs updated() and so #sync(); finish there.
      const fallback = marked >= 0 ? marked : tabs.findIndex((tab) => !tab.disabled);
      if (fallback !== this.selectedIndex) {
        this.selectedIndex = fallback;
        return;
      }
    }

    tabs.forEach((tab, index) => {
      const panel = panels[index];
      tab.id ||= `${this.#idBase}-tab-${index}`;
      if (panel) {
        panel.id ||= `${this.#idBase}-panel-${index}`;
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
      }

      const selected = index === this.selectedIndex;
      tab.selected = selected;
      // Roving tabindex: only the selected tab is in the tab order.
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel, index) => {
      panel.active = index === this.selectedIndex;
    });
  }

  #select(index: number): void {
    if (index === this.selectedIndex) return;
    this.selectedIndex = index;
    this.dispatchEvent(
      new CustomEvent('qds-change', { detail: { index }, bubbles: true, composed: true }),
    );
  }

  #handleSelect = (event: Event): void => {
    const index = this.#tabs.indexOf(event.target as QdsTab);
    if (index === -1) return;
    this.#select(index);
  };

  #handleKeydown = (event: KeyboardEvent): void => {
    // Alt+Left is the browser's Back; leave every modified key to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const tabs = this.#tabs;
    const current = tabs.indexOf(event.target as QdsTab);
    if (current === -1) return;

    const enabled = tabs.filter((tab) => !tab.disabled);
    const position = enabled.indexOf(tabs[current]!);
    // Arrow keys follow the visual order, which reverses under RTL.
    const rtl = getComputedStyle(this).direction === 'rtl';

    let target: QdsTab | undefined;
    switch (event.key) {
      case 'ArrowRight':
        target = enabled[(position + (rtl ? -1 : 1) + enabled.length) % enabled.length];
        break;
      case 'ArrowLeft':
        target = enabled[(position + (rtl ? 1 : -1) + enabled.length) % enabled.length];
        break;
      case 'Home':
        target = enabled[0];
        break;
      case 'End':
        target = enabled.at(-1);
        break;
      default:
        return;
    }

    if (!target) return;
    event.preventDefault();
    this.#select(tabs.indexOf(target));
    target.focus();
  };

  override render(): TemplateResult {
    return html`
      <div class="tablist" part="tablist" role="tablist" aria-label=${this.label || nothing}>
        <slot name="tab" @slotchange=${() => this.#sync()}></slot>
      </div>
      <slot @slotchange=${() => this.#sync()}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-tabs': QdsTabs;
  }
}
