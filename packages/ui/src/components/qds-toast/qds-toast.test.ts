import { expect, fixture, html, elementUpdated, oneEvent, aTimeout } from '@open-wc/testing';

import { toast } from './qds-toast.js';
import type { QdsToast } from './qds-toast.js';

const stack = (): HTMLElement | null => document.querySelector('[data-qds-toast-stack]');
const region = (politeness: 'polite' | 'assertive'): HTMLElement | null =>
  document.querySelector(`[data-qds-announcer="${politeness}"]`);

afterEach(() => {
  for (const element of document.querySelectorAll('qds-toast')) element.remove();
});

describe('qds-toast', () => {
  it('shows in the stack, on top, announced politely', async () => {
    const element = toast('Link copied.', { duration: 0 });
    await elementUpdated(element);
    await aTimeout(200);

    expect(element.open).to.be.true;
    expect(element.parentElement === stack(), 'in the stack').to.be.true;
    expect(stack()!.matches(':popover-open')).to.be.true;
    expect(region('polite')?.textContent).to.equal('Link copied.');
    await expect(element).to.be.accessible();
  });

  it('announces errors assertively', async () => {
    const element = toast('Could not save.', { variant: 'error', heading: 'Offline', duration: 0 });
    await elementUpdated(element);
    await aTimeout(200);
    expect(region('assertive')?.textContent).to.equal('Offline Could not save.');
  });

  it('hides itself after its duration, then removes itself', async () => {
    const element = toast('Saved.', { duration: 100 });
    await elementUpdated(element);

    await oneEvent(element, 'qds-hide');
    await elementUpdated(element);
    expect(element.isConnected).to.be.false;
  });

  it('pauses its timer while hovered, and resumes it after', async () => {
    const element = toast('Saved.', { duration: 300 });
    await elementUpdated(element);

    element.dispatchEvent(new PointerEvent('pointerenter'));
    await aTimeout(450);
    expect(element.open, 'still open while hovered').to.be.true;

    element.dispatchEvent(new PointerEvent('pointerleave'));
    await aTimeout(1200);
    expect(element.open).to.be.false;
  });

  it('is dismissed by its button', async () => {
    const element = toast('Saved.', { duration: 0 });
    await elementUpdated(element);

    const button = element.shadowRoot!.querySelector<HTMLButtonElement>('.dismiss')!;
    expect(button.getAttribute('aria-label')).to.equal('Dismiss');
    setTimeout(() => button.click());
    await oneEvent(element, 'qds-hide');
  });

  it('shows a declarative toast with actions, and keeps it for reuse', async () => {
    const element = await fixture<QdsToast>(html`
      <qds-toast heading="Message archived" duration="0">
        One conversation moved to the archive.
        <button slot="actions">Undo</button>
      </qds-toast>
    `);
    await element.updateComplete;
    expect(getComputedStyle(element).display, 'hidden until shown').to.equal('none');

    setTimeout(() => element.show());
    await oneEvent(element, 'qds-show');
    await element.updateComplete;
    expect(element.parentElement === stack(), 'in the stack').to.be.true;
    expect(element.shadowRoot!.querySelector<HTMLElement>('.actions')!.hidden).to.be.false;
    expect(element.shadowRoot!.querySelector<HTMLElement>('.heading')!.hidden).to.be.false;

    element.hide();
    await elementUpdated(element);
    expect(element.isConnected, 'a declarative toast stays, to be shown again').to.be.true;
    expect(getComputedStyle(element).display).to.equal('none');
  });

  it('stacks several toasts, newest last', async () => {
    const first = toast('One', { duration: 0 });
    const second = toast('Two', { duration: 0 });
    await elementUpdated(second);

    const toasts = [...stack()!.querySelectorAll('qds-toast')];
    expect(toasts.indexOf(first)).to.be.below(toasts.indexOf(second));
    expect(second.getBoundingClientRect().top).to.be.above(first.getBoundingClientRect().top);
  });
});
