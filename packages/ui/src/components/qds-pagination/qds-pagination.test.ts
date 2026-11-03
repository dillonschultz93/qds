import { expect, fixture, html, elementUpdated, oneEvent } from '@open-wc/testing';

import { pageRange } from './qds-pagination.js';
import type { QdsPagination } from './qds-pagination.js';

const labels = (element: QdsPagination): string[] =>
  [...element.shadowRoot!.querySelectorAll('li')].map((li) =>
    li.classList.contains('ellipsis') ? '…' : (li.querySelector('.page')?.getAttribute('aria-label') ?? ''),
  );

const pageButton = (element: QdsPagination, label: string): HTMLElement =>
  element.shadowRoot!.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;

describe('pageRange', () => {
  it('shows every page when there are few', () => {
    expect(pageRange(5, 3, 1)).to.deep.equal([1, 2, 3, 4, 5]);
    expect(pageRange(1, 1, 1)).to.deep.equal([1]);
  });

  it('collapses the gaps on both sides of the current page', () => {
    expect(pageRange(20, 10, 1)).to.deep.equal([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
    expect(pageRange(20, 10, 2)).to.deep.equal([1, 'ellipsis', 8, 9, 10, 11, 12, 'ellipsis', 20]);
  });

  it('shows a single hidden page rather than an ellipsis in its place', () => {
    expect(pageRange(20, 4, 1)).to.deep.equal([1, 2, 3, 4, 5, 'ellipsis', 20]);
    expect(pageRange(20, 17, 1)).to.deep.equal([1, 'ellipsis', 16, 17, 18, 19, 20]);
  });

  it('keeps the ends at the first and last pages', () => {
    expect(pageRange(20, 1, 1)).to.deep.equal([1, 2, 'ellipsis', 20]);
    expect(pageRange(20, 20, 1)).to.deep.equal([1, 'ellipsis', 19, 20]);
  });
});

describe('qds-pagination', () => {
  it('is a navigation landmark with named pages, the current one marked', async () => {
    const element = await fixture<QdsPagination>(html`<qds-pagination total="20" current="10"></qds-pagination>`);

    expect(element.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).to.equal('Pagination');
    expect(labels(element)).to.deep.equal([
      'Previous page', 'Page 1', '…', 'Page 9', 'Page 10', 'Page 11', '…', 'Page 20', 'Next page',
    ]);
    expect(pageButton(element, 'Page 10').getAttribute('aria-current')).to.equal('page');
    await expect(element).to.be.accessible();
  });

  it('disables the arrow at either end', async () => {
    const element = await fixture<QdsPagination>(html`<qds-pagination total="3" current="1"></qds-pagination>`);
    expect((pageButton(element, 'Previous page') as HTMLButtonElement).disabled).to.be.true;
    expect((pageButton(element, 'Next page') as HTMLButtonElement).disabled).to.be.false;

    element.current = 3;
    await elementUpdated(element);
    expect((pageButton(element, 'Next page') as HTMLButtonElement).disabled).to.be.true;
  });

  it('moves to the chosen page, fires qds-change, and keeps focus on it', async () => {
    const element = await fixture<QdsPagination>(html`<qds-pagination total="20" current="10"></qds-pagination>`);

    setTimeout(() => pageButton(element, 'Page 11').click());
    const { detail } = await oneEvent(element, 'qds-change');
    expect(detail.page).to.equal(11);
    await elementUpdated(element);
    expect(element.current).to.equal(11);
    expect(element.shadowRoot!.activeElement?.getAttribute('aria-label')).to.equal('Page 11');

    pageButton(element, 'Next page').click();
    await elementUpdated(element);
    expect(element.current).to.equal(12);
  });

  it('stays put when qds-change is canceled', async () => {
    const element = await fixture<QdsPagination>(html`<qds-pagination total="5" current="2"></qds-pagination>`);
    element.addEventListener('qds-change', (event) => event.preventDefault());

    pageButton(element, 'Page 4').click();
    await elementUpdated(element);
    expect(element.current).to.equal(2);
  });

  it('renders links from the href template, and lets an app cancel the navigation', async () => {
    const element = await fixture<QdsPagination>(
      html`<qds-pagination total="5" current="2" href="#results?page={page}"></qds-pagination>`,
    );
    const link = pageButton(element, 'Page 3') as HTMLAnchorElement;
    expect(link.localName).to.equal('a');
    expect(link.getAttribute('href')).to.equal('#results?page=3');
    expect(pageButton(element, 'Previous page').getAttribute('href')).to.equal('#results?page=1');

    const before = location.hash;
    element.addEventListener('qds-change', (event) => event.preventDefault(), { once: true });
    link.click();
    expect(location.hash, 'navigation was canceled').to.equal(before);
    expect(element.current, 'links do not move current themselves').to.equal(2);
  });

  it('keeps the current page within range', async () => {
    const element = await fixture<QdsPagination>(html`<qds-pagination total="4" current="9"></qds-pagination>`);
    expect(pageButton(element, 'Page 4').getAttribute('aria-current')).to.equal('page');
  });
});
