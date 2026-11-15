window.G = window.G || {};
/* AV: code-drawn effects (SPEC section 10): particle overlay, trails, confetti, flash, shake,
   the aurora (the child's progress picture) and weather. No image files. */
(function () {
  'use strict';
  var G = window.G;
  var TAU = Math.PI * 2;
  var AUR_FALLBACK = ['#5df2b0', '#2de0d0', '#45c8ff', '#6f8dff', '#a77bff', '#ff6fb5', '#ffd34d'];
  var WISP = '#9fc4b0';

  function still() { return document.documentElement.classList.contains('still'); }
  function fast() { return !!G.fast; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var probe = null;
  function toRgb(c) {
    if (!probe) { var pc = document.createElement('canvas'); pc.width = pc.height = 1; probe = pc.getContext('2d'); }
    if (!probe) return [255, 255, 255];
    probe.fillStyle = '#000'; probe.fillStyle = String(c || '#fff');
    var s = probe.fillStyle;
    if (s.charAt(0) === '#') return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    var m = s.match(/[\d.]+/g) || [255, 255, 255];
    return [+m[0], +m[1], +m[2]];
  }
  function rgba(rgb, a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }
  function mix(rgb, to, k) { return [Math.round(rgb[0] + (to[0] - rgb[0]) * k), Math.round(rgb[1] + (to[1] - rgb[1]) * k), Math.round(rgb[2] + (to[2] - rgb[2]) * k)]; }
  function cssVar(name, fb) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; }
  }
  function aurColors() { return AUR_FALLBACK.map(function (fb, i) { return cssVar('--aur-' + (i + 1), fb); }); }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ---------- sprites and paths (made once) ---------- */

  var sprites = {};
  function glow(color) {
    var key = 'g' + color;
    if (sprites[key]) return sprites[key];
    var c = mkCanvas(64, 64), x = c.getContext('2d'), rgb = toRgb(color);
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(mix(rgb, [255, 255, 255], 0.5), 1));
    g.addColorStop(0.2, rgba(rgb, 0.75));
    g.addColorStop(0.5, rgba(rgb, 0.22));
    g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    sprites[key] = c;
    return c;
  }
  function softGlow(color) {
    var key = 's' + color;
    if (sprites[key]) return sprites[key];
    var c = mkCanvas(64, 64), x = c.getContext('2d'), rgb = toRgb(color);
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(mix(rgb, [255, 255, 255], 0.22), 1)); g.addColorStop(0.3, rgba(rgb, 0.6)); g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    sprites[key] = c;
    return c;
  }
  function core() {
    if (sprites.core) return sprites.core;
    var c = mkCanvas(32, 32), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    sprites.core = c;
    return c;
  }

  var P = null;
  function paths() {
    if (P || typeof Path2D === 'undefined') return P;
    P = {};
    var h = new Path2D();
    h.moveTo(0, -0.3);
    h.bezierCurveTo(-0.15, -0.75, -1.05, -0.65, -0.95, 0.0);
    h.bezierCurveTo(-0.88, 0.42, -0.35, 0.62, 0, 0.95);
    h.bezierCurveTo(0.35, 0.62, 0.88, 0.42, 0.95, 0.0);
    h.bezierCurveTo(1.05, -0.65, 0.15, -0.75, 0, -0.3);
    h.closePath(); P.heart = h;
    var hl = new Path2D(); hl.ellipse(-0.45, -0.22, 0.2, 0.12, -0.6, 0, TAU); P.heartHi = hl;
    var l = new Path2D(); l.moveTo(0, -1); l.quadraticCurveTo(0.75, -0.35, 0, 1); l.quadraticCurveTo(-0.75, -0.35, 0, -1); l.closePath(); P.leaf = l;
    var lr = new Path2D(); lr.moveTo(0, -0.85); lr.lineTo(0, 1.15); P.rib = lr;
    var st = new Path2D();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.45 : 1; st[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    st.closePath(); P.star = st;
    var sn = new Path2D();
    for (i = 0; i < 6; i++) {
      var an = i * Math.PI / 3, cx = Math.cos(an), sy = Math.sin(an);
      sn.moveTo(0, 0); sn.lineTo(cx, sy);
      sn.moveTo(cx * 0.55, sy * 0.55); sn.lineTo(cx * 0.55 + Math.cos(an + 0.7) * 0.3, sy * 0.55 + Math.sin(an + 0.7) * 0.3);
      sn.moveTo(cx * 0.55, sy * 0.55); sn.lineTo(cx * 0.55 + Math.cos(an - 0.7) * 0.3, sy * 0.55 + Math.sin(an - 0.7) * 0.3);
    }
    P.flake = sn;
    var d = new Path2D(); d.moveTo(0, -1); d.bezierCurveTo(0.35, -0.4, 0.62, 0.05, 0.62, 0.38); d.arc(0, 0.38, 0.62, 0, Math.PI); d.bezierCurveTo(-0.62, 0.05, -0.35, -0.4, 0, -1); d.closePath(); P.drop = d;
    P.shards = [];
    for (i = 0; i < 5; i++) {
      var sh = new Path2D(), k = 3 + (i % 2), pts = [];
      for (var j = 0; j < k; j++) { var aa = j / k * TAU + rnd(-0.4, 0.4); pts.push([Math.cos(aa) * rnd(0.5, 1), Math.sin(aa) * rnd(0.35, 1)]); }
      pts.forEach(function (p, n) { sh[n ? 'lineTo' : 'moveTo'](p[0], p[1]); });
      sh.closePath(); P.shards.push(sh);
    }
    var dm = new Path2D(); dm.moveTo(0, -1); dm.lineTo(0.5, 0); dm.lineTo(0, 1); dm.lineTo(-0.5, 0); dm.closePath(); P.diamond = dm;
    return P;
  }

  /* ---------- overlay: particles, trails, confetti, flash ---------- */

  var OV = { canvas: null, ctx: null, stage: null, raf: 0, last: 0, parts: [], pool: [], trails: [], flashes: [] };
  var MAXP = 900;

  function ensure() {
    if (OV.ctx && OV.canvas.isConnected) return true;
    var st = OV.stage && OV.stage.isConnected ? OV.stage : document.getElementById('stage');
    if (!st) return false;
    return setup(st);
  }
  function setup(stage) {
    var c = OV.canvas;
    if (!c) {
      c = document.createElement('canvas');
      c.width = 1280; c.height = 800;
      c.className = 'fx-overlay';
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:800px;pointer-events:none;z-index:900';
      var x = c.getContext && c.getContext('2d');
      if (!x) return false;
      OV.canvas = c; OV.ctx = x;
    }
    OV.stage = stage;
    if (c.parentNode !== stage) stage.appendChild(c);
    return true;
  }

  function newPart() {
    if (OV.parts.length >= MAXP) return null;
    var p = OV.pool.pop() || {};
    p.x = p.y = p.vx = p.vy = p.rot = p.vr = 0; p.g = 0; p.drag = 0; p.age = 0; p.life = 1; p.size = 4;
    p.alpha = 1; p.add = true; p.shape = 'glow'; p.col = '#fff'; p.rgb = null; p.flip = 0; p.vf = 0; p.sway = 0; p.ph = Math.random() * TAU; p.grow = 0; p.shard = 0;
    OV.parts.push(p);
    return p;
  }

  var KIND = {
    hit: { col: '#fff3c4', n: 16 }, shield: { col: '#bfeaff', n: 16 }, spark: { col: '#ffe27a', n: 14 },
    heart: { col: '#ff6b9d', n: 10 }, leaf: { col: '#6fd36a', n: 12 }, ember: { col: '#ff9a3c', n: 18 },
    drop: { col: '#5cc8ff', n: 14 }, star: { col: '#ffd34d', n: 10 }, snow: { col: '#ffffff', n: 16 }
  };

  function spawn(kind, x, y, i, n, col) {
    var p = newPart(); if (!p) return;
    var a = rnd(0, TAU), sp;
    p.x = x; p.y = y; p.col = col; p.rgb = toRgb(col);
    switch (kind) {
      case 'hit':
        if (i === 0) { p.shape = 'ring'; p.size = 16; p.grow = 120; p.life = 0.3; p.alpha = 0.95; p.add = false; break; }
        if (i === 1) { p.shape = 'pow'; p.size = 62; p.life = 0.26; p.rot = rnd(0, TAU); p.add = false; break; }
        if (i < 4) { p.shape = 'flare'; p.size = rnd(60, 90); p.life = 0.22; break; }
        sp = rnd(320, 700); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.drag = 5; p.shape = 'streak'; p.size = rnd(3, 6); p.life = rnd(0.25, 0.45); p.add = false;
        break;
      case 'shield':
        if (i < 2) { p.shape = 'flare'; p.size = 110; p.life = 0.25; p.col = '#ffffff'; break; }
        sp = rnd(160, 460); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 140; p.g = 900; p.drag = 1.2;
        p.shape = 'shard'; p.shard = i % 5; p.size = rnd(9, 22); p.rot = rnd(0, TAU); p.vr = rnd(-9, 9); p.life = rnd(0.7, 1.1); p.add = false;
        break;
      case 'spark':
        sp = rnd(80, 300); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 40; p.drag = 2.6; p.g = -30;
        p.shape = i % 3 ? 'hot' : 'twinkle'; p.size = rnd(6, 12); p.life = rnd(0.5, 0.9); p.add = p.shape === 'twinkle';
        break;
      case 'heart':
        p.x += rnd(-40, 40); p.y += rnd(-20, 20); p.vx = rnd(-160, 160); p.vy = rnd(-260, -110); p.drag = 1.6; p.g = -40; p.sway = rnd(20, 50);
        p.shape = 'heart'; p.size = rnd(13, 24); p.rot = rnd(-0.3, 0.3); p.life = rnd(1.0, 1.5); p.add = false;
        break;
      case 'leaf':
        sp = rnd(120, 320); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 150; p.drag = 2.2; p.g = 160; p.sway = rnd(30, 60);
        p.shape = 'leaf'; p.size = rnd(12, 19); p.rot = rnd(0, TAU); p.vr = rnd(-5, 5); p.vf = rnd(4, 9); p.life = rnd(1.0, 1.5); p.add = false;
        p.rgb = mix(p.rgb, [[255, 230, 120], [40, 140, 60], [150, 230, 110]][i % 3], 0.35);
        break;
      case 'ember':
        p.x += rnd(-30, 30); p.vx = rnd(-80, 80); p.vy = rnd(-320, -120); p.drag = 1.5; p.g = -80; p.sway = rnd(10, 30);
        p.shape = 'ember'; p.size = rnd(6, 11); p.life = rnd(0.7, 1.3); p.add = false;
        p.rgb = mix(p.rgb, [[255, 220, 120], [255, 90, 40], [255, 160, 60]][i % 3], 0.5);
        break;
      case 'drop':
        sp = rnd(180, 420); a = rnd(-Math.PI * 0.95, -Math.PI * 0.05); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.g = 1100; p.drag = 0.4;
        p.shape = 'drop'; p.size = rnd(5, 10); p.life = rnd(0.6, 0.9); p.add = false;
        if (i === 0) { p.shape = 'ring'; p.size = 8; p.grow = 160; p.life = 0.45; p.vx = p.vy = 0; p.g = 0; p.alpha = 0.7; p.add = true; }
        break;
      case 'star':
        sp = rnd(140, 380); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 60; p.drag = 2.4; p.g = 120;
        p.shape = 'star'; p.size = rnd(9, 17); p.rot = rnd(0, TAU); p.vr = rnd(-6, 6); p.life = rnd(0.8, 1.2); p.add = false;
        break;
      case 'snow':
        sp = rnd(60, 240); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 60; p.drag = 2.8; p.g = 50; p.sway = rnd(10, 30);
        p.shape = i % 2 ? 'flake' : 'glow'; p.size = rnd(5, 11); p.rot = rnd(0, TAU); p.vr = rnd(-2, 2); p.life = rnd(1.0, 1.6);
        p.add = p.shape === 'glow';
        break;
    }
  }

  function burst(x, y, opt) {
    opt = opt || {};
    if (fast() || document.hidden || !ensure()) return;
    var kind = KIND[opt.kind] ? opt.kind : 'spark', k = KIND[kind];
    var n = Math.round(clamp(+opt.count || k.n, 1, 120));
    if (still()) n = Math.max(3, Math.round(n / 3));
    var col = opt.color || k.col;
    x = +x || 0; y = +y || 0;
    for (var i = 0; i < n; i++) spawn(kind, x, y, i, n, col);
    wake();
  }

  function bezier(a, c, b, t) {
    var u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function trail(from, to, opt) {
    opt = opt || {};
    return new Promise(function (resolve) {
      from = from || { x: 0, y: 0 }; to = to || { x: 0, y: 0 };
      var a = { x: +from.x || 0, y: +from.y || 0 }, b = { x: +to.x || 0, y: +to.y || 0 };
      if (fast() || document.hidden || !ensure()) { resolve(); return; }
      var kind = KIND[opt.kind] ? opt.kind : 'spark', col = opt.color || KIND[kind].col;
      var ms = clamp(+opt.ms || 700, 120, 4000);
      if (still()) {
        // No flying comet in reduced motion: a soft glow where it lands, then on.
        var p = newPart(); if (p) { p.x = b.x; p.y = b.y; p.shape = 'flare'; p.size = 50; p.life = 0.3; p.col = col; p.rgb = toRgb(col); wake(); }
        setTimeout(resolve, 160);
        return;
      }
      var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / dist, ny = dx / dist;
      if (ny > 0) { nx = -nx; ny = -ny; } // arch upward
      var bend = Math.min(220, dist * 0.28);
      var tr = {
        a: a, b: b, c: { x: (a.x + b.x) / 2 + nx * bend, y: (a.y + b.y) / 2 + ny * bend },
        kind: kind, col: col, rgb: toRgb(col), ms: ms, age: 0, hist: [], done: false, resolve: null
      };
      var guard = setTimeout(function () { finish(tr); }, ms + 250);
      tr.resolve = function () { clearTimeout(guard); resolve(); };
      OV.trails.push(tr);
      wake();
    });
  }
  function finish(tr) {
    if (tr.done) return;
    tr.done = true;
    var i = OV.trails.indexOf(tr); if (i >= 0) OV.trails.splice(i, 1);
    if (!document.hidden && OV.ctx) {
      var k = tr.kind === 'heart' ? 'heart' : tr.kind === 'star' ? 'star' : 'spark';
      for (var n = 0; n < 7; n++) spawn(k, tr.b.x, tr.b.y, n + 1, 8, tr.col);
      var p = newPart(); if (p) { p.x = tr.b.x; p.y = tr.b.y; p.shape = 'flare'; p.size = 70; p.life = 0.25; p.col = tr.col; p.rgb = tr.rgb; }
      wake();
    }
    tr.resolve();
  }

  var CONF_COLS = null;
  function confetti(ms) {
    if (fast() || document.hidden || !ensure()) return;
    ms = clamp(+ms || 2400, 400, 8000);
    if (!CONF_COLS) CONF_COLS = aurColors().concat(['#ffffff', '#ff6b9d', '#ffc93c']).map(toRgb);
    var calm = still(), n = calm ? 50 : 190, life = ms / 1000;
    for (var i = 0; i < n; i++) {
      var p = newPart(); if (!p) break;
      var cannon = !calm && i < 80;
      p.shape = 'conf'; p.add = false; p.rgb = CONF_COLS[i % CONF_COLS.length];
      p.size = rnd(14, 22); p.rot = rnd(0, TAU); p.vr = calm ? 0 : rnd(-8, 8); p.flip = rnd(0, TAU); p.vf = calm ? 0 : rnd(6, 14);
      p.drag = 1.6; p.g = 420; p.sway = calm ? 0 : rnd(10, 40);
      if (cannon) {
        var left = i % 2 === 0;
        p.x = left ? -10 : 1290; p.y = rnd(560, 760);
        var ang = left ? rnd(-1.35, -0.8) : rnd(-Math.PI + 0.8, -Math.PI + 1.35);
        var sp = rnd(900, 1500); p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
        p.life = life * rnd(0.75, 1);
      } else {
        p.x = rnd(-20, 1300); p.y = rnd(-120, -10) - (calm ? 0 : rnd(0, 200)); p.vx = rnd(-40, 40); p.vy = rnd(160, 320);
        p.life = life * rnd(0.8, 1);
      }
    }
    wake();
  }

  function flash(color, ms) {
    if (fast() || still() || document.hidden || !ensure()) return;
    OV.flashes.push({ rgb: toRgb(color || '#ffffff'), ms: clamp(+ms || 260, 60, 2000), age: 0 });
    wake();
  }

  var shaking = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function shake(el, strength) {
    if (!el || !el.animate || fast() || still() || document.hidden) return;
    var s = clamp(+strength || 0.5, 0, 1); if (!s) return;
    var prev = shaking && shaking.get(el); if (prev) try { prev.cancel(); } catch (e) { /* ignore */ }
    var amp = 3 + s * 13, frames = [], k = 9, useTranslate = 'translate' in el.style;
    for (var i = 0; i <= k; i++) {
      var f = i === k ? 0 : amp * (1 - i / k), x = (i % 2 ? 1 : -1) * f * rnd(0.6, 1), y = rnd(-0.6, 0.6) * f;
      frames.push(useTranslate ? { translate: x.toFixed(1) + 'px ' + y.toFixed(1) + 'px' } : { transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' });
    }
    try {
      var an = el.animate(frames, useTranslate ? { duration: 260 + s * 240, easing: 'ease-out' } : { duration: 260 + s * 240, easing: 'ease-out', composite: 'add' });
      if (shaking) shaking.set(el, an);
    } catch (e) { /* no animation support: skip */ }
  }

  function wake() {
    if (!OV.raf && !document.hidden) { OV.last = 0; OV.raf = requestAnimationFrame(frame); }
  }

  function frame(ts) {
    OV.raf = 0;
    var x = OV.ctx; if (!x) return;
    var dt = OV.last ? Math.min(0.05, (ts - OV.last) / 1000) : 1 / 60;
    OV.last = ts;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, 1280, 800);
    var parts = OV.parts, i, p;
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); OV.pool.push(p); continue; }
      var dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
      p.x += p.vx * dt + (p.sway ? Math.cos(p.age * 3 + p.ph) * p.sway * dt : 0);
      p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
    }
    drawParts(x, false);
    x.globalCompositeOperation = 'lighter';
    drawParts(x, true);
    drawTrails(x, dt);
    x.globalCompositeOperation = 'source-over';
    for (i = OV.flashes.length - 1; i >= 0; i--) {
      var f = OV.flashes[i]; f.age += dt * 1000;
      var k = f.age / f.ms;
      if (k >= 1) { OV.flashes.splice(i, 1); continue; }
      x.globalAlpha = (k < 0.12 ? k / 0.12 : Math.pow(1 - (k - 0.12) / 0.88, 2)) * 0.6;
      x.fillStyle = rgba(f.rgb, 1); x.fillRect(0, 0, 1280, 800);
    }
    x.globalAlpha = 1;
    if (parts.length || OV.trails.length || OV.flashes.length) OV.raf = requestAnimationFrame(frame);
    else x.clearRect(0, 0, 1280, 800);
  }

  function drawParts(x, additive) {
    var parts = OV.parts, pp = paths();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.add !== additive) continue;
      var k = p.age / p.life, fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25, s = p.size, a = p.alpha * fade;
      x.globalAlpha = clamp(a, 0, 1);
      switch (p.shape) {
        case 'glow': x.drawImage(glow(p.col), p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2); break;
        case 'hot': x.drawImage(emberSprite(p.col), p.x - s * 1.4, p.y - s * 1.4, s * 2.8, s * 2.8); break;
        case 'pow':
          // A quick comic-style impact star: grows and fades in a quarter second.
          var ps = s * (0.5 + k * 0.9);
          x.globalAlpha = (1 - k) * 0.95;
          x.fillStyle = '#fff6d0'; x.strokeStyle = 'rgba(255,190,60,.9)'; x.lineWidth = 4;
          x.beginPath();
          for (var q = 0; q < 16; q++) { var an = p.rot + q * Math.PI / 8, rr = q % 2 ? ps * 0.42 : ps; x[q ? 'lineTo' : 'moveTo'](p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr); }
          x.closePath(); x.fill(); x.stroke();
          break;
        case 'twinkle':
          x.drawImage(glow(p.col), p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);
          var tw = s * (2.2 + Math.sin(p.age * 20 + p.ph));
          x.drawImage(core(), p.x - tw, p.y - 1.5, tw * 2, 3); x.drawImage(core(), p.x - 1.5, p.y - tw, 3, tw * 2);
          break;
        case 'ember':
          x.globalAlpha = clamp(a * (0.65 + 0.35 * Math.sin(p.age * 25 + p.ph)), 0, 1);
          x.drawImage(emberSprite(rgba(p.rgb, 1)), p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);
          break;
        case 'flare': var fs = s * (0.6 + k * 0.8); x.globalAlpha = 1 - k; x.drawImage(glow(p.col), p.x - fs, p.y - fs, fs * 2, fs * 2); break;
        case 'ring':
          x.strokeStyle = rgba(p.rgb, 1); x.lineWidth = 8 * (1 - k) + 1; x.globalAlpha = p.alpha * (1 - k);
          x.beginPath(); x.arc(p.x, p.y, s + p.grow * Math.sqrt(k), 0, TAU); x.stroke();
          break;
        case 'streak':
          var len = 0.045;
          x.strokeStyle = rgba(mix(p.rgb, [255, 200, 70], 0.35), 1); x.lineWidth = s * (1 - k * 0.6); x.lineCap = 'round';
          x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * len, p.y - p.vy * len); x.stroke();
          break;
        default:
          if (!pp) break;
          drawShape(x, p, pp, s, k);
      }
    }
    x.globalAlpha = 1;
  }

  function drawShape(x, p, pp, s, k) {
    var c = Math.cos(p.rot), sn = Math.sin(p.rot), pop = k < 0.12 ? 0.5 + k / 0.12 * 0.5 : 1;
    s *= pop;
    if (p.shape === 'conf') {
      var fy = Math.cos(p.flip);
      x.setTransform(c * s, sn * s, -sn * s * fy * 0.55, c * s * fy * 0.55, p.x, p.y);
      x.fillStyle = rgba(fy > 0 ? p.rgb : mix(p.rgb, [0, 0, 0], 0.25), 1);
      x.fillRect(-0.5, -0.5, 1, 1);
      x.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    var fl = p.shape === 'leaf' ? Math.cos(p.flip) : 1;
    x.setTransform(c * s * fl, sn * s * fl, -sn * s, c * s, p.x, p.y);
    switch (p.shape) {
      case 'heart':
        x.fillStyle = rgba(p.rgb, 1); x.fill(pp.heart);
        x.lineWidth = 0.14; x.strokeStyle = 'rgba(90,10,40,.55)'; x.stroke(pp.heart);
        x.fillStyle = 'rgba(255,255,255,.75)'; x.fill(pp.heartHi);
        break;
      case 'leaf':
        x.fillStyle = rgba(p.rgb, 1); x.fill(pp.leaf);
        x.lineWidth = 0.1; x.strokeStyle = rgba(mix(p.rgb, [0, 40, 0], 0.55), 0.9); x.stroke(pp.rib);
        break;
      case 'star':
        x.fillStyle = rgba(p.rgb, 1); x.fill(pp.star);
        x.lineWidth = 0.14; x.strokeStyle = 'rgba(120,70,0,.6)'; x.stroke(pp.star);
        break;
      case 'shard':
        var glint = Math.pow(Math.abs(Math.cos(p.rot * 1.5)), 6);
        x.fillStyle = rgba(mix(p.rgb, [255, 255, 255], 0.3 + glint * 0.6), 0.45 + glint * 0.4); x.fill(pp.shards[p.shard]);
        x.lineWidth = 0.09; x.strokeStyle = 'rgba(255,255,255,.95)'; x.stroke(pp.shards[p.shard]);
        break;
      case 'flake':
        x.lineWidth = 0.16; x.lineCap = 'round'; x.strokeStyle = rgba(p.rgb, 1); x.stroke(pp.flake);
        break;
      case 'drop':
        x.setTransform(s * 0.8, 0, 0, s, p.x, p.y);
        var ang = Math.atan2(p.vy, p.vx) - Math.PI / 2;
        x.rotate(ang + Math.PI);
        x.fillStyle = rgba(p.rgb, 0.85); x.fill(pp.drop);
        x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(-0.2, 0.3, 0.16, 0, TAU); x.fill();
        break;
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawTrails(x, dt) {
    var list = OV.trails.slice();
    for (var i = 0; i < list.length; i++) {
      var tr = list[i];
      tr.age += dt * 1000;
      var k = Math.min(1, tr.age / tr.ms), pos = bezier(tr.a, tr.c, tr.b, ease(k));
      tr.hist.unshift(pos); if (tr.hist.length > 16) tr.hist.pop();
      var g = glow(tr.col), n = tr.hist.length;
      for (var j = n - 1; j >= 1; j--) {
        var q = tr.hist[j], f = 1 - j / n, s = 8 + 22 * f;
        x.globalAlpha = 0.6 * f; x.drawImage(g, q.x - s, q.y - s, s * 2, s * 2);
      }
      x.globalAlpha = 1;
      x.drawImage(g, pos.x - 44, pos.y - 44, 88, 88);
      // A solid hot core drawn normally so the comet still reads over a bright picture.
      x.globalCompositeOperation = 'source-over';
      x.drawImage(emberSprite(tr.col), pos.x - 18, pos.y - 18, 36, 36);
      x.globalCompositeOperation = 'lighter';
      x.drawImage(core(), pos.x - 12, pos.y - 12, 24, 24);
      if (tr.kind === 'heart' && P) {
        x.globalCompositeOperation = 'source-over';
        x.setTransform(20, 0, 0, 20, pos.x, pos.y); x.fillStyle = rgba(tr.rgb, 1); x.fill(P.heart);
        x.fillStyle = 'rgba(255,255,255,.75)'; x.fill(P.heartHi); x.setTransform(1, 0, 0, 1, 0, 0);
        x.globalCompositeOperation = 'lighter';
      }
      for (var e = 0; e < 2; e++) {
        var p = newPart();
        if (p) { p.x = pos.x + rnd(-4, 4); p.y = pos.y + rnd(-4, 4); p.vx = rnd(-30, 30); p.vy = rnd(-30, 30); p.drag = 2; p.size = rnd(3, 6); p.life = rnd(0.3, 0.55); p.col = tr.col; p.rgb = tr.rgb; }
      }
      if (k >= 1) finish(tr);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    // Hidden: drop the overlay work and let every waiting trail resolve now.
    if (OV.raf) { cancelAnimationFrame(OV.raf); OV.raf = 0; }
    OV.trails.slice().forEach(function (tr) { tr.done = true; tr.resolve(); });
    OV.trails.length = 0;
    while (OV.parts.length) OV.pool.push(OV.parts.pop());
    OV.flashes.length = 0;
    if (OV.ctx) OV.ctx.clearRect(0, 0, 1280, 800);
  });

  /* ---------- canvas sizing shared by Aurora and Weather ---------- */

  // If the host sized the canvas only by its width/height attributes, pin that display size
  // before we change the backing store (otherwise the canvas would shrink on screen).
  function pinSize(cv) {
    if (cv._avPinned || !cv.isConnected) return;
    cv._avPinned = true;
    var w0 = cv.clientWidth, h0 = cv.clientHeight, ow = cv.width, oh = cv.height;
    cv.width = ow + 7; cv.height = oh + 5;
    var byAttr = cv.clientWidth !== w0 || cv.clientHeight !== h0;
    cv.width = ow; cv.height = oh;
    if (byAttr) { cv.style.width = (cv._avW || w0 || ow) + 'px'; cv.style.height = (cv._avH || h0 || oh) + 'px'; }
  }
  function cssSize(cv) {
    pinSize(cv);
    return { w: cv.clientWidth || cv._avW || 1280, h: cv.clientHeight || cv._avH || 300 };
  }

  var registry = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function claim(cv, ctl) {
    if (!registry) return;
    var old = registry.get(cv);
    if (old && old !== ctl) old.destroy();
    registry.set(cv, ctl);
  }

  // A shared loop helper: runs fn(dt, t) on rAF, pauses while hidden, auto-stops if the canvas
  // has left the page for 3 seconds (a forgotten destroy must not leak).
  function Loop(cv, fn, opt) {
    var raf = 0, last = 0, dead = false, gone = 0, minDt = 0;
    function tick(ts) {
      raf = 0;
      if (dead) return;
      if (!cv.isConnected) {
        gone += last ? (ts - last) : 16; last = ts;
        if (gone > 3000 && opt.onLost) { opt.onLost(); return; }
        raf = requestAnimationFrame(tick); return;
      }
      gone = 0;
      minDt = opt.minDt ? opt.minDt() : 0;
      var dtms = last ? ts - last : 16;
      if (dtms < minDt) { raf = requestAnimationFrame(tick); return; }
      last = ts;
      var keep = fn(Math.min(0.1, dtms / 1000));
      if (keep !== false) raf = requestAnimationFrame(tick);
    }
    function vis() { if (document.hidden) stop(); else start(); }
    function start() { if (!raf && !dead && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    document.addEventListener('visibilitychange', vis);
    return {
      start: start, stop: stop,
      kill: function () { dead = true; stop(); document.removeEventListener('visibilitychange', vis); }
    };
  }

  /* ---------- Aurora ---------- */

  // One curtain per colour band, lowest first. y: lower edge (share of height), h: ray height, a: strength.
  // One curtain per colour band. y: lower edge (share of height), amp/k: the big bend, h: ray height,
  // fa/fk: the folds, c/span: where across the sky the curtain hangs. Curves cross so bands weave, not stack.
  var BANDS = [
    { y: 0.46, amp: 0.22, k: 2.6, sp: 0.09, h: 0.50, a: 0.87, fa: 0.045, fk: 9, c: 0.5, span: 1.5 },
    { y: 0.40, amp: 0.20, k: 3.4, sp: -0.07, h: 0.46, a: 0.81, fa: 0.04, fk: 11, c: 0.3, span: 1.0 },
    { y: 0.50, amp: 0.18, k: 2.2, sp: 0.06, h: 0.44, a: 0.78, fa: 0.04, fk: 8, c: 0.72, span: 1.0 },
    { y: 0.36, amp: 0.20, k: 3.0, sp: -0.08, h: 0.40, a: 0.78, fa: 0.04, fk: 10, c: 0.55, span: 1.1 },
    { y: 0.44, amp: 0.20, k: 3.8, sp: 0.07, h: 0.40, a: 0.75, fa: 0.035, fk: 12, c: 0.2, span: 0.9 },
    { y: 0.34, amp: 0.16, k: 2.5, sp: -0.06, h: 0.34, a: 0.75, fa: 0.04, fk: 9, c: 0.8, span: 0.9 },
    { y: 0.38, amp: 0.18, k: 3.3, sp: 0.08, h: 0.36, a: 0.81, fa: 0.035, fk: 11, c: 0.45, span: 1.0 }
  ];
  var TOPS = [4, 5, 4, 5, 5, 4, 5]; // ray tops lean violet or pink, as real curtains do
  var WISP_BAND = { y: 0.52, amp: 0.18, k: 3.0, sp: 0.05, h: 0.36, a: 0.2, fa: 0.04, fk: 8, c: 0.5, span: 0.9 };
  var RES = 0.6, STRIPS = 60;

  function raySprite(color, top) {
    var key = 'r' + color + top;
    if (sprites[key]) return sprites[key];
    var w = 24, h = 160, c = mkCanvas(w, h), x = c.getContext('2d'), rgb = toRgb(color), tp = toRgb(top || color);
    var white = [255, 255, 255], hot = mix(rgb, white, 0.35);
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tp, 0));
    g.addColorStop(0.3, rgba(tp, 0.1));
    g.addColorStop(0.6, rgba(mix(rgb, tp, 0.4), 0.34));
    g.addColorStop(0.82, rgba(rgb, 0.62));
    g.addColorStop(0.93, rgba(mix(rgb, white, 0.15), 0.95));
    g.addColorStop(0.965, rgba(hot, 1));
    g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in';
    var m = x.createLinearGradient(0, 0, w, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = m; x.fillRect(0, 0, w, h);
    sprites[key] = c;
    return c;
  }

  function Aurora(canvas, opt) {
    opt = opt || {};
    var noop = { setLevel: function () {}, destroy: function () {} };
    var x = canvas && canvas.getContext && canvas.getContext('2d');
    if (!x) return noop;
    canvas._avW = canvas.width || 1280; canvas._avH = canvas.height || 300;
    var cols = aurColors();
    var level = clamp(Math.round(+opt.level || 0), 0, 7), t = rnd(0, 100), frames = 0, W = 0, H = 0;
    var costs = new Float32Array(300), ci = 0, cn = 0;
    var bands = BANDS.map(function (b, i) {
      return { def: b, col: cols[i], spr: raySprite(cols[i], cols[TOPS[i]]), glw: softGlow(cols[i]), I: i < level ? 1 : 0, target: i < level ? 1 : 0, reveal: 1, boost: 0, delay: 0,
        ph: [i * 1.7, i * 2.3 + 1, i * 0.9 + 2, i * 3.1, i * 1.3 + 4, i * 2.7 + 0.5, i * 4.1] };
    });
    var wisp = { def: WISP_BAND, col: WISP, spr: raySprite(WISP, '#8f98b8'), glw: softGlow(WISP), I: level === 0 ? 1 : 0, target: level === 0 ? 1 : 0, reveal: 1, boost: 0, delay: 0, ph: [5, 1, 3, 2, 6, 4, 0.3] };
    var all = bands.concat([wisp]), norm = 1;
    var ro = null, dirty = true;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { dirty = true; }); ro.observe(canvas); }

    function resize() {
      var s = cssSize(canvas), w = Math.max(2, Math.round(s.w * RES)), h = Math.max(2, Math.round(s.h * RES));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      W = w; H = h; dirty = false;
    }

    function drawBand(B, dt, calm) {
      var d = B.def, ph = B.ph, I = B.I * (1 + B.boost) * norm;
      if (I < 0.004) return;
      if (B.delay > 0) { B.delay -= dt; if (B.delay > 0) return; }
      if (B.reveal < 1) B.reveal = Math.min(1, B.reveal + dt / 1.9);
      var front = -0.15 + 1.35 * B.reveal, sweeping = B.reveal < 1;
      var dir = d.sp > 0 ? 1 : -1, n = STRIPS, sw = W * 1.16 / n * 2.3, spr = B.spr;
      var shimmer = calm ? 0.15 : 1, fa = d.fa, fk = d.fk;
      var cx = d.c + 0.1 * Math.sin(t * 0.031 + ph[6]), half = d.span / 2;
      var fx = -1, fy = 0, eh = H * 0.075;
      for (var j = 0; j < n; j++) {
        var u = j / (n - 1);
        var vis = sweeping ? clamp((front - u) / 0.12, 0, 1) : 1;
        if (vis <= 0) continue;
        var e = clamp((half - Math.abs(u - cx)) / 0.2, 0, 1);
        var env = e * e * (3 - 2 * e) * (0.6 + 0.4 * Math.sin(u * 2.4 + t * 0.06 + ph[6]));
        if (env < 0.02 && !sweeping) continue;
        var f0 = fa * Math.sin(u * fk + t * 0.27 * dir + ph[0]) + 0.5 * fa * Math.sin(u * fk * 2.1 - t * 0.43 + ph[1]);
        var df = fa * fk * Math.cos(u * fk + t * 0.27 * dir + ph[0]) + 1.05 * fa * fk * Math.cos(u * fk * 2.1 - t * 0.43 + ph[1]);
        var dens = clamp(1.12 / Math.max(0.3, 1.12 + df), 0.65, 1.4); // brighter where the curtain folds over itself
        var px = (-0.06 + 1.12 * u + f0) * W;
        var yb = (d.y + d.amp * Math.sin(u * d.k + t * d.sp + ph[2]) + 0.035 * Math.sin(u * 8.7 - t * 0.21 + ph[3])) * H;
        var r1 = 0.5 + 0.5 * Math.sin(u * 87 + t * 1.25 * dir * shimmer + ph[4]) * Math.sin(u * 53 - t * 0.9 * shimmer + ph[1]);
        var r2 = 0.5 + 0.5 * Math.sin(u * 23 - t * 0.7 * shimmer + ph[5]);
        var bright = 0.38 + 0.62 * Math.pow(r1, 1.6) * (0.5 + 0.5 * r2);
        var flare = sweeping ? Math.exp(-Math.pow((u - front + 0.05) / 0.06, 2)) * (1 - B.reveal * 0.6) : 0;
        var h = d.h * H * (0.45 + 0.55 * r2) * (0.85 + 0.3 * bright) * (1 + flare * 0.5);
        var a = (bright * env * vis * Math.pow(dens, 0.7) + flare * 1.4) * I * d.a;
        if (a < 0.01) continue;
        x.globalAlpha = Math.min(1, a * 1.5);
        x.drawImage(spr, px - sw / 2, yb - h, sw, h * 1.04);
        if (bright > 0.7) {
          x.globalAlpha = Math.min(1, a * 0.6);
          x.drawImage(spr, px - sw * 0.16, yb - h * 1.3, sw * 0.32, h * 1.32);
        }
        // The bright lower edge: a continuous ribbon of small glows along the curve.
        x.globalAlpha = Math.min(1, (0.2 + 0.8 * bright) * env * vis * I * d.a * 0.9 * Math.sqrt(dens) + flare * 0.5);
        x.drawImage(B.glw, px - sw * 0.8, yb - eh * 0.62, sw * 1.6, eh);
        if (j % 12 === 6) drawGlow(B, px, yb - d.h * H * 0.45, I * env * vis);
        if (flare > 0.5 && fx < 0) { fx = px; fy = yb; }
      }
      if (fx >= 0) {
        x.globalAlpha = 0.8 * (1 - B.reveal);
        var fs = H * 0.5;
        x.drawImage(core(), fx - fs * 0.5, fy - fs * 0.9, fs, fs);
        x.drawImage(B.glw, fx - fs, fy - fs * 1.2, fs * 2, fs * 1.6);
      }
    }
    function drawGlow(B, gx, gy, k) {
      x.globalAlpha = Math.min(1, 0.13 * k);
      var gw = W * 0.34, gh = H * 0.42;
      x.drawImage(B.glw, gx - gw / 2, gy - gh / 2, gw, gh);
    }

    function step(dt) {
      var t0 = performance.now();
      var calm = still() || fast();
      if (dirty || (frames++ % 60 === 0)) resize();
      t += dt * (calm ? 0.05 : 1);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      for (var i = 0; i < all.length; i++) {
        var B = all[i];
        var rate = B.target > B.I ? 1.2 : 1.6;
        B.I += (B.target - B.I) * Math.min(1, dt * rate);
        if (Math.abs(B.target - B.I) < 0.002) B.I = B.target;
        B.boost *= Math.exp(-dt * 0.9);
      }
      // Many lit bands share the sky: scale each down a little so level 7 glows instead of whiting out.
      var lit = 0; for (i = 0; i < bands.length; i++) lit += bands[i].I;
      norm = 1 / (1 + 0.07 * Math.max(0, lit - 1));
      drawBand(wisp, dt, calm);
      for (i = 0; i < bands.length; i++) drawBand(bands[i], dt, calm);
      x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-over';
      costs[ci] = performance.now() - t0; ci = (ci + 1) % costs.length; if (cn < costs.length) cn++;
    }

    var loop = Loop(canvas, step, {
      minDt: function () { return still() ? 110 : 0; },
      onLost: function () { ctl.destroy(); }
    });

    var ctl = {
      setLevel: function (n, animate) {
        n = clamp(Math.round(+n || 0), 0, 7);
        var anim = !!animate && !fast() && !document.hidden;
        var calm = still(), stagger = 0;
        for (var i = 0; i < bands.length; i++) {
          var B = bands[i], on = i < n;
          if (on && B.target === 0) {
            B.target = 1;
            if (anim && !calm) { B.I = 1; B.reveal = 0; B.boost = 0.6; B.delay = stagger; stagger += 0.7; }
            else if (!anim) { B.I = 1; B.reveal = 1; }
          } else if (!on && B.target === 1) {
            B.target = 0; if (!anim) B.I = 0;
          }
        }
        wisp.target = n === 0 ? 1 : 0; if (!anim) wisp.I = wisp.target;
        level = n;
        if (calm || !anim) step(0);
      },
      destroy: function () {
        if (ctl.dead) return;
        ctl.dead = true;
        loop.kill();
        if (ro) ro.disconnect();
        if (registry && registry.get(canvas) === ctl) registry.delete(canvas);
        canvas.width = 0; canvas.height = 0;
      },
      // Dev aid: frame cost in ms over the last 300 frames.
      _stats: function () {
        var a = Array.prototype.slice.call(costs, 0, cn).sort(function (p, q) { return p - q; });
        var sum = a.reduce(function (s, v) { return s + v; }, 0);
        return { frames: cn, avg: cn ? sum / cn : 0, p95: cn ? a[Math.floor(cn * 0.95)] : 0, max: cn ? a[cn - 1] : 0, w: W, h: H };
      },
      _step: step
    };
    claim(canvas, ctl);
    resize();
    step(0);
    loop.start();
    return ctl;
  }

  /* ---------- Weather ---------- */

  function cloudSprite(seed) {
    var key = 'cl' + seed;
    if (sprites[key]) return sprites[key];
    var w = 520, h = 240, c = mkCanvas(w, h), x = c.getContext('2d');
    var r = seed * 9301 + 49297;
    function rr() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    function puff(cx, cy, rad, a) {
      var g = x.createRadialGradient(cx, cy - rad * 0.2, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(0.55, 'rgba(255,255,255,' + a * 0.85 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
    }
    // A flat-bottomed cumulus: a low row of wide puffs and a few tall ones on top, all inside the sprite.
    for (var i = 0; i < 7; i++) puff(110 + i * 50 + (rr() - 0.5) * 16, 160 + (rr() - 0.5) * 8, 46 + rr() * 14, 0.75);
    var tops = 3 + Math.floor(rr() * 2);
    for (i = 0; i < tops; i++) puff(160 + i * (200 / tops) + rr() * 30, 118 - rr() * 22, 58 + rr() * 18, 0.8);
    x.globalCompositeOperation = 'source-atop';
    var sh = x.createLinearGradient(0, 60, 0, 210);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.55, 'rgba(225,232,248,.25)'); sh.addColorStop(1, 'rgba(150,170,212,.6)');
    x.fillStyle = sh; x.fillRect(0, 0, w, h);
    sprites[key] = c;
    return c;
  }
  function emberSprite(color) {
    var key = 'e' + color;
    if (sprites[key]) return sprites[key];
    var c = mkCanvas(32, 32), x = c.getContext('2d'), rgb = toRgb(color), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,252,225,1)'); g.addColorStop(0.22, 'rgba(255,214,110,1)');
    g.addColorStop(0.45, rgba(rgb, 0.75)); g.addColorStop(0.7, rgba(rgb, 0.25)); g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    sprites[key] = c;
    return c;
  }
  // A soft snowflake dot with a faint cool rim so it still reads against a pale sky.
  function flakeSprite() {
    if (sprites.flake) return sprites.flake;
    var c = mkCanvas(32, 32), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.38, 'rgba(255,255,255,.95)'); g.addColorStop(0.55, 'rgba(170,195,235,.45)'); g.addColorStop(1, 'rgba(150,180,230,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    sprites.flake = c;
    return c;
  }
  function bubbleSprite() {
    if (sprites.bubble) return sprites.bubble;
    var c = mkCanvas(64, 64), x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 18, 32, 32, 30);
    g.addColorStop(0, 'rgba(190,235,255,.08)'); g.addColorStop(0.75, 'rgba(200,240,255,.35)'); g.addColorStop(0.93, 'rgba(240,252,255,.95)'); g.addColorStop(1, 'rgba(230,250,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 31, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(22, 20, 6, 3.5, -0.7, 0, TAU); x.fill();
    sprites.bubble = c;
    return c;
  }

  var WEATHER = {
    bubbles: { n: 16 }, leaves: { n: 12 }, embers: { n: 26 }, snow: { n: 70 },
    fireflies: { n: 14 }, crystals: { n: 16 }, clouds: { n: 5 }
  };

  function Weather(canvas, kind) {
    var noop = { destroy: function () {} };
    var x = canvas && canvas.getContext && canvas.getContext('2d');
    if (!x || !WEATHER[kind]) return noop;
    canvas._avW = canvas.width || 1280; canvas._avH = canvas.height || 800;
    var W = 0, H = 0, sc = 1, items = [], t = 0, frames = 0, pp = paths();
    var LEAF_COLS = ['#7fd36a', '#b8de5a', '#f2c94c', '#e9965a', '#5fbf72'].map(toRgb);
    var CRY_COLS = ['#c9a6ff', '#8fe3ff', '#ff9fd8', '#ffffff'];
    var FF = '#e6ff7a';

    function resize() {
      var s = cssSize(canvas), k = Math.min(1, 1280 / Math.max(1, s.w));
      var w = Math.max(2, Math.round(s.w * k)), h = Math.max(2, Math.round(s.h * k));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      W = w; H = h; sc = k;
    }
    function make(it, initial) {
      it.z = Math.random(); // depth: 0 far, 1 near
      it.x = rnd(0, W); it.ph = rnd(0, TAU); it.rot = rnd(0, TAU);
      var z = it.z;
      switch (kind) {
        case 'bubbles': it.r = (7 + z * 14) * sc; it.vy = -(14 + z * 30) * sc; it.y = initial ? rnd(0, H) : H + it.r * 2; break;
        case 'leaves': it.r = (10 + z * 10) * sc; it.vy = (16 + z * 22) * sc; it.vx = rnd(6, 18) * sc; it.y = initial ? rnd(0, H) : -20; it.vr = rnd(-1.2, 1.2); it.col = LEAF_COLS[Math.floor(Math.random() * LEAF_COLS.length)]; break;
        case 'embers': it.r = (3 + z * 4.5) * sc; it.vy = -(18 + z * 40) * sc; it.y = initial ? rnd(0, H) : H + 10; it.col = ['#ffb347', '#ff7a3c', '#ffd27a'][Math.floor(Math.random() * 3)]; break;
        case 'snow': it.r = (1.8 + z * z * 4.5) * sc; it.vy = (12 + z * 38) * sc; it.y = initial ? rnd(0, H) : -10; it.a = 0.6 + z * 0.4; break;
        case 'fireflies': it.r = (6 + z * 7) * sc; it.y = rnd(H * 0.2, H * 0.95); it.bx = it.x; it.by = it.y; it.f1 = rnd(0.05, 0.12); it.f2 = rnd(0.07, 0.15); it.blink = rnd(3, 6); break;
        case 'crystals': it.r = (4 + z * 6) * sc; it.vy = -(4 + z * 8) * sc; it.vx = rnd(-6, 6) * sc; it.y = initial ? rnd(0, H) : H + 10; it.col = CRY_COLS[Math.floor(Math.random() * 4)]; it.tw = rnd(2.5, 5); break;
        case 'clouds': it.w = (280 + z * 240) * sc; it.vx = (5 + z * 10) * sc; it.y = rnd(-0.08, 0.4) * H; it.x = initial ? rnd(-it.w * 0.3, W - it.w * 0.5) : -it.w; it.spr = cloudSprite(1 + Math.floor(Math.random() * 4)); it.a = 0.5 + z * 0.35; break;
      }
      return it;
    }
    function populate() {
      items = [];
      var n = WEATHER[kind].n;
      for (var i = 0; i < n; i++) items.push(make({}, true));
      items.sort(function (a, b) { return a.z - b.z; });
    }

    function step(dt) {
      var calm = still() || fast();
      if (frames++ % 90 === 0) { var ow = W, oh = H; resize(); if (ow !== W || oh !== H) populate(); }
      if (calm) dt = 0;
      t += dt;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-over';
      x.globalAlpha = 1;
      x.clearRect(0, 0, W, H);
      var add = kind === 'fireflies' || kind === 'crystals';
      if (add) x.globalCompositeOperation = 'lighter';
      for (var i = 0; i < items.length; i++) {
        var it = items[i], z = it.z;
        switch (kind) {
          case 'bubbles':
            it.y += it.vy * dt; var bx = it.x + Math.sin(t * 1.3 + it.ph) * 6 * sc;
            if (it.y < -it.r * 2) make(it, false);
            x.globalAlpha = (0.6 + z * 0.4) * clamp(it.y / (H * 0.25), 0, 1);
            x.drawImage(bubbleSprite(), bx - it.r, it.y - it.r, it.r * 2, it.r * 2);
            break;
          case 'leaves':
            it.y += it.vy * dt; it.x += (it.vx + Math.sin(t * 0.9 + it.ph) * 22 * sc) * dt; it.rot += it.vr * dt;
            if (it.y > H + 20 || it.x > W + 30) make(it, false);
            if (!pp) break;
            var fl = Math.cos(t * 1.6 + it.ph), c = Math.cos(it.rot), s = Math.sin(it.rot), r = it.r;
            x.globalAlpha = 0.55 + z * 0.4;
            x.setTransform(c * r * fl, s * r * fl, -s * r, c * r, it.x, it.y);
            x.fillStyle = rgba(fl > 0 ? it.col : mix(it.col, [30, 60, 20], 0.3), 1); x.fill(pp.leaf);
            x.lineWidth = 0.1; x.strokeStyle = rgba(mix(it.col, [20, 50, 10], 0.6), 0.8); x.stroke(pp.rib);
            x.setTransform(1, 0, 0, 1, 0, 0);
            break;
          case 'embers':
            it.y += it.vy * dt; var ex = it.x + Math.sin(t * 2 + it.ph) * 10 * sc;
            if (it.y < -10) make(it, false);
            var life = clamp(it.y / H, 0, 1);
            x.globalAlpha = (0.7 + 0.3 * life) * (0.75 + 0.25 * Math.sin(t * 9 + it.ph * 3));
            var er = it.r * 3;
            x.drawImage(emberSprite(it.col), ex - er, it.y - er, er * 2, er * 2);
            break;
          case 'snow':
            it.y += it.vy * dt; var sx = it.x + Math.sin(t * 0.8 + it.ph) * (8 + z * 14) * sc;
            if (it.y > H + 10) make(it, false);
            x.globalAlpha = it.a;
            var sr = it.r * 2.2;
            x.drawImage(flakeSprite(), sx - sr, it.y - sr, sr * 2, sr * 2);
            break;
          case 'fireflies':
            var fx = it.bx + Math.sin(t * it.f1 * TAU + it.ph) * 60 * sc + Math.sin(t * it.f2 * 3.1 + it.ph * 2) * 25 * sc;
            var fy = it.by + Math.cos(t * it.f2 * TAU + it.ph) * 34 * sc;
            var bl = 0.5 + 0.5 * Math.sin(t * TAU / it.blink + it.ph);
            x.globalAlpha = calm ? 0.6 : 0.15 + 0.85 * bl * bl;
            var fr = it.r * (1.6 + bl);
            x.drawImage(glow(FF), fx - fr * 1.5, fy - fr * 1.5, fr * 3, fr * 3);
            x.drawImage(core(), fx - it.r * 0.5, fy - it.r * 0.5, it.r, it.r);
            break;
          case 'crystals':
            it.y += it.vy * dt; it.x += it.vx * dt; it.rot += 0.3 * dt;
            if (it.y < -10 || it.x < -20 || it.x > W + 20) make(it, false);
            var tw = Math.pow(0.5 + 0.5 * Math.sin(t * TAU / it.tw + it.ph), 4);
            x.globalAlpha = 0.25 + 0.5 * tw;
            var cr = it.r * 2.5;
            x.drawImage(glow(it.col), it.x - cr, it.y - cr, cr * 2, cr * 2);
            if (pp) {
              x.setTransform(it.r * 0.6, 0, 0, it.r, it.x, it.y);
              x.fillStyle = it.col; x.globalAlpha = 0.4 + 0.5 * tw; x.fill(pp.diamond);
              x.setTransform(1, 0, 0, 1, 0, 0);
            }
            if (tw > 0.6) {
              var fl2 = it.r * 4 * tw; x.globalAlpha = tw * 0.8;
              x.drawImage(core(), it.x - fl2, it.y - 1, fl2 * 2, 2); x.drawImage(core(), it.x - 1, it.y - fl2, 2, fl2 * 2);
            }
            break;
          case 'clouds':
            it.x += it.vx * dt;
            if (it.x > W + 20) make(it, false);
            x.globalAlpha = it.a;
            x.drawImage(it.spr, it.x, it.y, it.w, it.w * 0.46);
            break;
        }
      }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      return !calm; // in reduced motion the first frame stays as a still picture
    }

    var loop = Loop(canvas, step, { onLost: function () { ctl.destroy(); } });
    var calmWatch = setInterval(function () { if (!(still() || fast())) loop.start(); }, 1000);
    var ctl = {
      destroy: function () {
        if (ctl.dead) return;
        ctl.dead = true; loop.kill(); clearInterval(calmWatch);
        if (registry && registry.get(canvas) === ctl) registry.delete(canvas);
        canvas.width = 0; canvas.height = 0;
      }
    };
    claim(canvas, ctl);
    resize(); populate(); step(1 / 60);
    loop.start();
    return ctl;
  }

  /* ---------- Campfire (SPEC-2 section 5) ---------- */

  // Soft painterly flame tongue: a teardrop filled with a warm gradient, blurred once when made.
  function tongueSprite(kind) {
    var key = 'ft' + kind;
    if (sprites[key]) return sprites[key];
    var w = 64, h = 128, c = mkCanvas(w, h), x = c.getContext('2d');
    var g = x.createLinearGradient(0, h, 0, 0);
    if (kind === 'core') {
      g.addColorStop(0, 'rgba(255,250,215,1)'); g.addColorStop(0.35, 'rgba(255,226,120,.95)');
      g.addColorStop(0.7, 'rgba(255,170,60,.55)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    } else {
      g.addColorStop(0, 'rgba(255,170,60,.95)'); g.addColorStop(0.3, 'rgba(255,128,36,.85)');
      g.addColorStop(0.65, 'rgba(232,74,22,.5)'); g.addColorStop(1, 'rgba(170,40,20,0)');
    }
    try { x.filter = 'blur(3px)'; } catch (e) { /* older canvas: a little crisper */ }
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(w / 2, 6);
    x.bezierCurveTo(w * 0.62, h * 0.32, w * 0.9, h * 0.52, w * 0.86, h * 0.74);
    x.bezierCurveTo(w * 0.82, h * 0.93, w * 0.62, h - 6, w / 2, h - 6);
    x.bezierCurveTo(w * 0.38, h - 6, w * 0.18, h * 0.93, w * 0.14, h * 0.74);
    x.bezierCurveTo(w * 0.1, h * 0.52, w * 0.38, h * 0.32, w / 2, 6);
    x.fill();
    sprites[key] = c;
    return c;
  }
  function smokeSprite() {
    if (sprites.smoke) return sprites.smoke;
    var c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(150,140,150,.55)'); g.addColorStop(0.5, 'rgba(120,115,135,.25)'); g.addColorStop(1, 'rgba(100,100,130,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    sprites.smoke = c;
    return c;
  }

  // G.fx.Campfire(canvas, {x, y, size}) -> {destroy()}: flames, flickering glow, sparks and a little smoke,
  // drawn additively over the painted fire. x, y: the flame base in canvas pixels (default the lower middle).
  function Campfire(canvas, opt) {
    opt = opt || {};
    var noop = { destroy: function () {} };
    var x = canvas && canvas.getContext && canvas.getContext('2d');
    if (!x) return noop;
    canvas._avW = canvas.width || 240; canvas._avH = canvas.height || 260;
    var W = 0, H = 0, bx = 0, by = 0, S = 1, t = rnd(0, 50), frames = 0;
    var costs = new Float32Array(300), ci = 0, cn = 0;
    var outer = tongueSprite('outer'), inner = tongueSprite('core'), smoke = smokeSprite();
    var halo = softGlow('#ff9a3c'), ground = softGlow('#ff7a2a'), spark = emberSprite('#ff8a2a');
    var size = clamp(+opt.size || 1, 0.6, 1.6);
    // tongues: off = place across the bed (-1..1), each lives a short cycle: grows at the base, licks up, fades
    var tongues = [], embers = [], puffs = [], i;
    for (i = 0; i < 9; i++) tongues.push({ off: (i / 8) * 2 - 1, core: false, life: rnd(0.55, 0.95), age: rnd(0, 1), ph: rnd(0, TAU) });
    for (i = 0; i < 5; i++) tongues.push({ off: (i / 4) * 1.2 - 0.6, core: true, life: rnd(0.45, 0.75), age: rnd(0, 1), ph: rnd(0, TAU) });
    for (i = 0; i < 14; i++) embers.push(newEmber({}, true));
    for (i = 0; i < 5; i++) puffs.push(newPuff({}, true));

    function newEmber(e, initial) {
      e.life = rnd(1.1, 2.4); e.age = initial ? rnd(0, e.life) : 0;
      e.x0 = rnd(-18, 18); e.vy = rnd(38, 70); e.sway = rnd(6, 18); e.ph = rnd(0, TAU); e.r = rnd(2.2, 4.2);
      return e;
    }
    function newPuff(p, initial) {
      p.life = rnd(3.5, 5.5); p.age = initial ? rnd(0, p.life) : 0; p.x0 = rnd(-10, 10); p.drift = rnd(4, 14); p.ph = rnd(0, TAU);
      return p;
    }
    function resize() {
      var s = cssSize(canvas), w = Math.max(2, Math.round(s.w)), h = Math.max(2, Math.round(s.h));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      W = w; H = h;
      S = size * Math.min(w / 240, h / 260);
      bx = opt.x != null ? +opt.x * (w / canvas._avW) : w * 0.5;
      by = opt.y != null ? +opt.y * (h / canvas._avH) : h * 0.808;
    }
    // a slow, uneven flicker: three sines that never line up
    function flicker(k) { return 0.5 + 0.22 * Math.sin(t * 7.3 + k) + 0.16 * Math.sin(t * 13.1 + k * 2.1) + 0.12 * Math.sin(t * 3.1 + k * 0.7); }

    function step(dt) {
      var t0 = performance.now(), calm = still() || fast();
      if (frames++ % 60 === 0) resize();
      t += dt;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, W, H);
      var f = flicker(0);
      // a little smoke above the flames, drawn normally and faint
      for (i = 0; i < puffs.length; i++) {
        var p = puffs[i];
        if (!calm) { p.age += dt; if (p.age >= p.life) newPuff(p, false); }
        var u = p.age / p.life, pr = (16 + 40 * u) * S;
        x.globalAlpha = 0.22 * Math.sin(Math.PI * u) * Math.min(1, u * 4);
        x.drawImage(smoke, bx + (p.x0 + p.drift * u + 6 * Math.sin(t * 0.8 + p.ph)) * S - pr, by - (95 + 110 * u) * S - pr, pr * 2, pr * 2);
      }
      x.globalCompositeOperation = 'lighter';
      // warm light on the ground and the stones
      x.globalAlpha = 0.34 + 0.16 * f;
      var gw = 230 * S * (0.95 + 0.08 * f), gh = 70 * S * (0.95 + 0.08 * f);
      x.drawImage(ground, bx - gw / 2, by + 8 * S - gh / 2, gw, gh);
      // halo around the flames
      x.globalAlpha = 0.26 + 0.14 * flicker(1.7);
      var hw = 150 * S, hh = 170 * S;
      x.drawImage(halo, bx - hw / 2, by - 58 * S - hh / 2, hw, hh);
      // the glowing bed the tongues grow out of, so they read as one fire and not as drops
      x.globalAlpha = 0.5 + 0.2 * f;
      x.drawImage(halo, bx - 55 * S, by - 34 * S, 110 * S, 44 * S);
      // flames: outer tongues first, the hot core over them
      for (i = 0; i < tongues.length; i++) {
        var q = tongues[i];
        if (!calm) { q.age += dt / q.life; if (q.age >= 1) { q.age -= 1; q.ph = rnd(0, TAU); } }
        var a = q.age, centre = 1 - Math.abs(q.off);
        var grow = a < 0.25 ? a / 0.25 : 1, fade = a > 0.55 ? Math.max(0, 1 - (a - 0.55) / 0.45) : 1;
        var hgt = (q.core ? 50 : 74) * S * (0.55 + 0.6 * centre) * (0.7 + 0.5 * grow) * (0.9 + 0.2 * flicker(q.ph));
        var wid = (q.core ? 30 : 46) * S * (0.75 + 0.35 * centre) * (1 - 0.3 * a);
        var lift = a * (q.core ? 14 : 26) * S;
        var sway = (4 * Math.sin(t * 2.3 + q.ph) + 3 * Math.sin(t * 5.7 + q.off * 3)) * S * (0.4 + a);
        var cx = bx + q.off * 21 * S + sway, base = by - lift;
        x.globalAlpha = clamp((q.core ? 0.85 : 0.7) * grow * fade * (0.8 + 0.2 * f), 0, 1);
        x.drawImage(q.core ? inner : outer, cx - wid / 2, base - hgt, wid, hgt * 1.05);
      }
      // sparks rising off the fire
      for (i = 0; i < embers.length; i++) {
        var e = embers[i];
        if (!calm) { e.age += dt; if (e.age >= e.life) newEmber(e, false); }
        var v = e.age / e.life;
        var ex = bx + (e.x0 + e.sway * Math.sin(t * 2 + e.ph) * v) * S, ey = by - (30 + e.vy * e.age) * S;
        var tw = 0.6 + 0.4 * Math.sin(t * 17 + e.ph);
        x.globalAlpha = clamp((1 - v) * Math.min(1, v * 6) * tw, 0, 1);
        var er = e.r * S * (1 - 0.5 * v) * 2.2;
        x.drawImage(spark, ex - er, ey - er, er * 2, er * 2);
      }
      x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-over';
      costs[ci] = performance.now() - t0; ci = (ci + 1) % costs.length; if (cn < costs.length) cn++;
      return !calm; // in reduced motion one warm frame stays as a still picture
    }

    var loop = Loop(canvas, step, { onLost: function () { ctl.destroy(); } });
    var calmWatch = setInterval(function () { if (!(still() || fast())) loop.start(); }, 1000);
    var ctl = {
      destroy: function () {
        if (ctl.dead) return;
        ctl.dead = true; loop.kill(); clearInterval(calmWatch);
        if (registry && registry.get(canvas) === ctl) registry.delete(canvas);
        canvas.width = 0; canvas.height = 0;
      },
      _stats: function () {
        var a = Array.prototype.slice.call(costs, 0, cn).sort(function (p, q) { return p - q; });
        var sum = a.reduce(function (s, v) { return s + v; }, 0);
        return { frames: cn, avg: cn ? sum / cn : 0, p95: cn ? a[Math.floor(cn * 0.95)] : 0, max: cn ? a[cn - 1] : 0, w: W, h: H };
      }
    };
    claim(canvas, ctl);
    resize(); step(1 / 60);
    loop.start();
    return ctl;
  }

  G.fx = {
    init: function (stage) { if (stage && stage.appendChild) { try { setup(stage); } catch (e) { /* no canvas */ } } },
    burst: function (x, y, opt) { try { burst(x, y, opt); } catch (e) { /* effects never break the game */ } },
    trail: function (from, to, opt) { try { return trail(from, to, opt); } catch (e) { return Promise.resolve(); } },
    confetti: function (ms) { try { confetti(ms); } catch (e) { /* ignore */ } },
    flash: function (color, ms) { try { flash(color, ms); } catch (e) { /* ignore */ } },
    shake: shake,
    Aurora: function (canvas, opt) { try { return Aurora(canvas, opt); } catch (e) { return { setLevel: function () {}, destroy: function () {} }; } },
    Weather: function (canvas, kind) { try { return Weather(canvas, kind); } catch (e) { return { destroy: function () {} }; } },
    Campfire: function (canvas, opt) { try { return Campfire(canvas, opt); } catch (e) { console.error('fx.Campfire', e); return { destroy: function () {} }; } }
  };
})();
