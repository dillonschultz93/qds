# QDS — Quieto Design System

A design system in three parts: design tokens, web components, and documentation.

| Package | What it is | Published |
| --- | --- | --- |
| [`packages/design-tokens`](packages/design-tokens) | `@quieto/design-tokens` — three-tier DTCG tokens, Style Dictionary build, Token Studio sync | yes |
| [`packages/ui`](packages/ui) | `@quieto/ui` — Lit web components styled entirely by those tokens | yes |
| [`apps/docs`](apps/docs) | Eleventy documentation site | no |

```bash
pnpm install
pnpm build          # tokens → ui → docs, ordered by Turborepo
pnpm test
pnpm --filter docs dev    # http://localhost:8080
```

## How it fits together

Tokens are authored as DTCG JSON in
[`packages/design-tokens/tokens.json`](packages/design-tokens/tokens.json), in
**Tokens Studio's single-file format** — each token set is a top-level key. The
Figma plugin syncs that file directly from Git, bidirectionally, so there is no
export step and designer edits arrive as pull requests. Style Dictionary's job is
narrower than usual: it builds the CSS custom properties and a typed JS manifest.

Single-file rather than the folder layout because multi-file sync requires a Tokens
Studio Pro licence.

Three tiers, each referencing only the one beneath it:

```
--qds-component-button-primary-color-background-rest: var(--qds-semantic-color-background-primary-rest);
--qds-semantic-color-background-primary-rest:         var(--qds-color-blue-600);
--qds-color-blue-600:                                 #2563eb;
```

That structure survives into the shipped CSS rather than being flattened, which is
what makes one stylesheet themeable: dark mode redeclares only the middle line —
56 of 261 variables — and everything downstream follows.

Because a component's own `--qds-component-*` variables are both its token
definitions and its public styling API, restyling a component means overriding the
same variable the token source defines.

## The naming grammar is enforced, not just documented

[`packages/design-tokens/docs/nomenclature.md`](packages/design-tokens/docs/nomenclature.md)
is the normative spec. Its controlled vocabularies live as data in
[`nomenclature.js`](packages/design-tokens/nomenclature.js), which three consumers
read:

- [`validate.js`](packages/design-tokens/validate.js) rejects violations before the build
- [`transforms/name-qds.js`](packages/design-tokens/transforms/name-qds.js) builds CSS variable names from the grammar
- the docs site renders the reference tables and anatomy diagrams

So the documentation cannot describe a rule the build does not apply. `validate`
gates `build` in `turbo.json`, which matters most for tokens arriving from Figma: a
role invented in the plugin fails CI with the allowed values named.

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
never versioned.

## Figma setup (one-time)

In Tokens Studio: **Settings → Sync → GitHub**, repo `dillonschultz93/qds`, file
path `packages/design-tokens/tokens.json`, **Single file** mode, format
**W3C DTCG**.

The GitHub token needs write access to push back: a classic PAT needs `repo`
scope, a fine-grained one needs **Contents: Read and write**.

## License

MIT
