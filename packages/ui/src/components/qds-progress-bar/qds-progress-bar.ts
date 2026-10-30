import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsProgressBarVariant = 'primary' | 'success' | 'warning' | 'error';

/**
 * Shows how far along a task is.
 *
 * Determinate when `value` is set, indeterminate when it is not — for work whose
 * length is unknown. The indeterminate state is announced as busy with no
 * percentage, rather than as 0%, which would claim the task had not started.
 *
 * Needs an accessible name: set `label` to say what is progressing ("Uploading
 * report.pdf"). It is not shown visibly; put visible text beside the bar if
 * sighted users need it too.
 *
 * @element qds-progress-bar
 *
 * @csspart track - The full-width background, carrying the progressbar role.
 * @csspart indicator - The filled portion.
 *
 * @cssprop [--qds-component-progress-bar-height] - Bar thickness.
 * @cssprop [--qds-component-progress-bar-border-radius] - Corner radius of the track and indicator.
 * @cssprop [--qds-component-progress-bar-duration] - How long the indicator takes to move to a new value.
 * @cssprop [--qds-component-progress-bar-color-background-rest] - Track color.
 * @cssprop [--qds-component-progress-bar-{variant}-color-background-rest] - Indicator color per variant.
 */
@customElement('qds-progress-bar')
export class QdsProgressBar extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: block;

        --_fill: var(--qds-component-progress-bar-primary-color-background-rest, #2563eb);
      }

      :host([variant='success']) {
        --_fill: var(--qds-component-progress-bar-success-color-background-rest, #059669);
      }

      :host([variant='warning']) {
        --_fill: var(--qds-component-progress-bar-warning-color-background-rest, #d97706);
      }

      :host([variant='error']) {
        --_fill: var(--qds-component-progress-bar-error-color-background-rest, #dc2626);
      }

      .track {
        position: relative;
        height: var(--qds-component-progress-bar-height, 0.5rem);
        overflow: hidden;
        background-color: var(--qds-component-progress-bar-color-background-rest, #e2e8f0);
        border-radius: var(--qds-component-progress-bar-border-radius, 9999px);
      }

      .indicator {
        height: 100%;
        background-color: var(--_fill);
        border-radius: inherit;
        transition: width var(--qds-component-progress-bar-duration, 200ms) ease-out;
      }

      .indeterminate .indicator {
        position: absolute;
        width: 40%;
        animation: slide 1.4s ease-in-out infinite;
      }

      /* Travels toward the inline end, so it reverses under RTL. */
      @keyframes slide {
        from {
          inset-inline-start: -40%;
        }
        to {
          inset-inline-start: 100%;
        }
      }

      /*
       * Without motion an indeterminate bar has to say "working" some other way.
       * A slow pulse across the whole track does, without anything travelling.
       */
      @media (prefers-reduced-motion: reduce) {
        .indicator {
          transition: none;
        }

        .indeterminate .indicator {
          inset-inline-start: 0;
          width: 100%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          50% {
            opacity: 0.4;
          }
        }
      }

      @media (forced-colors: active) {
        .track {
          border: 0.0625rem solid CanvasText;
        }

        .indicator {
          background-color: Highlight;
        }
      }
    `,
  ];

  /**
   * Progress from 0 to `max`. Leave unset for an indeterminate bar. Values
   * outside the range are clamped.
   */
  @property({ type: Number })
  value: number | null = null;

  /** The value that means complete. */
  @property({ type: Number })
  max = 100;

  /** Accessible name: what is progressing. */
  @property()
  label = '';

  /** Indicator color. */
  @property({ reflect: true })
  variant: QdsProgressBarVariant = 'primary';

  /** The value clamped to 0..max, or null when indeterminate. */
  get #clamped(): number | null {
    if (this.value === null || Number.isNaN(this.value)) return null;
    const max = this.max > 0 ? this.max : 100;
    return Math.min(Math.max(this.value, 0), max);
  }

  override render(): TemplateResult {
    const value = this.#clamped;
    const max = this.max > 0 ? this.max : 100;
    const indeterminate = value === null;

    return html`
      <div
        class=${indeterminate ? 'track indeterminate' : 'track'}
        part="track"
        role="progressbar"
        aria-label=${this.label || nothing}
        aria-valuemin="0"
        aria-valuemax=${max}
        aria-valuenow=${indeterminate ? nothing : value}
        aria-busy=${indeterminate ? 'true' : nothing}
      >
        <div
          class="indicator"
          part="indicator"
          style=${styleMap(indeterminate ? {} : { width: `${(value / max) * 100}%` })}
        ></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-progress-bar': QdsProgressBar;
  }
}
