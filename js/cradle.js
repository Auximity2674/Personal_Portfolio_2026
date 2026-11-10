/* =========================================================
   Newton's cradle (About section)
   - 5 pendulums, real pendulum motion, elastic collisions
     that pass momentum through the chain
   - drag any ball (mouse or touch), flick to throw it
   - keyboard: Left / Right arrows lift an end ball
   - "Swing" button lifts 1, then 2, then 3 balls
   - chrome balls with the site's ice-blue / red rim light,
     a detection box on the ball you're holding
   Renders only while visible and moving.
   ========================================================= */
(() => {
  'use strict';

  const fig = document.querySelector('[data-cradle]');
  if (!fig) return;
  const canvas = fig.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const swingBtn = fig.querySelector('[data-cradle-swing]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 5;
  const K = Math.pow((2 * Math.PI) / 1.25, 2); // angular stiffness: ~1.25 s period
  const MAX_A = 1.0;                           // max swing angle (rad)
  const RESTITUTION = 0.992;
  const DAMPING = 0.05;                        // per second
  const ACCENT = '#7CC4FF', SIGNAL = '#FF4D5E', ON_ACCENT = '#041019';

  const balls = Array.from({ length: N }, () => ({ a: 0, w: 0 }));
  let W = 0, H = 0, r = 0, L = 0, pivotY = 0, x0 = 0, baseY = 0, frameL = 0, frameR = 0;
  let drag = null;           // { i, lastA, lastT }
  let hover = -1;
  let flashes = [];          // { x, y, t }
  let raf = null, last = 0, visible = false, started = false, swingCount = 0;

  /* ---------- geometry ---------- */
  const pivotX = i => x0 + i * 2 * r;
  const ballPos = i => ({ x: pivotX(i) + L * Math.sin(balls[i].a), y: pivotY + L * Math.cos(balls[i].a) });

  function layout() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    W = rect.width; H = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    r = Math.min(W * 0.066, H * 0.08);
    pivotY = H * 0.13;
    L = H * 0.52;
    x0 = W / 2 - 2 * r * (N - 1) / 2;
    baseY = pivotY + L + r + H * 0.08;
    frameL = x0 - r * 2.6;
    frameR = pivotX(N - 1) + r * 2.6;
  }

  /* ---------- physics ---------- */
  function collide(A, B, iA, iB) {
    // ordering constraint: a ball can't pass its right-hand neighbour (pivots are 2r apart)
    if (A.a <= B.a) return;
    const dragA = drag && drag.i === iA, dragB = drag && drag.i === iB;
    if (A.w > B.w) {
      const impact = A.w - B.w;
      // a held ball acts like a wall that moves with your hand
      if (dragA) B.w = (1 + RESTITUTION) * A.w - RESTITUTION * B.w;
      else if (dragB) A.w = (1 + RESTITUTION) * B.w - RESTITUTION * A.w;
      else {
        const vA = A.w, vB = B.w, e = RESTITUTION;
        A.w = ((1 - e) * vA + (1 + e) * vB) / 2;
        B.w = ((1 + e) * vA + (1 - e) * vB) / 2;
      }
      if (impact > 0.9) {
        const p = ballPos(iA);
        flashes.push({ x: p.x + r, y: p.y, t: 0, s: Math.min(1, impact / 4) });
      }
    }
    if (dragA) B.a = A.a;
    else if (dragB) A.a = B.a;
    else { const m = (A.a + B.a) / 2; A.a = m; B.a = m; }
  }

  function step(dt) {
    const sub = 12, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      balls.forEach((b, i) => {
        if (drag && drag.i === i) return;
        b.w += -K * Math.sin(b.a) * h;
        b.w *= 1 - DAMPING * h;
        b.a += b.w * h;
      });
      // several passes so momentum travels through a touching chain in one step
      for (let pass = 0; pass < N; pass++) {
        for (let i = 0; i < N - 1; i++) collide(balls[i], balls[i + 1], i, i + 1);
      }
    }
    flashes.forEach(f => (f.t += dt));
    flashes = flashes.filter(f => f.t < 0.45);
  }

  const energy = () => balls.reduce((e, b) => e + b.w * b.w + K * (1 - Math.cos(b.a)) * 2, 0);

  /* ---------- drawing ---------- */
  function chromeV(x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(.35, '#D9DDE2'); g.addColorStop(.6, '#8E949D'); g.addColorStop(1, '#E4E7EB');
    return g;
  }
  function chromeH(x, y, w) {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, '#6E747D'); g.addColorStop(.45, '#F5F6F8'); g.addColorStop(1, '#7E848E');
    return g;
  }
  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const railH = Math.max(4, r * 0.16);
    const postW = Math.max(2.5, r * 0.1);
    const baseH = Math.max(10, H * 0.045);

    // soft floor glow
    const glow = ctx.createRadialGradient(W / 2, baseY, 0, W / 2, baseY, (frameR - frameL) * 0.7);
    glow.addColorStop(0, 'rgba(124,196,255,.10)'); glow.addColorStop(1, 'rgba(124,196,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // base plate
    const bx = frameL - r * 0.6, bw = frameR - frameL + r * 1.2;
    roundRect(bx, baseY, bw, baseH, baseH * 0.35);
    const bg = ctx.createLinearGradient(0, baseY, 0, baseY + baseH);
    bg.addColorStop(0, '#1C2027'); bg.addColorStop(1, '#0C0E12');
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(bx + baseH * 0.35, baseY, bw - baseH * 0.7, 1);

    // ball shadows on the plate
    for (let i = 0; i < N; i++) {
      const p = ballPos(i);
      const gap = Math.max(0, baseY - (p.y + r));
      const near = Math.max(0, 1 - gap / (H * 0.3));
      ctx.fillStyle = `rgba(0,0,0,${0.45 * near})`;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + 1.5, r * (0.6 + 0.5 * near), r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // posts
    ctx.fillStyle = chromeH(frameL - postW / 2, 0, postW);
    ctx.fillRect(frameL - postW / 2, pivotY, postW, baseY - pivotY);
    ctx.fillStyle = chromeH(frameR - postW / 2, 0, postW);
    ctx.fillRect(frameR - postW / 2, pivotY, postW, baseY - pivotY);

    // top rail
    roundRect(frameL - postW, pivotY - railH / 2, frameR - frameL + postW * 2, railH, railH / 2);
    ctx.fillStyle = chromeV(0, pivotY - railH / 2, 0, railH); ctx.fill();

    // strings + clamps
    for (let i = 0; i < N; i++) {
      const p = ballPos(i);
      ctx.strokeStyle = 'rgba(220,226,234,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pivotX(i), pivotY + railH / 2); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = '#C7CCD3';
      ctx.beginPath(); ctx.arc(pivotX(i), pivotY + railH / 2, Math.max(1.5, r * 0.07), 0, Math.PI * 2); ctx.fill();
    }

    // balls
    for (let i = 0; i < N; i++) {
      const p = ballPos(i);
      const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.05, p.x, p.y, r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(.2, '#E9ECEF'); g.addColorStop(.52, '#9AA1AB');
      g.addColorStop(.82, '#3B4049'); g.addColorStop(1, '#16191E');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();

      // rim lights, echoing the portrait's cyan / red split
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.strokeStyle = 'rgba(124,196,255,.65)';
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.95, -0.5, 1.0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,77,94,.35)';
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.95, Math.PI - 0.3, Math.PI + 0.7); ctx.stroke();

      // specular
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.ellipse(p.x - r * 0.38, p.y - r * 0.45, r * 0.18, r * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();

      if (hover === i && !drag) {
        ctx.strokeStyle = 'rgba(124,196,255,.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // impact flashes
    flashes.forEach(f => {
      const k = f.t / 0.45;
      ctx.strokeStyle = `rgba(124,196,255,${(1 - k) * 0.7 * (0.4 + f.s)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, r * (0.2 + k * 0.9), 0, Math.PI * 2); ctx.stroke();
    });

    // detection box on the ball being held
    if (drag) {
      const p = ballPos(drag.i), pad = 7;
      const x = p.x - r - pad, y = p.y - r - pad, s = (r + pad) * 2;
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1;
      ctx.strokeRect(x, y, s, s);
      ctx.font = '650 11px Archivo, system-ui, sans-serif';
      if ('fontStretch' in ctx) ctx.fontStretch = 'condensed';
      const label = 'ball 0.99';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = ACCENT; ctx.fillRect(x - 0.5, y - 17, tw, 17);
      ctx.fillStyle = ON_ACCENT; ctx.fillText(label, x + 6, y - 5);
    }
  }

  /* ---------- loop ---------- */
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw();
    const moving = drag || flashes.length || energy() > 1e-4;
    if (visible && moving) raf = requestAnimationFrame(loop);
    else {
      raf = null;
      if (!moving) balls.forEach(b => { if (Math.abs(b.a) < 1e-3) { b.a = 0; b.w = 0; } });
    }
  }
  function kick() {
    if (raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  function pointerXY(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function hit(pt) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const p = ballPos(i), d = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (d < r * 1.25 && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }
  function angleTo(i, pt) {
    const a = Math.atan2(pt.x - pivotX(i), Math.max(1, pt.y - pivotY));
    return Math.max(-MAX_A, Math.min(MAX_A, a));
  }

  canvas.addEventListener('pointerdown', e => {
    const pt = pointerXY(e), i = hit(pt);
    if (i < 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    drag = { i, lastA: balls[i].a, lastT: performance.now() };
    balls[i].w = 0;
    canvas.style.cursor = 'grabbing';
    kick();
  });
  canvas.addEventListener('pointermove', e => {
    const pt = pointerXY(e);
    if (drag) {
      const now = performance.now();
      const a = angleTo(drag.i, pt);
      const dt = Math.max((now - drag.lastT) / 1000, 1 / 240);
      const b = balls[drag.i];
      b.w = b.w * 0.5 + ((a - drag.lastA) / dt) * 0.5; // smoothed throw velocity
      b.a = a;
      drag.lastA = a; drag.lastT = now;
      kick();
      return;
    }
    const h = hit(pt);
    if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? 'grab' : ''; if (!raf) draw(); }
  });
  const release = () => {
    if (!drag) return;
    const b = balls[drag.i];
    b.w = Math.max(-8, Math.min(8, b.w));
    drag = null;
    canvas.style.cursor = hover >= 0 ? 'grab' : '';
    kick();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { if (!drag && hover !== -1) { hover = -1; canvas.style.cursor = ''; if (!raf) draw(); } });

  function lift(side, count, angle = 0.8) {
    balls.forEach(b => { b.a = 0; b.w = 0; });
    for (let k = 0; k < count; k++) {
      const i = side < 0 ? k : N - 1 - k;
      balls[i].a = side < 0 ? -angle : angle;
    }
    flashes = [];
    kick();
  }

  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); lift(-1, 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lift(1, 1); }
  });
  swingBtn && swingBtn.addEventListener('click', () => {
    swingCount = swingCount % 3 + 1;
    lift(-1, swingCount);
    const next = swingCount % 3 + 1;
    swingBtn.textContent = `Lift ${next} ball${next > 1 ? 's' : ''}`;
  });

  /* ---------- lifecycle ---------- */
  new ResizeObserver(() => { layout(); if (!raf) draw(); }).observe(canvas);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (!visible) return;
    if (!started) {
      started = true;
      if (!reduce) setTimeout(() => lift(-1, 1, 0.75), 700); // a first swing so it reads as live
    }
    kick();
  }, { threshold: 0.25 }).observe(fig);

  layout();
  draw();
  if (document.fonts) document.fonts.ready.then(() => { if (!raf) draw(); });
})();
