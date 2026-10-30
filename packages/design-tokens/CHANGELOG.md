# @quieto/design-tokens

## 0.2.0

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
- 7e3368b: Add a selectable mode to `qds-chip` for filter chips: the chip becomes a toggle button with `aria-pressed`, shows a check mark while `selected`, fires `qds-change`, and supports `disabled`. Styled by new `chip.selectable` and `chip.selected` tokens.
- 5027635: Add `color.black.5` through `color.black.60`, black at those opacity percentages, and use them for `elevation.subtle` and `elevation.default` in both modes. Shadows are now translucent rather than solid gray, so they soften in light mode and stay visible in dark mode.
- f99af90: Add `size` and `opacity` primitive categories: `size.sm` through `size.xl` for container widths, which outgrow the spacing scale, and `opacity.0` through `opacity.100`. The modal's widths and backdrop opacity now reference them instead of holding raw values.
- 6c5499c: Add `color.content.inverse` for content on a filled surface: button labels on primary and danger buttons, checkbox check marks, radio dots, and toggle thumbs. It is light in light mode and dark in dark mode. Previously these used `neutral.50` in both modes, which fell to 3.5:1 on the lighter filled colors of dark mode; they now reach at least 4.6:1 in both modes.
- 822aa9e: Add three semantic roles and status border colors.

  - `error` is a status role alongside `info`, `success`, and `warning`: `color.background.error` (a tint), `color.content.error`, and `color.border.error`. `danger` stays the action role for destructive buttons.
  - `color.border.control` is the boundary of an interactive control and reaches 3:1 against the page. Inputs, text fields, unchecked checkboxes and radios, and the off toggle track use it.
  - `color.background.raised` is the surface of something elevated. It lightens in dark mode, where a shadow cannot be seen; elevated cards and the modal use it.
  - `color.border.info`, `success`, `warning`, and `error` reach 3:1 against the page, and also color progress bar fills — so the warning bar is amber rather than brown.

  **Breaking:** the `danger` variant of `qds-chip` and `qds-progress-bar` is renamed `error`, since both show a status rather than a destructive action. The error chip is now tinted like the other statuses instead of outlined.

## 0.1.0

### Minor Changes

- First publishable release.

  - Ships no runtime dependencies. Style Dictionary and the Tokens Studio transforms were declared as dependencies, so installing the package pulled in 114 packages; they are build tools and now install only for development.
  - `require()` works on Node versions that support requiring ES modules, via a `default` export condition.
  - TypeScript types resolve with `moduleResolution: "node"` as well as `bundler` and `node16`.
  - `@quieto/design-tokens/nomenclature` now has type declarations.
  - Removed the `engines` constraint; the published files do not need Node 22.
  - Added a README covering setup, light and dark mode, and which tier to use.
