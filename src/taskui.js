/* Task UIs and Visuals for battles (SPEC.md sections 8 and 9).
   G.TaskUI.render(host, task, {onAnswer, solution, onBreath}) -> {el, lock(), unlock(), showSolution(sol), hint(sol), answer(ans), show(ans), destroy()}
   G.TaskUI.visual(host, visual, {small}) -> element
   answer(ans) is the robot path: it presses the same buttons a finger would, in the same order.
   onBreath(done, total) is an extra hook so the battle can calm the wild one with each breath. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;

  var STR = {
    da: { 'task.tooMany': 'Det er for mange. Tag en tilbage.', 'task.ok': 'Færdig', 'task.in': 'Ind', 'task.out': 'Ud', 'task.hold': 'Hold fingeren på ringen mens den vokser. Slip når den bliver mindre.' },
    en: { 'task.tooMany': 'Too many. Take one back.', 'task.ok': 'Done', 'task.in': 'In', 'task.out': 'Out', 'task.hold': 'Hold your finger on the ring while it grows. Let go while it shrinks.' }
  };
  if (G.i18n && G.i18n.add) G.i18n.add(STR);

  function t(k, v) {
    var s;
    if (G.t) { s = G.t(k, v); if (s && s !== k) return s; }
    s = (STR[G.lang] || STR.en)[k] || STR.en[k] || k;
    return s.replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] != null ? v[n] : m; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, cls, html, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(tag, cls, text, parent) { var e = el(tag, cls, null, parent); e.textContent = text == null ? '' : String(text); return e; }
  function sfx(name) { try { if (G.audio && G.audio.sfx) G.audio.sfx(name); } catch (e) { /* sound is never allowed to break a task */ } }
  function say(s) { try { if (s && G.say) G.say(s); } catch (e) { /* voice is optional */ } }
  function wait(ms) { return G.wait ? G.wait(ms) : new Promise(function (r) { setTimeout(r, ms); }); }
  function still() { return document.documentElement.classList.contains('still'); }
  var SVGNS = 'http://www.w3.org/2000/svg';
  var BASE = (function () { var sc = document.currentScript && document.currentScript.src; return sc ? sc.replace(/src\/taskui\.js.*$/, '') : ''; })();
  // painted pictures replace emoji where G.PICS has one (src/data/pics.js); the glyph stays as the fallback
  function picUrl(e) {
    if (e == null || !G.PICS) return null;
    var k = String(e), u = G.PICS[k] || G.PICS[k.replace(/\uFE0F/g, '')] || G.PICS[k + '\uFE0F'];
    return u ? (/^(https?:|\/)/.test(u) ? u : BASE + u) : null;
  }
  // HTML for one picture-or-glyph; a picture that fails to load turns back into the glyph
  function emoHtml(e, cls) {
    var u = picUrl(e);
    if (!u) return '<span class="' + cls + '">' + esc(e) + '</span>';
    return '<img class="pic ' + cls + '" src="' + esc(u) + '" alt="" draggable="false" data-e="' + esc(e) + '" onerror="G.TaskUI._picFail(this)">';
  }
  // the same inside an SVG: x, y is the centre, s the size
  function emoSvg(e, x, y, s) {
    var u = picUrl(e);
    if (!u) return '<text x="' + x + '" y="' + (y + s * 0.06) + '" font-size="' + s + '" text-anchor="middle" dominant-baseline="central">' + esc(e) + '</text>';
    var w = s * 1.12;
    return '<image href="' + esc(u) + '" x="' + (x - w / 2).toFixed(1) + '" y="' + (y - w / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + w.toFixed(1) + '" data-e="' + esc(e) + '" data-s="' + s + '" onerror="G.TaskUI._picFail(this)"/>';
  }
  function picFail(img) {
    try {
      var e = img.getAttribute('data-e') || '';
      if (img.namespaceURI === SVGNS) {
        var t = document.createElementNS(SVGNS, 'text'), sz = +img.getAttribute('data-s') || 50;
        t.setAttribute('x', +img.getAttribute('x') + sz * 0.56); t.setAttribute('y', +img.getAttribute('y') + sz * 0.62);
        t.setAttribute('font-size', sz); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
        t.textContent = e; img.replaceWith(t);
      } else { var sp = document.createElement('span'); sp.className = img.className.replace(/\bpic\b/, '').trim(); sp.textContent = e; img.replaceWith(sp); }
    } catch (er) { /* leave it */ }
  }
  function svg(w, h, inner, cls) { return '<svg class="' + (cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" xmlns="' + SVGNS + '">' + inner + '</svg>'; }

  var SPEAK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hand: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 6c3 0 5 2 5 5v17l2-1c3-1 6 0 7 3l1-1c3-1 6 0 7 3 3-1 6 1 6 4v12c0 9-6 15-15 15h-4c-6 0-10-3-13-8L12 41c-2-3-1-6 2-7 2-1 5 0 6 2l-1-1V11c0-3 2-5 5-5z" fill="#fff" stroke="#0b1430" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm8 4.6v-2.2l-2.3-.5a6 6 0 00-.6-1.5l1.3-2-1.6-1.6-2 1.3c-.5-.3-1-.5-1.5-.6L12.9 3h-2.2l-.5 2.3c-.5.1-1 .3-1.5.6l-2-1.3L5.1 6.2l1.3 2c-.3.5-.5 1-.6 1.5L3.5 10.9v2.2l2.3.5c.1.5.3 1 .6 1.5l-1.3 2 1.6 1.6 2-1.3c.5.3 1 .5 1.5.6l.5 2.3h2.2l.5-2.3c.5-.1 1-.3 1.5-.6l2 1.3 1.6-1.6-1.3-2c.3-.5.5-1 .6-1.5z" fill="currentColor"/></svg>'
  };
  function lenClass(s) { var n = String(s).replace(/\s/g, '').length; return n <= 2 ? 'l1' : n <= 4 ? 'l2' : n <= 8 ? 'l3' : 'l4'; }

  /* ---------------- Visuals ---------------- */
  var VIS = {
    big: function (box, v) {
      var s = String(v.text == null ? '' : v.text), d = el('div', 'vb-t num ' + lenClass(s), null, box);
      s.split('▢').forEach(function (part, i) {
        if (i) el('span', 'vb-blank', '?', d);
        if (part) d.appendChild(document.createTextNode(part));
      });
    },
    emoji: function (box, v) {
      box.insertAdjacentHTML('beforeend', emoHtml(v.emoji, 've-e'));
      if (v.caption) txt('div', 've-c num', v.caption, box);
    },
    dots: function (box, v) {
      var n = Math.max(0, v.n | 0), em = v.emoji, cell = 100, s = '', W, H, cnt = 0;
      function thing(x, y, on) {
        if (!on) return '<circle cx="' + x + '" cy="' + y + '" r="30" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.22)" stroke-width="4" stroke-dasharray="7 8"/>';
        var k = cnt++;
        if (em) return '<g class="vd-on" style="--i:' + k + '">' + emoSvg(em, x, y, 66) + '</g>';
        return '<g class="vd-on" style="--i:' + k + '"><circle cx="' + x + '" cy="' + y + '" r="34" fill="url(#vdg)" stroke="#0b1430" stroke-width="5"/><circle cx="' + (x - 10) + '" cy="' + (y - 12) + '" r="9" fill="rgba(255,255,255,.7)"/></g>';
      }
      var defs = '<defs><radialGradient id="vdg" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffc93c"/><stop offset="1" stop-color="#e08a00"/></radialGradient></defs>';
      if (v.frame) {
        var frames = Math.max(1, Math.ceil(n / 10)), gap = 34;
        W = 5 * cell + 20; H = frames * (2 * cell + 20) + (frames - 1) * gap;
        for (var f = 0; f < frames; f++) {
          var oy = f * (2 * cell + 20 + gap);
          s += '<rect x="4" y="' + (oy + 4) + '" width="' + (W - 8) + '" height="' + (2 * cell + 12) + '" rx="22" fill="rgba(11,20,48,.55)" stroke="#f4f8ff" stroke-width="5"/>';
          for (var c = 1; c < 5; c++) s += '<line x1="' + (10 + c * cell) + '" y1="' + (oy + 8) + '" x2="' + (10 + c * cell) + '" y2="' + (oy + 2 * cell + 12) + '" stroke="rgba(244,248,255,.35)" stroke-width="3"/>';
          s += '<line x1="8" y1="' + (oy + cell + 10) + '" x2="' + (W - 8) + '" y2="' + (oy + cell + 10) + '" stroke="rgba(244,248,255,.35)" stroke-width="3"/>';
          for (var i = 0; i < 10; i++) {
            var k = f * 10 + i, x = 10 + (i % 5) * cell + cell / 2, y = oy + 10 + Math.floor(i / 5) * cell + cell / 2;
            s += thing(x, y, k < n);
          }
        }
      } else {
        var cols = n <= 5 ? Math.max(n, 1) : n <= 10 ? 5 : 10, rows = Math.max(1, Math.ceil(n / cols)), gx = cols > 5 ? 30 : 0;
        W = cols * cell + gx; H = rows * cell;
        for (var j = 0; j < n; j++) {
          var cx = (j % cols) * cell + cell / 2 + ((j % cols) >= 5 ? gx : 0), cy = Math.floor(j / cols) * cell + cell / 2;
          s += thing(cx, cy, true);
        }
      }
      box.innerHTML = svg(W, H, defs + s, 'vd-svg');
    },
    clock: function (box, v) {
      var h = +v.h || 0, m = +v.m || 0, s = '';
      s += '<circle cx="100" cy="100" r="94" fill="#0b1430"/><circle cx="100" cy="100" r="88" fill="#fdf7e8" stroke="#ffc93c" stroke-width="6"/>';
      for (var i = 0; i < 60; i++) {
        var a = i * Math.PI / 30, big = i % 5 === 0, r1 = big ? 72 : 78;
        s += '<line x1="' + (100 + Math.sin(a) * r1).toFixed(1) + '" y1="' + (100 - Math.cos(a) * r1).toFixed(1) + '" x2="' + (100 + Math.sin(a) * 83).toFixed(1) + '" y2="' + (100 - Math.cos(a) * 83).toFixed(1) + '" stroke="#0b1430" stroke-width="' + (big ? 4 : 1.6) + '" stroke-linecap="round"/>';
      }
      for (var n = 1; n <= 12; n++) {
        var b = n * Math.PI / 6;
        s += '<text x="' + (100 + Math.sin(b) * 57).toFixed(1) + '" y="' + (100 - Math.cos(b) * 57).toFixed(1) + '" font-family="Fredoka,sans-serif" font-weight="700" font-size="21" fill="#0b1430" text-anchor="middle" dominant-baseline="central">' + n + '</text>';
      }
      var ha = ((h % 12) + m / 60) * 30, ma = m * 6;
      s += '<line x1="100" y1="100" x2="100" y2="58" stroke="#0b1430" stroke-width="10" stroke-linecap="round" transform="rotate(' + ha + ' 100 100)"/>';
      s += '<line x1="100" y1="100" x2="100" y2="30" stroke="#2c3f86" stroke-width="6" stroke-linecap="round" transform="rotate(' + ma + ' 100 100)"/>';
      s += '<circle cx="100" cy="100" r="8" fill="#ffc93c" stroke="#0b1430" stroke-width="3"/>';
      box.innerHTML = svg(200, 200, s, 'vc-svg');
    },
    frac: function (box, v) { box.innerHTML = fracSvg(+v.n || 0, Math.max(1, +v.d || 1), v.shape); },
    seq: function (box, v) {
      var items = v.items || [], row = el('div', 'vs-row', null, box);
      row.style.setProperty('--n', items.length);
      items.forEach(function (it) {
        var gap = String(it) === '?';
        var c = el('div', 'vs-it' + (gap ? ' is-gap' : '') + (isEmoji(it) ? ' is-emo' : ' num'), null, row);
        if (!gap && isEmoji(it) && picUrl(it)) c.innerHTML = emoHtml(it, 'vs-pic'); else c.textContent = String(it);
        if (!isEmoji(it) && !gap) c.classList.add(lenClass(it));
      });
    },
    grid: function (box, v) {
      var size = v.size === 3 ? 3 : 2, g = el('div', 'vg-grid', null, box);
      g.style.setProperty('--s', size);
      (v.cells || []).slice(0, size * size).forEach(function (it) {
        var gap = String(it) === '?';
        var c = el('div', 'vg-c' + (gap ? ' is-gap' : '') + (String(it) === '' ? ' is-blank' : '') + (isEmoji(it) ? '' : ' num'), null, g);
        if (!gap && isEmoji(it) && picUrl(it)) c.innerHTML = emoHtml(it, 'vg-pic'); else c.textContent = String(it);
      });
    },
    balance: function (box, v) {
      var rows = v.rows || [], RH = 150, W = 520, s = '';
      rows.forEach(function (r, i) {
        var y = i * RH, left = r.left || [], right = String(r.right);
        // stand, beam and two pans
        s += '<path d="M260 ' + (y + 132) + 'l-22 0 22-44 22 44z" fill="#b9c6ea" stroke="#0b1430" stroke-width="4" stroke-linejoin="round"/>';
        s += '<rect x="40" y="' + (y + 84) + '" width="440" height="10" rx="5" fill="#f4f8ff" stroke="#0b1430" stroke-width="3"/>';
        s += '<path d="M30 ' + (y + 80) + 'q90 22 180 0" fill="rgba(255,201,60,.25)" stroke="#ffc93c" stroke-width="5" stroke-linecap="round"/>';
        s += '<path d="M310 ' + (y + 80) + 'q90 22 180 0" fill="rgba(255,201,60,.25)" stroke="#ffc93c" stroke-width="5" stroke-linecap="round"/>';
        var n = left.length, step = Math.min(56, 170 / Math.max(1, n)), x0 = 120 - (n - 1) * step / 2;
        left.forEach(function (it, k) {
          if (isEmoji(it)) s += emoSvg(it, +(x0 + k * step).toFixed(1), y + 46, n > 3 ? 44 : 54);
          else s += '<text x="' + (x0 + k * step).toFixed(1) + '" y="' + (y + 50) + '" font-size="' + (n > 3 ? 44 : 54) + '" text-anchor="middle" dominant-baseline="central" font-family="Fredoka,sans-serif" font-weight="700" fill="#fff">' + esc(it) + '</text>';
        });
        var gap = right === '?';
        s += '<rect x="352" y="' + (y + 16) + '" width="96" height="64" rx="16" fill="' + (gap ? 'rgba(93,242,176,.18)' : '#f4f8ff') + '" stroke="' + (gap ? '#5df2b0' : '#0b1430') + '" stroke-width="4"' + (gap ? ' stroke-dasharray="10 7"' : '') + '/>';
        s += '<text x="400" y="' + (y + 50) + '" font-size="44" text-anchor="middle" dominant-baseline="central" font-family="Fredoka,sans-serif" font-weight="700" fill="' + (gap ? '#5df2b0' : '#0b1430') + '">' + esc(right) + '</text>';
      });
      box.innerHTML = svg(W, Math.max(1, rows.length) * RH, s, 'vbal-svg');
    },
    machine: function (box, v) {
      var pairs = (v.pairs || []).slice(0, 4), g = el('div', 'vm-grid', null, box);
      g.style.setProperty('--r', pairs.length + 1);
      function row(a, b, ask) {
        txt('div', 'vm-io num', a, g);
        el('div', 'vm-mach', '<span class="vm-arr"></span>' + ICON.gear + '<span class="vm-arr"></span>', g);
        var o = txt('div', 'vm-io num' + (ask ? ' is-gap' : ''), ask ? '?' : b, g);
        return o;
      }
      pairs.forEach(function (p) { row(p[0], p[1], false); });
      row(v.ask, '?', true);
    },
    line: function (box, v) {
      var min = +v.min || 0, max = v.max == null ? 10 : +v.max, span = Math.max(1, max - min), X0 = 34, X1 = 546, Y = 118;
      function X(n) { return X0 + (n - min) / span * (X1 - X0); }
      var tick = span <= 20 ? 1 : span <= 50 ? 5 : span <= 100 ? 10 : Math.pow(10, Math.floor(Math.log10(span)) - 1) * 5;
      var labels = {}, at = {};
      if (Array.isArray(v.marks)) v.marks.forEach(function (m) { labels[m] = 1; });
      else {
        var every = typeof v.marks === 'number' ? v.marks : span <= 10 ? 1 : span <= 20 ? 2 : tick * 2;
        for (var q = Math.ceil(min / every) * every; q <= max; q += every) labels[q] = 1;
        labels[min] = 1; labels[max] = 1;
      }
      for (var n0 = Math.ceil(min / tick) * tick; n0 <= max; n0 += tick) at[n0] = 1;
      Object.keys(labels).forEach(function (k) { at[k] = 1; });
      var fs = span > 20 || Object.keys(labels).length > 8 ? 26 : 32;
      var s = '<line x1="' + (X0 - 18) + '" y1="' + Y + '" x2="' + (X1 + 18) + '" y2="' + Y + '" stroke="#f4f8ff" stroke-width="7" stroke-linecap="round"/>';
      Object.keys(at).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
        var lab = labels[n], zero = n === 0 && min < 0;
        s += '<line x1="' + X(n).toFixed(1) + '" y1="' + (Y - (lab ? 18 : 11)) + '" x2="' + X(n).toFixed(1) + '" y2="' + (Y + (lab ? 18 : 11)) + '" stroke="' + (zero ? '#ffd34d' : '#f4f8ff') + '" stroke-width="' + (lab ? 5 : 3) + '" stroke-linecap="round"/>';
        if (lab) s += '<text x="' + X(n).toFixed(1) + '" y="' + (Y + 52) + '" font-family="Fredoka,sans-serif" font-weight="700" font-size="' + fs + '" fill="' + (n < 0 ? '#9fd8ff' : '#f4f8ff') + '" text-anchor="middle">' + String(n).replace('-', '−') + '</text>';
      });
      if (v.hop && v.hop.from != null) {
        var a = X(+v.hop.from), b = X(+v.hop.from + (+v.hop.by || 0)), mid = (a + b) / 2, top = 18, by = +v.hop.by || 0;
        s += '<path class="vl-hop" pathLength="1" d="M' + a.toFixed(1) + ' ' + (Y - 14) + ' Q' + mid.toFixed(1) + ' ' + (top - 10) + ' ' + b.toFixed(1) + ' ' + (Y - 14) + '" fill="none" stroke="#5df2b0" stroke-width="6" stroke-linecap="round"/>';
        var dir = b >= a ? -1 : 1;
        s += '<path d="M' + b.toFixed(1) + ' ' + (Y - 12) + 'l' + (dir * 14) + ' -16 M' + b.toFixed(1) + ' ' + (Y - 12) + 'l' + (dir * -4) + ' -21" stroke="#5df2b0" stroke-width="6" stroke-linecap="round" fill="none"/>';
        s += '<rect x="' + (mid - 42).toFixed(1) + '" y="' + top + '" width="84" height="46" rx="23" fill="#0b1430" stroke="#5df2b0" stroke-width="4"/>';
        s += '<text x="' + mid.toFixed(1) + '" y="' + (top + 24) + '" font-family="Fredoka,sans-serif" font-weight="700" font-size="31" fill="#5df2b0" text-anchor="middle" dominant-baseline="central">' + (by < 0 ? '−' + (-by) : '+' + by) + '</text>';
        s += '<circle cx="' + a.toFixed(1) + '" cy="' + Y + '" r="9" fill="#5df2b0" stroke="#0b1430" stroke-width="3"/>';
      }
      if (v.at != null) {
        var ax = X(+v.at).toFixed(1);
        s += '<circle cx="' + ax + '" cy="' + Y + '" r="13" fill="#ffc93c" stroke="#0b1430" stroke-width="4"/>';
        s += '<path d="M' + ax + ' ' + (Y - 22) + 'l-14 -24h28z" fill="#ffc93c" stroke="#0b1430" stroke-width="4" stroke-linejoin="round"/>';
      }
      box.innerHTML = svg(580, 190, s, 'vl-svg');
    },
    scene: function (box, v) {
      if (String(v.text || '').length > 100) box.classList.add('is-long');
      if (v.pic) box.insertAdjacentHTML('beforeend', '<img class="pic vsc-e vsc-scene" src="' + esc(v.pic) + '" alt="" draggable="false" data-e="' + esc(v.emoji || '') + '" onerror="G.TaskUI._picFail(this)">');
      else if (v.emoji) box.insertAdjacentHTML('beforeend', emoHtml(v.emoji, 'vsc-e'));
      txt('div', 'vsc-t', v.text, box);
    }
  };
  function isEmoji(s) { return /[←-⯿☀-➿\uD83C-\uDBFF]/.test(String(s)) && !/^[\w\s?+\-−=.,:]+$/.test(String(s)); }
  function fracSvg(n, d, shape, cellCls) {
    var s = '';
    if (shape === 'bar') {
      var w = 480 / d;
      for (var i = 0; i < d; i++) s += '<rect x="' + (10 + i * w).toFixed(2) + '" y="10" width="' + w.toFixed(2) + '" height="120" fill="' + (i < n ? 'var(--pow,#ffc93c)' : 'rgba(255,255,255,.1)') + '" stroke="#0b1430" stroke-width="5"' + (cellCls ? ' class="' + cellCls + '" data-i="' + i + '"' : '') + '/>';
      s += '<rect x="10" y="10" width="480" height="120" rx="10" fill="none" stroke="#f4f8ff" stroke-width="4"/>';
      return svg(500, 140, s, 'vf-svg vf-bar');
    }
    for (var k = 0; k < d; k++) s += slicePath(k, d, n > k, cellCls);
    s += '<circle cx="110" cy="110" r="100" fill="none" stroke="#f4f8ff" stroke-width="4"/>';
    return svg(220, 220, s, 'vf-svg vf-pie');
  }
  function slicePath(k, d, on, cls) {
    var attrs = ' fill="' + (on ? 'var(--pow,#ffc93c)' : 'rgba(255,255,255,.1)') + '" stroke="#0b1430" stroke-width="5" stroke-linejoin="round"' + (cls ? ' class="' + cls + '" data-i="' + k + '"' : '');
    if (d === 1) return '<circle cx="110" cy="110" r="100"' + attrs + '/>';
    var a0 = k / d * Math.PI * 2 - Math.PI / 2, a1 = (k + 1) / d * Math.PI * 2 - Math.PI / 2;
    var x0 = 110 + Math.cos(a0) * 100, y0 = 110 + Math.sin(a0) * 100, x1 = 110 + Math.cos(a1) * 100, y1 = 110 + Math.sin(a1) * 100;
    return '<path d="M110 110L' + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'A100 100 0 ' + (1 / d > 0.5 ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + 'Z"' + attrs + '/>';
  }

  function visual(host, v, o) {
    var box = el('div', 'vis vis-' + (v && v.type ? v.type : 'none') + (o && o.small ? ' vis-sm' : ''), null, host);
    if (!v || !VIS[v.type]) return box;
    try { VIS[v.type](box, v); } catch (e) { console.error('TaskUI.visual', v.type, e); }
    return box;
  }

  /* ---------------- pointer hand (first tap in the first battle) ---------------- */
  function pointAt(root, target) {
    clearHand(root);
    if (!target) return;
    var r = root.getBoundingClientRect(), b = target.getBoundingClientRect(), k = r.width / (root.offsetWidth || r.width || 1) || 1;
    var h = el('div', 'tk-hand', ICON.hand, root);
    h.style.left = ((b.left - r.left + b.width / 2) / k) + 'px';
    h.style.top = ((b.top - r.top + b.height / 2) / k) + 'px';
  }
  function clearHand(root) { var h = root.querySelector('.tk-hand'); if (h) h.remove(); }

  /* ---------------- answer UIs ---------------- */
  function buildUI(area, task, api) {
    var b = task.build || {}, op = b.op === 'product' ? 'product' : 'sum', unit = b.unit || '', tiles = b.tiles || [];
    var picked = [], token = 0, sol = null;
    // a hidden target (8 + ▢ = 15): no auto-submit and no "too many", he presses "Færdig" himself
    var confirm = op === 'sum' && !!b.confirm;
    area.classList.add(unit ? 'is-coins' : 'is-orbs');
    if (confirm) area.classList.add('is-confirm');
    var cauldron = el('div', 'bd-pot', null, area);
    var row = el('div', 'bd-row', null, cauldron);
    var total = el('div', 'bd-total num', null, cauldron);
    var ok = null;
    if (confirm) {
      ok = el('button', 'btn btn-green bd-ok is-off', ICON.check, cauldron);
      ok.type = 'button'; ok.dataset.act = 'build-ok'; ok.setAttribute('aria-label', t('task.ok'));
      txt('span', null, t('task.ok'), ok);
      ok.addEventListener('click', function () {
        if (api.locked || !picked.length) { if (!picked.length) sfx('locked'); return; }
        sfx('tap'); api.submit(picked.slice());
      });
    }
    var note = el('div', 'bd-note', null, area);
    var tray = el('div', 'bd-tray' + (tiles.length > 7 ? ' is-many' : ''), null, area);
    var orbs = tiles.map(function (tile, i) {
      var v = tile.v, size = v >= 100 ? ' o-xl' : v >= 10 ? ' o-l' : '';
      var o = el('button', 'orb' + (unit ? ' coin' : '') + size, null, tray);
      o.type = 'button'; o.dataset.act = 'tile-' + i;
      o.innerHTML = unit ? '<span class="orb-v num">' + esc(v) + '</span><span class="orb-u">' + esc(unit) + '</span>' : '<span class="orb-v num">' + esc(tile.label != null ? tile.label : v) + '</span>';
      o.addEventListener('click', function () { tapTray(i); });
      return o;
    });
    if (!tiles.length) note.textContent = '';
    function value() { return picked.reduce(function (s, i) { return s + (+tiles[i].v || 0); }, 0); }
    function draw() {
      row.innerHTML = '';
      if (!picked.length) for (var gi = 0; gi < Math.max(1, api.ghost || 0); gi++) el('div', 'bd-empty' + (api.ghost ? ' is-ghost' : ''), null, row);
      // with a hidden target the glow must not tell how close he is
      api.gather(confirm ? (picked.length ? 0.5 : 0) : op === 'sum' ? Math.min(1, value() / (b.target || 1)) : picked.length / 2);
      if (ok) { ok.classList.toggle('is-off', !picked.length); ok.classList.toggle('is-ready', picked.length > 0); }
      picked.forEach(function (i, k) {
        if (op === 'product' && k === 1) el('span', 'bd-x num', '×', row);
        var o = el('button', 'orb in-pot' + (unit ? ' coin' : ''), null, row);
        o.type = 'button'; o.dataset.act = 'pot-' + k;
        o.innerHTML = orbs[i].innerHTML;
        o.addEventListener('click', function () { tapPot(k); });
      });
      if (op === 'sum') total.textContent = picked.length ? '= ' + value() + (unit ? ' ' + unit : '') : '';
      else total.textContent = '';
      orbs.forEach(function (o, i) {
        o.classList.toggle('is-used', picked.indexOf(i) >= 0);
        o.classList.toggle('is-sol', !!sol && sol.indexOf(i) >= 0 && picked.indexOf(i) < 0);
        if (sol && sol.indexOf(i) >= 0) o.dataset.order = sol.indexOf(i) + 1; else delete o.dataset.order;
      });
    }
    function check() {
      var my = ++token;
      cauldron.classList.remove('is-over', 'is-full');
      note.textContent = '';
      if (confirm) return;
      if (op === 'sum') {
        var s = value();
        if (s > b.target) {
          void cauldron.offsetWidth; cauldron.classList.add('is-over');
          note.textContent = t('task.tooMany'); say(t('task.tooMany')); sfx('miss');
        } else if (s === b.target && picked.length) {
          cauldron.classList.add('is-full');
          wait(420).then(function () { if (my === token && value() === b.target) api.submit(picked.slice()); });
        }
      } else if (picked.length === 2) {
        cauldron.classList.add('is-full');
        wait(380).then(function () { if (my === token && picked.length === 2) api.submit(picked.slice()); });
      }
    }
    function tapTray(i) {
      if (api.locked || picked.indexOf(i) >= 0) return;
      if (op === 'product' && picked.length >= 2) return;
      picked.push(i); sfx('pick'); draw(); pop(row.lastChild); check();
    }
    function tapPot(k) {
      if (api.locked) return;
      picked.splice(k, 1); sfx('unpick'); draw(); check();
    }
    function pop(e) { if (e && !still()) { e.classList.add('pop-in'); } }
    draw();
    return {
      solution: function (s) { sol = (s || []).slice(); picked = []; draw(); check(); },
      hintEl: function (s) { return orbs[(s || [])[0]] || orbs[0]; },
      answer: function (s) { picked = []; draw(); (s || []).forEach(function (i) { tapTray(i); }); if (ok) ok.click(); },
      show: function (s) { picked = (s || []).filter(function (i) { return tiles[i]; }); draw(); }
    };
  }

  function fillUI(area, task, api) {
    var f = task.fill || {}, total = Math.max(1, f.total | 0), shape = f.shape || 'bar', on = [], sol = 0, cells = [];
    for (var i = 0; i < total; i++) on.push(false);
    var wrap = el('div', 'fl-cells fl-' + shape, null, area);
    var side = el('div', 'fl-side', null, area);
    var ok = el('button', 'btn btn-green btn-round fl-ok', ICON.check, side);
    ok.type = 'button'; ok.dataset.act = 'confirm'; ok.setAttribute('aria-label', t('task.ok'));
    if (shape === 'pie') {
      var s = '';
      for (var k = 0; k < total; k++) s += slicePath(k, total, false, 'fl-cell');
      s += '<circle cx="110" cy="110" r="100" fill="none" stroke="#f4f8ff" stroke-width="4" pointer-events="none"/>';
      wrap.innerHTML = svg(220, 220, s, 'fl-pie');
      cells = Array.prototype.slice.call(wrap.querySelectorAll('.fl-cell'));
    } else {
      if (shape === 'dots') wrap.style.setProperty('--cols', total <= 5 ? total : total <= 10 ? 5 : Math.ceil(total / 2));
      else wrap.style.setProperty('--n', total);
      for (var j = 0; j < total; j++) {
        var c = el('button', 'fl-cell', shape === 'dots' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor" stroke="#0b1430" stroke-width="1.6" stroke-linejoin="round"/></svg>' : null, wrap);
        c.type = 'button'; cells.push(c);
      }
    }
    cells.forEach(function (c, i2) { c.dataset.act = 'cell-' + i2; });
    // tap toggles a cell; dragging paints, which is kinder to small fingers
    var paint = null;
    function cellAt(ev) { var e = document.elementFromPoint(ev.clientX, ev.clientY); while (e && e !== wrap) { if (e.classList && e.classList.contains('fl-cell')) return e; e = e.parentNode; } return null; }
    wrap.addEventListener('pointerdown', function (ev) {
      if (api.locked) return;
      var c2 = cellAt(ev); if (!c2) return;
      var i3 = cells.indexOf(c2); paint = !on[i3]; set(i3, paint);
      try { wrap.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }
    });
    wrap.addEventListener('pointermove', function (ev) {
      if (paint === null || api.locked) return;
      var c2 = cellAt(ev); if (!c2) return;
      var i3 = cells.indexOf(c2); if (on[i3] !== paint) set(i3, paint);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { wrap.addEventListener(n, function () { paint = null; }); });
    function set(i4, v) { on[i4] = v; sfx(v ? 'pick' : 'unpick'); draw(); }
    function count() { return on.filter(Boolean).length; }
    function draw() {
      cells.forEach(function (c, i5) {
        c.classList.toggle('is-on', on[i5]);
        c.classList.toggle('is-sol', i5 < sol && !on[i5]);
        if (shape === 'pie') c.setAttribute('fill', on[i5] ? 'var(--pow,#ffc93c)' : 'rgba(255,255,255,.1)');
      });
      api.gather(Math.min(1, count() / Math.max(1, total)));
      ok.classList.toggle('is-off', count() === 0);
      ok.classList.toggle('is-ready', count() > 0);
    }
    ok.addEventListener('click', function () { if (count() > 0) api.submit(count()); });
    draw();
    return {
      solution: function (n) { sol = n | 0; for (var a = 0; a < total; a++) on[a] = false; draw(); },
      hintEl: function () { return cells[0]; },
      answer: function (n) { for (var a = 0; a < total; a++) on[a] = a < n; draw(); ok.click(); },
      show: function (n) { for (var a = 0; a < total; a++) on[a] = a < n; draw(); }
    };
  }

  function choiceUI(area, task, api) {
    var c = task.choice || {}, opts = c.options || [], n = opts.length, cols = c.cols || (n === 4 && opts.some(function (o) { return o.visual; }) ? 2 : n);
    // long labels (heart moments, riddles) become tall full-width rows: picture left, words right, big enough to read
    var rows = opts.some(function (o) { return o.label != null && String(o.label).length > 14; }) && !opts.some(function (o) { return o.visual; });
    if (rows) cols = n > 3 ? 2 : 1;
    var grid = el('div', 'ch-grid' + (rows ? ' is-rows' : ''), null, area);
    grid.style.setProperty('--cols', cols); grid.style.setProperty('--rows', Math.ceil(n / cols));
    var cards = opts.map(function (o, i) {
      var holder = grid;
      if (rows) holder = el('div', 'ch-rowwrap', null, grid);
      var card = el('button', 'ch-card', null, holder);
      card.type = 'button'; card.dataset.act = 'opt-' + i;
      if (o.visual) visual(el('div', 'ch-vis', null, card), o.visual, { small: true });
      if (o.emoji && !rows) card.insertAdjacentHTML('beforeend', emoHtml(o.emoji, 'ch-emo'));
      if (rows) {
        if (o.label != null && o.label !== '') txt('div', 'ch-rowlbl', o.label, card);
        // a child who can not read hears each choice: tap the speaker to hear it, tap the row to choose it
        var sp = el('button', 'btn btn-round ch-say', SPEAK, holder);
        sp.type = 'button'; sp.dataset.act = 'say-' + i; sp.setAttribute('aria-label', String(o.label || ''));
        sp.addEventListener('click', function () { sfx('tap'); say(o.label); sp.classList.remove('is-talk'); void sp.offsetWidth; sp.classList.add('is-talk'); });
      }
      else if (o.label != null && o.label !== '') txt('div', 'ch-lbl num ' + lenClass(o.label) + (o.emoji || o.visual ? ' is-sub' : ''), o.label, card);
      card.addEventListener('click', function () {
        if (api.locked) return;
        sfx('tap'); card.classList.add('is-picked'); api.gather(1); api.submit(i);
      });
      return card;
    });
    return {
      solution: function (i) { cards.forEach(function (cd, k) { cd.classList.toggle('is-sol', k === i); cd.classList.remove('is-picked'); }); },
      hintEl: function (i) { return cards[i] || cards[0]; },
      answer: function (i) { if (cards[i]) cards[i].click(); },
      show: function (i) { cards.forEach(function (cd, k) { cd.classList.toggle('is-picked', k === i); }); }
    };
  }

  function spellUI(area, task, api) {
    var sp = task.spell || {}, word = String(sp.word || '').toUpperCase(), tiles = (sp.tiles || []).map(function (x) { return String(x).toUpperCase(); });
    var fill = [], ghost = '', token = 0;
    for (var i = 0; i < word.length; i++) fill.push(null);
    var slotsRow = el('div', 'sp-slots', null, area);
    slotsRow.style.setProperty('--n', word.length);
    var slots = fill.map(function (x, k) {
      var s = el('button', 'sp-slot num', null, slotsRow);
      s.type = 'button'; s.dataset.act = 'slot-' + k;
      s.addEventListener('click', function () { tapSlot(k); });
      return s;
    });
    var tray = el('div', 'sp-tray', null, area);
    var tbtn = tiles.map(function (L, k) {
      var b = el('button', 'sp-tile num', null, tray);
      b.type = 'button'; b.dataset.act = 'tile-' + k; b.textContent = L;
      b.addEventListener('click', function () { tapTile(k); });
      return b;
    });
    function current() { return fill.map(function (k) { return k == null ? '' : tiles[k]; }).join(''); }
    function draw() {
      slots.forEach(function (s, k) {
        var has = fill[k] != null;
        s.textContent = has ? tiles[fill[k]] : (ghost ? ghost[k] || '' : '');
        s.classList.toggle('is-full', has);
        s.classList.toggle('is-ghost', !has && !!ghost);
      });
      api.gather(fill.filter(function (x) { return x != null; }).length / Math.max(1, fill.length));
      var next = fill.indexOf(null), want = ghost && next >= 0 ? ghost[next] : null, marked = false;
      tbtn.forEach(function (b, k) {
        var used = fill.indexOf(k) >= 0;
        b.classList.toggle('is-used', used);
        var mark = !marked && !used && want && tiles[k] === want;
        if (mark) marked = true;
        b.classList.toggle('is-sol', !!mark);
      });
    }
    function tapTile(k) {
      if (api.locked || fill.indexOf(k) >= 0) return;
      var at = fill.indexOf(null); if (at < 0) return;
      fill[at] = k; sfx('pick'); draw();
      if (!still()) { slots[at].classList.remove('pop-in'); void slots[at].offsetWidth; slots[at].classList.add('pop-in'); }
      if (fill.indexOf(null) < 0) {
        var my = ++token;
        wait(380).then(function () { if (my === token && fill.indexOf(null) < 0) api.submit(current()); });
      }
    }
    function tapSlot(k) {
      if (api.locked || fill[k] == null) return;
      token++; fill[k] = null; sfx('unpick'); draw();
    }
    draw();
    return {
      solution: function (w) { ghost = String(w || '').toUpperCase(); for (var a = 0; a < fill.length; a++) fill[a] = null; draw(); },
      hintEl: function (w) { var L = String(w || word)[0]; var k = tiles.indexOf(L); return tbtn[k >= 0 ? k : 0]; },
      show: function (w) {
        for (var a = 0; a < fill.length; a++) fill[a] = null;
        String(w).toUpperCase().split('').forEach(function (L, at) {
          for (var k = 0; k < tiles.length; k++) if (tiles[k] === L && fill.indexOf(k) < 0) { if (at < fill.length) fill[at] = k; return; }
        });
        draw();
      },
      answer: function (w) {
        for (var a = 0; a < fill.length; a++) fill[a] = null; draw();
        String(w).toUpperCase().split('').forEach(function (L) {
          for (var k = 0; k < tiles.length; k++) if (tiles[k] === L && fill.indexOf(k) < 0) { tapTile(k); return; }
        });
      }
    };
  }

  function breatheUI(area, task, api, opts) {
    var br = task.breathe || {}, breaths = Math.max(1, br.breaths | 0 || 3), inMs = br.inMs || 3500, outMs = br.outMs || 3500;
    var wrap = el('div', 'br-wrap', null, area);
    var ring = el('button', 'br-ring', '<span class="br-glow"></span><span class="br-lbl h"></span>', wrap);
    ring.type = 'button'; ring.dataset.act = 'breathe';
    var lbl = ring.querySelector('.br-lbl');
    var dots = el('div', 'br-dots', null, wrap);
    var dotEls = [];
    for (var i = 0; i < breaths; i++) dotEls.push(el('span', 'br-dot', null, dots));
    var help = txt('div', 'br-help', t('task.hold'), area);
    var down = false, done = 0, phase = 'in', t0 = 0, held = 0, free = 0, last = 0, raf = 0, dead = false;
    function press(v) { return function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); down = v; ring.classList.toggle('is-down', v); }; }
    ring.addEventListener('pointerdown', press(true));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { ring.addEventListener(n, press(false)); });
    function startPhase(p, now) {
      phase = p; t0 = now;
      lbl.textContent = t(p === 'in' ? 'task.in' : 'task.out');
      ring.classList.toggle('is-in', p === 'in'); ring.classList.toggle('is-out', p === 'out');
      sfx(p === 'in' ? 'breatheIn' : 'breatheOut');
    }
    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (api.locked) return;
      if (!t0) { startPhase('in', now); last = now; }
      var dt = Math.min(100, now - last); last = now;
      var u = (now - t0) / (phase === 'in' ? inMs : outMs);
      if (phase === 'in') { if (down) held += dt; } else if (!down) free += dt;
      var sc = phase === 'in' ? 0.62 + 0.38 * ease(u) : 1 - 0.38 * ease(u);
      ring.style.setProperty('--sc', Math.max(0.62, Math.min(1, sc)).toFixed(3));
      ring.classList.toggle('is-good', (phase === 'in' && down) || (phase === 'out' && !down));
      if (u >= 1) {
        if (phase === 'in') startPhase('out', now);
        else {
          if (held >= inMs * 0.6 && free >= outMs * 0.6) breathDone();
          held = 0; free = 0;
          if (done < breaths) startPhase('in', now);
        }
      }
    }
    function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
    function breathDone() {
      dotEls[done] && dotEls[done].classList.add('is-on');
      done++;
      try { if (opts.onBreath) opts.onBreath(done, breaths); } catch (e) { console.error(e); }
      if (done >= breaths) { help.textContent = ''; wait(300).then(function () { api.submit(true); }); }
    }
    raf = requestAnimationFrame(frame);
    api.onDestroy(function () { dead = true; cancelAnimationFrame(raf); });
    return {
      solution: function () { ring.classList.add('is-sol'); },
      hintEl: function () { return ring; },
      answer: function () { while (done < breaths) breathDone(); }
    };
  }

  var UIS = { build: buildUI, fill: fillUI, choice: choiceUI, spell: spellUI, breathe: breatheUI };
  var VIS_W = { build: 'w34', fill: 'w36', choice: 'w40', spell: 'w30', breathe: 'w40' };
  var VIS_TYPE_W = { scene: 'w46', line: 'w50', seq: 'w50', balance: 'w44' };

  function render(host, task, opts) {
    opts = opts || {};
    var root = el('div', 'tk tk-' + task.ui + ' pow-' + (task.power || 'tal'), null, host);
    var killers = [];
    var api = {
      locked: false,
      submit: function (ans) {
        if (api.locked) return;
        api.locked = true; root.classList.add('is-locked'); clearHand(root);
        try { if (opts.onAnswer) opts.onAnswer(ans); } catch (e) { console.error('TaskUI onAnswer', e); }
      },
      onDestroy: function (f) { killers.push(f); },
      ghost: opts.ghost || 0,
      gather: function (f) { root.style.setProperty('--gather', Math.max(0, Math.min(1, f)).toFixed(3)); root.classList.toggle('is-gathering', f > 0); }
    };
    if (task.visual && task.visual.type === 'scene' && opts.scenePic) task = Object.assign({}, task, { visual: Object.assign({}, task.visual, { pic: opts.scenePic }) });
    var hasVis = task.visual && task.visual.type;
    if (hasVis) visual(el('div', 'tk-vis ' + (VIS_TYPE_W[task.visual.type] || VIS_W[task.ui] || 'w36'), null, root), task.visual);
    var area = el('div', 'tk-ans', null, root);
    var ui;
    try { ui = (UIS[task.ui] || choiceUI)(area, task, api, opts); }
    catch (e) { console.error('TaskUI.render', task && task.id, e); ui = { solution: function () {}, hintEl: function () { return null; }, answer: function (a) { api.submit(a); } }; }
    root.addEventListener('pointerdown', function () { clearHand(root); }, true);
    if (opts.solution != null) ui.solution(opts.solution);
    return {
      el: root,
      lock: function () { api.locked = true; root.classList.add('is-locked'); clearHand(root); },
      unlock: function () { api.locked = false; root.classList.remove('is-locked'); },
      showSolution: function (sol) { root.classList.add('is-helped'); ui.solution(sol); },
      // the thing the child built, for the battle to send flying at the shield
      built: function () { return root.querySelector('.bd-row') || root.querySelector('.sp-slots') || root.querySelector('.ch-card.is-picked') || root.querySelector('.fl-cells') || root.querySelector('.br-ring'); },
      hint: function (sol) { try { pointAt(root, ui.hintEl(sol)); } catch (e) { /* the hand is a nicety */ } },
      answer: function (ans) { if (!api.locked) ui.answer(ans); },
      // someone else's answer, filled in and locked: the wild one's attempt that the child judges
      show: function (ans) { try { if (ui.show) ui.show(ans); } catch (e) { console.error('TaskUI.show', e); } api.locked = true; root.classList.add('is-locked', 'is-shown'); clearHand(root); },
      destroy: function () { killers.forEach(function (f) { f(); }); api.locked = true; root.remove(); }
    };
  }

  G.TaskUI = { render: render, visual: visual, isEmoji: isEmoji, pic: picUrl, _picFail: picFail };
})();
