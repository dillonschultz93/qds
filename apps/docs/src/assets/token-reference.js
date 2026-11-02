/**
 * The token reference on the Tokens page: a qds-tabs per tier (primitive and
 * semantic; component tokens are on their components' pages), and a qds-input
 * that filters every tier at once.
 *
 * Two jobs:
 *
 *   - A link to a token (#qds-semantic-color-…, from search or anywhere else)
 *     opens the tab holding it and scrolls to its row. Without this, the row is
 *     in a hidden panel and the link appears to do nothing.
 *   - Typing in the filter hides the rows that do not match, in every tier, and
 *     shows each tab's count of matches.
 */

const tabs = document.getElementById('token-tiers');
const filter = document.getElementById('token-filter');
const status = document.getElementById('token-filter-status');

const panels = [...tabs.querySelectorAll('qds-tab-panel')];
const tabCounts = [...tabs.querySelectorAll('qds-tab .tab-count')];
const rows = [...tabs.querySelectorAll('tbody tr')].map((row) => ({
  row,
  text: row.textContent.toLowerCase().replace(/\s+/g, ' '),
}));

/**
 * A component token's address from before component tokens moved to their
 * components' pages: forward it to that component's Tokens tab. The longest
 * matching set wins, so a set named like the start of another cannot claim its
 * tokens.
 */
function forwardComponentToken(id) {
  if (!id.startsWith('qds-component-')) return false;
  const links = [...document.querySelectorAll('[data-token-sets]')].flatMap((link) =>
    link.dataset.tokenSets.split(' ').map((set) => ({ set, href: link.getAttribute('href') })),
  );
  const match = links
    .filter(({ set }) => id.startsWith(`qds-component-${set}-`))
    .sort((a, b) => b.set.length - a.set.length)[0];
  if (!match) return false;
  location.replace(`${match.href}#${id}`);
  return true;
}

/** Open the tab holding the hash's target row, then bring the row into view. */
async function revealTarget() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (forwardComponentToken(id)) return;
  const target = id ? document.getElementById(id) : null;
  const panel = target?.closest('qds-tab-panel');
  if (!panel) return;
  tabs.selectedIndex = panels.indexOf(panel);
  await tabs.updateComplete;
  // The row was hidden when the browser tried to scroll to it.
  target.scrollIntoView({ block: 'center' });
}

function applyFilter() {
  const words = filter.value.toLowerCase().trim().replace(/^--/, '').split(/\s+/).filter(Boolean);
  const perPanel = panels.map(() => 0);

  for (const { row, text } of rows) {
    const show = words.every((word) => text.includes(word));
    row.hidden = !show;
    if (show) perPanel[panels.indexOf(row.closest('qds-tab-panel'))]++;
  }

  // A category whose rows are all hidden loses its heading and table too.
  for (const heading of tabs.querySelectorAll('.token-category')) {
    const table = heading.nextElementSibling;
    const any = table.querySelector('tbody tr:not([hidden])');
    heading.hidden = !any;
    table.hidden = !any;
  }

  perPanel.forEach((count, i) => (tabCounts[i].textContent = String(count)));
  const total = perPanel.reduce((sum, count) => sum + count, 0);

  if (words.length === 0) {
    status.textContent = '';
    return;
  }
  status.textContent =
    total === 0 ? 'No tokens match.' : `${total} token${total === 1 ? '' : 's'} match.`;

  // If the open tier has no matches but another does, switch to it.
  if (total > 0 && perPanel[tabs.selectedIndex] === 0) {
    tabs.selectedIndex = perPanel.findIndex((count) => count > 0);
  }
}

filter.addEventListener('qds-input', applyFilter);
window.addEventListener('hashchange', () => void revealTarget());

// After the tabs have hydrated and chosen their initial tab.
customElements.whenDefined('qds-tabs').then(async () => {
  await tabs.updateComplete;
  // qds-tabs resolves its first selection one update after hydrating.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await revealTarget();
});
