/**
 * Client entry point for the docs site. Bundled to `assets/ui.js`.
 *
 * The import ORDER here is load-bearing and must not be reordered or
 * alphabetized.
 *
 * `lit-element-hydrate-support` patches LitElement so that an element whose
 * shadow root already contains server-rendered markup *adopts* that markup
 * instead of rendering fresh content into it. It has to be evaluated before
 * LitElement is defined, which means before anything that imports lit.
 *
 * Without it, every SSR'd component renders twice: the declarative shadow DOM
 * from the build, plus a second copy Lit appends on upgrade. Nothing errors — the
 * page simply shows a duplicate of every component, and only a look at the page
 * reveals it. Every DOM assertion still passes, because `querySelector` finds the
 * first copy.
 */
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';

import '@quieto/ui';
