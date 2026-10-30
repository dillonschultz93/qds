import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-toggle.js';
import type { QdsToggle } from './qds-toggle.js';

/** The native button inside the shadow root. */
const inner = (element: QdsToggle): HTMLButtonElement => {
  const button = element.shadowRoot?.querySelector('button');
  if (!button) throw new Error('expected a button in the shadow root');
  return button;
};

describe('qds-toggle', () => {
  it('renders off by default, as a switch', async () => {
    const element = await fixture<QdsToggle>(html`<qds-toggle>Wi-Fi</qds-toggle>`);

    expect(element.checked).to.be.false;
    expect(inner(element).getAttribute('role')).to.equal('switch');
    expect(inner(element).getAttribute('aria-checked')).to.equal('false');
  });

  it('is accessible on, off, and disabled', async () => {
    await expect(await fixture(html`<qds-toggle>Wi-Fi</qds-toggle>`)).to.be.accessible();
    await expect(await fixture(html`<qds-toggle checked>Wi-Fi</qds-toggle>`)).to.be.accessible();
    await expect(await fixture(html`<qds-toggle disabled>Wi-Fi</qds-toggle>`)).to.be.accessible();
  });

  it('toggles on click and fires qds-change with the new state', async () => {
    const element = await fixture<QdsToggle>(html`<qds-toggle>Wi-Fi</qds-toggle>`);

    const listener = oneEvent(element, 'qds-change');
    inner(element).click();
    const event = await listener;
    await elementUpdated(element);

    expect(element.checked).to.be.true;
    expect(inner(element).getAttribute('aria-checked')).to.equal('true');
    expect(event.detail).to.deep.equal({ checked: true });
    expect(event.composed).to.be.true;
  });

  it('does not toggle when disabled', async () => {
    const element = await fixture<QdsToggle>(html`<qds-toggle disabled>Wi-Fi</qds-toggle>`);

    let fired = false;
    element.addEventListener('qds-change', () => (fired = true));
    inner(element).click();

    expect(element.checked).to.be.false;
    expect(fired).to.be.false;
  });

  it('slides the thumb to the inline end when on', async () => {
    const element = await fixture<QdsToggle>(html`<qds-toggle>Wi-Fi</qds-toggle>`);
    const thumb = element.shadowRoot?.querySelector('.thumb') as HTMLElement;
    const track = element.shadowRoot?.querySelector('.track') as HTMLElement;
    element.style.setProperty('--qds-component-toggle-duration', '0s');

    element.checked = true;
    await elementUpdated(element);

    const trackBox = track.getBoundingClientRect();
    const thumbBox = thumb.getBoundingClientRect();
    expect(trackBox.right - thumbBox.right).to.be.closeTo(4, 1);
  });

  it('resolves the checked track fill from the component token', async () => {
    const element = await fixture<QdsToggle>(html`<qds-toggle checked>Wi-Fi</qds-toggle>`);
    // The color transitions, so a read straight after the change can land
    // mid-transition and return the old color. Switch the transition off.
    document.documentElement.style.setProperty('--qds-component-toggle-duration', '0s');
    document.documentElement.style.setProperty(
      '--qds-component-toggle-track-color-background-checked',
      'rgb(1, 2, 3)',
    );

    try {
      const track = element.shadowRoot?.querySelector('.track') as HTMLElement;
      expect(getComputedStyle(track).backgroundColor).to.equal('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty(
        '--qds-component-toggle-track-color-background-checked',
      );
      document.documentElement.style.removeProperty('--qds-component-toggle-duration');
    }
  });

  describe('form association', () => {
    it('submits its value only while on, and restores on reset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-toggle name="wifi" value="enabled">Wi-Fi</qds-toggle></form>
      `);
      const element = form.querySelector('qds-toggle') as QdsToggle;

      expect(new FormData(form).get('wifi')).to.be.null;

      inner(element).click();
      await elementUpdated(element);
      expect(new FormData(form).get('wifi')).to.equal('enabled');

      form.reset();
      await elementUpdated(element);
      expect(element.checked).to.be.false;
    });

    it('has the new form value by the time qds-change fires', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><qds-toggle name="wifi" value="enabled">Wi-Fi</qds-toggle></form>
      `);
      const element = form.querySelector('qds-toggle') as QdsToggle;

      let seen: FormDataEntryValue | null | undefined;
      element.addEventListener('qds-change', () => (seen = new FormData(form).get('wifi')));
      inner(element).click();

      expect(seen).to.equal('enabled');
    });

    it('follows a disabled fieldset', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form><fieldset disabled><qds-toggle name="wifi">Wi-Fi</qds-toggle></fieldset></form>
      `);
      const element = form.querySelector('qds-toggle') as QdsToggle;
      await elementUpdated(element);

      expect(inner(element).disabled).to.be.true;
      expect(element.disabled).to.be.false;
    });
  });
});
