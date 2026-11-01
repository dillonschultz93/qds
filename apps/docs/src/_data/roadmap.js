/**
 * The component roadmap.
 *
 * Planned components are written here by hand; whether a component has SHIPPED is
 * not. A component counts as shipped when every element it lists is in the custom
 * elements manifest, so a planned entry moves to the shipped table by itself the
 * build after its elements land, and the page cannot claim a component exists
 * when it does not.
 *
 * A component is a family of elements that ship together: qds-tabs, qds-tab, and
 * qds-tab-panel are one component. The budget counts components, not elements.
 */

import loadComponents from './components.js';

/** The library stays slim: at most this many components. */
const BUDGET = 30;

/**
 * Every component, shipped or planned. `since` is the @quieto/ui version a
 * component first shipped in, and `what` a one-line description for the
 * roadmap — the manifest's own descriptions open with API detail, not a
 * summary. `tier` and `why` are for planned components, and stay as a record
 * once they ship.
 */
const COMPONENTS = [
  // ── Shipped ────────────────────────────────────────────────────────────────
  { name: 'Accordion', elements: ['qds-accordion', 'qds-accordion-item'], since: '0.1.0',
    what: 'Collapsible sections, optionally exclusive so only one is open.' },
  { name: 'Button', elements: ['qds-button'], since: '0.1.0',
    what: 'A button: four variants, three sizes, and a loading state. Submits forms.' },
  { name: 'Card', elements: ['qds-card'], since: '0.1.0',
    what: 'A container with media, header, body, and footer regions.' },
  { name: 'Checkbox', elements: ['qds-checkbox'], since: '0.1.0',
    what: 'A checkbox, including the indeterminate state.' },
  { name: 'Chip', elements: ['qds-chip'], since: '0.1.0',
    what: 'A compact status or category label. Removable, or selectable as a filter chip.' },
  { name: 'Input', elements: ['qds-input'], since: '0.1.0',
    what: 'A bare single-line text input, named by its label attribute.' },
  { name: 'Modal', elements: ['qds-modal'], since: '0.1.0',
    what: 'A modal dialog, built on the native dialog element.' },
  { name: 'Progress bar', elements: ['qds-progress-bar'], since: '0.1.0',
    what: 'Determinate or indeterminate progress.' },
  { name: 'Radio group', elements: ['qds-radio-group', 'qds-radio'], since: '0.1.0',
    what: 'A set of options of which one is chosen.' },
  { name: 'Stack', elements: ['qds-stack'], since: '0.1.0',
    what: 'Lays its children out with gaps from the spacing scale.' },
  { name: 'Tabs', elements: ['qds-tabs', 'qds-tab', 'qds-tab-panel'], since: '0.1.0',
    what: 'Tabs, each showing one panel.' },
  { name: 'Text field', elements: ['qds-text-field'], since: '0.1.0',
    what: 'A complete text field: visible label, input, hint, and error message.' },
  { name: 'Toggle', elements: ['qds-toggle'], since: '0.1.0',
    what: 'An on/off switch, for settings that apply immediately.' },

  // ── Tier 1: gaps that block ordinary product screens ───────────────────────
  {
    name: 'Icon',
    elements: ['qds-icon'],
    tier: 1,
    why: 'Every icon in the library today is a typed character (+, →, ✓). Buttons, chips, inputs, alerts, and menus all need real icons, so this comes first.',
    needs: ['A choice of icon set', 'Icon size tokens'],
  },
  {
    name: 'Select',
    elements: ['qds-select'],
    tier: 1,
    why: 'The most common form control still missing. Wraps the native select, keeping its accessibility and the mobile pickers.',
    needs: [],
  },
  {
    name: 'Alert',
    elements: ['qds-alert'],
    tier: 1,
    why: 'Inline info, success, warning, and error messages: a form-level error, a "saved" notice. The status roles, error included, exist for exactly this.',
    needs: ['Announcements to assistive technology'],
  },
  {
    name: 'Tooltip',
    elements: ['qds-tooltip'],
    tier: 1,
    why: 'An icon-only button needs a visible label on hover and focus, not just an accessible name.',
    needs: ['Floating panels', 'An inverse background role'],
  },
  {
    name: 'Menu',
    elements: ['qds-menu', 'qds-menu-item'],
    tier: 1,
    why: 'Action menus: the "More ⋯" button. Shares the floating-panel foundation with Tooltip, so the two are cheaper built together.',
    needs: ['Floating panels'],
  },

  // ── Tier 2: common, and cheap once Tier 1 exists ───────────────────────────
  {
    name: 'Toast',
    elements: ['qds-toast'],
    tier: 2,
    why: 'Short-lived confirmations ("Saved", "Copied") that screen readers announce without moving focus.',
    needs: ['Announcements to assistive technology'],
  },
  {
    name: 'Checkbox group',
    elements: ['qds-checkbox-group'],
    tier: 2,
    why: 'Radios have a group with a label and required; checkboxes do not. A set of checkboxes has no group label, no "pick at least one", and no group error.',
    needs: [],
  },
  {
    name: 'Spinner',
    elements: ['qds-spinner'],
    tier: 2,
    why: 'A standalone loading indicator. The button already draws one inside itself, so this mostly lifts it out.',
    needs: [],
  },
  {
    name: 'Avatar',
    elements: ['qds-avatar'],
    tier: 2,
    why: 'A person’s image with an initials fallback. Common in nearly every app.',
    needs: [],
  },
  {
    name: 'Breadcrumbs',
    elements: ['qds-breadcrumbs'],
    tier: 2,
    why: 'Navigation through a hierarchy. Small, with a well-defined accessible pattern.',
    needs: [],
  },
  {
    name: 'Pagination',
    elements: ['qds-pagination'],
    tier: 2,
    why: 'Moving through long lists and tables.',
    needs: [],
  },
];

