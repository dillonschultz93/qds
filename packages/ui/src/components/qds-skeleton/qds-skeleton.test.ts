import { expect, fixture, html } from '@open-wc/testing';

import './qds-skeleton.js';
import type { QdsSkeleton } from './qds-skeleton.js';

const shapesOf = (element: QdsSkeleton): HTMLElement[] => [
  ...element.shadowRoot!.querySelectorAll<HTMLElement>('[part="shape"]'),
];

describe('qds-skeleton', () => {
  it('draws lines of text, the last one shorter, hidden from assistive technology', async () => {
    const element = await fixture<QdsSkeleton>(html`<qds-skeleton lines="3" style="width: 200px"></qds-skeleton>`);
    const shapes = shapesOf(element);

    expect(shapes).to.have.length(3);
    expect(shapes[0]!.getBoundingClientRect().width).to.equal(200);
    expect(shapes[2]!.getBoundingClientRect().width).to.equal(120);
    expect(element.shadowRoot!.querySelector('[part="base"]')!.getAttribute('aria-hidden')).to.equal('true');
    await expect(element).to.be.accessible();
  });

  it('draws one line of text by default, at full width', async () => {
    const element = await fixture<QdsSkeleton>(html`<qds-skeleton style="width: 200px"></qds-skeleton>`);
    const shapes = shapesOf(element);
    expect(shapes).to.have.length(1);
    expect(shapes[0]!.getBoundingClientRect().width).to.equal(200);
  });

  it('fills the size it is given as a rectangle or a circle, ignoring lines', async () => {
    const rect = await fixture<QdsSkeleton>(
      html`<qds-skeleton shape="rect" lines="4" style="width: 120px; height: 80px"></qds-skeleton>`,
    );
    expect(shapesOf(rect)).to.have.length(1);
    const box = shapesOf(rect)[0]!.getBoundingClientRect();
    expect([box.width, box.height]).to.deep.equal([120, 80]);

    const circle = await fixture<QdsSkeleton>(html`<qds-skeleton shape="circle"></qds-skeleton>`);
    const shape = shapesOf(circle)[0]!;
    expect(shape.getBoundingClientRect().width).to.equal(40);
    expect(getComputedStyle(shape).borderRadius).to.equal('50%');
  });

  it('pulses', async () => {
    const element = await fixture<QdsSkeleton>(html`<qds-skeleton></qds-skeleton>`);
    expect(getComputedStyle(shapesOf(element)[0]!).animationName).to.equal('pulse');
  });
});
