import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsSpinnerSize = 'sm' | 'md' | 'lg';

/**
 * A loading indicator, for a wait with no measurable progress: a region of the
 * page loading, or a request in flight. For a wait that can report how far
 * along it is, use `qds-progress-bar`; for a button that is busy, use its
 * `loading` attribute, which draws the same spinner inside it.
 *
 * It is an indeterminate progress bar to assistive technology, named by its
 * `label`, so a screen reader says what is loading. Under reduced motion it
 * turns in slow steps rather than spinning.
 *
 * @element qds-spinner
 *
 * @csspart base - The spinning ring.
 *
 * @cssprop [--qds-component-spinner-{size}-width] - Width and height per size: `sm`, `md`, `lg`.
 * @cssprop [--qds-component-spinner-border-width] - Ring thickness.
 * @cssprop [--qds-component-spinner-color-content-rest] - The moving arc.
 * @cssprop [--qds-component-spinner-color-border-rest] - The track the arc moves around.
 */
@customElement('qds-spinner')
export class QdsSpinner extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        --_size: var(--qds-component-spinner-md-width, 1.25rem);

        display: inline-flex;
        flex: none;
        vertical-align: middle;
      }

      :host([size='sm']) {
        --_size: var(--qds-component-spinner-sm-width, 1rem);
      }

      :host([size='lg']) {
        --_size: var(--qds-component-spinner-lg-width, 1.5rem);
      }

      .spinner {
        width: var(--_size);
        height: var(--_size);
        border: var(--qds-component-spinner-border-width, 0.125rem) solid
          var(--qds-component-spinner-color-border-rest, #e2e8f0);
        border-block-start-color: var(--qds-component-spinner-color-content-rest, #1d4ed8);
        border-radius: 50%;
        animation: spin 600ms linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /*
       * Still moving, since a frozen spinner reads as a hang, but in eight slow
       * steps rather than a continuous spin. The same treatment as qds-button's.
       */
      @media (prefers-reduced-motion: reduce) {
        .spinner {
          animation-duration: 1600ms;
          animation-timing-function: steps(8, end);
        }
      }

      @media (forced-colors: active) {
        .spinner {
          border-color: GrayText;
          border-block-start-color: Highlight;
        }
      }
    `,
  ];

  /** Width and height, from the spinner size tokens. */
  @property({ reflect: true })
  size: QdsSpinnerSize = 'md';

  /** What is loading, for assistive technology: "Loading results". */
  @property()
  label = 'Loading';

  override render(): TemplateResult {
    return html`<span class="spinner" part="base" role="progressbar" aria-label=${this.label}></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-spinner': QdsSpinner;
  }
}
