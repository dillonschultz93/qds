# Figma sync

`tokens.json` → the [Quieto Tokens](https://www.figma.com/design/CispXY8pz2kfBjPWqsZ7qg/Quieto-Tokens)
Figma file, one way. Edit tokens here; never edit the variables in Figma, since the next sync
overwrites them.

```bash
pnpm --filter @quieto/design-tokens figma:build
```

That writes `dist/figma/NN-*.js` and `dist/figma/manifest.json`. Each script is self-contained
Plugin API code. Run them **in manifest order, one at a time**, through the Figma MCP server's
`use_figma` tool against the Tokens file. For example, ask Claude Code:

> Run each script in `packages/design-tokens/dist/figma/` in manifest order with `use_figma`
> on file `CispXY8pz2kfBjPWqsZ7qg`.

Every step upserts by name, so re-running after a change updates Figma in place. Variable IDs
are kept, and so is every binding on the canvas.

| Step | What it does |
| --- | --- |
| `variables-primitive` | `Primitives` collection, one mode (`Value`) |
| `variables-semantic` | `Semantic` collection, `Light` and `Dark` modes, aliasing primitives |
| `variables-component` | `Component` collection, aliasing Semantic and Primitives (may be split into several scripts to stay under `use_figma`'s 50 000-character limit) |
| `prune` | Deletes variables in those three collections that are no longer in `tokens.json` |
| `styles` | `typography/*` text styles and `elevation/*` effect styles, bound to the variables |

## How tokens map to Figma

- **Names** are token paths with `/`: `color/blue/400`, `color/background/primary/rest`,
  `button/primary/color/background/hover`.
- **Code syntax** (WEB) is the exact CSS variable `name/qds` emits, e.g.
  `var(--qds-semantic-color-background-primary-rest)`. `build.js` asserts this for every token.
- **Units:** `rem` × 16 → px; `ms` → seconds (Figma's timing type); cubic-bézier → Figma easing.
- **Scopes** come from the token type and path: backgrounds → fills, content → text and shape
  fills, borders → stroke color, spacing → gap/size, and so on. Primitive colors are hidden from
  pickers, so designers reach for semantic colors.
- **Line height and letter spacing** are unitless and `em` in code, but Figma reads a bound
  variable as pixels. Those variables are code-only (no scopes); the text styles carry them as
  percentages instead.
- **Typography composites** become text styles, with family, size and weight bound to variables.
- **Shadows** become effect styles with every field bound. The shadow color differs between
  Light and Dark, so each shadow has a Figma-only Semantic helper, `elevation/<name>/color`, with
  no CSS counterpart. Component `box-shadow` tokens all reference `elevation.*`, so components
  use the `elevation/*` styles directly.
