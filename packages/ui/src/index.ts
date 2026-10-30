/**
 * @quieto/ui — QDS web components.
 *
 * Importing this module registers every element. To register only what you use,
 * import the component directly instead:
 *
 * ```js
 * import '@quieto/ui/qds-button.js';
 * ```
 *
 * Components are styled entirely by CSS custom properties from
 * `@quieto/design-tokens`, which inherit through shadow DOM. Load the stylesheet
 * once, at document level:
 *
 * ```js
 * import '@quieto/design-tokens/css';
 * ```
 *
 * Without it the components fall back to hardcoded values baked into each
 * component — they render, but nothing is themeable and dark mode does nothing.
 */

export { QdsElement } from './internal/qds-element.js';

export { QdsButton } from './components/qds-button/qds-button.js';
export type {
  QdsButtonVariant,
  QdsButtonSize,
  QdsButtonType,
} from './components/qds-button/qds-button.js';

export { QdsStack } from './components/qds-stack/qds-stack.js';
export type {
  QdsStackDirection,
  QdsStackGap,
  QdsStackAlign,
  QdsStackJustify,
} from './components/qds-stack/qds-stack.js';

export { QdsTabs } from './components/qds-tabs/qds-tabs.js';

export { QdsTab } from './components/qds-tab/qds-tab.js';

export { QdsTabPanel } from './components/qds-tab-panel/qds-tab-panel.js';
