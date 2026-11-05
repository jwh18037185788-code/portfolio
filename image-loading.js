// Use the browser's native image request, preserving its cache and decoder path.
// The image remains detached until the complete original has loaded and decoded.
window.loadPortfolioOriginal = async function(url, {signal, onPhase = () => {}} = {}) {
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'high';
  image.draggable = false;
  image.dataset.originalSrc = url;
  const dispose = () => image.removeAttribute('src');
  let abort;
  try {
    signal?.throwIfAborted();
    onPhase('downloading');
    const cancelled = new Promise((_, reject) => {
      abort = () => {
        dispose();
        reject(new DOMException('Image request cancelled', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, {once:true});
    });
    const downloaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Original image request failed'));
      image.src = url;
    });
    await Promise.race([downloaded, cancelled]);
    signal?.throwIfAborted();
    onPhase('decoding');
    try {
      await Promise.race([image.decode(), cancelled]);
      image.dataset.decodeMode = 'predecoded';
    } catch (error) {
      // A successful load is distinct from decode()'s promise to retain a fully
      // decoded bitmap. Chrome can reject that promise for very large images.
      // Let its normal, size-aware paint path decode the already loaded original
      // synchronously instead. Never bypass a request error or cancellation.
      if (error.name !== 'EncodingError' || !image.complete || !image.naturalWidth || !image.naturalHeight) throw error;
      signal?.throwIfAborted();
      image.decoding = 'sync';
      image.dataset.decodeMode = 'native-paint';
    }
    signal?.throwIfAborted();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
    return {image, dispose};
  } catch (error) {
    dispose();
    throw error;
  } finally {
    image.onload = null;
    image.onerror = null;
    if (abort) signal?.removeEventListener('abort', abort);
  }
};

window.portfolioCover = function(src, alt, index) {
  const key = src.split('/').pop().split('?')[0];
  const cover = window.portfolioCovers?.[key];
  const prefix = src.slice(0, src.indexOf('assets/'));
  const escape = text => String(text).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const sizes = '(max-width:700px) calc(100vw - 100px), (max-width:1000px) calc(46vw - 60px), calc(30.667vw - 72px)';
  const columns = innerWidth > 1000 ? 3 : innerWidth > 700 ? 2 : 1;
  const eager = index < columns;
  const attrs = cover ? `width="${cover.width}" height="${cover.height}" srcset="${cover.variants.map(v=>escape(prefix+v.src)+' '+v.width+'w').join(', ')}" sizes="${sizes}"` : '';
  const url = cover ? prefix + cover.variants[1].src : src;
  return `<span class="gallery-tilt-frame cover-pending" aria-busy="true"><span class="cover-skeleton" aria-hidden="true"></span><img src="${escape(url)}" ${attrs} alt="${escape(alt)}" loading="${eager?'eager':'lazy'}" fetchpriority="${index===0?'high':'auto'}" decoding="async" draggable="false"><span class="cover-load-error" hidden>封面加载失败</span></span>`;
};

// Intrinsic dimensions reserve the bitmap bounds before network loading completes.
const portfolioPreviewDimensions = {
  "assets/orbit/cover1.jpg": [
    960,
    540
  ],
  "assets/orbit/cover2.jpg": [
    960,
    540
  ],
  "assets/orbit/cover3.jpg": [
    960,
    532
  ],
  "assets/orbit/cover4.jpg": [
    960,
    540
  ],
  "assets/orbit/cover5.jpg": [
    960,
    540
  ],
  "assets/orbit/cover6.jpg": [
    960,
    540
  ],
  "assets/orbit/cover7.jpg": [
    960,
    540
  ],
  "assets/orbit/cover8.jpg": [
    960,
    540
  ],
  "assets/sprint/card-after.jpg": [
    2400,
    1383
  ],
  "assets/sprint/card-before.jpg": [
    2400,
    1287
  ],
  "assets/sprint/catdesk.jpg": [
    2400,
    1246
  ],
  "assets/sprint/codex.jpg": [
    2400,
    1071
  ],
  "assets/sprint/demo.jpg": [
    2400,
    2139
  ],
  "assets/sprint/figma.jpg": [
    2400,
    1863
  ],
  "assets/sprint/honey.png": [
    12970,
    4926
  ],
  "assets/sprint/kangaroo-1.png": [
    1256,
    2720
  ],
  "assets/sprint/kangaroo-2.png": [
    1256,
    2720
  ],
  "assets/sprint/kangaroo-3.png": [
    1500,
    3248
  ],
  "assets/sprint/mobile.jpg": [
    2400,
    1720
  ],
  "assets/sprint/nocode-9e2f5121f1.png": [
    7680,
    3934
  ],
  "assets/sprint/overview.jpg": [
    2400,
    3046
  ],
  "assets/sprint/problem.jpg": [
    2400,
    2139
  ],
  "assets/sprint/reflection.jpg": [
    2400,
    4743
  ],
  "assets/sprint/review-4df9aea964.jpg": [
    2400,
    11317
  ],
  "assets/sprint/solution-codex.jpg": [
    2399,
    2828
  ],
  "assets/sprint/solution-figma.jpg": [
    2400,
    3447
  ],
  "assets/task-agent-preview.png": [
    1440,
    960
  ]
};

