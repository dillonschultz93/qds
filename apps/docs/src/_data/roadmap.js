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

/**
 * The library stays slim: at most this many components. Raised from 30 to 40 in
 * 1.1.0, once the first 30 had shipped, for the app-structure gaps in Tiers 4 and 5.
 */
const BUDGET = 40;

/**
 * Every component, shipped or planned. `category` groups it in the docs'
 * component navigation.
 * `since` is the @quieto/ui version a
 * component first shipped in, and `what` a one-line description for the
 * roadmap — the manifest's own descriptions open with API detail, not a
 * summary. `tier` and `why` are for planned components, and stay as a record
 * once they ship.
 */
const COMPONENTS = [
  // ── Shipped ────────────────────────────────────────────────────────────────
  { name: 'Accordion', category: 'Containment', elements: ['qds-accordion', 'qds-accordion-item'], since: '0.1.0',
    what: 'Collapsible sections, optionally exclusive so only one is open.' },
  { name: 'Button', category: 'Actions', elements: ['qds-button'], since: '0.1.0',
    what: 'A button: four variants, three sizes, and a loading state. Submits forms.' },
  { name: 'Card', category: 'Containment', elements: ['qds-card'], since: '0.1.0',
    what: 'A container with media, header, body, and footer regions.' },
  { name: 'Checkbox', category: 'Inputs', elements: ['qds-checkbox'], since: '0.1.0',
    what: 'A checkbox, including the indeterminate state.' },
  { name: 'Chip', category: 'Actions', elements: ['qds-chip'], since: '0.1.0',
    what: 'A compact status or category label. Removable, or selectable as a filter chip.' },
  { name: 'Input', category: 'Inputs', elements: ['qds-input'], since: '0.1.0',
    what: 'A bare single-line text input, named by its label attribute.' },
  { name: 'Modal', category: 'Containment', elements: ['qds-modal'], since: '0.1.0',
    what: 'A modal dialog, built on the native dialog element.' },
  { name: 'Progress bar', category: 'Feedback', elements: ['qds-progress-bar'], since: '0.1.0',
    what: 'Determinate or indeterminate progress.' },
  { name: 'Radio group', category: 'Inputs', elements: ['qds-radio-group', 'qds-radio'], since: '0.1.0',
    what: 'A set of options of which one is chosen.' },
  { name: 'Stack', category: 'Layout', elements: ['qds-stack'], since: '0.1.0',
    what: 'Lays its children out with gaps from the spacing scale.' },
  { name: 'Tabs', category: 'Navigation', elements: ['qds-tabs', 'qds-tab', 'qds-tab-panel'], since: '0.1.0',
    what: 'Tabs, each showing one panel.' },
  { name: 'Text field', category: 'Inputs', elements: ['qds-text-field'], since: '0.1.0',
    what: 'A complete text field: visible label, input, hint, and error message.' },
  { name: 'Toggle', category: 'Inputs', elements: ['qds-toggle'], since: '0.1.0',
    what: 'An on/off switch, for settings that apply immediately.' },

  // ── Shipped from Tier 1: gaps that blocked ordinary product screens ───────
  {
    name: 'Icon', category: 'Display',
    elements: ['qds-icon'], since: '0.2.0',
    what: 'An icon from Lucide’s set, sized by tokens, decorative unless labeled.',
    tier: 1,
    why: 'Every icon in the library today is a typed character (+, →, ✓). Buttons, chips, inputs, alerts, and menus all need real icons, so this comes first.',
    needs: ['A choice of icon set', 'Icon size tokens'],
  },
  {
    name: 'Select', category: 'Inputs',
    elements: ['qds-select'], since: '0.2.0',
    what: 'A native select with a label, hint, and error message.',
    tier: 1,
    why: 'The most common form control still missing. Wraps the native select, keeping its accessibility and the mobile pickers.',
    needs: [],
  },
  {
    name: 'Alert', category: 'Feedback',
    elements: ['qds-alert'], since: '0.2.0',
    what: 'An inline info, success, warning, or error message.',
    tier: 1,
    why: 'Inline info, success, warning, and error messages: a form-level error, a "saved" notice. The status roles, error included, exist for exactly this.',
    needs: ['Announcements to assistive technology'],
  },
  {
    name: 'Tooltip', category: 'Feedback',
    elements: ['qds-tooltip'], since: '0.2.0',
    what: 'A short label on hover and focus, such as an icon-only button’s name.',
    tier: 1,
    why: 'An icon-only button needs a visible label on hover and focus, not just an accessible name.',
    needs: ['Floating panels', 'An inverse background role'],
  },
  {
    name: 'Menu', category: 'Actions',
    elements: ['qds-menu', 'qds-menu-item'], since: '0.2.0',
    what: 'A menu of actions opened by a button, with full keyboard support.',
    tier: 1,
    why: 'Action menus: the "More ⋯" button. Shares the floating-panel foundation with Tooltip, so the two are cheaper built together.',
    needs: ['Floating panels'],
  },
  // ── Shipped from Tier 2: common, and cheap once Tier 1 existed ────────────
  {
    name: 'Toast', category: 'Feedback',
    elements: ['qds-toast'], since: '0.3.0',
    what: 'A temporary message in the corner of the screen, announced without moving focus.',
    tier: 2,
    why: 'Short-lived confirmations ("Saved", "Copied") that screen readers announce without moving focus.',
    needs: ['Announcements to assistive technology'],
  },
  {
    name: 'Checkbox group', category: 'Inputs',
    elements: ['qds-checkbox-group'], since: '0.3.0',
    what: 'A labeled set of checkboxes, with a hint and "choose at least one".',
    tier: 2,
    why: 'Radios have a group with a label and required; checkboxes do not. A set of checkboxes has no group label, no "pick at least one", and no group error.',
    needs: [],
  },
  {
    name: 'Spinner', category: 'Feedback',
    elements: ['qds-spinner'], since: '0.3.0',
    what: 'A loading indicator for a wait with no measurable progress.',
    tier: 2,
    why: 'A standalone loading indicator. The button already draws one inside itself, so this mostly lifts it out.',
    needs: [],
  },
  {
    name: 'Avatar', category: 'Display',
    elements: ['qds-avatar'], since: '0.3.0',
    what: 'A person’s image, with their initials as the fallback.',
    tier: 2,
    why: 'A person’s image with an initials fallback. Common in nearly every app.',
    needs: [],
  },
  {
    name: 'Breadcrumbs', category: 'Navigation',
    elements: ['qds-breadcrumbs', 'qds-breadcrumb-item'], since: '0.3.0',
    what: 'The trail of pages above the current one.',
    tier: 2,
    why: 'Navigation through a hierarchy. Small, with a well-defined accessible pattern.',
    needs: [],
  },
  {
    name: 'Pagination', category: 'Navigation',
    elements: ['qds-pagination'], since: '0.3.0',
    what: 'Page links or buttons, with the gaps collapsed.',
    tier: 2,
    why: 'Moving through long lists and tables.',
    needs: [],
  },
  // ── Shipped from Tier 3: the rest of the budget ───────────────────────────
  {
    name: 'Combobox', category: 'Inputs',
    elements: ['qds-combobox'], since: '1.1.0',
    what: 'A text field with a list of options that narrows as you type.',
    tier: 3,
    why: 'Choosing from a list too long to scan, such as countries or time zones. The hardest pattern on the list, so it came after Select and Menu.',
    needs: ['Floating panels'],
  },
  {
    name: 'Popover', category: 'Containment',
    elements: ['qds-popover'], since: '1.1.0',
    what: 'A panel of content opened by a button, beside it and above the page.',
    tier: 3,
    why: 'A short form, a filter, or details that do not need a whole dialog. Nearly free once the floating-panel foundation existed.',
    needs: ['Floating panels'],
  },
  {
    name: 'Skeleton', category: 'Feedback',
    elements: ['qds-skeleton'], since: '1.1.0',
    what: 'A placeholder shape shown where content is loading.',
    tier: 3,
    why: 'Placeholder shapes while content loads, so the page does not jump when it arrives.',
    needs: [],
  },
  {
    name: 'Slider', category: 'Inputs',
    elements: ['qds-slider'], since: '1.1.0',
    what: 'A slider, for choosing a number from a range.',
    tier: 3,
    why: 'A value people judge by eye: volume, a price ceiling, a zoom level. Wraps the native range input, keeping its keyboard support.',
    needs: [],
  },
  {
    name: 'File upload', category: 'Inputs',
    elements: ['qds-file-upload'], since: '1.1.0',
    what: 'A place to choose files, by browsing or dropping them, with the chosen files listed.',
    tier: 3,
    why: 'Picking and dropping files, with the chosen files listed and removable. The native file input cannot be styled or show more than a count.',
    needs: [],
  },
  {
    name: 'Segmented control', category: 'Inputs',
    elements: ['qds-segmented-control', 'qds-segment'], since: '1.1.0',
    what: 'A compact row of mutually exclusive options, one always chosen.',
    tier: 3,
    why: 'Switching a view or a unit in a toolbar, where a radio group is too tall.',
    needs: [],
  },

  // ── Tier 4: gaps in the structure of an app ──────────────────────────────
  {
    name: 'Number field', category: 'Inputs',
    elements: ['qds-number-field'],
    tier: 4,
    why: 'Quantities and amounts, with step buttons, min and max, and number formatting in the reader’s language. The slider sends people to a number input when the exact figure matters, and there is none.',
    needs: [],
  },
  {
    name: 'Table', category: 'Display',
    elements: ['qds-table'],
    tier: 4,
    why: 'Sortable headers, row selection, and a sticky header over a real table element. Not a data grid: no virtualization or editable cells.',
    needs: [],
  },
  {
    name: 'Side navigation', category: 'Navigation',
    elements: ['qds-side-nav', 'qds-side-nav-item'],
    tier: 4,
    why: 'Every app shell needs one, and tabs, breadcrumbs, and pagination do not cover moving between the sections of an app.',
    needs: [],
  },
  {
    name: 'Date picker', category: 'Inputs',
    elements: ['qds-date-picker'],
    tier: 4,
    why: 'A typed date with a calendar beside it. Left out until now as expensive to make accessible; the popover now supplies the panel, focus handling, and dismissal.',
    needs: ['Floating panels', 'Date logic'],
  },
  {
    name: 'Badge', category: 'Display',
    elements: ['qds-badge'],
    tier: 4,
    why: 'A count on a navigation item, an avatar, or an icon button. The chip covers status labels, but once there is side navigation, unread counts need a place.',
    needs: [],
  },

  // ── Tier 5: flows and layout ──────────────────────────────────────────────
  {
    name: 'Stepper', category: 'Navigation',
    elements: ['qds-stepper', 'qds-step'],
    tier: 5,
    why: 'Progress through checkout, onboarding, or a long form: which steps are done, which is current, and what is left.',
    needs: [],
  },
  {
    name: 'Grid', category: 'Layout',
    elements: ['qds-grid'],
    tier: 5,
    why: 'Responsive columns with gaps from the spacing scale, beside Stack. Anything past a single row or column is hand-written CSS today.',
    needs: [],
  },
];

