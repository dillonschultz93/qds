# @quieto/ui

## 1.0.3

### Patch Changes

- 8587be3: README: link the docs site at quieto.dev and the Quieto Tokens and Quieto Components Figma files. The design-tokens README also gives the JS manifest's current size (385 kB).
- Updated dependencies [8587be3]
  - @quieto/design-tokens@1.0.2

## 1.0.2

### Patch Changes

- Updated dependencies [2fb2323]
  - @quieto/design-tokens@1.0.1

## 1.0.1

### Patch Changes

- 1443b92: Document `qds-button`'s `expanded` property (`aria-expanded`) in the custom elements manifest.

## 1.0.0

### Major Changes

- ceb2d11: 1.0.0: the first stable release. Nothing is removed or renamed in this release; the major version marks the start of semantic versioning's promise. From here, removing or renaming a token, element, attribute, event, slot, or CSS part waits for the next major version, and the READMEs set out exactly what is public API.

### Minor Changes

- f67627c: Add the Tier 2 components from the roadmap:

  - `qds-toast`, a temporary message in the corner of the screen, announced to screen readers, with `toast()` to show one from code.
  - `qds-checkbox-group`, a labeled set of checkboxes with a hint, "choose at least one" validation, and one `qds-change` for the set.
  - `qds-spinner`, a standalone loading indicator.
  - `qds-avatar`, a person's image, with their initials as the fallback.
  - `qds-breadcrumbs` and `qds-breadcrumb-item`, the trail of pages above the current one.
  - `qds-pagination`, page links or buttons with the gaps collapsed.

  The built-in icons gain `chevron-left` and `user`.

- ceb2d11: Add the two variants from the roadmap: `multiline` (and `rows`) on `qds-text-field`, for a textarea with the field's label, hint, errors, and validation; and `placement` on `qds-modal` — `start`, `end`, or `bottom` — for a drawer against that edge.

### Patch Changes

- Updated dependencies [ceb2d11]
- Updated dependencies [f67627c]
  - @quieto/design-tokens@1.0.0

## 0.2.0

### Minor Changes

- 106e35b: Add the Tier 1 components from the roadmap:

  - `qds-icon`, drawing Lucide's icons, with a small built-in set and `registerIcons()` to add any other Lucide icon.
  - `qds-select`, a native select with the label, hint, error, and validation of `qds-text-field`.
  - `qds-alert`, an inline info, success, warning, or error message, optionally dismissible.
  - `qds-tooltip`, a short label on hover and focus that names an icon-only button.
  - `qds-menu` and `qds-menu-item`, an action menu following the WAI-ARIA menu button pattern.

  Also adds `announce()`, the shared way components (and apps) have screen readers read a message aloud, and lets `qds-button` pass `aria-haspopup` and `aria-expanded` to its inner button.

### Patch Changes

- Updated dependencies [106e35b]
  - @quieto/design-tokens@0.3.0

## 0.1.2

### Patch Changes

- c3f58a2: Fix `qds-input` and `qds-text-field` throwing when disabled or read-only while holding a value that would be invalid, such as a disabled email field with a malformed address. A control that is not being validated now reports itself valid, as a native input would.

## 0.1.1

### Patch Changes

- ad25dd6: List `qds-accordion-item`'s `qds-open` and `qds-close` events by name in `custom-elements.json`. They were recorded as a single unnamed event, because the event name was computed; editors and docs reading the manifest showed a blank entry.

## 0.1.0

### Minor Changes

