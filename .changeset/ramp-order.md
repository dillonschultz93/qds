---
'@quieto/design-tokens': patch
---

Sort the token manifest numerically, so each color ramp runs from 50 to 900 (and `black` from 5 to its darkest step) rather than placing 50 between 400 and 500. Only the order of the exported `tokens` array changes; no token's name or value does.
