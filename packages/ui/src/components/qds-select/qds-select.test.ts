import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-select.js';
import type { QdsSelect } from './qds-select.js';

const nativeOf = (element: QdsSelect): HTMLSelectElement => element.shadowRoot!.querySelector('select')!;

/** Options are read one update after the first, as on a server-rendered page. */
async function ready(element: QdsSelect): Promise<QdsSelect> {
  await element.updateComplete;
  await element.updateComplete;
  return element;
}

const choose = (element: QdsSelect, value: string): void => {
  const select = nativeOf(element);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('qds-select', () => {
  it('copies its options and groups into the native select, labeled', async () => {
    const element = await ready(
      await fixture<QdsSelect>(html`
        <qds-select label="Plan">
          <option value="free">Free</option>
          <optgroup label="Paid">
            <option value="pro">Pro</option>
            <option value="team" disabled>Team</option>
          </optgroup>
        </qds-select>
      `),
    );
    const select = nativeOf(element);

    expect([...select.options].map((option) => option.value)).to.deep.equal(['free', 'pro', 'team']);
    expect(select.querySelector('optgroup')?.label).to.equal('Paid');
    expect(select.options[2]!.disabled).to.be.true;
    expect(select.labels[0]?.textContent?.trim()).to.equal('Plan');
    await expect(element).to.be.accessible();
  });

  it('starts on the first option, the selected one, or the value attribute', async () => {
    const first = await ready(
      await fixture<QdsSelect>(html`<qds-select label="A"><option>One</option><option>Two</option></qds-select>`),
    );
    expect(first.value).to.equal('One');

    const selected = await ready(
      await fixture<QdsSelect>(
        html`<qds-select label="B"><option>One</option><option selected>Two</option></qds-select>`,
      ),
    );
    expect(selected.value).to.equal('Two');
    expect(nativeOf(selected).value).to.equal('Two');

    const attribute = await ready(
      await fixture<QdsSelect>(
        html`<qds-select label="C" value="b"><option value="a">A</option><option value="b">B</option></qds-select>`,
      ),
    );
    expect(nativeOf(attribute).value).to.equal('b');
  });

  it('submits its value and fires qds-change when the user chooses', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form>
        <qds-select label="Size" name="size"><option value="s">S</option><option value="m">M</option></qds-select>
      </form>
    `);
    const element = await ready(form.querySelector<QdsSelect>('qds-select')!);
    expect(new FormData(form).get('size')).to.equal('s');

    setTimeout(() => choose(element, 'm'));
    const { detail } = await oneEvent(element, 'qds-change');
    expect(detail.value).to.equal('m');
    expect(new FormData(form).get('size')).to.equal('m');

    form.reset();
    await elementUpdated(element);
    expect(element.value).to.equal('s');
    expect(nativeOf(element).value).to.equal('s');
  });

  it('is invalid while required and on its placeholder, with a message once touched', async () => {
    const element = await ready(
      await fixture<QdsSelect>(html`
        <qds-select label="Country" placeholder="Choose a country" required>
          <option value="ca">Canada</option>
        </qds-select>
      `),
    );

    expect(element.value).to.equal('');
    expect(nativeOf(element).options[0]!.textContent).to.equal('Choose a country');
    expect(element.checkValidity()).to.be.false;
    expect(element.shadowRoot!.querySelector('.error'), 'not before it is touched').to.be.null;

    element.reportValidity();
    await elementUpdated(element);
    expect(element.shadowRoot!.querySelector('.error')?.textContent).to.not.be.empty;
    expect(nativeOf(element).getAttribute('aria-invalid')).to.equal('true');

    choose(element, 'ca');
    await elementUpdated(element);
    expect(element.checkValidity()).to.be.true;
    expect(element.shadowRoot!.querySelector('.error')).to.be.null;
  });

  it('follows options added later', async () => {
    const element = await ready(await fixture<QdsSelect>(html`<qds-select label="Team"><option>Red</option></qds-select>`));

    const option = document.createElement('option');
    option.textContent = 'Blue';
    element.append(option);
    await new Promise((resolve) => setTimeout(resolve));
    await elementUpdated(element);

    expect([...nativeOf(element).options].map((o) => o.value)).to.deep.equal(['Red', 'Blue']);
  });

  it('describes the select with its hint and error, and disables with a fieldset', async () => {
    const fieldset = await fixture<HTMLFieldSetElement>(html`
      <fieldset>
        <qds-select label="Plan" hint="Change it any time." error="That plan is full."><option>Free</option></qds-select>
      </fieldset>
    `);
    const element = await ready(fieldset.querySelector<QdsSelect>('qds-select')!);
    expect(nativeOf(element).getAttribute('aria-describedby')).to.equal('hint error');

    fieldset.disabled = true;
    await elementUpdated(element);
    expect(nativeOf(element).disabled).to.be.true;
    expect(element.matches(':disabled')).to.be.true;
  });
});
