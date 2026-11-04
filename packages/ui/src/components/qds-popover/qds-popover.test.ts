import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import '../qds-button/qds-button.js';
import type { QdsButton } from '../qds-button/qds-button.js';
import './qds-popover.js';
import type { QdsPopover } from './qds-popover.js';

const panelOf = (popover: QdsPopover): HTMLElement => popover.shadowRoot!.querySelector('.panel')!;
const isOpen = (popover: QdsPopover): boolean => panelOf(popover).matches(':popover-open');

const press = (target: Element, key: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
};

async function makePopover(): Promise<QdsPopover> {
  const wrapper = await fixture<HTMLDivElement>(html`
    <div>
      <qds-popover>
        <qds-button slot="trigger" variant="secondary">Filters</qds-button>
        <p>Show only:</p>
        <button id="first">Open issues</button>
      </qds-popover>
      <button id="elsewhere">Elsewhere</button>
    </div>
  `);
  const popover = wrapper.querySelector<QdsPopover>('qds-popover')!;
  await elementUpdated(popover);
  return popover;
}

describe('qds-popover', () => {
  it('is a dialog named by its trigger, which is marked as opening one', async () => {
    const popover = await makePopover();
    const trigger = popover.querySelector<QdsButton>('qds-button')!;
    await elementUpdated(trigger);
    const inner = trigger.shadowRoot!.querySelector('button')!;

    expect(panelOf(popover).getAttribute('role')).to.equal('dialog');
    expect(panelOf(popover).getAttribute('aria-label')).to.equal('Filters');
    expect(inner.getAttribute('aria-haspopup')).to.equal('dialog');
    expect(inner.getAttribute('aria-expanded')).to.equal('false');
  });

  it('opens on click with focus on the panel, and closes on Escape back to the trigger', async () => {
    const popover = await makePopover();
    const trigger = popover.querySelector<QdsButton>('qds-button')!;

    setTimeout(() => trigger.click());
    await oneEvent(popover, 'qds-open');
    expect(isOpen(popover)).to.be.true;
    expect(popover.shadowRoot!.activeElement).to.equal(panelOf(popover));
    await elementUpdated(trigger);
    expect(trigger.shadowRoot!.querySelector('button')!.getAttribute('aria-expanded')).to.equal('true');
    await expect(popover).to.be.accessible();

    setTimeout(() => press(panelOf(popover), 'Escape'));
    await oneEvent(popover, 'qds-close');
    expect(isOpen(popover)).to.be.false;
    expect(document.activeElement === trigger, 'focus is back on the trigger').to.be.true;
  });

  it('focuses the content marked autofocus', async () => {
    const popover = await fixture<QdsPopover>(html`
      <qds-popover label="Rename">
        <button slot="trigger">Rename</button>
        <div><input aria-label="Name" autofocus /></div>
      </qds-popover>
    `);
    popover.show();
    await elementUpdated(popover);
    expect(document.activeElement).to.equal(popover.querySelector('input'));
    expect(panelOf(popover).getAttribute('aria-label')).to.equal('Rename');
  });

  it('toggles from the trigger, and closes on a press outside without moving focus', async () => {
    const popover = await makePopover();
    const trigger = popover.querySelector<QdsButton>('qds-button')!;

    trigger.click();
    await elementUpdated(popover);
    trigger.click();
    await elementUpdated(popover);
    expect(popover.open).to.be.false;

    popover.show();
    await elementUpdated(popover);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await elementUpdated(popover);
    expect(popover.open).to.be.false;

    // A press inside keeps it open.
    popover.show();
    await elementUpdated(popover);
    popover.querySelector('#first')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await elementUpdated(popover);
    expect(popover.open).to.be.true;
  });

  it('closes when focus moves elsewhere on the page, but not within it', async () => {
    const popover = await makePopover();
    popover.show();
    await elementUpdated(popover);

    popover.querySelector<HTMLButtonElement>('#first')!.focus();
    await elementUpdated(popover);
    expect(popover.open).to.be.true;

    document.querySelector<HTMLButtonElement>('#elsewhere')!.focus();
    await elementUpdated(popover);
    expect(popover.open).to.be.false;
    expect(document.activeElement?.id).to.equal('elsewhere');
  });

  it('is placed below its trigger by default, and on the side asked for', async () => {
    const popover = await makePopover();
    const trigger = popover.querySelector<QdsButton>('qds-button')!;

    popover.show();
    await elementUpdated(popover);
    const below = panelOf(popover).getBoundingClientRect();
    expect(below.top).to.be.greaterThan(trigger.getBoundingClientRect().bottom);
    expect(panelOf(popover).dataset.side).to.equal('bottom');

    popover.hide();
    popover.placement = 'right-start';
    await elementUpdated(popover);
    popover.show();
    await elementUpdated(popover);
    expect(panelOf(popover).dataset.side).to.equal('right');
    expect(Math.round(panelOf(popover).getBoundingClientRect().top)).to.equal(
      Math.round(trigger.getBoundingClientRect().top),
    );
  });
});
