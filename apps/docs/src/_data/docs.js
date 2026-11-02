/**
 * The site's information architecture: three sections, as Material 3 and
 * Spectrum organise theirs.
 *
 *   Foundations  what the system is built from: the tokens and their grammar
 *   Styles       how it looks: color, typography, icons
 *   Components   what it is made of: one page per component family
 *
 * The header, each section's sidebar and landing page, and the search index all
 * read from here, so a page is added in one place.
 *
 * Component pages are per FAMILY, not per element: Tabs documents qds-tabs,
 * qds-tab, and qds-tab-panel together, because they are only ever used
 * together. Families and their categories come from the roadmap, and each
 * element's API from the custom elements manifest — neither is written twice.
 */

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
  const roadmap = await loadRoadmap();

  const families = roadmap.shipped
    .map((family) => {
      const slug = slugify(family.name);
      const members = family.elements.map((tag) => elements.get(tag));
      return {
        name: family.name,
        slug,
        url: `/components/${slug}/`,
        apiUrl: `/components/${slug}/api/`,
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
              summary: 'The three token tiers, how they are named, and every token with its value in each mode.',
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
  ];

  return {
    sections,
    families,
    /** Old addresses, and where they live now. Written out as _redirects. */
    redirects: [
      ['/tokens/', '/foundations/tokens/'],
      ['/nomenclature/', '/foundations/tokens/'],
      ...families.flatMap((family) => family.members.map((member) => [`/components/${member.tagName}/`, family.url])),
    ],
  };
}
