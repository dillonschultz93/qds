# @quieto/ui

Web components for the Quieto Design System, built with [Lit](https://lit.dev) and styled entirely
by [`@quieto/design-tokens`](https://www.npmjs.com/package/@quieto/design-tokens). They work in any
framework, or none.

```bash
npm install @quieto/ui
```

## Set up

Load the design tokens **once**, at the top of your app, then register the components:

```js
import '@quieto/design-tokens/css';
import '@quieto/ui';
```

```html
<qds-button variant="primary">Save</qds-button>
```

Without the token stylesheet the components still render, from fallback values built into each
one, but nothing follows your theme and dark mode does nothing. `@quieto/design-tokens` is
installed with this package, so there is nothing else to add.

Importing `@quieto/ui` registers every element. To register only what you use, import components
one at a time instead:

```js
import '@quieto/ui/qds-button.js';
import '@quieto/ui/qds-text-field.js';
```

## Components

| Element | What it is |
| --- | --- |
| `qds-accordion`, `qds-accordion-item` | Collapsible sections. Optionally `exclusive`, so only one is open. |
| `qds-alert` | An inline info, success, warning, or error message. Optionally dismissible. |
| `qds-avatar` | A person's image, with their initials as the fallback. |
| `qds-breadcrumbs`, `qds-breadcrumb-item` | The trail of pages above the current one. |
| `qds-button` | A button: four variants, three sizes, a loading state. Submits forms. |
| `qds-card` | A container with media, header, body, and footer regions. |
| `qds-checkbox` | A checkbox, including the indeterminate state. |
| `qds-checkbox-group` | A labelled set of checkboxes, with a hint and "choose at least one". |
| `qds-chip` | A compact status or category label. Removable, or `selectable` as a filter chip. |
| `qds-icon` | An icon from Lucide's set, sized by tokens. Decorative unless given a `label`. |
| `qds-input` | A bare single-line text input, named by its `label` attribute. |
| `qds-menu`, `qds-menu-item` | A menu of actions opened by a button, with full keyboard support. |
| `qds-modal` | A modal dialog, built on the native `<dialog>`. With `placement`, a drawer against an edge. |
| `qds-pagination` | Page links or buttons, with the gaps collapsed. |
| `qds-progress-bar` | Determinate or indeterminate progress. |
| `qds-radio-group`, `qds-radio` | A set of options of which one is chosen. |
| `qds-select` | A native select with a label, hint, and error message. |
| `qds-spinner` | A loading indicator for a wait with no measurable progress. |
| `qds-stack` | Lays its children out with gaps from the spacing scale. |
| `qds-tabs`, `qds-tab`, `qds-tab-panel` | Tabs, each showing one panel. |
| `qds-text-field` | A complete text field: visible label, input, hint, and error message. With `multiline`, a textarea. |
| `qds-toast` | A temporary message in the corner of the screen, announced without moving focus. |
| `qds-toggle` | An on/off switch, for settings that apply immediately. |
| `qds-tooltip` | A short label on hover and focus, such as an icon-only button's name. |

Every property, attribute, slot, event, CSS part, and CSS custom property is documented in
`custom-elements.json`, a
[Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) that ships
in this package. Editors and tools that read the format use it for autocomplete.

## Forms

The form controls — `qds-checkbox`, `qds-checkbox-group`, `qds-radio-group`, `qds-select`,
`qds-toggle`, `qds-input`, `qds-text-field`, and a `qds-button` with `type="submit"` or `"reset"` —
take part in a surrounding
`<form>` like native controls do, even though their inputs are inside shadow DOM:

- they submit their value under their `name`
- `required`, and the input types' own rules such as `type="email"`, block submission
- `form.reset()` restores the value the markup declared
- a `<fieldset disabled>` disables them

```html
<form>
  <qds-text-field label="Email" name="email" type="email" required></qds-text-field>
  <qds-checkbox name="updates" value="yes">Send me updates</qds-checkbox>
  <qds-button type="submit">Sign up</qds-button>
</form>
```

## Functions

Besides the elements, the package exports three functions:

- **`toast(message, options)`** shows a `qds-toast` from code: `toast('Saved.', { variant: 'success' })`.
- **`announce(message, politeness)`** has screen readers read a message aloud without moving focus,
  through the same live regions the components use, so nothing is announced twice.
- **`registerIcons(icons)`** adds Lucide icons for `qds-icon`, beyond the built-in set:
  `registerIcons({ trash: Trash2 })`, with `Trash2` imported from `lucide`.

## Events

Components fire events prefixed with `qds-`, such as `qds-change` and `qds-close`. They bubble
and cross shadow boundaries, so a listener anywhere above the component hears them. `qds-change`
and `qds-input` fire only for what the user does, not for values your own code sets.

```js
document.querySelector('qds-toggle').addEventListener('qds-change', (event) => {
  console.log(event.detail.checked);
});
```

## Restyling

Each component reads its styles from its own component tokens, the
`--qds-component-{name}-*` variables in `@quieto/design-tokens`. Overriding one of those variables is
the supported way to restyle a component, and it applies wherever you set it:

```css
qds-button.brand {
  --qds-component-button-primary-color-background-rest: var(--qds-color-purple-600);
  --qds-component-button-border-radius: var(--qds-border-radius-full);
}
```

For anything the tokens do not cover, components expose CSS parts:
`qds-button::part(button) { … }`.

## Accessibility

Each component follows the matching ARIA pattern: keyboard support, focus management, and the
right roles and states. A few things are still up to you:

- **Name the controls that have no visible label.** `qds-input` and `qds-progress-bar` take a
  `label` attribute, and an icon-only `qds-button` takes `label` too.
- **Group filter chips.** Wrap a set of `selectable` chips in an element with `role="group"` and an
  `aria-label`, so they are announced together.
- **Choose heading levels.** Set `heading-level` on `qds-accordion-item` to fit the outline of your
  page.

## Server rendering

The components can be server-rendered with
[`@lit-labs/ssr`](https://www.npmjs.com/package/@lit-labs/ssr) into declarative shadow DOM, so they
appear styled before any JavaScript runs. Load
`@lit-labs/ssr-client/lit-element-hydrate-support.js` before `@quieto/ui` on the client, or every
component renders twice.

## Compatibility

- **Browsers:** current versions of Chrome, Edge, Firefox, and Safari. Form participation relies
  on form-associated custom elements: Safari 16.4 and later, Firefox 98 and later.
- **Modules:** ES modules, unbundled, with bare imports of `lit`. Use a bundler, or an import map.
- **TypeScript:** types are included, and `HTMLElementTagNameMap` knows every element, so
  `document.querySelector('qds-modal')` is typed.

## Versioning

This package follows [semantic versioning](https://semver.org). Its public API is everything in
`custom-elements.json` — element names, attributes and properties, events and their `detail`, slots,
CSS parts, and the component tokens each element reads — and the exported functions and types.
Removing or renaming any of these waits for a major version; new components, attributes, and slots
arrive in minor versions. A component's shadow DOM, beyond its parts, is not public and can change
in any release. The
[changelog](https://github.com/dillonschultz93/qds/blob/main/packages/ui/CHANGELOG.md) lists every
change.

## License

MIT
