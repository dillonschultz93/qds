/**
 * The token reference, built from `@quieto/design-tokens`' generated manifest.
 *
 * The manifest carries each token's resolved value per mode plus the CSS variable
 * names it references, so the reference chain below is a lookup rather than a
 * guess — a bare reference path like `{color.background.primary.rest}` cannot
 * tell you whether its target is a primitive or a semantic variable.
 */

import { tokens as manifest } from '@quieto/design-tokens';
import { TIERS, MODES } from '@quieto/design-tokens/nomenclature';

const byName = new Map(manifest.map((token) => [token.name, token]));

/**
 * Walk a token down to the raw value it ultimately resolves to.
 *
 * Rendering this chain is the clearest argument the three-tier system has: one
 * row shows a component token deferring to intent, deferring to a palette step,
 * arriving at a hex.
 */
function chainFor(token, mode, seen = new Set()) {
  if (seen.has(token.name)) return []; // Cycles are a validator bug, not a crash.
  seen.add(token.name);

  const steps = [
    {
      name: token.name,
      tier: token.tier,
      value: token.modes[mode],
      isColor: token.type === 'color',
    },
  ];

  // Only single-reference tokens have a linear chain. A composite (a shadow with
  // five referenced sub-fields) has a tree, which is not useful as a chain — its
  // references are listed separately instead.
  const references = token.referenceNames?.[mode] ?? [];
  if (references.length !== 1) return steps;

  const next = byName.get(references[0]);
  return next ? [...steps, ...chainFor(next, mode, seen)] : steps;
}

/** Group tokens by their first path segment, which is the category. */
function groupByCategory(tokens) {
  const groups = new Map();
  for (const token of tokens) {
    const category = token.path[0] ?? 'other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(token);
  }
  return [...groups.entries()]
    .map(([category, items]) => ({ category, tokens: items }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export default function () {
  const enriched = manifest.map((token) => ({
    ...token,
    isColor: token.type === 'color',
    chains: Object.fromEntries(MODES.map((mode) => [mode, chainFor(token, mode)])),
    /** Composite tokens list their references flat, having no linear chain. */
    compositeReferences:
      (token.referenceNames?.light?.length ?? 0) > 1 ? token.referenceNames.light : null,
  }));

  const byTier = Object.fromEntries(
    TIERS.map((tier) => [tier, enriched.filter((token) => token.tier === tier)]),
  );

  return {
    all: enriched,
    modes: MODES,
    tiers: TIERS.map((tier) => ({
      tier,
      tokens: byTier[tier],
      categories: groupByCategory(byTier[tier]),
      count: byTier[tier].length,
    })),
    stats: {
      total: enriched.length,
      modeVarying: enriched.filter((token) => !token.modeInvariant).length,
      byTier: Object.fromEntries(TIERS.map((tier) => [tier, byTier[tier].length])),
    },
  };
}
