---
'@quieto/design-tokens': minor
---

Add `color.content.inverse` for content on a filled surface: button labels on primary and danger buttons, checkbox check marks, radio dots, and toggle thumbs. It is light in light mode and dark in dark mode. Previously these used `neutral.50` in both modes, which fell to 3.5:1 on the lighter filled colors of dark mode; they now reach at least 4.6:1 in both modes.
