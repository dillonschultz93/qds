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
  };
}
