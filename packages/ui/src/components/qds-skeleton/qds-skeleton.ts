import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsSkeletonShape = 'text' | 'rect' | 'circle';

/**
 * A placeholder shape shown where content is loading, roughly the size of what
 * will replace it, so the page does not jump when it arrives.
 *
 * ```html
 * <div aria-busy="true">
 *   <qds-skeleton shape="circle" style="width: 2.5rem; height: 2.5rem"></qds-skeleton>
 *   <qds-skeleton lines="3"></qds-skeleton>
 * </div>
 * ```
 *
 * A `text` skeleton draws bars of body text, as many as its `lines` attribute
 * asks for, the last one shorter. A `rect` or `circle` fills the width and height
 * given in CSS: an image, a card, an avatar. Give it a width wherever its
 * container sizes to its content, such as a flex row, since it has none of its own.
 *
 * It is hidden from assistive technology, which has nothing to read in it: mark
 * the region it stands in for with `aria-busy="true"` while it loads, or pair it
 * with a `qds-spinner` that names what is loading. It pulses gently, and holds
 * still under reduced motion.
 *
 * @element qds-skeleton
 *
 * @csspart base - The wrapper around the shapes.
 * @csspart shape - Each drawn shape: every line of a text skeleton.
 *
 * @cssprop [--qds-component-skeleton-color-background-rest] - Fill.
 * @cssprop [--qds-component-skeleton-border-radius] - Corner radius of lines and rectangles.
 * @cssprop [--qds-component-skeleton-gap] - Space between the lines of a text skeleton.
 * @cssprop [--qds-component-skeleton-text-height] - The height of each line.
 */
@customElement('qds-skeleton')
export class QdsSkeleton extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;
      }

      :host([shape='rect']) {
        height: 6rem;
      }

      :host([shape='circle']) {
        display: inline-block;
        width: 2.5rem;
        height: 2.5rem;
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-skeleton-gap, 0.5rem);
        height: 100%;
      }

      .shape {
        height: var(--qds-component-skeleton-text-height, 0.75rem);
        background-color: var(--qds-component-skeleton-color-background-rest, #e2e8f0);
        border-radius: var(--qds-component-skeleton-border-radius, 0.125rem);
        animation: pulse 1.6s ease-in-out infinite;
      }

      /* A paragraph's last line rarely fills the measure. */
      .shape.last {
        width: 60%;
      }

      :host([shape='rect']) .shape,
      :host([shape='circle']) .shape {
        height: 100%;
      }

      :host([shape='circle']) .shape {
        border-radius: 50%;
      }

      @keyframes pulse {
        50% {
          opacity: 0.5;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .shape {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        .shape {
          background-color: GrayText;
        }
      }
    `,
  ];

  /** What it stands in for: lines of `text`, or a `rect` or `circle` sized in CSS. */
  @property({ reflect: true })
  shape: QdsSkeletonShape = 'text';

  /** How many lines a `text` skeleton draws. */
  @property({ type: Number })
  lines = 1;

  override render(): TemplateResult {
    const count = this.shape === 'text' ? Math.max(1, Math.floor(this.lines) || 1) : 1;
    return html`
      <div class="base" part="base" aria-hidden="true">
        ${Array.from(
          { length: count },
          (_, index) => html`<div class=${count > 1 && index === count - 1 ? 'shape last' : 'shape'} part="shape"></div>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-skeleton': QdsSkeleton;
  }
}
