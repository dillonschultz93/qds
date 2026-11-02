import { expect, fixture, html, elementUpdated, aTimeout } from '@open-wc/testing';

import '../qds-button/qds-button.js';
import type { QdsButton } from '../qds-button/qds-button.js';
import './qds-tooltip.js';
import type { QdsTooltip } from './qds-tooltip.js';

const bubbleOf = (element: QdsTooltip): HTMLElement => element.shadowRoot!.querySelector('.tooltip')!;
const isOpen = (element: QdsTooltip): boolean => bubbleOf(element).matches(':popover-open');

describe('qds-tooltip', () => {
  it('names an icon-only qds-button through its label', async () => {
    const element = await fixture<QdsTooltip>(html`
      <qds-tooltip text="Delete"><qds-button variant="ghost"><span aria-hidden="true"></span></qds-button></qds-tooltip>
    `);
    const button = element.querySelector<QdsButton>('qds-button')!;
    await elementUpdated(button);

    expect(button.label).to.equal('Delete');
    expect(button.shadowRoot!.querySelector('button')!.getAttribute('aria-label')).to.equal('Delete');
    expect(bubbleOf(element).getAttribute('aria-hidden')).to.equal('true');
    await expect(element).to.be.accessible();
  });

  it('leaves a qds-button that already has a name alone', async () => {
    const element = await fixture<QdsTooltip>(html`
      <qds-tooltip text="Saves a draft"><qds-button>Save</qds-button></qds-tooltip>
    `);
    expect(element.querySelector<QdsButton>('qds-button')!.label).to.be.null;
  });

  it('names a native element with no text, and describes one with text', async () => {
    const named = await fixture<QdsTooltip>(html`<qds-tooltip text="Close"><button></button></qds-tooltip>`);
    expect(named.querySelector('button')!.getAttribute('aria-label')).to.equal('Close');

    const described = await fixture<QdsTooltip>(
      html`<qds-tooltip text="Opens in a new tab"><a href="#">Docs</a></qds-tooltip>`,
    );
    const link = described.querySelector('a')!;
    expect(link.hasAttribute('aria-label')).to.be.false;
    expect(link.getAttribute('aria-description')).to.equal('Opens in a new tab');
  });

  it('follows changes to its text, and takes it back when the trigger is removed', async () => {
    const element = await fixture<QdsTooltip>(html`<qds-tooltip text="Close"><button></button></qds-tooltip>`);
    const button = element.querySelector('button')!;

    element.text = 'Dismiss';
    await elementUpdated(element);
    expect(button.getAttribute('aria-label')).to.equal('Dismiss');

    button.remove();
    await aTimeout(0);
    expect(button.hasAttribute('aria-label')).to.be.false;
  });

  it('shows at once on focus, beside the trigger, and hides on blur', async () => {
    const element = await fixture<QdsTooltip>(html`
      <div style="padding: 4rem"><qds-tooltip text="Settings"><button>⚙</button></qds-tooltip></div>
    `).then((wrapper) => wrapper.querySelector<QdsTooltip>('qds-tooltip')!);
    const button = element.querySelector('button')!;

    button.focus();
    await elementUpdated(element);
    expect(isOpen(element)).to.be.true;

    const trigger = button.getBoundingClientRect();
    const bubble = bubbleOf(element).getBoundingClientRect();
    expect(bubble.bottom, 'above the trigger').to.be.at.most(trigger.top);
    expect(Math.abs(bubble.left + bubble.width / 2 - (trigger.left + trigger.width / 2))).to.be.below(1);

    button.blur();
    await elementUpdated(element);
    expect(isOpen(element)).to.be.false;
  });

  it('flips below the trigger when there is no room above', async () => {
    const element = await fixture<QdsTooltip>(html`
      <qds-tooltip text="Settings" style="position: fixed; top: 0; left: 50%"><button>⚙</button></qds-tooltip>
    `);
    element.show();
    await elementUpdated(element);

    expect(bubbleOf(element).dataset.side).to.equal('bottom');
    expect(bubbleOf(element).getBoundingClientRect().top).to.be.at.least(element.getBoundingClientRect().bottom);
    element.hide();
  });

  it('shows after a pause on hover, and stays while the pointer is on it', async () => {
    const element = await fixture<QdsTooltip>(html`<qds-tooltip text="Settings"><button>⚙</button></qds-tooltip>`);

    element.dispatchEvent(new PointerEvent('pointerenter'));
    await aTimeout(100);
    expect(isOpen(element), 'not yet').to.be.false;
    await aTimeout(400);
    expect(isOpen(element)).to.be.true;

    element.dispatchEvent(new PointerEvent('pointerleave'));
    bubbleOf(element).dispatchEvent(new PointerEvent('pointerenter'));
    await aTimeout(250);
    expect(isOpen(element), 'kept open while hovered').to.be.true;

    bubbleOf(element).dispatchEvent(new PointerEvent('pointerleave'));
    await aTimeout(250);
    expect(isOpen(element)).to.be.false;
  });

  it('closes on Escape, and never opens while disabled', async () => {
    const element = await fixture<QdsTooltip>(html`<qds-tooltip text="Settings"><button>⚙</button></qds-tooltip>`);
    element.show();
    await elementUpdated(element);
    expect(isOpen(element)).to.be.true;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await elementUpdated(element);
    expect(isOpen(element)).to.be.false;

    element.disabled = true;
    element.show();
    await elementUpdated(element);
    expect(isOpen(element)).to.be.false;
  });
});
