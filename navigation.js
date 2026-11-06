// Run in <head>, before the parser reaches the static anchors. Defer just the
// first fragment jump until fonts and title layout are ready; never wait for images.
(() => {
  const root = document.documentElement;
  const entry = performance.getEntriesByType('navigation')[0];
  const hash = location.hash;
  const saved = history.state?.__jhuenScroll;
  const restorePosition = /^(?:back_forward|reload)$/.test(entry?.type) && saved?.hash === hash ? saved : null;
  let pending = /^#(?:work|about)$/.test(hash) || !!restorePosition;
  // A single owner for restoration: native restoration can otherwise run before
  // deferred fonts/title setup. BFCache already retains the live document.
  history.scrollRestoration = 'manual';
  const savePosition = () => history.replaceState({...history.state,
    __jhuenScroll: {x: scrollX, y: scrollY, hash: location.hash}}, '');
  const restoreURL = () => history.replaceState(history.state, '', location.pathname + location.search + hash);
  if (pending) {
    history.replaceState(history.state, '', location.pathname + location.search);
    root.dataset.navigationPending = '';
  }
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const layoutTop = element => {
    let top = 0;
    // Reveal animations translate the section visually; the anchor uses its
    // layout position so finishing that animation cannot move the reading point.
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };
  const fragmentTop = target => {
    const top = layoutTop(target);
    if (target.id === 'work') return top + target.clientTop; // Start below the cover divider.
    const inset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    return Math.max(0, top - inset);
  };
  const release = () => {
    delete root.dataset.navigationPending;
    root.dataset.navigationReady = 'true';
  };
  addEventListener('pagehide', () => {
    if (pending) {
      pending = false;
      restoreURL();
      release();
    } else savePosition();
  });
  document.addEventListener('DOMContentLoaded', async () => {
    // Restore a history entry's saved reading point, rather than forcing it
    // back to the URL's original anchor. A BFCache pageshow does not run this.
    if (!pending) return;
    try {
      await document.fonts.ready;
      try { await window.portfolioTitlesReady; }
      catch (error) { console.warn('Title animation setup failed; using the static anchor.', error); }
      await frame(); // Flush text-balance mutation observers and layout.
      if (!pending) return;
      const target = document.getElementById(hash.slice(1));
      pending = false; // Exactly one initial positioning operation per document.
      restoreURL(); // replaceState restores the fragment without native scrolling.
      if (restorePosition || target) {
        window.scrollTo({left: restorePosition?.x || 0,
          top: restorePosition ? restorePosition.y : fragmentTop(target), behavior: 'instant'});
        window.ScrollTrigger?.update();
      }
      await frame(); // Let reveal/visibility observers see the final viewport.
    } finally {
      if (pending) { pending = false; restoreURL(); }
      release();
    }
  }, {once: true});
  addEventListener('scrollend', () => { if (!pending) savePosition(); }, {passive: true});
  addEventListener('popstate', () => {
    if (pending) return;
    const position = history.state?.__jhuenScroll;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const top = position?.hash === location.hash ? position.y : target ? fragmentTop(target) : 0;
    if (Math.abs(scrollY - top) > 1 || Math.abs(scrollX - (position?.x || 0)) > 1) {
      window.scrollTo({left: position?.x || 0, top, behavior: 'instant'});
    }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    if (link.classList.contains('skip-link')) {
      target.tabIndex = -1;
      target.focus({preventScroll: true});
    }
    if (pending) { pending = false; release(); }
    if (location.hash !== url.hash) {
      savePosition();
      const state = {...history.state};
      delete state.__jhuenScroll;
      history.pushState(state, '', url.hash);
    }
    // Keep intentional same-page smooth navigation. CSS scrolling stays instant
    // so GSAP refresh and native history restoration cannot start smooth scrolls.
    window.scrollTo({top: fragmentTop(target),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
})();
