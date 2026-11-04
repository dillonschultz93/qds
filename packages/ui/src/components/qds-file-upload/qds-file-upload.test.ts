import { expect, fixture, html, oneEvent, elementUpdated } from '@open-wc/testing';

import './qds-file-upload.js';
import type { QdsFileUpload } from './qds-file-upload.js';

const file = (name: string, type: string, size = 2048): File => new File([new Uint8Array(size)], name, { type });

const inputOf = (element: QdsFileUpload): HTMLInputElement => element.shadowRoot!.querySelector('input[type="file"]')!;
const dropzoneOf = (element: QdsFileUpload): HTMLElement => element.shadowRoot!.querySelector('[part="dropzone"]')!;
const errorOf = (element: QdsFileUpload): string | undefined =>
  element.shadowRoot!.querySelector('[part="error"]')?.textContent?.trim();

/** Picks files through the native input, as the system picker does. */
function pick(element: QdsFileUpload, files: File[]): void {
  const transfer = new DataTransfer();
  for (const f of files) transfer.items.add(f);
  const input = inputOf(element);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function drop(element: QdsFileUpload, files: File[]): void {
  const transfer = new DataTransfer();
  for (const f of files) transfer.items.add(f);
  const zone = dropzoneOf(element);
  zone.dispatchEvent(new DragEvent('dragover', { dataTransfer: transfer, bubbles: true, cancelable: true }));
  zone.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
}

describe('qds-file-upload', () => {
  it('is a labeled group with a button that opens the picker', async () => {
    const element = await fixture<QdsFileUpload>(
      html`<qds-file-upload label="Attachments" hint="PDF, up to 10 MB." accept=".pdf" multiple></qds-file-upload>`,
    );
    const zone = dropzoneOf(element);
    const button = element.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!;

    expect(zone.getAttribute('role')).to.equal('group');
    expect(element.shadowRoot!.getElementById(zone.getAttribute('aria-labelledby')!)!.textContent!.trim()).to.equal('Attachments');
    expect(button.textContent!.trim()).to.equal('choose files');
    expect(button.getAttribute('aria-describedby')).to.equal('hint');
    expect(inputOf(element).accept).to.equal('.pdf');
    expect(inputOf(element).multiple).to.be.true;
    await expect(element).to.be.accessible();

    let clicked = false;
    inputOf(element).addEventListener('click', (event) => {
      clicked = true;
      event.preventDefault();
    });
    button.click();
    expect(clicked).to.be.true;
  });

  it('lists picked files with their sizes, and submits them under its name', async () => {
    const form = await fixture<HTMLFormElement>(html`
      <form><qds-file-upload label="Files" name="files" multiple></qds-file-upload></form>
    `);
    const element = form.querySelector<QdsFileUpload>('qds-file-upload')!;

    setTimeout(() => pick(element, [file('report.pdf', 'application/pdf', 2048), file('photo.png', 'image/png', 3_500_000)]));
    const { detail } = await oneEvent(element, 'qds-change');
    await elementUpdated(element);

    expect(detail.files.map((f: File) => f.name)).to.deep.equal(['report.pdf', 'photo.png']);
    const rows = [...element.shadowRoot!.querySelectorAll('[part="file"]')];
    expect(rows.map((row) => row.querySelector('.name')!.textContent)).to.deep.equal(['report.pdf', 'photo.png']);
    expect(rows[1]!.querySelector('.size')!.textContent).to.match(/3\.5\s?MB/);
    expect((new FormData(form).getAll('files') as File[]).map((f) => f.name)).to.deep.equal(['report.pdf', 'photo.png']);
    await expect(element).to.be.accessible();

    // Picking more adds to the list.
    pick(element, [file('notes.txt', 'text/plain')]);
    expect(element.files).to.have.length(3);

    form.reset();
    await elementUpdated(element);
    expect(element.files).to.have.length(0);
    expect(new FormData(form).has('files')).to.be.false;
  });

  it('replaces the file without multiple', async () => {
    const element = await fixture<QdsFileUpload>(html`<qds-file-upload label="Avatar"></qds-file-upload>`);
    pick(element, [file('a.png', 'image/png')]);
    pick(element, [file('b.png', 'image/png')]);
    expect(element.files.map((f) => f.name)).to.deep.equal(['b.png']);
  });

  it('removes a file, moving focus to the next one', async () => {
    const element = await fixture<QdsFileUpload>(html`<qds-file-upload label="Files" multiple></qds-file-upload>`);
    pick(element, [file('one.txt', 'text/plain'), file('two.txt', 'text/plain')]);
    await elementUpdated(element);

    const remove = element.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!;
    expect(remove.getAttribute('aria-label')).to.equal('Remove one.txt');
    remove.click();
    await elementUpdated(element);
    await element.updateComplete;

    expect(element.files.map((f) => f.name)).to.deep.equal(['two.txt']);
    expect(element.shadowRoot!.activeElement?.getAttribute('aria-label')).to.equal('Remove two.txt');
  });

  it('accepts dropped files, leaving out the types it does not accept', async () => {
    const element = await fixture<QdsFileUpload>(
      html`<qds-file-upload label="Images" accept="image/*,.pdf" multiple></qds-file-upload>`,
    );
    drop(element, [file('cat.jpg', 'image/jpeg'), file('spec.PDF', 'application/pdf'), file('song.mp3', 'audio/mpeg')]);
    await elementUpdated(element);

    expect(element.files.map((f) => f.name)).to.deep.equal(['cat.jpg', 'spec.PDF']);
    expect(errorOf(element)).to.equal('song.mp3 is not an accepted file type.');
  });

  it('shows that files are dragged over it', async () => {
    const element = await fixture<QdsFileUpload>(html`<qds-file-upload label="Files"></qds-file-upload>`);
    const transfer = new DataTransfer();
    transfer.items.add(file('a.txt', 'text/plain'));
    dropzoneOf(element).dispatchEvent(new DragEvent('dragover', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    await elementUpdated(element);
    expect(element.shadowRoot!.querySelector('.base')!.classList.contains('dragging')).to.be.true;

    dropzoneOf(element).dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
    await elementUpdated(element);
    expect(element.shadowRoot!.querySelector('.base')!.classList.contains('dragging')).to.be.false;
  });

  it('is invalid while required and empty, with a message once reported', async () => {
    const element = await fixture<QdsFileUpload>(html`<qds-file-upload label="Resume" required></qds-file-upload>`);
    expect(element.checkValidity()).to.be.false;
    expect(errorOf(element)).to.be.undefined;

    element.reportValidity();
    await elementUpdated(element);
    expect(errorOf(element)).to.equal('Select a file.');

    pick(element, [file('cv.pdf', 'application/pdf')]);
    await elementUpdated(element);
    expect(element.checkValidity()).to.be.true;
    expect(errorOf(element)).to.be.undefined;
  });

  it('ignores drops and disables its buttons while disabled', async () => {
    const element = await fixture<QdsFileUpload>(html`<qds-file-upload label="Files" disabled></qds-file-upload>`);
    drop(element, [file('a.txt', 'text/plain')]);
    expect(element.files).to.have.length(0);
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!.disabled).to.be.true;
    expect(element.matches(':disabled')).to.be.true;
  });
});
