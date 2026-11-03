import { expect, fixture, html, oneEvent, elementUpdated, aTimeout } from '@open-wc/testing';

import { announce } from '../../internal/announcer.js';
import './qds-alert.js';
import type { QdsAlert } from './qds-alert.js';

const region = (politeness: 'polite' | 'assertive'): HTMLElement | null =>
  document.querySelector(`[data-qds-announcer="${politeness}"]`);

/** Long enough for the announcer's settle delay and the alert's frame. */
const settle = (): Promise<void> => aTimeout(200);

describe('qds-alert', () => {
  it('shows the variant icon, heading, and message', async () => {
    const element = await fixture<QdsAlert>(
      html`<qds-alert variant="success" heading="Saved">Your changes are live.</qds-alert>`,
    );
    const root = element.shadowRoot!;

    expect(root.querySelector('qds-icon')?.getAttribute('name')).to.equal('circle-check');
    expect(root.querySelector('.heading')?.hidden).to.be.false;
    expect(root.querySelector('.heading')?.textContent?.trim()).to.equal('Saved');
    expect(root.querySelector('.dismiss')).to.be.null;
  });

  it('hides the heading and actions rows when they are not used', async () => {
    const element = await fixture<QdsAlert>(html`<qds-alert>Just a message.</qds-alert>`);
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector<HTMLElement>('.heading')!.hidden).to.be.true;
    expect(element.shadowRoot!.querySelector<HTMLElement>('.actions')!.hidden).to.be.true;
  });

  it('shows a slotted heading and actions', async () => {
    const element = await fixture<QdsAlert>(html`
      <qds-alert>
        <span slot="heading">Update ready</span>
        Restart to finish.
        <button slot="actions">Restart</button>
      </qds-alert>
    `);
    await element.updateComplete;
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector<HTMLElement>('.heading')!.hidden).to.be.false;
    expect(element.shadowRoot!.querySelector<HTMLElement>('.actions')!.hidden).to.be.false;
  });

  it('is accessible in every variant, dismissible or not', async () => {
    for (const variant of ['info', 'success', 'warning', 'error'] as const) {
      await expect(
        await fixture(html`<qds-alert variant=${variant} heading="Heading" dismissible>Message</qds-alert>`),
      ).to.be.accessible();
    }
  });

  it('hides itself when dismissed, unless the event is cancelled', async () => {
    const element = await fixture<QdsAlert>(html`<qds-alert dismissible>Message</qds-alert>`);
    const button = element.shadowRoot!.querySelector<HTMLButtonElement>('.dismiss')!;
    expect(button.getAttribute('aria-label')).to.equal('Dismiss');

    element.addEventListener('qds-dismiss', (event) => event.preventDefault(), { once: true });
    button.click();
    await elementUpdated(element);
    expect(element.hidden).to.be.false;

    setTimeout(() => button.click());
    await oneEvent(element, 'qds-dismiss');
    await elementUpdated(element);
    expect(element.hidden).to.be.true;
    expect(getComputedStyle(element).display).to.equal('none');
  });

  it('announces an error assertively when inserted after the page has loaded', async () => {
    await fixture(html`<qds-alert variant="error" heading="Could not save">Check your connection.</qds-alert>`);
    await settle();

    expect(region('assertive')?.textContent).to.equal('Could not save Check your connection.');
    expect(region('assertive')?.getAttribute('aria-live')).to.equal('assertive');
  });

  it('announces politely when shown again by removing hidden', async () => {
    const element = await fixture<QdsAlert>(html`<qds-alert hidden>Draft saved at 10:42.</qds-alert>`);
    await settle();
    expect(region('polite')?.textContent ?? '').not.to.include('Draft saved at 10:42.');

    element.hidden = false;
    await elementUpdated(element);
    await settle();
    expect(region('polite')?.textContent).to.equal('Draft saved at 10:42.');
  });
});

describe('announce', () => {
  it('announces a repeated message only once', async () => {
    announce('Copied to the clipboard.');
    await settle();
    expect(region('polite')?.textContent).to.equal('Copied to the clipboard.');

    region('polite')!.textContent = '';
    announce('Copied to the clipboard.');
    await settle();
    expect(region('polite')?.textContent, 'a repeat within a moment is the same event').to.equal('');
  });

  it('ignores an empty message', async () => {
    announce('   ');
    await settle();
    expect(region('polite')?.textContent ?? '').not.to.equal('   ');
  });
});
