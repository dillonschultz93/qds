/**
 * Theme toggle: light or dark, light by default.
 *
 * Doubles as a live check on the token pipeline: flipping `data-theme` on the
 * root swaps only the semantic tier's variables, so if the whole page changes
 * color, the dark token set and `outputReferences` are both working. If nothing
 * moves, the CSS was flattened to literals somewhere.
 *
 * The page always carries `data-theme` (the markup ships `light`, and the inline
 * script in the head applies a stored `dark` before first paint), so the OS
 * setting never decides the theme: a reader chooses dark here, and the choice is
 * remembered.
 *
 * The button is a toggle named "Dark theme" by its tooltip, pressed while the
 * page is dark. Its icon shows the theme a press switches to.
 */

const STORAGE_KEY = 'qds-theme';

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    if (theme === 'dark') localStorage.setItem(STORAGE_KEY, 'dark');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Private mode: the choice applies for this page view only. */
  }
}

const button = document.getElementById('theme-toggle');

if (button) {
  let current = read();
  const icon = button.querySelector('qds-icon');

  const sync = () => {
    button.setAttribute('aria-pressed', String(current === 'dark'));
    if (icon) icon.name = current === 'dark' ? 'sun' : 'moon';
  };

  apply(current);
  sync();
  // Hidden in the markup: without this script the button would do nothing.
  button.hidden = false;

  button.addEventListener('click', () => {
    current = current === 'dark' ? 'light' : 'dark';
    apply(current);
    sync();
  });
}
