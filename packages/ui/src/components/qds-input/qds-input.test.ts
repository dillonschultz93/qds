import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-input.js';
import type { QdsInput } from './qds-input.js';

/** The native input inside the shadow root. */
const inner = (element: QdsInput): HTMLInputElement => {
  const input = element.shadowRoot?.querySelector('input');
  if (!input) throw new Error('expected an input in the shadow root');
  return input;
};

/** Type into the native input the way the browser reports it. */
const type = (element: QdsInput, value: string): void => {
  inner(element).value = value;
  inner(element).dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
};

describe('qds-input', () => {
  it('names the native input from the label attribute', async () => {
    const element = await fixture<QdsInput>(html`<qds-input label="Search"></qds-input>`);

    expect(inner(element).getAttribute('aria-label')).to.equal('Search');
    await expect(element).to.be.accessible();
  });

  it('is accessible disabled, read-only, and invalid', async () => {
    await expect(
      await fixture(html`<qds-input label="Name" disabled></qds-input>`),
    ).to.be.accessible();
    await expect(
      await fixture(html`<qds-input label="Name" readonly value="Ada"></qds-input>`),
    ).to.be.accessible();
    await expect(
      await fixture(html`<qds-input label="Name" invalid></qds-input>`),
    ).to.be.accessible();
  });

  it('updates value and fires qds-input as the user types', async () => {
    const element = await fixture<QdsInput>(html`<qds-input label="Name"></qds-input>`);

    const listener = oneEvent(element, 'qds-input');
    type(element, 'Ada');
    const event = await listener;

    expect(element.value).to.equal('Ada');
    expect(event.detail).to.deep.equal({ value: 'Ada' });
  });

  it('fires qds-change when the native input commits', async () => {
    const element = await fixture<QdsInput>(html`<qds-input label="Name"></qds-input>`);
    type(element, 'Ada');

    const listener = oneEvent(element, 'qds-change');
    inner(element).dispatchEvent(new Event('change'));
    const event = await listener;

    expect(event.detail).to.deep.equal({ value: 'Ada' });
  });

  it('writes a programmatic value through to the native input', async () => {
    const element = await fixture<QdsInput>(html`<qds-input label="Name"></qds-input>`);

    element.value = 'Grace';
    await elementUpdated(element);

    expect(inner(element).value).to.equal('Grace');
  });

  it('delegates focus to the native input, including from a click on an affix', async () => {
    const element = await fixture<QdsInput>(html`
      <qds-input label="Price"><span slot="start">$</span></qds-input>
    `);

    element.focus();
    expect(element.shadowRoot?.activeElement).to.equal(inner(element));

    inner(element).blur();
    (element.querySelector('span') as HTMLElement).click();
    expect(element.shadowRoot?.activeElement).to.equal(inner(element));
  });

  it('sets aria-invalid only when invalid', async () => {
    const element = await fixture<QdsInput>(html`<qds-input label="Name"></qds-input>`);
    expect(inner(element).hasAttribute('aria-invalid')).to.be.false;

    element.invalid = true;
    await elementUpdated(element);
    expect(inner(element).getAttribute('aria-invalid')).to.equal('true');
  });

  it('resolves padding from the size token', async () => {
    const element = await fixture<QdsInput>(html`<qds-input label="Name" size="lg"></qds-input>`);
    document.documentElement.style.setProperty('--qds-component-input-lg-padding-inline', '99px');

    try {
      await elementUpdated(element);
      const base = element.shadowRoot?.querySelector('.base') as HTMLElement;
      expect(getComputedStyle(base).paddingInlineStart).to.equal('99px');
    } finally {
      document.documentElement.style.removeProperty('--qds-component-input-lg-padding-inline');
    }
  });

  describe('form association', () => {
    it('submits its value under its name', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-input label="Name" name="name" value="Ada"></qds-input></form>
      `);
      const element = form.querySelector('qds-input') as QdsInput;

      expect(new FormData(form).get('name')).to.equal('Ada');
      type(element, 'Grace');
      expect(new FormData(form).get('name')).to.equal('Grace');
    });

    it('mirrors native constraint validation', async () => {
      const element = await fixture<QdsInput>(
        html`<qds-input label="Email" type="email" required></qds-input>`,
      );

      expect(element.checkValidity()).to.be.false;
      expect(element.validity.valueMissing).to.be.true;

      type(element, 'not an email');
      await elementUpdated(element);
      expect(element.validity.typeMismatch).to.be.true;

      type(element, 'ada@example.com');
      await elementUpdated(element);
      expect(element.checkValidity()).to.be.true;
    });

    it('restores the declared value on form reset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-input label="Name" name="name" value="Ada"></qds-input></form>
      `);
      const element = form.querySelector('qds-input') as QdsInput;

      type(element, 'Grace');
      form.reset();
      await elementUpdated(element);

      expect(element.value).to.equal('Ada');
      expect(inner(element).value).to.equal('Ada');
    });

    it('follows a disabled fieldset and is left out of submission', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <fieldset disabled><qds-input label="Name" name="name" value="Ada"></qds-input></fieldset>
        </form>
      `);
      const element = form.querySelector('qds-input') as QdsInput;
      await elementUpdated(element);

      expect(inner(element).disabled).to.be.true;
      expect(new FormData(form).get('name')).to.be.null;
    });
  });
});
