/**
 * The naming vocabularies, read straight from the token package.
 *
 * This is the mechanism that keeps the documentation honest: the tables rendered
 * from this data are the same vocabularies `validate.js` enforces at build time,
 * so the site cannot describe a rule the build does not apply.
 */

import * as spec from '@quieto/design-tokens/nomenclature';

export default function () {
  return {
    prefix: spec.PREFIX,
    tiers: spec.TIERS,
    tierIdentifiers: spec.TIER_IDENTIFIERS,
    modes: spec.MODES,
    states: spec.STATES,
    primitive: spec.primitive,
    semantic: spec.semantic,
    component: spec.component,

    /** Rendered as a table on the Nomenclature page. */
    grammar: [
      {
        tier: 'primitive',
        pattern: '{prefix}-{category}-{sub-category?}-{value}',
        example: 'qds-color-blue-400',
        json: 'color.blue.400',
        references: 'none — raw values only',
      },
      {
        tier: 'semantic',
        pattern: '{prefix}-semantic-{category}-{property?}-{role}-{state?}',
        example: 'qds-semantic-color-background-primary-hover',
        json: 'color.background.primary.hover',
        references: 'primitives',
      },
      {
        tier: 'component',
        pattern: '{prefix}-component-{component}-{variant?}-{property}-{state?}',
        example: 'qds-component-button-primary-color-background-hover',
        json: 'button.primary.color.background.hover',
        references: 'semantics or primitives',
      },
    ],
  };
}
