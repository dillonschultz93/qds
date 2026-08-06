# Design Tokens

Design tokens are the platform-agnostic, named storage for visual design decisions (colors, spacing, typography) that represent data as key-value pairs (e.g., `color.primary = #007bff`). They act as a central, single source of truth, replacing hardcoded values to ensure consistency across multiple platforms, brands, or themes.

This document details the naming structure and algorithm for the design token system. The architecture follows a three-tiered token system.

> **This document is normative, and it is enforced.** The vocabularies below live in
> [`nomenclature.js`](../nomenclature.js) as data. [`validate.js`](../validate.js) checks every
> token against them before the build runs, and [`transforms/name-qds.js`](../transforms/name-qds.js)
> builds CSS variable names from the same source. A rule described here is a rule the build applies;
> if you change one, change it in `nomenclature.js` and update this prose in the same commit.
> See [How this is enforced](#how-this-is-enforced).

## Design Token Tiers

There are three tiers of design tokens:

1. Primitive Tokens
2. Semantic Tokens
3. Component Tokens

Each tier may only reference the tier beneath it. Primitives hold raw values, semantics alias
primitives, and component tokens alias semantics (or primitives where no semantic exists). This is
the tier contract, and `validate.js` enforces it in both directions.

### Primitive Tokens

Tier 1, or Primitive tokens, are Design Tokens that define the design system's core attributes serving as an obfuscation to raw values.

**Examples:**

- JSON: `color.blue.400`
- Figma: `color/blue/400`
- CSS: `--qds-color-blue-400`

#### Primitive Token Anatomy

![Primitive token anatomy: --qds-color-blue-400, broken into global prefix, category, sub-category, and value](anatomy/primitive.svg)

Using the example `--qds-color-blue-400` we will dissect the anatomy of a primitive token.

##### Global prefix

The global prefix is a developer only identifier and helps to let people know that this token originates from this particular design token system. It also helps prevent collisions with other tokens that aren't part of this particular token system. So, in the example above `--qds-...` is the global prefix.

##### Category

The category identifier signifies the type of design choice that the token is conveying. In this example above color value is being defined.

The available category types are:

- color
- typography
- spacing
- border
- shadow
- animation

##### Sub-category (if needed)

The sub-category identifier signifies any deeper design choices that need to be conveyed.

The available sub-category types are:

- color or hue name (i.e. "blue" or "green")
- font-size
- font-family
- font-weight
- font-style
- line-height
- text-transform
- letter-spacing
- radius
- width
- x
- y
- blur
- spread
- duration
- ease

Hue names are validated against a registered list (`primitive.hues`) rather than left open. An
unrecognized hue is far more often a typo than a deliberate addition, and registering a new one is a
one-line change.

##### Value

The value identifier serves as a way to identify a determined raw value. Using a ramp numbering system or t-shirt sizing is a common way to convey this.

Note that primitive tokens carry **no tier identifier** — unlike the two tiers below. Primitives are
the most-referenced tier, so they get the shortest names.

### Semantic Tokens

Tier 2, or Semantic tokens, are Design Tokens that take the Primitive tokens and applies them to high-level applications within the UI. Essentially, Primitive Tokens are assigned as the value of Semantic tokens.

**Examples:**

- JSON: `color.background.default.hover`
- Figma: `color/background/default/hover`
- CSS: `--qds-semantic-color-background-default-hover`

#### Semantic Token Anatomy

![Semantic token anatomy: --qds-semantic-color-background-default-hover, broken into global prefix, tier identifier, category, property, role, and state](anatomy/semantic.svg)

Using the example `--qds-semantic-color-background-default-hover` we will dissect the anatomy of a semantic token.

##### Global prefix

The global prefix is a developer only identifier and helps to let people know that this token originates from this particular design token system. It also helps prevent collisions with other tokens that aren't part of this particular token system.

##### Tier identifier

This is another developer only identifier and helps differentiate alias and component tokens from the primitive tokens. It also signifies to developers that these are the tokens that should be associated with the design system's component library.

Note that the tier identifier appears **only in the CSS variable name**, never in the JSON or Figma
path. It comes from the name of the token set the token is declared in, which is why generating these
names needs a custom Style Dictionary transform rather than the built-in `name/kebab`.

##### Category

The category identifier signifies the type of design choice that the token is conveying. In this example above color value is being defined.

The available category types are:

- color
- typography
- spacing
- border
- width
- radius
- elevation
- animation

This list intentionally differs from the primitive category list. Primitives describe raw values, so
radius and width nest under `border` (`border.radius.md`) and shadows decompose into parts
(`shadow.blur.200`). Semantics describe intent, so `radius`, `width`, and `elevation` are promoted to
top-level categories (`radius.default`, `elevation.raised`). The asymmetry is deliberate.

##### Property

The property identifier signifies what the category is being applied to. So, for the example above, color is being applied to the background property of a surface within the interface.

The available surfaces are:

- **content**: used exclusively for text and icon colors.
- **background**: used exclusively for background color.
- **border**: used exclusively for border and outline colors.

Because these three surfaces are specific to color, only `color` tokens use this slot. Other
categories address a single property implicitly and omit it: `radius.default`, not
`radius.corner.default`.

##### Role

The role identifier signifies which kind of interface element we are applying the category and property to. So, for the example above, a background color is being applied to a default surface of the interface.

The available roles are:

- default
- primary
- secondary
- info
- warning
- danger
- success
- subtle
- neutral
- headline
- display
- title
- body
- label
- meta
- data

##### State

The state identifier signifies how the token definition is going to be used. So, in this final example above, a background color is being applied to a default surface when that piece of interface is hovered.

The available states are:

- rest
- hover
- active
- focus
- disabled
- visited
- selected
- checked
- unchecked

###### Why `rest` exists

`rest` is an addition to the original state list, required by a structural constraint in DTCG: a node
cannot be both a token and a group. `color.background.primary` cannot carry a `$value` *and* contain
a `hover` child, so a role that has states cannot also hold the resting value at the role node.

`rest` gives the resting value an explicit state, which makes one rule cover every case:

> **A role node is either a token or a state group, never both.**

```
color.background.default          ← stateless role, a plain token
color.background.primary.rest     ← stateful role, every state explicit
color.background.primary.hover
color.background.primary.active
```

Without it, the alternative is duplicating the resting value under a second role name. `validate.js`
rejects a node that is both a token and a group, because DTCG parsers silently drop the nested
children rather than erroring — the states would simply vanish from the build.

### Component Tokens

Tier 3, or Component tokens are Design Tokens that target specific UI components or special use cases. Component tokens assign Semantic Tokens or Primitive Tokens as their value.

**Examples:**

- JSON: `button.primary.color.background.hover`
- Figma: `button/primary/color/background/hover`
- CSS: `--qds-component-button-primary-color-background-hover`

#### Component Token Anatomy

![Component token anatomy: --qds-component-button-primary-color-background-hover, broken into global prefix, tier identifier, component name, variant, property, and state](anatomy/component.svg)

Using the example `--qds-component-button-primary-color-background-hover` we will dissect the anatomy of a component token.

##### Global prefix

The global prefix is a developer only identifier and helps to let people know that this token originates from this particular design token system. It also helps prevent collisions with other tokens that aren't part of this particular token system.

##### Tier identifier

This is another developer only identifier and helps differentiate alias and component tokens from the primitive tokens. It also signifies to developers that these are the tokens that should be associated with the design system's component library.

##### Component name

The component name identifier signifies the name of the UI element that is being defined. If the component name is two or more words, then separate the name using dashes (ex: text-field).

##### Variant

The variant signifier defines the values to be applied to specific variants of a component.

- default (optional) is used exclusively to describe the common component application (e.g. button-default). This can either be explicitly defined or omitted if no variant infers default and that system is used across all tokens.
- Other values are dependent on the specific component API design (e.g. link-inverted, button-primary , etc).

There is exactly **one** variant slot, so a component with two independent variant axes uses it for
each separately rather than nesting them. `qds-button` has both appearance and size variants:

```
button.primary.color.background.rest   ← appearance axis
button.sm.padding-inline               ← size axis
```

`button.primary.sm.color.background.rest` is rejected: three segments before the property is
ambiguous to parse and outside the grammar.

##### Property

The property signifier describes the component property to be controlled:

- Can include token category (e.g. **color** or **border** ) if relevant.
- **color-content**: used exclusively for text and icon colors.
- **color-background**: used exclusively for background color.
- **color-border**: used exclusively for border and outline colors.
- Any design/CSS property (e.g. **box-shadow**, **width**, **height**, **padding**, etc) can be defined as a component-specific token.

CSS properties are validated against a registered list (`component.cssProperties`) so that typos are
caught. Extend that list freely as components need more.

##### State

The state identifier signifies how the token definition is going to be used. So, in this final example above, a background color is being applied to a default surface when that piece of interface is hovered.

The available states are the same as for semantic tokens, listed [above](#state).

## How this is enforced

Three files implement this document, all reading the same vocabularies:

| File | Role |
| --- | --- |
| [`nomenclature.js`](../nomenclature.js) | The controlled vocabularies as data. One source for all three consumers. |
| [`transforms/name-qds.js`](../transforms/name-qds.js) | Builds CSS variable names from the grammar, injecting the tier identifier. |
| [`validate.js`](../validate.js) | Rejects tokens that violate the grammar or the tier contract. |
| [`lib/source.js`](../lib/source.js) | Reads `tokens.json`, merges the sets, and stamps each token with the set it came from so the tier survives the merge. |

`validate.js` runs before `build` (wired in `turbo.json`), so a violation fails the build rather than
shipping. That matters most for tokens arriving *from* Figma: Tokens Studio syncs `tokens.json`
bidirectionally, so a role invented in the plugin lands here as a pull request, and CI is what
reports that it is not in the vocabulary.

Sets are validated **individually, before the merge.** The build merges them so cross-set references
resolve, but a merge also lets a later set silently mask an invalid token in an earlier one — so the
grammar is checked against the source as written.

What it checks:

1. **Grammar** — every segment against its tier's vocabulary, with the allowed values named in the error.
2. **Reference direction** — primitives hold raw values only; semantics alias primitives; components alias semantics or primitives. A semantic token holding a literal is rejected, since that is how one-off values bypass the palette.
3. **Theme completeness** — `semantic/light` and `semantic/dark` must define the same keys. A token present in one mode but not the other appears as an unstyled element in that mode only.
4. **Structure** — no node is both a token and a group; every set on disk is registered in `$metadata.json`, and vice versa.

The diagrams above are generated by [`anatomy/generate.js`](anatomy/generate.js) from
`nomenclature.js`, so the vocabulary counts they display cannot drift from the vocabularies enforced.

## Source layout

`tokens.json` is authored in Tokens Studio's **single-file** format, and the plugin syncs it directly
from Git — bidirectionally. There is no export step to Figma.

Each token set is a top-level key, alongside the plugin's own `$themes` and `$metadata`:

```jsonc
{
  "primitive/color":      { "color": { "blue": { "600": { "$value": "#2563eb", "$type": "color" } } } },
  "primitive/typography": { … },
  "primitive/spacing":    { … },
  "primitive/border":     { … },
  "primitive/shadow":     { … },
  "primitive/animation":  { … },

  "semantic/base":  { … },   // mode-invariant: typography, radius, border, animation
  "semantic/light": { … },   // colors and elevation
  "semantic/dark":  { … },   // colors and elevation

  "component/button": { … },

  "$themes":   [ /* Light and Dark, one "mode" group */ ],
  "$metadata": { "tokenSetOrder": [ /* resolution order */ ] }
}
```

Single-file rather than the folder layout because **multi-file sync requires a Tokens Studio Pro
licence.** The cost of that choice is paid in the build, not in the grammar: the sets have to be
merged into one tree before Style Dictionary can resolve a cross-set reference like
`{color.blue.600}`, and merging erases the only record of which tier a token belongs to. So
`lib/source.js` stamps each token with the set it came from as it merges, and
`transforms/name-qds.js` reads the tier from that stamp.

**The set name is where the tier comes from.** It must begin with `primitive`, `semantic`, or
`component`; the validator rejects a set that does not. Nothing else about the set name reaches the
token name.

Mode-invariant semantics live in `semantic/base` rather than being duplicated across `light` and
`dark`. Typography and radius do not change between modes, and duplicating them would mean every
edit had to be made twice — with the theme-completeness check enforcing the duplication rather than
preventing the drift.

The mode is expressed by the **CSS selector**, never by the token name. `semantic/light` and
`semantic/dark` produce identical variable names, emitted under `:root` and `[data-theme="dark"]`
respectively.

## Known gaps

Recorded here rather than worked around silently.

**No inverse/on-color role.** The role vocabulary has no way to name "content on a filled surface" —
white text on a primary button. Every role describes the element's own meaning, not its
relationship to what sits behind it. Component tokens currently reach past the semantic tier
straight to a primitive:

```jsonc
"button.primary.color.content.rest": "{color.neutral.50}"  // not a semantic token
```

That is legal under the tier contract, but it means a component hardcodes a palette step, so
changing it in dark mode requires editing the component tier. Adding an `on-primary`-style role — or
an `inverse` role — to the semantic vocabulary would close this. Worth deciding before the component
library grows past a handful of filled surfaces.

**Shadow color has no alpha.** `elevation.*` composes shadow primitives with a solid neutral, because
the palette has no translucent colors and DTCG has no alpha modifier without reaching for Token
Studio-specific syntax. The result reads acceptably but is less soft than a real alpha shadow. Adding
translucent neutral primitives would fix it.
