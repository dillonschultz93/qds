import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-modal.js';
import type { QdsModal } from './qds-modal.js';

const dialogOf = (modal: QdsModal): HTMLDialogElement =>
  modal.shadowRoot?.querySelector('dialog') as HTMLDialogElement;

const closeButton = (modal: QdsModal): HTMLButtonElement =>
  modal.shadowRoot?.querySelector('.close') as HTMLButtonElement;

const basic = () => html`
  <qds-modal heading="Delete project?">
    <p>This cannot be undone.</p>
    <div slot="footer"><button>Cancel</button></div>
  </qds-modal>
`;

/** Open a modal and wait for it to be showing. */
const open = async (modal: QdsModal): Promise<void> => {
  const opened = oneEvent(modal, 'qds-open');
  modal.show();
  await opened;
};

describe('qds-modal', () => {
  afterEach(() => {
    // A modal left open keeps the rest of the test page inert.
    document.querySelectorAll('qds-modal').forEach((modal) => modal.close());
  });

  it('renders closed, with nothing shown', async () => {
    const modal = await fixture<QdsModal>(basic());

    expect(modal.open).to.be.false;
    expect(dialogOf(modal).open).to.be.false;
  });

  it('is accessible when open', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);
    await expect(modal).to.be.accessible();
  });

  it('opens as a modal dialog named by its heading', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    const dialog = dialogOf(modal);
    expect(dialog.open).to.be.true;
    expect(dialog.matches(':modal'), 'showModal, not show').to.be.true;

    const labelledBy = dialog.getAttribute('aria-labelledby')!;
    expect(modal.shadowRoot?.getElementById(labelledBy)?.textContent?.trim()).to.equal(
      'Delete project?',
    );
  });

  it('opens from the open attribute, too', async () => {
    const modal = await fixture<QdsModal>(html`<qds-modal heading="Hello" open>Body</qds-modal>`);
    await elementUpdated(modal);

    expect(dialogOf(modal).open).to.be.true;
  });

  it('moves focus into the dialog', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    expect(modal.shadowRoot?.activeElement ?? document.activeElement).to.not.equal(document.body);
  });

  it('closes from the close button and fires qds-close', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    const closed = oneEvent(modal, 'qds-close');
    closeButton(modal).click();
    await closed;

    expect(modal.open).to.be.false;
    expect(dialogOf(modal).open).to.be.false;
  });

  it('closes when Escape cancels the dialog, keeping open in sync', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    // What the browser does on Escape: cancel, then close.
    const closed = oneEvent(modal, 'qds-close');
    dialogOf(modal).dispatchEvent(new Event('cancel', { cancelable: true }));
    dialogOf(modal).close();
    await closed;

    expect(modal.open).to.be.false;
  });

  it('reports the value passed to close()', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    const closed = oneEvent(modal, 'qds-close');
    modal.close('confirmed');
    const event = await closed;

    expect(event.detail).to.deep.equal({ returnValue: 'confirmed' });
  });

  it('closes from a form with method="dialog", reporting the button value', async () => {
    const modal = await fixture<QdsModal>(html`
      <qds-modal heading="Save changes?">
        <form method="dialog" slot="footer">
          <button value="discard">Discard</button>
          <button value="save">Save</button>
        </form>
      </qds-modal>
    `);
    await open(modal);

    const closed = oneEvent(modal, 'qds-close');
    (modal.querySelector('button[value="save"]') as HTMLButtonElement).click();
    const event = await closed;

    expect(event.detail).to.deep.equal({ returnValue: 'save' });
    expect(modal.open).to.be.false;
  });

  it('closes when open is set to false', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    const closed = oneEvent(modal, 'qds-close');
    modal.open = false;
    await closed;

    expect(dialogOf(modal).open).to.be.false;
  });

  it('ignores backdrop clicks unless light-dismiss is set', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    dialogOf(modal).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(dialogOf(modal).open).to.be.true;

    modal.lightDismiss = true;
    await elementUpdated(modal);
    const closed = oneEvent(modal, 'qds-close');
    dialogOf(modal).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await closed;
    expect(modal.open).to.be.false;
  });

  it('does not treat a click inside the content as a backdrop click', async () => {
    const modal = await fixture<QdsModal>(html`
      <qds-modal heading="Hello" light-dismiss><p>Body</p></qds-modal>
    `);
    await open(modal);

    (modal.querySelector('p') as HTMLElement).click();

    expect(dialogOf(modal).open).to.be.true;
  });

  it('resolves the max width from the size token', async () => {
    const modal = await fixture<QdsModal>(html`<qds-modal heading="Hello" size="lg">Body</qds-modal>`);
    document.documentElement.style.setProperty('--qds-component-modal-lg-max-width', '333px');

    try {
      await open(modal);
      expect(getComputedStyle(dialogOf(modal)).maxWidth).to.equal('333px');
    } finally {
      document.documentElement.style.removeProperty('--qds-component-modal-lg-max-width');
    }
  });
});
