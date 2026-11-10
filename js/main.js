/* =========================================================
   Arsyad Rizantha — portfolio interactions
   GSAP + ScrollTrigger + Lenis drive the motion layer.
   Everything degrades: no JS libs or reduced motion
   => static, fully readable page with working controls.
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasLibs = !!(window.gsap && window.ScrollTrigger);
  const motion = hasLibs && !reduce;

  root.classList.add('anim-ready');
  if (!motion) root.classList.remove('anim');
  if (hasLibs) gsap.registerPlugin(ScrollTrigger);

  let lenis = null;

  /* ---------------- Text splitting ---------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    const chars = [];
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
      chars.push(s);
    }
    return chars;
  }

  function splitWordsMask(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const inner = [];
    words.forEach((w, i) => {
      const mask = document.createElement('span');
      mask.className = 'wmask';
      const s = document.createElement('span');
      s.textContent = w;
      mask.appendChild(s);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      inner.push(s);
    });
    return inner;
  }

  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    return words.map((w, i) => {
      const s = document.createElement('span');
      s.className = 'word';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
  }

  /* ---------------- Clock + frame counter ---------------- */
  const clockEls = $$('[data-clock]');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
  const tickClock = () => { const t = fmt.format(new Date()); clockEls.forEach(e => (e.textContent = t)); };
  tickClock();
  setInterval(tickClock, 10000);

  const frameEl = $('[data-frame]');
  if (frameEl && !reduce) {
    let heroVisible = true;
    new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe($('.hero'));
    const loop = (t) => {
      if (heroVisible) frameEl.textContent = String(Math.floor(t / 1000 * 30) % 10000).padStart(4, '0');
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------- Nav: hide on scroll, theme over dark sections ---------------- */
  const nav = $('[data-nav]');
  const darkSections = $$('.projects, .contact');
  const navLinks = $$('.nav__links a');
  let lastY = 0;
  function onScroll(y) {
    const dir = y > lastY ? 1 : -1;
    lastY = y;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', dir === 1 && y > 240 && !root.classList.contains('menu-open'));
    const probe = 36;
    const dark = darkSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    document.body.classList.toggle('nav-dark', dark);
    const mid = innerHeight * 0.4;
    navLinks.forEach(a => {
      const sec = $(a.getAttribute('href'));
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      a.classList.toggle('is-active', r.top <= mid && r.bottom > mid);
    });
  }

  /* ---------------- Mobile menu ---------------- */
  const menu = $('#menu');
  const toggle = $('.nav__toggle');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    $('.nav__toggle-text').textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      lenis && lenis.stop();
      if (motion) {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.inOut' });
        gsap.fromTo($$('nav a, .btn', menu), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .8, stagger: .05, ease: 'expo.out', delay: .25 });
      }
    } else {
      lenis && lenis.start();
      if (motion) gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .6, ease: 'expo.inOut', onComplete: () => (menu.hidden = true) });
      else menu.hidden = true;
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });

  /* ---------------- Anchor links (smooth via Lenis when present) ---------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -20, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ---------------- Skills <-> evidence ---------------- */
  const skillWrap = $('.skills__groups');
  const evidence = $('.evidence');
  const evItems = $$('.evidence__list li');
  const status = $('.evidence__status');
  const ctxNames = Object.fromEntries(evItems.map(li => [li.dataset.ctx, li.textContent.trim()]));
  let pinnedSkill = null;

  function showSkill(btn) {
    $$('.skill').forEach(b => b.classList.toggle('is-active', b === btn));
    skillWrap.classList.toggle('has-active', !!btn);
    evidence.classList.toggle('has-active', !!btn);
    if (!btn) {
      evItems.forEach(li => li.classList.remove('is-on'));
      status.textContent = 'Select a skill to see where I used it.';
      return;
    }
    const used = btn.dataset.used.split(/\s+/);
    evItems.forEach(li => li.classList.toggle('is-on', used.includes(li.dataset.ctx)));
    status.textContent = `${btn.textContent.trim()}: ${used.map(u => ctxNames[u]).join('; ')}.`;
  }
  $$('.skill').forEach(btn => {
    btn.addEventListener('mouseenter', () => showSkill(btn));
    btn.addEventListener('focus', () => showSkill(btn));
    btn.addEventListener('mouseleave', () => showSkill(pinnedSkill));
    btn.addEventListener('blur', () => showSkill(pinnedSkill));
    btn.addEventListener('click', () => { pinnedSkill = pinnedSkill === btn ? null : btn; showSkill(pinnedSkill || btn); btn.setAttribute('aria-pressed', String(pinnedSkill === btn)); $$('.skill').forEach(b => b !== btn && b.removeAttribute('aria-pressed')); });
  });
  evItems.forEach(li => {
    li.addEventListener('mouseenter', () => {
      const ctx = li.dataset.ctx;
      $$('.skill').forEach(b => b.classList.toggle('is-active', b.dataset.used.split(/\s+/).includes(ctx)));
      skillWrap.classList.add('has-active');
      evidence.classList.add('has-active');
      evItems.forEach(x => x.classList.toggle('is-on', x === li));
    });
    li.addEventListener('mouseleave', () => showSkill(pinnedSkill));
  });

  /* ---------------- Image enhancement preview ---------------- */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Dusk over the Madura Strait, with a cable-stayed bridge: lots of fine
  // detail (cables, stars, ripples) so the difference after enhancement reads.
  function drawScene(ctx, w, h) {
    const r = rng(7);
    const sky = ctx.createLinearGradient(0, 0, 0, h * .68);
    sky.addColorStop(0, '#0B1534'); sky.addColorStop(.55, '#2A3B72'); sky.addColorStop(1, '#F2A541');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(237,239,242,${.3 + r() * .7})`; ctx.fillRect(r() * w, r() * h * .4, 1.4, 1.4); }
    ctx.fillStyle = '#FFD683'; ctx.beginPath(); ctx.arc(w * .68, h * .64, 42, 0, Math.PI * 2); ctx.fill();
    const sea = ctx.createLinearGradient(0, h * .68, 0, h);
    sea.addColorStop(0, '#22336A'); sea.addColorStop(1, '#0B1534');
    ctx.fillStyle = sea; ctx.fillRect(0, h * .68, w, h * .32);
    for (let i = 0; i < 60; i++) {
      const y = h * .69 + r() * h * .3; const len = 10 + r() * 50; const x = w * .68 - len / 2 + (r() - .5) * 120 * (1 + (y - h * .68) / 60);
      ctx.fillStyle = `rgba(255,200,110,${.25 + r() * .5})`; ctx.fillRect(x, y, len, 1.5);
    }
    ctx.fillStyle = '#0B1534';
    ctx.beginPath(); ctx.moveTo(0, h * .68); ctx.lineTo(0, h * .64); ctx.lineTo(60, h * .655); ctx.lineTo(110, h * .66); ctx.lineTo(130, h * .68); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, h * .68); ctx.lineTo(w, h * .645); ctx.lineTo(w - 70, h * .66); ctx.lineTo(w - 120, h * .68); ctx.fill();
    const deck = h * .655;
    ctx.fillRect(0, deck, w, 5);
    [w * .32, w * .62].forEach(px => {
      ctx.fillRect(px - 9, h * .34, 5, deck - h * .34 + 30);
      ctx.fillRect(px + 4, h * .34, 5, deck - h * .34 + 30);
      ctx.fillRect(px - 9, h * .45, 18, 4);
      ctx.strokeStyle = 'rgba(11,21,52,.9)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 12; i++) {
        const top = h * .35 + i * 3.2;
        ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px - i * 15, deck); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px + i * 15, deck); ctx.stroke();
      }
    });
    for (let x = 6; x < w; x += 22) { ctx.fillRect(x, deck + 5, 3, 22); }
  }

  function initEnhance(fig) {
    const after = $('.enh__after', fig), before = $('.enh__before', fig), range = $('.enh__range', fig), box = $('.enh', fig);
    if (!after || after.dataset.ready) return;
    after.dataset.ready = '1';
    const w = after.width, h = after.height;
    drawScene(after.getContext('2d'), w, h);
    const small = document.createElement('canvas');
    small.width = 80; small.height = 54;
    const sctx = small.getContext('2d');
    sctx.drawImage(after, 0, 0, small.width, small.height);
    const img = sctx.getImageData(0, 0, small.width, small.height);
    const r = rng(3);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - .5) * 46;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    sctx.putImageData(img, 0, 0);
    const bctx = before.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(small, 0, 0, w, h);
    bctx.fillStyle = 'rgba(120,120,120,.12)'; bctx.fillRect(0, 0, w, h);
    const set = v => box.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    set(range.value);
    return { box, range, set };
  }

  const enhanceMain = initEnhance($('[data-enhance]'));

  /* ---------------- Case study overlay ---------------- */
  const overlay = $('.case-overlay');
  const projects = $$('.project');
  let lastOpener = null;
  let openId = null;
  const galleryObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); galleryObserver.unobserve(e.target); }
  }), { root: overlay, threshold: 0.15 });

  function fillCase(id) {
    const art = document.getElementById(id);
    $('[data-case-kind]', overlay).textContent = $('.project__kind', art).textContent;
    $('[data-case-title]', overlay).textContent = $('.project__title', art).textContent;
    $('[data-case-summary]', overlay).textContent = $('.project__summary', art).textContent;

    const media = $('[data-case-media]', overlay);
    media.textContent = '';
    const fig = $('.pv', art).cloneNode(true);
    fig.removeAttribute('data-tilt');
    fig.removeAttribute('style');
    $$('[style]', fig).forEach(n => n.removeAttribute('style'));
    fig.classList.add('is-playing');
    $$('[id]', fig).forEach(n => {
      const old = n.id; n.id = old + '-case';
      $$('[fill^="url(#' + old + ')"]', fig).forEach(f => f.setAttribute('fill', `url(#${n.id})`));
      $$(`label[for="${old}"]`, fig).forEach(l => l.setAttribute('for', n.id));
    });
    $$('canvas', fig).forEach(c => delete c.dataset.ready);
    media.appendChild(fig);
    if (fig.matches('[data-enhance]')) initEnhance(fig);

    $('[data-case-body]', overlay).innerHTML = $('.case', art).innerHTML;
    // Gallery images wipe in as they scroll into view inside the overlay
    $$('[data-case-body] .case-gallery figure', overlay).forEach(f => galleryObserver.observe(f));

    const links = $('[data-case-links]', overlay);
    links.textContent = '';
    $$('.project__actions > :not([data-open-case])', art).forEach(n => links.appendChild(n.cloneNode(true)));

    const idx = projects.indexOf(art);
    const next = projects[(idx + 1) % projects.length];
    const nextBtn = $('[data-case-next]', overlay);
    nextBtn.dataset.next = next.id;
    $('[data-case-next-title]', overlay).textContent = $('.project__title', next).textContent;
  }

  function animateCaseIn() {
    if (!motion) return;
    const title = $('[data-case-title]', overlay);
    const words = splitWordsMask(title);
    gsap.timeline({ delay: .35 })
      .from(words, { yPercent: 110, duration: 1, stagger: .05, ease: 'expo.out' })
      .from(['[data-case-kind]', '[data-case-summary]'].map(s => $(s, overlay)), { opacity: 0, y: 20, duration: .8, stagger: .08, ease: 'expo.out' }, '<.1')
      .from($('[data-case-media]', overlay), { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '<.1')
      .from($$('[data-case-body] section, [data-case-links], [data-case-next]', overlay), { opacity: 0, y: 40, duration: .9, stagger: .07, ease: 'expo.out' }, '<.4');
  }

  function openCase(id, origin) {
    if (!document.getElementById(id)) return;
    const switching = openId !== null;
    openId = id;
    fillCase(id);
    overlay.hidden = false;
    overlay.scrollTop = 0;
    $('main').inert = true; nav.inert = true;
    document.body.style.overflow = 'hidden';
    lenis && lenis.stop();
    history.replaceState(null, '', '#case-' + id);

    if (motion && !switching) {
      const x = origin ? origin.x : innerWidth / 2, y = origin ? origin.y : innerHeight / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      gsap.fromTo(overlay, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${rad}px at ${x}px ${y}px)`, duration: .9, ease: 'expo.inOut', onComplete: () => (overlay.style.clipPath = 'none') });
    }
    animateCaseIn();
    $('[data-close-case]', overlay).focus({ preventScroll: true });
  }

  function closeCase() {
    if (openId === null) return;
    const done = () => {
      overlay.hidden = true;
      $('main').inert = false; nav.inert = false;
      document.body.style.overflow = '';
      lenis && lenis.start();
      openId = null;
      history.replaceState(null, '', location.pathname + location.search);
      lastOpener && lastOpener.focus({ preventScroll: true });
    };
    if (motion) gsap.to(overlay, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut', onComplete: done });
    else done();
  }

  $$('[data-open-case]').forEach(btn => btn.addEventListener('click', e => {
    lastOpener = btn;
    openCase(btn.dataset.openCase, e.clientX ? { x: e.clientX, y: e.clientY } : null);
  }));
  $('[data-close-case]', overlay).addEventListener('click', closeCase);
  $('[data-case-next]', overlay).addEventListener('click', e => {
    const id = e.currentTarget.dataset.next;
    lastOpener = $(`[data-open-case="${id}"]`);
    if (motion) {
      gsap.to($('.case-overlay__inner', overlay), {
        opacity: 0, y: -40, duration: .45, ease: 'power2.in', onComplete: () => {
          openCase(id);
          gsap.fromTo($('.case-overlay__inner', overlay), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out' });
        }
      });
    } else openCase(id);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && openId) closeCase(); });

  /* ---------------- Preview playback only while visible ---------------- */
  const pvObserver = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-playing', e.isIntersecting)), { rootMargin: '0px 0px -10% 0px' });
  $$('.project .pv').forEach(p => pvObserver.observe(p));

  /* ---------------- Dancing character: shows once you scroll past the hero ---------------- */
  (() => {
    const box = $('[data-mascot]');
    if (!box) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('mascot-hidden') === '1'; } catch (e) { /* storage blocked */ }
    if (reduce || dismissed) { box.remove(); return; }

    const img = $('img', box);
    const probe = new Image();
    probe.onload = () => {
      img.src = probe.src;
      box.hidden = false;
      const hero = $('.hero');
      const update = () => box.classList.toggle('is-visible', scrollY > hero.offsetHeight * 0.65);
      addEventListener('scroll', update, { passive: true });
      update();
    };
    probe.onerror = () => box.remove(); // no GIF in place yet: show nothing
    probe.src = box.dataset.src;

    $('.mascot__close', box).addEventListener('click', () => {
      box.classList.remove('is-visible');
      try { sessionStorage.setItem('mascot-hidden', '1'); } catch (e) { /* storage blocked */ }
      setTimeout(() => box.remove(), 800);
    });
  })();

  /* ---------------- Static fallback ---------------- */
  if (!motion) {
    $$('.tracked').forEach(t => t.classList.add('is-detected'));
    addEventListener('scroll', () => onScroll(scrollY), { passive: true });
    onScroll(scrollY);
    if (location.hash.startsWith('#case-')) openCase(location.hash.slice(6));
    return;
  }

  /* =========================================================
     Motion layer
     ========================================================= */

  /* The loader hands off to the hero intro, so always start at the top
     (unless the link points at a section or a case study) */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------------- Lenis smooth scroll ---------------- */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.portfolioLenis = lenis; // handy for debugging in DevTools
  } else {
    addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  }

  /* ---------------- Split + initial states (under the loader) ---------------- */
  const heroTitle = $('.hero__title');
  heroTitle.setAttribute('aria-label', heroTitle.textContent.trim().replace(/\s+/g, ' '));
  const heroChars = $$('.hero__line', heroTitle).flatMap(l => { l.setAttribute('aria-hidden', 'true'); return splitChars(l); });

  const mailLink = $('.contact__mail');
  mailLink.setAttribute('aria-label', "Let's talk: email arsyad.rizantha@gmail.com");
  const mailLine = $('.contact__mail-line');
  mailLine.setAttribute('aria-hidden', 'true');
  const mailChars = splitChars(mailLine);

  const headWords = $$('.sec-head h2').map(h => splitWordsMask(h));
  const projTitleWords = $$('.project__title').map(h => splitWordsMask(h));
  const statementWords = splitWords($('[data-scrub-words]'));

  gsap.set(heroChars, { yPercent: 115, '--wd': 62, '--wg': 120 });
  gsap.set('.hero .reveal-line > span', { yPercent: 110 });
  gsap.set('[data-portrait]', { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set('[data-portrait] img', { scale: 1.35 });
  gsap.set('.hero__frame i', { scale: 0, opacity: 0 });
  gsap.set(['.hero__hud', '.hero__actions .btn', '.hero__scroll'], { opacity: 0, y: 16 });
  headWords.forEach(w => gsap.set(w, { yPercent: 110 }));

  /* ---------------- Loader (js/loader.js) -> hero intro ---------------- */
  function heroIntro() {
    const tl = gsap.timeline({
      onComplete: () => {
        heroChars.forEach(c => c.style.removeProperty('--wd'));
        lenis && lenis.start();
        initHeroScroll();
      }
    });
    tl.to('[data-portrait]', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
      .to('[data-portrait] img', { scale: 1, duration: 2.2, ease: 'expo.out' }, '<.25')
      .to(heroChars, { yPercent: 0, '--wd': 112, '--wg': 300, duration: 1.6, ease: 'expo.out', stagger: .045 }, '<.15')
      .to('.hero .reveal-line > span', { yPercent: 0, duration: 1.1, ease: 'expo.out' }, '<.6')
      .to('.hero__frame i', { scale: 1, opacity: 1, duration: .9, stagger: .07, ease: 'expo.out' }, '<')
      .to(['.hero__hud', '.hero__actions .btn', '.hero__scroll'], { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out' }, '<.2')
      .add(() => $('.hero__portrait').classList.add('is-detected'), '-=.6');
    return tl;
  }

  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2500))]);
  const pageLoader = window.PortfolioLoader || { done: Promise.resolve(), exit(cb) { const l = $('.loader'); if (l) l.remove(); cb(); } };
  Promise.all([fontsReady, pageLoader.done]).then(() => {
    ScrollTrigger.refresh();
    pageLoader.exit(() => {
      heroIntro();
      if (location.hash.startsWith('#case-')) setTimeout(() => openCase(location.hash.slice(6)), 1800);
    });
  });

  /* ---------------- Hero scroll: type compresses as you leave ---------------- */
  function initHeroScroll() {
    const hero = $('.hero');
    gsap.to(heroTitle, { '--wd': 68, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__text', { yPercent: -22, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__portrait', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.fromTo('[data-portrait] img', { scale: 1 }, { scale: 1.1, filter: 'brightness(.55)', ease: 'none', immediateRender: false, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(['.hero__hud', '.hero__frame', '.hero__scroll'], { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '40% top', scrub: true } });
  }

  /* ---------------- Weight lens: letters gain weight near the cursor ----------------
     Touch screens have no cursor, so there a band of weight sweeps across the
     letters every few seconds, and a touch on the area pulls it to the finger. */
  function weightLens(container, chars, { base = 300, near = 720, radius = 260 } = {}) {
    let mx = -9999, my = -9999, active = false, raf = null;
    const cur = chars.map(() => base);
    const step = () => {
      let moving = false;
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
        const target = active ? base + (near - base) * Math.max(0, 1 - d / radius) ** 1.6 : base;
        cur[i] += (target - cur[i]) * .14;
        if (Math.abs(target - cur[i]) > .5) moving = true;
        c.style.setProperty('--wg', cur[i].toFixed(1));
      });
      raf = moving ? requestAnimationFrame(step) : null;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    if (finePointer) {
      container.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; active = true; kick(); });
      container.addEventListener('pointerleave', () => { active = false; kick(); });
      return;
    }
    // smaller lens on phones so the band reads as a few letters, not the whole name
    radius = Math.max(70, Math.min(radius, innerWidth * .28));
    // touch: follow the finger while it is down
    const touchAt = e => { const t = e.touches[0]; if (!t) return; mx = t.clientX; my = t.clientY; active = true; kick(); };
    container.addEventListener('touchstart', touchAt, { passive: true });
    container.addEventListener('touchmove', touchAt, { passive: true });
    container.addEventListener('touchend', () => { setTimeout(() => { active = false; kick(); }, 350); }, { passive: true });
    // touch: an automatic sweep while the letters are on screen
    let visible = false, sweeping = false;
    new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: .3 }).observe(chars[0].parentElement);
    const sweep = () => {
      if (visible && !sweeping && chars[0].getBoundingClientRect().width) {
        sweeping = true;
        const first = chars[0].getBoundingClientRect(), lastR = chars[chars.length - 1].getBoundingClientRect();
        const o = { x: first.left - radius * .6 };
        gsap.to(o, {
          x: lastR.right + radius * .6, duration: 2.2, ease: 'sine.inOut',
          onUpdate: () => {
            // sweep along the middle of whichever line of text is under the band
            const hit = chars.find(c => { const r = c.getBoundingClientRect(); return o.x >= r.left && o.x <= r.right; }) || chars[0];
            const r = hit.getBoundingClientRect();
            mx = o.x; my = r.top + r.height / 2; active = true; kick();
          },
          onComplete: () => { active = false; sweeping = false; kick(); }
        });
      }
      setTimeout(sweep, 5200);
    };
    setTimeout(sweep, 3200);
  }
  weightLens($('.hero'), heroChars);
  weightLens($('.contact'), mailChars, { base: 300, near: 760, radius: 320 });

  /* Portrait drifts against the cursor; on touch screens it floats on its own */
  {
    const img = $('[data-portrait] img');
    if (finePointer) {
      const px = gsap.quickTo(img, 'xPercent', { duration: 1.2, ease: 'expo.out' });
      const py = gsap.quickTo(img, 'yPercent', { duration: 1.2, ease: 'expo.out' });
      $('.hero').addEventListener('pointermove', e => {
        px((e.clientX / innerWidth - .5) * -3);
        py((e.clientY / innerHeight - .5) * -3);
      });
    } else {
      gsap.to(img, { xPercent: 1.6, duration: 5.5, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 3 });
      gsap.to(img, { yPercent: -1.2, duration: 4.2, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 3 });
    }
  }

  /* ---------------- Portrait glitch bursts ---------------- */
  (() => {
    const host = $('[data-portrait]');
    if (!host) return;
    const slices = $$('.glitch__slice', host);
    const rgb = slices.filter(s => s.matches('.glitch__slice--r, .glitch__slice--c'));
    const bands = slices.filter(s => !rgb.includes(s));
    const r = (a, b) => a + Math.random() * (b - a);
    let visible = true, timer = null, running = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(host);

    const frame = (strength) => {
      rgb.forEach((s, i) => {
        const top = r(0, 70), h = r(10, 45);
        s.style.clipPath = Math.random() < .4 ? 'none' : `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`;
        s.style.transform = `translate(${(i ? 1 : -1) * r(3, 12) * strength}px, ${r(-2, 2)}px)`;
        s.style.opacity = r(.45, .85);
      });
      bands.forEach(s => {
        if (Math.random() < .25) { s.style.opacity = 0; return; }
        const top = r(4, 92), h = r(1, 6);
        s.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`;
        s.style.transform = `translateX(${r(-34, 34) * strength}px)`;
        s.style.opacity = 1;
      });
    };
    const clear = () => { slices.forEach(s => (s.style.opacity = 0)); host.classList.remove('is-glitching'); };

    const burst = (strength = 1) => {
      if (running) return;
      if (!visible || document.hidden) { timer = setTimeout(burst, 1500); return; }
      running = true;
      host.classList.add('is-glitching');
      let n = Math.round(r(3, 8));
      const tick = () => {
        if (n-- > 0) { frame(strength); timer = setTimeout(tick, r(35, 95)); }
        else { clear(); running = false; timer = setTimeout(burst, r(1400, 3800)); }
      };
      tick();
    };

    timer = setTimeout(burst, 4200); // first burst once the intro has settled
    $('.hero__portrait').addEventListener('pointerenter', () => { clearTimeout(timer); clear(); running = false; burst(1.6); });
  })();

  /* ---------------- Section detection boxes ---------------- */
  $$('.tracked').filter(t => !t.closest('.hero')).forEach(t => {
    ScrollTrigger.create({ trigger: t, start: 'top 82%', once: true, onEnter: () => t.classList.add('is-detected') });
  });
  $$('.sec-head').forEach((h, i) => {
    gsap.to(headWords[i], { yPercent: 0, duration: 1.1, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });

  /* ---------------- About: words light up as you read ---------------- */
  gsap.fromTo(statementWords, { opacity: .14 }, {
    opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.about__statement', start: 'top 78%', end: 'bottom 42%', scrub: true }
  });

  /* ---------------- Generic batch reveals ---------------- */
  const revealSel = [
    '.cradle', '.facts > div', '.interests h3', '.interests__list li', '.exp__intro > *',
    '.projects__intro', '.skills__intro', '.sgroup h3', '.skill', '.evidence',
    '.edu__body > *', '.cert', '.contact__lead', '.contact__address', '.contact__links li', '.footer > *'
  ].join(',');
  gsap.set(revealSel, { opacity: 0, y: 36 });
  ScrollTrigger.batch(revealSel, {
    start: 'top 90%', once: true,
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: .06, ease: 'expo.out', overwrite: true })
  });

  /* ---------------- Marquee: speed and skew follow scroll velocity ---------------- */
  (() => {
    const track = $('.marquee__track');
    let x = 0, dir = 1, skew = 0;
    const setX = gsap.quickSetter(track, 'x', 'px');
    const setSkew = gsap.quickSetter(track, 'skewX', 'deg');
    // velocity from the real scroll position, so it also reacts to native touch scrolling
    let lastY = scrollY;
    gsap.ticker.add((_, dt) => {
      const y = scrollY, v = y - lastY;
      lastY = y;
      if (v > .5) dir = 1; else if (v < -.5) dir = -1;
      const half = track.scrollWidth / 2;
      x -= (0.06 + Math.min(Math.abs(v) * .02, 1.2)) * dt * dir;
      if (x <= -half) x += half; if (x > 0) x -= half;
      skew += (gsap.utils.clamp(-10, 10, -v * .5) - skew) * .1;
      setX(x); setSkew(skew);
    });
  })();

  /* ---------------- Experience pipeline ----------------
     Desktop: pinned sideways scroll. Phones: a stack of cards that reveal one by one. */
  const mm = gsap.matchMedia();
  const steps = $$('.step');
  mm.add('(min-width: 861px)', () => {
    const pipe = $('[data-pipeline]');
    const track = $('.pipeline__track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pipe, start: 'top 22%', end: () => '+=' + (dist() + innerHeight * .25),
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: self => {
          gsap.set('.pipeline__progress i', { scaleX: self.progress });
          steps.forEach((s, i) => s.classList.toggle('is-on', self.progress >= (i / (steps.length - 1)) * .96));
        }
      }
    });
    gsap.from(steps, { opacity: 0, x: 80, duration: 1.1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: pipe, start: 'top 80%', once: true } });
  });
  mm.add('(max-width: 860px)', () => {
    steps.forEach(s => {
      gsap.fromTo(s, { opacity: 0, y: 36, scale: .97 }, {
        opacity: 1, y: 0, scale: 1, duration: .8, ease: 'expo.out',
        scrollTrigger: { trigger: s, start: 'top 90%', once: true, onEnter: () => s.classList.add('is-on') }
      });
    });
  });

  /* ---------------- Projects ----------------
     Desktop: one timeline per project, preview and text together, with parallax.
     Phones: the stacked preview and text each reveal when they reach the screen
     (so text never animates while it is still below the fold), shorter timings,
     no parallax, and a gentle scroll tilt instead of the cursor tilt. */
  mm.add('(max-width: 860px)', () => {
    projects.forEach((art, i) => {
      const pv = $('.pv', art), inner = $('svg, .enh', pv), text = $('.project__text', art);
      gsap.timeline({ scrollTrigger: { trigger: pv, start: 'top 88%', once: true } })
        .to(pv, { clipPath: 'inset(0% 0 0 0)', duration: 1.05, ease: 'expo.inOut' })
        .from(inner, { scale: 1.12, duration: 1.2, ease: 'expo.out' }, '<.15')
        .from($('figcaption', pv), { opacity: 0, y: 8, duration: .5, ease: 'power2.out' }, '-=.5')
        .add(() => {
          if (pv.matches('[data-enhance]') && enhanceMain) {
            const o = { v: 92 };
            gsap.to(o, { v: 50, duration: 1.3, ease: 'expo.inOut', onUpdate: () => { enhanceMain.set(o.v); enhanceMain.range.value = Math.round(o.v); } });
          }
        }, .4);
      gsap.timeline({ scrollTrigger: { trigger: text, start: 'top 88%', once: true } })
        .from($('.project__kind', text), { opacity: 0, y: 14, duration: .55, ease: 'expo.out' })
        .from(projTitleWords[i], { yPercent: 110, duration: .8, stagger: .05, ease: 'expo.out' }, '<.05')
        .from($('.project__summary', text), { opacity: 0, y: 18, duration: .7, ease: 'expo.out' }, '<.15')
        .from($$('.chips li', text), { opacity: 0, y: 10, duration: .45, stagger: .03, ease: 'expo.out' }, '<.1')
        .from($$('.project__actions > *', text), { opacity: 0, y: 12, duration: .55, stagger: .06, ease: 'expo.out' }, '<.1');
      if (inner.tagName.toLowerCase() === 'svg') {
        gsap.fromTo(inner, { rotationX: 6 }, { rotationX: -6, ease: 'none', scrollTrigger: { trigger: pv, start: 'top bottom', end: 'bottom top', scrub: .5 } });
      }
    });
  });

  mm.add('(min-width: 861px)', () => projects.forEach((art, i) => {
    const pv = $('.pv', art);
    const inner = $('svg, .enh', pv);
    const text = $('.project__text', art);
    const tl = gsap.timeline({ scrollTrigger: { trigger: art, start: 'top 75%', once: true } });
    tl.to(pv, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' })
      .from(inner, { scale: 1.25, duration: 1.6, ease: 'expo.out' }, '<.2')
      .from($('.project__kind', text), { opacity: 0, y: 20, duration: .8, ease: 'expo.out' }, '<.1')
      .from(projTitleWords[i], { yPercent: 110, duration: 1.1, stagger: .06, ease: 'expo.out' }, '<.05')
      .from($('.project__summary', text), { opacity: 0, y: 30, duration: 1, ease: 'expo.out' }, '<.2')
      .from($$('.chips li', text), { opacity: 0, y: 14, duration: .6, stagger: .04, ease: 'expo.out' }, '<.15')
      .from($$('.project__actions > *', text), { opacity: 0, y: 20, duration: .8, stagger: .08, ease: 'expo.out' }, '<.15');
    if (pv.matches('[data-enhance]') && enhanceMain) {
      const o = { v: 92 };
      tl.to(o, { v: 50, duration: 1.6, ease: 'expo.inOut', onUpdate: () => { enhanceMain.set(o.v); enhanceMain.range.value = Math.round(o.v); } }, 0.6);
    }
    gsap.fromTo($('.project__media', art), { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: art, start: 'top bottom', end: 'bottom top', scrub: true } });
  }));

  /* Tilt previews toward the cursor */
  if (finePointer) {
    $$('[data-tilt]').forEach(fig => {
      const el = $('svg', fig);
      const rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'expo.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'expo.out' });
      fig.addEventListener('pointermove', e => {
        const r = fig.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - .5) * 10);
        rx(-((e.clientY - r.top) / r.height - .5) * 8);
      });
      fig.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ---------------- Education mark fills on scroll ---------------- */
  gsap.fromTo('.edu__mark', { '--fill': '0%' }, { '--fill': '100%', ease: 'none', scrollTrigger: { trigger: '.edu', start: 'top 80%', end: 'bottom 50%', scrub: true } });
  // ITS logo turns into place like a gear
  gsap.from('.edu__logo', { rotation: -120, scale: .6, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.edu', start: 'top 80%', once: true } });

  /* ---------------- Contact title ---------------- */
  gsap.from(mailChars, { yPercent: 110, '--wd': 62, '--wg': 120, duration: 1.4, stagger: .04, ease: 'expo.out', scrollTrigger: { trigger: '.contact__title', start: 'top 85%', once: true }, onComplete: () => mailChars.forEach(c => { c.style.removeProperty('--wd'); c.style.removeProperty('--wg'); }) });

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'expo.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'expo.out' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .28);
        yTo((e.clientY - (r.top + r.height / 2)) * .38);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  } else {
    // touch: buttons press in and spring back
    $$('[data-magnetic], .cradle__swing, .skill').forEach(el => {
      el.addEventListener('touchstart', () => gsap.to(el, { scale: .94, duration: .15, ease: 'power2.out', overwrite: 'auto' }), { passive: true });
      const up = () => gsap.to(el, { scale: 1, duration: .6, ease: 'elastic.out(1, .4)', overwrite: 'auto' });
      el.addEventListener('touchend', up, { passive: true });
      el.addEventListener('touchcancel', up, { passive: true });
    });
  }

  onScroll(0);
})();
