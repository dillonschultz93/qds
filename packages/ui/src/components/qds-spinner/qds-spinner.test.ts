import { expect, fixture, html } from '@open-wc/testing';

import './qds-spinner.js';
import type { QdsSpinner } from './qds-spinner.js';

describe('qds-spinner', () => {
  it('is an indeterminate progress bar named by its label', async () => {
    const element = await fixture<QdsSpinner>(html`<qds-spinner label="Loading results"></qds-spinner>`);
    const base = element.shadowRoot!.querySelector('[part="base"]')!;

    expect(base.getAttribute('role')).to.equal('progressbar');
    expect(base.getAttribute('aria-label')).to.equal('Loading results');
    expect(base.hasAttribute('aria-valuenow')).to.be.false;
    await expect(element).to.be.accessible();
  });

  it('is named "Loading" by default', async () => {
    const element = await fixture<QdsSpinner>(html`<qds-spinner></qds-spinner>`);
    expect(element.shadowRoot!.querySelector('[part="base"]')!.getAttribute('aria-label')).to.equal('Loading');
  });

  it('takes its size from the size tokens, and spins', async () => {
    const widths: number[] = [];
    for (const size of ['sm', 'md', 'lg']) {
      const element = await fixture<QdsSpinner>(html`<qds-spinner size=${size}></qds-spinner>`);
      const base = element.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!;
      widths.push(base.getBoundingClientRect().width);
      expect(getComputedStyle(base).animationName).to.equal('spin');
    }
    expect(widths).to.deep.equal([16, 20, 24]);
  });
});
