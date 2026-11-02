/**
 * The site's information architecture: three sections, as Material 3 and
 * Spectrum organise theirs, and a fourth for the AI tools, as Mantine has.
 *
 *   Foundations  what the system is built from: the tokens and their grammar
 *   Styles       how it looks: color, typography, icons
 *   Components   what it is made of: one page per component family
 *   AI           the MCP server and skills that build token systems
 *
 * The header, each section's sidebar and landing page, and the search index all
 * read from here, so a page is added in one place.
 *
 * Component pages are per FAMILY, not per element: Tabs documents qds-tabs,
 * qds-tab, and qds-tab-panel together, because they are only ever used
 * together. Families and their categories come from the roadmap, and each
 * element's API from the custom elements manifest — neither is written twice.
 */

import { tokens } from '@quieto/design-tokens';

import loadComponents from './components.js';
import loadRoadmap from './roadmap.js';

/** "Radio group" → "radio-group" */
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The order categories appear in, in the sidebar and on the landing page. */
const CATEGORIES = ['Actions', 'Inputs', 'Containment', 'Navigation', 'Feedback', 'Layout', 'Display'];

export default async function () {
  const elements = new Map((await loadComponents()).map((element) => [element.tagName, element]));

  // Component token sets that exist, by name: 'component/radio' → 'radio'.
  const tokenSets = new Set(
    tokens.filter((token) => token.tier === 'component').map((token) => token.set.replace(/^component\//, '')),
  );
  const roadmap = await loadRoadmap();

  /** A shipped family's own component tokens. */
  const own = (family) =>
    tokens.filter(
      (token) =>
        token.tier === 'component' &&
        family.elements.some((tag) => token.set === `component/${tag.replace(/^qds-/, '')}`),
    );

  const families = roadmap.shipped
    .map((family) => {
      const slug = slugify(family.name);
      const members = family.elements.map((tag) => elements.get(tag));
      return {
        name: family.name,
        slug,
        url: `/components/${slug}/`,
        apiUrl: `/components/${slug}/api/`,
        tokensUrl: `/components/${slug}/tokens/`,
        /**
         * The family's own token sets, found from its element names: qds-radio
         * owns component/radio. A family with none (Stack, which reads the
         * spacing scale) has an empty list.
         */
        tokenSets: family.elements.map((tag) => tag.replace(/^qds-/, '')).filter((name) => tokenSets.has(name)),
        tokenCount: own(family).length,
        /**
         * The token the Tokens tab's restyle example overrides: the most
         * representative color — a primary or default resting background —
         * since the example sets a color.
         */
        sampleToken: (
          // The default variant's background, by whichever name it has…
          own(family).find((token) => /-(primary|neutral|default|outlined)-color-background-rest$/.test(token.name)) ??
          // …or the component's own, unvarianted background…
          own(family).find((token) => /^qds-component-[a-z-]+?-color-background-rest$/.test(token.name) &&
            family.elements.some((tag) => token.name === `qds-component-${tag.replace(/^qds-/, '')}-color-background-rest`)) ??
          // …or any resting or checked background, or failing that any color.
          own(family).find((token) => /-color-background-(rest|checked)$/.test(token.name)) ??
          own(family).find((token) => token.type === 'color')
        )?.name,
        category: family.category,
        since: family.since,
        summary: family.what ?? family.summary,
        // The primary element carries the family's description and examples.
        primary: members[0],
        members,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const sections = [
    {
      key: 'foundations',
      title: 'Foundations',
      url: '/foundations/',
      summary: 'What the system is built from: the design tokens, and the grammar that names them.',
      groups: [
        {
          title: null,
          pages: [
            {
              title: 'Tokens',
              url: '/foundations/tokens/',
              summary: 'The three token tiers, and every token with its value in each mode.',
            },
            {
              title: 'Tokens Nomenclature',
              url: '/foundations/nomenclature/',
              summary: 'The grammar that names every token: each tier\u2019s anatomy, its vocabularies, and how the build enforces them.',
            },
          ],
        },
      ],
    },
    {
      key: 'styles',
      title: 'Styles',
      url: '/styles/',
      summary: 'How QDS looks: its colors, its type, and its icons.',
      groups: [
        {
          title: null,
          pages: [
            {
              title: 'Color',
              url: '/styles/color/',
              summary: 'The palette, and the color roles that give it meaning — in light and dark.',
            },
            {
              title: 'Typography',
              url: '/styles/typography/',
              summary: 'Typefaces, the type roles, and the scale they are built from.',
            },
            {
              title: 'Icons',
              url: '/styles/icons/',
              summary: 'Planned: the icon set and the qds-icon component.',
              status: 'Planned',
            },
          ],
        },
      ],
    },
    {
      key: 'components',
      title: 'Components',
      url: '/components/',
      summary: 'Web components styled entirely by the tokens, one page per component.',
      groups: CATEGORIES.map((category) => ({
        title: category,
        pages: families
          .filter((family) => family.category === category)
          .map((family) => ({ title: family.name, url: family.url, summary: family.summary })),
      })).filter((group) => group.pages.length > 0),
    },
    {
      key: 'ai',
      title: 'AI',
      url: '/ai/',
      summary: 'Build and check token systems from your AI tools: a hosted MCP server, and skills for Claude Code.',
      groups: [
        {
          title: null,
          pages: [
            {
              title: 'MCP server',
              url: '/ai/mcp/',
              summary: 'Generate ramps, scales, and themes, and check contrast, from any MCP client. Hosted at quieto.dev/mcp.',
            },
            {
              title: 'Skills',
              url: '/ai/skills/',
              summary: 'Claude Code skills that scaffold, audit, migrate, and update a token system.',
            },
          ],
        },
      ],
    },
  ];

  return {
    sections,
    families,
    /** Old addresses, and where they live now. Written out as _redirects. */
    redirects: [
      ['/tokens/', '/foundations/tokens/'],
      ['/nomenclature/', '/foundations/nomenclature/'],
      ...families.flatMap((family) => family.members.map((member) => [`/components/${member.tagName}/`, family.url])),
    ],
  };
}
