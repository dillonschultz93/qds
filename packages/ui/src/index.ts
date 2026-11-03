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
export { announce } from './internal/announcer.js';
export type { QdsPoliteness } from './internal/announcer.js';

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

export { QdsAccordion } from './components/qds-accordion/qds-accordion.js';

export { QdsAccordionItem } from './components/qds-accordion-item/qds-accordion-item.js';
export type {
  QdsAccordionItemHeadingLevel,
} from './components/qds-accordion-item/qds-accordion-item.js';

export { QdsTabs } from './components/qds-tabs/qds-tabs.js';

export { QdsTab } from './components/qds-tab/qds-tab.js';

export { QdsTabPanel } from './components/qds-tab-panel/qds-tab-panel.js';

export { QdsModal } from './components/qds-modal/qds-modal.js';
export type {
  QdsModalSize,
  QdsModalPlacement,
} from './components/qds-modal/qds-modal.js';

export { QdsIcon, registerIcons } from './components/qds-icon/qds-icon.js';
export type {
  QdsIconSize,
  QdsIconData,
} from './components/qds-icon/qds-icon.js';

export { QdsSelect } from './components/qds-select/qds-select.js';

export { QdsAlert } from './components/qds-alert/qds-alert.js';
export type {
  QdsAlertVariant,
} from './components/qds-alert/qds-alert.js';

export { QdsTooltip } from './components/qds-tooltip/qds-tooltip.js';
export type {
  QdsTooltipPlacement,
} from './components/qds-tooltip/qds-tooltip.js';

export { QdsMenu } from './components/qds-menu/qds-menu.js';
export type {
  QdsMenuPlacement,
} from './components/qds-menu/qds-menu.js';

export { QdsMenuItem } from './components/qds-menu-item/qds-menu-item.js';
export type {
  QdsMenuItemVariant,
} from './components/qds-menu-item/qds-menu-item.js';

export { QdsToast, toast } from './components/qds-toast/qds-toast.js';
export type {
  QdsToastVariant,
  QdsToastOptions,
} from './components/qds-toast/qds-toast.js';

export { QdsCheckboxGroup } from './components/qds-checkbox-group/qds-checkbox-group.js';
export type {
  QdsCheckboxGroupOrientation,
} from './components/qds-checkbox-group/qds-checkbox-group.js';

export { QdsSpinner } from './components/qds-spinner/qds-spinner.js';
export type {
  QdsSpinnerSize,
} from './components/qds-spinner/qds-spinner.js';

export { QdsAvatar } from './components/qds-avatar/qds-avatar.js';
export type {
  QdsAvatarSize,
} from './components/qds-avatar/qds-avatar.js';

export { QdsBreadcrumbs } from './components/qds-breadcrumbs/qds-breadcrumbs.js';

export { QdsBreadcrumbItem } from './components/qds-breadcrumb-item/qds-breadcrumb-item.js';

export { QdsPagination } from './components/qds-pagination/qds-pagination.js';
