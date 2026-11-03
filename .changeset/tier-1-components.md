---
'@quieto/ui': minor
---

Add the Tier 1 components from the roadmap:

- `qds-icon`, drawing Lucide's icons, with a small built-in set and `registerIcons()` to add any other Lucide icon.
- `qds-select`, a native select with the label, hint, error, and validation of `qds-text-field`.
- `qds-alert`, an inline info, success, warning, or error message, optionally dismissible.
- `qds-tooltip`, a short label on hover and focus that names an icon-only button.
- `qds-menu` and `qds-menu-item`, an action menu following the WAI-ARIA menu button pattern.

Also adds `announce()`, the shared way components (and apps) have screen readers read a message aloud, and lets `qds-button` pass `aria-haspopup` and `aria-expanded` to its inner button.
