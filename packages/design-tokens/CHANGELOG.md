# @quieto/design-tokens

## 0.1.0

### Minor Changes

- First publishable release.

  - Ships no runtime dependencies. Style Dictionary and the Tokens Studio transforms were declared as dependencies, so installing the package pulled in 114 packages; they are build tools and now install only for development.
  - `require()` works on Node versions that support requiring ES modules, via a `default` export condition.
  - TypeScript types resolve with `moduleResolution: "node"` as well as `bundler` and `node16`.
  - `@quieto/design-tokens/nomenclature` now has type declarations.
  - Removed the `engines` constraint; the published files do not need Node 22.
  - Added a README covering setup, light and dark mode, and which tier to use.
