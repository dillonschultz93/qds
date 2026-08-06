import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';

export type QdsStackDirection = 'block' | 'inline';
export type QdsStackGap = '0' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type QdsStackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type QdsStackJustify = 'start' | 'center' | 'end' | 'between' | 'around';

/**
 * Layout primitive that spaces its children using the spacing scale.
 *
 * Deliberately the least visual component in the library: its whole job is to
 * prove that the non-color tiers flow through the pipeline. A colour token
 * failing is obvious on sight, whereas a broken spacing token just looks like
 * slightly-off design, so `gap` is constrained to scale steps and nothing else —
 * an arbitrary value cannot be passed in.
 *
 * @element qds-stack
 *
 * @slot - The items to lay out.
 *
 * @cssprop [--qds-spacing-{step}] - The spacing scale this reads `gap` from.
 */
@customElement('qds-stack')
export class QdsStack extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--_gap, var(--qds-spacing-400, 1rem));
      }

      :host([direction='inline']) {
        flex-direction: row;
      }

      :host([wrap]) {
        flex-wrap: wrap;
      }

      /*
       * One rule per scale step, because CSS cannot build a variable name from an
       * attribute value. Constraining gap to the scale is the point: it makes
       * gap="17px" impossible rather than merely discouraged.
       */
      :host([gap='0']) {
        --_gap: var(--qds-spacing-0, 0rem);
      }
      :host([gap='100']) {
        --_gap: var(--qds-spacing-100, 0.25rem);
      }
      :host([gap='200']) {
        --_gap: var(--qds-spacing-200, 0.5rem);
      }
      :host([gap='300']) {
        --_gap: var(--qds-spacing-300, 0.75rem);
      }
      :host([gap='400']) {
        --_gap: var(--qds-spacing-400, 1rem);
      }
      :host([gap='500']) {
        --_gap: var(--qds-spacing-500, 1.5rem);
      }
      :host([gap='600']) {
        --_gap: var(--qds-spacing-600, 2rem);
      }
      :host([gap='700']) {
        --_gap: var(--qds-spacing-700, 3rem);
      }
      :host([gap='800']) {
        --_gap: var(--qds-spacing-800, 4rem);
      }
      :host([gap='900']) {
        --_gap: var(--qds-spacing-900, 6rem);
      }

      :host([align='start']) {
        align-items: flex-start;
      }
      :host([align='center']) {
        align-items: center;
      }
      :host([align='end']) {
        align-items: flex-end;
      }
      :host([align='stretch']) {
        align-items: stretch;
      }
      :host([align='baseline']) {
        align-items: baseline;
      }

      :host([justify='start']) {
        justify-content: flex-start;
      }
      :host([justify='center']) {
        justify-content: center;
      }
      :host([justify='end']) {
        justify-content: flex-end;
      }
      :host([justify='between']) {
        justify-content: space-between;
      }
      :host([justify='around']) {
        justify-content: space-around;
      }
    `,
  ];

  /**
   * Stacking axis. Named `block`/`inline` rather than `vertical`/`horizontal`
   * because the layout follows writing mode — `inline` runs right-to-left in an
   * RTL context, which is the behavior you want and the wrong thing to call
   * "horizontal".
   */
  @property({ reflect: true })
  direction: QdsStackDirection = 'block';

  /** Spacing scale step. */
  @property({ reflect: true })
  gap: QdsStackGap = '400';

  /** Cross-axis alignment. */
  @property({ reflect: true })
  align?: QdsStackAlign;

  /** Main-axis distribution. */
  @property({ reflect: true })
  justify?: QdsStackJustify;

  /** Allows items to wrap onto multiple lines. */
  @property({ type: Boolean, reflect: true })
  wrap = false;

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-stack': QdsStack;
  }
}
