# @quieto/design-tokens

Design tokens for the Quieto Design System, shipped as CSS custom properties and a typed
JavaScript manifest. Light and dark modes are included.

```bash
npm install @quieto/design-tokens
```

## Use the CSS

Load the stylesheet **once**, at the top of your app:

```js
// From JavaScript, in any bundler (Vite, webpack, Next.js, …)
import '@quieto/design-tokens/css';
```

```css
/* Or from a stylesheet, if your bundler resolves @import from node_modules */
@import '@quieto/design-tokens/css';
```

Then use the variables:

```css
.card {
  color: var(--qds-semantic-color-content-default);
  background: var(--qds-semantic-color-background-subtle);
  border-radius: var(--qds-semantic-radius-primary);
  padding: var(--qds-spacing-400);
  box-shadow: var(--qds-semantic-elevation-default);
}
```

Custom properties inherit, including into shadow DOM, so one stylesheet on the document styles
everything below it.

## Light and dark mode

`@quieto/design-tokens/css` contains both modes. With no attribute set, it follows the operating
system's `prefers-color-scheme`. Set `data-theme` on `<html>` to override it:

| Markup | Result |
| --- | --- |
| `<html>` | Follows the OS setting |
| `<html data-theme="dark">` | Dark, whatever the OS says |
| `<html data-theme="light">` | Light, whatever the OS says |

> **Set `data-theme` on `<html>` only.** A nested element such as `<section data-theme="dark">`
> gets dark *semantic* tokens but light *component* tokens, so its components render in the wrong
> mode. Component tokens reference semantic tokens, and a reference is resolved on the element
> where the variable is declared — `:root` — not where it is used. Scoped theming for a section of
> a page is not supported yet.

If your product ships only one mode, import that file instead. Each one is complete on its own:

```js
import '@quieto/design-tokens/css/light';
// or
import '@quieto/design-tokens/css/dark';
```

## Which tokens to use

Every variable belongs to one of three tiers, and each tier references only the tier below it.

| Tier | Example | Use it for |
| --- | --- | --- |
| Primitive | `--qds-color-blue-600` | Raw values. Rarely used directly — they do not change with the theme. |
| Semantic | `--qds-semantic-color-background-primary-rest` | **Product code.** These carry meaning and switch with the theme. |
| Component | `--qds-component-button-primary-color-background-rest` | Restyling a QDS component. Override the variable instead of writing new CSS. |

Reach for a **semantic** token first. A primitive like `--qds-color-blue-600` stays blue in dark
mode; `--qds-semantic-color-background-primary-rest` switches correctly.

Names follow a grammar — `{prefix}-{tier}-{category}-{property}-{role}-{state}` for semantic
tokens — which is checked at build time. The full specification, with every allowed category,
role and state, is in
[`docs/nomenclature.md`](https://github.com/dillonschultz93/qds/blob/main/packages/design-tokens/docs/nomenclature.md).

## Use the tokens from JavaScript

```js
import { tokens, byName, cssVar } from '@quieto/design-tokens';

const primary = byName['qds-semantic-color-background-primary-rest'];
primary.modes.light; // '#2563eb'
primary.modes.dark; // '#3b82f6'
primary.referenceNames.light; // ['qds-color-blue-600']

cssVar(primary.name); // 'var(--qds-semantic-color-background-primary-rest)'
```

Each token has `name`, `path`, `type`, `tier`, `set`, `description`, its resolved value in each
mode (`modes`), what it references (`references`, `referenceNames`), and `modeInvariant`. Types
are included.

The manifest is a single 294 kB module, and importing anything from it includes all of it. If you
only need the CSS variables, you don't need to import JavaScript at all.

## Everything the package exports

| Import | Contents |
| --- | --- |
| `@quieto/design-tokens` | Typed token manifest: `tokens`, `byName`, `cssVar` |
| `@quieto/design-tokens/css` | All tokens, light and dark |
| `@quieto/design-tokens/css/light` | All tokens, light only |
| `@quieto/design-tokens/css/dark` | All tokens, dark only |
| `@quieto/design-tokens/nomenclature` | The naming grammar's vocabularies, as data |
| `@quieto/design-tokens/tokens.json` | The Tokens Studio source file. References are **unresolved** (`{color.blue.600}`); for tooling, not runtime use. |

## Fonts are not included

The type tokens name these families but do not load them:

- `--qds-typography-font-family-sans`: Inter, then `system-ui`
- `--qds-typography-font-family-mono`: JetBrains Mono, then `ui-monospace`

Load Inter and JetBrains Mono yourself, or accept the system fallbacks.

## Compatibility

- **Modules:** ES modules. `require()` also works on Node versions that can require ES modules
  (20.19 and later, 22.12 and later).
- **TypeScript:** types resolve with `moduleResolution` set to `bundler`, `node16`, or `node`.
- **No runtime dependencies.**

## Versioning

This package is pre-1.0, so **token names can change in any minor release.** On `0.x`, npm's
caret range does not cross a minor version: `^0.1.0` installs `0.1.x` but never `0.2.0`, so a
rename will not reach you without an explicit upgrade. The
[changelog](https://github.com/dillonschultz93/qds/blob/main/packages/design-tokens/CHANGELOG.md)
lists every rename.

## License

MIT
