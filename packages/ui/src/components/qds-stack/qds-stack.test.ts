import { expect, fixture, html, elementUpdated } from '@open-wc/testing';

import './qds-stack.js';
import type { QdsStack } from './qds-stack.js';

describe('qds-stack', () => {
  it('defaults to a block stack at the 400 spacing step', async () => {
    const element = await fixture<QdsStack>(html`<qds-stack><i>a</i><i>b</i></qds-stack>`);

    expect(element.direction).to.equal('block');
    expect(element.gap).to.equal('400');
    expect(getComputedStyle(element).flexDirection).to.equal('column');
  });

  it('switches axis on direction="inline"', async () => {
    const element = await fixture<QdsStack>(
      html`<qds-stack direction="inline"><i>a</i><i>b</i></qds-stack>`,
    );
    expect(getComputedStyle(element).flexDirection).to.equal('row');
  });

  /**
   * The reason this component exists. A broken color token is obvious on sight; a
   * broken spacing token just looks like slightly-off design. So assert that gap
   * actually resolves through the token rather than a fallback.
   */
  it('resolves gap from the spacing scale token', async () => {
    const element = await fixture<QdsStack>(
      html`<qds-stack gap="600"><i>a</i><i>b</i></qds-stack>`,
    );
    document.documentElement.style.setProperty('--qds-spacing-600', '77px');

    try {
      await elementUpdated(element);
      expect(getComputedStyle(element).rowGap).to.equal('77px');
    } finally {
      document.documentElement.style.removeProperty('--qds-spacing-600');
    }
  });

  it('maps every scale step to a distinct gap', async () => {
    const steps = ['0', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;
    const seen = new Set<string>();

    for (const step of steps) {
      const element = await fixture<QdsStack>(
        html`<qds-stack gap=${step}><i>a</i></qds-stack>`,
      );
      const gap = getComputedStyle(element).rowGap;
      expect(gap, `gap="${step}" should resolve to a length`).to.match(/^[\d.]+px$/);
      seen.add(gap);
    }

    // A missing :host([gap='…']) rule would silently fall back to the default,
    // collapsing several steps onto the same value.
    expect(seen.size, 'each step must produce its own value').to.equal(steps.length);
  });

  it('applies alignment and justification', async () => {
    const element = await fixture<QdsStack>(
      html`<qds-stack align="center" justify="between"><i>a</i></qds-stack>`,
    );

    expect(getComputedStyle(element).alignItems).to.equal('center');
    expect(getComputedStyle(element).justifyContent).to.equal('space-between');
  });

  it('wraps only when asked', async () => {
    const element = await fixture<QdsStack>(html`<qds-stack><i>a</i></qds-stack>`);
    expect(getComputedStyle(element).flexWrap).to.equal('nowrap');

    element.wrap = true;
    await elementUpdated(element);
    expect(getComputedStyle(element).flexWrap).to.equal('wrap');
  });

  it('honours the hidden attribute despite setting display on :host', async () => {
    const element = await fixture<QdsStack>(html`<qds-stack hidden><i>a</i></qds-stack>`);
    // :host sets display:flex, which would otherwise defeat [hidden] entirely.
    expect(getComputedStyle(element).display).to.equal('none');
  });

  it('is accessible', async () => {
    const element = await fixture<QdsStack>(
      html`<qds-stack><button>a</button><button>b</button></qds-stack>`,
    );
    await expect(element).to.be.accessible();
  });
});
