import { expect, fixture, html, elementUpdated } from '@open-wc/testing';

import './qds-card.js';
import type { QdsCard } from './qds-card.js';

const base = (element: QdsCard): HTMLElement =>
  element.shadowRoot?.querySelector('.base') as HTMLElement;

/** How far the body sits below the card's top edge: the space the regions above it take. */
const bodyTop = (element: QdsCard): number =>
  (element.shadowRoot?.querySelector('.body') as HTMLElement).getBoundingClientRect().top -
  base(element).getBoundingClientRect().top;

describe('qds-card', () => {
  it('renders an outlined card with its body', async () => {
    const element = await fixture<QdsCard>(html`<qds-card>Body text</qds-card>`);

    expect(element.variant).to.equal('outlined');
    expect(element.textContent?.trim()).to.equal('Body text');
  });

  it('is accessible with every region filled, in every variant', async () => {
    for (const variant of ['outlined', 'elevated', 'filled'] as const) {
      const element = await fixture(html`
        <qds-card variant=${variant}>
          <img slot="media" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
          <h3 slot="header">Title</h3>
          <p>Body</p>
          <div slot="footer"><a href="#">Read more</a></div>
        </qds-card>
      `);
      await expect(element).to.be.accessible();
    }
  });

  it('gives empty regions no space, including no gap', async () => {
    const element = await fixture<QdsCard>(html`<qds-card>Body only</qds-card>`);
    const padding = parseFloat(getComputedStyle(base(element)).paddingBlockStart);
    const border = parseFloat(getComputedStyle(base(element)).borderBlockStartWidth);

    expect(bodyTop(element)).to.equal(padding + border);
  });

  it('makes room for a region as soon as content is slotted, and gives it back', async () => {
    const element = await fixture<QdsCard>(html`<qds-card>Body</qds-card>`);
    const empty = bodyTop(element);

    const header = document.createElement('h3');
    header.slot = 'header';
    header.textContent = 'Added later';
    element.append(header);
    await elementUpdated(element);
    expect(bodyTop(element)).to.be.greaterThan(empty);

    header.remove();
    await elementUpdated(element);
    expect(bodyTop(element)).to.equal(empty);
  });

  it('bleeds media to the card edges', async () => {
    const element = await fixture<QdsCard>(html`
      <qds-card style="width: 300px">
        <div slot="media" style="height: 50px"></div>
        Body
      </qds-card>
    `);
    const media = element.querySelector('[slot="media"]') as HTMLElement;
    const card = base(element).getBoundingClientRect();
    const box = media.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(base(element)).borderInlineStartWidth);

    expect(box.left).to.be.closeTo(card.left + border, 0.5);
    expect(box.top).to.be.closeTo(card.top + border, 0.5);
    expect(box.width).to.be.closeTo(card.width - 2 * border, 0.5);
  });

  it('resets slotted heading margins so the card controls spacing', async () => {
    const element = await fixture<QdsCard>(html`
      <qds-card><h2 slot="header">Title</h2>Body</qds-card>
    `);

    expect(getComputedStyle(element.querySelector('h2')!).marginBlockStart).to.equal('0px');
  });

  it('applies the elevated shadow token only to the elevated variant', async () => {
    document.documentElement.style.setProperty(
      '--qds-component-card-elevated-box-shadow',
      'rgb(1, 2, 3) 0px 0px 0px 4px',
    );

    try {
      const outlined = await fixture<QdsCard>(html`<qds-card>Body</qds-card>`);
      const elevated = await fixture<QdsCard>(html`<qds-card variant="elevated">Body</qds-card>`);

      expect(getComputedStyle(base(outlined)).boxShadow).to.equal('none');
      expect(getComputedStyle(base(elevated)).boxShadow).to.equal(
        'rgb(1, 2, 3) 0px 0px 0px 4px',
      );
    } finally {
      document.documentElement.style.removeProperty('--qds-component-card-elevated-box-shadow');
    }
  });
});
