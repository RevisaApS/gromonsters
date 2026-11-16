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
  function say(s, opt) { try { if (s && G.say) G.say(s, opt); } catch (e) { /* voice is optional */ } }
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
      // a picture that says its name when tapped (Natur og teknik's animals)
      if (v.say) {
        box.classList.add('is-talker'); box.dataset.act = 'picture';
        box.addEventListener('click', function () { sfx('tap'); say(v.say, { cut: true }); box.classList.remove('is-talk'); void box.offsetWidth; box.classList.add('is-talk'); });
      }
    },
    dots: function (box, v, o) {
      var n = Math.max(0, v.n | 0), em = v.emoji, cell = 100, s = '', W, H, cnt = 0;
      function thing(x, y, on) {
        if (!on) return '<circle class="vd-off" cx="' + x + '" cy="' + y + '" r="30" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.22)" stroke-width="4" stroke-dasharray="7 8"/>';
        var k = cnt++;
        if (em) return '<g class="vd-on" style="--i:' + k + '">' + emoSvg(em, x, y, 66) + '</g>';
        return '<g class="vd-on" style="--i:' + k + '"><circle cx="' + x + '" cy="' + y + '" r="34" fill="url(#vdg)" stroke="#0b1430" stroke-width="5"/><circle cx="' + (x - 10) + '" cy="' + (y - 12) + '" r="9" fill="rgba(255,255,255,.7)"/></g>';
      }
      var defs = '<defs><radialGradient id="vdg" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffc93c"/><stop offset="1" stop-color="#e08a00"/></radialGradient></defs>';
      // packed: a small card or a sequence box is about square, so a few things sit in short rows (like a dice face) and stay big
      var pack = v.cols || (o && o.small && !v.frame ? packCols(n) : 0);
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
      } else if (pack) {
        var pc = Math.max(1, Math.min(pack, Math.max(n, 1))), pr = Math.max(1, Math.ceil(n / pc));
        W = pc * cell; H = pr * cell;
        for (var q = 0; q < n; q++) {
          var row = Math.floor(q / pc), inRow = row === pr - 1 ? n - row * pc : pc;   // a short last row sits in the middle
          s += thing((q % pc) * cell + cell / 2 + (pc - inRow) * cell / 2, row * cell + cell / 2, true);
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
      s += '<line class="vc-h" x1="100" y1="100" x2="100" y2="58" stroke="#0b1430" stroke-width="10" stroke-linecap="round" transform="rotate(' + ha + ' 100 100)"/>';
      s += '<line class="vc-m" x1="100" y1="100" x2="100" y2="30" stroke="#2c3f86" stroke-width="6" stroke-linecap="round" transform="rotate(' + ma + ' 100 100)"/>';
      s += '<circle cx="100" cy="100" r="8" fill="#ffc93c" stroke="#0b1430" stroke-width="3"/>';
      box.innerHTML = svg(200, 200, s, 'vc-svg');
    },
    frac: function (box, v) { box.innerHTML = fracSvg(+v.n || 0, Math.max(1, +v.d || 1), v.shape); },
    seq: function (box, v) {
      var items = v.items || [], row = el('div', 'vs-row', null, box);
      row.style.setProperty('--n', items.length);
      items.forEach(function (it) {
        var gap = String(it) === '?', rep = gap ? null : repeatOf(it);
        var c = el('div', 'vs-it' + (gap ? ' is-gap' : '') + (isEmoji(it) ? ' is-emo' : ' num') + (rep ? ' is-group' : ''), null, row);
        if (rep) VIS.dots(c, { n: rep.n, emoji: rep.e, cols: packCols(rep.n) });
        else if (!gap && isEmoji(it) && picUrl(it)) c.innerHTML = emoHtml(it, 'vs-pic'); else c.textContent = String(it);
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
    // tally strokes in fives: four standing and one across (class 0 pack, slice 4)
    tally: function (box, v) {
      var n = Math.max(0, Math.min(10, v.n | 0)), s = '', x = 14, G5 = 34, GAP = 30, H = 120;
      for (var i = 0; i < n; i++) {
        var inG = i % 5;
        if (inG === 4) {
          var x0 = x - 4 * G5 - 12;
          s += '<line x1="' + x0 + '" y1="' + (H - 22) + '" x2="' + (x - G5 + 12) + '" y2="22" stroke="#ffc93c" stroke-width="10" stroke-linecap="round"/>';
          x += GAP;
        } else {
          s += '<line x1="' + x + '" y1="14" x2="' + x + '" y2="' + (H - 14) + '" stroke="#f4f8ff" stroke-width="10" stroke-linecap="round"/>';
          x += G5;
        }
      }
      box.innerHTML = svg(Math.max(60, x), H, s, 'vt-svg');
    },
    // a number he only hears: a big speaker that says it again
    hear: function (box, v) {
      var b = el('button', 'vh-btn', SPEAK, box);
      b.type = 'button'; b.dataset.act = 'hear-again'; b.setAttribute('aria-label', String(v.n));
      b.addEventListener('click', function () { sfx('tap'); say(String(v.n) + '.', { cut: true }); b.classList.remove('is-talk'); void b.offsetWidth; b.classList.add('is-talk'); });
    },
    // plain shapes, as in "find the shape"; mark: the wanted ones ringed, the rest faded (the how)
    shapes: function (box, v) {
      var items = v.items || [], cols = items.length <= 1 ? 1 : 4, rows = Math.ceil(items.length / cols), s = '';
      items.forEach(function (it, i) {
        var cx = (i % cols) * 130 + 65, cy = Math.floor(i / cols) * 130 + 65, on = it.s === v.want;
        if (v.mark && on) s += '<circle cx="' + cx + '" cy="' + cy + '" r="60" fill="rgba(93,242,176,.16)" stroke="#5df2b0" stroke-width="6"/>';
        s += '<g' + (v.mark && !on ? ' opacity=".25"' : '') + '>' + shapeSvg(it, cx, cy) + '</g>';
      });
      box.innerHTML = svg(cols * 130, rows * 130, s, 'vsh-svg');
    },
    lab: function (box, v, o) { labVis(box, v, o); },
    scene: function (box, v) {
      if (String(v.text || '').length > 100) box.classList.add('is-long');
      if (v.pic) box.insertAdjacentHTML('beforeend', '<img class="pic vsc-e vsc-scene" src="' + esc(v.pic) + '" alt="" draggable="false" data-e="' + esc(v.emoji || '') + '" onerror="G.TaskUI._picFail(this)">');
      else if (v.emoji) box.insertAdjacentHTML('beforeend', emoHtml(v.emoji, 'vsc-e'));
      txt('div', 'vsc-t', v.text, box);
    }
  };
  // one shape, centred on x, y: size z 0..2, turned r degrees, colour c (the colour never tells the shape)
  var SHAPE_COL = ['#ff7a7a', '#ffc93c', '#5df2b0', '#45c8ff', '#c49bff'];
  function shapeSvg(it, x, y) {
    var r = [34, 43, 52][it.z | 0] || 43, col = SHAPE_COL[(it.c | 0) % SHAPE_COL.length], st = ' fill="' + col + '" stroke="#0b1430" stroke-width="6" stroke-linejoin="round"';
    var tf = ' transform="rotate(' + (+it.r || 0) + ' ' + x + ' ' + y + ')"';
    if (it.s === 'circle') return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + st + '/>';
    if (it.s === 'square') { var a = r * 0.86; return '<rect x="' + (x - a) + '" y="' + (y - a) + '" width="' + 2 * a + '" height="' + 2 * a + '" rx="4"' + st + tf + '/>'; }
    var p = [0, 1, 2].map(function (k) { var ang = -Math.PI / 2 + k * 2 * Math.PI / 3; return (x + Math.cos(ang) * r * 1.22).toFixed(1) + ',' + (y + 9 + Math.sin(ang) * r * 1.22).toFixed(1); }).join(' ');
    return '<polygon points="' + p + '"' + st + tf + '/>';
  }
  // how many columns a small group of n things gets: 1, 2 side by side, then rows of 2 and of 3
  function packCols(n) { return n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : 5; }
  // "⭐⭐⭐" -> {e: '⭐', n: 3}; null for anything that is not one picture repeated
  function repeatOf(it) {
    var s = String(it), parts;
    if (!isEmoji(s)) return null;
    try { parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), function (x) { return x.segment; }); }
    catch (e) { parts = Array.from(s.replace(/\uFE0F/g, '')); }
    if (parts.length < 2) return null;
    for (var i = 1; i < parts.length; i++) if (parts[i] !== parts[0]) return null;
    return { e: parts[0], n: parts.length };
  }
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
    try { VIS[v.type](box, v, o); } catch (e) { console.error('TaskUI.visual', v.type, e); }
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
      var o = el('button', 'orb' + (unit ? ' coin' + (v < 10 ? ' is-silver' : '') : '') + size, null, tray);
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
        var o = el('button', 'orb in-pot' + (unit ? ' coin' + (+tiles[i].v < 10 ? ' is-silver' : '') : ''), null, row);
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
          note.textContent = t('task.tooMany'); say(t('task.tooMany'), { skip: true }); sfx('miss');
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
    // cards he hears (English words, choice.speak) get the same rows, each with its own speaker
    var rows = (c.speak || opts.some(function (o) { return o.label != null && String(o.label).length > 14; })) && !opts.some(function (o) { return o.visual; });
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
        sp.addEventListener('click', function () { sfx('tap'); say(o.say || o.label, { cut: true }); sp.classList.remove('is-talk'); void sp.offsetWidth; sp.classList.add('is-talk'); });
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

  /* ---------------- the class 0 pack (slice 4): secret word, rhyme pieces, clap the beats, give berries, find shapes ----------------
     Nothing on these screens needs reading: a picture says its name when tapped, states are shown (a slot filled,
     a dot per drum beat, berries on the plate, a ring round a tapped shape). */
  // the scale of the stage (it is fitted to the screen), so a dragged thing stays under the finger
  function scaleOf(e) { var r = e.getBoundingClientRect(); return r.width / (e.offsetWidth || r.width || 1) || 1; }
  // a finger drag that works with touch: the thing follows the finger and is dropped where it is let go.
  // A press that hardly moves is a tap. o: {canStart(), onTap(), onDrop(x, y) -> true when it found a place}
  function draggable(item, o) {
    var d = null;
    item.style.touchAction = 'none';
    item.addEventListener('pointerdown', function (ev) {
      if (d || (o.canStart && !o.canStart())) return;
      d = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, k: scaleOf(item), moved: false };
      try { item.setPointerCapture(ev.pointerId); } catch (e) { /* old browsers */ }
    });
    item.addEventListener('pointermove', function (ev) {
      if (!d || ev.pointerId !== d.id) return;
      var dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 14) return;
      if (!d.moved) { d.moved = true; item.classList.add('is-drag'); sfx('pick'); }
      item.style.transform = 'translate(' + (dx / d.k).toFixed(1) + 'px,' + (dy / d.k).toFixed(1) + 'px) scale(1.08)';
    });
    function end(ev, cancel) {
      if (!d || ev.pointerId !== d.id) return;
      var was = d; d = null;
      var at = item.getBoundingClientRect();   // where it was let go, before it jumps back: a drop can slide on from here
      item.classList.remove('is-drag');
      item.style.transform = '';
      if (cancel) return;
      if (!was.moved) { if (o.onTap) o.onTap(); return; }
      if (!(o.onDrop && o.onDrop(ev.clientX, ev.clientY, at))) sfx('unpick');
    }
    item.addEventListener('pointerup', function (ev) { end(ev, false); });
    item.addEventListener('pointercancel', function (ev) { end(ev, true); });
  }
  function inside(e, x, y, pad) { var r = e.getBoundingClientRect(); pad = pad || 0; return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; }
  function picBtn(parent, emoji, cls, sayText) {
    var b = el('button', 'pk-pic ' + (cls || ''), emoHtml(emoji, 'pk-img'), parent);
    b.type = 'button';
    if (sayText) b.addEventListener('click', function () { sfx('tap'); say(sayText, { cut: true }); b.classList.remove('is-talk'); void b.offsetWidth; b.classList.add('is-talk'); });
    return b;
  }
  function okBtn(parent) {
    var ok = el('button', 'btn btn-green btn-round pk-ok is-off', ICON.check, parent);
    ok.type = 'button'; ok.dataset.act = 'confirm'; ok.setAttribute('aria-label', t('task.ok'));
    return ok;
  }
  var CHEST = '<svg viewBox="0 0 160 150" aria-hidden="true"><g class="cz-body"><rect x="14" y="66" width="132" height="74" rx="12" fill="#a8642e" stroke="#0b1430" stroke-width="6"/>' +
    '<rect x="14" y="88" width="132" height="12" fill="#ffc93c" stroke="#0b1430" stroke-width="4"/><rect x="68" y="80" width="24" height="30" rx="5" fill="#ffd34d" stroke="#0b1430" stroke-width="4"/></g>' +
    '<g class="cz-lid"><path d="M14 70V52c0-22 18-36 66-36s66 14 66 36v18z" fill="#c07a3c" stroke="#0b1430" stroke-width="6" stroke-linejoin="round"/>' +
    '<rect x="14" y="56" width="132" height="12" fill="#ffc93c" stroke="#0b1430" stroke-width="4"/></g></svg>';

  // Secret word: a picture per letter. He hears a picture's name and taps the letter it starts with; the letters line
  // up into a short word, and a chest opens and shows its picture.
  function secretUI(area, task, api) {
    var sw = task.secret || {}, word = String(sw.word || ''), tiles = sw.tiles || [], names = sw.says || [];
    var fill = word.split('').map(function () { return null; }), ghost = '', token = 0;
    var wrap = el('div', 'sw-wrap', null, area);
    var cols = el('div', 'sw-cols', null, wrap);
    var pics = [], slots = [];
    (sw.pics || []).forEach(function (e, k) {
      var c = el('div', 'sw-col', null, cols);
      pics.push(picBtn(c, e, 'sw-pic', names[k]));
      pics[k].dataset.act = 'pic-' + k;
      var s = el('button', 'sp-slot sw-slot num', null, c);
      s.type = 'button'; s.dataset.act = 'slot-' + k;
      s.addEventListener('click', function () { tapSlot(k); });
      slots.push(s);
    });
    var tray = el('div', 'sw-tray', null, wrap);
    var tbtn = tiles.map(function (L, k) {
      var b = el('button', 'sp-tile sw-tile num', null, tray);
      b.type = 'button'; b.dataset.act = 'tile-' + k; b.textContent = L;
      b.addEventListener('click', function () { tapTile(k); });
      return b;
    });
    var chest = el('div', 'sw-chest', CHEST, wrap);
    var prize = el('div', 'sw-prize', emoHtml(sw.target, 'sw-prize-img'), chest);
    function current() { return fill.map(function (k) { return k == null ? '' : tiles[k]; }).join(''); }
    function draw() {
      var next = fill.indexOf(null);
      slots.forEach(function (s, k) {
        var has = fill[k] != null;
        s.textContent = has ? tiles[fill[k]] : (ghost ? ghost[k] || '' : '');
        s.classList.toggle('is-full', has);
        s.classList.toggle('is-ghost', !has && !!ghost);
        pics[k].classList.toggle('is-now', k === next);
      });
      api.gather(fill.filter(function (x) { return x != null; }).length / Math.max(1, fill.length));
      var want = ghost && next >= 0 ? ghost[next] : null, marked = false;
      tbtn.forEach(function (b, k) {
        var used = fill.indexOf(k) >= 0, mark = !marked && !used && want && tiles[k] === want;
        if (mark) marked = true;
        b.classList.toggle('is-used', used);
        b.classList.toggle('is-sol', !!mark);
      });
    }
    function open(yes) { chest.classList.toggle('is-open', !!yes); }
    function tapTile(k) {
      if (api.locked || fill.indexOf(k) >= 0) return;
      var at = fill.indexOf(null); if (at < 0) return;
      fill[at] = k; sfx('pick'); draw();
      if (!still()) { slots[at].classList.remove('pop-in'); void slots[at].offsetWidth; slots[at].classList.add('pop-in'); }
      var nx = fill.indexOf(null);
      if (nx >= 0) { if (names[nx]) say(names[nx], { skip: true }); return; }
      var my = ++token, got = current();
      if (got === word) { open(true); sfx('right'); wait(700).then(function () { if (my === token) api.submit(got); }); }
      else wait(380).then(function () { if (my === token && fill.indexOf(null) < 0) api.submit(current()); });
    }
    function tapSlot(k) {
      if (api.locked || fill[k] == null) return;
      token++; fill[k] = null; open(false); sfx('unpick'); draw();
    }
    function place(w) {
      for (var a = 0; a < fill.length; a++) fill[a] = null;
      String(w || '').toUpperCase().split('').forEach(function (L, at) {
        for (var k = 0; k < tiles.length; k++) if (tiles[k] === L && fill.indexOf(k) < 0) { if (at < fill.length) fill[at] = k; return; }
      });
    }
    draw();
    return {
      solution: function (w) { ghost = String(w || '').toUpperCase(); token++; open(false); for (var a = 0; a < fill.length; a++) fill[a] = null; draw(); },
      hintEl: function (w) { var k = tiles.indexOf(String(w || word)[0]); return tbtn[k >= 0 ? k : 0]; },
      show: function (w) { place(w); draw(); open(current() === word); },
      answer: function (w) {
        token++; open(false); for (var a = 0; a < fill.length; a++) fill[a] = null; draw();
        String(w).toUpperCase().split('').forEach(function (L) { for (var k = 0; k < tiles.length; k++) if (tiles[k] === L && fill.indexOf(k) < 0) { tapTile(k); return; } });
      }
    };
  }

  // Rhyme pieces: one picture with a puzzle edge and three loose pieces. He drags the piece that rhymes onto it and
  // they click together. A tap on any picture says its name.
  // Steve's play notes 4 ("the puzzle pieces don't connect"): before, the joined piece was laid out by flexbox with
  // guessed offsets (a 184 px dock pulled 40 px under the picture, the piece put in at 180 x 176), and the two edges were
  // drawn at different scales (the picture 1.1 px per unit, the piece 0.75 across and 0.88 down; in the tray it was
  // squeezed to 170 x 170 from a 240 x 200 drawing), with a knob of another curve than the notch. So the knob stopped
  // about 14 px short of the bottom of the notch, the two bodies stood about 5 px apart, and nothing moved: the piece
  // jumped back to the tray and a copy popped up by the picture.
  // Now both edges are drawn at one scale (1 px per unit, PZ.u), the knob is the notch's own curve turned round, and the
  // joined piece sits where its edge line is the picture's edge line (PZ.at). A right drop slides the last bit by
  // itself, clicks, and the pair gives one small bounce; a wrong piece slides back to where it lay.
  // picture 200 x 200; the piece is 248 x 200 with its knob and joins at x 144, so its edge (x 4) is the picture's (x 196).
  // The notch is a puzzle head on a neck; the knob is the same three curves run backwards, 192 units to the left.
  var PZ = { at: 144 };
  var PZ_T = '<svg class="pz-edge" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true"><path d="M22 4H178Q196 4 196 22V76C178 76 184 62 166 62C142 62 142 138 166 138C184 138 178 124 196 124V178Q196 196 178 196H22Q4 196 4 178V22Q4 4 22 4Z"/></svg>';
  var PZ_KNOB = 'M22 4H178Q196 4 196 22V178Q196 196 178 196H22Q4 196 4 178V124C-14 124 -8 138 -26 138C-50 138 -50 62 -26 62C-8 62 -14 76 4 76V22Q4 4 22 4Z';
  var PZ_P = '<svg class="pz-edge" viewBox="-48 0 248 200" preserveAspectRatio="none" aria-hidden="true"><path d="' + PZ_KNOB + '"/></svg>';
  var PZ_DOCK = '<svg class="pz-ghost" viewBox="-48 0 248 200" preserveAspectRatio="none" aria-hidden="true"><path d="' + PZ_KNOB + '"/></svg>';
  var SLIDE_MS = 420, BACK_MS = 380;
  function matchUI(area, task, api) {
    // dropped: the piece that went in. The first drop is his answer; nothing else can be dropped while it is graded
    var m = task.match || {}, pieces = m.pieces || [], says = m.says || [], sol = null, dropped = null, joined = null, token = 0;
    var wrap = el('div', 'rp-wrap', null, area);
    var spot = el('div', 'rp-spot', null, wrap);
    var target = el('button', 'pk-pic rp-target', PZ_T + emoHtml(m.target, 'pk-img'), spot);
    target.type = 'button'; target.dataset.act = 'target';
    target.addEventListener('click', function () { sfx('tap'); if (says[0]) say(says[0], { cut: true }); });
    var dock = el('div', 'rp-dock', PZ_DOCK, spot);
    var tray = el('div', 'rp-tray', null, wrap);
    var els = pieces.map(function (p, i) {
      var b = el('div', 'pk-pic rp-piece', PZ_P + emoHtml(p.emoji, 'pk-img'), tray);
      b.dataset.act = 'piece-' + i; b.setAttribute('role', 'button'); b.setAttribute('aria-label', p.say || '');
      draggable(b, {
        canStart: function () { return !api.locked && dropped == null; },
        onTap: function () { sfx('tap'); if (p.say) say(p.say, { cut: true }); b.classList.remove('is-talk'); void b.offsetWidth; b.classList.add('is-talk'); },
        onDrop: function (x, y, at) {
          if (api.locked || dropped != null || !inside(spot, x, y, 60)) return false;
          dropped = i;
          var my = ++token;
          if (i === m.correct) slideIn(i, at, function () { wait(300).then(function () { if (my === token && dropped === i) api.submit(i); }); });
          else slideBack(i, at, function () { if (my === token && dropped === i) api.submit(i); });
          return true;
        }
      });
      return b;
    });
    var flying = null;
    // a piece drawn where it joins the picture, made to start from `from` (a screen rect) and slide into place
    function docked(i) {
      var c = el('div', 'pk-pic rp-piece is-docked', PZ_P + emoHtml(pieces[i].emoji, 'pk-img'), spot);
      c.dataset.act = 'docked';
      return c;
    }
    function fly(c, from, to, ms) {
      // FLIP: the piece is laid out at `to`'s place; it is moved back to `from` and let go to slide there
      var k = scaleOf(spot), r = c.getBoundingClientRect();
      var dx = (from.left - r.left) / k, dy = (from.top - r.top) / k, sc = from.width / Math.max(1, r.width);
      if (to) { dx -= (to.left - r.left) / k; dy -= (to.top - r.top) / k; }
      c.style.transition = 'none';
      c.style.transformOrigin = '0 0';
      c.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      void c.offsetWidth;
      if (G.fast || still()) { c.style.transform = to ? c.style.transform : ''; return; }
      c.style.transition = 'transform ' + ms + 'ms cubic-bezier(.2,.8,.25,1)';
      c.style.transform = '';
    }
    function click() {
      spot.classList.remove('is-click'); void spot.offsetWidth; spot.classList.add('is-click');
      sfx('snap');
    }
    // the right piece slides the rest of the way by itself and locks into the picture's edge
    function slideIn(i, from, done) {
      if (joined === i && spot.querySelector('.is-docked')) { if (done) done(); return; }
      if (flying) { flying.remove(); flying = null; }
      els.forEach(function (b, k) { b.classList.toggle('is-in', k === i); });
      spot.querySelectorAll('.is-docked').forEach(function (e) { e.remove(); });
      joined = i;
      var c = docked(i);
      spot.classList.add('is-joining');
      fly(c, from || els[i].getBoundingClientRect(), null, SLIDE_MS);
      wait(G.fast ? 0 : SLIDE_MS).then(function () {
        if (joined !== i) return;
        spot.classList.remove('is-joining'); spot.classList.add('is-joined');
        click();
        if (done) done();
      });
    }
    // a piece that does not rhyme stops short of the edge, shakes, and slides back to where it lay
    function slideBack(i, from, done) {
      var c = docked(i), home = els[i];
      c.classList.add('is-wrong');
      home.classList.add('is-in');
      flying = c;
      // first towards the edge, stopping short of it
      c.style.left = (PZ.at + 46) + 'px';
      fly(c, from || home.getBoundingClientRect(), null, 260);
      wait(G.fast ? 0 : 300).then(function () {
        if (flying !== c) return;
        sfx('unpick');
        c.classList.add('is-nofit');
        return wait(G.fast ? 0 : 360);
      }).then(function () {
        if (flying !== c) return;
        // back to its place in the tray
        var k = scaleOf(spot), r = c.getBoundingClientRect(), h = home.getBoundingClientRect();
        c.classList.remove('is-nofit');
        c.style.transformOrigin = '0 0';
        c.style.transition = G.fast || still() ? 'none' : 'transform ' + BACK_MS + 'ms cubic-bezier(.4,0,.2,1)';
        c.style.transform = 'translate(' + ((h.left - r.left) / k).toFixed(1) + 'px,' + ((h.top - r.top) / k).toFixed(1) + 'px) scale(' + (h.width / Math.max(1, r.width)).toFixed(3) + ')';
        return wait(G.fast ? 0 : BACK_MS);
      }).then(function () {
        if (flying !== c) return;
        c.remove(); flying = null;
        home.classList.remove('is-in');
        if (done) done();
      });
    }
    function reset() {
      token++; joined = null;
      if (flying) { flying.remove(); flying = null; }
      spot.querySelectorAll('.is-docked').forEach(function (e) { e.remove(); });
      els.forEach(function (b) { b.classList.remove('is-in'); });
      spot.classList.remove('is-joined', 'is-joining', 'is-click');
    }
    return {
      solution: function (i) { sol = i; reset(); els.forEach(function (b, k) { b.classList.toggle('is-sol', k === sol); }); },
      hintEl: function (i) { return els[i] || els[0]; },
      // the wild one's answer, or his Gromonster showing how: the piece slides in from the tray and clicks
      show: function (i) { if (els[i]) slideIn(i); },
      answer: function (i) {
        if (api.locked || !els[i] || dropped != null) return;
        dropped = i;
        var my = ++token;
        if (i === m.correct) slideIn(i, null, function () { wait(200).then(function () { if (dropped === i) api.submit(i); }); });
        else slideBack(i, null, function () { if (my === token && dropped === i) api.submit(i); });
      },
      // the thinking of the wild one (Steve's play notes 4): what lights up as it thinks
      parts: function () { return { target: target, pieces: els }; }
    };
  }

  // Clap the beats: a picture and its spoken name. He taps the drum once for each syllable, then the tick.
  function beatsUI(area, task, api) {
    var bt = task.beats || {}, max = bt.max || 6, n = 0, ghost = 0;
    var wrap = el('div', 'bb-wrap', null, area);
    var pic = picBtn(wrap, bt.emoji, 'bb-pic', (bt.says || [])[0]);
    pic.dataset.act = 'pic';
    var drum = el('button', 'bb-drum', emoHtml('🥁', 'bb-drum-img'), wrap);
    drum.type = 'button'; drum.dataset.act = 'drum';
    var side = el('div', 'bb-side', null, wrap);
    var dots = el('div', 'bb-dots', null, side);
    var dotEls = [];
    for (var i = 0; i < max; i++) dotEls.push(el('span', 'bb-dot', null, dots));
    var again = el('button', 'btn btn-round bb-again', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M4 3.5v5h5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>', side);
    again.type = 'button'; again.dataset.act = 'beats-again'; again.setAttribute('aria-label', 'Igen');
    var ok = okBtn(wrap);
    function draw() {
      dotEls.forEach(function (d, k) { d.classList.toggle('is-on', k < n); d.classList.toggle('is-sol', k < ghost && k >= n); });
      dots.classList.toggle('is-ghost', ghost > 0);
      again.classList.toggle('is-off', n === 0);
      ok.classList.toggle('is-off', n === 0); ok.classList.toggle('is-ready', n > 0);
      api.gather(Math.min(1, n / Math.max(1, bt.n || 1)) * 0.6);
    }
    drum.addEventListener('click', function () {
      if (api.locked || n >= max) { if (n >= max) sfx('locked'); return; }
      n++; sfx('pick'); draw();
      if (!still()) { drum.classList.remove('is-hit'); void drum.offsetWidth; drum.classList.add('is-hit'); }
    });
    again.addEventListener('click', function () { if (api.locked || !n) return; n = 0; sfx('unpick'); draw(); });
    ok.addEventListener('click', function () { if (api.locked) return; if (!n) { sfx('locked'); return; } sfx('tap'); api.submit(n); });
    draw();
    return {
      solution: function (k) { ghost = k | 0; n = 0; draw(); },
      hintEl: function () { return drum; },
      show: function (k) { n = Math.min(max, k | 0); draw(); },
      answer: function (k) { n = 0; draw(); for (var a = 0; a < k; a++) drum.click(); ok.click(); }
    };
  }

  // Give exactly that many: berries onto the Gromonster's plate, then the tick. A berry moves by a drag or a tap,
  // and a tap on the plate gives one back.
  function giveUI(area, task, api) {
    var gv = task.give || {}, total = gv.total || 10, onPlate = [], sol = 0;
    var wrap = el('div', 'gv-wrap', null, area);
    var tray = el('div', 'gv-tray', null, wrap);
    var plate = el('div', 'gv-plate', null, wrap);
    var heap = el('div', 'gv-heap', null, plate);
    var ok = okBtn(wrap);
    var berries = [];
    for (var i = 0; i < total; i++) (function (k) {
      var b = el('div', 'gv-berry', emoHtml(gv.emoji || '🍓', 'gv-img'), tray);
      b.dataset.act = 'berry-' + k; b.setAttribute('role', 'button');
      draggable(b, {
        canStart: function () { return !api.locked && onPlate.indexOf(k) < 0; },
        onTap: function () { put(k); },
        onDrop: function (x, y) { if (!inside(plate, x, y, 24)) return false; put(k); return true; }
      });
      berries.push(b);
    })(i);
    function put(k) { if (api.locked || onPlate.indexOf(k) >= 0) return; onPlate.push(k); sfx('pick'); draw(); }
    function back(j) { if (api.locked) return; onPlate.splice(j, 1); sfx('unpick'); draw(); }
    function draw() {
      heap.innerHTML = '';
      onPlate.forEach(function (k, j) {
        var b = el('button', 'gv-berry is-on', emoHtml(gv.emoji || '🍓', 'gv-img'), heap);
        b.type = 'button'; b.dataset.act = 'plate-' + j;
        b.addEventListener('click', function () { back(j); });
      });
      heap.style.setProperty('--n', Math.max(1, onPlate.length));
      // help: the berries still to give glow, as many as are missing (none when there are too many)
      var left = Math.max(0, sol - onPlate.length);
      berries.forEach(function (b, k) {
        var used = onPlate.indexOf(k) >= 0, mark = !used && left > 0;
        if (mark) left--;
        b.classList.toggle('is-used', used);
        b.classList.toggle('is-sol', mark);
      });
      ok.classList.toggle('is-off', !onPlate.length); ok.classList.toggle('is-ready', onPlate.length > 0);
      api.gather(onPlate.length ? 0.5 : 0);   // the glow must not tell how close he is
    }
    ok.addEventListener('click', function () { if (api.locked) return; if (!onPlate.length) { sfx('locked'); return; } sfx('tap'); api.submit(onPlate.length); });
    draw();
    return {
      solution: function (k) { sol = k | 0; onPlate = []; draw(); },
      hintEl: function () { return berries[0]; },
      show: function (k) { onPlate = []; for (var a = 0; a < Math.min(total, k | 0); a++) onPlate.push(a); draw(); },
      answer: function (k) { onPlate = []; draw(); for (var a = 0; a < Math.min(total, k | 0); a++) put(a); ok.click(); }
    };
  }

  // Find the shape: circles, triangles and squares in mixed sizes, turned different ways. He taps every one of the
  // named shape (a tap again takes it back), then the tick.
  function shapesUI(area, task, api) {
    var sh = task.shapes || {}, items = sh.items || [], on = items.map(function () { return false; }), sol = null;
    var wrap = el('div', 'sh-wrap', null, area);
    var grid = el('div', 'sh-grid', null, wrap);
    var cells = items.map(function (it, i) {
      var c = el('button', 'sh-cell', svg(130, 130, shapeSvg(it, 65, 65), 'sh-svg'), grid);
      c.type = 'button'; c.dataset.act = 'shape-' + i;
      c.addEventListener('click', function () { if (api.locked) return; on[i] = !on[i]; sfx(on[i] ? 'pick' : 'unpick'); draw(); });
      return c;
    });
    var ok = okBtn(wrap);
    function picked() { var o = []; on.forEach(function (v, i) { if (v) o.push(i); }); return o; }
    function draw() {
      cells.forEach(function (c, i) { c.classList.toggle('is-on', on[i]); c.classList.toggle('is-sol', !!sol && sol.indexOf(i) >= 0 && !on[i]); });
      var n = picked().length;
      ok.classList.toggle('is-off', !n); ok.classList.toggle('is-ready', n > 0);
      api.gather(n ? 0.5 : 0);
    }
    ok.addEventListener('click', function () { if (api.locked) return; var p = picked(); if (!p.length) { sfx('locked'); return; } sfx('tap'); api.submit(p); });
    function set(list) { on = items.map(function (x, i) { return (list || []).indexOf(i) >= 0; }); }
    draw();
    return {
      solution: function (list) { sol = (list || []).slice(); set([]); draw(); },
      hintEl: function (list) { return cells[(list || [])[0]] || cells[0]; },
      show: function (list) { set(list); draw(); },
      answer: function (list) { set([]); draw(); (list || []).forEach(function (i) { if (cells[i]) cells[i].click(); }); ok.click(); }
    };
  }

  /* ---------------- Natur og teknik (slice 5, the magnet in 5b): guess then test, two strings, arrow steps ----------------
     Pictures come from the game (G.PICS); the tub, the water, the ramps, the balls, the strings, the grid, the stones
     and the arrows are drawn here. A test after a guess lasts at most six seconds and a tap on it skips to its end. */
  // time runs 12 times faster for the robot players (G.fast), as G.wait does
  function speed() { return G.fast ? 12 : 1; }
  // a little animation: frame(seconds) until dur, then done(). A tap can call the returned stop(), which jumps to the
  // end. A timer finishes it too, so a hidden page (no animation frames) never hangs a battle.
  function anim(dur, frame, done) {
    var t0 = 0, raf = 0, over = false, k = speed(), backup = 0;
    function end() { if (over) return; over = true; cancelAnimationFrame(raf); clearTimeout(backup); try { frame(dur); } catch (e) { console.error(e); } if (done) done(); }
    function tick(now) {
      if (over) return;
      if (!t0) t0 = now;
      var t = (now - t0) / 1000 * k;
      if (t >= dur) { end(); return; }
      try { frame(t); } catch (e) { console.error(e); end(); return; }
      raf = requestAnimationFrame(tick);
    }
    if (still()) backup = setTimeout(end, 250 / k);
    else { raf = requestAnimationFrame(tick); backup = setTimeout(end, dur * 1000 / k + 400); }
    return { stop: end, dead: function () { over = true; cancelAnimationFrame(raf); clearTimeout(backup); } };
  }
  function svgEl(host, w, h, cls) { host.innerHTML = svg(w, h, '', cls); return host.firstChild; }
  function add(parent, tag, attrs, html) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  // a stone, drawn in code (a grey pebble), centred on 0,0 at size s
  function stoneSvg(s) {
    var r = s / 2, f = function (x, y) { return (x * r).toFixed(1) + ' ' + (y * r).toFixed(1); };
    return '<ellipse cx="0" cy="' + (r * 0.62).toFixed(1) + '" rx="' + (r * 0.85).toFixed(1) + '" ry="' + (r * 0.16).toFixed(1) + '" fill="rgba(0,0,0,.25)"/>' +
      '<path d="M' + f(-0.95, 0.12) + 'C' + f(-0.98, -0.42) + ' ' + f(-0.52, -0.72) + ' ' + f(-0.02, -0.7) + 'C' + f(0.55, -0.7) + ' ' + f(0.98, -0.4) + ' ' + f(0.96, 0.08) +
      'C' + f(0.94, 0.48) + ' ' + f(0.52, 0.62) + ' ' + f(0.02, 0.62) + 'C' + f(-0.5, 0.62) + ' ' + f(-0.93, 0.5) + ' ' + f(-0.95, 0.12) + 'Z" fill="#9aa3b5" stroke="#0b1430" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M' + f(-0.62, 0.3) + 'Q' + f(0, 0.5) + ' ' + f(0.62, 0.28) + '" fill="none" stroke="rgba(11,20,48,.22)" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + f(-0.5, -0.3) + 'Q' + f(-0.2, -0.52) + ' ' + f(0.22, -0.48) + '" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="5" stroke-linecap="round"/>';
  }
  // the thing of the float game: its picture, or the stone
  function thingSvg(thing, s) { return thing === 'stone' ? stoneSvg(s * 0.9) : emoSvg(thing, 0, 0, s); }
  var BALL_COL = ['#ff7a7a', '#ffc93c', '#5df2b0', '#45c8ff', '#c49bff'];
  function ballSvg(c, r) {
    return '<circle r="' + r + '" fill="' + BALL_COL[(c | 0) % BALL_COL.length] + '" stroke="#0b1430" stroke-width="4"/><path d="M' + (-r * 0.75) + ' 0H' + (r * 0.75) + '" stroke="rgba(11,20,48,.55)" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + (-r * 0.35) + '" cy="' + (-r * 0.4) + '" r="' + (r * 0.22) + '" fill="rgba(255,255,255,.7)"/>';
  }

  /* the tub: 520 x 300. Water from y 168; a thing floats with its middle at 150 and lies on the bottom at 226 */
  var TUB = { w: 520, h: 300, water: 168, hang: 62, float: 146, bottom: 222, size: 112 };
  function tubSvg(svgNode, thing) {
    add(svgNode, 'path', { d: 'M62 132h396l-14 150q-2 14-16 14H92q-14 0-16-14z', fill: '#1d2c63', stroke: '#0b1430', 'stroke-width': 6, 'stroke-linejoin': 'round' });
    add(svgNode, 'rect', { x: 72, y: TUB.water, width: 376, height: 120, rx: 10, fill: '#2f7fd8' });
    var rope = add(svgNode, 'path', { d: 'M260 -14V' + (TUB.hang - 40), stroke: '#f4f8ff', 'stroke-width': 5, 'stroke-linecap': 'round', 'class': 'nt-rope' });
    var g = add(svgNode, 'g', { 'class': 'nt-thing', transform: 'translate(260 ' + TUB.hang + ')' }, thingSvg(thing, TUB.size));
    // the water in front is see-through, so the part under water looks under water
    add(svgNode, 'path', { d: 'M72 ' + TUB.water + 'q47 -10 94 0t94 0t94 0t94 0V280q0 8 -8 8H80q-8 0 -8 -8z', fill: 'rgba(93,170,255,.55)', 'class': 'nt-water' });
    add(svgNode, 'path', { d: 'M56 132h408', stroke: '#0b1430', 'stroke-width': 10, 'stroke-linecap': 'round' });
    add(svgNode, 'path', { d: 'M56 132h408', stroke: '#c9d6ff', 'stroke-width': 4, 'stroke-linecap': 'round' });
    return { thing: g, rope: rope, at: function (y, rot) { g.setAttribute('transform', 'translate(260 ' + y.toFixed(1) + ') rotate(' + (rot || 0).toFixed(1) + ')'); } };
  }
  // where the thing is t seconds after it is let go: it falls to the water, then floats (bobs and settles) or sinks
  function floatY(floats, t) {
    var contact = TUB.water - TUB.size * 0.5, fall = 0.42;
    if (t < fall) { var u = t / fall; return TUB.hang + (contact - TUB.hang) * u * u; }
    var s = t - fall;
    if (floats) return TUB.float - (TUB.float - contact) * Math.exp(-2.6 * s) * Math.cos(6 * s);
    var v = Math.min(1, s / 1.5);
    return contact + (TUB.bottom - contact) * (1 - (1 - v) * (1 - v));
  }
  var FLOAT_T = 2.3;

  /* the magnet (slice 5b): 520 x 300, the same size as the tub. A horseshoe magnet on a rope over a table, one thing on
     the table. It comes down; a thing it pulls jumps up and sticks, then both lift; a thing it does not pull stays put. */
  var MAG = { s: 96, top: 46, low: 94, lift: 60, table: 262, size: 104 };
  MAG.a = MAG.s * 0.32; MAG.b = MAG.s * 0.36; MAG.t = MAG.s * 0.26;
  MAG.rest = MAG.table - MAG.size * 0.5 + 6;    // the thing's middle when it lies on the table
  MAG.stick = MAG.b + MAG.size * 0.43;          // the thing's middle below the magnet's middle when it sticks
  // a red horseshoe magnet with silver ends, opening down, centred on 0,0 (its ends reach down to y = MAG.b)
  function magnetSvg() {
    var a = MAG.a, b = MAG.b, t = MAG.t, d = 'M' + (-a) + ' ' + b + 'V0A' + a + ' ' + a + ' 0 0 1 ' + a + ' 0V' + b;
    var tip = function (x) { return '<path d="M' + x + ' ' + (b - t * 0.85) + 'V' + b + '" stroke="#0b1430" stroke-width="' + (t + 10) + '"/><path d="M' + x + ' ' + (b - t * 0.85 + 3) + 'V' + (b - 5) + '" stroke="#dfe6f5" stroke-width="' + t + '"/>'; };
    return '<path d="' + d + '" fill="none" stroke="#0b1430" stroke-width="' + (t + 10) + '"/>' +
      '<path d="' + d + '" fill="none" stroke="#ff4f5e" stroke-width="' + t + '"/>' +
      '<path d="M' + (-a + t * 0.18) + ' ' + (b * 0.4) + 'V0A' + (a - t * 0.18) + ' ' + (a - t * 0.18) + ' 0 0 1 ' + (-a * 0.2) + ' ' + (-a + t * 0.18) + '" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="' + (t * 0.22) + '" stroke-linecap="round"/>' +
      tip(-a) + tip(a);
  }
  function magnetStageSvg(svgNode, thing) {
    add(svgNode, 'ellipse', { cx: 260, cy: MAG.table + 22, rx: 170, ry: 10, fill: 'rgba(0,0,0,.25)' });
    add(svgNode, 'rect', { x: 100, y: MAG.table, width: 320, height: 22, rx: 9, fill: '#c98a4b', stroke: '#0b1430', 'stroke-width': 5 });
    var rope = add(svgNode, 'path', { d: '', stroke: '#f4f8ff', 'stroke-width': 5, 'stroke-linecap': 'round', 'class': 'nt-rope' });
    var g = add(svgNode, 'g', { 'class': 'nt-thing' }, thingSvg(thing, MAG.size));
    var m = add(svgNode, 'g', { 'class': 'nt-magnet' }, magnetSvg());
    function at(my, ty, rot) {
      m.setAttribute('transform', 'translate(260 ' + my.toFixed(1) + ') rotate(' + (rot || 0).toFixed(1) + ')');
      rope.setAttribute('d', 'M260 -14V' + (my - MAG.a - MAG.t / 2).toFixed(1));
      g.setAttribute('transform', 'translate(260 ' + ty.toFixed(1) + ')');
    }
    at(MAG.top, MAG.rest);
    return { thing: g, magnet: m, rope: rope, at: at };
  }
  // where the magnet and the thing are t seconds after the magnet is let go
  function magnetAt(pulls, t) {
    var down = 0.7, ease = function (u) { u = Math.max(0, Math.min(1, u)); return 1 - (1 - u) * (1 - u); };
    var my = MAG.top + (MAG.low - MAG.top) * ease(t / down);
    if (!pulls) return { my: my, ty: MAG.rest, rot: t > down ? Math.sin((t - down) * 14) * 5 * Math.exp(-(t - down) * 2.2) : 0 };
    var jump = 0.2, u = (t - down) / jump, stuckY = MAG.low + MAG.stick;
    if (t < down) return { my: my, ty: MAG.rest };
    if (u < 1) return { my: MAG.low, ty: MAG.rest + (stuckY - MAG.rest) * u * u };
    var lift = ease((t - down - jump - 0.35) / 0.8), m2 = MAG.low + (MAG.lift - MAG.low) * lift;
    return { my: m2, ty: m2 + MAG.stick };
  }
  var MAGNET_T = 2.2;

  /* the ramps: 1040 x 260, a lane of 130 each. The same length of ramp, the steep one starts its ball higher */
  // len: the ramp; the ball starts `run` from its foot (the same on both ramps), so on the steep one it starts higher
  var RAMP = { len: 132, run: 114, foot: 196, floor: 118, r: 16, g: 900, mu: 8 };
  function rampGeo(angle) {
    var a = angle * Math.PI / 180, h = RAMP.len * Math.sin(a), dx = RAMP.len * Math.cos(a), acc = RAMP.g * Math.sin(a);
    var t1 = Math.sqrt(2 * RAMP.run / acc), v = acc * t1, d = RAMP.run * Math.sin(a) * RAMP.mu, t2 = 2 * d / v;
    return { a: a, h: h, dx: dx, acc: acc, t1: t1, v: v, d: d, t2: t2, T: t1 + t2 };
  }
  // the ball's centre and how far it has rolled (for its turn), t seconds after both are let go
  function rampBall(geo, y0, t) {
    var r = RAMP.r, s, x, y;
    var nx = Math.sin(geo.a), ny = -Math.cos(geo.a);   // the ball sits on the ramp, its centre one radius off it
    if (t < geo.t1) {
      s = 0.5 * geo.acc * t * t;
      var along = RAMP.run - s;
      x = RAMP.foot - along * Math.cos(geo.a) + nx * r; y = y0 + RAMP.floor - along * Math.sin(geo.a) + ny * r;
      return { x: x, y: y, roll: s };
    }
    var u = Math.min(t - geo.t1, geo.t2), b = geo.v / geo.t2, f = geo.v * u - 0.5 * b * u * u;
    return { x: RAMP.foot + f, y: y0 + RAMP.floor - r, roll: RAMP.run + f };
  }
  function rampLaneSvg(parent, i, angle, ball) {
    var y0 = i * 130, geo = rampGeo(angle);
    var lane = add(parent, 'g', { 'class': 'nt-lane' });
    add(lane, 'rect', { x: 4, y: y0 + 4, width: 1032, height: 122, rx: 20, 'class': 'nt-lanebg' });
    add(lane, 'path', { d: 'M24 ' + (y0 + RAMP.floor) + 'H1016', stroke: '#c9d6ff', 'stroke-width': 6, 'stroke-linecap': 'round' });
    for (var m = 1; m <= 8; m++) add(lane, 'path', { d: 'M' + (RAMP.foot + m * 100) + ' ' + (y0 + RAMP.floor + 4) + 'v8', stroke: 'rgba(201,214,255,.5)', 'stroke-width': 3 });
    var top = [RAMP.foot - geo.dx, y0 + RAMP.floor - geo.h];
    add(lane, 'path', { d: 'M' + top[0].toFixed(1) + ' ' + top[1].toFixed(1) + 'L' + RAMP.foot + ' ' + (y0 + RAMP.floor) + 'H' + top[0].toFixed(1) + 'Z', fill: '#c98a4b', stroke: '#0b1430', 'stroke-width': 5, 'stroke-linejoin': 'round' });
    var b = add(lane, 'g', { 'class': 'nt-ball' }, ballSvg(ball, RAMP.r));
    function at(t) { var p = rampBall(geo, y0, t); b.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (p.roll / RAMP.r * 57.3).toFixed(0) + ')'); }
    at(0);
    return { lane: lane, at: at, geo: geo, ball: b };
  }

  /* the strings: 700 x 110 a row; a string of length L (220 to 600) from x 50 */
  function stringSvg(host, len) {
    var s = svgEl(host, 700, 110, 'sg-svg');
    add(s, 'rect', { x: 18, y: 30, width: 664, height: 50, rx: 14, fill: '#a8642e', stroke: '#0b1430', 'stroke-width': 5 });
    var x1 = 50 + len;
    add(s, 'circle', { cx: 50, cy: 55, r: 11, fill: '#ffd34d', stroke: '#0b1430', 'stroke-width': 4 });
    add(s, 'circle', { cx: x1, cy: 55, r: 11, fill: '#ffd34d', stroke: '#0b1430', 'stroke-width': 4 });
    var str = add(s, 'path', { d: 'M50 55H' + x1, stroke: '#f4f8ff', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' });
    return { svg: s, path: str, x1: x1 };
  }

  /* the grid: a cell is 100 x 100 */
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l7.5 8.5h-4.6v8.5H9.1V12H4.5z" fill="currentColor" stroke="#0b1430" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var TURN = { u: 0, r: 90, d: 180, l: 270 };
  var GO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5v15l12-7.5z" fill="currentColor" stroke="#0b1430" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  function arrowHtml(d) { return '<span class="st-arr" style="transform:rotate(' + (TURN[d] || 0) + 'deg)">' + ARROW + '</span>'; }
  // the Gromonster on the grid: the one the battle says is fighting (opts.fighter), else the camp's first
  function fighterUrl(who) {
    var id = who || null;
    try { if (!id) id = G.partnerId ? G.partnerId() : null; } catch (e) { id = null; }
    return BASE + 'assets/creatures/' + (id || 'mosli') + '.webp';
  }
  function gridSvg(host, g, who) {
    var s = svgEl(host, g.w * 100, g.h * 100, 'st-svg');
    for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++)
      add(s, 'rect', { x: x * 100 + 4, y: y * 100 + 4, width: 92, height: 92, rx: 14, fill: (x + y) % 2 ? '#3f8f4a' : '#4aa154', stroke: 'rgba(11,20,48,.35)', 'stroke-width': 3 });
    var trail = add(s, 'g', { 'class': 'st-trail' });
    (g.stones || []).forEach(function (c) { add(s, 'g', { transform: 'translate(' + (c[0] * 100 + 50) + ' ' + (c[1] * 100 + 52) + ')' }, stoneSvg(78)); });
    add(s, 'g', { 'class': 'st-berry' }, emoSvg('🍓', g.goal[0] * 100 + 50, g.goal[1] * 100 + 50, 62));
    var me = add(s, 'g', { 'class': 'st-me' }, '<circle r="44" fill="rgba(255,255,255,.22)"/><image href="' + esc(fighterUrl(who)) + '" x="-46" y="-50" width="92" height="92"/>');
    var mark = add(s, 'g', { 'class': 'st-bump' });
    function put(x, y) { me.setAttribute('transform', 'translate(' + (x * 100 + 50).toFixed(1) + ' ' + (y * 100 + 50).toFixed(1) + ')'); }
    put(g.start[0], g.start[1]);
    return {
      svg: s, put: put,
      dot: function (x, y) { add(trail, 'circle', { cx: x * 100 + 50, cy: y * 100 + 50, r: 13, fill: '#ffd34d', stroke: '#0b1430', 'stroke-width': 3 }); },
      clear: function () { trail.innerHTML = ''; mark.innerHTML = ''; put(g.start[0], g.start[1]); },
      // where the walk was stopped: a red ring on the stone, or on the edge he walked into
      bump: function (to) {
        var cx = Math.max(-0.35, Math.min(g.w - 0.65, to[0])) * 100 + 50, cy = Math.max(-0.35, Math.min(g.h - 0.65, to[1])) * 100 + 50;
        mark.innerHTML = '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="rgba(255,90,80,.25)" stroke="#ff5a50" stroke-width="9"/><path d="M' + (cx - 20) + ' ' + (cy - 20) + 'l40 40m0 -40l-40 40" stroke="#ff5a50" stroke-width="10" stroke-linecap="round"/>';
      }
    };
  }
  // the walk of a row on a drawn grid, one step at a time; done(result) after it has stopped
  function walkOn(gs, g, row, done) {
    var N = G.Content && G.Content.natur, res = N ? N.walk(g, row) : { ok: false, stop: 'end', path: [g.start], i: 0 };
    var stepT = 0.34, pathLen = res.path.length - 1, bumpT = res.stop === 'stone' || res.stop === 'edge' ? 0.35 : 0, last = -1;
    gs.clear();
    gs.dot(g.start[0], g.start[1]);
    return anim(pathLen * stepT + bumpT + 0.15, function (t) {
      var k = Math.min(pathLen, Math.floor(t / stepT)), u = Math.min(1, (t - k * stepT) / stepT);
      if (k > last) { for (var q = last + 1; q <= k; q++) { gs.dot(res.path[q][0], res.path[q][1]); if (q > 0) sfx('step'); } last = k; }
      if (k < pathLen) { var a = res.path[k], b = res.path[k + 1]; gs.put(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); }
      else if (bumpT && t < pathLen * stepT + bumpT) {
        var at = res.path[pathLen], w = Math.sin(Math.min(1, (t - pathLen * stepT) / bumpT) * Math.PI) * 0.3;
        gs.put(at[0] + (res.to[0] - at[0]) * w, at[1] + (res.to[1] - at[1]) * w);
      } else { var e = res.path[pathLen]; gs.put(e[0], e[1]); }
    }, function () {
      var e = res.path[res.path.length - 1]; gs.put(e[0], e[1]);
      if (res.stop === 'stone' || res.stop === 'edge') { gs.bump(res.to); sfx('locked'); }
      if (done) done(res);
    });
  }

  // Guess, then test (floats or sinks, the ramp). His guess is his answer; the test plays after it, right or wrong,
  // and a tap skips it. In the help after a miss (opts.solution) the test is not played again: he has just seen it.
  function testUI(area, task, api, opts) {
    var ts = task.test || {}, picked = null, sol = null, run = null, helping = opts && opts.solution != null;
    var wrap = el('div', 'nt-wrap nt-' + ts.scene, null, area), btns = [], stage, play, shown;
    if (ts.scene === 'float') {
      stage = el('div', 'nt-stage', null, wrap);
      var tub = tubSvg(svgEl(stage, TUB.w, TUB.h, 'nt-svg'), ts.thing);
      // the thing says its name when tapped (before the test)
      var hit = el('button', 'nt-thingbtn', null, stage);
      hit.type = 'button'; hit.dataset.act = 'thing'; hit.setAttribute('aria-label', (ts.says || [])[0] || '');
      hit.addEventListener('click', function () { if (run) return; sfx('tap'); if (ts.says) say(ts.says[0], { cut: true }); stage.classList.remove('is-talk'); void stage.offsetWidth; stage.classList.add('is-talk'); });
      var side = el('div', 'nt-choices', null, wrap);
      // 0: floats (a ball on the water line), 1: sinks (a ball on the bottom, an arrow down)
      var ICONS = [
        '<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="10" y="58" width="100" height="52" rx="10" fill="#2f7fd8"/><circle cx="60" cy="52" r="20" fill="#ffc93c" stroke="#0b1430" stroke-width="5"/><path d="M10 60q12.5 -8 25 0t25 0t25 0t25 0V100q0 10 -10 10H20q-10 0 -10 -10z" fill="rgba(93,170,255,.6)"/><path d="M14 38q8 -8 16 0M90 38q8 -8 16 0" stroke="#f4f8ff" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
        '<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="10" y="30" width="100" height="80" rx="10" fill="#2f7fd8"/><circle cx="60" cy="88" r="18" fill="#ffc93c" stroke="#0b1430" stroke-width="5"/><path d="M60 34v28m-12 -12l12 13l12 -13" stroke="#f4f8ff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 32q12.5 -8 25 0t25 0t25 0t25 0V100q0 10 -10 10H20q-10 0 -10 -10z" fill="rgba(93,170,255,.45)"/></svg>'
      ];
      ICONS.forEach(function (ic, i) {
        var b = el('button', 'nt-pick', ic, side);
        b.type = 'button'; b.dataset.act = 'guess-' + i; b.setAttribute('aria-label', i ? 'Synker' : 'Flyder');
        b.addEventListener('click', function () { guess(i); });
        btns.push(b);
      });
      var floats = ts.correct === 0;
      shown = function () { tub.rope.style.display = 'none'; tub.at(floats ? TUB.float : TUB.bottom, floats ? 0 : 8); };
      play = function (done) {
        tub.rope.style.display = 'none';
        var splashed = false;
        return anim(FLOAT_T, function (t) {
          if (!splashed && t >= 0.42) { splashed = true; sfx('splash'); stage.classList.add('is-splash'); }
          tub.at(floatY(floats, t), floats ? Math.sin(t * 5) * 4 * Math.exp(-t) : Math.min(8, t * 5));
        }, done);
      };
    } else if (ts.scene === 'magnet') {
      stage = el('div', 'nt-stage', null, wrap);
      var mg = magnetStageSvg(svgEl(stage, TUB.w, TUB.h, 'nt-svg'), ts.thing);
      var mhit = el('button', 'nt-thingbtn', null, stage);
      mhit.type = 'button'; mhit.dataset.act = 'thing'; mhit.setAttribute('aria-label', (ts.says || [])[0] || '');
      mhit.addEventListener('click', function () { if (run) return; sfx('tap'); if (ts.says) say(ts.says[0], { cut: true }); stage.classList.remove('is-talk'); void stage.offsetWidth; stage.classList.add('is-talk'); });
      var mside = el('div', 'nt-choices', null, wrap);
      // 0: pulls (the ball stuck to the magnet), 1: does not pull (the magnet up, the ball down on the floor)
      var MICONS = [
        '<svg viewBox="0 0 120 120" aria-hidden="true"><g transform="translate(60 34) scale(.42)">' + magnetSvg() + '</g><circle cx="60" cy="66" r="15" fill="#ffc93c" stroke="#0b1430" stroke-width="5"/><path d="M22 60q-8 8 0 16M98 60q8 8 0 16" stroke="#f4f8ff" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="14" y="100" width="92" height="9" rx="4" fill="#c98a4b" stroke="#0b1430" stroke-width="3"/></svg>',
        '<svg viewBox="0 0 120 120" aria-hidden="true"><g transform="translate(60 26) scale(.42)">' + magnetSvg() + '</g><circle cx="60" cy="84" r="15" fill="#ffc93c" stroke="#0b1430" stroke-width="5"/><rect x="14" y="100" width="92" height="9" rx="4" fill="#c98a4b" stroke="#0b1430" stroke-width="3"/></svg>'
      ];
      MICONS.forEach(function (ic, i) {
        var b = el('button', 'nt-pick', ic, mside);
        b.type = 'button'; b.dataset.act = 'guess-' + i; b.setAttribute('aria-label', i ? 'Nej' : 'Ja');
        b.addEventListener('click', function () { guess(i); });
        btns.push(b);
      });
      var pulls = ts.correct === 0;
      shown = function () { var e = magnetAt(pulls, MAGNET_T); mg.at(e.my, e.ty, 0); };
      play = function (done) {
        var snapped = false;
        return anim(MAGNET_T, function (t) {
          if (pulls && !snapped && t >= 0.9) { snapped = true; sfx('snap'); }
          var e = magnetAt(pulls, t); mg.at(e.my, e.ty, e.rot);
        }, done);
      };
    } else {
      stage = el('div', 'nt-stage nt-ramps', null, wrap);
      var s = svgEl(stage, 1040, 260, 'nt-svg'), lanes = [0, 1].map(function (i) { return rampLaneSvg(s, i, ts.angles[i], ts.ball); });
      [0, 1].forEach(function (i) {
        // the lane is the button: he taps the ramp whose ball he thinks rolls longest
        var b = el('button', 'nt-lanebtn', null, stage);
        b.type = 'button'; b.dataset.act = 'guess-' + i; b.style.top = (i * 50) + '%';
        b.setAttribute('aria-label', i ? 'Nederst' : 'Øverst');
        b.addEventListener('click', function () { guess(i); });
        btns.push(b);
      });
      var T = Math.max(lanes[0].geo.T, lanes[1].geo.T);
      // the ball that rolled longest glows
      var far = function () { lanes[ts.correct].ball.classList.add('is-far'); };
      shown = function () { lanes.forEach(function (l) { l.at(99); }); far(); };
      play = function (done) {
        return anim(T + 0.2, function (t) { lanes.forEach(function (l) { l.at(t); }); }, function () { far(); if (done) done(); });
      };
    }
    function mark() { btns.forEach(function (b, k) { b.classList.toggle('is-picked', k === picked); b.classList.toggle('is-sol', sol != null && k === sol && picked == null); }); }
    function guess(i) {
      if (api.locked || picked != null) return;
      picked = i; sfx('tap'); mark(); api.gather(1);
      if (helping) { api.submit(i); return; }
      // the test, then his guess is handed in. A tap anywhere on it skips to the end.
      area.closest('.tk').classList.add('is-testing');
      run = play(function () {
        wait(500).then(function () { if (area.closest('.tk')) area.closest('.tk').classList.remove('is-testing'); api.submit(i); });
      });
    }
    wrap.addEventListener('pointerdown', function () { if (run) run.stop(); });
    api.onDestroy(function () { if (run) run.dead(); });
    return {
      solution: function (i) { sol = i; picked = null; mark(); },
      hintEl: function (i) { return btns[i] || btns[0]; },
      // the wild one's answer: its guess picked and the test's end shown as it is
      show: function (i) { picked = i; mark(); shown(); },
      answer: function (i) { if (btns[i]) btns[i].click(); }
    };
  }

  // Light or deep tone: two strings to pluck as often as he likes, and a button beside each to pick it.
  function stringsUI(area, task, api) {
    var sg = task.strings || {}, picked = null, sol = null, rows = [], pks = [];
    var wrap = el('div', 'sg-wrap', null, area);
    (sg.lens || []).forEach(function (len, i) {
      var row = el('div', 'sg-row', null, wrap);
      var str = el('button', 'sg-str', null, row);
      str.type = 'button'; str.dataset.act = 'string-' + i; str.setAttribute('aria-label', 'Streng');
      var d = stringSvg(str, len), wob = null;
      str.addEventListener('click', function () {
        if (G.audio && G.audio.pluck) { try { G.audio.pluck(sg.midi[i]); } catch (e) { /* sound is optional */ } }
        if (wob) wob.dead();
        // the string shakes: a short string faster than a long one
        var f = 9 * Math.pow(2, ((sg.midi[i] || 48) - 48) / 12), mid = 50 + len / 2;
        wob = anim(0.9, function (t) { var a = 14 * Math.exp(-4 * t) * Math.sin(t * f * Math.PI * 2); d.path.setAttribute('d', 'M50 55Q' + mid + ' ' + (55 + a * 2).toFixed(1) + ' ' + d.x1 + ' 55'); });
        str.classList.add('is-heard');
      });
      var pk = el('button', 'btn btn-green btn-round sg-pick', ICON.check, row);
      pk.type = 'button'; pk.dataset.act = 'pick-' + i; pk.setAttribute('aria-label', 'Den her');
      pk.addEventListener('click', function () { if (api.locked) return; picked = i; sfx('tap'); mark(); api.gather(1); api.submit(i); });
      rows.push(row); pks.push(pk);
    });
    function mark() { rows.forEach(function (r, k) { r.classList.toggle('is-picked', k === picked); r.classList.toggle('is-sol', sol != null && k === sol && picked == null); }); }
    return {
      solution: function (i) { sol = i; picked = null; mark(); },
      hintEl: function (i) { return pks[i] || pks[0]; },
      show: function (i) { picked = i; mark(); },
      answer: function (i) { if (pks[i]) pks[i].click(); }
    };
  }

  // Arrow steps: a grid, his Gromonster, a berry, maybe stones. He lays arrows in a row and presses start; any row that
  // walks him to the berry is right. With a row laid already (task.steps.row) one arrow is wrong: he taps it, picks a
  // new way for it, and presses start.
  function stepsUI(area, task, api, opts) {
    var g = task.steps || {}, fix = !!g.row, row = fix ? g.row.slice() : [], sel = -1, sol = null, walking = null, max = g.max || 6;
    var wrap = el('div', 'st-wrap', null, area);
    var board = el('div', 'st-board', null, wrap);
    board.style.setProperty('--w', g.w); board.style.setProperty('--h', g.h);
    var gs = gridSvg(board, g, opts && opts.fighter);
    var side = el('div', 'st-side', null, wrap);
    var slots = el('div', 'st-row', null, side);
    slots.style.setProperty('--n', max);
    var pad = el('div', 'st-pad', null, side), arrows = {};
    ['l', 'u', 'd', 'r'].forEach(function (d) {
      var b = el('button', 'btn st-key', arrowHtml(d), pad);
      b.type = 'button'; b.dataset.act = 'arrow-' + d; b.setAttribute('aria-label', d);
      b.addEventListener('click', function () { press(d); });
      arrows[d] = b;
    });
    var go = el('button', 'btn btn-green btn-round st-go', GO, pad);
    go.type = 'button'; go.dataset.act = 'go'; go.setAttribute('aria-label', 'Start');
    go.addEventListener('click', start);
    function changed() { var n = 0; if (fix) row.forEach(function (d, k) { if (d !== g.row[k]) n++; }); return n; }
    function draw() {
      slots.innerHTML = '';
      for (var k = 0; k < max; k++) (function (k) {
        var has = row[k] != null, ghost = !has && sol && sol[k];
        var b = el('button', 'st-slot' + (has ? ' is-full' : '') + (ghost ? ' is-ghost' : '') + (k === sel ? ' is-sel' : '') +
          (fix && has && row[k] !== g.row[k] ? ' is-new' : '') + (fix && sol && sol[k] !== g.row[k] && k !== sel ? ' is-sol' : ''), has ? arrowHtml(row[k]) : ghost ? arrowHtml(sol[k]) : null, slots);
        b.type = 'button'; b.dataset.act = 'slot-' + k;
        b.addEventListener('click', function () { tapSlot(k); });
      })(k);
      // the next arrow of the help glows on the pad
      var want = !sol ? null : fix ? (sel >= 0 && sol[sel] !== row[sel] ? sol[sel] : null) : (row.length < sol.length && row.every(function (d, k) { return d === sol[k]; }) ? sol[row.length] : null);
      Object.keys(arrows).forEach(function (d) { arrows[d].classList.toggle('is-sol', d === want); arrows[d].classList.toggle('is-off', fix && sel < 0); });
      var ready = fix ? true : row.length > 0;
      go.classList.toggle('is-off', !ready); go.classList.toggle('is-ready', ready && (!fix || changed() === 1));
      api.gather(fix ? (changed() ? 0.5 : 0) : row.length ? 0.5 : 0);   // the glow must not tell how close he is
    }
    function tapSlot(k) {
      if (api.locked || walking) return;
      if (fix) { sel = sel === k ? -1 : k; sfx('pick'); draw(); return; }
      if (row[k] == null) return;
      row.splice(k, 1); sfx('unpick'); gs.clear(); draw();
    }
    function press(d) {
      if (api.locked || walking) return;
      if (fix) {
        if (sel < 0) { sfx('locked'); return; }
        // one arrow may change: a change somewhere else puts the earlier one back
        row = g.row.slice(); row[sel] = d; sfx('pick'); gs.clear(); draw(); return;
      }
      if (row.length >= max) { sfx('locked'); return; }
      row.push(d); sfx('pick'); gs.clear(); draw();
    }
    function start() {
      if (api.locked || walking) return;
      if (!fix && !row.length) { sfx('locked'); return; }
      sfx('tap');
      var mine = row.slice(), hand = fix ? changed() === 1 : true, tk = area.closest('.tk');
      if (hand && tk) tk.classList.add('is-testing');
      walking = walkOn(gs, g, mine, function () {
        wait(hand ? 450 : 150).then(function () {
          walking = null;
          if (tk) tk.classList.remove('is-testing');
          if (hand) api.submit(mine); else draw();
        });
      });
    }
    board.addEventListener('pointerdown', function () { if (walking) walking.stop(); });
    api.onDestroy(function () { if (walking) walking.dead(); });
    draw();
    return {
      solution: function (s) { sol = (s || []).slice(); row = fix ? g.row.slice() : []; sel = -1; gs.clear(); draw(); },
      hintEl: function (s) { var d = (s || [])[0]; return fix ? slots.children[0] : arrows[d] || go; },
      // the wild one's row, laid and walked to its end
      show: function (s) {
        row = (s || []).slice(); sel = -1; draw();
        var N = G.Content && G.Content.natur, res = N ? N.walk(g, row) : null;
        gs.clear(); if (res) { res.path.forEach(function (c) { gs.dot(c[0], c[1]); }); var e = res.path[res.path.length - 1]; gs.put(e[0], e[1]); }
      },
      answer: function (s) {
        s = s || [];
        if (fix) {
          var at = -1; s.forEach(function (d, k) { if (d !== g.row[k]) at = k; });
          if (at >= 0) { tapSlot(at); press(s[at]); }
        } else { row = []; s.forEach(function (d) { press(d); }); }
        start();
      }
    };
  }

  // a still picture of a Natur og teknik game, for the how: the tub after the test, the ramps after the roll, the
  // strings with the right one marked, the grid with the right row walked
  function labVis(box, v, o) {
    if (v.scene === 'float') {
      var tub = tubSvg(svgEl(box, TUB.w, TUB.h, 'nt-svg'), v.thing);
      tub.rope.style.display = 'none'; tub.at(v.floats ? TUB.float : TUB.bottom, v.floats ? 0 : 8);
    } else if (v.scene === 'magnet') {
      var mgs = magnetStageSvg(svgEl(box, TUB.w, TUB.h, 'nt-svg'), v.thing), me = magnetAt(!!v.pulls, MAGNET_T);
      mgs.at(me.my, me.ty, 0);
    } else if (v.scene === 'ramp') {
      var s = svgEl(box, 1040, 260, 'nt-svg');
      var lanes = [0, 1].map(function (i) { return rampLaneSvg(s, i, v.angles[i], v.ball); });
      lanes.forEach(function (l) { l.at(99); });
      var far = v.angles[0] > v.angles[1] ? 0 : 1;
      lanes[far].ball.classList.add('is-far');
    } else if (v.scene === 'strings') {
      var col = el('div', 'sg-wrap is-still', null, box);
      (v.lens || []).forEach(function (len, i) { var r = el('div', 'sg-row' + (i === v.mark ? ' is-sol' : ''), null, col); stringSvg(el('div', 'sg-str', null, r), len); });
    } else if (v.scene === 'grid') {
      var b = el('div', 'st-board', null, box);
      b.style.setProperty('--w', v.w); b.style.setProperty('--h', v.h);
      var gs = gridSvg(b, v, o && o.fighter), N = G.Content && G.Content.natur, res = N ? N.walk(v, v.row || []) : null;
      if (res) { res.path.forEach(function (c) { gs.dot(c[0], c[1]); }); var e = res.path[res.path.length - 1]; gs.put(e[0], e[1]); }
      if (v.row) {
        var r = el('div', 'st-row is-still', null, box);
        v.row.forEach(function (d, k) { el('span', 'st-slot is-full' + (k === v.mark ? ' is-sol' : ''), arrowHtml(d), r); });
      }
    }
  }

  var UIS = { build: buildUI, fill: fillUI, choice: choiceUI, spell: spellUI, breathe: breatheUI, secret: secretUI, match: matchUI, beats: beatsUI, give: giveUI, shapes: shapesUI,
    test: testUI, strings: stringsUI, steps: stepsUI };
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
      built: function () { return root.querySelector('.bd-row') || root.querySelector('.sp-slots') || root.querySelector('.ch-card.is-picked') || root.querySelector('.fl-cells') || root.querySelector('.br-ring') ||
        root.querySelector('.sw-cols') || root.querySelector('.rp-spot') || root.querySelector('.bb-dots') || root.querySelector('.gv-plate') || root.querySelector('.sh-grid') ||
        root.querySelector('.nt-pick.is-picked') || root.querySelector('.nt-stage') || root.querySelector('.sg-row.is-picked') || root.querySelector('.st-row'); },
      hint: function (sol) { try { pointAt(root, ui.hintEl(sol)); } catch (e) { /* the hand is a nicety */ } },
      answer: function (ans) { if (!api.locked) ui.answer(ans); },
      // someone else's answer, filled in and locked: the wild one's attempt that the child judges
      show: function (ans) { try { if (ui.show) ui.show(ans); } catch (e) { console.error('TaskUI.show', e); } api.locked = true; root.classList.add('is-locked', 'is-shown'); clearHand(root); },
      destroy: function () { killers.forEach(function (f) { f(); }); api.locked = true; root.remove(); }
    };
  }

  G.TaskUI = { render: render, visual: visual, isEmoji: isEmoji, pic: picUrl, _picFail: picFail };
})();