const TIERS = [
  { tier: 1, title: 'Tier 1', summary: 'Gaps that block ordinary product screens. Build these first.' },
  { tier: 2, title: 'Tier 2', summary: 'Common, and cheap once Tier 1 exists.' },
  { tier: 3, title: 'Tier 3', summary: 'The rest of the first budget: the candidates held in reserve, built to fill it.' },
  { tier: 4, title: 'Tier 4', summary: 'Gaps in the structure of an app: navigating it, showing data, and entering numbers and dates.' },
  { tier: 5, title: 'Tier 5', summary: 'Smaller additions for multi-step flows and page layout.' },
];

/** Needs better met by an option on a component that exists, so they cost no budget. */
const VARIANTS = [
  {
    name: 'Textarea',
    as: 'multiline on qds-text-field',
    url: '/components/text-field/',
    built: '1.0.0',
    why: 'It needs the same label, hint, and error as a text field, and can share the form logic the input and text field already share.',
  },
  {
    name: 'Drawer',
    as: 'placement on qds-modal',
    url: '/components/modal/',
    built: '1.0.0',
    why: 'A side sheet is the same modal dialog — inert page, focus handling, Escape — in a different position.',
  },
  {
    name: 'Multi-select',
    as: 'multiple on qds-combobox',
    url: '/components/combobox/',
    why: 'Choosing several values from a long list is the same combobox, with the chosen values shown as removable chips and submitted as a list.',
  },
  {
    name: 'Choice cards',
    as: 'appearance="card" on qds-radio-group',
    url: '/components/radio-group/',
    why: 'Plans and shipping options drawn as cards are still one choice from a set: the same radio group, keyboard, and validation, drawn larger.',
  },
  {
    name: 'Banner',
    as: 'a page-level placement on qds-alert',
    url: '/components/alert/',
    why: 'A message across the top of the page is an alert at full width. The status roles and announcements are the same.',
  },
  {
    name: 'Split button',
    as: 'qds-button beside a qds-menu',
    url: '/components/menu/',
    why: 'A main action with related ones behind a chevron is a composition of two components that exist, documented as a pattern rather than built as a third.',
  },
];

