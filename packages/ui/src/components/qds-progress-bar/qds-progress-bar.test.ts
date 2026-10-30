import { expect, fixture, html, elementUpdated } from '@open-wc/testing';

import './qds-progress-bar.js';
import type { QdsProgressBar } from './qds-progress-bar.js';

const track = (element: QdsProgressBar): HTMLElement =>
  element.shadowRoot?.querySelector('[role="progressbar"]') as HTMLElement;

const indicatorShare = (element: QdsProgressBar): number => {
  const indicator = element.shadowRoot?.querySelector('.indicator') as HTMLElement;
  return indicator.getBoundingClientRect().width / track(element).getBoundingClientRect().width;
};

describe('qds-progress-bar', () => {
  it('reports a determinate value through ARIA', async () => {
    const element = await fixture<QdsProgressBar>(
      html`<qds-progress-bar label="Uploading" value="40"></qds-progress-bar>`,
    );

    expect(track(element).getAttribute('aria-label')).to.equal('Uploading');
    expect(track(element).getAttribute('aria-valuenow')).to.equal('40');
    expect(track(element).getAttribute('aria-valuemin')).to.equal('0');
    expect(track(element).getAttribute('aria-valuemax')).to.equal('100');
    expect(track(element).hasAttribute('aria-busy')).to.be.false;
  });

  it('is accessible determinate and indeterminate, in every variant', async () => {
    for (const variant of ['primary', 'success', 'warning', 'danger'] as const) {
      await expect(
        await fixture(
          html`<qds-progress-bar label="Saving" value="50" variant=${variant}></qds-progress-bar>`,
        ),
      ).to.be.accessible();
    }
    await expect(
      await fixture(html`<qds-progress-bar label="Saving"></qds-progress-bar>`),
    ).to.be.accessible();
  });

  it('fills in proportion to value over max', async () => {
    const element = await fixture<QdsProgressBar>(html`
      <qds-progress-bar
        label="Steps"
        value="3"
        max="4"
        style="--qds-component-progress-bar-duration: 0s"
      ></qds-progress-bar>
    `);

    expect(indicatorShare(element)).to.be.closeTo(0.75, 0.01);
  });

  it('clamps values outside the range', async () => {
    const element = await fixture<QdsProgressBar>(html`
      <qds-progress-bar
        label="Steps"
        value="150"
        style="--qds-component-progress-bar-duration: 0s"
      ></qds-progress-bar>
    `);
    expect(track(element).getAttribute('aria-valuenow')).to.equal('100');
    expect(indicatorShare(element)).to.be.closeTo(1, 0.01);

    element.value = -5;
    await elementUpdated(element);
    expect(track(element).getAttribute('aria-valuenow')).to.equal('0');
  });

  it('is indeterminate with no value: busy, and no aria-valuenow', async () => {
    const element = await fixture<QdsProgressBar>(
      html`<qds-progress-bar label="Loading"></qds-progress-bar>`,
    );

    expect(track(element).hasAttribute('aria-valuenow')).to.be.false;
    expect(track(element).getAttribute('aria-busy')).to.equal('true');
    expect(track(element).classList.contains('indeterminate')).to.be.true;
  });

  it('becomes determinate when a value arrives', async () => {
    const element = await fixture<QdsProgressBar>(
      html`<qds-progress-bar label="Loading"></qds-progress-bar>`,
    );

    element.value = 10;
    await elementUpdated(element);

    expect(track(element).getAttribute('aria-valuenow')).to.equal('10');
    expect(track(element).classList.contains('indeterminate')).to.be.false;
  });

  it('resolves the indicator color from the variant token', async () => {
    const element = await fixture<QdsProgressBar>(
      html`<qds-progress-bar label="Done" value="100" variant="success"></qds-progress-bar>`,
    );
    document.documentElement.style.setProperty(
      '--qds-component-progress-bar-success-color-background-rest',
      'rgb(1, 2, 3)',
    );

    try {
      const indicator = element.shadowRoot?.querySelector('.indicator') as HTMLElement;
      expect(getComputedStyle(indicator).backgroundColor).to.equal('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-progress-bar-success-color-background-rest',
      );
    }
  });
});
