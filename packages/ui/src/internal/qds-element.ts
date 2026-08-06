import { LitElement, css } from 'lit';

/**
 * Base class for every QDS element.
 *
 * Exists so that cross-cutting concerns have exactly one home. Shadow DOM gives
 * each component its own stylesheet, which means anything genuinely shared —
 * box-sizing, the `hidden` contract, the focus ring — would otherwise be copied
 * into every component and drift.
 */
export class QdsElement extends LitElement {
  /**
   * Reset and shared primitives. Components spread this into their own `styles`:
   *
   * ```ts
   * static override styles = [QdsElement.baseStyles, css`…`];
   * ```
   *
   * It is not applied automatically, because a subclass assigning `styles` would
   * silently replace it rather than extend it.
   */
  static baseStyles = css`
    :host {
      box-sizing: border-box;
    }

    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }

    /*
     * The hidden attribute has no effect on a custom element whose :host sets an
     * explicit display, which every component here does. The !important is
     * warranted: hidden must win over the component's own display.
     *
     * Note: no backticks in these comments. This is inside a css tagged template,
     * so one would terminate the literal and the file would not parse.
     */
    :host([hidden]) {
      display: none !important;
    }
  `;

  /**
   * A focus ring drawn from semantic tokens.
   *
   * Uses `:focus-visible` so a pointer click does not draw it, and `outline`
   * rather than `box-shadow` so it survives forced-colors mode, where
   * box-shadow is discarded and the focus indicator would disappear entirely.
   */
  static focusRingStyles = css`
    .focus-ring:focus-visible {
      outline: var(--qds-semantic-border-primary, 0.125rem) solid
        var(--qds-semantic-color-border-primary, currentColor);
      outline-offset: 0.125rem;
    }
  `;
}
