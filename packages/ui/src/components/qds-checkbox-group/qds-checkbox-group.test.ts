import { expect, fixture, html, elementUpdated } from '@open-wc/testing';

import type { QdsCheckbox } from '../qds-checkbox/qds-checkbox.js';
import './qds-checkbox-group.js';
import type { QdsCheckboxGroup } from './qds-checkbox-group.js';

const boxInput = (box: QdsCheckbox): HTMLInputElement => box.shadowRoot!.querySelector('input')!;

/** Checks or unchecks a box as a person would, through its native input. */
const toggle = (box: QdsCheckbox): void => boxInput(box).click();

async function makeGroup(): Promise<{ form: HTMLFormElement; group: QdsCheckboxGroup; boxes: QdsCheckbox[] }> {
  const form = await fixture<HTMLFormElement>(html`
    <form>
      <qds-checkbox-group label="Notify me about" name="notify" hint="Choose any." required>
        <qds-checkbox value="mentions">Mentions</qds-checkbox>
        <qds-checkbox value="replies" checked>Replies</qds-checkbox>
        <qds-checkbox value="digest">Weekly digest</qds-checkbox>
      </qds-checkbox-group>
    </form>
  `);
  const group = form.querySelector<QdsCheckboxGroup>('qds-checkbox-group')!;
  await group.updateComplete;
  await group.updateComplete;
  return { form, group, boxes: group.checkboxes };
}

describe('qds-checkbox-group', () => {
  it('is a group labeled and described for every checkbox in it', async () => {
    const { group } = await makeGroup();
    const base = group.shadowRoot!.querySelector('[part="base"]')!;

    expect(base.getAttribute('role')).to.equal('group');
    expect(group.shadowRoot!.getElementById(base.getAttribute('aria-labelledby')!)?.textContent).to.include('Notify me about');
    expect(base.getAttribute('aria-describedby')).to.equal('hint');
    await expect(group).to.be.accessible();
  });

  it('names its checkboxes, which submit as one field with many values', async () => {
    const { form, group, boxes } = await makeGroup();

    expect(boxes.every((box) => box.name === 'notify')).to.be.true;
    expect(group.value).to.deep.equal(['replies']);
    toggle(boxes[0]!);
    expect(new FormData(form).getAll('notify')).to.deep.equal(['mentions', 'replies']);
  });

  it('fires one qds-change with every chosen value, in place of the checkboxes’ own', async () => {
    const { form, group, boxes } = await makeGroup();
    const fromForm: string[][] = [];
    form.addEventListener('qds-change', (event) => fromForm.push((event as CustomEvent).detail.value));

    toggle(boxes[2]!);
    expect(fromForm).to.deep.equal([['replies', 'digest']]);

    toggle(boxes[1]!);
    expect(fromForm.at(-1)).to.deep.equal(['digest']);
    expect(group.value).to.deep.equal(['digest']);
  });

  it('requires at least one choice, with a message once a box is unchecked', async () => {
    const { group, boxes } = await makeGroup();
    expect(group.checkValidity()).to.be.true;

    toggle(boxes[1]!);
    await elementUpdated(group);
    expect(group.checkValidity()).to.be.false;
    expect(group.shadowRoot!.querySelector('.error')?.textContent).to.equal('Select at least one option.');
    expect(group.shadowRoot!.querySelector('[part="base"]')!.getAttribute('aria-describedby')).to.equal('hint error');

    toggle(boxes[0]!);
    await elementUpdated(group);
    expect(group.checkValidity()).to.be.true;
    expect(group.shadowRoot!.querySelector('.error') === null, 'the message is gone').to.be.true;
  });

  it('disables every checkbox, and gives each its own state back afterwards', async () => {
    const { group, boxes } = await makeGroup();
    boxes[2]!.disabled = true;

    group.disabled = true;
    await elementUpdated(group);
    expect(boxes.every((box) => box.disabled)).to.be.true;
    expect(group.checkValidity(), 'a disabled group is not validated').to.be.true;

    group.disabled = false;
    await elementUpdated(group);
    expect(boxes.map((box) => box.disabled)).to.deep.equal([false, false, true]);
  });

  it('shows an author error at once, and lays options out in a row when inline', async () => {
    const group = await fixture<QdsCheckboxGroup>(html`
      <qds-checkbox-group label="Sizes" error="Pick a size we stock." orientation="inline">
        <qds-checkbox>S</qds-checkbox><qds-checkbox>M</qds-checkbox>
      </qds-checkbox-group>
    `);
    expect(group.shadowRoot!.querySelector('.error')?.textContent).to.equal('Pick a size we stock.');
    expect(getComputedStyle(group.shadowRoot!.querySelector('.options')!).flexDirection).to.equal('row');
  });
});
