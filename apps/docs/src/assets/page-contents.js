/**
 * "On this page": marks the section being read. The list itself is built
 * at build time; this only moves aria-current as the reader scrolls.
 *
 * The current section is the last one whose heading has scrolled past the top
 * fifth of the window — so a short final section still becomes current once
 * the page reaches the bottom.
 */

const contents = document.querySelector('.page-contents');

if (contents) {
  const links = [...contents.querySelectorAll('a')];
  const headings = links.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);

  const update = () => {
    const line = window.innerHeight * 0.2;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = 0;
    headings.forEach((heading, i) => {
      if (heading.getBoundingClientRect().top <= line) current = i;
    });
    if (atBottom) current = headings.length - 1;
    links.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  let pending = false;
  window.addEventListener(
    'scroll',
    () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        update();
      });
    },
    { passive: true },
  );
  update();
}