/** Left out on purpose, and why. */
const OUT_OF_SCOPE = [
  {
    name: 'Link, divider, headings, text',
    why: 'Plain HTML styled with the token CSS. A web component adds nothing here, and a link inside a shadow root makes things worse.',
  },
  {
    name: 'Data grid',
    why: 'Table covers sorting and selection over a real table element. Virtualized rows, editable cells, and column resizing make a full data grid a product of its own.',
  },
];

/**
 * Candidates for the remaining budget, added only when a real need appears.
 * None are named yet: the room left after Tiers 4 and 5 is held open.
 */
const HEADROOM = [];

/** Foundations several planned components share, worth building once. */
const INFRASTRUCTURE = [
  {
    name: 'Floating panels',
    for: ['Tooltip', 'Menu', 'Combobox', 'Popover'],
    note: 'Positioned panels that sit above the page. Drawn in the browser’s top layer with the native Popover API, so no ancestor can clip them, and placed beside their trigger, flipping and shifting to stay on screen.',
    built: '0.2.0',
  },
  {
    name: 'Announcements to assistive technology',
    for: ['Alert', 'Toast'],
    note: 'One shared way to announce a message, so the two do not compete or double-announce. Exported as announce(), for apps too.',
    built: '0.2.0',
  },
  {
    name: 'New tokens',
    for: ['Tooltip', 'Icon'],
    note: 'An inverse background role for tooltip surfaces, and icon size tokens.',
    built: '0.2.0',
  },
  {
    name: 'Date logic',
    for: ['Date picker'],
    note: 'Parsing and formatting dates in the reader’s language with Intl, and the calendar grid: weeks starting on the locale’s first day, and keyboard movement by day, week, month, and year.',
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
