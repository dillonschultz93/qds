import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-slider.js';
import type { QdsSlider } from './qds-slider.js';

const inputOf = (element: QdsSlider): HTMLInputElement => element.shadowRoot!.querySelector('input')!;

/** Moves the native input as a drag would, firing input and then change. */
const slide = (element: QdsSlider, value: number): void => {
  const input = inputOf(element);
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('qds-slider', () => {
  it('is a labeled native range input', async () => {
    const element = await fixture<QdsSlider>(
      html`<qds-slider label="Volume" value="40" min="0" max="200" step="10" hint="Applies to every device."></qds-slider>`,
    );
    const input = inputOf(element);

    expect(input.type).to.equal('range');
    expect(input.labels[0]?.textContent?.trim()).to.equal('Volume');
    expect([input.min, input.max, input.step, input.value]).to.deep.equal(['0', '200', '10', '40']);
    expect(input.getAttribute('aria-describedby')).to.equal('hint');
    await expect(element).to.be.accessible();
  });

  it('shows the value beside the label on request', async () => {
    const element = await fixture<QdsSlider>(html`<qds-slider label="Zoom" value="75"></qds-slider>`);
    expect(element.shadowRoot!.querySelector('[part="value"]')).to.be.null;

    element.showValue = true;
    await elementUpdated(element);
    expect(element.shadowRoot!.querySelector('[part="value"]')!.textContent).to.equal('75');
  });

  it('fills the track up to the value', async () => {
    const element = await fixture<QdsSlider>(html`<qds-slider label="Level" value="25"></qds-slider>`);
    expect(inputOf(element).style.getPropertyValue('--_percent')).to.equal('25%');
  });

  it('keeps the value within the range, snapped to the step', async () => {
    const element = await fixture<QdsSlider>(html`<qds-slider label="Rating" min="1" max="5" value="9"></qds-slider>`);
    expect(element.value).to.equal(5);

    element.step = 2;
    element.value = 2.4;
    await elementUpdated(element);
    await elementUpdated(element);
    expect(element.value).to.equal(3);
  });

  it('fires qds-input while moving and qds-change when let go, and submits its value', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form><qds-slider label="Budget" name="budget" value="30"></qds-slider></form>
    `);
    const element = form.querySelector<QdsSlider>('qds-slider')!;
    await elementUpdated(element);
    expect(new FormData(form).get('budget')).to.equal('30');

    const inputs: number[] = [];
    element.addEventListener('qds-input', (event) => inputs.push((event as CustomEvent).detail.value));
    setTimeout(() => slide(element, 60));
    const { detail } = await oneEvent(element, 'qds-change');

    expect(inputs).to.deep.equal([60]);
    expect(detail.value).to.equal(60);
    expect(new FormData(form).get('budget')).to.equal('60');

    form.reset();
    await elementUpdated(element);
    expect(element.value).to.equal(30);
    expect(inputOf(element).value).to.equal('30');
  });

  it('disables with a fieldset, and leaves the form data', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form><fieldset><qds-slider label="Speed" name="speed"></qds-slider></fieldset></form>
    `);
    const element = form.querySelector<QdsSlider>('qds-slider')!;
    form.querySelector('fieldset')!.disabled = true;
    await elementUpdated(element);

    expect(inputOf(element).disabled).to.be.true;
    expect(element.matches(':disabled')).to.be.true;
    expect(new FormData(form).has('speed')).to.be.false;
  });
});
