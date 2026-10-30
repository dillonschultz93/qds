import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-chip.js';
import type { QdsChip } from './qds-chip.js';

const removeButton = (element: QdsChip): HTMLButtonElement | null =>
  element.shadowRoot?.querySelector('button') ?? null;

describe('qds-chip', () => {
  it('renders its text as a neutral chip with nothing focusable', async () => {
    const element = await fixture<QdsChip>(html`<qds-chip>Draft</qds-chip>`);

    expect(element.variant).to.equal('neutral');
    expect(element.textContent?.trim()).to.equal('Draft');
    expect(removeButton(element)).to.be.null;
  });

  it('is accessible in every variant, with and without a remove button', async () => {
    for (const variant of ['neutral', 'info', 'success', 'warning', 'danger'] as const) {
      await expect(
        await fixture(html`<qds-chip variant=${variant}>Status</qds-chip>`),
      ).to.be.accessible();
      await expect(
        await fixture(html`<qds-chip variant=${variant} removable>Status</qds-chip>`),
      ).to.be.accessible();
    }
  });

  it('names the remove button after the chip text by default', async () => {
    const element = await fixture<QdsChip>(html`<qds-chip removable>Design</qds-chip>`);
    const button = removeButton(element)!;

    const ids = button.getAttribute('aria-labelledby')?.split(' ') ?? [];
    const parts = ids.map((id) => element.shadowRoot?.getElementById(id));
    expect(parts.every(Boolean), 'every labelledby id resolves in the shadow root').to.be.true;
    expect(parts[0]?.textContent).to.equal('Remove');
    expect(
      (parts[1]?.querySelector('slot') as HTMLSlotElement).assignedNodes()[0]?.textContent,
    ).to.equal('Design');
  });

  it('uses remove-label in place of the default name', async () => {
    const element = await fixture<QdsChip>(
      html`<qds-chip removable remove-label="Clear the Design filter">Design</qds-chip>`,
    );
    const button = removeButton(element)!;

    expect(button.getAttribute('aria-label')).to.equal('Clear the Design filter');
    expect(button.hasAttribute('aria-labelledby')).to.be.false;
  });

  it('fires qds-remove and stays in the DOM', async () => {
    const element = await fixture<QdsChip>(html`<qds-chip removable>Design</qds-chip>`);

    const listener = oneEvent(element, 'qds-remove');
    removeButton(element)!.click();
    const event = await listener;

    expect(event.bubbles).to.be.true;
    expect(event.composed).to.be.true;
    expect(element.isConnected).to.be.true;
  });

  it('resolves variant colors from the component tokens', async () => {
    const element = await fixture<QdsChip>(html`<qds-chip variant="success">Paid</qds-chip>`);
    document.documentElement.style.setProperty(
      '--qds-component-chip-success-color-background-rest',
      'rgb(1, 2, 3)',
    );

    try {
      await elementUpdated(element);
      const base = element.shadowRoot?.querySelector('.base') as HTMLElement;
      expect(getComputedStyle(base).backgroundColor).to.equal('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-chip-success-color-background-rest',
      );
    }
  });
});
