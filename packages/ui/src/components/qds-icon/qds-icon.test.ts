import { expect, fixture, html, elementUpdated } from '@open-wc/testing';

import { registerIcons } from './qds-icon.js';
import type { QdsIcon } from './qds-icon.js';

const svgOf = (element: QdsIcon): SVGSVGElement => element.shadowRoot!.querySelector('svg')!;

describe('qds-icon', () => {
  it('draws a built-in icon, decorative by default', async () => {
    const element = await fixture<QdsIcon>(html`<qds-icon name="check"></qds-icon>`);
    const svg = svgOf(element);

    expect(svg.querySelector('path')?.getAttribute('d')).to.equal('M20 6 9 17l-5-5');
    expect(svg.getAttribute('aria-hidden')).to.equal('true');
    expect(svg.hasAttribute('role')).to.be.false;
  });

  it('is an image named by its label when it has one', async () => {
    const element = await fixture<QdsIcon>(html`<qds-icon name="info" label="Information"></qds-icon>`);
    const svg = svgOf(element);

    expect(svg.getAttribute('role')).to.equal('img');
    expect(svg.getAttribute('aria-label')).to.equal('Information');
    expect(svg.hasAttribute('aria-hidden')).to.be.false;
    await expect(element).to.be.accessible();
  });

  it('takes its width and height from the size tokens', async () => {
    const sizes: Record<string, number> = {};
    for (const size of ['sm', 'md', 'lg']) {
      const element = await fixture<QdsIcon>(html`<qds-icon name="x" size=${size}></qds-icon>`);
      sizes[size] = element.getBoundingClientRect().width;
      expect(element.getBoundingClientRect().height).to.equal(sizes[size]);
    }
    expect(sizes.sm).to.equal(16);
    expect(sizes.md).to.equal(20);
    expect(sizes.lg).to.equal(24);
  });

  it('draws nothing for an unknown name, then the icon once it is registered', async () => {
    const element = await fixture<QdsIcon>(html`<qds-icon name="test-square"></qds-icon>`);
    expect(svgOf(element).children).to.have.length(0);

    registerIcons({ 'test-square': [['rect', { x: 4, y: 4, width: 16, height: 16, key: 'r1' }]] });
    await elementUpdated(element);

    const rect = svgOf(element).querySelector('rect')!;
    expect(rect.getAttribute('width')).to.equal('16');
    expect(rect.hasAttribute('key'), 'React-only key is dropped').to.be.false;
  });

  it('escapes attribute values from registered icons', async () => {
    registerIcons({ 'test-quote': [['path', { d: 'M0 0"/><script>' }]] });
    const element = await fixture<QdsIcon>(html`<qds-icon name="test-quote"></qds-icon>`);

    expect(svgOf(element).querySelector('script')).to.be.null;
    expect(svgOf(element).querySelector('path')?.getAttribute('d')).to.equal('M0 0"/><script>');
  });
});
