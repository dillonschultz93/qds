---
'@quieto/design-tokens': minor
'@quieto/ui': minor
---

Add three semantic roles and status border colors.

- `error` is a status role alongside `info`, `success`, and `warning`: `color.background.error` (a tint), `color.content.error`, and `color.border.error`. `danger` stays the action role for destructive buttons.
- `color.border.control` is the boundary of an interactive control and reaches 3:1 against the page. Inputs, text fields, unchecked checkboxes and radios, and the off toggle track use it.
- `color.background.raised` is the surface of something elevated. It lightens in dark mode, where a shadow cannot be seen; elevated cards and the modal use it.
- `color.border.info`, `success`, `warning`, and `error` reach 3:1 against the page, and also color progress bar fills — so the warning bar is amber rather than brown.

**Breaking:** the `danger` variant of `qds-chip` and `qds-progress-bar` is renamed `error`, since both show a status rather than a destructive action. The error chip is now tinted like the other statuses instead of outlined.
