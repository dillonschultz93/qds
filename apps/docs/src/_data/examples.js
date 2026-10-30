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
  <qds-progress-bar label="Danger" value="97" variant="danger"></qds-progress-bar>
</qds-stack>`,
      },
    ],
  };
}
