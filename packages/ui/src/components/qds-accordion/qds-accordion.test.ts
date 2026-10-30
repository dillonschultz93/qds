import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-accordion.js';
import '../qds-accordion-item/qds-accordion-item.js';
import type { QdsAccordion } from './qds-accordion.js';
import type { QdsAccordionItem } from '../qds-accordion-item/qds-accordion-item.js';

const faq = (exclusive = false) => html`
  <qds-accordion ?exclusive=${exclusive}>
    <qds-accordion-item heading="Shipping">Ships in 3 to 5 days.</qds-accordion-item>
    <qds-accordion-item heading="Returns">Free returns for 30 days.</qds-accordion-item>
    <qds-accordion-item heading="Warranty">Two years, parts and labour.</qds-accordion-item>
  </qds-accordion>
`;

const itemsOf = (accordion: QdsAccordion): QdsAccordionItem[] => [
  ...accordion.querySelectorAll('qds-accordion-item'),
];

const trigger = (item: QdsAccordionItem): HTMLButtonElement =>
  item.shadowRoot?.querySelector('button') as HTMLButtonElement;

const panel = (item: QdsAccordionItem): HTMLElement =>
  item.shadowRoot?.querySelector('[role="region"]') as HTMLElement;

/** Press a key on whatever has focus, as the accordion's keydown listener sees it. */
const press = (key: string): void => {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
};

describe('qds-accordion-item', () => {
  it('is a heading wrapping a button that controls a labelled region', async () => {
    const item = await fixture<QdsAccordionItem>(
      html`<qds-accordion-item heading="Shipping" heading-level="2">Details</qds-accordion-item>`,
    );

    const heading = item.shadowRoot?.querySelector('[role="heading"]');
    expect(heading?.getAttribute('aria-level')).to.equal('2');
    expect(heading?.contains(trigger(item))).to.be.true;
    expect(trigger(item).getAttribute('aria-controls')).to.equal(panel(item).id);
    expect(panel(item).getAttribute('aria-labelledby')).to.equal(trigger(item).id);
  });

  it('is accessible open, closed, and disabled', async () => {
    await expect(
      await fixture(html`<qds-accordion-item heading="Shipping">Details</qds-accordion-item>`),
    ).to.be.accessible();
    await expect(
      await fixture(html`<qds-accordion-item heading="Shipping" open>Details</qds-accordion-item>`),
    ).to.be.accessible();
    await expect(
      await fixture(
        html`<qds-accordion-item heading="Shipping" disabled>Details</qds-accordion-item>`,
      ),
    ).to.be.accessible();
  });

  it('hides a closed panel until found, and shows an open one', async () => {
    const item = await fixture<QdsAccordionItem>(
      html`<qds-accordion-item heading="Shipping">Details</qds-accordion-item>`,
    );
    expect(panel(item).getAttribute('hidden')).to.equal('until-found');
    expect(trigger(item).getAttribute('aria-expanded')).to.equal('false');

    item.open = true;
    await elementUpdated(item);
    expect(panel(item).hasAttribute('hidden')).to.be.false;
    expect(trigger(item).getAttribute('aria-expanded')).to.equal('true');
  });

  it('toggles on click and fires qds-open then qds-close', async () => {
    const item = await fixture<QdsAccordionItem>(
      html`<qds-accordion-item heading="Shipping">Details</qds-accordion-item>`,
    );

    const opened = oneEvent(item, 'qds-open');
    trigger(item).click();
    await opened;
    expect(item.open).to.be.true;

    const closed = oneEvent(item, 'qds-close');
    trigger(item).click();
    await closed;
    expect(item.open).to.be.false;
  });

  it('opens when find-in-page reveals its content', async () => {
    const item = await fixture<QdsAccordionItem>(
      html`<qds-accordion-item heading="Shipping">Details</qds-accordion-item>`,
    );

    const opened = oneEvent(item, 'qds-open');
    // As the browser fires it: at the panel, bubbling but NOT composed, so it
    // never leaves the shadow root.
    panel(item).dispatchEvent(new Event('beforematch', { bubbles: true }));
    await opened;
    await elementUpdated(item);

    expect(item.open).to.be.true;
    expect(trigger(item).getAttribute('aria-expanded')).to.equal('true');
  });

  it('does not toggle when disabled', async () => {
    const item = await fixture<QdsAccordionItem>(
      html`<qds-accordion-item heading="Shipping" disabled>Details</qds-accordion-item>`,
    );

    trigger(item).click();
    expect(item.open).to.be.false;
  });

  it('resolves trigger padding from the component token', async () => {
    const item = await fixture<QdsAccordionItem>(
      html`<qds-accordion-item heading="Shipping">Details</qds-accordion-item>`,
    );
    document.documentElement.style.setProperty(
      '--qds-component-accordion-trigger-padding-block',
      '21px',
    );

    try {
      expect(getComputedStyle(trigger(item)).paddingBlockStart).to.equal('21px');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-accordion-trigger-padding-block',
      );
    }
  });
});

