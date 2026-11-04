import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import '../qds-icon/qds-icon.js';
import './qds-segmented-control.js';
import type { QdsSegmentedControl } from './qds-segmented-control.js';

const press = (target: Element, key: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
};

/** Segments are synced one update after the first, as on a server-rendered page. */
async function ready(element: QdsSegmentedControl): Promise<QdsSegmentedControl> {
  await element.updateComplete;
  await element.updateComplete;
  return element;
}

async function makeControl(attributes = ''): Promise<QdsSegmentedControl> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <qds-segmented-control label="View" ${attributes}>
      <qds-segment value="list">List</qds-segment>
      <qds-segment value="board">Board</qds-segment>
      <qds-segment value="archive" disabled>Archive</qds-segment>
      <qds-segment value="calendar">Calendar</qds-segment>
    </qds-segmented-control>
  `;
  const element = await fixture<HTMLDivElement>(wrapper);
  return ready(element.querySelector<QdsSegmentedControl>('qds-segmented-control')!);
}

const checked = (element: QdsSegmentedControl): string[] =>
  element.segments.filter((segment) => segment.checked).map((segment) => segment.value);

describe('qds-segmented-control', () => {
  it('is a named radio group of radios, with the first chosen by default', async () => {
    const element = await makeControl();
    const base = element.shadowRoot!.querySelector('[part="base"]')!;

    expect(base.getAttribute('role')).to.equal('radiogroup');
    expect(base.getAttribute('aria-label')).to.equal('View');
    expect(element.segments.map((segment) => segment.getAttribute('role'))).to.deep.equal(['radio', 'radio', 'radio', 'radio']);
    expect(element.value).to.equal('list');
    expect(checked(element)).to.deep.equal(['list']);
    expect(element.segments.map((segment) => segment.tabIndex)).to.deep.equal([0, -1, -1, -1]);
    expect(element.segments[2]!.getAttribute('aria-disabled')).to.equal('true');
    await expect(element).to.be.accessible();
  });

  it('starts on its value, or on the segment marked checked', async () => {
    expect((await makeControl('value="board"')).value).to.equal('board');

    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <qds-segmented-control label="Range">
          <qds-segment value="day">Day</qds-segment>
          <qds-segment value="week" checked>Week</qds-segment>
        </qds-segmented-control>
      </div>
    `);
    const element = await ready(wrapper.querySelector<QdsSegmentedControl>('qds-segmented-control')!);
    expect(element.value).to.equal('week');
    expect(element.segments[1]!.getAttribute('aria-checked')).to.equal('true');
  });

  it('chooses on click and fires qds-change, but not for a disabled segment', async () => {
    const element = await makeControl();

    setTimeout(() => element.segments[1]!.click());
    const { detail } = await oneEvent(element, 'qds-change');
    expect(detail.value).to.equal('board');
    await elementUpdated(element);
    expect(element.segments.map((segment) => segment.tabIndex)).to.deep.equal([-1, 0, -1, -1]);

    element.segments[2]!.click();
    expect(element.value).to.equal('board');
  });

  it('moves and chooses with the arrow keys, Home, and End, skipping disabled segments', async () => {
    const element = await makeControl('value="board"');
    const [, board] = element.segments;

    press(board!, 'ArrowRight');
    expect(element.value).to.equal('calendar');
    expect(document.activeElement).to.equal(element.segments[3]);

    press(element.segments[3]!, 'ArrowRight');
    expect(element.value, 'wraps around').to.equal('list');

    press(element.segments[0]!, 'End');
    expect(element.value).to.equal('calendar');
    press(element.segments[3]!, 'Home');
    expect(element.value).to.equal('list');
    press(element.segments[0]!, 'ArrowLeft');
    expect(element.value).to.equal('calendar');
  });

  it('names an icon-only segment by its label', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <qds-segmented-control label="Alignment">
          <qds-segment value="left" label="Align left"><qds-icon name="arrow-right"></qds-icon></qds-segment>
          <qds-segment value="right" label="Align right"><qds-icon name="arrow-right"></qds-icon></qds-segment>
        </qds-segmented-control>
      </div>
    `);
    const element = await ready(wrapper.querySelector<QdsSegmentedControl>('qds-segmented-control')!);
    await elementUpdated(element.segments[0]!);
    expect(element.segments[0]!.getAttribute('aria-label')).to.equal('Align left');
    await expect(element).to.be.accessible();
  });

  it('submits its value, resets, and disables with a fieldset', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form>
        <fieldset>
          <qds-segmented-control label="Unit" name="unit" value="c">
            <qds-segment value="c">°C</qds-segment>
            <qds-segment value="f">°F</qds-segment>
          </qds-segmented-control>
        </fieldset>
      </form>
    `);
    const element = await ready(form.querySelector<QdsSegmentedControl>('qds-segmented-control')!);
    expect(new FormData(form).get('unit')).to.equal('c');

    element.segments[1]!.click();
    expect(new FormData(form).get('unit')).to.equal('f');

    form.reset();
    await elementUpdated(element);
    expect(element.value).to.equal('c');
    expect(checked(element)).to.deep.equal(['c']);

    form.querySelector('fieldset')!.disabled = true;
    await elementUpdated(element);
    await elementUpdated(element);
    expect(element.segments.every((segment) => segment.groupDisabled && segment.tabIndex === -1)).to.be.true;
    element.segments[1]!.click();
    expect(element.value).to.equal('c');
  });
});
