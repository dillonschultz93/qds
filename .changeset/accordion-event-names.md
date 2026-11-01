---
'@quieto/ui': patch
---

List `qds-accordion-item`'s `qds-open` and `qds-close` events by name in `custom-elements.json`. They were recorded as a single unnamed event, because the event name was computed; editors and docs reading the manifest showed a blank entry.
