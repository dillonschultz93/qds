import { expect, fixture, html, elementUpdated } from '@open-wc/testing';

import type { QdsBreadcrumbItem } from '../qds-breadcrumb-item/qds-breadcrumb-item.js';
import './qds-breadcrumbs.js';
import type { QdsBreadcrumbs } from './qds-breadcrumbs.js';

const separatorShown = (item: QdsBreadcrumbItem): boolean =>
  getComputedStyle(item.shadowRoot!.querySelector('.separator')!).display !== 'none';

async function makeTrail(): Promise<QdsBreadcrumbs> {
  const element = await fixture<QdsBreadcrumbs>(html`
    <qds-breadcrumbs>
      <qds-breadcrumb-item><a href="#home">Home</a></qds-breadcrumb-item>
      <qds-breadcrumb-item><a href="#components">Components</a></qds-breadcrumb-item>
      <qds-breadcrumb-item>Button</qds-breadcrumb-item>
    </qds-breadcrumbs>
  `);
  await element.updateComplete;
  await Promise.all([...element.querySelectorAll<QdsBreadcrumbItem>('qds-breadcrumb-item')].map((item) => item.updateComplete));
  return element;
}

describe('qds-breadcrumbs', () => {
  it('is a navigation landmark named Breadcrumb, around a list of items', async () => {
    const element = await makeTrail();
    const nav = element.shadowRoot!.querySelector('nav')!;

    expect(nav.getAttribute('aria-label')).to.equal('Breadcrumb');
    expect(nav.querySelector('ol')).to.exist;
    expect([...element.querySelectorAll('qds-breadcrumb-item')].every((item) => item.getAttribute('role') === 'listitem')).to.be.true;
    await expect(element).to.be.accessible();
  });

  it('marks only the last item as the current page, on the item when it is text', async () => {
    const element = await makeTrail();
    const items = [...element.querySelectorAll<QdsBreadcrumbItem>('qds-breadcrumb-item')];

    expect(items.map((item) => item.current)).to.deep.equal([false, false, true]);
    expect(items[2]!.getAttribute('aria-current')).to.equal('page');
    expect(element.querySelectorAll('[aria-current]')).to.have.length(1);
  });

  it('puts aria-current on the link when the current page is a link', async () => {
    const element = await fixture<QdsBreadcrumbs>(html`
      <qds-breadcrumbs>
        <qds-breadcrumb-item><a href="#home">Home</a></qds-breadcrumb-item>
        <qds-breadcrumb-item><a href="#here">Here</a></qds-breadcrumb-item>
      </qds-breadcrumbs>
    `);
    await element.updateComplete;
    const last = element.querySelectorAll<QdsBreadcrumbItem>('qds-breadcrumb-item')[1]!;
    await last.updateComplete;

    expect(last.querySelector('a')!.getAttribute('aria-current')).to.equal('page');
    expect(last.hasAttribute('aria-current')).to.be.false;
  });

  it('draws a separator after every item but the last, hidden from assistive technology', async () => {
    const element = await makeTrail();
    const items = [...element.querySelectorAll<QdsBreadcrumbItem>('qds-breadcrumb-item')];

    expect(items.map(separatorShown)).to.deep.equal([true, true, false]);
    expect(items[0]!.shadowRoot!.querySelector('.separator')!.getAttribute('aria-hidden')).to.equal('true');
  });

  it('moves the current page when an item is added', async () => {
    const element = await makeTrail();
    const item = document.createElement('qds-breadcrumb-item');
    item.textContent = 'API';
    element.append(item);
    await new Promise((resolve) => setTimeout(resolve));
    await elementUpdated(item);

    const items = [...element.querySelectorAll<QdsBreadcrumbItem>('qds-breadcrumb-item')];
    expect(items.map((each) => each.current)).to.deep.equal([false, false, false, true]);
    expect(items[2]!.hasAttribute('aria-current')).to.be.false;
  });
});
