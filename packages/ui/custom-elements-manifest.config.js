/**
 * Custom Elements Manifest configuration.
 *
 * The manifest is what the documentation site reads to build every component's
 * API table — properties, slots, events, CSS parts, CSS custom properties. Those
 * tables are generated from this output rather than written by hand, so the
 * JSDoc on each component is load-bearing: an undocumented `@slot` is an
 * undocumented slot on the site.
 */
export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
  outdir: '.',
  litelement: true,
  packagejson: false,
};
