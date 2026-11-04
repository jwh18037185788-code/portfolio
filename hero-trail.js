(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const desktop = matchMedia('(min-width: 701px) and (any-hover: hover) and (any-pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.createElement('div');
  layer.className = 'hero-trail';
  layer.setAttribute('aria-hidden', 'true');
  hero.append(layer);

  // Reference settings: 210 × 240, frequency 27 → 94.94px, exit starts at 600ms.
  // A critical spring solves x'' + 2ωx' + ω²x = 0 without a pause or overshoot.
  function createTimeline() {
    const changeAt = .6;
    const enterOmega = 9.233413476;
    const exitOmega = Math.sqrt(550);
    const enterScale = t => 1 - (1 + enterOmega * t) * Math.exp(-enterOmega * t);
    const exitStart = enterScale(changeAt);
    const velocity = enterOmega ** 2 * changeAt * Math.exp(-enterOmega * changeAt);
    const exitScale = t => (exitStart + (velocity + exitOmega * exitStart) * t) * Math.exp(-exitOmega * t);
    const samples = [];
    const step = 1 / 120;
    for (let t = 0; t < changeAt; t += step) samples.push({t, scale: enterScale(t)});
    samples.push({t: changeAt, scale: exitStart});
    for (let t = step; t < 1; t += step) {
      const scale = exitScale(t);
      samples.push({t: changeAt + t, scale: scale <= .005 ? 0 : scale});
      if (scale <= .005) break;
    }
    const duration = samples[samples.length - 1].t;
    const colorAt = samples.find(s => s.t > changeAt && s.scale < .02).t / duration;
    return {
      samples,
      duration: duration * 1000,
      scaleFrames: samples.map(s => ({offset: s.t / duration, transform: `scale(${s.scale})`})),
      colorFrames: [
        {offset: 0, opacity: 1},
        {offset: colorAt, opacity: 1},
        {offset: Math.min(colorAt + .0001, 1), opacity: 0},
        {offset: 1, opacity: 0}
      ]
    };
  }
  const motion = createTimeline();
  const spacing = 200 - (27 - 1) * 198 / 49;
  const assets = [];
  const active = new Map();
  let next = 0;
  let lastPoint = null;
  let pending = null;
  let bounds = null;
  let frameId = 0;
  let loading = false;
  const assetVersion = '90e3ff4df9';

  function enabled() {
    return desktop.matches && !reducedMotion.matches;
  }

  function prepare() {
    if (!enabled() || loading || (assets.length && assets.every(asset => asset.ready || asset.failed))) return;
    loading = true;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    for (let number = assets.length + 1; number <= 12; number += 1) {
      const image = new Image();
      const url = `./assets/hero-trail/optimized/${number}-2x.webp?v=${assetVersion}`;
      const asset = {image, url, ready: false, failed: false, tone: '#777777', number};
      assets.push(asset);
    }
    async function load(asset) {
      const {image, number, url} = asset;
      image.decoding = 'async';
      image.fetchPriority = number <= 3 ? 'high' : 'low';
      image.srcset = `${url} 2x, ./assets/hero-trail/optimized/${number}-3x.webp?v=${assetVersion} 3x`;
      image.src = url;
      try {
        await image.decode();
        // Match the tiny final image with its own average color, not a generic overlay.
        if (context) {
          try {
            context.clearRect(0, 0, 16, 16);
            context.drawImage(image, 0, 0, 16, 16);
            const pixels = context.getImageData(0, 0, 16, 16).data;
            const rgb = [0, 0, 0];
            for (let p = 0; p < pixels.length; p += 4) {
              rgb[0] += pixels[p]; rgb[1] += pixels[p + 1]; rgb[2] += pixels[p + 2];
            }
            asset.tone = `rgb(${rgb.map(channel => Math.round(channel / 256)).join(',')})`;
          } catch { /* The local image still works if canvas sampling is unavailable. */ }
        }
        asset.ready = true;
      } catch { asset.failed = true; }
      if (pending && enabled() && !frameId) frameId = requestAnimationFrame(flush);
    }
    // Prepare the beginning of the existing sequence first, then decode two at a time.
    // Keeping all entries in place preserves the 1 → 12 order as loading completes.
    const remaining = assets.filter(asset => !asset.ready && !asset.failed);
    Promise.all(remaining.splice(0, 3).map(load)).then(async () => {
      const worker = async () => {
        while (remaining.length && enabled()) await load(remaining.shift());
      };
      await Promise.all([worker(), worker()]);
    }).finally(() => { loading = false; });
  }

  function clear() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    pending = null;
    lastPoint = null;
    bounds = null;
    active.forEach(animations => animations.forEach(animation => animation.cancel()));
    active.clear();
    layer.replaceChildren();
  }

  function reveal(x, y) {
    if (active.size >= 48) return false;
    for (let attempts = 0; attempts < assets.length && assets[next].failed; attempts += 1) {
      next = (next + 1) % assets.length;
    }
    const asset = assets[next];
    if (!asset?.ready) return false;
    const card = document.createElement('div');
    card.className = 'hero-trail-card';
    card.dataset.imageIndex = asset.number;
    card.style.transform = `translate3d(${x - 105}px, ${y - 120}px, 0)`;
    const surface = document.createElement('div');
    surface.className = 'hero-trail-surface';
    surface.style.backgroundColor = asset.tone;
    const image = asset.image.cloneNode();
    image.className = 'hero-trail-image';
    image.alt = '';
    image.draggable = false;
    surface.append(image);
    card.append(surface);
    layer.append(card);
    const options = {duration: motion.duration, easing: 'linear', fill: 'both'};
    const scale = surface.animate(motion.scaleFrames, options);
    const color = image.animate(motion.colorFrames, options);
    active.set(card, [scale, color]);
    scale.onfinish = () => { active.delete(card); card.remove(); };
    next = (next + 1) % assets.length;
    return true;
  }

  function flush() {
    frameId = 0;
    if (!pending || !enabled()) return;
    const point = pending;
    pending = null;
    if (lastPoint && Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) <= spacing) return;
    if (reveal(point.x, point.y)) lastPoint = point;
    else pending = point;
  }

  hero.addEventListener('pointerenter', () => { bounds = hero.getBoundingClientRect(); });
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !enabled()) return;
    if (event.target.closest('a, button, summary')) {
      pending = null;
      lastPoint = null;
      return;
    }
    prepare();
    if (!bounds) bounds = hero.getBoundingClientRect();
    pending = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    if (!frameId) frameId = requestAnimationFrame(flush);
  }, {passive: true});

  hero.addEventListener('pointerleave', clear);
  window.addEventListener('scroll', () => {
    if (active.size || pending || frameId || bounds) clear();
  }, {passive: true});
  window.addEventListener('resize', clear, {passive: true});
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  desktop.addEventListener('change', () => { clear(); prepare(); });
  reducedMotion.addEventListener('change', () => { clear(); prepare(); });
  prepare();
})();
