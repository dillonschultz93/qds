/**
 * On a component's Tokens tab: once the page has rendered, bring a linked
 * token's row into view. The browser scrolls to it on load already; this only
 * matters when the page is reached by forwarding from the Tokens page, where the
 * row may not have been laid out yet when the scroll happened.
 */

const id = decodeURIComponent(location.hash.slice(1));
const row = id ? document.getElementById(id) : null;
if (row) requestAnimationFrame(() => row.scrollIntoView({ block: 'center' }));
