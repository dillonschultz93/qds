import { expect, fixture, html, oneEvent, elementUpdated, nextFrame } from '@open-wc/testing';

import './qds-radio-group.js';
import '../qds-radio/qds-radio.js';
import type { QdsRadioGroup } from './qds-radio-group.js';
import type { QdsRadio } from '../qds-radio/qds-radio.js';

const sizes = () => html`
  <qds-radio-group label="Size" name="size">
    <qds-radio value="s">Small</qds-radio>
    <qds-radio value="m">Medium</qds-radio>
    <qds-radio value="l">Large</qds-radio>
  </qds-radio-group>
`;

const radiosOf = (group: QdsRadioGroup): QdsRadio[] => [...group.querySelectorAll('qds-radio')];

/** Press a key on whatever has focus, as the group's keydown listener sees it. */
const press = (key: string): void => {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
};

/** Wait for the group's slotchange-driven sync to settle. */
const settle = async (group: QdsRadioGroup): Promise<void> => {
  await elementUpdated(group);
  await nextFrame();
};

describe('qds-radio-group', () => {
  it('is accessible, with nothing chosen and with a choice', async () => {
    const group = await fixture<QdsRadioGroup>(sizes());
    await settle(group);
    await expect(group).to.be.accessible();

    group.value = 'm';
    await settle(group);
    await expect(group).to.be.accessible();
  });

  it('checks exactly the option matching its value, and reports it through ARIA', async () => {
    const group = await fixture<QdsRadioGroup>(sizes());
    group.value = 'l';
    await settle(group);

    expect(radiosOf(group).map((radio) => radio.checked)).to.deep.equal([false, false, true]);
    expect(radiosOf(group).map((radio) => radio.getAttribute('role'))).to.deep.equal([
      'radio',
      'radio',
      'radio',
    ]);
    expect(radiosOf(group).map((radio) => radio.getAttribute('aria-checked'))).to.deep.equal([
      'false',
      'false',
      'true',
    ]);
  });

  it('chooses an option on click, unchecking the others, and fires qds-change', async () => {
    const group = await fixture<QdsRadioGroup>(sizes());
    await settle(group);
    const [small, medium] = radiosOf(group);

    small!.click();
    await settle(group);
    const listener = oneEvent(group, 'qds-change');
    medium!.click();
    const event = await listener;
    await settle(group);

    expect(group.value).to.equal('m');
    expect(event.detail).to.deep.equal({ value: 'm' });
    expect(small!.checked).to.be.false;
    expect(medium!.checked).to.be.true;
  });

  it('adopts a radio’s checked attribute as the initial value', async () => {
    const group = await fixture<QdsRadioGroup>(html`
      <qds-radio-group label="Size">
        <qds-radio value="s">Small</qds-radio>
        <qds-radio value="m" checked>Medium</qds-radio>
      </qds-radio-group>
    `);
    await settle(group);

    expect(group.value).to.equal('m');
  });

  it('keeps exactly one option in the tab order', async () => {
    const group = await fixture<QdsRadioGroup>(sizes());
    await settle(group);
    expect(radiosOf(group).map((radio) => radio.tabIndex)).to.deep.equal([0, -1, -1]);

    group.value = 'l';
    await settle(group);
    expect(radiosOf(group).map((radio) => radio.tabIndex)).to.deep.equal([-1, -1, 0]);
  });

  it('moves and chooses with arrow keys, wrapping and skipping disabled options', async () => {
    const group = await fixture<QdsRadioGroup>(html`
      <qds-radio-group label="Size">
        <qds-radio value="s">Small</qds-radio>
        <qds-radio value="m" disabled>Medium</qds-radio>
        <qds-radio value="l">Large</qds-radio>
      </qds-radio-group>
    `);
    await settle(group);
    const [small, , large] = radiosOf(group);

    small!.focus();
    press('ArrowDown');
    await settle(group);
    expect(group.value, 'skips the disabled option').to.equal('l');
    expect(document.activeElement).to.equal(large);

    press('ArrowDown');
    await settle(group);
    expect(group.value, 'wraps to the start').to.equal('s');

    press('ArrowUp');
    await settle(group);
    expect(group.value, 'wraps to the end').to.equal('l');
  });

  it('treats radios wrapped in other elements as its own, but not a nested group’s', async () => {
    const group = await fixture<QdsRadioGroup>(html`
      <qds-radio-group label="Plan">
        <div><qds-radio value="free">Free</qds-radio></div>
        <div><qds-radio value="pro">Pro</qds-radio></div>
        <qds-radio-group label="Add-ons">
          <qds-radio value="support">Support</qds-radio>
        </qds-radio-group>
      </qds-radio-group>
    `);
    await settle(group);
    const [free, pro, support] = [...group.querySelectorAll('qds-radio')];

    pro!.click();
    await settle(group);
    expect(group.value).to.equal('pro');
    expect(pro!.checked).to.be.true;
    expect(pro!.tabIndex).to.equal(0);

    pro!.focus();
    press('ArrowDown');
    await settle(group);
    expect(group.value, 'wraps to the first wrapped radio').to.equal('free');
    expect(free!.checked).to.be.true;

    support!.click();
    await settle(group);
    expect(group.value, 'a nested group’s radio is not ours').to.equal('free');
  });

  it('follows the visual direction for Left and Right under RTL', async () => {
    const container = await fixture<HTMLDivElement>(html`<div dir="rtl">${sizes()}</div>`);
    const group = container.querySelector('qds-radio-group') as QdsRadioGroup;
    await settle(group);

    radiosOf(group)[0]!.focus();
    press('ArrowLeft');
    await settle(group);

    expect(group.value, 'Left moves forward in RTL').to.equal('m');
  });

  it('leaves arrow keys with a modifier to the browser', async () => {
    const group = await fixture<QdsRadioGroup>(sizes());
    await settle(group);
    radiosOf(group)[0]!.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      altKey: true,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    document.activeElement!.dispatchEvent(event);
    await settle(group);

    expect(group.value).to.equal('');
    expect(event.defaultPrevented).to.be.false;
  });

  it('ignores clicks and keys while disabled', async () => {
    const group = await fixture<QdsRadioGroup>(html`
      <qds-radio-group label="Size" disabled>
        <qds-radio value="s">Small</qds-radio>
        <qds-radio value="m">Medium</qds-radio>
      </qds-radio-group>
    `);
    await settle(group);
    const [small] = radiosOf(group);

    small!.click();
    await settle(group);

    expect(group.value).to.equal('');
    expect(small!.groupDisabled).to.be.true;
    expect(radiosOf(group).every((radio) => radio.tabIndex === -1)).to.be.true;
  });

  it('resolves the checked fill from the component token', async () => {
    const group = await fixture<QdsRadioGroup>(sizes());
    group.value = 's';
    await settle(group);
    document.documentElement.style.setProperty(
      '--qds-component-radio-control-color-background-checked',
      'rgb(1, 2, 3)',
    );

    try {
      const control = radiosOf(group)[0]!.shadowRoot?.querySelector('.control') as HTMLElement;
      expect(getComputedStyle(control).backgroundColor).to.equal('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-radio-control-color-background-checked',
      );
    }
  });

  describe('form association', () => {
    it('submits the chosen value under the group name', async () => {
      const form = await fixture<HTMLFormElement>(html`<form>${sizes()}</form>`);
      const group = form.querySelector('qds-radio-group') as QdsRadioGroup;
      await settle(group);

      expect(new FormData(form).get('size')).to.be.null;

      radiosOf(group)[1]!.click();
      await settle(group);
      expect(new FormData(form).get('size')).to.equal('m');
    });

    it('has the new form value and validity by the time qds-change fires', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <qds-radio-group label="Size" name="size" required>
            <qds-radio value="s">Small</qds-radio>
          </qds-radio-group>
        </form>
      `);
      const group = form.querySelector('qds-radio-group') as QdsRadioGroup;
      await settle(group);

      let seen: { value: FormDataEntryValue | null; valid: boolean } | undefined;
      group.addEventListener('qds-change', () => {
        seen = { value: new FormData(form).get('size'), valid: group.checkValidity() };
      });
      radiosOf(group)[0]!.click();

      expect(seen).to.deep.equal({ value: 's', valid: true });
    });

    it('is invalid while required and nothing is chosen', async () => {
      const group = await fixture<QdsRadioGroup>(html`
        <qds-radio-group label="Size" required>
          <qds-radio value="s">Small</qds-radio>
        </qds-radio-group>
      `);
      await settle(group);

      expect(group.checkValidity()).to.be.false;
      expect(group.validity.valueMissing).to.be.true;

      group.value = 's';
      await settle(group);
      expect(group.checkValidity()).to.be.true;
    });

    it('restores the initial value on form reset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <qds-radio-group label="Size" name="size" value="s">
            <qds-radio value="s">Small</qds-radio>
            <qds-radio value="m">Medium</qds-radio>
          </qds-radio-group>
        </form>
      `);
      const group = form.querySelector('qds-radio-group') as QdsRadioGroup;
      await settle(group);

      group.value = 'm';
      form.reset();
      await settle(group);

      expect(group.value).to.equal('s');
    });

    it('follows a disabled fieldset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><fieldset disabled>${sizes()}</fieldset></form>
      `);
      const group = form.querySelector('qds-radio-group') as QdsRadioGroup;
      await settle(group);

      expect(radiosOf(group).every((radio) => radio.groupDisabled)).to.be.true;
      expect(group.disabled, 'its own property is left alone').to.be.false;
    });
  });
});