describe('qds-accordion', () => {
  it('is accessible', async () => {
    const accordion = await fixture<QdsAccordion>(faq());
    await expect(accordion).to.be.accessible();
  });

  it('lets several items be open by default', async () => {
    const accordion = await fixture<QdsAccordion>(faq());
    const [first, second] = itemsOf(accordion);

    trigger(first!).click();
    trigger(second!).click();
    await elementUpdated(accordion);

    expect(itemsOf(accordion).map((item) => item.open)).to.deep.equal([true, true, false]);
  });

  it('closes the others when exclusive, without firing qds-close for them', async () => {
    const accordion = await fixture<QdsAccordion>(faq(true));
    const [first, second] = itemsOf(accordion);

    trigger(first!).click();
    let closes = 0;
    accordion.addEventListener('qds-close', () => closes++);
    trigger(second!).click();

    expect(itemsOf(accordion).map((item) => item.open)).to.deep.equal([false, true, false]);
    expect(closes).to.equal(0);
  });

  it('ignores open events from a nested accordion', async () => {
    const accordion = await fixture<QdsAccordion>(html`
      <qds-accordion exclusive>
        <qds-accordion-item heading="Outer" open>
          <qds-accordion>
            <qds-accordion-item heading="Inner">Nested</qds-accordion-item>
          </qds-accordion>
        </qds-accordion-item>
      </qds-accordion>
    `);
    const [outer, inner] = [...accordion.querySelectorAll('qds-accordion-item')];

    trigger(inner!).click();

    expect(outer!.open, 'the outer item stays open').to.be.true;
  });

  it('moves between headings with arrow keys, Home, and End, skipping disabled items', async () => {
    const accordion = await fixture<QdsAccordion>(html`
      <qds-accordion>
        <qds-accordion-item heading="One">1</qds-accordion-item>
        <qds-accordion-item heading="Two" disabled>2</qds-accordion-item>
        <qds-accordion-item heading="Three">3</qds-accordion-item>
      </qds-accordion>
    `);
    const [one, , three] = itemsOf(accordion);

    one!.focus();
    press('ArrowDown');
    expect(document.activeElement).to.equal(three);

    press('ArrowDown');
    expect(document.activeElement, 'wraps to the start').to.equal(one);

    press('End');
    expect(document.activeElement).to.equal(three);

    press('Home');
    expect(document.activeElement).to.equal(one);
  });

  it('leaves arrow keys alone inside an open panel', async () => {
    const accordion = await fixture<QdsAccordion>(html`
      <qds-accordion>
        <qds-accordion-item heading="One" open><input aria-label="Inside" /></qds-accordion-item>
        <qds-accordion-item heading="Two">2</qds-accordion-item>
      </qds-accordion>
    `);
    const input = accordion.querySelector('input') as HTMLInputElement;

    input.focus();
    press('ArrowDown');

    expect(document.activeElement).to.equal(input);
  });
});
