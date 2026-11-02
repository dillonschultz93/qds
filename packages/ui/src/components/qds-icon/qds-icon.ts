import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

import { QdsElement } from '../../internal/qds-element.js';
import { getIcon, iconMarkup, iconRegistryEvents } from '../../internal/icons.js';

export { registerIcons } from '../../internal/icons.js';
export type { QdsIconData } from '../../internal/icons.js';

export type QdsIconSize = 'sm' | 'md' | 'lg';

/**
 * An icon from QDS's set, which is Lucide's: 24 × 24 outlines drawn in the
 * current text color.
 *
 * A handful of icons are built in, the ones QDS's own components use. Any other
 * Lucide icon is one import and one call away:
 *
 * ```js
 * import { registerIcons } from '@quieto/ui';
 * import { Trash2 } from 'lucide';
 *
 * registerIcons({ trash: Trash2 });
 * ```
 *
 * An icon is decorative unless it has a `label`: without one it is hidden from
 * assistive technology, as an icon beside text should be, since the text already
 * says what it means. Give an icon that stands alone a `label`.
 *
 * @element qds-icon
 *
 * @csspart svg - The SVG element.
 *
 * @cssprop [--qds-component-icon-{size}-width] - Width and height per size: `sm`, `md`, `lg`.
 */
@customElement('qds-icon')
export class QdsIcon extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        --_size: var(--qds-component-icon-md-width, 1.25rem);

        display: inline-flex;
        flex: none;
        width: var(--_size);
        height: var(--_size);
        vertical-align: middle;
        color: inherit;
      }

      :host([size='sm']) {
        --_size: var(--qds-component-icon-sm-width, 1rem);
      }

      :host([size='lg']) {
        --_size: var(--qds-component-icon-lg-width, 1.5rem);
      }

      svg {
        width: 100%;
        height: 100%;
      }

      @media (forced-colors: active) {
        svg {
          color: CanvasText;
        }
      }
    `,
  ];

  /** The icon's name, as registered: `check`, `chevron-down`, or any name passed to `registerIcons`. */
  @property({ reflect: true })
  name = '';

  /** Width and height, from the icon size tokens. */
  @property({ reflect: true })
  size: QdsIconSize = 'md';

  /**
   * What the icon means, for an icon that stands alone. Without it the icon is
   * decorative and hidden from assistive technology.
   */
  @property()
  label: string | null = null;

  #onRegistryChange = (): void => this.requestUpdate();

  override connectedCallback(): void {
    super.connectedCallback();
    iconRegistryEvents.addEventListener('change', this.#onRegistryChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    iconRegistryEvents.removeEventListener('change', this.#onRegistryChange);
  }

  override render(): TemplateResult {
    const data = getIcon(this.name);
    return html`<svg
      part="svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role=${this.label ? 'img' : nothing}
      aria-label=${this.label || nothing}
      aria-hidden=${this.label ? nothing : 'true'}
    >${data ? unsafeSVG(iconMarkup(data)) : nothing}</svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-icon': QdsIcon;
  }
}
