import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-button.js';
import type { QdsButton } from './qds-button.js';

/** The native button inside the shadow root. */
const inner = (element: QdsButton): HTMLButtonElement => {
  const button = element.shadowRoot?.querySelector('button');
  if (!button) throw new Error('expected a button in the shadow root');
  return button;
};

describe('qds-button', () => {
  it('renders its label and defaults to a medium primary button', async () => {
    const element = await fixture<QdsButton>(html`<qds-button>Save</qds-button>`);

    expect(element.variant).to.equal('primary');
    expect(element.size).to.equal('md');
    expect(element).dom.to.equal('<qds-button variant="primary" size="md">Save</qds-button>');
    expect(element.textContent?.trim()).to.equal('Save');
  });

  it('is accessible in every variant, including while loading and disabled', async () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const element = await fixture<QdsButton>(
        html`<qds-button variant=${variant}>Save</qds-button>`,
      );
      await expect(element).to.be.accessible();
    }

    await expect(await fixture(html`<qds-button loading>Save</qds-button>`)).to.be.accessible();
    await expect(await fixture(html`<qds-button disabled>Save</qds-button>`)).to.be.accessible();
    await expect(
      await fixture(html`<qds-button label="Close"><span>×</span></qds-button>`),
    ).to.be.accessible();
  });

  it('fires qds-click on activation', async () => {
    const element = await fixture<QdsButton>(html`<qds-button>Save</qds-button>`);

    const listener = oneEvent(element, 'qds-click');
    inner(element).click();
    const event = await listener;

    expect(event).to.exist;
    expect(event.bubbles).to.be.true;
    expect(event.composed).to.be.true;
  });

  it('does not fire qds-click when disabled', async () => {
    const element = await fixture<QdsButton>(html`<qds-button disabled>Save</qds-button>`);

    let fired = false;
    element.addEventListener('qds-click', () => {
      fired = true;
    });

    inner(element).click();
    expect(fired).to.be.false;
    expect(inner(element).disabled).to.be.true;
  });

  /**
   * A loading button is not `disabled`, so the browser still dispatches its click
   * — the guard is ours, not the platform's. That makes this the case most likely
   * to regress into a double-submit.
   */
  it('does not fire qds-click while loading, and stops the raw click escaping', async () => {
    const element = await fixture<QdsButton>(html`<qds-button loading>Save</qds-button>`);

    let qdsClicks = 0;
    let rawClicks = 0;
    element.addEventListener('qds-click', () => qdsClicks++);
    element.addEventListener('click', () => rawClicks++);

    inner(element).click();

    expect(qdsClicks, 'qds-click must not fire while loading').to.equal(0);
    expect(rawClicks, 'the raw click must not escape the shadow root either').to.equal(0);
  });

  it('exposes loading state to assistive technology and keeps itself focusable', async () => {
    const element = await fixture<QdsButton>(html`<qds-button loading>Save</qds-button>`);
    const button = inner(element);

    expect(button.getAttribute('aria-busy')).to.equal('true');
    expect(button.getAttribute('aria-disabled')).to.equal('true');
    // Not the `disabled` attribute: that would drop focus mid-interaction.
    expect(button.disabled).to.be.false;
    expect(element.shadowRoot?.querySelector('.spinner')).to.exist;
  });

  it('keeps its accessible name while loading', async () => {
    const element = await fixture<QdsButton>(html`<qds-button loading>Save</qds-button>`);
    // The label is hidden visually but must stay in the accessibility tree, or a
    // screen reader announces an unnamed button mid-submit.
    await expect(element).to.be.accessible();
    expect(element.textContent?.trim()).to.equal('Save');
  });

  it('forwards focus to the inner button via delegatesFocus', async () => {
    const element = await fixture<QdsButton>(html`<qds-button>Save</qds-button>`);

    element.focus();
    await elementUpdated(element);

    expect(document.activeElement).to.equal(element);
    expect(element.shadowRoot?.activeElement).to.equal(inner(element));
  });

  it('reflects variant and size so CSS attribute selectors can target them', async () => {
    const element = await fixture<QdsButton>(html`<qds-button>Save</qds-button>`);

    element.variant = 'danger';
    element.size = 'lg';
    await elementUpdated(element);

    // Reflection is what makes :host([variant='danger']) work; without it the
    // component would render but never restyle.
    expect(element.getAttribute('variant')).to.equal('danger');
    expect(element.getAttribute('size')).to.equal('lg');
  });

  it('resolves padding from the size token, not a hardcoded value', async () => {
    const element = await fixture<QdsButton>(html`<qds-button size="lg">Save</qds-button>`);
    document.documentElement.style.setProperty(
      '--qds-component-button-lg-padding-inline',
      '99px',
    );

    try {
      await elementUpdated(element);
      const padding = getComputedStyle(inner(element)).paddingInline;
      expect(padding, 'the component tier token must drive padding').to.contain('99px');
    } finally {
      document.documentElement.style.removeProperty('--qds-component-button-lg-padding-inline');
    }
  });

  describe('form association', () => {
    it('submits the surrounding form from inside shadow DOM', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form @submit=${(event: Event) => event.preventDefault()}>
          <qds-button type="submit">Save</qds-button>
        </form>
      `);
      const element = form.querySelector('qds-button') as QdsButton;

      const submitted = oneEvent(form, 'submit');
      inner(element).click();
      expect(await submitted).to.exist;
    });

    it('resets the surrounding form', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form>
          <input name="field" value="initial" />
          <qds-button type="reset">Reset</qds-button>
        </form>
      `);
      const input = form.querySelector('input') as HTMLInputElement;
      const element = form.querySelector('qds-button') as QdsButton;

      input.value = 'changed';
      inner(element).click();

      expect(input.value).to.equal('initial');
    });

    it('does not submit when type is button', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form @submit=${(event: Event) => event.preventDefault()}>
          <qds-button type="button">Save</qds-button>
        </form>
      `);
      const element = form.querySelector('qds-button') as QdsButton;

      let submits = 0;
      form.addEventListener('submit', () => submits++);
      inner(element).click();

      expect(submits).to.equal(0);
    });

    it('does not submit while disabled', async () => {
      const form = await fixture<HTMLFormElement>(html`
        <form @submit=${(event: Event) => event.preventDefault()}>
          <qds-button type="submit" disabled>Save</qds-button>
        </form>
      `);
      const element = form.querySelector('qds-button') as QdsButton;

      let submits = 0;
      form.addEventListener('submit', () => submits++);
      inner(element).click();

      expect(submits).to.equal(0);
    });
  });
});
