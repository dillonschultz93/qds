import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

/**
 * Tests run in real browsers, not jsdom.
 *
 * Shadow DOM, `adoptedStyleSheets`, `delegatesFocus`, `:focus-visible`, and
 * computed styles from inherited custom properties are exactly what jsdom models
 * poorly or not at all — and they are the substance of a component library. A
 * green jsdom suite here would mostly prove that jsdom's stubs agree with
 * themselves.
 */
export default {
  files: 'src/**/*.test.ts',
  nodeResolve: true,
  plugins: [
    // Decorators need the same settings as tsconfig.base.json: legacy decorators
    // plus class fields that do not shadow Lit's reactive property accessors.
    esbuildPlugin({
      ts: true,
      target: 'es2022',
      tsconfig: './tsconfig.test.json',
    }),
  ],
  browsers: [playwrightLauncher({ product: 'chromium' })],
  testFramework: {
    config: { timeout: 4000 },
  },
  coverageConfig: {
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts'],
    threshold: { statements: 70, branches: 70, functions: 70, lines: 70 },
  },
};