- 35c897a: Add `qds-accordion` and `qds-accordion-item`: collapsible sections following the ARIA accordion pattern, with a configurable heading level, an exclusive mode, arrow-key movement between headings, and closed panels that find-in-page can still search. Styled by the new `component/accordion` token set.
- 99ce48f: Add `qds-card`: a container with media, header, body, and footer regions in outlined, elevated, and filled variants. Empty regions are hidden in CSS, so server-rendered cards lay out correctly before hydration. Styled by the new `component/card` token set.
- db92c5e: Add `qds-checkbox`: a form-associated checkbox with checked, indeterminate, disabled, and required states, styled by the new `component/checkbox` token set.
- b7d1206: Add `qds-chip`: a compact status or category label in five variants, with an optional remove button that fires `qds-remove`. Styled by the new `component/chip` token set.
- ad84c23: Add `qds-input`: a form-associated single-line text input with sizes, start and end slots, and native constraint validation, styled by the new `component/input` token set.
- a8ac72b: Add `qds-modal`: a modal dialog built on the native `<dialog>` and `showModal()`, with three sizes, opt-in light dismiss, and support for slotted `<form method="dialog">`. Styled by the new `component/modal` token set.
- 6cb64b1: Add `qds-progress-bar`: determinate and indeterminate progress in four variants, announced with the progressbar role and pulsing instead of sliding under reduced motion. Styled by the new `component/progress-bar` token set.
- ae223c6: Add `qds-radio-group` and `qds-radio`: a form-associated radio group with roving-tabindex arrow-key navigation, required validation, and block or inline layout, styled by the new `component/radio` token set.
- afc271a: Add `qds-tabs`, `qds-tab`, and `qds-tab-panel`: tabs following the ARIA tabs pattern with automatic activation, roving tabindex, RTL-aware arrow keys, and disabled tabs. Styled by the new `component/tabs` token set.
- 06555a5: Add `qds-text-field`: a complete form-associated text field with a visible label, hint, and error message wired to the input, showing native validation messages once the user leaves the field. Styled by the new `component/text-field` token set.
- cc1def3: Add `qds-toggle`: a form-associated on/off switch, announced with the switch role, styled by the new `component/toggle` token set.
- 19a9592: Add `name` and `value` to `qds-button`. A submit button now submits its name and value with the form, appears as `event.submitter`, and sets a dialog's `returnValue` when it submits a `<form method="dialog">` — as a native submit button does.
- 7e3368b: Add a selectable mode to `qds-chip` for filter chips: the chip becomes a toggle button with `aria-pressed`, shows a check mark while `selected`, fires `qds-change`, and supports `disabled`. Styled by new `chip.selectable` and `chip.selected` tokens.
- 822aa9e: Add three semantic roles and status border colors.

  - `error` is a status role alongside `info`, `success`, and `warning`: `color.background.error` (a tint), `color.content.error`, and `color.border.error`. `danger` stays the action role for destructive buttons.
  - `color.border.control` is the boundary of an interactive control and reaches 3:1 against the page. Inputs, text fields, unchecked checkboxes and radios, and the off toggle track use it.
  - `color.background.raised` is the surface of something elevated. It lightens in dark mode, where a shadow cannot be seen; elevated cards and the modal use it.
  - `color.border.info`, `success`, `warning`, and `error` reach 3:1 against the page, and also color progress bar fills — so the warning bar is amber rather than brown.

  **Breaking:** the `danger` variant of `qds-chip` and `qds-progress-bar` is renamed `error`, since both show a status rather than a destructive action. The error chip is now tinted like the other statuses instead of outlined.

### Patch Changes

- Updated dependencies [35c897a]
- Updated dependencies [99ce48f]
- Updated dependencies [db92c5e]
- Updated dependencies [b7d1206]
- Updated dependencies [ad84c23]
- Updated dependencies [a8ac72b]
- Updated dependencies [6cb64b1]
- Updated dependencies [ae223c6]
- Updated dependencies [afc271a]
- Updated dependencies [06555a5]
- Updated dependencies [cc1def3]
- Updated dependencies [7e3368b]
- Updated dependencies [5027635]
- Updated dependencies [f99af90]
- Updated dependencies [6c5499c]
- Updated dependencies [822aa9e]
  - @quieto/design-tokens@0.2.0
