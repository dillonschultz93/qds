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