const TIERS = [
  { tier: 1, title: 'Tier 1', summary: 'Gaps that block ordinary product screens. Build these first.' },
  { tier: 2, title: 'Tier 2', summary: 'Common, and cheap once Tier 1 exists.' },
];

/** Needs better met by an option on a component that exists, so they cost no budget. */
const VARIANTS = [
  {
    name: 'Textarea',
    as: 'multiline on qds-text-field',
    why: 'It needs the same label, hint, and error as a text field, and can share the form logic the input and text field already share.',
  },
  {
    name: 'Drawer',
    as: 'placement on qds-modal',
    why: 'A side sheet is the same modal dialog — inert page, focus handling, Escape — in a different position.',
  },
];

/** Left out on purpose, and why. */
const OUT_OF_SCOPE = [
  {
    name: 'Link, divider, headings, text',
    why: 'Plain HTML styled with the token CSS. A web component adds nothing here, and a link inside a shadow root makes things worse.',
  },
  {
    name: 'Badge',
    why: 'The chip covers status labels. A notification count is a few lines of CSS until there is a real need for more.',
  },
  {
    name: 'Data table',
    why: 'Token-styled native tables first. A full data grid is a product of its own.',
  },
  {
    name: 'Date picker',
    why: 'The native date input, through qds-input, until there is a strong need. A custom date picker is expensive to make accessible.',
  },
];

/** Candidates for the remaining budget, added only when a real need appears. */
const HEADROOM = [
  { name: 'Combobox', note: 'The hardest pattern on the list. After Select and Menu.' },
  { name: 'Popover', note: 'Nearly free once the floating-panel foundation exists.' },
  { name: 'Skeleton', note: 'Placeholder shapes while content loads.' },
  { name: 'Slider', note: 'A range input.' },
  { name: 'File upload', note: 'Picking and dropping files.' },
  { name: 'Segmented control', note: 'A compact set of mutually exclusive options.' },
];

/** Foundations several planned components share, worth building once. */
const INFRASTRUCTURE = [
  {
    name: 'Floating panels',
    for: ['Tooltip', 'Menu', 'Combobox', 'Popover'],
    note: 'Positioned panels that sit above the page. The real cost of Tier 1. Built on the browser’s native popover support, with a fallback where it cannot yet position them.',
  },
  {
    name: 'Announcements to assistive technology',
    for: ['Alert', 'Toast'],
    note: 'One shared way to announce a message, so the two do not compete or double-announce.',
  },
  {
    name: 'New tokens',
    for: ['Tooltip', 'Icon'],
    note: 'An inverse background role for dark tooltip surfaces (the inverse role covers only text today), and icon size tokens.',
  },
];

export default async function () {
  const shippedTags = new Map((await loadComponents()).map((component) => [component.tagName, component]));

  const components = COMPONENTS.map((component) => {
    const shipped = component.elements.every((tag) => shippedTags.has(tag));
    const primary = shippedTags.get(component.elements[0]);
    return {
      ...component,
      shipped,
      // Falls back to the manifest's first sentence for a component that shipped
      // from the planned list without a `what` written for it.
      summary: component.what ?? (primary ? primary.summary.split(/(?<=\.)\s/)[0] : ''),
    };
  });

  const shipped = components.filter((component) => component.shipped);
  const planned = components.filter((component) => !component.shipped);

  // Shipped elements the roadmap does not know about, so a new component cannot
  // be added without the roadmap (and the budget) accounting for it.
  const listed = new Set(COMPONENTS.flatMap((component) => component.elements));
  const unlisted = [...shippedTags.keys()].filter((tag) => !listed.has(tag));

  return {
    budget: BUDGET,
    total: components.length,
    remaining: BUDGET - components.length,
    shipped,
    tiers: TIERS.map((tier) => ({
      ...tier,
      components: planned.filter((component) => component.tier === tier.tier),
    })),
    variants: VARIANTS,
    outOfScope: OUT_OF_SCOPE,
    headroom: HEADROOM,
    infrastructure: INFRASTRUCTURE,
    unlisted,
  };
}
