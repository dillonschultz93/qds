/**
 * Theme toggle.
 *
 * Doubles as a live check on the token pipeline: flipping `data-theme` on the
 * root swaps only the semantic tier's variables, so if the whole page changes
 * colour, the dark token set and `outputReferences` are both working. If nothing
 * moves, the CSS was flattened to literals somewhere.
 *
 * Three states rather than two — light, dark, and "follow the OS" — because a
 * two-state toggle silently pins the reader to whichever mode they happened to
 * land on and offers no way back to the system setting.
 */

const STORAGE_KEY = 'qds-theme';
const ORDER = ['system', 'light', 'dark'];

const LABELS = {
  system: 'Theme: System',
  light: 'Theme: Light',
  dark: 'Theme: Dark',
};

function read() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function apply(theme) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }

  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Private mode: the choice applies for this page view only. */
  }
}

const button = document.getElementById('theme-toggle');

if (button) {
  let current = read();

  const sync = () => {
    button.textContent = LABELS[current];
    // The label already reads "Theme: Dark", so aria-label would duplicate it.
    button.setAttribute('aria-pressed', String(current !== 'system'));
  };

  apply(current);
  sync();

  button.addEventListener('click', () => {
    current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    apply(current);
    sync();
  });
}
