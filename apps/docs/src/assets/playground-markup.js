/**
 * Turns a component playground's settings into markup.
 *
 * Shared by the build (the preview and code a page loads with) and the browser
 * (both, again, every time a control changes), so the code shown before and
 * after an interaction is produced by one function and cannot disagree.
 *
 * Plain ES module, no DOM: it runs in Node too.
 */

const escapeAttribute = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const escapeText = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * The markup for `spec` at `values`.
 *
 * spec.tag        the element
 * spec.controls   [{ attribute, kind, default }]: an attribute equal to its
 *                 default is left out, so the code shows only what was changed
 *                 from it — as a reader would write it
 * spec.template   the element's inner markup, with {content} where the editable
 *                 content goes (default: just the content)
 * spec.wrap       markup around the element, with {element} where it goes
 * values          { [attribute]: string | boolean, content: string }
 */
export function renderPlayground(spec, values) {
  const attributes = spec.controls
    .map(({ attribute, kind, default: fallback }) => {
      const value = values[attribute];
      if (kind === 'boolean') return value ? ` ${attribute}` : '';
      if (value === undefined || value === null || value === '' || String(value) === String(fallback ?? '')) {
        return '';
      }
      return ` ${attribute}="${escapeAttribute(value)}"`;
    })
    .join('');

  const content = escapeText(values.content ?? '');
  const inner = (spec.template ?? '{content}').replaceAll('{content}', content);
  const element = `<${spec.tag}${attributes}>${inner}</${spec.tag}>`;
  return spec.wrap ? spec.wrap.replace('{element}', element) : element;
}
