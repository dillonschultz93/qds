import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import type { QdsSegment } from '../qds-segment/qds-segment.js';
import '../qds-segment/qds-segment.js';

/**
 * A compact row of mutually exclusive options, one always chosen: a list or
 * grid view, a time range, a unit.
 *
 * ```html
 * <qds-segmented-control label="View" value="list">
 *   <qds-segment value="list">List</qds-segment>
 *   <qds-segment value="board">Board</qds-segment>
 *   <qds-segment value="calendar">Calendar</qds-segment>
 * </qds-segmented-control>
 * ```
 *
 * It is a radio group to assistive technology, and behaves like one: Tab moves
 * into it and lands on the chosen segment, the arrow keys move between segments
 * and choose as they go, and Home and End jump to the ends. The `label` is its
 * accessible name, not shown, since a segmented control usually sits in a
 * toolbar or beside a heading that already says what it is for. In a form with
 * a visible question, use `qds-radio-group`.
 *
 * Something is always chosen: the `value`, the segment marked `checked`, or
 * else the first.
 *
 * @element qds-segmented-control
 *
 * @slot - The `qds-segment` options.
 *
 * @fires {CustomEvent<{ value: string }>} qds-change - Fired when the user
 * chooses a segment. Not fired for programmatic changes.
 *
 * @csspart base - The track holding the segments.
 *
 * @cssprop [--qds-component-segmented-control-gap] - Space between segments.
 * @cssprop [--qds-component-segmented-control-padding] - Space between the track's edge and its segments.
 * @cssprop [--qds-component-segmented-control-border-radius] - Track corner radius.
 * @cssprop [--qds-component-segmented-control-color-background-rest] - Track fill.
 * @cssprop [--qds-component-segmented-control-duration] - State transition duration.
 * @cssprop [--qds-component-segmented-control-segment-gap] - Space between a segment's icon and text.
 * @cssprop [--qds-component-segmented-control-segment-padding-block] - Segment vertical padding.
 * @cssprop [--qds-component-segmented-control-segment-padding-inline] - Segment horizontal padding.
 * @cssprop [--qds-component-segmented-control-segment-border-radius] - Segment corner radius.
 * @cssprop [--qds-component-segmented-control-segment-font-size] - Segment text size.
 * @cssprop [--qds-component-segmented-control-segment-font-weight] - Segment text weight.
 * @cssprop [--qds-component-segmented-control-segment-line-height] - Segment line height.
 * @cssprop [--qds-component-segmented-control-segment-box-shadow] - Elevation of the chosen segment.
 * @cssprop [--qds-component-segmented-control-segment-color-background-{state}] - Segment fill: `hover`, `selected`.
 * @cssprop [--qds-component-segmented-control-segment-color-content-{state}] - Segment text: `rest`, `hover`, `selected`, `disabled`.
 */
@customElement('qds-segmented-control')
export class QdsSegmentedControl extends QdsElement {
  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        display: inline-flex;
        max-width: 100%;
      }

      .base {
        display: flex;
        flex: 1;
        gap: var(--qds-component-segmented-control-gap, 0.25rem);
        padding: var(--qds-component-segmented-control-padding, 0.25rem);
        overflow-x: auto;

        background-color: var(--qds-component-segmented-control-color-background-rest, #f1f5f9);
        border-radius: var(--qds-component-segmented-control-border-radius, 0.375rem);
      }

      @media (forced-colors: active) {
        .base {
          border: 1px solid CanvasText;
        }
      }
    `,
  ];

  /** The chosen segment's value. */
  @property()
  value = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** The accessible name: what the options choose between. */
  @property()
  label = '';

  /** Disables every segment. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Disabled by its own attribute or by an ancestor `<fieldset disabled>`. */
  @state()
  private formDisabled = false;

  readonly #internals: ElementInternals;
  #defaultValue: string | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.addEventListener('qds-segment-select', this.#handleSelect);
    this.addEventListener('keydown', this.#handleKeydown);
  }

  /** The form this control belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** The control's segments, in order. */
  get segments(): QdsSegment[] {
    return [...this.querySelectorAll<QdsSegment>(':scope > qds-segment')];
  }

  get #enabledSegments(): QdsSegment[] {
    return this.segments.filter((segment) => !segment.disabled);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('value')) this.#internals.setFormValue(this.value || null);
  }

  protected override firstUpdated(): void {
    // After updateComplete, as qds-radio-group does: server-rendered segments
    // are slotted before hydration, so slotchange never fires for them.
    void this.updateComplete.then(() => this.#captureDefault());
  }

  protected override updated(): void {
    if (this.#defaultValue !== null) this.#syncSegments();
  }

  /** Called by the form on reset. */
  formResetCallback(): void {
    this.value = this.#defaultValue ?? '';
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  /** The initial choice: the value, the segment marked checked, or the first enabled one. */
  #captureDefault(): void {
    const segments = this.segments;
    if (this.#defaultValue !== null || segments.length === 0) return;
    if (!segments.some((segment) => segment.value === this.value)) {
      this.value = (segments.find((segment) => segment.hasAttribute('checked')) ?? this.#enabledSegments[0])?.value ?? '';
    }
    this.#defaultValue = this.value;
    this.#syncSegments();
  }

  #handleSlotChange(): void {
    this.#captureDefault();
    if (this.#defaultValue !== null) this.#syncSegments();
  }

  #syncSegments(): void {
    const disabled = this.disabled || this.formDisabled;
    const segments = this.segments;
    for (const segment of segments) {
      segment.checked = segment.value === this.value;
      segment.groupDisabled = disabled;
    }
    // Roving tabindex: only the chosen segment, or the first enabled one, is in the tab order.
    const tabbable = disabled
      ? undefined
      : (segments.find((segment) => segment.checked && !segment.disabled) ?? this.#enabledSegments[0]);
    for (const segment of segments) segment.tabIndex = segment === tabbable ? 0 : -1;
  }

  #choose(segment: QdsSegment): void {
    if (segment.value === this.value) return;
    this.value = segment.value;
    // Synchronously, so a qds-change listener reading FormData sees the new value.
    this.#internals.setFormValue(this.value);
    this.#syncSegments();
    this.dispatchEvent(new CustomEvent('qds-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  #handleSelect = (event: Event): void => {
    if (this.disabled || this.formDisabled) return;
    const segment = event.target as QdsSegment;
    if (!this.segments.includes(segment)) return;
    this.#choose(segment);
    segment.focus();
  };

  #handleKeydown = (event: KeyboardEvent): void => {
    if (this.disabled || this.formDisabled) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const segments = this.#enabledSegments;
    const current = segments.indexOf(event.target as QdsSegment);
    if (current === -1) return;

    // Left and Right follow the visual order, which reverses under RTL.
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward = (current + 1) % segments.length;
    const backward = (current - 1 + segments.length) % segments.length;

    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = forward;
        break;
      case 'ArrowUp':
        next = backward;
        break;
      case 'ArrowRight':
        next = rtl ? backward : forward;
        break;
      case 'ArrowLeft':
        next = rtl ? forward : backward;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = segments.length - 1;
        break;
      case ' ':
      case 'Enter':
        next = current;
        break;
      default:
        return;
    }

    event.preventDefault();
    const segment = segments[next]!;
    this.#choose(segment);
    segment.focus();
  };

  override render(): TemplateResult {
    return html`
      <div
        class="base"
        part="base"
        role="radiogroup"
        aria-label=${this.label || nothing}
        aria-disabled=${this.disabled || this.formDisabled ? 'true' : nothing}
      >
        <slot @slotchange=${this.#handleSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-segmented-control': QdsSegmentedControl;
  }
}
