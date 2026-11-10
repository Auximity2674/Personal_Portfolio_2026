/* =========================================================
   "Signal field" background
   A full-page WebGL shader behind the content:
   - slow domain-warped smoke in silver and ice blue
   - a sensor-style dot grid that drifts with scroll (parallax)
     and lights up around the cursor
   - a faint scanner band sweeping top to bottom
   Falls back to the plain CSS background if WebGL is missing.
   Reduced motion: one still frame, no tracking.
   ========================================================= */
(() => {
  'use strict';

  const canvas = document.querySelector('.bg-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const vert = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const frag = `
    precision mediump float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uMouseOn;
    uniform float uScroll;
    uniform float uDpr;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 px = gl_FragCoord.xy / uDpr;            // CSS pixels, origin bottom-left
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      float t = uTime * 0.04;

      vec3 bg = vec3(0.024, 0.027, 0.035);         // --bg #060709
      vec3 ice = vec3(0.486, 0.769, 1.0);          // --accent #7CC4FF
      vec3 silver = vec3(0.78, 0.80, 0.83);        // --silver

      // Smoke: domain-warped noise, drifting slowly and with scroll
      vec2 q = vec2(uv.x * aspect, uv.y) * 1.5 + vec2(0.0, uScroll * 0.00022);
      vec2 w = vec2(fbm(q + t), fbm(q + vec2(5.2, 1.3) - t));
      float smoke = fbm(q + 2.2 * w + t * 0.5);
      float s = smoothstep(0.38, 0.95, smoke);
      vec3 col = bg + silver * 0.06 * s + ice * 0.13 * s * s * w.x;

      // Cursor glow
      float md = length(px - uMouse);
      float mg = exp(-(md * md) / (2.0 * 220.0 * 220.0)) * uMouseOn;
      col += ice * 0.06 * mg;

      // Dot grid, parallaxed against the page scroll
      float sp = 28.0;
      vec2 g = px - vec2(0.0, uScroll * 0.35);
      vec2 cell = mod(g, sp) - sp * 0.5;
      float dotMask = smoothstep(1.7, 0.5, length(cell));
      vec2 id = floor(g / sp);
      float pulse = smoothstep(0.6, 0.9, fbm(id * 0.11 + t * 3.0));

      // Scanner band, top to bottom
      float sweep = 1.0 - fract(uTime * 0.03);
      float band = exp(-pow((uv.y - sweep) * 16.0, 2.0));

      float bright = 0.14 + 0.5 * pulse + 1.0 * mg + 0.5 * band;
      vec3 dotCol = mix(silver, ice, clamp(pulse * 0.6 + mg + band, 0.0, 1.0));
      col += dotCol * dotMask * bright * 0.5;
      col += ice * band * 0.03;

      // Vignette
      float vig = smoothstep(1.2, 0.2, length((uv - 0.5) * vec2(aspect * 0.8, 1.0)));
      col *= mix(0.6, 1.0, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = name => gl.getUniformLocation(prog, name);
  const uRes = u('uRes'), uTime = u('uTime'), uMouse = u('uMouse'), uMouseOn = u('uMouseOn'), uScroll = u('uScroll'), uDpr = u('uDpr');

  // Background never needs retina density; this keeps it cheap.
  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1) * (coarse ? 0.75 : 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uDpr, dpr);
  }

  // Pointer, eased
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, on: 0, ton: 0 };
  if (!reduce && !coarse) {
    addEventListener('pointermove', e => { mouse.tx = e.clientX; mouse.ty = innerHeight - e.clientY; mouse.ton = 1; }, { passive: true });
    document.addEventListener('pointerleave', () => (mouse.ton = 0));
  }

  function draw(time) {
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.on += (mouse.ton - mouse.on) * 0.05;
    gl.uniform1f(uTime, time);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uMouseOn, mouse.on);
    gl.uniform1f(uScroll, window.scrollY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  addEventListener('resize', () => { resize(); if (reduce) draw(24); });

  if (reduce) {
    draw(24);
    canvas.classList.add('is-ready');
    return;
  }

  // ~45 fps cap, paused while the tab is hidden
  let last = 0;
  const start = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || now - last < 22) return;
    last = now;
    draw((now - start) / 1000 + 24);
  }
  draw(24);
  requestAnimationFrame(loop);
  setTimeout(() => canvas.classList.add('is-ready'), 60);

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); canvas.remove(); });
})();
