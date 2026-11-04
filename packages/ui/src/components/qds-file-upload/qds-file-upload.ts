import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

/** A size in bytes, written in the reader's language: "820 kB", "2.4 MB". */
function formatSize(bytes: number): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(undefined, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: unit === 0 ? 'long' : 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

/**
 * Whether `file` matches an `accept` list, by the native input's rules: a file
 * extension (`.pdf`), a MIME type (`image/png`), or a wildcard (`image/*`).
 */
function accepts(accept: string, file: File): boolean {
  const patterns = accept
    .split(',')
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return patterns.some((pattern) =>
    pattern.startsWith('.')
      ? name.endsWith(pattern)
      : pattern.endsWith('/*')
        ? type.startsWith(pattern.slice(0, -1))
        : type === pattern,
  );
}

/**
 * A place to choose files, by browsing or by dropping them on it, with the
 * chosen files listed below and a way to remove each.
 *
 * ```html
 * <qds-file-upload label="Attachments" name="attachments" accept=".pdf,image/*" multiple></qds-file-upload>
 * ```
 *
 * It submits with its form like a native file input: each file under `name`.
 * The "Choose files" button opens the system's file picker, which is also how
 * keyboard and screen reader users add files, so dropping is never the only
 * way. Dropped files the `accept` list does not allow are left out, with a
 * message saying which; the picker filters them itself.
 *
 * The component holds the files; it does not send them anywhere. To upload as
 * soon as files are chosen, listen for `qds-change` and read `files`.
 *
 * @element qds-file-upload
 *
 * @slot label - The label, in place of the `label` attribute when it needs markup.
 * @slot hint - The hint, in place of the `hint` attribute when it needs markup.
 *
 * @fires {CustomEvent<{ files: File[] }>} qds-change - Fired when files are added or removed.
 *
 * @csspart base - The wrapper around the whole field.
 * @csspart label - The label.
 * @csspart dropzone - The area files can be dropped on.
 * @csspart button - The button that opens the file picker.
 * @csspart files - The list of chosen files.
 * @csspart file - Each chosen file.
 * @csspart hint - The hint text.
 * @csspart error - The error message.
 *
 * @cssprop [--qds-component-file-upload-gap] - Space between the label, drop zone, list, and messages.
 * @cssprop [--qds-component-file-upload-duration] - Color transition duration.
 * @cssprop [--qds-component-file-upload-label-font-size] - Label size.
 * @cssprop [--qds-component-file-upload-label-font-weight] - Label weight.
 * @cssprop [--qds-component-file-upload-label-color-content-{state}] - Label color: `rest`, `disabled`.
 * @cssprop [--qds-component-file-upload-hint-font-size] - Hint and error size.
 * @cssprop [--qds-component-file-upload-hint-color-content-rest] - Hint color.
 * @cssprop [--qds-component-file-upload-error-color-content-rest] - Error message color.
 * @cssprop [--qds-component-file-upload-dropzone-gap] - Space between the drop zone's icon, text, and button.
 * @cssprop [--qds-component-file-upload-dropzone-padding] - Space inside the drop zone.
 * @cssprop [--qds-component-file-upload-dropzone-border-radius] - Drop zone corner radius.
 * @cssprop [--qds-component-file-upload-dropzone-border-width] - Drop zone border thickness, drawn dashed.
 * @cssprop [--qds-component-file-upload-dropzone-font-size] - Drop zone text size.
 * @cssprop [--qds-component-file-upload-dropzone-color-background-{state}] - Drop zone fill: `rest`, `hover` (files dragged over it), `disabled`.
 * @cssprop [--qds-component-file-upload-dropzone-color-border-{state}] - Drop zone border: `rest`, `hover`, `disabled`.
 * @cssprop [--qds-component-file-upload-dropzone-color-content-{state}] - Drop zone text: `rest`, `disabled`.
 * @cssprop [--qds-component-file-upload-invalid-color-border-rest] - Drop zone border while showing an error.
 * @cssprop [--qds-component-file-upload-icon-color-content-rest] - Icon color.
 * @cssprop [--qds-component-file-upload-file-gap] - Space between a file's icon, name, and remove button.
 * @cssprop [--qds-component-file-upload-file-padding-block] - File row vertical padding.
 * @cssprop [--qds-component-file-upload-file-padding-inline] - File row horizontal padding.
 * @cssprop [--qds-component-file-upload-file-border-radius] - File row corner radius.
 * @cssprop [--qds-component-file-upload-file-border-width] - File row border thickness.
 * @cssprop [--qds-component-file-upload-file-font-size] - File name size.
 * @cssprop [--qds-component-file-upload-file-color-background-rest] - File row fill.
 * @cssprop [--qds-component-file-upload-file-color-border-rest] - File row border.
 * @cssprop [--qds-component-file-upload-file-color-content-rest] - File name color.
 * @cssprop [--qds-component-file-upload-file-size-color-content-rest] - File size color.
 */
@customElement('qds-file-upload')
export class QdsFileUpload extends QdsElement {
  static formAssociated = true;

  static override styles = [
    QdsElement.baseStyles,
    QdsElement.focusRingStyles,
    css`
      :host {
        display: block;

        --_border: var(--qds-component-file-upload-dropzone-color-border-rest, #64748b);
        --_background: var(--qds-component-file-upload-dropzone-color-background-rest, #f8fafc);
      }

      .base {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-file-upload-gap, 0.5rem);
        font-family: var(--qds-typography-font-family-sans, inherit);
      }

      .label {
        font-size: var(--qds-component-file-upload-label-font-size, 0.875rem);
        font-weight: var(--qds-component-file-upload-label-font-weight, 500);
        color: var(--qds-component-file-upload-label-color-content-rest, #0f172a);
      }

      .required {
        margin-inline-start: 0.125em;
        color: var(--qds-component-file-upload-error-color-content-rest, #b91c1c);
      }

      .dropzone {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--qds-component-file-upload-dropzone-gap, 0.5rem);
        padding: var(--qds-component-file-upload-dropzone-padding, 1.5rem);

        font-size: var(--qds-component-file-upload-dropzone-font-size, 0.875rem);
        text-align: center;
        color: var(--qds-component-file-upload-dropzone-color-content-rest, #64748b);

        background-color: var(--_background);
        border: var(--qds-component-file-upload-dropzone-border-width, 0.125rem) dashed var(--_border);
        border-radius: var(--qds-component-file-upload-dropzone-border-radius, 0.5rem);

        transition:
          background-color var(--qds-component-file-upload-duration, 120ms),
          border-color var(--qds-component-file-upload-duration, 120ms);
      }

      .invalid .dropzone {
        --_border: var(--qds-component-file-upload-invalid-color-border-rest, #dc2626);
      }

      .dragging .dropzone {
        --_border: var(--qds-component-file-upload-dropzone-color-border-hover, #2563eb);
        --_background: var(--qds-component-file-upload-dropzone-color-background-hover, #f1f5f9);
      }

      .dropzone qds-icon,
      .file qds-icon {
        color: var(--qds-component-file-upload-icon-color-content-rest, #64748b);
      }

      .prompt {
        margin: 0;
      }

      /*
       * A plain button styled as a link-like action, rather than a qds-button:
       * the drop zone around it is already the visual target.
       */
      button {
        margin: 0;
        padding: 0;
        font: inherit;
        font-weight: 500;
        color: var(--qds-semantic-color-content-primary-rest, #1d4ed8);
        background: none;
        border: 0;
        border-radius: 0.125rem;
        text-decoration: underline;
        text-underline-offset: 0.2em;
        cursor: pointer;
      }

      button:hover {
        color: var(--qds-semantic-color-content-primary-hover, #1e40af);
      }

      .files {
        display: flex;
        flex-direction: column;
        gap: var(--qds-component-file-upload-gap, 0.5rem);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .file {
        display: flex;
        align-items: center;
        gap: var(--qds-component-file-upload-file-gap, 0.5rem);
        padding: var(--qds-component-file-upload-file-padding-block, 0.5rem)
          var(--qds-component-file-upload-file-padding-inline, 0.75rem);

        font-size: var(--qds-component-file-upload-file-font-size, 0.875rem);
        color: var(--qds-component-file-upload-file-color-content-rest, #0f172a);

        background-color: var(--qds-component-file-upload-file-color-background-rest, #f8fafc);
        border: var(--qds-component-file-upload-file-border-width, 0.0625rem) solid
          var(--qds-component-file-upload-file-color-border-rest, #e2e8f0);
        border-radius: var(--qds-component-file-upload-file-border-radius, 0.375rem);
      }

      .name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .size {
        flex: none;
        color: var(--qds-component-file-upload-file-size-color-content-rest, #64748b);
        font-variant-numeric: tabular-nums;
      }

      .remove {
        display: inline-flex;
        padding: 0.125rem;
        color: var(--qds-component-file-upload-icon-color-content-rest, #64748b);
        text-decoration: none;
      }

      .remove qds-icon {
        color: inherit;
      }

      .hint,
      .error {
        font-size: var(--qds-component-file-upload-hint-font-size, 0.75rem);
      }

      .hint {
        color: var(--qds-component-file-upload-hint-color-content-rest, #64748b);
      }

      .error {
        color: var(--qds-component-file-upload-error-color-content-rest, #b91c1c);
      }

      :host(:disabled) .label {
        color: var(--qds-component-file-upload-label-color-content-disabled, #64748b);
      }

      :host(:disabled) .dropzone {
        --_border: var(--qds-component-file-upload-dropzone-color-border-disabled, #e2e8f0);
        --_background: var(--qds-component-file-upload-dropzone-color-background-disabled, #f1f5f9);
        color: var(--qds-component-file-upload-dropzone-color-content-disabled, #64748b);
      }

      :host(:disabled) button {
        color: inherit;
        cursor: not-allowed;
        text-decoration: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .dropzone {
          transition: none;
        }
      }

      @media (forced-colors: active) {
        .dropzone {
          border-color: CanvasText;
        }

        .dragging .dropzone {
          border-color: Highlight;
        }
      }
    `,
  ];

  /** The visible label, which also names the drop zone. */
  @property()
  label = '';

  /** Help text shown under the field, and read out with the button: allowed types, a size limit. */
  @property()
  hint = '';

  /**
   * An error message to show, for errors the component cannot detect, such as a
   * file the server rejected. Does not block form submission.
   */
  @property()
  error = '';

  /** Field name used when the form is submitted. */
  @property()
  name = '';

  /** The file types allowed, as for a native file input: `.pdf,image/*`. */
  @property()
  accept = '';

  /** Allows more than one file. Without it, a new file replaces the last. */
  @property({ type: Boolean, reflect: true })
  multiple = false;

  /** Makes the form invalid until a file is chosen. */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Prevents adding and removing files, and excludes them from form submission. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  @query('input')
  private readonly input!: HTMLInputElement;

  /** The chosen files. */
  @state()
  private chosen: File[] = [];

  @state()
  private formDisabled = false;

  @state()
  private dragging = false;

  /** Whether the required message may show yet. */
  @state()
  private touched = false;

  /** The names of dropped files left out because `accept` did not allow them. */
  @state()
  private rejected: string[] = [];

  @state()
  private hasHintSlot = false;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.addEventListener('invalid', () => (this.touched = true));
  }

  /** The chosen files, in the order they were added. */
  get files(): File[] {
    return [...this.chosen];
  }

  /** The form this field belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** Same as the native `checkValidity()`. */
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  /** Same as the native `reportValidity()`, and shows the field's message. */
  reportValidity(): boolean {
    this.touched = true;
    return this.#internals.reportValidity();
  }

  /** Same as the native `validity`. */
  get validity(): ValidityState {
    return this.#internals.validity;
  }

  /** Removes every chosen file. */
  clear(): void {
    this.#setFiles([]);
  }

  protected override firstUpdated(): void {
    // Again now the browse button exists, to anchor the validity message to it.
    this.#sync();
    void this.updateComplete.then(() => {
      this.hasHintSlot = this.querySelector(':scope > [slot="hint"]') !== null;
    });
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('chosen') || changed.has('name') || changed.has('required')) this.#sync();
  }

  #sync(): void {
    if (this.chosen.length > 0 && this.name) {
      const data = new FormData();
      for (const file of this.chosen) data.append(this.name, file);
      this.#internals.setFormValue(data);
    } else {
      this.#internals.setFormValue(null);
    }
    if (this.required && this.chosen.length === 0) {
      this.#internals.setValidity(
        { valueMissing: true },
        this.multiple ? 'Select at least one file.' : 'Select a file.',
        // The browse button, which the browser focuses when the form is submitted without a file.
        this.renderRoot?.querySelector<HTMLButtonElement>('.browse') ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  /** Called by the form on reset: no files, and no messages. */
  formResetCallback(): void {
    this.chosen = [];
    this.rejected = [];
    this.touched = false;
  }

  /** Called when this element's disabled state changes, from its own attribute or a fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  get #isDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  #setFiles(files: File[]): void {
    this.chosen = files;
    this.touched = true;
    // Synchronously, so a qds-change listener reading FormData or validity sees the new state.
    this.#sync();
    this.dispatchEvent(new CustomEvent('qds-change', { detail: { files: this.files }, bubbles: true, composed: true }));
  }

  #add(incoming: File[]): void {
    const allowed = incoming.filter((file) => accepts(this.accept, file));
    this.rejected = incoming.filter((file) => !allowed.includes(file)).map((file) => file.name);
    if (allowed.length === 0) return;
    this.#setFiles(this.multiple ? [...this.chosen, ...allowed] : [allowed[0]!]);
  }

  #remove(file: File, index: number): void {
    this.#setFiles(this.chosen.filter((chosen) => chosen !== file));
    // Focus would be lost with the removed row: move it to the next row's
    // button, or the previous, or back to the picker.
    void this.updateComplete.then(() => {
      const buttons = this.renderRoot.querySelectorAll<HTMLButtonElement>('.remove');
      (buttons[index] ?? buttons[index - 1] ?? this.renderRoot.querySelector<HTMLButtonElement>('.browse'))?.focus();
    });
  }

  #onPick(): void {
    this.#add([...(this.input.files ?? [])]);
    // Cleared, so choosing the same file again still fires change.
    this.input.value = '';
  }

  #onDragOver(event: DragEvent): void {
    if (this.#isDisabled || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dragging = true;
  }

  #onDragLeave(event: DragEvent): void {
    // Leaving for a child of the drop zone is not leaving it.
    if (!(event.currentTarget as Element).contains(event.relatedTarget as Node | null)) this.dragging = false;
  }

  #onDrop(event: DragEvent): void {
    this.dragging = false;
    if (this.#isDisabled) return;
    event.preventDefault();
    const files = [...(event.dataTransfer?.files ?? [])];
    this.#add(this.multiple ? files : files.slice(0, 1));
  }

  override render(): TemplateResult {
    const disabled = this.#isDisabled;
    const missing = this.touched && this.required && this.chosen.length === 0;
    const rejected =
      this.rejected.length > 0
        ? `${this.rejected.join(', ')} ${this.rejected.length === 1 ? 'is not an accepted file type' : 'are not accepted file types'}.`
        : '';
    const error =
      this.error || rejected || (missing ? (this.multiple ? 'Select at least one file.' : 'Select a file.') : '');
    const hasHint = Boolean(this.hint) || this.hasHintSlot;
    const describedBy = ['hint', error ? 'error' : ''].filter((id) => id && (id !== 'hint' || hasHint)).join(' ');
    const classes = ['base', error ? 'invalid' : '', this.dragging ? 'dragging' : ''].filter(Boolean).join(' ');

    return html`
      <div class=${classes} part="base">
        <div id="label" class="label" part="label">
          <slot name="label">${this.label}</slot>
          ${this.required ? html`<span class="required" aria-hidden="true">*</span>` : nothing}
        </div>
        <div
          class="dropzone"
          part="dropzone"
          role="group"
          aria-labelledby="label"
          @dragover=${this.#onDragOver}
          @dragleave=${this.#onDragLeave}
          @drop=${this.#onDrop}
        >
          <qds-icon name="upload" size="lg"></qds-icon>
          <p class="prompt">
            ${this.multiple ? 'Drag files here, or' : 'Drag a file here, or'}
            <button
              class="browse focus-ring"
              part="button"
              type="button"
              aria-describedby=${describedBy || nothing}
              ?disabled=${disabled}
              @click=${() => this.input.click()}
            >
              ${this.multiple ? 'choose files' : 'choose a file'}
            </button>
          </p>
          <input
            type="file"
            hidden
            tabindex="-1"
            accept=${this.accept || nothing}
            ?multiple=${this.multiple}
            ?disabled=${disabled}
            @change=${this.#onPick}
          />
        </div>
        ${this.chosen.length > 0
          ? html`
              <ul class="files" part="files" aria-label="Chosen files">
                ${this.chosen.map(
                  (file, index) => html`
                    <li class="file" part="file">
                      <qds-icon name="file" size="sm"></qds-icon>
                      <span class="name">${file.name}</span>
                      <span class="size">${formatSize(file.size)}</span>
                      <button
                        class="remove focus-ring"
                        type="button"
                        aria-label="Remove ${file.name}"
                        ?disabled=${disabled}
                        @click=${() => this.#remove(file, index)}
                      >
                        <qds-icon name="x" size="sm"></qds-icon>
                      </button>
                    </li>
                  `,
                )}
              </ul>
            `
          : nothing}
        <div id="hint" class="hint" part="hint" ?hidden=${!hasHint}>
          <slot
            name="hint"
            @slotchange=${(event: Event) => {
              this.hasHintSlot = (event.target as HTMLSlotElement).assignedNodes().length > 0;
            }}
            >${this.hint}</slot
          >
        </div>
        ${error ? html`<div id="error" class="error" part="error" role="alert">${error}</div>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-file-upload': QdsFileUpload;
  }
}
