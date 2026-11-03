import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import '../qds-button/qds-button.js';
import '../qds-tooltip/qds-tooltip.js';
import type { QdsButton } from '../qds-button/qds-button.js';
import type { QdsMenuItem } from '../qds-menu-item/qds-menu-item.js';
import './qds-menu.js';
import type { QdsMenu } from './qds-menu.js';

const panelOf = (menu: QdsMenu): HTMLElement => menu.shadowRoot!.querySelector('.menu')!;
const isOpen = (menu: QdsMenu): boolean => panelOf(menu).matches(':popover-open');

/** The focused item's index, compared as a number: a failed element comparison is slow to report. */
const focused = (menu: QdsMenu): number => menu.items.indexOf(document.activeElement as QdsMenuItem);

const press = (target: Element, key: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
};

async function makeMenu(): Promise<QdsMenu> {
  return fixture<QdsMenu>(html`
    <qds-menu>
      <qds-button slot="trigger" variant="secondary">Actions</qds-button>
      <qds-menu-item value="rename">Rename</qds-menu-item>
      <qds-menu-item value="duplicate">Duplicate</qds-menu-item>
      <qds-menu-item disabled>Archive</qds-menu-item>
      <qds-menu-item variant="danger" value="delete">Delete</qds-menu-item>
    </qds-menu>
  `);
}

describe('qds-menu', () => {
  it('marks its trigger as opening a menu, and gives the inner button the state', async () => {
    const menu = await makeMenu();
    const trigger = menu.querySelector<QdsButton>('qds-button')!;
    await elementUpdated(trigger);
    const inner = trigger.shadowRoot!.querySelector('button')!;

    expect(inner.getAttribute('aria-haspopup')).to.equal('menu');
    expect(inner.getAttribute('aria-expanded')).to.equal('false');
    expect(panelOf(menu).getAttribute('role')).to.equal('menu');
    expect(panelOf(menu).getAttribute('aria-label')).to.equal('Actions');
  });

  it('gives each item the menuitem role, out of the tab order', async () => {
    const menu = await makeMenu();
    const [first, , archive] = menu.items;

    expect(first!.tabIndex).to.equal(-1);
    expect(archive!.matches('[disabled]')).to.be.true;
    menu.show();
    await elementUpdated(menu);
    await expect(menu).to.be.accessible();
  });

  it('opens on click with the first item focused, and closes on Escape back to the trigger', async () => {
    const menu = await makeMenu();
    const trigger = menu.querySelector<QdsButton>('qds-button')!;

    trigger.click();
    await elementUpdated(menu);
    expect(isOpen(menu)).to.be.true;
    expect(focused(menu)).to.equal(0);
    await elementUpdated(trigger);
    expect(trigger.shadowRoot!.querySelector('button')!.getAttribute('aria-expanded')).to.equal('true');

    press(menu.items[0]!, 'Escape');
    await elementUpdated(menu);
    expect(isOpen(menu)).to.be.false;
    expect(document.activeElement === trigger, 'focus is back on the trigger').to.be.true;
  });

  it('opens at the last item with Up Arrow, and moves with the arrows, Home, End, and letters', async () => {
    const menu = await makeMenu();
    const trigger = menu.querySelector<QdsButton>('qds-button')!;
    const items = menu.items;

    press(trigger, 'ArrowUp');
    await elementUpdated(menu);
    expect(focused(menu)).to.equal(3);

    press(items[3]!, 'ArrowDown');
    expect(focused(menu), 'wraps to the first').to.equal(0);
    press(items[0]!, 'ArrowUp');
    expect(focused(menu), 'wraps to the last').to.equal(3);
    press(items[3]!, 'Home');
    expect(focused(menu)).to.equal(0);
    press(items[0]!, 'End');
    expect(focused(menu)).to.equal(3);
    press(items[3]!, 'a');
    expect(focused(menu), 'type-ahead finds Archive, disabled or not').to.equal(2);
    press(items[2]!, 'd');
    expect(focused(menu), 'the next item starting with d, after the focused one').to.equal(3);
    press(items[3]!, 'd');
    expect(focused(menu), 'and round again to the first').to.equal(1);
  });

  it('fires qds-select with the value when an item is chosen, then closes', async () => {
    const menu = await makeMenu();
    menu.show();
    await elementUpdated(menu);

    setTimeout(() => menu.items[3]!.click());
    const { detail } = await oneEvent(menu, 'qds-select');
    expect(detail.value).to.equal('delete');
    expect(detail.item === menu.items[3]).to.be.true;
    await elementUpdated(menu);
    expect(isOpen(menu)).to.be.false;
  });

  it('chooses with Enter, uses the text when there is no value, and ignores disabled items', async () => {
    const menu = await fixture<QdsMenu>(html`
      <qds-menu>
        <button slot="trigger">More</button>
        <qds-menu-item>Copy link</qds-menu-item>
        <qds-menu-item disabled>Move</qds-menu-item>
      </qds-menu>
    `);
    let chosen = '';
    menu.addEventListener('qds-select', (event) => (chosen = (event as CustomEvent).detail.value));

    menu.show();
    await elementUpdated(menu);
    press(menu.items[1]!, 'Enter');
    await elementUpdated(menu);
    expect(chosen).to.equal('');
    expect(isOpen(menu), 'a disabled item keeps the menu open').to.be.true;

    press(menu.items[0]!, 'Enter');
    await elementUpdated(menu);
    expect(chosen).to.equal('Copy link');
    expect(menu.querySelector('button')!.getAttribute('aria-expanded')).to.equal('false');
  });

  it('stays open when qds-select is canceled', async () => {
    const menu = await makeMenu();
    menu.addEventListener('qds-select', (event) => event.preventDefault());
    menu.show();
    await elementUpdated(menu);

    (menu.items[0] as QdsMenuItem).click();
    await elementUpdated(menu);
    expect(isOpen(menu)).to.be.true;
  });

  it('closes on a press outside, and on Tab', async () => {
    const menu = await makeMenu();
    menu.show();
    await elementUpdated(menu);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await elementUpdated(menu);
    expect(isOpen(menu)).to.be.false;

    menu.show();
    await elementUpdated(menu);
    press(menu.items[0]!, 'Tab');
    await elementUpdated(menu);
    expect(isOpen(menu)).to.be.false;
  });

  it('opens below the trigger, aligned to its start edge', async () => {
    const menu = await makeMenu();
    menu.show();
    await elementUpdated(menu);

    const trigger = menu.querySelector('qds-button')!.getBoundingClientRect();
    const panel = panelOf(menu).getBoundingClientRect();
    expect(panel.top).to.be.at.least(trigger.bottom);
    expect(Math.round(panel.left)).to.equal(Math.round(trigger.left));
    menu.hide();
  });

  it('finds the button inside a wrapped trigger, such as a tooltip', async () => {
    const menu = await fixture<QdsMenu>(html`
      <qds-menu label="More actions">
        <qds-tooltip slot="trigger" text="More actions"><qds-button variant="ghost"></qds-button></qds-tooltip>
        <qds-menu-item>Rename</qds-menu-item>
      </qds-menu>
    `);
    const button = menu.querySelector<QdsButton>('qds-button')!;
    await elementUpdated(button);
    expect(button.shadowRoot!.querySelector('button')!.getAttribute('aria-haspopup')).to.equal('menu');

    button.click();
    await elementUpdated(menu);
    press(menu.items[0]!, 'Escape');
    await elementUpdated(menu);
    expect(document.activeElement === button, 'focus returns to the button').to.be.true;
  });
});
