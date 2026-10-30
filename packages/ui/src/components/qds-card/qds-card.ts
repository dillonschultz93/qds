import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsCardVariant = 'outlined' | 'elevated' | 'filled';

/**
 * A container that groups related content and actions.
 *
 * The card is layout only: it has no role and is not interactive, so it adds
 * nothing to the accessibility tree. Put a heading in the `header` slot when the
 * card starts a section of the page, so it can be found by heading navigation.
 *
 * Empty regions take no space, with no script involved, so a server-rendered
 * card is laid out correctly before any JavaScript runs. Style slotted content
 * directly; the media, header, and footer have no wrapper parts.
 *
 * @element qds-card
 *
 * @slot - The body.
 * @slot media - Full-bleed content above the header, such as an image.
 * @slot header - The title area, typically a heading.
 * @slot footer - Actions or metadata at the bottom.
 *
 * @csspart base - The card surface.
 * @csspart body - The wrapper around the default slot.
 *
 * @cssprop [--qds-component-card-padding] - Inner padding.
 * @cssprop [--qds-component-card-gap] - Space between the header, body, and footer.
 * @cssprop [--qds-component-card-border-radius] - Corner radius.
 * @cssprop [--qds-component-card-border-width] - Border thickness.
 * @cssprop [--qds-component-card-color-content-rest] - Text color.
 * @cssprop [--qds-component-card-header-font-size] - Header text size.
 * @cssprop [--qds-component-card-header-font-weight] - Header text weight.
 * @cssprop [--qds-component-card-header-line-height] - Header line height.
 * @cssprop [--qds-component-card-{variant}-color-background-rest] - Fill per variant.
 * @cssprop [--qds-component-card-{variant}-color-border-rest] - Border per variant.
 * @cssprop [--qds-component-card-elevated-box-shadow] - Shadow of the elevated variant.
 */
@customElement('qds-card')
export class QdsCard extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;

        --_padding: var(--qds-component-card-padding, 1.5rem);
        --_bg: var(--qds-component-card-outlined-color-background-rest, #f8fafc);
        --_border: var(--qds-component-card-outlined-color-border-rest, #cbd5e1);
        --_shadow: none;
      }

      :host([variant='elevated']) {
        --_bg: var(--qds-component-card-elevated-color-background-rest, #f8fafc);
        --_border: var(--qds-component-card-elevated-color-border-rest, #e2e8f0);
        --_shadow: var(
          --qds-component-card-elevated-box-shadow,
          0 0.375rem 1rem 0.0625rem rgb(15 23 42 / 0.12)
        );
      }

      :host([variant='filled']) {
        --_bg: var(--qds-component-card-filled-color-background-rest, #f1f5f9);
        --_border: var(--qds-component-card-filled-color-border-rest, transparent);
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-card-gap, 0.75rem);
        height: 100%;
        padding: var(--_padding);
        /* Clip full-bleed media to the rounded corners. */
        overflow: hidden;

        font-family: var(--qds-typography-font-family-sans, inherit);
        color: var(--qds-component-card-color-content-rest, #0f172a);

        background-color: var(--_bg);
        border: var(--qds-component-card-border-width, 0.0625rem) solid var(--_border);
        border-radius: var(--qds-component-card-border-radius, 0.5rem);
        box-shadow: var(--_shadow);
      }

      /*
       * The media, header, and footer slots are deliberately not wrapped. A slot
       * is display: contents, so an empty one generates no box and the flex gap
       * is not applied around it — empty regions take no space with no script,
       * which also means a server-rendered card is laid out correctly before it
       * hydrates. Their content is styled with ::slotted() instead.
       *
       * (:host(:has(> [slot])) would read more directly, but Chromium does not
       * match :has() inside :host().)
       */
      ::slotted([slot='media']) {
        display: block;
        /* Bleed to the card edges by cancelling the padding around it. */
        margin: calc(-1 * var(--_padding)) calc(-1 * var(--_padding)) 0;
        width: calc(100% + 2 * var(--_padding));
        max-width: none;
        height: auto;
      }

      ::slotted([slot='header']) {
        margin: 0;
        font-size: var(--qds-component-card-header-font-size, 1.125rem);
        font-weight: var(--qds-component-card-header-font-weight, 600);
        line-height: var(--qds-component-card-header-line-height, 1.375);
      }

      .body {
        flex: 1;
      }

      ::slotted([slot='footer']) {
        margin-block-start: auto;
      }

      @media (forced-colors: active) {
        .base {
          border-color: CanvasText;
        }
      }
    `,
  ];

  /** Surface style. */
  @property({ reflect: true })
  variant: QdsCardVariant = 'outlined';

  override render(): TemplateResult {
    return html`
      <div class="base" part="base">
        <slot name="media"></slot>
        <slot name="header"></slot>
        <div class="body" part="body"><slot></slot></div>
        <slot name="footer"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-card': QdsCard;
  }
}