// Insert into an existing, size-reserving image frame, including dynamic panels.
window.portfolioImagePlaceholder = function(imageMarkup) {
  const source = imageMarkup.match(/\bsrc="([^"]+)"/)?.[1] || '';
  const dimensions = portfolioPreviewDimensions[source.split('?')[0].slice(source.indexOf('assets/'))];
  if (dimensions && !/\bwidth=/.test(imageMarkup)) {
    imageMarkup = imageMarkup.replace('<img ', `<img width="${dimensions[0]}" height="${dimensions[1]}" `);
  }
  return `<span class="cover-skeleton" aria-hidden="true"></span>${imageMarkup}<span class="home-image-error" hidden>图片加载失败，请刷新后重试</span>`;
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.cover-pending img').forEach(image => {
    const frame = image.parentElement;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      frame.classList.remove('cover-pending');
      frame.classList.add('cover-failed');
      frame.setAttribute('aria-busy','false');
      frame.querySelector('.cover-load-error').hidden = false;
    };
    const ready = async () => {
      if (settled) return;
      try {
        await image.decode();
        if (settled) return;
        settled = true;
        frame.classList.remove('cover-pending');
        frame.setAttribute('aria-busy','false');
      } catch { fail(); }
    };
    image.addEventListener('load', ready, {once:true});
    image.addEventListener('error', fail, {once:true});
    if (image.complete) image.naturalWidth ? ready() : fail();
  });

  if (document.body.classList.contains('is-visual-page')) return;
  const main = document.querySelector('#main');
  if (!main) return;
  const prepared = new WeakSet();
  function fitSkeleton(frame) {
    if (!frame.clientWidth || !frame.clientHeight) return;
    const image = frame.querySelector('img');
    const skeleton = frame.querySelector('.cover-skeleton');
    const naturalWidth = image.naturalWidth || Number(image.getAttribute('width'));
    const naturalHeight = image.naturalHeight || Number(image.getAttribute('height'));
    if (!naturalWidth || !naturalHeight) return;
    const style = getComputedStyle(image), frameStyle = getComputedStyle(frame);
    const boxWidth = parseFloat(style.width), boxHeight = parseFloat(style.height);
    const frameWidth = parseFloat(frameStyle.width), frameHeight = parseFloat(frameStyle.height);
    if (!boxWidth || !boxHeight) return;
    let width = boxWidth, height = boxHeight;
    if (style.objectFit === 'contain' || style.objectFit === 'scale-down' || style.objectFit === 'none') {
      const scale = style.objectFit === 'none' ? 1 : Math.min(boxWidth/naturalWidth, boxHeight/naturalHeight, style.objectFit === 'scale-down' ? 1 : Infinity);
      width = naturalWidth*scale; height = naturalHeight*scale;
    }
    const position = (value, available) => {
      if (value?.endsWith('%')) return available*parseFloat(value)/100;
      if (value?.endsWith('px')) return parseFloat(value);
      return available/2;
    };
    const [posX,posY] = style.objectPosition.split(/\s+/);
    const x = image.offsetLeft + position(posX, boxWidth-width);
    const y = image.offsetTop + position(posY, boxHeight-height);
    const left = Math.max(0,x), top = Math.max(0,y);
    const right = Math.min(frameWidth,x+width), bottom = Math.min(frameHeight,y+height);
    Object.assign(skeleton.style, {left:`${left}px`,top:`${top}px`,width:`${Math.max(0,right-left)}px`,height:`${Math.max(0,bottom-top)}px`});
  }
  const skeletonResize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
    entries.forEach(entry => {
      const frame = entry.target.closest('.home-image');
      if (frame) fitSkeleton(frame);
    });
  });
  const imageVisibility = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('media-in-view', entry.isIntersecting));
  }, {rootMargin:'200px'});
  function prepareFrame(frame) {
    if (prepared.has(frame)) return;
    prepared.add(frame);
    const image = frame.querySelector('img');
    if (!image) return;
    fitSkeleton(frame);
    skeletonResize?.observe(frame);
    skeletonResize?.observe(image);
    if (imageVisibility) imageVisibility.observe(frame);
    else frame.classList.add('media-in-view');
    let settled = false, decoding = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      imageVisibility?.unobserve(frame);
      skeletonResize?.unobserve(frame); skeletonResize?.unobserve(image);
      frame.classList.remove('media-pending');
      frame.classList.add('media-failed');
      frame.setAttribute('aria-busy', 'false');
      frame.querySelector('.home-image-error').hidden = false;
    };
    const ready = async () => {
      if (settled || decoding) return;
      decoding = true;
      try {
        fitSkeleton(frame);
        try {
          await image.decode();
        } catch (error) {
          // Keep the same Chrome large-image fallback used by the original viewer.
          if (error.name !== 'EncodingError' || !image.complete || !image.naturalWidth || !image.naturalHeight) throw error;
          image.decoding = 'sync';
        }
        if (settled) return;
        settled = true;
        imageVisibility?.unobserve(frame);
        skeletonResize?.unobserve(frame); skeletonResize?.unobserve(image);
        frame.classList.remove('media-pending');
        frame.setAttribute('aria-busy', 'false');
      } catch { fail(); }
    };
    image.addEventListener('load', ready, {once:true});
    image.addEventListener('error', fail, {once:true});
    if (image.complete) image.naturalWidth ? ready() : fail();
  }
  function prepareWithin(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('.home-image')) prepareFrame(root);
    root.querySelectorAll('.home-image').forEach(prepareFrame);
  }
  prepareWithin(main);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(prepareWithin));
  }).observe(main, {childList:true, subtree:true});
});
