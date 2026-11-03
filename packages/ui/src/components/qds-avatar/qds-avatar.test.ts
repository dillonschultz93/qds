import { expect, fixture, html, elementUpdated, oneEvent } from '@open-wc/testing';

import './qds-avatar.js';
import type { QdsAvatar } from './qds-avatar.js';

const baseOf = (element: QdsAvatar): HTMLElement => element.shadowRoot!.querySelector('[part="base"]')!;

/** A 1×1 transparent GIF, so an image loads without the network. */
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

describe('qds-avatar', () => {
  it('shows initials from the first and last names, and is an image named for the person', async () => {
    const element = await fixture<QdsAvatar>(html`<qds-avatar name="Ada King Lovelace"></qds-avatar>`);

    expect(element.initials).to.equal('AL');
    expect(element.shadowRoot!.querySelector('[part="initials"]')?.textContent).to.equal('AL');
    expect(baseOf(element).getAttribute('role')).to.equal('img');
    expect(baseOf(element).getAttribute('aria-label')).to.equal('Ada King Lovelace');
    await expect(element).to.be.accessible();
  });

  it('uses one initial for a single name, and handles letters outside Latin', async () => {
    const one = await fixture<QdsAvatar>(html`<qds-avatar name="Prince"></qds-avatar>`);
    expect(one.initials).to.equal('P');

    const other = await fixture<QdsAvatar>(html`<qds-avatar name="élodie Ñúñez"></qds-avatar>`);
    expect(other.initials).to.equal('ÉÑ');
  });

  it('shows the image, decorative within the named frame', async () => {
    const element = await fixture<QdsAvatar>(html`<qds-avatar name="Grace Hopper" src=${PIXEL}></qds-avatar>`);
    const image = element.shadowRoot!.querySelector('img')!;

    expect(image.getAttribute('alt')).to.equal('');
    expect(element.shadowRoot!.querySelector('[part="initials"]') === null, 'no initials over an image').to.be.true;
  });

  it('falls back to initials when the image fails, and tries again for a new src', async () => {
    const element = await fixture<QdsAvatar>(html`<qds-avatar name="Grace Hopper" src="/does-not-exist.png"></qds-avatar>`);
    const image = element.shadowRoot!.querySelector('img');
    if (image) await oneEvent(image, 'error');
    await elementUpdated(element);
    expect(element.shadowRoot!.querySelector('[part="initials"]')?.textContent).to.equal('GH');

    element.src = PIXEL;
    await elementUpdated(element);
    expect(element.shadowRoot!.querySelector('img')).to.exist;
  });

  it('is decorative without a name, showing a person icon', async () => {
    const element = await fixture<QdsAvatar>(html`<qds-avatar></qds-avatar>`);

    expect(baseOf(element).getAttribute('aria-hidden')).to.equal('true');
    expect(baseOf(element).hasAttribute('role')).to.be.false;
    expect(element.shadowRoot!.querySelector('qds-icon')?.getAttribute('name')).to.equal('user');
  });

  it('takes its size from the size tokens', async () => {
    const widths: number[] = [];
    for (const size of ['sm', 'md', 'lg']) {
      const element = await fixture<QdsAvatar>(html`<qds-avatar name="A B" size=${size}></qds-avatar>`);
      widths.push(baseOf(element).getBoundingClientRect().width);
    }
    expect(widths).to.deep.equal([24, 32, 48]);
  });
});
