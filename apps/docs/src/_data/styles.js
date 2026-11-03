/**
 * The Styles pages' content — color and typography — derived from the token
 * manifest, so the pages show what the CSS ships rather than a description of it.
 *
 * Contrast ratios are computed here from the resolved values in each mode, and
 * judged against the WCAG 2 minimum for what the color is used for: 4.5:1 for
 * text (content), 3:1 for the boundaries of controls and other non-text marks
 * (border). They are the numbers behind the role choices, shown so a reader
 * does not have to take them on trust.
 */

import { tokens } from '@quieto/design-tokens';
import { STATES, semantic } from '@quieto/design-tokens/nomenclature';

const byName = new Map(tokens.map((token) => [token.name, token]));

// ── Contrast ─────────────────────────────────────────────────────────────────

/** Relative luminance of a #rrggbb color, or null for anything else (alpha, keywords). */
function luminance(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(color));
  if (!match) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A ratio, and whether it meets `minimum`. */
const rating = (ratio, minimum) =>
  ratio === null ? null : { ratio: ratio.toFixed(2), passes: ratio >= minimum, minimum };

// ── Color ────────────────────────────────────────────────────────────────────

/** Palette ramps, one per hue, in the manifest's order: lightest step first. */
function palette() {
  const hues = new Map();
  for (const token of tokens) {
    if (token.tier !== 'primitive' || token.path[0] !== 'color' || token.path.length !== 3) continue;
    const [, hue, step] = token.path;
    if (!hues.has(hue)) hues.set(hue, []);
    hues.get(hue).push({ step, name: token.name, value: token.modes.light });
  }
  return [...hues.entries()].map(([hue, steps]) => ({
    hue,
    // black's steps are opacity percentages, not lightness.
    alpha: hue === 'black',
    steps,
  }));
}

const PROPERTIES = [
  {
    property: 'background',
    title: 'Background',
    summary: 'Surfaces. The fill behind content: the page, a raised card, a filled button, a status tint.',
  },
  {
    property: 'content',
    title: 'Content',
    summary: 'Text and icons. Each must reach 4.5:1 against the surface it sits on.',
    minimum: 4.5,
  },
  {
    property: 'border',
    title: 'Border',
    summary:
      'Outlines and other non-text marks. Control and status borders reach 3:1 against the page; default and subtle borders are decorative and need not.',
    minimum: 3,
  },
];

/** Borders that are decorative, so not held to 3:1. */
const DECORATIVE = new Set(['default', 'subtle']);

/**
 * What each role is measured against: the page background, except for content
 * that sits on a filled surface (inverse: the label of a primary button), which
 * is measured against that surface.
 */
const SURFACES = { inverse: 'qds-semantic-color-background-primary-rest' };
const PAGE = 'qds-semantic-color-background-default';

/** Semantic color roles, grouped by the surface they apply to. */
function roles() {
  return PROPERTIES.map(({ property, title, summary, minimum }) => {
    const grouped = new Map();
    for (const token of tokens) {
      const [category, prop, role, state] = token.path;
      if (token.tier !== 'semantic' || category !== 'color' || prop !== property) continue;
      if (!grouped.has(role)) grouped.set(role, []);
      const judged = minimum && !(property === 'border' && DECORATIVE.has(role)) && state !== 'disabled';
      const surface = byName.get(SURFACES[role] ?? PAGE);
      grouped.get(role).push({
        state: state ?? null,
        name: token.name,
        light: token.modes.light,
        dark: token.modes.dark,
        // Against its surface, in each mode.
        contrast: judged
          ? {
              against: surface.name,
              light: rating(contrast(token.modes.light, surface.modes.light), minimum),
              dark: rating(contrast(token.modes.dark, surface.modes.dark), minimum),
            }
          : null,
      });
    }
    // In the nomenclature's own order (default, primary, secondary, …), states
    // likewise (rest, hover, active, …), rather than the manifest's.
    const order = (list, item) => (list.indexOf(item) === -1 ? list.length : list.indexOf(item));
    return {
      property,
      title,
      summary,
      roles: [...grouped.entries()]
        .sort(([a], [b]) => order(semantic.roles, a) - order(semantic.roles, b))
        .map(([role, states]) => ({
          role,
          states: states.sort((a, b) => order(STATES, a.state) - order(STATES, b.state)),
        })),
    };
  });
}

// ── Typography ───────────────────────────────────────────────────────────────

const ROLE_ORDER = ['display', 'headline', 'title', 'body', 'label', 'meta', 'data'];
const ROLE_USE = {
  display: 'The largest type, for a hero or a landing page. Rare.',
  headline: 'A page title.',
  title: 'A section heading, a card title, a dialog title.',
  body: 'Running text: the default.',
  label: 'Form labels, buttons, and other control text.',
  meta: 'Secondary detail: timestamps, captions, hints.',
  data: 'Code, token names, and tabular numbers, in the monospace face.',
};

function typeRoles() {
  return ROLE_ORDER.map((role) => {
    const value = (property) => byName.get(`qds-semantic-typography-${role}-${property}`)?.modes.light;
    return {
      role,
      use: ROLE_USE[role],
      prefix: `qds-semantic-typography-${role}`,
      fontFamily: value('font-family'),
      fontSize: value('font-size'),
      fontWeight: value('font-weight'),
      lineHeight: value('line-height'),
      letterSpacing: value('letter-spacing'),
    };
  });
}

/** Primitive typography values of one kind: font-size, font-weight, … */
const scale = (kind) =>
  tokens
    .filter((token) => token.tier === 'primitive' && token.path[0] === 'typography' && token.path[1] === kind)
    .map((token) => ({ step: token.path[2], name: token.name, value: token.modes.light }));

export default function () {
  return {
    color: { palette: palette(), roles: roles() },
    typography: {
      families: scale('font-family'),
      roles: typeRoles(),
      sizes: scale('font-size'),
      weights: scale('font-weight'),
      lineHeights: scale('line-height'),
    },
  };
}
