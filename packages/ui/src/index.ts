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

export { QdsCheckbox } from './components/qds-checkbox/qds-checkbox.js';

export { QdsRadioGroup } from './components/qds-radio-group/qds-radio-group.js';
export type {
  QdsRadioGroupOrientation,
} from './components/qds-radio-group/qds-radio-group.js';

export { QdsRadio } from './components/qds-radio/qds-radio.js';

export { QdsToggle } from './components/qds-toggle/qds-toggle.js';

export { QdsInput } from './components/qds-input/qds-input.js';
export type {
  QdsInputType,
  QdsInputSize,
} from './components/qds-input/qds-input.js';

export { QdsTextField } from './components/qds-text-field/qds-text-field.js';
export type {
  QdsTextFieldType,
} from './components/qds-text-field/qds-text-field.js';

export { QdsChip } from './components/qds-chip/qds-chip.js';
export type {
  QdsChipVariant,
} from './components/qds-chip/qds-chip.js';

export { QdsCard } from './components/qds-card/qds-card.js';
export type {
  QdsCardVariant,
} from './components/qds-card/qds-card.js';

export { QdsProgressBar } from './components/qds-progress-bar/qds-progress-bar.js';
export type {
  QdsProgressBarVariant,
} from './components/qds-progress-bar/qds-progress-bar.js';
