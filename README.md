# QDS — Quieto Design System

A design system in three parts: design tokens, web components, and documentation.

- **Docs:** [quieto.dev](https://quieto.dev)
- **Figma:** [Quieto Tokens](https://www.figma.com/community/file/1699544445824217443/quieto-tokens)
  and [Quieto Components](https://www.figma.com/community/file/1699543134216117599/quieto-components)
  on [Figma Community](https://www.figma.com/@quieto)

| Package | What it is | Published |
| --- | --- | --- |
| [`packages/design-tokens`](packages/design-tokens) | `@quieto/design-tokens` — three-tier DTCG tokens, Style Dictionary build, one-way Figma sync | yes |
| [`packages/ui`](packages/ui) | `@quieto/ui` — 30 Lit web components styled entirely by those tokens | yes |
| [`apps/docs`](apps/docs) | Eleventy documentation site, deployed to [quieto.dev](https://quieto.dev) | yes |

```bash
pnpm install
pnpm build          # tokens → ui → docs, ordered by Turborepo
pnpm test
pnpm --filter docs dev    # http://localhost:8080
```

## How it fits together

Tokens are authored as DTCG JSON in
[`packages/design-tokens/tokens.json`](packages/design-tokens/tokens.json), in
**Tokens Studio's single-file format** — each token set is a top-level key. That
file is the only source: Style Dictionary builds the CSS custom properties and a
typed JS manifest from it, and [`figma/build.js`](packages/design-tokens/figma)
pushes it into Figma variables and styles, one way. Token changes are made in code,
never in Figma.

Three tiers, each referencing only the one beneath it:

```
--qds-component-button-primary-color-background-rest: var(--qds-semantic-color-background-primary-rest);
--qds-semantic-color-background-primary-rest:         var(--qds-color-blue-600);
--qds-color-blue-600:                                 #2563eb;
```

That structure survives into the shipped CSS rather than being flattened, which is
what makes one stylesheet themeable: dark mode redeclares only the middle line —
44 of 770 variables — and everything downstream follows.

Because a component's own `--qds-component-*` variables are both its token
definitions and its public styling API, restyling a component means overriding the
same variable the token source defines.

## A fixed budget of components

The library holds at most 40 components: 30 have shipped, 7 more are planned,
and the last 3 are held open. Each one is something to keep accessible, documented,
and consistent, so before a component is added, the need is checked against an
option on one that exists (the textarea is `multiline` on `qds-text-field`; the
drawer is `placement` on `qds-modal`). The [roadmap](https://quieto.dev/roadmap/)
lists what shipped when, what is planned, and what is left out on purpose. It is built from
[`apps/docs/src/_data/roadmap.js`](apps/docs/src/_data/roadmap.js), and the docs
checks fail if a shipped element is missing from it or the budget is exceeded.

## The naming grammar is enforced, not just documented

[`packages/design-tokens/docs/nomenclature.md`](packages/design-tokens/docs/nomenclature.md)
is the normative spec. Its controlled vocabularies live as data in
[`nomenclature.js`](packages/design-tokens/nomenclature.js), which three consumers
read:

- [`validate.js`](packages/design-tokens/validate.js) rejects violations before the build
- [`transforms/name-qds.js`](packages/design-tokens/transforms/name-qds.js) builds CSS variable names from the grammar
- the docs site renders the reference tables and anatomy diagrams

So the documentation cannot describe a rule the build does not apply. `validate`
gates `build` in `turbo.json`, so a violation fails CI with the allowed values
named, before the token reaches the CSS or Figma.

It checks the grammar per tier, the reference direction (primitives raw, semantics
→ primitives, components → semantics or primitives), that light and dark define the
same keys, and that no node is both a token and a group.

## Testing

```bash
pnpm test                              # everything
pnpm --filter @quieto/design-tokens test   # grammar + transform, incl. adversarial cases
pnpm --filter @quieto/ui test              # real browsers via @web/test-runner
pnpm --filter docs verify                  # built site, in a browser
```

Component tests run in Chromium rather than jsdom: shadow DOM,
`adoptedStyleSheets`, `delegatesFocus`, and computed styles from inherited custom
properties are exactly what jsdom models poorly, and they are the substance of the
library.

`apps/docs/verify.mjs` exists because this stack's interesting failures are all
silent — a component that never upgrades, renders twice, or is tree-shaken out of
the bundle produces a page with no console error and passing DOM queries. A green
build proves nothing about any of them.

## Releasing

Versioning is handled by [Changesets](https://github.com/changesets/changesets).

```bash
pnpm changeset       # describe the change
```

Merging to `main` opens a "Version Packages" PR; merging that publishes
`@quieto/design-tokens` and `@quieto/ui`. The `docs` app is in `ignore` and is
never versioned; it deploys to [quieto.dev](https://quieto.dev) on Cloudflare
Workers (see [`apps/docs/wrangler.jsonc`](apps/docs/wrangler.jsonc)).

## Figma

`tokens.json` is synced into the Quieto Tokens file one way, code → Figma:

```bash
pnpm --filter @quieto/design-tokens figma:build
```

That generates Plugin API scripts, run in order through the Figma MCP server's
`use_figma` tool. They upsert Primitives, Semantic (Light and Dark modes), and
Component variable collections, plus text and elevation styles. Every step upserts
by name, so bindings survive a re-run. Details are in
[`packages/design-tokens/figma/README.md`](packages/design-tokens/figma/README.md).

The Quieto Components file draws every `@quieto/ui` component from the published
Quieto Tokens library, with one page per component: its states, usage notes, code
API, and component tokens. New component tokens reach it only after the Quieto
Tokens library is published.

## License

MIT
