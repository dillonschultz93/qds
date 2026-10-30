import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-text-field.js';
import type { QdsTextField } from './qds-text-field.js';

const part = <T extends Element>(element: QdsTextField, selector: string): T | null =>
  element.shadowRoot?.querySelector<T>(selector) ?? null;

/** The native input inside the shadow root. */
const inner = (element: QdsTextField): HTMLInputElement => {
  const input = part<HTMLInputElement>(element, 'input');
  if (!input) throw new Error('expected an input in the shadow root');
  return input;
};

/** Type into the native input the way the browser reports it. */
const type = (element: QdsTextField, value: string): void => {
  inner(element).value = value;
  inner(element).dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
};

const errorText = (element: QdsTextField): string | undefined =>
  part(element, '.error')?.textContent?.trim();

describe('qds-text-field', () => {
  it('labels the input with a real label element', async () => {
    const element = await fixture<QdsTextField>(
      html`<qds-text-field label="Full name"></qds-text-field>`,
    );

    expect(inner(element).labels?.[0]?.textContent?.trim()).to.equal('Full name');
    await expect(element).to.be.accessible();
  });

  it('describes the input with its hint', async () => {
    const element = await fixture<QdsTextField>(
      html`<qds-text-field label="Username" hint="Letters and numbers only."></qds-text-field>`,
    );

    expect(inner(element).getAttribute('aria-describedby')).to.equal('hint');
    expect(part(element, '#hint')?.textContent?.trim()).to.equal('Letters and numbers only.');
    await expect(element).to.be.accessible();
  });

  it('accepts a slotted hint, for hints that need markup', async () => {
    const element = await fixture<QdsTextField>(html`
      <qds-text-field label="Password">
        <span slot="hint">See the <a href="#rules">password rules</a>.</span>
      </qds-text-field>
    `);
    await elementUpdated(element);

    expect(inner(element).getAttribute('aria-describedby')).to.equal('hint');
    expect(part(element, '#hint')?.hidden).to.be.false;
  });

  it('shows an author error immediately, and points the input at it', async () => {
    const element = await fixture<QdsTextField>(html`
      <qds-text-field label="Username" hint="Letters only." error="That name is taken."></qds-text-field>
    `);

    expect(errorText(element)).to.equal('That name is taken.');
    expect(inner(element).getAttribute('aria-invalid')).to.equal('true');
    expect(inner(element).getAttribute('aria-describedby')).to.equal('hint error');
    await expect(element).to.be.accessible();
  });

  it('marks required in the label without adding to the accessible name', async () => {
    const element = await fixture<QdsTextField>(
      html`<qds-text-field label="Email" required></qds-text-field>`,
    );

    const star = part(element, '.required');
    expect(star?.getAttribute('aria-hidden')).to.equal('true');
    expect(inner(element).required).to.be.true;
    await expect(element).to.be.accessible();
  });

  it('holds back native validation messages until the user leaves the field', async () => {
    const element = await fixture<QdsTextField>(
      html`<qds-text-field label="Email" type="email" required></qds-text-field>`,
    );
    expect(errorText(element), 'untouched: no message').to.be.undefined;

    type(element, 'not an email');
    await elementUpdated(element);
    expect(errorText(element), 'still typing: no message').to.be.undefined;

    inner(element).dispatchEvent(new FocusEvent('blur'));
    await elementUpdated(element);
    expect(errorText(element)).to.equal(inner(element).validationMessage);
    expect(errorText(element)).to.not.be.empty;

    type(element, 'ada@example.com');
    await elementUpdated(element);
    expect(errorText(element), 'fixed: message cleared').to.be.undefined;
  });

  it('shows messages for every invalid field when the form is submitted', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form @submit=${(event: Event) => event.preventDefault()}>
        <qds-text-field label="Name" name="name" required></qds-text-field>
      </form>
    `);
    const element = form.querySelector('qds-text-field') as QdsTextField;
    await elementUpdated(element);

    form.requestSubmit();
    await elementUpdated(element);

    expect(errorText(element)).to.not.be.undefined;
  });

  it('updates value and fires qds-input and qds-change', async () => {
    const element = await fixture<QdsTextField>(
      html`<qds-text-field label="Name"></qds-text-field>`,
    );

    const input = oneEvent(element, 'qds-input');
    type(element, 'Ada');
    expect((await input).detail).to.deep.equal({ value: 'Ada' });
    expect(element.value).to.equal('Ada');

    const change = oneEvent(element, 'qds-change');
    inner(element).dispatchEvent(new Event('change'));
    expect((await change).detail).to.deep.equal({ value: 'Ada' });
  });

  it('delegates focus to the input, including from a click on the control padding', async () => {
    const element = await fixture<QdsTextField>(html`
      <qds-text-field label="Price"><span slot="start">$</span></qds-text-field>
    `);

    (element.querySelector('span') as HTMLElement).click();
    expect(element.shadowRoot?.activeElement).to.equal(inner(element));
  });

  it('resolves the label weight from the component token', async () => {
    const element = await fixture<QdsTextField>(
      html`<qds-text-field label="Name"></qds-text-field>`,
    );
    document.documentElement.style.setProperty(
      '--qds-component-text-field-label-font-weight',
      '800',
    );

    try {
      expect(getComputedStyle(part(element, 'label')!).fontWeight).to.equal('800');
    } finally {
      document.documentElement.style.removeProperty('--qds-component-text-field-label-font-weight');
    }
  });

  describe('form association', () => {
    it('submits its value, synchronously with the input event', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-text-field label="Name" name="name" value="Ada"></qds-text-field></form>
      `);
      const element = form.querySelector('qds-text-field') as QdsTextField;

      expect(new FormData(form).get('name')).to.equal('Ada');
      type(element, 'Grace');
      expect(new FormData(form).get('name')).to.equal('Grace');
    });

    it('restores the declared value and hides messages again on reset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-text-field label="Name" name="name" value="Ada" required></qds-text-field></form>
      `);
      const element = form.querySelector('qds-text-field') as QdsTextField;

      type(element, '');
      inner(element).dispatchEvent(new FocusEvent('blur'));
      await elementUpdated(element);
      expect(errorText(element)).to.not.be.undefined;

      form.reset();
      await elementUpdated(element);
      expect(element.value).to.equal('Ada');
      expect(errorText(element)).to.be.undefined;
    });

    it('follows a disabled fieldset and is left out of submission', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <fieldset disabled>
            <qds-text-field label="Name" name="name" value="Ada"></qds-text-field>
          </fieldset>
        </form>
      `);
      const element = form.querySelector('qds-text-field') as QdsTextField;
      await elementUpdated(element);

      expect(inner(element).disabled).to.be.true;
      expect(new FormData(form).get('name')).to.be.null;
    });
  });
});
