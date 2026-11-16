/* The wild one thinks, step by step (Steve's play notes 4).
   On the wild one's turn its task stays on screen and its thinking is shown on the task itself, one small step at a time:
   a picture lights up, its name is said, its first letter drops into its box; a berry goes onto the plate as it is
   counted; a piece slides into the picture. The question is not read out again: it is on screen.

   G.Think.plan(task) -> { kind, beats: [beat] } is plain data, so the tests can list every kind and its steps in Node.
   A beat:
     name   what the step is, in English, for the tests and the README
     say    the spoken line (a sentence that already has a clip), or null for a step that is only shown
     key    true for the steps that carry the idea: on a later watch only these are spoken
     pace   'count' (one of a row of counts: a short beat) or 'step'
     light  [selector or {sel, i}]: what lights up on the task (inside the task's root)
     show   an answer, often a part of one, filled in on the task (TaskUI's show)
     vis    a picture from the task's own how, drawn in the task's picture box for this step (and its text under it)
     pluck  a string to pluck (light or deep tone)
   The battle runs the beats (src/battle.js, thinkTurn): slow the first time he watches a step of the ladder, faster
   after (G.Think.PACE). Numbers are said only up to 20: those are the counting clips the game has. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};

  // the pace of a watch. first: every step spoken, a pause after each. later: only key steps spoken, short pauses.
  // ms: the pause after a step; min: the least a step takes (with no voice, or a short line)
  var PACE = {
    first: { step: { pause: 750, min: 1300 }, count: { pause: 300, min: 650 }, quiet: { pause: 0, min: 1000 } },
    later: { step: { pause: 160, min: 360 }, count: { pause: 60, min: 230 }, quiet: { pause: 0, min: 360 } }
  };
  var MAX_COUNT = 20;   // the highest number with a counting clip ("1." to "20.")

  function sentences(text) {
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+(?=[^a-zæøåäö])/).filter(Boolean);
  }
  function first(text) { return sentences(text)[0] || null; }
  function last(arr) { return arr && arr.length ? arr[arr.length - 1] : null; }
  function num(n) { n = +n; return isFinite(n) && n >= 1 && n <= MAX_COUNT && Math.round(n) === n ? n + '.' : null; }
  function cap(w) { w = String(w || ''); return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  function chars(w) { return Array.from(String(w || '')); }
  function act(sel, i) { return i == null ? sel : { sel: sel, i: i }; }
  function howSay(h) { return h ? (h.say || h.text || null) : null; }
  // a how step's picture, unless it only says in big type what the voice says anyway
  function howVis(h) {
    if (!h || !h.visual || !h.visual.type) return null;
    return h.visual;
  }
  function B(o) {
    return { name: o.name, say: o.say || null, key: !!o.key, pace: o.pace || 'step', light: o.light || [], show: o.show, vis: o.vis || null, text: o.text || null, pluck: o.pluck };
  }

  /* ---------- the kinds of task, each with its own breakdown ---------- */
  var K = {};

  // secret word: each picture in turn lights up, its name is said, its first letter is said and drops into its box,
  // then the whole word ("Ugle. U." ... "Her er det hemmelige ord. Ske.")
  K.secret = function (t) {
    var sw = t.secret, word = chars(sw.word), names = sw.says || [], out = [];
    word.forEach(function (L, k) {
      out.push(B({ name: 'picture ' + (k + 1) + ': its name, its first letter into box ' + (k + 1), say: [names[k], L + '.'].filter(Boolean).join(' '),
        light: [act('[data-act="pic-' + k + '"]'), act('[data-act="slot-' + k + '"]')], show: word.slice(0, k + 1).join('') }));
    });
    out.push(B({ name: 'the whole word, the chest opens', say: howSay(last(t.how)), key: true, light: [act('.sw-chest')], show: sw.word }));
    return out;
  };

  // rhyme pieces: the picture and its name, each piece and its name, then the rhyme slides in and clicks
  K.match = function (t) {
    var m = t.match, out = [];
    out.push(B({ name: 'the picture and its name', say: (m.says || [])[0], light: [act('[data-act="target"]')] }));
    (m.pieces || []).forEach(function (p, i) {
      if (i === m.correct) return;
      out.push(B({ name: 'a piece that does not rhyme, and its name', say: p.say, pace: 'count', light: [act('[data-act="piece-' + i + '"]')] }));
    });
    out.push(B({ name: 'the piece that rhymes: both words, and it clicks in', say: howSay(last(t.how)), key: true, light: [act('[data-act="piece-' + m.correct + '"]')], show: m.correct }));
    return out;
  };

  // clap the word: the picture's name, one drum beat per syllable counted, then how many
  K.beats = function (t) {
    var b = t.beats, out = [];
    out.push(B({ name: 'the picture and its name', say: (b.says || [])[0], light: [act('[data-act="pic"]')] }));
    for (var k = 1; k <= b.n; k++) out.push(B({ name: 'beat ' + k + ' on the drum', say: num(k), pace: 'count', light: [act('[data-act="drum"]')], show: k }));
    out.push(B({ name: 'how many beats', say: howSay(last(t.how)), key: true, show: b.n }));
    return out;
  };

  // give exactly that many: one berry at a time onto the plate, counted, then stop
  K.give = function (t) {
    var g = t.give, out = [];
    for (var k = 1; k <= g.n; k++) out.push(B({ name: 'berry ' + k + ' onto the plate', say: num(k), pace: 'count', light: [act('.gv-heap .gv-berry', k - 1)], show: k }));
    out.push(B({ name: 'stop at the number', say: howSay(last(t.how)), key: true, light: [act('.gv-plate')], show: g.n }));
    return out;
  };

  // find the shape: what the shape looks like, then each one ringed and counted, then all of them
  K.shapes = function (t) {
    var sh = t.shapes, want = [], out = [];
    (sh.items || []).forEach(function (x, i) { if (x.s === sh.want) want.push(i); });
    out.push(B({ name: 'what the shape looks like', say: howSay(t.how[1] || t.how[0]) }));
    want.forEach(function (i, k) { out.push(B({ name: 'shape ' + (k + 1) + ' found', say: num(k + 1), pace: 'count', light: [act('[data-act="shape-' + i + '"]')], show: want.slice(0, k + 1) })); });
    out.push(B({ name: 'all of them', say: howSay(t.how[0]), key: true, show: want }));
    return out;
  };

  // light the stars / colour a fraction: (a fraction: count its parts first) one cell at a time, counted
  K.fill = function (t) {
    var f = t.fill, out = [], frac = f.shape === 'pie' || f.shape === 'bar' || (t.visual && t.visual.type === 'frac');
    if (frac) out.push(B({ name: 'the equal parts', say: howSay(t.how[0]), vis: howVis(t.how[0]), text: t.how[0] && t.how[0].text }));
    for (var k = 1; k <= f.need; k++) out.push(B({ name: 'cell ' + k + (frac ? ' coloured' : ' lit'), say: num(k), pace: 'count', light: [act('[data-act="cell-' + (k - 1) + '"]')], show: k }));
    out.push(B({ name: 'stop at the number', say: howSay(last(t.how)), key: true, show: f.need }));
    return out;
  };

  // spelling: the picture's name, each letter said as it drops into its box, then the word
  K.spell = function (t) {
    var word = chars(String(t.spell.word).toUpperCase()), en = !!(t.key && t.key.lang === 'en'), out = [];
    var whole = (en ? '[en] ' : '') + cap(t.spell.word) + '.';
    out.push(B({ name: 'the picture and its name', say: first(t.say), light: [act('.tk-vis')] }));
    word.forEach(function (L, k) { out.push(B({ name: 'letter ' + (k + 1), say: L + '.', pace: 'count', light: [act('[data-act="slot-' + k + '"]')], show: word.slice(0, k + 1).join('') })); });
    out.push(B({ name: 'the whole word', say: whole, key: true, show: word.join('') }));
    return out;
  };

  // orbs and coins: the plan, then one orb at a time into the pot with the sum so far, then the answer
  K.build = function (t, sol) {
    var b = t.build, tiles = b.tiles || [], out = [], sum = 0, product = b.op === 'product';
    // the biggest first, as the how says ("Tag tierne først", "Start med den største mønt"): then the sum so far climbs
    var order = (sol || []).slice();
    // ... unless the how starts with a number that is one of the orbs ("Tag 1. Så mangler du 4."): then that one first
    if (!product) {
      order.sort(function (x, y) { return (+tiles[y].v || 0) - (+tiles[x].v || 0); });
      var m0 = String((t.how[0] && t.how[0].text) || '').match(/\d+/), lead = m0 ? +m0[0] : null;
      var at = lead == null ? -1 : order.findIndex(function (i) { return +tiles[i].v === lead; });
      if (at > 0) order.unshift(order.splice(at, 1)[0]);
    }
    out.push(B({ name: 'the plan', say: howSay(t.how[0]), vis: t.how.length > 1 ? howVis(t.how[0]) : null, text: t.how.length > 1 ? t.how[0].text : null, light: [act('.tk-vis')] }));
    order.forEach(function (i, k) {
      sum += +tiles[i].v || 0;
      out.push(B({ name: product ? 'factor ' + (k + 1) + ' into the pot' : 'orb ' + (k + 1) + ' in, the sum so far', say: num(product ? tiles[i].v : sum), pace: 'count',
        light: [act('.bd-row .orb', k)], show: order.slice(0, k + 1) }));
    });
    var tail = t.how.slice(1);
    tail.forEach(function (h, k) {
      var end = k === tail.length - 1;
      out.push(B({ name: end ? 'the answer' : 'the next part', say: howSay(h), key: end, vis: end ? null : howVis(h), text: end ? null : h.text, show: end ? order : undefined }));
    });
    if (!tail.length) out.push(B({ name: 'the answer', say: null, key: true, show: order }));
    return out;
  };

  // guess, then test: the thing (or each ramp) is looked at, then its guess and the test's end
  K.test = function (t) {
    var ts = t.test, out = [];
    if (ts.scene === 'float' || ts.scene === 'magnet') {
      out.push(B({ name: 'the thing and its name', say: (ts.says || [])[0], light: [act('[data-act="thing"]'), act('.nt-stage')] }));
      out.push(B({ name: 'its guess', say: null, pace: 'quiet', light: [act('[data-act="guess-' + ts.correct + '"]')] }));
    } else {
      out.push(B({ name: 'the top ramp', say: null, pace: 'quiet', light: [act('[data-act="guess-0"]')] }));
      out.push(B({ name: 'the bottom ramp', say: null, pace: 'quiet', light: [act('[data-act="guess-1"]')] }));
    }
    out.push(B({ name: 'what the test shows', say: howSay(t.how[0]), key: true, show: ts.correct }));
    return out;
  };

  // light or deep tone: each string plucked, then the one it picks
  K.strings = function (t) {
    var s = t.strings, out = [];
    (s.lens || []).forEach(function (len, i) { out.push(B({ name: 'string ' + (i + 1) + ' plucked', say: null, pace: 'quiet', light: [act('[data-act="string-' + i + '"]')], pluck: i })); });
    out.push(B({ name: 'the string it picks', say: howSay(t.how[0]), key: true, light: [act('[data-act="string-' + s.correct + '"]')], pluck: s.correct, show: s.correct }));
    return out;
  };

  // arrow steps: one arrow at a time, the Gromonster walks it, counted; a laid row: walk it, find the wrong arrow, mend it
  K.steps = function (t, sol) {
    var g = t.steps, out = [], row = (sol || []).slice();
    if (g.row) {
      var bad = -1;
      row.forEach(function (d, k) { if (d !== g.row[k]) bad = k; });
      out.push(B({ name: 'the laid row walked', say: null, pace: 'quiet', light: [act('.st-row')], show: g.row.slice() }));
      out.push(B({ name: 'the wrong arrow', say: howSay(t.how[0]), light: bad >= 0 ? [act('[data-act="slot-' + bad + '"]')] : [] }));
      out.push(B({ name: 'mended and walked to the berry', say: null, key: true, pace: 'quiet', light: [act('.st-berry')], show: row }));
      return out;
    }
    row.forEach(function (d, k) { out.push(B({ name: 'arrow ' + (k + 1) + ' laid and walked', say: num(k + 1), pace: 'count', light: [act('[data-act="slot-' + k + '"]')], show: row.slice(0, k + 1) })); });
    out.push(B({ name: 'at the berry', say: howSay(t.how[0]), key: true, light: [act('.st-berry')], show: row }));
    return out;
  };

  /* ---------- choice tasks: by what the question shows ---------- */
  // the smallest repeating unit of a pattern (the gap counts as anything)
  function period(items) {
    for (var p = 1; p <= items.length / 2; p++) {
      var ok = true;
      for (var i = p; i < items.length && ok; i++) {
        var a = String(items[i]), b = String(items[i % p]);
        if (a !== '?' && b !== '?' && a !== b) ok = false;
        if (String(items[i - p]) !== '?' && a !== '?' && a !== String(items[i - p])) ok = false;
      }
      if (ok && items.slice(0, p).every(function (x) { return String(x) !== '?'; })) return p;
    }
    return 0;
  }
  function optionScan(t, out, sayNames) {
    (t.choice.options || []).forEach(function (o, i) {
      if (i === t.choice.correct && !sayNames) return;
      out.push(B({ name: 'choice ' + (i + 1) + ' looked at', say: sayNames ? (o.say || null) : null, pace: sayNames && o.say ? 'step' : 'count', light: [act('[data-act="opt-' + i + '"]')] }));
    });
  }
  // the how of the task, step by step, its pictures drawn where the question's picture is; the last one picks the answer
  function howBeats(t, out) {
    var hs = t.how || [];
    hs.forEach(function (h, k) {
      var end = k === hs.length - 1;
      out.push(B({ name: end ? 'the answer: ' + (h.text || '').slice(0, 40) : 'how, part ' + (k + 1) + ': ' + (h.text || '').slice(0, 40), say: howSay(h), key: end,
        vis: end ? null : howVis(h), text: end ? null : h.text, show: end ? t.choice.correct : undefined,
        // with no picture of its own, the choices are what it looks over
        light: end ? [act('[data-act="opt-' + t.choice.correct + '"]')] : t.visual ? [act('.tk-vis')] : (t.choice.options || []).map(function (o, i) { return act('[data-act="opt-' + i + '"]'); }) }));
    });
  }
  K.choice = function (t) {
    var v = t.visual || {}, c = t.choice, out = [], hs = t.how || [], right = '[data-act="opt-' + c.correct + '"]';
    var final = B({ name: 'the answer', say: howSay(last(hs)), key: true, light: [act(right)], show: c.correct });
    // counting what is shown: each thing lights up as it is counted
    if (v.type === 'dots' && (v.n | 0) > 0 && (v.n | 0) <= MAX_COUNT) {
      // a ten-frame whose answer is its empty places ("how many more make 10"), told by the answer, in any language
      var gapN = (Math.ceil((v.n | 0) / 10) * 10) - (v.n | 0), rightLabel = String(((c.options || [])[c.correct] || {}).label);
      if (v.frame && gapN > 0 && rightLabel === String(gapN)) {
        // the empty places of a ten-frame, counted
        var empty = (Math.ceil((v.n | 0) / 10) * 10) - (v.n | 0);
        out.push(B({ name: 'the full places', say: howSay(hs[0]), light: [act('.tk-vis')] }));
        for (var e = 0; e < empty; e++) out.push(B({ name: 'empty place ' + (e + 1) + ' counted', say: num(e + 1), pace: 'count', light: [act('.tk-vis .vd-off', e)] }));
      } else {
        for (var k = 0; k < (v.n | 0); k++) out.push(B({ name: 'thing ' + (k + 1) + ' counted', say: num(k + 1), pace: 'count', light: [act('.tk-vis .vd-on', k)] }));
      }
      out.push(final);
      return out;
    }
    if (v.type === 'tally' && (v.n | 0) > 0) {
      for (var q = 0; q < (v.n | 0); q++) out.push(B({ name: 'stroke ' + (q + 1) + ' counted', say: num(q + 1), pace: 'count', light: [act('.tk-vis line', q)] }));
      out.push(final);
      return out;
    }
    if (v.type === 'hear') {
      out.push(B({ name: 'the number heard', say: num(v.n), light: [act('.tk-vis')] }));
      optionScan(t, out, false);
      out.push(final);
      return out;
    }
    // a pattern: what repeats lights up, one round at a time, then the gap
    if (v.type === 'seq' && Array.isArray(v.items)) {
      var items = v.items, gap = items.map(String).indexOf('?'), p = period(items);
      if (p && items.length >= 2 * p) {
        for (var r = 0; r * p < items.length; r++) {
          var group = [];
          for (var j = r * p; j < Math.min(items.length, (r + 1) * p); j++) if (j !== gap) group.push(act('.tk-vis .vs-it', j));
          if (!group.length) continue;
          out.push(B({ name: r ? 'it comes again (round ' + (r + 1) + ')' : 'what repeats', say: r ? null : howSay(hs[0]), pace: r ? 'count' : 'step', light: group }));
        }
        out.push(B({ name: 'the gap', say: null, pace: 'quiet', light: [act('.tk-vis .vs-it', gap)] }));
        final.say = howSay(last(hs));
        out.push(final);
        return out;
      }
      // numbers or growing groups: one item after the other, then the rule, then the answer
      items.forEach(function (it, i) {
        if (String(it) === '?') return;
        out.push(B({ name: 'item ' + (i + 1) + ' looked at', say: i === 0 ? null : null, pace: 'count', light: [act('.tk-vis .vs-it', i)] }));
      });
      howBeats(t, out);
      return out;
    }
    // a grid: the gap's row, then its column, then the answer
    if (v.type === 'grid' && Array.isArray(v.cells)) {
      var size = v.size === 3 ? 3 : 2, at = v.cells.map(String).indexOf('?'), row = Math.floor(at / size), col = at % size, rowEls = [], colEls = [];
      for (var x = 0; x < size; x++) { if (row * size + x !== at) rowEls.push(act('.tk-vis .vg-c', row * size + x)); if (x * size + col !== at) colEls.push(act('.tk-vis .vg-c', x * size + col)); }
      out.push(B({ name: "the gap's row", say: howSay(hs[0]), light: rowEls }));
      out.push(B({ name: "the gap's column", say: null, pace: 'quiet', light: colEls }));
      out.push(final);
      return out;
    }
    // a clock: the long hand, then the short hand and the time
    if (v.type === 'clock') {
      out.push(B({ name: 'the long hand', say: howSay(hs[0]), light: [act('.tk-vis .vc-m')] }));
      out.push(B({ name: 'the short hand, and the time', say: howSay(hs[1] || hs[0]), key: true, light: [act('.tk-vis .vc-h'), act(right)], show: c.correct }));
      return out;
    }
    // a picture or a word he looks at (a name to hear, an English word, an animal): look, compare the choices, answer
    if (hs.length < 2) {
      var look = v.say || (v.type === 'emoji' || v.type === 'big' ? (/^\[en\]/.test(howSay(hs[0]) || '') && v.type === 'big' ? first(howSay(hs[0])) : null) : null);
      // a word he only hears is not said again here (it is the question); its answer says it
      if (!look && t.visual) look = sentences(t.say).length > 1 ? first(t.say) : null;   // "Snemand. Hvilket ..." -> "Snemand."
      out.push(B({ name: t.visual ? 'the picture (and its name)' : 'the word it heard', say: look, pace: look ? 'step' : 'quiet', light: [act(t.visual ? '.tk-vis' : '.bt-speak')] }));
      optionScan(t, out, !!c.speak);
      out.push(final);
      return out;
    }
    // everything else (sums, scales, machines, number lines, riddles): its how, step by step, on the task
    if (t.visual && v.type !== 'big' && sentences(t.say).length > 1 && /^[A-ZÆØÅ][a-zæøå]+\.$/.test(first(t.say))) out.push(B({ name: 'the picture and its name', say: first(t.say), light: [act('.tk-vis')] }));
    howBeats(t, out);
    return out;
  };

  // the question is on screen and is not read out again: a sentence of the task's own question is left out of a step
  // (a picture's name alone, "Kat.", may still be said as the step that looks at it)
  function withoutQuestion(task, text) {
    if (!text) return null;
    var q = sentences(task.say).filter(function (s) { return s.split(' ').length > 2; });
    var keep = sentences(text).filter(function (s) { return q.indexOf(s) < 0; });
    return keep.length ? keep.join(' ') : null;
  }
  function plan(task, sol) {
    if (!task || !K[task.ui]) return { kind: task ? task.ui : null, beats: [] };
    var beats = [];
    try { beats = K[task.ui](task, sol) || []; } catch (e) { if (typeof console !== 'undefined') console.error('Think.plan', task && task.id, e); beats = []; }
    beats.forEach(function (b) { b.say = withoutQuestion(task, b.say); });
    // a beat with nothing to say is shown, never spoken; a kind always ends with its answer on the task
    return { kind: task.ui + (task.visual && task.visual.type ? ':' + task.visual.type : ''), beats: beats };
  }
  G.Think = { plan: plan, PACE: PACE, MAX_COUNT: MAX_COUNT, period: period };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.Think;
})();
