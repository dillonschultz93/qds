/**
 * Component playgrounds: each control change re-renders the preview and the
 * code from renderPlayground, the same function the build used for the page's
 * first render.
 *
 * The preview is replaced rather than patched, so it always shows the
 * component as the code would create it — fresh, with those attributes from
 * the start — not as a mutation of the previous one would leave it.
 */

import { renderPlayground } from './playground-markup.js';

for (const root of document.querySelectorAll('[data-playground]')) {
  const { spec, values } = JSON.parse(root.querySelector('[data-playground-spec]').textContent);
  const preview = root.querySelector('.playground__preview');
  const code = root.querySelector('.playground__code code');
  const copied = root.querySelector('.playground__copied');
  const controls = root.querySelector('.playground__controls');

  const update = () => {
    const markup = renderPlayground(spec, values);
    preview.innerHTML = markup;
    code.textContent = markup;
    copied.textContent = '';
  };

  /**
   * Only events from the controls: the preview's own components fire
   * qds-change too (a toggle in the preview is a real toggle), and must not
   * be read as settings.
   */
  const read = (event) => {
    const control = event.target.closest?.('[data-control]');
    if (!control || !controls.contains(control)) return;
    const name = control.dataset.control;
    if (control.localName === 'qds-toggle') values[name] = control.checked;
    else values[name] = control.value;
    update();
  };

  controls.addEventListener('qds-change', read);
  // Text re-renders as it is typed, not only once the field is left.
  controls.addEventListener('qds-input', read);

  root.querySelector('[data-copy]').addEventListener('qds-click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      copied.textContent = 'Copied';
    } catch {
      copied.textContent = 'Select the code to copy it';
    }
  });
}
