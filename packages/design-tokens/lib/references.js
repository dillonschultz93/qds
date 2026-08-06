/**
 * DTCG reference helpers, shared by `validate.js` and `build.js`.
 */

/**
 * Extract every `{a.b.c}` reference from a token value of any shape.
 *
 * Walks objects and arrays, because composite tokens hold their references in
 * sub-fields: a `shadow` token's references live under `color`, `offsetX`,
 * `blur`, and so on, never in a top-level string. Matching only strings would
 * report composite tokens as having no references at all — which would let a
 * raw-valued composite slip past the semantic tier's alias requirement.
 *
 * @param {unknown} value
 * @returns {string[]} Reference paths without braces, e.g. `color.blue.600`.
 */
export function extractReferences(value) {
  if (typeof value === 'string') {
    return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1].trim());
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractReferences);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(extractReferences);
  }
  return [];
}
