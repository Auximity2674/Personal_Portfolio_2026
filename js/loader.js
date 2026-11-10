/* =========================================================
   Loader: "the first program"
   - Two heavy blast doors fill the screen.
   - A 3D dot globe turns behind the lettering; for every
     language it rotates to a city and draws an arc there.
   - Thousands of chrome particles form "Hello, world" in a
     run of languages, each tagged by a detection box, and
     land on "Halo, dunia" (Bahasa Indonesia) at Surabaya.
   - Exit: particles stream away, the globe dollies in, a
     light line opens down the seam, lock lights switch on
     and the doors slide apart onto the hero.

   API used by main.js:
     PortfolioLoader.done      Promise, resolves when the sequence has landed
     PortfolioLoader.exit(cb)  plays the exit; calls cb when the hero should start
   Full sequence on the first visit of a session, short one after.
   Click / tap / any key skips to the end.
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const el = document.querySelector('.loader');

  // Inert fallback: main.js can always call these safely
  const api = { done: Promise.resolve(), exit(cb) { if (el) el.remove(); if (cb) cb(); } };
  window.PortfolioLoader = api;
  if (!el || !root.classList.contains('anim') || !window.gsap) return;

  const canvas = el.querySelector('.loader__canvas');
  const ctx = canvas.getContext('2d');
  const gCanvas = el.querySelector('.loader__globe');
  const gctx = gCanvas.getContext('2d');
  const box = el.querySelector('.loader__box');
  const label = el.querySelector('[data-loader-label]');
  const codeEl = el.querySelector('[data-loader-code]');
  const geoEl = el.querySelector('[data-loader-geo]');
  const countEl = el.querySelector('[data-loader-count]');
  const barEl = el.querySelector('.loader__bar i');
  const doorL = el.querySelector('.loader__door--l');
  const doorR = el.querySelector('.loader__door--r');
  const seam = el.querySelector('.loader__seam');
  const lights = el.querySelectorAll('.loader__lights i');
  const fadeEls = el.querySelectorAll('.loader__hud, .loader__foot, .loader__box, .loader__bar');

  // [greeting, language, confidence, city, lat, lon] in travel order, west to east, then home
  const GREETINGS = [
    ['Hello, world', 'English', .98, 'London', 51.51, -0.13],
    ['Hola, mundo', 'Spanish', .96, 'Madrid', 40.42, -3.70],
    ['Bonjour le monde', 'French', .97, 'Paris', 48.86, 2.35],
    ['Hallo Welt', 'German', .95, 'Berlin', 52.52, 13.40],
    ['Привет, мир', 'Russian', .94, 'Moscow', 55.76, 37.62],
    ['مرحبا بالعالم', 'Arabic', .93, 'Cairo', 30.04, 31.24],
    ['नमस्ते दुनिया', 'Hindi', .95, 'New Delhi', 28.61, 77.21],
    ['你好，世界', 'Chinese', .97, 'Beijing', 39.90, 116.40],
    ['안녕, 세상', 'Korean', .94, 'Seoul', 37.57, 126.98],
    ['こんにちは世界', 'Japanese', .96, 'Tokyo', 35.68, 139.69]
  ];
  const FINAL = ['Halo, dunia', 'Bahasa Indonesia', .99, 'Surabaya', -7.25, 112.75];

  let seen = false;
  try { seen = sessionStorage.getItem('pf-intro') === '1'; sessionStorage.setItem('pf-intro', '1'); } catch (e) { /* storage blocked */ }

  const T = seen
    ? { ring: 500, first: 800, each: 0, hold: 1300, list: [GREETINGS[0]] }
    : { ring: 1000, first: 1100, each: 560, hold: 2300, list: GREETINGS };

  const mobile = Math.min(innerWidth, innerHeight) < 600;
  let W = 0, H = 0, dpr = 1;

  function resize() {
    W = innerWidth; H = innerHeight;
    // phones have 3x screens; two full-screen canvases at that density is what made it stutter
    dpr = mobile ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 2);
    [canvas, gCanvas].forEach(c => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const center = () => ({ x: W / 2, y: H * 0.47 });

  /* =========================================================
     3D globe
     ========================================================= */
  const G = {
    n: mobile ? 320 : 950,
    yaw: 0, pitch: -0.3, targetYaw: null, targetPitch: -0.3,
    scale: 0.6, alpha: 0, spin: 0.25,
    pins: [], arc: null
  };
  const radius = () => Math.min(W, H) * (mobile ? 0.38 : 0.31) * G.scale;
  // Fibonacci sphere
  const gx = new Float32Array(G.n), gy = new Float32Array(G.n), gz = new Float32Array(G.n);
  for (let i = 0; i < G.n; i++) {
    const y = 1 - (i / (G.n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    gx[i] = Math.cos(th) * rr; gy[i] = y; gz[i] = Math.sin(th) * rr;
  }
  const toVec = (lat, lon) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
  };
  // rotate (yaw around Y, then pitch around X), project with perspective
  function project(x, y, z, out) {
    const cy = Math.cos(G.yaw), sy = Math.sin(G.yaw), cp = Math.cos(G.pitch), sp = Math.sin(G.pitch);
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const R = radius(), D = 3.2, s = D / (D - z2), c = center();
    out[0] = c.x + x1 * R * s; out[1] = c.y - y2 * R * s; out[2] = z2; out[3] = s;
    return out;
  }
  const tmp = [0, 0, 0, 0], tmp2 = [0, 0, 0, 0];
  const slerp = (a, b, t) => {
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const om = Math.acos(dot);
    if (om < 1e-4) return a.slice();
    const s0 = Math.sin((1 - t) * om) / Math.sin(om), s1 = Math.sin(t * om) / Math.sin(om);
    return [a[0] * s0 + b[0] * s1, a[1] * s0 + b[1] * s1, a[2] * s0 + b[2] * s1];
  };
  const angleDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  function travelTo(entry) {
    const lat = entry[4], lon = entry[5];
    const v = toVec(lat, lon);
    const prev = G.pins.length ? G.pins[G.pins.length - 1].v : null;
    G.pins.push({ v, t: 0 });
    // face the pin: bring its longitude to the front and tilt toward its latitude
    const want = Math.PI / 2 - lon * Math.PI / 180;
    G.targetYaw = G.yaw + angleDiff(G.yaw, want);
    G.targetPitch = -(lat * Math.PI / 180) * 0.75 - 0.12;
    if (prev) {
      G.arc = { a: prev, b: v, p: 0 };
      gsap.to(G.arc, { p: 1, duration: .7, ease: 'power2.inOut' });
    }
    const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
    geoEl.textContent = `${entry[3]}, ${Math.abs(lat).toFixed(2)}° ${ns} ${Math.abs(lon).toFixed(2)}° ${ew}`;
  }

  function drawGlobe(dt) {
    gctx.clearRect(0, 0, W, H);
    if (G.alpha <= 0.01) return;
    // ease rotation toward the current city, or spin while idle
    if (G.targetYaw === null) G.yaw += G.spin * dt;
    else G.yaw += (G.targetYaw - G.yaw) * Math.min(1, dt * 2.6);
    G.pitch += (G.targetPitch - G.pitch) * Math.min(1, dt * 2.6);

    const c = center(), R = radius(), A = G.alpha;
    gctx.save();
    gctx.globalAlpha = A;

    // atmosphere glow
    const glow = gctx.createRadialGradient(c.x, c.y, R * 0.6, c.x, c.y, R * 1.45);
    glow.addColorStop(0, 'rgba(124,196,255,.10)'); glow.addColorStop(1, 'rgba(124,196,255,0)');
    gctx.fillStyle = glow; gctx.beginPath(); gctx.arc(c.x, c.y, R * 1.45, 0, Math.PI * 2); gctx.fill();
    // rim
    gctx.strokeStyle = 'rgba(199,204,211,.22)'; gctx.lineWidth = 1;
    gctx.beginPath(); gctx.arc(c.x, c.y, R * 1.02, 0, Math.PI * 2); gctx.stroke();

    // graticule: meridians + parallels, front half brighter
    const line = (pts) => {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        const front = (a[2] + b[2]) / 2 > 0;
        gctx.strokeStyle = front ? 'rgba(199,204,211,.16)' : 'rgba(199,204,211,.04)';
        gctx.beginPath(); gctx.moveTo(a[0], a[1]); gctx.lineTo(b[0], b[1]); gctx.stroke();
      }
    };
    // fewer, coarser lines on phones
    const mStep = mobile ? 45 : 30, segStep = mobile ? 15 : 10, pStep = mobile ? 45 : 30;
    for (let lon = 0; lon < 360; lon += mStep) {
      const pts = [];
      for (let la = -90; la <= 90; la += segStep) { const v = toVec(la, lon); pts.push(project(v[0], v[1], v[2], [0, 0, 0, 0])); }
      line(pts);
    }
    for (let la = -90 + pStep; la < 90; la += pStep) {
      const pts = [];
      for (let lo = 0; lo <= 360; lo += segStep) { const v = toVec(la, lo); pts.push(project(v[0], v[1], v[2], [0, 0, 0, 0])); }
      line(pts);
    }

    // dots: back half faint, front half bright with depth
    for (let pass = 0; pass < 2; pass++) {
      gctx.fillStyle = pass ? '#DDE1E6' : 'rgba(199,204,211,.22)';
      for (let i = 0; i < G.n; i++) {
        project(gx[i], gy[i], gz[i], tmp);
        if ((tmp[2] > 0) !== !!pass) continue;
        const sz = pass ? 0.8 + tmp[2] * 1.3 : 0.9;
        if (pass) gctx.globalAlpha = A * (0.35 + tmp[2] * 0.65);
        gctx.fillRect(tmp[0] - sz / 2, tmp[1] - sz / 2, sz, sz);
      }
      gctx.globalAlpha = A;
    }

    // arc between the last two cities, lifted off the surface
    if (G.arc) {
      const { a, b, p } = G.arc, steps = 48;
      gctx.strokeStyle = 'rgba(124,196,255,.9)'; gctx.lineWidth = 1.6;
      if (!mobile) { gctx.shadowColor = 'rgba(124,196,255,.8)'; gctx.shadowBlur = 8; } // blur is expensive on phones
      gctx.beginPath();
      for (let k = 0; k <= steps * p; k++) {
        const t = k / steps, v = slerp(a, b, t), lift = 1 + Math.sin(t * Math.PI) * 0.22;
        project(v[0] * lift, v[1] * lift, v[2] * lift, tmp);
        if (k === 0) gctx.moveTo(tmp[0], tmp[1]); else gctx.lineTo(tmp[0], tmp[1]);
      }
      gctx.stroke();
      gctx.shadowBlur = 0;
    }

    // pins: visited ones dim, the current one pulsing with a spike
    G.pins.forEach((pin, idx) => {
      pin.t += dt;
      const v = pin.v;
      project(v[0], v[1], v[2], tmp);
      if (tmp[2] < -0.05) return;
      const current = idx === G.pins.length - 1;
      if (!current) {
        gctx.fillStyle = 'rgba(124,196,255,.55)';
        gctx.beginPath(); gctx.arc(tmp[0], tmp[1], 2, 0, Math.PI * 2); gctx.fill();
        return;
      }
      project(v[0] * 1.16, v[1] * 1.16, v[2] * 1.16, tmp2);
      gctx.strokeStyle = 'rgba(124,196,255,.9)'; gctx.lineWidth = 1.2;
      gctx.beginPath(); gctx.moveTo(tmp[0], tmp[1]); gctx.lineTo(tmp2[0], tmp2[1]); gctx.stroke();
      const pulse = (pin.t % 1.4) / 1.4;
      gctx.strokeStyle = `rgba(124,196,255,${0.8 * (1 - pulse)})`;
      gctx.beginPath(); gctx.arc(tmp[0], tmp[1], 3 + pulse * 18, 0, Math.PI * 2); gctx.stroke();
      gctx.fillStyle = '#FFFFFF';
      gctx.beginPath(); gctx.arc(tmp[0], tmp[1], 3, 0, Math.PI * 2); gctx.fill();
      gctx.fillStyle = 'rgba(124,196,255,1)';
      gctx.beginPath(); gctx.arc(tmp2[0], tmp2[1], 2.2, 0, Math.PI * 2); gctx.fill();
    });

    gctx.restore();
  }

  /* =========================================================
     Particle lettering
     ========================================================= */
  const P = mobile ? 700 : 2400;
  const SIZE = mobile ? 2.2 : 1.8;
  const COLORS = ['#FFFFFF', '#DDE1E6', '#8E949D', '#C9CED5', 'rgba(124,196,255,.95)'];
  const px = new Float32Array(P), py = new Float32Array(P);
  const vx = new Float32Array(P), vy = new Float32Array(P);
  const tx = new Float32Array(P), ty = new Float32Array(P);
  const shade = new Uint8Array(P);
  const buckets = COLORS.map(() => new Int32Array(P));
  const bucketLen = new Int32Array(COLORS.length);

  let mode = 'ring';                 // ring -> text -> exit
  let spring = 0.065, damp = 0.83;   // slower, more graceful morphs
  let current = null;
  let mouseX = -9999, mouseY = -9999;
  let raf = null, ringT = 0, lastT = performance.now();

  for (let i = 0; i < P; i++) {
    px[i] = Math.random() * W; py[i] = Math.random() * H;
    tx[i] = px[i]; ty[i] = py[i]; shade[i] = i % 4;
  }

  const off = document.createElement('canvas');
  const octx = off.getContext('2d', { willReadFrequently: true });
  const fontFor = size => `300 ${size}px Archivo, "Segoe UI", "Noto Sans", "Noto Sans JP", system-ui, sans-serif`;
  const setStretch = c => { if ('fontStretch' in c) c.fontStretch = 'semi-expanded'; };

  function sample(text) {
    const maxW = W * (mobile ? 0.9 : 0.74);
    const maxH = H * (mobile ? 0.12 : 0.2);
    octx.font = fontFor(200); setStretch(octx);
    const m = octx.measureText(text).width || 1;
    const size = Math.max(28, Math.min(200 * maxW / m, maxH));
    const cw = Math.ceil(Math.min(W, maxW + size)), ch = Math.ceil(size * 1.7);
    off.width = cw; off.height = ch;
    octx.font = fontFor(size); setStretch(octx);
    octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
    octx.fillText(text, cw / 2, ch / 2);
    const data = octx.getImageData(0, 0, cw, ch).data;
    let step = Math.max(2, Math.round(size / (mobile ? 20 : 32)));
    let pts = [];
    for (let tries = 0; tries < 3; tries++) {
      pts = [];
      for (let y = 0; y < ch; y += step) for (let x = 0; x < cw; x += step) {
        if (data[(y * cw + x) * 4 + 3] > 140) pts.push(x, y);
      }
      if (pts.length / 2 >= P * 0.7 || step <= 2) break;
      step--;
    }
    const c = center(), ox = c.x - cw / 2, oy = c.y - ch / 2;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const out = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i] + ox, y = pts[i + 1] + oy;
      out[i] = x; out[i + 1] = y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { pts: out, n: pts.length / 2, step, bounds: { minX, minY, maxX, maxY } };
  }

  function form(entry, travel = true) {
    current = entry;
    const s = sample(entry[0]);
    if (!s.n) return;
    const order = new Uint32Array(Math.max(P, s.n));
    for (let i = 0; i < order.length; i++) order[i] = i % s.n;
    for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = order[i]; order[i] = order[j]; order[j] = t; }
    const { minY, maxY } = s.bounds, span = Math.max(1, maxY - minY);
    for (let i = 0; i < P; i++) {
      const k = order[i] * 2;
      tx[i] = s.pts[k] + (Math.random() - .5) * s.step * .6;
      ty[i] = s.pts[k + 1] + (Math.random() - .5) * s.step * .6;
      const t = (ty[i] - minY) / span;
      shade[i] = t < .32 ? 0 : t < .5 ? 1 : t < .74 ? 2 : 3;
    }
    mode = 'text';
    const pad = mobile ? 10 : 16, b = s.bounds;
    gsap.to(box, {
      left: b.minX - pad, top: b.minY - pad,
      width: b.maxX - b.minX + pad * 2, height: b.maxY - b.minY + pad * 2,
      opacity: 1, duration: .6, ease: 'expo.out', overwrite: true
    });
    label.textContent = `${entry[1]} ${entry[2].toFixed(2)}`;
    box.classList.remove('is-hit'); void box.offsetWidth; box.classList.add('is-hit');
    codeEl.textContent = entry[0];
    if (travel) travelTo(entry);
  }

  /* ---------- render loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    ringT += dt;

    drawGlobe(dt);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    bucketLen.fill(0);
    const c = center();
    const orbit = Math.min(W, H) * (mobile ? 0.44 : 0.36);
    for (let i = 0; i < P; i++) {
      if (mode === 'ring') {
        // a tilted orbit ring around the globe
        const a = (i / P) * Math.PI * 2 + ringT * 0.55;
        const wob = 1 + ((i % 9) - 4) * 0.01 + 0.03 * Math.sin(a * 5 + ringT * 2);
        tx[i] = c.x + Math.cos(a) * orbit * wob;
        ty[i] = c.y + Math.sin(a) * orbit * 0.24 * wob + Math.cos(a) * orbit * 0.08;
      }
      let ax = (tx[i] - px[i]) * spring, ay = (ty[i] - py[i]) * spring;
      const dx = px[i] - mouseX, dy = py[i] - mouseY, d2 = dx * dx + dy * dy;
      if (d2 < 8100 && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / 90) * 2.4; ax += dx / d * f; ay += dy / d * f; }
      vx[i] = (vx[i] + ax) * damp; vy[i] = (vy[i] + ay) * damp;
      px[i] += vx[i]; py[i] += vy[i];
      const fast = vx[i] * vx[i] + vy[i] * vy[i] > 4;
      const bkt = fast ? 4 : (mode === 'ring' ? (Math.sin((i / P) * Math.PI * 2 + ringT * 0.55) > 0 ? 0 : 2) : shade[i]);
      buckets[bkt][bucketLen[bkt]++] = i;
    }
    for (let b = 0; b < COLORS.length; b++) {
      ctx.fillStyle = COLORS[b];
      const list = buckets[b], n = bucketLen[b];
      for (let k = 0; k < n; k++) { const i = list[k]; ctx.fillRect(px[i], py[i], SIZE, SIZE); }
    }
  }
  raf = requestAnimationFrame(frame);

  // globe rises in
  gsap.to(G, { alpha: 1, scale: 1, duration: 1.8, ease: 'expo.out', delay: .15 });

  /* =========================================================
     Sequence
     ========================================================= */
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  let resolveDone;
  api.done = new Promise(r => (resolveDone = r));
  let landed = false, finalShown = false;

  function showFinal(hold) {
    if (finalShown) return;
    finalShown = true;
    form(FINAL);
    box.classList.add('is-final');
    later(() => { landed = true; resolveDone(); }, hold);
  }

  const fontReady = Promise.race([
    document.fonts ? document.fonts.load('300 100px Archivo') : Promise.resolve(),
    new Promise(r => setTimeout(r, 900))
  ]);
  const ringDone = new Promise(r => setTimeout(r, T.ring));

  Promise.all([fontReady, ringDone]).then(() => {
    if (finalShown) return;
    const total = T.first + T.each * (T.list.length - 1) + T.hold;
    const prog = { v: 0 };
    gsap.to(prog, { v: 100, duration: total / 1000, ease: 'power1.inOut', onUpdate: () => {
      countEl.textContent = Math.round(prog.v);
      barEl.style.transform = `scaleX(${prog.v / 100})`;
    } });
    let t = 0;
    T.list.forEach((g, idx) => { later(() => { if (!finalShown) form(g); }, t); t += idx === 0 ? T.first : T.each; });
    later(() => showFinal(T.hold), t);
  });

  /* ---------- skip ---------- */
  function skip() {
    if (finalShown) return;
    timers.forEach(clearTimeout);
    countEl.textContent = '100'; barEl.style.transform = 'scaleX(1)';
    showFinal(700);
  }
  el.addEventListener('pointerdown', skip);
  const onKey = () => { if (!landed) skip(); };
  addEventListener('keydown', onKey);

  /* ---------- pointer + resize ---------- */
  const onMove = e => { mouseX = e.clientX; mouseY = e.clientY; };
  const onLeave = () => { mouseX = mouseY = -9999; };
  addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  const onResize = () => { resize(); if (current && mode === 'text') form(current, false); };
  addEventListener('resize', onResize);

  /* =========================================================
     Exit: blast doors
     ========================================================= */
  api.exit = (onReveal) => {
    let revealed = false;
    const reveal = () => { if (!revealed) { revealed = true; if (onReveal) onReveal(); } };
    const scatter = () => {
      mode = 'exit';
      spring = 0.02; damp = 0.92;
      for (let i = 0; i < P; i++) {
        tx[i] = px[i] + (Math.random() - .5) * W * 0.6;
        ty[i] = py[i] - H * (0.8 + Math.random() * 0.9);
      }
    };
    box.classList.remove('is-hit');

    gsap.timeline({
      onComplete: () => {
        cancelAnimationFrame(raf);
        removeEventListener('keydown', onKey);
        removeEventListener('pointermove', onMove);
        removeEventListener('resize', onResize);
        document.removeEventListener('pointerleave', onLeave);
        reveal();
        el.remove();
      }
    })
      .add(scatter, 0)
      .to(fadeEls, { opacity: 0, duration: .7, ease: 'power2.in' }, 0)
      // camera dollies into the globe as it fades
      .to(G, { scale: 2.6, alpha: 0, duration: 1.5, ease: 'power3.in' }, 0)
      .to(gCanvas, { opacity: 0, duration: .5 }, 1.1)
      // light line down the seam
      .fromTo(seam, { scaleY: 0, opacity: 1 }, { scaleY: 1, duration: .7, ease: 'expo.inOut' }, .7)
      // lock lights switch on, top to bottom
      .add(() => lights.forEach((l, i) => setTimeout(() => l.classList.add('is-on'), (i % (lights.length / 2)) * 70)), 1.1)
      // unlock jolt
      .to(doorL, { x: -12, duration: .2, ease: 'power3.out' }, 1.8)
      .to(doorR, { x: 12, duration: .2, ease: 'power3.out' }, 1.8)
      .to(canvas, { opacity: 0, duration: .6 }, 1.8)
      .to(seam, { opacity: 0, scaleX: 6, duration: .5, ease: 'power2.out' }, 2.05)
      // doors slide open, slowly
      .to(doorL, { xPercent: -101, duration: 2, ease: 'expo.inOut' }, 2.2)
      .to(doorR, { xPercent: 101, duration: 2, ease: 'expo.inOut' }, 2.2)
      .add(reveal, 2.6);
  };
})();
