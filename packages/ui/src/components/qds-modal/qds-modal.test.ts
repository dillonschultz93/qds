import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-modal.js';
import '../qds-button/qds-button.js';
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

/**
 * Open a modal and wait for it to be fully shown — including its fade-in, or
 * anything measuring colors (axe's contrast check) sees them half-transparent.
 */
const open = async (modal: QdsModal): Promise<void> => {
  const opened = oneEvent(modal, 'qds-open');
  modal.show();
  await opened;
  await Promise.all(dialogOf(modal).getAnimations().map((animation) => animation.finished));
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

  it('reports the value of a qds-button that submits a dialog form', async () => {
    const modal = await fixture<QdsModal>(html`
      <qds-modal heading="Delete project?">
        <form method="dialog" slot="footer">
          <qds-button type="submit" value="cancel">Cancel</qds-button>
          <qds-button type="submit" value="delete">Delete</qds-button>
        </form>
      </qds-modal>
    `);
    await open(modal);

    const closed = oneEvent(modal, 'qds-close');
    const button = modal.querySelectorAll('qds-button')[1]!;
    button.shadowRoot!.querySelector('button')!.click();
    const event = await closed;

    expect(event.detail).to.deep.equal({ returnValue: 'delete' });
  });

  it('stays open when the page cancels the dialog form submission', async () => {
    const modal = await fixture<QdsModal>(html`
      <qds-modal heading="Save changes?">
        <form method="dialog" slot="footer"><button value="save">Save</button></form>
      </qds-modal>
    `);
    await open(modal);
    const form = modal.querySelector('form') as HTMLFormElement;

    // One listener on the form (runs before the modal's) and one on the document
    // (runs after it): either cancelling must keep the dialog open.
    for (const target of [form, document] as EventTarget[]) {
      const cancel = (event: Event) => event.preventDefault();
      target.addEventListener('submit', cancel);
      (modal.querySelector('button') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      target.removeEventListener('submit', cancel);

      expect(dialogOf(modal).open, `cancelled on ${target === form ? 'the form' : 'the document'}`)
        .to.be.true;
    }
  });

  it('closes when open is set to false', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);

    const closed = oneEvent(modal, 'qds-close');
    modal.open = false;
    await closed;

    expect(dialogOf(modal).open).to.be.false;
  });

  /**
   * A pointer press and release at a point, as the browser reports them: the
   * dialog is the target for any point outside its content, backdrop or not.
   */
  const pointerAt = (target: Element, down: { x: number; y: number }, up = down): void => {
    const init = (point: { x: number; y: number }) => ({
      bubbles: true,
      composed: true,
      clientX: point.x,
      clientY: point.y,
    });
    target.dispatchEvent(new PointerEvent('pointerdown', init(down)));
    dialogOfTarget(target).dispatchEvent(new MouseEvent('click', init(up)));
  };
  const dialogOfTarget = (target: Element): Element =>
    target.closest('dialog') ?? (target.getRootNode() as ShadowRoot).querySelector('dialog')!;

  it('ignores backdrop clicks unless light-dismiss is set', async () => {
    const modal = await fixture<QdsModal>(basic());
    await open(modal);
    const outside = { x: 2, y: 2 };

    pointerAt(dialogOf(modal), outside);
    expect(dialogOf(modal).open).to.be.true;

    modal.lightDismiss = true;
    await elementUpdated(modal);
    const closed = oneEvent(modal, 'qds-close');
    pointerAt(dialogOf(modal), outside);
    await closed;
    expect(modal.open).to.be.false;
  });

  it('does not light-dismiss on a click on the dialog border', async () => {
    const modal = await fixture<QdsModal>(html`<qds-modal heading="Hello" light-dismiss>Body</qds-modal>`);
    await open(modal);
    const box = dialogOf(modal).getBoundingClientRect();
    const onBorder = { x: box.left + 0.5, y: box.top + box.height / 2 };

    pointerAt(dialogOf(modal), onBorder);

    expect(dialogOf(modal).open).to.be.true;
  });

  it('does not light-dismiss when a drag starts inside and ends on the backdrop', async () => {
    const modal = await fixture<QdsModal>(html`
      <qds-modal heading="Hello" light-dismiss><p>Select this text</p></qds-modal>
    `);
    await open(modal);
    const text = (modal.querySelector('p') as HTMLElement).getBoundingClientRect();

    pointerAt(dialogOf(modal), { x: text.left + 2, y: text.top + 2 }, { x: 2, y: 2 });

    expect(dialogOf(modal).open).to.be.true;
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
