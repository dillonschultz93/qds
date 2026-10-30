import { expect, fixture, html, oneEvent, elementUpdated, nextFrame } from '@open-wc/testing';

import './qds-tabs.js';
import '../qds-tab/qds-tab.js';
import '../qds-tab-panel/qds-tab-panel.js';
import type { QdsTabs } from './qds-tabs.js';
import type { QdsTab } from '../qds-tab/qds-tab.js';
import type { QdsTabPanel } from '../qds-tab-panel/qds-tab-panel.js';

const account = () => html`
  <qds-tabs label="Account">
    <qds-tab slot="tab">Profile</qds-tab>
    <qds-tab slot="tab">Security</qds-tab>
    <qds-tab slot="tab">Billing</qds-tab>
    <qds-tab-panel>Profile settings</qds-tab-panel>
    <qds-tab-panel>Security settings</qds-tab-panel>
    <qds-tab-panel>Billing settings</qds-tab-panel>
  </qds-tabs>
`;

const tabsOf = (tabs: QdsTabs): QdsTab[] => [...tabs.querySelectorAll('qds-tab')];
const panelsOf = (tabs: QdsTabs): QdsTabPanel[] => [...tabs.querySelectorAll('qds-tab-panel')];
const shown = (tabs: QdsTabs): boolean[] =>
  panelsOf(tabs).map((panel) => getComputedStyle(panel).display !== 'none');

/** Wait for the initial selection, which is resolved after the first update. */
const settle = async (tabs: QdsTabs): Promise<void> => {
  await elementUpdated(tabs);
  await nextFrame();
};

/** Press a key on whatever has focus, as the keydown listener sees it. */
const press = (key: string): void => {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
};

describe('qds-tabs', () => {
  it('is accessible', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);
    await expect(tabs).to.be.accessible();
  });

  it('selects the first tab and shows only its panel', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);

    expect(tabs.selectedIndex).to.equal(0);
    expect(tabsOf(tabs).map((tab) => tab.selected)).to.deep.equal([true, false, false]);
    expect(shown(tabs)).to.deep.equal([true, false, false]);
  });

  it('links each tab and panel to each other by ID', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);

    tabsOf(tabs).forEach((tab, index) => {
      const panel = panelsOf(tabs)[index]!;
      expect(tab.getAttribute('aria-controls')).to.equal(panel.id);
      expect(panel.getAttribute('aria-labelledby')).to.equal(tab.id);
    });
  });

  it('keeps only the selected tab in the tab order', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);

    expect(tabsOf(tabs).map((tab) => tab.tabIndex)).to.deep.equal([0, -1, -1]);
  });

  it('starts on a tab marked selected in the markup', async () => {
    const tabs = await fixture<QdsTabs>(html`
      <qds-tabs label="Account">
        <qds-tab slot="tab">Profile</qds-tab>
        <qds-tab slot="tab" selected>Security</qds-tab>
        <qds-tab-panel>Profile settings</qds-tab-panel>
        <qds-tab-panel>Security settings</qds-tab-panel>
      </qds-tabs>
    `);
    await settle(tabs);

    expect(tabs.selectedIndex).to.equal(1);
    expect(shown(tabs)).to.deep.equal([false, true]);
  });

  it('selects on click and fires qds-change', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);

    const listener = oneEvent(tabs, 'qds-change');
    tabsOf(tabs)[2]!.click();
    const event = await listener;
    await settle(tabs);

    expect(event.detail).to.deep.equal({ index: 2 });
    expect(shown(tabs)).to.deep.equal([false, false, true]);
  });

  it('selects as arrow keys move, wrapping and skipping disabled tabs', async () => {
    const tabs = await fixture<QdsTabs>(html`
      <qds-tabs label="Account">
        <qds-tab slot="tab">Profile</qds-tab>
        <qds-tab slot="tab" disabled>Security</qds-tab>
        <qds-tab slot="tab">Billing</qds-tab>
        <qds-tab-panel>1</qds-tab-panel>
        <qds-tab-panel>2</qds-tab-panel>
        <qds-tab-panel>3</qds-tab-panel>
      </qds-tabs>
    `);
    await settle(tabs);
    const [profile, , billing] = tabsOf(tabs);

    profile!.focus();
    press('ArrowRight');
    await settle(tabs);
    expect(tabs.selectedIndex, 'skips the disabled tab').to.equal(2);
    expect(document.activeElement).to.equal(billing);

    press('ArrowRight');
    await settle(tabs);
    expect(tabs.selectedIndex, 'wraps').to.equal(0);

    press('End');
    await settle(tabs);
    expect(tabs.selectedIndex).to.equal(2);

    press('Home');
    await settle(tabs);
    expect(tabs.selectedIndex).to.equal(0);
  });

  it('reverses arrow keys under RTL', async () => {
    const tabs = await fixture<QdsTabs>(html`<div dir="rtl">${account()}</div>`).then(
      (div) => div.querySelector('qds-tabs') as QdsTabs,
    );
    await settle(tabs);

    tabsOf(tabs)[0]!.focus();
    press('ArrowLeft');
    await settle(tabs);

    expect(tabs.selectedIndex).to.equal(1);
  });

  it('leaves arrow keys with a modifier to the browser', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);
    tabsOf(tabs)[0]!.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      altKey: true,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    document.activeElement!.dispatchEvent(event);
    await settle(tabs);

    expect(tabs.selectedIndex).to.equal(0);
    expect(event.defaultPrevented).to.be.false;
  });

  it('ignores clicks on a disabled tab', async () => {
    const tabs = await fixture<QdsTabs>(html`
      <qds-tabs label="Account">
        <qds-tab slot="tab">Profile</qds-tab>
        <qds-tab slot="tab" disabled>Security</qds-tab>
        <qds-tab-panel>1</qds-tab-panel>
        <qds-tab-panel>2</qds-tab-panel>
      </qds-tabs>
    `);
    await settle(tabs);

    tabsOf(tabs)[1]!.click();
    await settle(tabs);

    expect(tabs.selectedIndex).to.equal(0);
  });

  it('assigns the tab slot to a tab that has none', async () => {
    const tabs = await fixture<QdsTabs>(html`
      <qds-tabs label="Account">
        <qds-tab>Profile</qds-tab>
        <qds-tab-panel>1</qds-tab-panel>
      </qds-tabs>
    `);
    await settle(tabs);

    expect(tabsOf(tabs)[0]!.slot).to.equal('tab');
  });

  it('resolves the selected underline color from the component token', async () => {
    const tabs = await fixture<QdsTabs>(account());
    await settle(tabs);
    // The color transitions, so a read straight after the change can land
    // mid-transition and return the old color. Switch the transition off.
    document.documentElement.style.setProperty('--qds-component-tabs-duration', '0s');
    document.documentElement.style.setProperty(
      '--qds-component-tabs-indicator-color-border-selected',
      'rgb(1, 2, 3)',
    );

    try {
      expect(getComputedStyle(tabsOf(tabs)[0]!).borderBlockEndColor).to.equal('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-tabs-indicator-color-border-selected',
      );
      document.documentElement.style.removeProperty('--qds-component-tabs-duration');
    }
  });
});
