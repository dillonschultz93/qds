/**
 * The AI tools: the MCP server's tools and the skills package's skills.
 *
 * Unlike the rest of the site's tables, these are written here rather than
 * generated, because both live in their own repositories (quieto-mcp and
 * quieto-skills) and the docs build cannot read them. When either adds or
 * renames something, update this file to match its README.
 */

export default {
  mcp: {
    url: 'https://quieto.dev/mcp',
    sseUrl: 'https://quieto.dev/sse',
    tools: [
      { name: 'generate_color_ramp', what: 'A 10-step accessible color ramp (50–900) from a brand hex color, with an optional neutral ramp.' },
      { name: 'generate_spacing', what: 'A spacing scale from a 4px or 8px base unit.' },
      { name: 'generate_typography', what: 'Typography tokens from a compact, balanced, or spacious scale.' },
      { name: 'check_contrast', what: 'The WCAG 2.1 contrast ratio between two hex colors, and the levels it passes.' },
      { name: 'map_semantics', what: 'Semantic (tier 2) tokens mapped from primitive inputs.' },
      { name: 'generate_themes', what: 'Light and dark theme token collections from a brand color, spacing base, and type scale.' },
      { name: 'bootstrap_from_codebase', what: 'Infers a seed from an existing codebase’s hardcoded styles, then generates a token system from it.' },
    ],
    prompts: [
      'Generate a color ramp from #4F46E5 and check the 600 step against white.',
      'Build light and dark themes from my brand color, #0F766E, with an 8px spacing base.',
      'Read the stylesheets in src/ and bootstrap a token system from them.',
    ],
  },
  skills: [
    { name: 'design-token-init', what: 'Scaffold a token system interactively, or bootstrap one from an existing codebase.' },
    { name: 'design-token-audit', what: 'Health-check a token system: orphans, broken references, naming, and WCAG contrast.' },
    { name: 'design-token-migrate', what: 'Find hardcoded CSS values that match tokens, and replace them.' },
    { name: 'design-token-component', what: 'Generate tier-3 component tokens for a component: its variants, states, and properties.' },
    { name: 'design-token-category-add', what: 'Add a shadow, border, or animation category.' },
    { name: 'design-token-contrast', what: 'Check WCAG contrast for a pair of colors, or for every pairing in the system.' },
    { name: 'design-token-update', what: 'Change an input, such as the brand color or spacing base, and preview the diff before writing.' },
  ],
};
