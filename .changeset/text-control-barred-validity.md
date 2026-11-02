---
'@quieto/ui': patch
---

Fix `qds-input` and `qds-text-field` throwing when disabled or read-only while holding a value that would be invalid, such as a disabled email field with a malformed address. A control that is not being validated now reports itself valid, as a native input would.
