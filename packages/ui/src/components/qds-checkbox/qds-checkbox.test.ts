import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-checkbox.js';
import type { QdsCheckbox } from './qds-checkbox.js';

/** The native input inside the shadow root. */
const inner = (element: QdsCheckbox): HTMLInputElement => {
  const input = element.shadowRoot?.querySelector('input');
  if (!input) throw new Error('expected an input in the shadow root');
  return input;
};

describe('qds-checkbox', () => {
  it('renders unchecked by default with its label', async () => {
    const element = await fixture<QdsCheckbox>(html`<qds-checkbox>Subscribe</qds-checkbox>`);

    expect(element.checked).to.be.false;
    expect(inner(element).checked).to.be.false;
    expect(element.textContent?.trim()).to.equal('Subscribe');
  });

  it('is accessible checked, unchecked, indeterminate, and disabled', async () => {
    await expect(await fixture(html`<qds-checkbox>Subscribe</qds-checkbox>`)).to.be.accessible();
    await expect(
      await fixture(html`<qds-checkbox checked>Subscribe</qds-checkbox>`),
    ).to.be.accessible();
    await expect(
      await fixture(html`<qds-checkbox indeterminate>Select all</qds-checkbox>`),
    ).to.be.accessible();
    await expect(
      await fixture(html`<qds-checkbox disabled>Subscribe</qds-checkbox>`),
    ).to.be.accessible();
  });

  it('toggles on click and fires qds-change with the new state', async () => {
    const element = await fixture<QdsCheckbox>(html`<qds-checkbox>Subscribe</qds-checkbox>`);

    const listener = oneEvent(element, 'qds-change');
    inner(element).click();
    const event = await listener;

    expect(element.checked).to.be.true;
    expect(event.detail).to.deep.equal({ checked: true });
    expect(event.bubbles).to.be.true;
    expect(event.composed).to.be.true;
  });

  it('clears indeterminate when the user toggles it', async () => {
    const element = await fixture<QdsCheckbox>(
      html`<qds-checkbox indeterminate>Select all</qds-checkbox>`,
    );
    expect(inner(element).indeterminate).to.be.true;

    inner(element).click();
    await elementUpdated(element);

    expect(element.indeterminate).to.be.false;
    expect(inner(element).indeterminate).to.be.false;
  });

  it('does not toggle when disabled', async () => {
    const element = await fixture<QdsCheckbox>(
      html`<qds-checkbox disabled>Subscribe</qds-checkbox>`,
    );

    let fired = false;
    element.addEventListener('qds-change', () => (fired = true));
    inner(element).click();

    expect(element.checked).to.be.false;
    expect(fired).to.be.false;
  });

  it('delegates focus to the native input', async () => {
    const element = await fixture<QdsCheckbox>(html`<qds-checkbox>Subscribe</qds-checkbox>`);

    element.focus();
    expect(element.shadowRoot?.activeElement).to.equal(inner(element));
  });

  it('resolves the checked fill from the component token', async () => {
    const element = await fixture<QdsCheckbox>(
      html`<qds-checkbox checked>Subscribe</qds-checkbox>`,
    );
    document.documentElement.style.setProperty(
      '--qds-component-checkbox-control-color-background-checked',
      'rgb(1, 2, 3)',
    );

    try {
      await elementUpdated(element);
      const control = element.shadowRoot?.querySelector('.control') as HTMLElement;
      expect(getComputedStyle(control).backgroundColor).to.equal('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-checkbox-control-color-background-checked',
      );
    }
  });

  describe('form association', () => {
    it('submits its value only when checked', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <qds-checkbox name="terms" value="yes">Accept</qds-checkbox>
        </form>
      `);
      const element = form.querySelector('qds-checkbox') as QdsCheckbox;

      expect(new FormData(form).get('terms')).to.be.null;

      element.checked = true;
      await elementUpdated(element);
      expect(new FormData(form).get('terms')).to.equal('yes');
    });

    it('has the new form value and validity by the time qds-change fires', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-checkbox name="terms" value="yes" required>Accept</qds-checkbox></form>
      `);
      const element = form.querySelector('qds-checkbox') as QdsCheckbox;

      let seen: { value: FormDataEntryValue | null; valid: boolean } | undefined;
      element.addEventListener('qds-change', () => {
        seen = { value: new FormData(form).get('terms'), valid: element.checkValidity() };
      });
      inner(element).click();

      expect(seen).to.deep.equal({ value: 'yes', valid: true });
    });

    it('is invalid while required and unchecked', async () => {
      const element = await fixture<QdsCheckbox>(
        html`<qds-checkbox required>Accept</qds-checkbox>`,
      );

      expect(element.checkValidity()).to.be.false;
      expect(element.validity.valueMissing).to.be.true;

      element.checked = true;
      await elementUpdated(element);
      expect(element.checkValidity()).to.be.true;
    });

    it('restores the declared state on form reset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <qds-checkbox name="a" checked>A</qds-checkbox>
          <qds-checkbox name="b">B</qds-checkbox>
        </form>
      `);
      const [a, b] = form.querySelectorAll('qds-checkbox');

      a.checked = false;
      b.checked = true;
      form.reset();
      await elementUpdated(a);

      expect(a.checked).to.be.true;
      expect(b.checked).to.be.false;
    });

    it('follows a disabled fieldset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <fieldset disabled><qds-checkbox name="a">A</qds-checkbox></fieldset>
        </form>
      `);
      const element = form.querySelector('qds-checkbox') as QdsCheckbox;
      await elementUpdated(element);

      expect(element.matches(':disabled')).to.be.true;
      expect(inner(element).disabled).to.be.true;
      expect(element.disabled, 'its own property is left alone').to.be.false;
      expect(element.form).to.equal(form);
    });
  });
});
