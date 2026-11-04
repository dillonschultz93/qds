import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-combobox.js';
import type { QdsCombobox } from './qds-combobox.js';

const inputOf = (element: QdsCombobox): HTMLInputElement => element.shadowRoot!.querySelector('input')!;
const panelOf = (element: QdsCombobox): HTMLElement => element.shadowRoot!.querySelector('.panel')!;
const shownOf = (element: QdsCombobox): string[] =>
  [...element.shadowRoot!.querySelectorAll('[role="option"]')].map((option) => option.textContent!.trim());
const activeOf = (element: QdsCombobox): string | undefined => {
  const id = inputOf(element).getAttribute('aria-activedescendant');
  return id ? element.shadowRoot!.getElementById(id)?.textContent?.trim() : undefined;
};

const press = (element: QdsCombobox, key: string, init: KeyboardEventInit = {}): void => {
  inputOf(element).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...init }));
};

const type = (element: QdsCombobox, text: string): void => {
  const input = inputOf(element);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

/** Options are read one update after the first, as on a server-rendered page. */
async function makeCombobox(attributes = ''): Promise<QdsCombobox> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <form>
      <qds-combobox label="Fruit" name="fruit" ${attributes}>
        <option value="apple">Apple</option>
        <option value="apricot">Apricot</option>
        <option value="banana" disabled>Banana</option>
        <option value="cherry">Cherry</option>
        <option value="pineapple">Pineapple</option>
      </qds-combobox>
    </form>
    <button id="elsewhere">Elsewhere</button>
  `;
  const root = await fixture<HTMLDivElement>(wrapper);
  const element = root.querySelector<QdsCombobox>('qds-combobox')!;
  await element.updateComplete;
  await element.updateComplete;
  await element.updateComplete;
  return element;
}

describe('qds-combobox', () => {
  it('is a labeled combobox controlling a closed listbox', async () => {
    const element = await makeCombobox();
    const input = inputOf(element);

    expect(input.getAttribute('role')).to.equal('combobox');
    expect(input.labels[0]?.textContent?.trim()).to.equal('Fruit');
    expect(input.getAttribute('aria-autocomplete')).to.equal('list');
    expect(input.getAttribute('aria-expanded')).to.equal('false');
    expect(element.shadowRoot!.getElementById(input.getAttribute('aria-controls')!)!.getAttribute('role')).to.equal('listbox');
    expect(panelOf(element).matches(':popover-open')).to.be.false;
    await expect(element).to.be.accessible();
  });

  it('opens with Down Arrow, highlights options with the arrows, skips disabled ones, and chooses with Enter', async () => {
    const element = await makeCombobox();

    press(element, 'ArrowDown');
    await elementUpdated(element);
    expect(element.open).to.be.true;
    expect(panelOf(element).matches(':popover-open')).to.be.true;
    expect(inputOf(element).getAttribute('aria-expanded')).to.equal('true');
    expect(shownOf(element)).to.have.length(5);
    expect(activeOf(element)).to.equal('Apple');
    await expect(element).to.be.accessible();

    press(element, 'ArrowDown');
    press(element, 'ArrowDown');
    await elementUpdated(element);
    expect(activeOf(element), 'skips Banana').to.equal('Cherry');

    setTimeout(() => press(element, 'Enter'));
    const { detail } = await oneEvent(element, 'qds-change');
    await elementUpdated(element);
    expect(detail.value).to.equal('cherry');
    expect(inputOf(element).value).to.equal('Cherry');
    expect(element.open).to.be.false;
    expect(new FormData(element.form!).get('fruit')).to.equal('cherry');
  });

  it('narrows the list as you type and highlights the first match', async () => {
    const element = await makeCombobox();

    type(element, 'app');
    await elementUpdated(element);
    expect(element.open).to.be.true;
    expect(shownOf(element)).to.deep.equal(['Apple', 'Pineapple']);
    expect(activeOf(element)).to.equal('Apple');

    type(element, 'zzz');
    await elementUpdated(element);
    expect(shownOf(element)).to.deep.equal([]);
    expect(element.shadowRoot!.querySelector('.empty')!.textContent).to.equal('No matches');
  });

  it('chooses an option on click, and marks it selected', async () => {
    const element = await makeCombobox();
    type(element, 'ap');
    await elementUpdated(element);

    const options = [...element.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')];
    options.find((option) => option.textContent!.trim() === 'Apricot')!.click();
    await elementUpdated(element);
    expect(element.value).to.equal('apricot');

    press(element, 'ArrowDown');
    await elementUpdated(element);
    expect(shownOf(element), 'reopens with every option').to.have.length(5);
    expect(activeOf(element), 'highlighting the chosen one').to.equal('Apricot');
    expect(element.shadowRoot!.querySelector('[aria-selected="true"]')!.textContent!.trim()).to.equal('Apricot');
  });

  it('closes on Escape, keeping the value', async () => {
    const element = await makeCombobox('value="cherry"');
    expect(inputOf(element).value).to.equal('Cherry');

    press(element, 'ArrowDown');
    await elementUpdated(element);
    press(element, 'Escape');
    await elementUpdated(element);
    expect(element.open).to.be.false;
    expect(element.value).to.equal('cherry');
  });

  it('settles typed text on leaving: an exact name chooses, other text is undone, empty clears', async () => {
    const element = await makeCombobox('value="apple"');
    const elsewhere = document.getElementById('elsewhere')!;

    inputOf(element).focus();
    type(element, 'pineapple');
    elsewhere.focus();
    await elementUpdated(element);
    expect(element.value).to.equal('pineapple');
    expect(inputOf(element).value).to.equal('Pineapple');

    inputOf(element).focus();
    type(element, 'pine');
    elsewhere.focus();
    await elementUpdated(element);
    expect(element.value).to.equal('pineapple');
    expect(inputOf(element).value).to.equal('Pineapple');

    inputOf(element).focus();
    type(element, '');
    elsewhere.focus();
    await elementUpdated(element);
    expect(element.value).to.equal('');
    expect(new FormData(element.form!).has('fruit')).to.be.false;
  });

  it('is invalid while required and empty, with a message once touched, and resets', async () => {
    const element = await makeCombobox('required value="apple"');
    expect(element.checkValidity()).to.be.true;

    inputOf(element).focus();
    type(element, '');
    document.getElementById('elsewhere')!.focus();
    await elementUpdated(element);
    expect(element.checkValidity()).to.be.false;
    expect(element.shadowRoot!.querySelector('.error')!.textContent).to.equal('Choose an option from the list.');
    expect(inputOf(element).getAttribute('aria-invalid')).to.equal('true');

    element.form!.reset();
    await elementUpdated(element);
    expect(element.value).to.equal('apple');
    expect(inputOf(element).value).to.equal('Apple');
    expect(element.shadowRoot!.querySelector('.error')).to.be.null;
  });

  it('shows the name of a value set from code, and follows options added later', async () => {
    const element = await makeCombobox();
    element.value = 'apricot';
    await elementUpdated(element);
    expect(inputOf(element).value).to.equal('Apricot');

    const option = document.createElement('option');
    option.value = 'date';
    option.textContent = 'Date';
    element.append(option);
    await new Promise((resolve) => setTimeout(resolve));
    await elementUpdated(element);
    type(element, 'dat');
    await elementUpdated(element);
    expect(shownOf(element)).to.deep.equal(['Date']);
  });

  it('does not open while disabled', async () => {
    const element = await makeCombobox('disabled');
    press(element, 'ArrowDown');
    await elementUpdated(element);
    expect(element.open).to.be.false;
    expect(inputOf(element).disabled).to.be.true;
  });
});
