/**
 * Site search.
 *
 * Opens from the header button, from "/", or from Ctrl+K / ⌘K. The index
 * (search-index.json, written by search-index.js at build time) is fetched the
 * first time search opens, not on every page load.
 *
 * The input and results follow the ARIA combobox pattern: focus stays in the
 * input, Up and Down move the active result (announced through
 * aria-activedescendant), and Enter goes to it. That only works because the input
 * and the listbox are in the same tree — both are slotted into qds-modal from the
 * light DOM, so the ID reference resolves. A qds-input, whose input sits in its
 * own shadow root, could not point at them.
 */

const LIMIT = 50;

/**
 * The site root, found from where this script was loaded rather than assumed to
 * be "/": deployed to GitHub Pages the site lives under /qds/. The build rewrites
 * URLs in the HTML onto that base, but not the ones this script builds, so the
 * index and every result URL (written root-relative) are resolved against this.
 */
const ROOT = new URL('../', import.meta.url);
const resolve = (path) => new URL(path.replace(/^\//, ''), ROOT).href;

/** Shown beside each result, and a tiebreak: earlier kinds rank higher. */
const KINDS = {
  page: { label: 'Page', weight: 6 },
  component: { label: 'Component', weight: 5 },
  section: { label: 'Section', weight: 4 },
  event: { label: 'Event', weight: 3 },
  property: { label: 'Property', weight: 3 },
  slot: { label: 'Slot', weight: 2 },
  part: { label: 'CSS part', weight: 2 },
  token: { label: 'Token', weight: 1 },
};

const modal = document.getElementById('search');
const input = document.getElementById('search-input');
const list = document.getElementById('search-results');
const status = document.getElementById('search-status');
const opener = document.getElementById('search-open');

/** @type {Promise<Array<object>> | null} */
let index = null;
let results = [];
let active = -1;

/** What a query and an entry are compared as: lowercase words, punctuation dropped. */
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[<>`"'()]/g, ' ')
    .replace(/[-_.:/#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function load() {
  index ??= fetch(resolve('/search-index.json'))
    .then((response) => {
      if (!response.ok) throw new Error(`search-index.json: ${response.status}`);
      return response.json();
    })
    .then((entries) =>
      entries.map((entry) => ({
        ...entry,
        _title: normalize(entry.title),
        // Names the entry also goes by, which count as its title for ranking.
        _names: [normalize(entry.title), ...(entry.keywords ? [normalize(entry.keywords)] : [])],
        _text: normalize(`${entry.title} ${entry.keywords ?? ''} ${entry.detail ?? ''}`),
      })),
    );
  return index;
}

/**
 * Every word of the query must appear somewhere in the entry. Matches in the
 * title outrank matches only in the description, a whole-title match outranks
 * everything, and the kind of entry breaks ties.
 */
function search(entries, query) {
  const phrase = normalize(query);
  const terms = phrase.split(' ').filter(Boolean);
  if (terms.length === 0) return [];

  const scored = [];
  for (const entry of entries) {
    if (!terms.every((term) => entry._text.includes(term))) continue;

    let score = KINDS[entry.type].weight;
    if (entry._names.includes(phrase)) score += 100;
    else if (entry._names.some((name) => name.startsWith(phrase))) score += 50;
    else if (entry._names.some((name) => name.includes(phrase))) score += 25;

    const words = entry._title.split(' ');
    for (const term of terms) {
      if (words.some((word) => word.startsWith(term))) score += 5;
      else if (entry._title.includes(term)) score += 2;
    }

    scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length)
    .slice(0, LIMIT)
    .map(({ entry }) => entry);
}

function setActive(next) {
  const options = list.children;
  if (options[active]) options[active].setAttribute('aria-selected', 'false');
  active = next;
  const option = options[active];
  if (option) {
    option.setAttribute('aria-selected', 'true');
    option.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', option.id);
  } else {
    input.removeAttribute('aria-activedescendant');
  }
}

function render(query) {
  list.replaceChildren(
    ...results.map((entry, i) => {
      const option = document.createElement('li');
      option.id = `search-option-${i}`;
      option.className = 'search__option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.url = entry.url;

      const kind = document.createElement('span');
      kind.className = 'search__kind';
      kind.textContent = KINDS[entry.type].label;

      const title = document.createElement('span');
      title.className = 'search__title';
      if (entry.color) {
        // A live swatch: the token's own variable, so it follows the theme.
        const swatch = document.createElement('span');
        swatch.className = 'search__swatch';
        swatch.style.background = `var(${entry.title})`;
        swatch.setAttribute('aria-hidden', 'true');
        title.append(swatch);
      }
      title.append(entry.title);

      const detail = document.createElement('span');
      detail.className = 'search__detail';
      detail.textContent = entry.detail ?? '';

      option.append(kind, title, detail);
      return option;
    }),
  );

  const expanded = results.length > 0;
  input.setAttribute('aria-expanded', String(expanded));
  setActive(expanded ? 0 : -1);

  if (!query.trim()) {
    status.textContent = '';
  } else if (results.length === 0) {
    status.textContent = `No results for “${query.trim()}”`;
  } else {
    const more = results.length === LIMIT ? ' — showing the best 50' : '';
    status.textContent = `${results.length} result${results.length === 1 ? '' : 's'}${more}`;
  }
}

async function update() {
  const query = input.value;
  const entries = await load();
  // A slow first load can finish after the user typed more; render the latest.
  if (query !== input.value) return;
  results = search(entries, query);
  render(query);
}

function go(url, { newTab = false } = {}) {
  const target = new URL(resolve(url));
  if (newTab) {
    window.open(target.href, '_blank', 'noopener');
    return;
  }
  if (target.pathname === location.pathname) {
    // Same page: close first, so focus does not return to the opener and pull
    // the page back up after the jump.
    modal.close();
    location.hash = target.hash;
  } else {
    location.assign(target.href);
  }
}

function open() {
  if (modal.open) return;
  modal.show();
  void load();
}

input.addEventListener('input', () => void update());

input.addEventListener('keydown', (event) => {
  const count = list.children.length;
  if (event.key === 'ArrowDown' && count) {
    event.preventDefault();
    setActive((active + 1) % count);
  } else if (event.key === 'ArrowUp' && count) {
    event.preventDefault();
    setActive((active - 1 + count) % count);
  } else if (event.key === 'Enter' && results[active]) {
    event.preventDefault();
    go(results[active].url, { newTab: event.metaKey || event.ctrlKey });
  }
});

list.addEventListener('click', (event) => {
  const option = event.target.closest('[role="option"]');
  if (option) go(option.dataset.url, { newTab: event.metaKey || event.ctrlKey });
});

list.addEventListener('mousemove', (event) => {
  const option = event.target.closest('[role="option"]');
  const i = option ? [...list.children].indexOf(option) : -1;
  if (i !== -1 && i !== active) setActive(i);
});

// Focus the input once the dialog is showing. The dialog's own initial focus
// lands on its close button, which comes first.
modal.addEventListener('qds-open', () => {
  input.focus();
  input.select();
});

opener.addEventListener('click', open);
opener.hidden = false;

document.addEventListener('keydown', (event) => {
  // composedPath()[0], not target: a keypress inside qds-input's shadow root is
  // retargeted to the host, which is not an input.
  const origin = event.composedPath()[0];
  const typing =
    origin instanceof HTMLElement &&
    (origin.isContentEditable || origin.matches('input, textarea, select'));
  if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    open();
  } else if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    open();
  }
});
