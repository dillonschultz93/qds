import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { QdsElement } from '../../internal/qds-element.js';
import '../qds-icon/qds-icon.js';

export type QdsAvatarSize = 'sm' | 'md' | 'lg';

/**
 * A person, as a round image, or their initials when there is no image or it
 * fails to load.
 *
 * The `name` is the avatar's accessible name and the source of its initials:
 * the first letters of the first and last words, so "Ada Lovelace" is "AL".
 * Without a name the avatar is decorative, as it should be beside text that
 * already names the person, and shows a generic person icon if it has no image.
 *
 * @element qds-avatar
 *
 * @csspart base - The round frame.
 * @csspart image - The image.
 * @csspart initials - The initials, shown without an image.
 *
 * @cssprop [--qds-component-avatar-{size}-width] - Width and height per size: `sm`, `md`, `lg`.
 * @cssprop [--qds-component-avatar-{size}-font-size] - Initials size per size.
 * @cssprop [--qds-component-avatar-font-weight] - Initials weight.
 * @cssprop [--qds-component-avatar-border-radius] - Corner radius: round by default.
 * @cssprop [--qds-component-avatar-color-background-rest] - Fill behind the initials.
 * @cssprop [--qds-component-avatar-color-content-rest] - Initials color.
 */
@customElement('qds-avatar')
export class QdsAvatar extends QdsElement {
  static override styles = [
    QdsElement.baseStyles,
    css`
      :host {
        --_size: var(--qds-component-avatar-md-width, 2rem);
        --_font-size: var(--qds-component-avatar-md-font-size, 0.875rem);

        display: inline-flex;
        flex: none;
        vertical-align: middle;
      }

      :host([size='sm']) {
        --_size: var(--qds-component-avatar-sm-width, 1.5rem);
        --_font-size: var(--qds-component-avatar-sm-font-size, 0.75rem);
      }

      :host([size='lg']) {
        --_size: var(--qds-component-avatar-lg-width, 3rem);
        --_font-size: var(--qds-component-avatar-lg-font-size, 1.125rem);
      }

      .avatar {
        display: inline-grid;
        place-items: center;
        width: var(--_size);
        height: var(--_size);
        overflow: hidden;

        font-family: var(--qds-typography-font-family-sans, inherit);
        font-size: var(--_font-size);
        font-weight: var(--qds-component-avatar-font-weight, 500);
        line-height: 1;
        color: var(--qds-component-avatar-color-content-rest, #0f172a);

        background-color: var(--qds-component-avatar-color-background-rest, #e2e8f0);
        border-radius: var(--qds-component-avatar-border-radius, 9999px);
        user-select: none;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      qds-icon {
        width: 60%;
        height: 60%;
      }

      @media (forced-colors: active) {
        .avatar {
          border: 1px solid CanvasText;
        }
      }
    `,
  ];

  /** The person's name: the accessible name, and the source of the initials. */
  @property()
  name = '';

  /** The image's URL. Initials show while it is missing or if it fails to load. */
  @property()
  src = '';

  /** Width and height, from the avatar size tokens. */
  @property({ reflect: true })
  size: QdsAvatarSize = 'md';

  /** Whether the image failed to load, so the initials show instead. */
  @state()
  private failed = false;

  /** The first letters of the first and last words of the name. */
  get initials(): string {
    const words = this.name.trim().split(/\s+/).filter(Boolean);
    const first = (word: string | undefined): string => (word ? [...word][0]!.toLocaleUpperCase() : '');
    return words.length > 1 ? first(words[0]) + first(words.at(-1)) : first(words[0]);
  }

  protected override firstUpdated(): void {
    // A server-rendered image can fail before the element hydrates, when no
    // error listener is attached yet, so check whether it already has.
    const image = this.renderRoot.querySelector('img');
    if (image?.complete && image.naturalWidth === 0) this.failed = true;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('src')) this.failed = false;
  }

  override render(): TemplateResult {
    const named = Boolean(this.name.trim());
    let content: TemplateResult;
    if (this.src && !this.failed) {
      content = html`<img part="image" src=${this.src} alt="" @error=${() => (this.failed = true)} />`;
    } else if (named) {
      content = html`<span part="initials" aria-hidden="true">${this.initials}</span>`;
    } else {
      content = html`<qds-icon name="user"></qds-icon>`;
    }
    return html`<span
      class="avatar"
      part="base"
      role=${named ? 'img' : nothing}
      aria-label=${named ? this.name : nothing}
      aria-hidden=${named ? nothing : 'true'}
      >${content}</span
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qds-avatar': QdsAvatar;
  }
}
