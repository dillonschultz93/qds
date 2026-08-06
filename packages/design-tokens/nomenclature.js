/**
 * The QDS design token naming grammar, as data.
 *
 * This module is the single machine-readable source for every controlled
 * vocabulary in `docs/nomenclature.md`. Three consumers read it:
 *
 *   1. `validate.js`         — enforces these vocabularies at build time
 *   2. `transforms/name-qds.js` — builds CSS variable names from the grammar
 *   3. the docs site          — renders the reference tables
 *
 * Keeping all three on one source is the point: the documentation cannot
 * describe a rule the build does not enforce, and the build cannot enforce a
 * rule the documentation does not describe.
 *
 * When you change a vocabulary here, update the prose in `docs/nomenclature.md`
 * in the same commit.
 */

/** The global prefix. Developer-facing only; absent from Figma/JSON paths. */
export const PREFIX = 'qds';

/** Tier order, outermost (rawest) first. Index doubles as reference depth. */
export const TIERS = ['primitive', 'semantic', 'component'];

/**
 * Tier identifiers as they appear in CSS variable names.
 *
 * Note the deliberate asymmetry: primitives carry NO tier identifier, while
 * semantic and component tokens do. Primitives are the most-referenced tier, so
 * they get the shortest names. See `docs/nomenclature.md` § Primitive Token
 * Anatomy — the anatomy lists prefix/category/sub-category/value with no tier
 * segment.
 */
export const TIER_IDENTIFIERS = {
  primitive: null,
  semantic: 'semantic',
  component: 'component',
};

/**
 * Theme modes. These name token *sets* at the semantic tier (`semantic/light`) but
 * never appear in a token name — the mode is expressed by the CSS selector the
 * token is emitted under. See `transforms/name-qds.js`.
 */
export const MODES = ['light', 'dark'];

/**
 * States, shared by the semantic and component tiers as the optional trailing
 * segment of a token name.
 *
 * ## Why `rest` was added to the spec's list
 *
 * DTCG forbids a node from being both a token and a group: `color.background.
 * primary` cannot carry a `$value` *and* contain a `hover` child. So a role that
 * has states cannot also hold the resting value at the role node.
 *
 * `rest` resolves this by giving the resting value an explicit state, making the
 * rule uniform:
 *
 *   A role node is either a token OR a state group, never both.
 *
 *   color.background.default          ← stateless role, plain token
 *   color.background.primary.rest     ← stateful role, all states explicit
 *   color.background.primary.hover
 *   color.background.primary.active
 *
 * Without `rest` the alternative is duplicating the resting value under a second
 * role name, which is worse. `rest` is also standard design-system vocabulary
 * (rest/hover/active/focus), so it reads naturally alongside the others.
 */
export const STATES = [
  'rest',
  'hover',
  'active',
  'focus',
  'disabled',
  'visited',
  'selected',
  'checked',
  'unchecked',
];

/**
 * Tier 1 — Primitive tokens.
 *
 * Grammar: {prefix}-{category}-{sub-category?}-{value}
 * Example: --qds-color-blue-400   (from color.blue.400)
 */
export const primitive = {
  categories: ['color', 'typography', 'spacing', 'border', 'shadow', 'animation'],

  /**
   * Fixed sub-categories. Colors are the exception: their sub-category is a hue
   * name, which is open-ended by design, so hues are validated against `hues`
   * below rather than this list.
   */
  subCategories: [
    'font-size',
    'font-family',
    'font-weight',
    'font-style',
    'line-height',
    'text-transform',
    'letter-spacing',
    'radius',
    'width',
    'x',
    'y',
    'blur',
    'spread',
    'duration',
    'ease',
  ],

  /**
   * Registered hue names, serving as the sub-category for `color` primitives.
   *
   * This list is intentionally a closed set even though the spec calls hue names
   * open-ended: an unregistered hue is far more often a typo (`bleu`) than a
   * deliberate addition, and adding one line here is cheap. Extend as the
   * palette grows.
   */
  hues: ['neutral', 'blue', 'green', 'yellow', 'red', 'purple', 'teal'],
};

/**
 * Tier 2 — Semantic tokens.
 *
 * Grammar: {prefix}-semantic-{category}-{property}-{role}-{state?}
 * Example: --qds-semantic-color-background-default-hover
 *          (from color.background.default.hover in the semantic/light set)
 */
export const semantic = {
  /**
   * NOTE: this list intentionally differs from `primitive.categories`.
   *
   * Primitives describe raw values, so radius and width nest under `border`
   * (`border.radius.md`) and shadows decompose into parts (`shadow.blur.200`).
   * Semantics describe intent, so `radius`, `width`, and `elevation` are
   * promoted to top-level categories (`radius.card`, `elevation.raised`).
   *
   * This asymmetry is a decision, not an oversight. Do not "fix" it by merging
   * the two lists.
   */
  categories: [
    'color',
    'typography',
    'spacing',
    'border',
    'width',
    'radius',
    'elevation',
    'animation',
  ],

  /**
   * Properties — what the category is applied to. Required for `color`, where
   * the three surfaces are exhaustive; other categories address a single
   * property implicitly and omit this segment.
   */
  properties: ['content', 'background', 'border'],

  /**
   * Roles — which kind of interface element is being addressed.
   *
   * The list mixes surface roles (`primary`, `danger`, `subtle`) with
   * typographic roles (`headline`, `body`, `meta`) because both are addressed
   * the same way: `color.background.danger` and `typography.body` share one
   * grammar slot.
   */
  roles: [
    'default',
    'primary',
    'secondary',
    'info',
    'warning',
    'danger',
    'success',
    'subtle',
    'neutral',
    'headline',
    'display',
    'title',
    'body',
    'label',
    'meta',
    'data',
  ],
};

/**
 * Tier 3 — Component tokens.
 *
 * Grammar: {prefix}-component-{component-name}-{variant?}-{property}-{state?}
 * Example: --qds-component-button-primary-color-background-hover
 *          (from button.primary.color.background.hover)
 */
export const component = {
  /**
   * Color properties carry their category as a compound segment, distinguishing
   * a component's color surfaces from its dimensional properties.
   */
  colorProperties: ['color-content', 'color-background', 'color-border'],

  /**
   * Non-color properties are any design/CSS property. Enumerated rather than
   * open so that typos are caught; extend freely as components need them.
   */
  cssProperties: [
    'padding',
    'padding-inline',
    'padding-block',
    'margin',
    'gap',
    'width',
    'min-width',
    'max-width',
    'height',
    'min-height',
    'max-height',
    'border-width',
    'border-radius',
    'border-style',
    'box-shadow',
    'font-size',
    'font-family',
    'font-weight',
    'line-height',
    'letter-spacing',
    'opacity',
    'duration',
    'ease',
  ],

  /**
   * `default` describes the common application of a component and may be either
   * stated explicitly or omitted. Any other variant is component-specific and
   * validated as kebab-case rather than against a fixed list.
   */
  defaultVariant: 'default',
};

/** Every property name a component token may use. */
export const componentProperties = [...component.colorProperties, ...component.cssProperties];

/** `true` for lowercase kebab-case segments (`text-field`, `blue`, `400`). */
export const isKebabCase = (segment) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(segment);
