/* Split Text animation adapted from Vue Bits, Copyright (c) 2025 David Haz.
 * Source: https://vue-bits.dev/text-animations/split-text
 * License: assets/vendor/gsap/vue-bits-LICENSE.md
 * Keep the official GSAP SplitText / fromTo animation and preview defaults.
 * The scroll lifecycle is adapted to play only on downward entry.
 */
(() => {
  if (document.body.classList.contains('is-visual-page')) return;
  if (!window.gsap || !window.SplitText || !window.ScrollTrigger) return;

  // Explicit allowlist: only the eleven titles marked in the supplied screenshots.
  const selectors = [
    '.sprint-lead h2',
    '#sprint-goals .sprint-chapter-head h2',
    '#judgement > .sprint-chapter-head h2',
    '#judgement > .sprint-challenge:first-of-type .sprint-challenge-head h3',
    '#task-states .sprint-challenge-head h3',
    '#sprint-reflection .sprint-chapter-head h2',
    '#ai h2',
    '.ai-case:not(.reverse) .ai-copy h3',
    '.ai-case.reverse .ai-copy h3',
    '#selected-work .visual-preview-heading h2',
    '#about h2'
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let dispose = () => {};

  async function init() {
    await document.fonts.ready;
    dispose();
    if (reducedMotion.matches) return;

    const { gsap, SplitText, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    let previousY = window.scrollY;
    const states = [];
    const show = state => {
      state.tween?.kill();
      gsap.set(state.chars, { opacity: 1, y: 0, clearProps: 'willChange' });
    };
    const play = state => {
      state.tween?.kill();
      state.armed = false;
      state.tween = gsap.fromTo(state.chars, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0,
        duration: 1.25, ease: 'power3.out', stagger: 0.05,
        willChange: 'transform, opacity', force3D: true,
        onComplete: () => gsap.set(state.chars, { clearProps: 'willChange' })
      });
    };

    selectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (!el) return;
      const originalClass = el.className;
      el.classList.add('home-split-title');
      const split = new SplitText(el, {
        type: 'chars', smartWrap: true, autoSplit: false,
        linesClass: 'split-line', wordsClass: 'split-word',
        charsClass: 'split-char', reduceWhiteSpace: false
      });
      const state = { el, split, chars: split.chars, tween: null,
        armed: el.getBoundingClientRect().top >= window.innerHeight };
      states.push(state);
      if (state.armed) gsap.set(state.chars, { opacity: 0, y: 40 });
      state.trigger = ScrollTrigger.create({
        trigger: el, start: 'top 90%-=100px', end: 'bottom top',
        fastScrollEnd: true, anticipatePin: 0.4,
        onEnter: self => {
          if (self.direction === 1 && state.armed) play(state);
          else show(state);
        },
        onEnterBack: () => show(state),
        onLeave: () => show(state),
        onLeaveBack: () => show(state)
      });
      state.restore = () => { state.trigger.kill(); state.tween?.kill(); split.revert(); el.className = originalClass; };
    });

    // Returning upward always reveals the full title, including an in-flight tween.
    // Re-arm below the viewport so another downward visit can play again.
    const onScroll = () => {
      const y = window.scrollY;
      const upward = y < previousY;
      states.forEach(state => {
        const rect = state.el.getBoundingClientRect();
        if (upward) show(state);
        if (rect.top >= window.innerHeight) {
          state.armed = true;
          if (!upward) gsap.set(state.chars, { opacity: 0, y: 40 });
        }
      });
      previousY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    dispose = () => {
      window.removeEventListener('scroll', onScroll);
      states.forEach(state => state.restore());
    };
    ScrollTrigger.refresh();
  }

  reducedMotion.addEventListener('change', init);
  init();
})();
