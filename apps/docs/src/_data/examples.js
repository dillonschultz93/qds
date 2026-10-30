/**
 * Live examples, keyed by tag name.
 *
 * Kept as data rather than hand-written pages so that one template covers every
 * component: adding a component to the library gives it a documentation page
 * automatically, and this file is the only place that needs an entry.
 *
 * Each `html` string is rendered live *and* shown as source by the same template,
 * so the demo and the code beneath it are the same markup.
 */

export default function () {
  return {
    'qds-button': [
      {
        title: 'Variants',
        description: 'Four levels of emphasis. Every colour resolves through the component tier.',
        html: `<qds-button variant="primary">Primary</qds-button>
<qds-button variant="secondary">Secondary</qds-button>
<qds-button variant="ghost">Ghost</qds-button>
<qds-button variant="danger">Danger</qds-button>`,
      },
      {
        title: 'Sizes',
        description: 'Padding and font size come from the size variant tokens.',
        html: `<qds-button size="sm">Small</qds-button>
<qds-button size="md">Medium</qds-button>
<qds-button size="lg">Large</qds-button>`,
      },
      {
        title: 'Disabled and loading',
        description:
          'A loading button stays focusable and keeps its accessible name — the label is faded with opacity, not hidden, so it remains in the accessibility tree.',
        html: `<qds-button disabled>Disabled</qds-button>
<qds-button loading>Saving</qds-button>
<qds-button variant="secondary" loading>Saving</qds-button>`,
      },
      {
        title: 'Icons in the start and end slots',
        html: `<qds-button>
  <span slot="start" aria-hidden="true">+</span>
  New item
</qds-button>
<qds-button variant="secondary">
  Continue
  <span slot="end" aria-hidden="true">&rarr;</span>
</qds-button>
<qds-button variant="ghost" label="Dismiss">
  <span aria-hidden="true">&times;</span>
</qds-button>`,
      },
      {
        title: 'Inside a form',
        description:
          'Form association via ElementInternals, which is what lets a button inside shadow DOM submit the form around it.',
        html: `<form onsubmit="event.preventDefault(); this.querySelector('output').textContent = 'Submitted';">
  <qds-stack direction="inline" gap="200" align="center">
    <input name="title" placeholder="Title" aria-label="Title" />
    <qds-button type="submit">Save</qds-button>
    <qds-button type="reset" variant="ghost">Reset</qds-button>
    <output></output>
  </qds-stack>
</form>`,
      },
      {
        title: 'Restyled by overriding component tokens',
        description:
          'No custom CSS on the component itself — only the token variables it already reads.',
        html: `<qds-button
  style="
    --qds-component-button-primary-color-background-rest: var(--qds-color-purple-600);
    --qds-component-button-primary-color-background-hover: var(--qds-color-purple-700);
    --qds-component-button-primary-color-content-rest: var(--qds-color-neutral-50);
    --qds-component-button-border-radius: var(--qds-border-radius-full);
  "
>Purple and round</qds-button>`,
      },
    ],

    'qds-stack': [
      {
        title: 'Block direction',
        description: 'The default. Gap is constrained to steps on the spacing scale.',
        html: `<qds-stack gap="200">
  <qds-button>First</qds-button>
  <qds-button variant="secondary">Second</qds-button>
  <qds-button variant="ghost">Third</qds-button>
</qds-stack>`,
      },
      {
        title: 'Inline direction',
        description:
          'Named for the writing mode rather than "horizontal", so it reverses correctly under RTL.',
        html: `<qds-stack direction="inline" gap="300" align="center">
  <qds-button size="sm">Small</qds-button>
  <qds-button>Medium</qds-button>
  <qds-button size="lg">Large</qds-button>
</qds-stack>`,
      },
      {
        title: 'Spacing scale',
        description: 'Each step is a distinct token, from 0 through 900.',
        html: `<qds-stack direction="inline" gap="100">
  <qds-button size="sm">100</qds-button><qds-button size="sm">100</qds-button>
</qds-stack>
<qds-stack direction="inline" gap="400">
  <qds-button size="sm">400</qds-button><qds-button size="sm">400</qds-button>
</qds-stack>
<qds-stack direction="inline" gap="600">
  <qds-button size="sm">600</qds-button><qds-button size="sm">600</qds-button>
</qds-stack>`,
      },
    ],

    'qds-checkbox': [
      {
        title: 'States',
        description:
          'Unchecked, checked, and indeterminate — the dash a parent shows when only some of its children are checked.',
        html: `<qds-stack gap="200">
  <qds-checkbox>Email me about updates</qds-checkbox>
  <qds-checkbox checked>Remember this device</qds-checkbox>
  <qds-checkbox indeterminate>Select all</qds-checkbox>
</qds-stack>`,
      },
      {
        title: 'Disabled',
        html: `<qds-stack gap="200">
  <qds-checkbox disabled>Unavailable</qds-checkbox>
  <qds-checkbox disabled checked>Locked on</qds-checkbox>
</qds-stack>`,
      },
      {
        title: 'Inside a form',
        description:
          'Form-associated: the value submits only while checked, required blocks submission, and reset restores the declared state.',
        html: `<form onsubmit="event.preventDefault(); this.querySelector('output').textContent = JSON.stringify(Object.fromEntries(new FormData(this)));">
  <qds-stack gap="300">
    <qds-checkbox name="terms" value="accepted" required>I accept the terms</qds-checkbox>
    <qds-checkbox name="newsletter" checked>Send me the newsletter</qds-checkbox>
    <qds-stack direction="inline" gap="200" align="center">
      <qds-button type="submit">Submit</qds-button>
      <qds-button type="reset" variant="ghost">Reset</qds-button>
      <output></output>
    </qds-stack>
  </qds-stack>
</form>`,
      },
    ],

    'qds-radio-group': [
      {
        title: 'A group of options',
        description:
          'Tab moves into the group and lands on the chosen option; arrow keys move between options and choose as they go.',
        html: `<qds-radio-group label="Delivery" name="delivery" value="standard">
  <qds-radio value="standard">Standard — 3 to 5 days</qds-radio>
  <qds-radio value="express">Express — next day</qds-radio>
  <qds-radio value="pickup" disabled>Pick up in store (unavailable)</qds-radio>
</qds-radio-group>`,
      },
      {
        title: 'Inline orientation',
        html: `<qds-radio-group label="Size" orientation="inline">
  <qds-radio value="s">Small</qds-radio>
  <qds-radio value="m" checked>Medium</qds-radio>
  <qds-radio value="l">Large</qds-radio>
</qds-radio-group>`,
      },
      {
        title: 'Disabled group',
        html: `<qds-radio-group label="Plan" value="free" disabled>
  <qds-radio value="free">Free</qds-radio>
  <qds-radio value="pro">Pro</qds-radio>
</qds-radio-group>`,
      },
      {
        title: 'Inside a form',
        description:
          'The group is the form-associated element: it submits the chosen value under its name, and required blocks submission until something is chosen.',
        html: `<form onsubmit="event.preventDefault(); this.querySelector('output').textContent = JSON.stringify(Object.fromEntries(new FormData(this)));">
  <qds-stack gap="300">
    <qds-radio-group label="Contact me by" name="contact" required>
      <qds-radio value="email">Email</qds-radio>
      <qds-radio value="phone">Phone</qds-radio>
    </qds-radio-group>
    <qds-stack direction="inline" gap="200" align="center">
      <qds-button type="submit">Submit</qds-button>
      <qds-button type="reset" variant="ghost">Reset</qds-button>
      <output></output>
    </qds-stack>
  </qds-stack>
</form>`,
      },
    ],

    'qds-toggle': [
      {
        title: 'On and off',
        description:
          'For settings that apply immediately. Announced as a switch, "on" or "off", rather than as a checkbox.',
        html: `<qds-stack gap="300">
  <qds-toggle checked>Wi-Fi</qds-toggle>
  <qds-toggle>Bluetooth</qds-toggle>
  <qds-toggle disabled>Airplane mode (managed by your organization)</qds-toggle>
</qds-stack>`,
      },
      {
        title: 'Inside a form',
        description: 'Form-associated: submits its value only while on, and reset restores the declared state.',
        html: `<form onsubmit="event.preventDefault(); this.querySelector('output').textContent = JSON.stringify(Object.fromEntries(new FormData(this)));">
  <qds-stack gap="300">
    <qds-toggle name="notifications" value="enabled" checked>Notifications</qds-toggle>
    <qds-stack direction="inline" gap="200" align="center">
      <qds-button type="submit">Save</qds-button>
      <qds-button type="reset" variant="ghost">Reset</qds-button>
      <output></output>
    </qds-stack>
  </qds-stack>
</form>`,
      },
    ],

    'qds-input': [
      {
        title: 'Basic',
        description:
          'The bare control, named by its label attribute. For a visible label, hint, or error message, use qds-text-field.',
        html: `<qds-input label="Search the docs" placeholder="Search the docs" type="search"></qds-input>`,
      },
      {
        title: 'Sizes',
        html: `<qds-stack gap="200">
  <qds-input size="sm" label="Small" placeholder="Small"></qds-input>
  <qds-input size="md" label="Medium" placeholder="Medium"></qds-input>
  <qds-input size="lg" label="Large" placeholder="Large"></qds-input>
</qds-stack>`,
      },
      {
        title: 'Start and end slots',
        description: 'For icons, prefixes, and units. Clicking an affix puts the cursor in the text.',
        html: `<qds-stack gap="200">
  <qds-input label="Amount" type="number" value="25">
    <span slot="start" aria-hidden="true">$</span>
    <span slot="end">USD</span>
  </qds-input>
  <qds-input label="Website" type="url" placeholder="example.com">
    <span slot="start" aria-hidden="true">https://</span>
  </qds-input>
</qds-stack>`,
      },
      {
        title: 'States',
        html: `<qds-stack gap="200">
  <qds-input label="Disabled" value="Disabled" disabled></qds-input>
  <qds-input label="Read-only" value="Read-only" readonly></qds-input>
  <qds-input label="Invalid" value="Invalid" invalid></qds-input>
</qds-stack>`,
      },
    ],

    'qds-text-field': [
      {
        title: 'Label and hint',
        description:
          'The label, hint, and error all live in the component’s shadow root, because the ID references that connect them cannot cross a shadow boundary.',
        html: `<qds-text-field
  label="Username"
  hint="Letters, numbers, and underscores. You can change it later."
  autocomplete="username"
></qds-text-field>`,
      },
      {
        title: 'Validation messages',
        description:
          'The browser’s own message appears once you leave the field. Type an invalid address, then tab away.',
        html: `<qds-text-field label="Email" type="email" required autocomplete="email"></qds-text-field>`,
      },
      {
        title: 'Author error',
        description: 'For errors only the server can detect. Shown immediately.',
        html: `<qds-text-field
  label="Username"
  value="ada"
  error="That username is taken. Try another."
></qds-text-field>`,
      },
      {
        title: 'Slots',
        html: `<qds-text-field label="Price" type="number" value="25">
  <span slot="start" aria-hidden="true">$</span>
  <span slot="end">USD</span>
  <span slot="hint">Prices include tax. <a href="#">How tax is calculated</a></span>
</qds-text-field>`,
      },
      {
        title: 'Inside a form',
        description: 'Submitting marks every field as touched, so each failing field shows its message.',
        html: `<form onsubmit="event.preventDefault(); this.querySelector('output').textContent = JSON.stringify(Object.fromEntries(new FormData(this)));">
  <qds-stack gap="300">
    <qds-text-field label="Name" name="name" required autocomplete="name"></qds-text-field>
    <qds-text-field label="Email" name="email" type="email" required autocomplete="email"></qds-text-field>
    <qds-stack direction="inline" gap="200" align="center">
      <qds-button type="submit">Submit</qds-button>
      <qds-button type="reset" variant="ghost">Reset</qds-button>
      <output></output>
    </qds-stack>
  </qds-stack>
</form>`,
      },
    ],

    'qds-chip': [
      {
        title: 'Variants',
        description: 'The variant tints the chip; the text still has to say what it means.',
        html: `<qds-stack direction="inline" gap="200" wrap>
  <qds-chip>Draft</qds-chip>
  <qds-chip variant="info">In review</qds-chip>
  <qds-chip variant="success">Published</qds-chip>
  <qds-chip variant="warning">Expiring soon</qds-chip>
  <qds-chip variant="error">Overdue</qds-chip>
</qds-stack>`,
      },
      {
        title: 'Removable',
        description:
          'The remove button is named "Remove" plus the chip text. The chip fires qds-remove and leaves removing it to the page.',
        html: `<qds-stack id="filters" direction="inline" gap="200" wrap>
  <qds-chip removable>Design</qds-chip>
  <qds-chip removable>Engineering</qds-chip>
  <qds-chip removable variant="info">Open roles</qds-chip>
</qds-stack>
<script>
  document.getElementById('filters').addEventListener('qds-remove', (event) => event.target.remove());
</script>`,
      },
      {
        title: 'With an icon',
        html: `<qds-chip variant="success">
  <span slot="start" aria-hidden="true">&check;</span>
  Verified
</qds-chip>`,
      },
    ],

    'qds-card': [
      {
        title: 'Variants',
        description: 'Outlined by default; elevated adds the semantic elevation shadow; filled drops the border.',
        html: `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: var(--qds-spacing-400); width: 100%;">
  <qds-card>
    <h3 slot="header">Outlined</h3>
    The default. A border on the page background.
  </qds-card>
  <qds-card variant="elevated">
    <h3 slot="header">Elevated</h3>
    Lifted with the default elevation token.
  </qds-card>
  <qds-card variant="filled">
    <h3 slot="header">Filled</h3>
    A subtle fill and no border.
  </qds-card>
</div>`,
      },
      {
        title: 'Every region',
        description:
          'Media bleeds to the edges, and the footer sits at the bottom however short the body is. Empty regions take no space.',
        html: `<qds-card style="max-width: 22rem;">
  <div slot="media" aria-hidden="true"
    style="height: 8rem; background: linear-gradient(135deg, var(--qds-color-blue-500), var(--qds-color-purple-500));"></div>
  <h3 slot="header">Design tokens 0.1</h3>
  <p style="margin: 0;">The first publishable release: three tiers, light and dark modes, and a validator that enforces the naming grammar.</p>
  <qds-stack slot="footer" direction="inline" gap="200">
    <qds-button size="sm">Read the notes</qds-button>
    <qds-button size="sm" variant="ghost">Dismiss</qds-button>
  </qds-stack>
</qds-card>`,
      },
    ],

    'qds-progress-bar': [
      {
        title: 'Determinate',
        description: 'Name the bar with label. It is not shown, so add visible text beside it where sighted users need it.',
        html: `<qds-stack gap="300" style="width: 100%;">
  <qds-progress-bar label="Uploading report.pdf" value="25"></qds-progress-bar>
  <qds-progress-bar label="Profile completeness" value="60"></qds-progress-bar>
  <qds-progress-bar label="Storage used" value="90" max="100"></qds-progress-bar>
</qds-stack>`,
      },
      {
        title: 'Indeterminate',
        description:
          'Leave value unset when the length of the work is unknown. Announced as busy rather than as 0%; with reduced motion it pulses instead of sliding.',
        html: `<qds-progress-bar label="Connecting" style="width: 100%;"></qds-progress-bar>`,
      },
      {
        title: 'Variants',
        html: `<qds-stack gap="300" style="width: 100%;">
  <qds-progress-bar label="Primary" value="70"></qds-progress-bar>
  <qds-progress-bar label="Success" value="100" variant="success"></qds-progress-bar>
  <qds-progress-bar label="Warning" value="85" variant="warning"></qds-progress-bar>
  <qds-progress-bar label="Error" value="97" variant="error"></qds-progress-bar>
</qds-stack>`,
      },
    ],

    'qds-accordion': [
      {
        title: 'Basic',
        description:
          'Each heading is a button inside a real heading, so the sections show up in heading navigation. Up and Down move between headings.',
        html: `<qds-accordion style="width: 100%;">
  <qds-accordion-item heading="How long does shipping take?" open>
    Orders ship within one business day and arrive in 3 to 5 days.
  </qds-accordion-item>
  <qds-accordion-item heading="Can I return an item?">
    Yes — returns are free for 30 days from delivery.
  </qds-accordion-item>
  <qds-accordion-item heading="Is there a warranty?">
    Every product carries a two-year warranty covering parts and labour.
  </qds-accordion-item>
  <qds-accordion-item heading="Gift cards (coming soon)" disabled>
    Not available yet.
  </qds-accordion-item>
</qds-accordion>`,
      },
      {
        title: 'Exclusive',
        description: 'Opening one item closes the others.',
        html: `<qds-accordion exclusive style="width: 100%;">
  <qds-accordion-item heading="Step 1: Account" open>Choose a username and password.</qds-accordion-item>
  <qds-accordion-item heading="Step 2: Profile">Add a photo and a short bio.</qds-accordion-item>
  <qds-accordion-item heading="Step 3: Notifications">Pick what we email you about.</qds-accordion-item>
</qds-accordion>`,
      },
      {
        title: 'Searchable when closed',
        description:
          'Closed panels use hidden="until-found": search this page for "aurora" and the item opens to show the match.',
        html: `<qds-accordion style="width: 100%;">
  <qds-accordion-item heading="Release codenames">
    Every release is named after a natural phenomenon. The next one is aurora.
  </qds-accordion-item>
</qds-accordion>`,
      },
    ],

    'qds-tabs': [
      {
        title: 'Basic',
        description:
          'Left and Right select as they move; Tab goes from the selected tab straight into its panel. Tabs and panels pair by position.',
        html: `<qds-tabs label="Account settings" style="width: 100%;">
  <qds-tab slot="tab">Profile</qds-tab>
  <qds-tab slot="tab">Security</qds-tab>
  <qds-tab slot="tab">Billing</qds-tab>
  <qds-tab slot="tab" disabled>Team (Pro only)</qds-tab>
  <qds-tab-panel>Your name, photo, and bio.</qds-tab-panel>
  <qds-tab-panel>Password, two-factor authentication, and active sessions.</qds-tab-panel>
  <qds-tab-panel>Plan, payment method, and invoices.</qds-tab-panel>
  <qds-tab-panel>Invite and manage teammates.</qds-tab-panel>
</qds-tabs>`,
      },
      {
        title: 'Initial selection',
        description: 'Mark a tab selected in the markup to start there.',
        html: `<qds-tabs label="Reports" style="width: 100%;">
  <qds-tab slot="tab">Daily</qds-tab>
  <qds-tab slot="tab" selected>Weekly</qds-tab>
  <qds-tab slot="tab">Monthly</qds-tab>
  <qds-tab-panel>Today's numbers.</qds-tab-panel>
  <qds-tab-panel>This week's numbers.</qds-tab-panel>
  <qds-tab-panel>This month's numbers.</qds-tab-panel>
</qds-tabs>`,
      },
    ],

    'qds-modal': [
      {
        title: 'Confirmation',
        description:
          'Built on the native dialog: the page behind becomes inert, focus moves in, Escape closes it, and focus returns to the button that opened it.',
        html: `<qds-button variant="danger" onclick="document.getElementById('delete-modal').show()">
  Delete project
</qds-button>
<qds-modal id="delete-modal" heading="Delete this project?" size="sm">
  <p style="margin: 0;">Its 14 files and their history will be removed. This cannot be undone.</p>
  <form method="dialog" slot="footer">
    <qds-button type="submit" variant="ghost">Cancel</qds-button>
    <qds-button type="submit" variant="danger">Delete project</qds-button>
  </form>
</qds-modal>`,
      },
      {
        title: 'Light dismiss',
        description:
          'Clicking the backdrop closes the dialog only with light-dismiss, so a stray click cannot throw away a half-filled form.',
        html: `<qds-button variant="secondary" onclick="document.getElementById('info-modal').show()">
  What's new
</qds-button>
<qds-modal id="info-modal" heading="What's new in 0.2" light-dismiss>
  <p style="margin: 0;">Eleven new components, from checkboxes to tabs.</p>
</qds-modal>`,
      },
    ],
  };
}
