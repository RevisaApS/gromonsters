/* BRAIN: the learning engine. Picks every task, places the child, checks answers, verifies content.
   Pure logic, no DOM. Runs in the browser (G.Brain) and in Node (module.exports). SPEC.md section 9. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    ['tal', 'ord', 'engelsk', 'logik', 'natur', 'hjerte'].forEach(function (p) {
      if (!(G.Content && G.Content[p])) { try { require('./content/' + p + '.js'); } catch (e) { /* loaded by the page instead */ } }
    });
  }

  var LANGS = ['da', 'sv', 'no', 'en'];
  // The topics, in the order every screen shows them. This is the one list: the battle, setup, the parent page, the
  // tests and the voice tools all read it (G.Brain.POWERS). A topic may exist only in some game languages (TOPIC_LANGS),
  // and a step may too (step.langs): English is a topic of its own in a Danish game, while an English game keeps its
  // own Ord steps (opposites, longer words, sound-alike words) under the same ids as before.
  // Natur og teknik (slice 5) is, like Engelsk, a topic of the Danish game only.
  var HARD = ['tal', 'ord', 'logik', 'engelsk', 'natur'];
  var TOPIC_LANGS = { engelsk: ['da'], natur: ['da'] };
  var OLDER_LAST = { natur: 1 };   // topics whose older children start on the last step (startIndex)
  var PLACE = 12;         // placement answers per power (placement also ends when the child reaches his own class)
  var EASY = 2;           // the first times a step is met, its numbers come from the easy half of its range
  var INTRO = 2;          // a task's rule sentence (task.intro) is spoken only the first times its step is met
  var SURE = 0.85;        // share of his last ten answers in a topic right on the first try that counts as "he has proved himself"
  var HOT = 8;            // this many first-try rights in a row in a topic: he is under his level, so the next step up is two steps
  var PV = 2;             // placement version: saves made before the gentle start are placed again while still early
  var RECENT = 12;        // ids kept to avoid repeats
  var REVIEW = 0.2;       // share of tasks from an earlier step
  var TEACH_WEIGHT = 6;   // the wild one's task: a topic he misses half the time comes up about twice as often as one he misses a tenth of the time
  var TEACH_MISSED = 0.4; // ... and this share of its tasks is a step he missed lately, when there is one; the rest is the step above his own
  var TOPICS = ['feel', 'help', 'breathe', 'grit', 'team'];
  // lab: a still picture of a Natur og teknik game (slice 5), for its how: the tub, the ramps, the strings or the grid
  var VISUALS = ['big', 'emoji', 'dots', 'clock', 'frac', 'seq', 'grid', 'balance', 'machine', 'line', 'scene', 'tally', 'hear', 'shapes', 'lab'];
  // secret, match, beats, give and shapes are the class 0 pack (slice 4): picked letters, a dragged piece, drum beats,
  // berries on a plate and tapped shapes
  // test, strings and steps are Natur og teknik (slice 5): guess then test, two strings to pluck, arrow steps on a grid
  var UIS = ['build', 'fill', 'choice', 'spell', 'breathe', 'secret', 'match', 'beats', 'give', 'shapes', 'test', 'strings', 'steps'];
  var PACK4 = { tal: ['t36', 't37', 't38'], ord: ['o14', 'o15', 'o16'] };   // the class 0 pack's steps, for migrate4
  // the class 0 games a new class 0 player visits early (introVisits), in the order he visits them: the slice 4 pack,
  // and Natur og teknik's arrow steps before the legs (the wild one's own turn tends to show the legs, the step above n01)
  var MEET0 = { tal: PACK4.tal, ord: PACK4.ord, natur: ['n06', 'n04'] };

  function content() { return G.Content || {}; }
  function fullLadder(power) { var c = content()[power]; return c && c.steps ? c.steps : []; }
  function forLang(o, L) { return !o || !o.langs || o.langs.indexOf(L) >= 0; }
  // the steps of a topic in a game language (a topic that does not exist in that language has none)
  function ladder(power, L) {
    if (TOPIC_LANGS[power] && TOPIC_LANGS[power].indexOf(L) < 0) return [];
    return fullLadder(power).filter(function (s) { return forLang(s, L); });
  }
  // the topics that exist in a game language
  function topicsFor(L) { return HARD.filter(function (p) { return ladder(p, L).length > 0; }); }
  // A step id's place in the ladder of a language. A step that is not in it (a step moved to another topic, or one that
  // belongs to the other language) lands on the last step of the ladder that comes before it in the full ladder.
  function resolve(power, sid, L) {
    var steps = ladder(power, L), full = fullLadder(power);
    if (!steps.length) return -1;   // the topic does not exist in this language: its step waits as it is
    for (var i = 0; i < steps.length; i++) if (steps[i].id === sid) return i;
    var at = full.map(function (s) { return s.id; }).indexOf(sid);
    if (at < 0) return -1;
    var best = 0;
    for (var k = 0; k < steps.length; k++) if (full.indexOf(steps[k]) < at) best = k;
    return best;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ---------- seedable random (mulberry32); the state is saved so a reload continues the same stream ---------- */
  function Rng(seed) { this.s = (seed >>> 0) || 1; }
  Rng.prototype.next = function () {
    var t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- number formatting and speech, shared with the content files through U ---------- */
  function fmtNum(n, L) {
    var x = Math.round(n * 100) / 100;
    var s = String(Math.abs(x));
    if (L !== 'en') s = s.replace('.', ',');
    return (x < 0 ? '−' : '') + s;
  }
  var SP = {
    da: { plus: 'plus', minus: 'minus', times: 'gange', div: 'delt med', eq: 'er', blank: 'hvad', pct: 'procent', deg: 'grader', of: 'af' },
    sv: { plus: 'plus', minus: 'minus', times: 'gånger', div: 'delat med', eq: 'är', blank: 'vad', pct: 'procent', deg: 'grader', of: 'av' },
    no: { plus: 'pluss', minus: 'minus', times: 'ganger', div: 'delt på', eq: 'er', blank: 'hva', pct: 'prosent', deg: 'grader', of: 'av' },
    en: { plus: 'plus', minus: 'minus', times: 'times', div: 'divided by', eq: 'is', blank: 'what', pct: 'percent', deg: 'degrees', of: 'of' }
  };
  var FR = {
    da: { 2: ['halv', 'halve'], 3: ['tredjedel', 'tredjedele'], 4: ['fjerdedel', 'fjerdedele'], 5: ['femtedel', 'femtedele'], 6: ['sjettedel', 'sjettedele'], 8: ['ottendedel', 'ottendedele'], 10: ['tiendedel', 'tiendedele'], 12: ['tolvtedel', 'tolvtedele'] },
    sv: { 2: ['halv', 'halvor'], 3: ['tredjedel', 'tredjedelar'], 4: ['fjärdedel', 'fjärdedelar'], 5: ['femtedel', 'femtedelar'], 6: ['sjättedel', 'sjättedelar'], 8: ['åttondel', 'åttondelar'], 10: ['tiondel', 'tiondelar'], 12: ['tolftedel', 'tolftedelar'] },
    no: { 2: ['halv', 'halve'], 3: ['tredjedel', 'tredjedeler'], 4: ['firedel', 'firedeler'], 5: ['femtedel', 'femtedeler'], 6: ['sjettedel', 'sjettedeler'], 8: ['åttendedel', 'åttendedeler'], 10: ['tidel', 'tideler'], 12: ['tolvtedel', 'tolvtedeler'] },
    en: { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 8: ['eighth', 'eighths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'] }
  };
  // Turn maths symbols into words the speech voice reads well.
  var KR = { da: 'kroner', sv: 'kronor', no: 'kroner', en: 'kroner' };
  function speak(text, L) {
    var w = SP[L] || SP.en, fr = FR[L] || FR.en;
    var s = String(text);
    s = s.replace(/ \/ /g, ' ' + w.div + ' ');
    s = s.replace(/(\d+)\/(\d+)/g, function (m, n, d) {
      var f = fr[d];
      if (!f) return n + ' ' + w.div + ' ' + d;
      if (n === '1') return (L === 'da' ? 'en ' : '1 ') + f[0];   // "en halv", "en fjerdedel"
      return n + ' ' + f[1];
    });
    s = s.replace(/(\d) kr\b/g, '$1 ' + (KR[L] || KR.en));
    s = s.replace(/▢\/(\d+)/g, function (m, d) { var f = fr[d]; return w.blank + ' ' + (f ? f[1] : w.div + ' ' + d); });
    s = s.replace(/ × /g, ' ' + w.times + ' ').replace(/ [:÷] /g, ' ' + w.div + ' ');
    s = s.replace(/ \+ /g, ' ' + w.plus + ' ').replace(/ [−-] /g, ' ' + w.minus + ' ');
    s = s.replace(/−(\d)/g, w.minus + ' $1');
    s = s.replace(/ = /g, ' ' + w.eq + ' ').replace(/▢/g, w.blank);
    s = s.replace(/ ?°C/g, ' ' + w.deg).replace(/ ?%/g, ' ' + w.pct);
    return s.replace(/\s+/g, ' ').trim();
  }
  function fill(s, v) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; });
  }

  function makeU(rng) {
    var U = {
      r: function () { return rng.next(); },
      int: function (a, b) { return a + Math.floor(rng.next() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(rng.next() * arr.length)]; },
      chance: function (p) { return rng.next() < p; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng.next() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      },
      sample: function (arr, k) { return U.shuffle(arr).slice(0, k); },
      fmt: fmtNum, sp: speak, fill: fill,
      // A choice with the right option first in `opts`; shuffles and records where it went.
      choice: function (right, wrongs, cols) {
        var opts = [right].concat(wrongs);
        var order = U.shuffle(opts.map(function (o, i) { return i; }));
        return { options: order.map(function (i) { return opts[i]; }), correct: order.indexOf(0), cols: cols || opts.length };
      },
      // Number options: the answer plus plausible wrong ones taken in order from `cands`, then near fallbacks.
      numChoice: function (ans, cands, L, n, o) {
        o = o || {};
        n = n || 3;
        var min = o.min != null ? o.min : 0, max = o.max != null ? o.max : Infinity, unit = o.unit || '';
        var key = function (x) { return Math.round(x * 1000); };
        var seen = {}; seen[key(ans)] = 1;
        var wr = [];
        var add = function (x) {
          if (wr.length >= n - 1 || typeof x !== 'number' || !isFinite(x) || x < min || x > max) return;
          if (Number.isInteger(ans) && !(o.step < 1) && !Number.isInteger(x)) return;
          if (seen[key(x)]) return;
          seen[key(x)] = 1; wr.push(x);
        };
        // the first candidate is the most telling mistake, so it is always offered; the rest are mixed
        if (cands.length) add(cands[0]);
        U.shuffle(cands.slice(1)).forEach(add);
        var step = o.step || 1;
        [1, -1, 2, -2, 3, -3, 4, 5, -4, -5, 10, -10].forEach(function (k) { add(ans + k * step); });
        var lab = function (x) { return { label: fmtNum(x, L) + unit }; };
        return U.choice(lab(ans), wr.map(lab), n);
      }
    };
    return U;
  }

  /* ---------- the brain ---------- */
  /* Start and placement (SPEC-2.md section 7).
     Start: the first step of the class two school years under the child's (class 0 and 1: the very first step).
     Placement runs for the first PLACE answers in a power. While the child is right on the first try, every answer
     jumps `j` steps up below his own class (sized so a strong child reaches it in about 4 answers) and one step up
     from there, as far as the end of the class above his own. The first miss steps down one and slows the climb:
     from then on it takes two first-try rights in a row to go one step up. Then the steady rule (4 of the last 5
     right) aims at about 80% first-try success. */
  function firstOfGrade(steps, g) {
    for (var i = 0; i < steps.length; i++) if (steps[i].grade >= g) return i;
    return steps.length - 1;
  }
  function startIndex(power, grade, L) {
    var steps = ladder(power, L);
    if (!steps.length || grade <= 1) return 0;
    // Natur og teknik stops at class 2 for now (slice-5.md): an older child lands on its last step
    if (OLDER_LAST[power] && grade > steps[steps.length - 1].grade) return steps.length - 1;
    var g = grade - 2, i = firstOfGrade(steps, g);
    while (i > 0 && steps[i].grade > g) i--;   // never start above class - 2, even if that class has no steps
    return i;
  }
  function targetIndex(power, grade, L) { var steps = ladder(power, L); return steps.length ? firstOfGrade(steps, grade) : 0; }
  // the highest step placement may reach: the last step of the class above his own
  function ceilingIndex(power, grade, L) {
    var steps = ladder(power, L), i = steps.length - 1;
    while (i > 0 && steps[i].grade > grade + 1) i--;
    return Math.max(0, i);
  }
  function jumpFor(power, grade, L) { return Math.max(1, Math.ceil((targetIndex(power, grade, L) - startIndex(power, grade, L)) / 4)); }
  // The ladders as they were before step ids were saved (build 16ba584 / 9e22735): plain id order.
  function ids(ch, n) { var o = []; for (var i = 1; i <= n; i++) o.push(ch + (i < 10 ? '0' : '') + i); return o; }
  var LEGACY = { tal: ids('t', 33), ord: ids('o', 13), logik: ids('l', 14) };
  function sidOf(power, si, L) { var s = ladder(power, L)[si]; return s ? s.id : null; }
  function freshPower(power, grade, L) {
    var si = startIndex(power, grade, L);
    return { si: si, sid: sidOf(power, si, L), pl: 0, run: 0, j: jumpFor(power, grade, L), m: 0, h: {}, d: {}, pr: [], a: 0, ft: [], fx: 0, c: {} };
  }
  function replace(P, power, grade, L) {
    P.si = startIndex(power, grade, L); P.sid = sidOf(power, P.si, L);
    P.pl = 0; P.run = 0; P.m = 0; P.j = jumpFor(power, grade, L);
  }
  // the class a power is placed from: the parent's own pick for that topic (st.pg), or the child's class
  function gradeOf(st, power) { return st.pg && st.pg[power] != null ? st.pg[power] : st.grade; }
  function fresh(opts) {
    var grade = clamp(opts.grade | 0, 0, 5);
    var seed = opts.seed != null ? opts.seed : (Date.now() ^ Math.floor(Math.random() * 1e9));
    var lang = LANGS.indexOf(opts.lang) >= 0 ? opts.lang : 'da';
    var st = { v: 1, pv: PV, s4: 1, rng: seed >>> 0, n: 0, grade: grade, lang: lang, p: {}, off: [], cb: [], rc: [], hj: { m: 0, t: {}, rc: [] } };
    HARD.forEach(function (p) { st.p[p] = freshPower(p, grade, lang); });
    TOPICS.forEach(function (t) { st.hj.t[t] = 0; });
    // A new class 0 player meets each game of the class 0 pack early (slice 4, pass mark point 1): one visit to each
    // pack step above his start, spread over his first battles. A visit does not move his level; a step he has
    // already reached by then is not visited again (dueComeback).
    if (grade === 0) Object.keys(MEET0).forEach(function (p) { meetEarly(st, p, lang); });
    return st;
  }
  // a class 0 player's early visits to the class 0 games of a topic that sit above his start
  function meetEarly(st, p, lang) {
    var steps = ladder(p, lang), si = st.p[p] ? st.p[p].si : 0;
    if (!MEET0[p] || !steps.length) return;
    var ids = steps.map(function (s) { return s.id; });
    introVisits(st, p, MEET0[p].filter(function (id) { return ids.indexOf(id) > si; }), 2, 5);
  }
  // one-off visits to steps: comebacks marked intro, served by dueComeback without moving his level
  // (intro 1: a visit ahead, for a new player; intro 2: a visit back, for an old save's games below his step)
  function introVisits(st, p, ids, first, gap, back) {
    st.cb = st.cb || [];
    ids.forEach(function (id, k) { st.cb.push({ p: p, s: id, k: null, id: '', kind: 'sib', at: (st.n || 0) + first + gap * k, intro: back ? 2 : 1 }); });
  }

  // What a question looks like to the child, whatever step it came from: its kind, its instruction, its picture and
  // its right answer. Two tasks with the same signature are the same question.
  function sigOf(t) {
    var a = '';
    if (t.ui === 'spell' && t.spell) a = t.spell.word;
    else if (t.ui === 'build' && t.build) a = t.build.op + t.build.target + ':' + t.build.tiles.map(function (x) { return x.v; }).sort(function (x, y) { return x - y; }).join(',');
    else if (t.ui === 'fill' && t.fill) a = t.fill.need + '/' + t.fill.total;
    else if (t.ui === 'choice' && t.choice) { var o = t.choice.options[t.choice.correct] || {}; a = o.label != null && o.label !== '' ? o.label : o.emoji || JSON.stringify(o.visual || null); }
    else if (t.ui === 'secret' && t.secret) a = t.secret.word;
    else if (t.ui === 'match' && t.match) a = t.match.target + '>' + ((t.match.pieces[t.match.correct] || {}).emoji || '');
    else if (t.ui === 'beats' && t.beats) a = t.beats.emoji + t.beats.n;
    else if (t.ui === 'give' && t.give) a = String(t.give.n);
    // the shapes on show are the question (their places, sizes, turns and colours), and the kind to find
    else if (t.ui === 'shapes' && t.shapes) a = t.shapes.want + ':' + t.shapes.items.map(function (x) { return x.s.charAt(0) + x.z + ',' + x.r + ',' + x.c; }).join(';');
    // Natur og teknik: the thing or the two ramps, the two strings and what is asked, the grid (and a row laid already)
    else if (t.ui === 'test' && t.test) a = t.test.scene + ':' + (t.test.scene === 'ramp' ? t.test.angles.join('-') + ':' + t.test.ball : t.test.thing);
    else if (t.ui === 'strings' && t.strings) a = t.strings.lens.join('-') + ':' + t.strings.ask;
    else if (t.ui === 'steps' && t.steps) { var sg = t.steps; a = sg.w + 'x' + sg.h + ':' + sg.start.join(',') + '>' + sg.goal.join(',') + ':' + sg.stones.map(function (x) { return x.join(','); }).join(';') + ':' + (sg.row ? sg.row.join('') : ''); }
    return t.ui + '|' + (t.ui === 'spell' ? '' : t.prompt) + '|' + JSON.stringify(t.visual || null) + '|' + a;
  }

  // Slice 4 put six class 0 steps in among the class 0 steps of Tal and Ord. A save finds its step by id, so nobody
  // moves: a child past class 0 is not sent back, and what he has proven stays proven. A child still in class 0 has
  // the new games that now sit below his step waiting for him as one-off visits (comebacks marked intro, served by
  // dueComeback like any other, without moving his level and without counting as a miss fixed); the ones above his
  // step he meets on his way up.
  function migrate4(st) {
    Object.keys(PACK4).forEach(function (p) {
      var P = st.p[p], steps = ladder(p, st.lang);
      if (!P || !steps.length || !P.a) return;
      var cur = steps[P.si];
      if (!cur || cur.grade !== 0) return;
      introVisits(st, p, steps.filter(function (s, i) { return i < P.si && PACK4[p].indexOf(s.id) >= 0 && !(P.c && P.c[s.id]); }).map(function (s) { return s.id; }), 1, 2, true);
    });
    st.s4 = 1;
  }

  function create(saved, opts) {
    opts = opts || {};
    var st;
    if (saved && saved.v === 1 && saved.p) {
      st = clone(saved);
      if (opts.lang) st.lang = opts.lang;
      if (LANGS.indexOf(st.lang) < 0) st.lang = 'da';
      if (!Array.isArray(st.off)) st.off = [];
      HARD.forEach(function (p) {
        var P = st.p[p];
        // a topic the save has never had (English, slice 3): placed from the child's class, or the grown-up's pick
        if (!P) {
          st.p[p] = freshPower(p, gradeOf(st, p), st.lang);
          // a class 0 child meets its class 0 games early, as a new player does (Natur og teknik, slice 5)
          if (gradeOf(st, p) === 0) meetEarly(st, p, st.lang);
          return;
        }
        // the ladder may have been reordered since the save: find the step by its id. A save from before step ids
        // were stored holds only an index into the old ladder: read it there first. A step that has moved to another
        // topic lands on the last step before it (resolve).
        var sid = P.sid || (st.pv !== PV && LEGACY[p] ? LEGACY[p][clamp(P.si | 0, 0, LEGACY[p].length - 1)] : null);
        if (sid) { var at = resolve(p, sid, st.lang); if (at >= 0) P.si = at; P.sid = P.sid || sid; }
        if (P.j == null) P.j = jumpFor(p, gradeOf(st, p), st.lang);
        if (P.m == null) P.m = 0;
        if (!P.c) P.c = {};
      });
      // A save from before the gentle start: place again any power still early in its placement.
      if (st.pv !== PV) {
        // Its old comebacks wait until the new placement is done, so the gentle start comes first.
        HARD.forEach(function (p) {
          if (st.p[p].pl >= 8) return;
          replace(st.p[p], p, gradeOf(st, p), st.lang);
          (st.cb || []).forEach(function (c) { if (c.p === p) c.old = 1; });
        });
        st.pv = PV;
      }
      // A parent changed the class: place again from the new grade, keep the history.
      if (opts.grade != null && (opts.grade | 0) !== st.grade) {
        st.grade = clamp(opts.grade | 0, 0, 5);
        st.pg = {};
        HARD.forEach(function (p) { replace(st.p[p], p, st.grade, st.lang); });
      }
      if (opts.seed != null) st.rng = opts.seed >>> 0;
    } else {
      st = fresh(opts);
    }
    // A grown-up picked a starting level for a topic (setup or the parent page): place that topic from it.
    if (opts.levels && typeof opts.levels === 'object') HARD.forEach(function (p) {
      if (opts.levels[p] == null) return;
      var want = clamp(opts.levels[p] | 0, 0, 5);
      if (gradeOf(st, p) === want) return;
      st.pg = st.pg || {}; st.pg[p] = want;
      replace(st.p[p], p, want, st.lang);
    });
    // Topics a grown-up switched off (the parent page). Only topics of this game can be off.
    if (Array.isArray(opts.off)) st.off = opts.off.filter(function (p) { return HARD.indexOf(p) >= 0; });
    function settle() {
      HARD.forEach(function (p) {
        var P = st.p[p], n = ladder(p, st.lang).length;
        if (!n) return;
        // a topic made while it did not exist in the game language (Engelsk in an English game) holds no step yet:
        // now that it exists, place it from its class (the grown-up's pick or the child's), as a new topic is placed
        if (!P.sid && !P.a) { st.p[p] = freshPower(p, gradeOf(st, p), st.lang); if (gradeOf(st, p) === 0) meetEarly(st, p, st.lang); return; }
        P.si = clamp(P.si, 0, n - 1); P.sid = sidOf(p, P.si, st.lang);
      });
      // The switches always show what a battle uses: when every topic of this language is off (a change of game
      // language can do that), they all count as on, and the saved switches say so too.
      var all = topicsFor(st.lang);
      if (all.length && all.every(function (p) { return st.off.indexOf(p) >= 0; })) st.off = st.off.filter(function (p) { return all.indexOf(p) < 0; });
    }
    settle();
    if (saved && saved.v === 1 && saved.p && !st.s4) migrate4(st);
    // the topics a battle may use: those of this game language that are on. At least one is always on: when every
    // topic of the language is off (a switch of game language can do that), all of them count as on.
    function active() {
      var all = topicsFor(st.lang), on = all.filter(function (p) { return st.off.indexOf(p) < 0; });
      return on.length ? on : all;
    }
    function lad(p) { return ladder(p, st.lang); }

    var rng = new Rng(st.rng);
    var U = makeU(rng);

    function stepById(power, id) {
      var steps = lad(power);
      for (var i = 0; i < steps.length; i++) if (steps[i].id === id) return { step: steps[i], index: i };
      return null;
    }
    // the last tasks he met, by id and by what the question looks like (two steps can ask the same thing, like spelling
    // "pære"), so neither comes again soon
    function remember(t) {
      st.rc.push(t.id); if (st.rc.length > RECENT) st.rc.splice(0, st.rc.length - RECENT);
      st.rs = st.rs || [];
      if (t.sig) { st.rs.push(t.sig); if (st.rs.length > RECENT) st.rs.splice(0, st.rs.length - RECENT); }
    }
    function recent(t) { return st.rc.indexOf(t.id) >= 0 || (st.rs || []).indexOf(t.sig) >= 0; }

    // Builds a full Task from a step and its params; null when the params do not fit the language.
    function build(power, step, params) {
      var raw = step.make(params, st.lang, U);
      if (!raw) return null;
      var t = { id: power + '.' + step.id + ':' + step.key(params, st.lang), power: power, step: step.id, grade: step.grade,
        ui: raw.ui, prompt: raw.prompt, say: raw.say, visual: raw.visual || null };
      t[raw.ui] = raw[raw.ui];
      t.how = raw.how;
      if (raw.praise) t.praise = raw.praise;
      if (raw.smartPraise) t.smartPraise = raw.smartPraise;
      t.key = raw.key || null;
      t.k = params;
      if (raw.intro) t.intro = raw.intro;
      t.sig = sigOf(t);
      return t;
    }
    // Easy is a choice of params only: the id comes from the params, so the same content keeps the same id.
    function isEasy(power, step) { var c = st.p[power].c || {}; return (c[step.id] || 0) < EASY; }
    function met(power, step) { var P = st.p[power]; P.c = P.c || {}; P.c[step.id] = Math.min(9, (P.c[step.id] || 0) + 1); }
    function fresh1(power, step, avoidId, easy) {
      var last = null;
      for (var i = 0; i < 30; i++) {
        var params = step.pick(U, st.lang, !!easy);
        var t = params ? build(power, step, params) : null;
        if (!t) continue;
        last = t;
        if (t.id !== avoidId && !recent(t)) return t;
      }
      return last;
    }
    function dueComeback(power, today) {
      for (var i = 0; i < st.cb.length; i++) {
        var c = st.cb[i];
        if (c.p !== power) continue;
        if (c.old && st.p[power].pl < PLACE) continue;   // a comeback from an old save waits for the new placement
        var due = c.kind === 'sib' ? st.n >= c.at : today >= c.day;
        if (!due) continue;
        // a visit ahead waits until he has met his own step of the topic once: his own game first (slice 5)
        if (c.intro === 1) { var own = lad(power)[st.p[power].si]; if (own && !((st.p[power].c || {})[own.id] > 0)) continue; }
        var found = stepById(power, c.s);
        // a visit to a step he has met already is not needed, nor a visit ahead (intro 1) to a step he has reached
        if (!found || (c.intro && ((st.p[power].c || {})[c.s] || 0) > 0) || (c.intro === 1 && found.index <= st.p[power].si)) { st.cb.splice(i, 1); i--; continue; }
        var t = c.kind === 'sib' ? fresh1(power, found.step, c.id, isEasy(power, found.step)) : build(power, found.step, c.k);
        if (!t) { st.cb.splice(i, 1); i--; continue; }
        // a saved miss whose params now build another question (a step's list of things grew or changed since the
        // save, slice 5b) is dropped: a different thing must never count as the miss fixed
        if (c.kind === 'same' && c.id && t.id !== c.id) { st.cb.splice(i, 1); i--; continue; }
        if (recent(t)) continue;    // shown too recently: wait
        st.cb.splice(i, 1);
        if (!c.intro) t.cb = c.kind;
        else {
          // a visit to a new game (introVisits) is not a comeback of a miss; it is his first meeting with it, so the
          // rule is said and the meeting is counted
          if (t.intro && ((st.p[power].c || {})[c.s] || 0) < INTRO) t.say = t.intro + ' ' + t.say;
          met(power, found.step);
        }
        return t;
      }
      return null;
    }

    // how often he misses in a topic, over his last 20 answers there (0 to 1); a topic hardly played yet counts as a quarter
    function missRate(power) {
      var ft = st.p[power].ft || [];
      if (ft.length < 4) return 0.25;
      return 1 - ft.reduce(function (a, b) { return a + b; }, 0) / ft.length;
    }
    // the steps of a topic he has missed lately, the latest miss first: those waiting to come back, then any with a miss in its last five
    function missedSteps(power) {
      var P = st.p[power], out = [];
      function add(id) { if (id && out.indexOf(id) < 0 && stepById(power, id)) out.push(id); }
      for (var i = st.cb.length - 1; i >= 0; i--) if (st.cb[i].p === power && !st.cb[i].intro) add(st.cb[i].s);
      Object.keys(P.h || {}).forEach(function (id) { if ((P.h[id] || []).indexOf(0) >= 0) add(id); });
      return out;
    }

    var brain = {
      // a new game language: every topic finds its step again in that language's ladder (by its id)
      setLang: function (lang) {
        if (LANGS.indexOf(lang) < 0 || lang === st.lang) return;
        st.lang = lang;
        HARD.forEach(function (p) { var P = st.p[p]; if (P && P.sid) { var at = resolve(p, P.sid, lang); if (at >= 0) P.si = at; } });
        settle();
      },
      // The topics a battle may use now: those of this game language that are on (at least one).
      topics: function () { return active(); },
      // Every topic of this game language, with whether it is on and the class it is placed from (the parent page).
      topicList: function () {
        var on = active();
        return topicsFor(st.lang).map(function (p) { return { id: p, on: on.indexOf(p) >= 0, grade: gradeOf(st, p) }; });
      },
      // A grown-up switches a topic on or off. The last topic that is on can not be switched off: returns false then.
      setTopic: function (power, on) {
        if (topicsFor(st.lang).indexOf(power) < 0) return false;
        var off = st.off.filter(function (p) { return p !== power; });
        if (!on) {
          var left = topicsFor(st.lang).filter(function (p) { return p !== power && off.indexOf(p) < 0; });
          if (!left.length) return false;
          off.push(power);
        }
        st.off = off;
        return true;
      },
      next: function (o) {
        o = o || {};
        var power = o.power, today = o.today != null ? o.today : 0;
        if (power === 'hjerte') return brain.heart({ today: today });
        // a topic that is off, or one this game does not have, gives way to one that is on
        var on = active();
        if (on.indexOf(power) < 0) power = on.indexOf('tal') >= 0 && HARD.indexOf(power) < 0 ? 'tal' : U.pick(on);
        var steps = lad(power);
        if (!steps.length) throw new Error('Brain: no content for ' + power);
        var P = st.p[power];
        st.n++;
        var t = dueComeback(power, today);
        if (!t) {
          var si = P.si;
          if (P.pl >= PLACE && si > 0 && U.chance(REVIEW)) si = U.int(Math.max(0, si - 5), si - 1);
          t = fresh1(power, steps[si], null, isEasy(power, steps[si]));
          // the rule of a kind of task is said the first times he meets it, then only the short question
          if (t.intro && ((P.c || {})[steps[si].id] || 0) < INTRO) t.say = t.intro + ' ' + t.say;
          met(power, steps[si]);
        }
        remember(t);
        st.rng = rng.s;
        return t;
      },
      // One step above where he is, from the easy half of that step. Used for the wild one's own tasks and the
      // super hit. It counts nothing: no placement, no step movement, no comeback.
      stretch: function (o) {
        o = o || {};
        var on = active(), power = on.indexOf(o.power) >= 0 ? o.power : U.pick(on), steps = lad(power);
        if (!steps.length) return null;
        var si = Math.min(steps.length - 1, st.p[power].si + 1);
        var t = fresh1(power, steps[si], null, true);
        if (t) { t.stretch = true; remember(t); }
        st.rng = rng.s;
        return t;
      },
      // The wild one's own task. It always gets it right and shows how, so this is where he sees the next thing he will
      // learn and the things he finds hard. The topic is drawn by how often he misses in it; inside the topic it is a
      // step he missed lately (TEACH_MISSED of the time, when there is one) or else the step above his own.
      // It counts nothing: no placement, no step movement, no comeback.
      teach: function (o) {
        o = o || {};
        var powers = active();
        if (!powers.length) return null;
        var weights = powers.map(function (p) { return 1 + TEACH_WEIGHT * missRate(p); });
        var roll = U.r() * weights.reduce(function (a, b) { return a + b; }, 0), power = powers[powers.length - 1];
        for (var i = 0; i < powers.length; i++) { roll -= weights[i]; if (roll < 0) { power = powers[i]; break; } }
        var steps = lad(power), missed = missedSteps(power), step, why;
        if (missed.length && U.chance(TEACH_MISSED)) { step = stepById(power, U.pick(missed.slice(0, 3))).step; why = 'missed'; }
        else {
          // the next thing he will learn: a new game he is about to visit (introVisits), else the step above his own
          var aheads = st.cb.filter(function (c) { return c.p === power && c.intro === 1; }).map(function (c) { return stepById(power, c.s); })
            .filter(function (f) { return f && f.index > st.p[power].si; });
          var ahead = aheads.length ? U.pick(aheads) : null;
          step = ahead ? ahead.step : steps[Math.min(steps.length - 1, st.p[power].si + 1)]; why = 'next';
        }
        var t = fresh1(power, step, null, why === 'next');
        if (t) { t.stretch = true; t.teach = why; remember(t); }
        st.rng = rng.s;
        return t;
      },
      // For the parent page and tests: how the wild one's topics are weighted right now.
      teachWeights: function () {
        var out = {};
        active().forEach(function (p) { out[p] = { missRate: missRate(p), weight: 1 + TEACH_WEIGHT * missRate(p), missed: missedSteps(p) }; });
        return out;
      },
      heart: function (o) {
        var H = content().hjerte;
        if (!H) throw new Error('Brain: no heart content');
        var band = st.grade <= 1 ? 'A' : st.grade <= 3 ? 'B' : 'C';
        var all = H.moments.filter(function (m) { return m.band === band; });
        var fresh = all.filter(function (m) { return st.hj.rc.indexOf(m.id) < 0; });
        if (!fresh.length) fresh = all;
        var min = Infinity;
        fresh.forEach(function (m) { min = Math.min(min, st.hj.t[m.topic] || 0); });
        var pool = fresh.filter(function (m) { return (st.hj.t[m.topic] || 0) === min; });
        var m = U.pick(pool);
        var t = H.make(m, st.lang, U, { name: o && o.name, grade: st.grade });
        st.hj.m++;
        st.hj.t[m.topic] = (st.hj.t[m.topic] || 0) + 1;
        st.hj.rc.push(m.id); if (st.hj.rc.length > 8) st.hj.rc.shift();
        st.rng = rng.s;
        return t;
      },
      check: check,
      record: function (task, res) {
        res = res || {};
        var out = { stepUp: false, stepDown: false, proven: false, comebackFixed: false };
        if (!task || HARD.indexOf(task.power) < 0) return out;
        var P = st.p[task.power], steps = lad(task.power), today = res.today != null ? res.today : 0;
        var ft = !!(res.ok && res.firstTry && !res.helped);
        // A super hit is a task from the step above his own. Right on the first try, it proves he is ready for that step:
        // he moves up to it at once. A miss costs nothing and is not counted.
        if (res.super) {
          var at = stepById(task.power, task.step);
          if (ft && at && at.index === P.si + 1) { P.si = at.index; P.sid = steps[P.si].id; P.h[steps[P.si].id] = [1]; P.run = 0; out.stepUp = true; }
          return out;
        }
        P.a++;
        P.ft.push(ft ? 1 : 0); if (P.ft.length > 20) P.ft.shift();
        var h = P.h[task.step] = P.h[task.step] || [];
        h.push(ft ? 1 : 0); if (h.length > 5) h.shift();
        if (ft) {
          var d = P.d[task.step] = P.d[task.step] || [];
          if (d.indexOf(today) < 0 && d.length < 2) d.push(today);
          if (d.length >= 2 && P.pr.indexOf(task.step) < 0) { P.pr.push(task.step); out.proven = true; }
        }
        if (task.cb && ft) { P.fx++; out.comebackFixed = true; }
        if (!ft) {
          st.cb = st.cb.filter(function (c) { return c.id !== task.id; });
          st.cb.push({ p: task.power, s: task.step, k: task.k, id: task.id, kind: 'sib', at: st.n + 3 });
          st.cb.push({ p: task.power, s: task.step, k: task.k, id: task.id, kind: 'same', day: today + 1 });
          if (st.cb.length > 40) st.cb.splice(0, st.cb.length - 40);
        }
        var cur = steps[P.si], placing = P.pl < PLACE, tgt = targetIndex(task.power, gradeOf(st, task.power), st.lang), cap = ceilingIndex(task.power, gradeOf(st, task.power), st.lang);
        if (cur && task.step === cur.id) {
          var up = 0, down = false;
          if (placing) {
            P.run = ft ? P.run + 1 : 0;
            if (!ft) { down = true; P.m = (P.m || 0) + 1; }
            // fast climb until the first miss: jumps of j below his own class, then one step per right
            else if (!P.m) up = P.si < tgt ? Math.min(P.j || 1, tgt - P.si) : 1;
            else if (P.run >= 2) up = 1;                          // after a miss: two in a row for one step
            up = Math.max(0, Math.min(up, cap - P.si));            // placement never goes past the class above his own
          } else {
            // The steady rule: up after four first-try rights in the last five at this step, down after two misses in the
            // last four. When he has proved himself in the topic (SURE of his last ten answers there right on the first
            // try), three clean answers at a step are enough, and a clean run of HOT means the step is far too easy:
            // two steps up. So a child who finds it easy meets harder tasks quickly, and one at his level is not pushed.
            var last5 = h.slice(-5), last4 = h.slice(-4);
            var rights = last5.reduce(function (a, b) { return a + b; }, 0);
            var misses = last4.filter(function (x) { return !x; }).length;
            var ten = P.ft.slice(-10), sure = ten.length >= 6 && ten.reduce(function (a, b) { return a + b; }, 0) / ten.length >= SURE;
            var row3 = sure && h.length >= 3 && h.every(function (x) { return x; });
            var hot = P.ft.length >= HOT && P.ft.slice(-HOT).every(function (x) { return x; });
            if (row3 || (h.length >= 4 && rights >= 4)) up = hot ? 2 : 1;
            else if (misses >= 2) down = true;
          }
          if (up > 0 && P.si < steps.length - 1) { P.si = Math.min(steps.length - 1, P.si + up); P.h[steps[P.si].id] = []; P.run = 0; out.stepUp = true; }
          else if (down && P.si > 0) { P.si--; P.h[steps[P.si].id] = []; P.run = 0; out.stepDown = true; }
          P.sid = steps[P.si].id;
        }
        if (P.pl < PLACE) P.pl++;
        return out;
      },
      toJSON: function () { st.rng = rng.s; return clone(st); },
      summary: function () {
        var out = {};
        topicsFor(st.lang).forEach(function (p) {
          var P = st.p[p], steps = lad(p), s = steps[P.si] || {};
          out[p] = {
            on: active().indexOf(p) >= 0, startGrade: gradeOf(st, p),
            stepIndex: P.si, stepCount: steps.length, stepId: s.id, stepName: s.name ? s.name[st.lang] : '',
            grade: s.grade, firstTryRate: P.ft.length ? P.ft.reduce(function (a, b) { return a + b; }, 0) / P.ft.length : null,
            answered: P.a, provenSteps: P.pr.length, comebacksFixed: P.fx,
            comebacksWaiting: st.cb.filter(function (c) { return c.p === p && c.kind === 'same'; }).length
          };
        });
        out.hjerte = { moments: st.hj.m, topics: clone(st.hj.t) };
        return out;
      },
      // For tests and the dev page: every step's task, built on demand.
      sample: function (power, stepId, easy) {
        var f = stepById(power, stepId);
        return f ? fresh1(power, f.step, null, !!easy) : null;
      },
      // For the setup screen: what a starting level means. Every kind of task of that class takes its turn: n = 0 is the
      // first kind, n = 1 the next, and so on round. A class with no step of its own shows the step the game aims for.
      example: function (power, grade, n, avoidId) {
        var steps = lad(power); if (!steps.length) return null;
        var g = clamp(grade | 0, 0, 5);
        var kinds = steps.filter(function (s) { return s.grade === g; });
        if (!kinds.length) kinds = [steps[targetIndex(power, g, st.lang)]];
        var at = (((n | 0) % kinds.length) + kinds.length) % kinds.length, step = kinds[at];
        return { stepId: step.id, name: step.name ? step.name[st.lang] : '', grade: step.grade, at: at, kinds: kinds.length, task: fresh1(power, step, avoidId || null, true) };
      },
      get lang() { return st.lang; }
    };
    return brain;
  }

  /* ---------- answer checking ---------- */
  function tileVals(task) { return (task.build.tiles || []).map(function (t) { return t.v; }); }
  function validPicks(ans, n) {
    if (!Array.isArray(ans)) return false;
    var seen = {};
    for (var i = 0; i < ans.length; i++) {
      var k = ans[i];
      if (typeof k !== 'number' || k < 0 || k >= n || (k | 0) !== k || seen[k]) return false;
      seen[k] = 1;
    }
    return true;
  }
  // Subset of tile indices summing to target: fewest tiles (dynamic programming over sums).
  function fewestSubset(vals, target) {
    var best = {}; best[0] = [];
    for (var i = 0; i < vals.length; i++) {
      var keys = Object.keys(best).map(Number).sort(function (a, b) { return b - a; });
      for (var j = 0; j < keys.length; j++) {
        var s = keys[j] + vals[i];
        if (s > target) continue;
        var cand = best[keys[j]].concat(i);
        if (!best[s] || best[s].length > cand.length) best[s] = cand;
      }
    }
    return best[target] || null;
  }
  function subsetWith(vals, target, mustFirst) {
    // Indices that include one tile of value mustFirst (picked first) and sum to target.
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] !== mustFirst) continue;
      var rest = vals.slice(); rest[i] = Infinity;
      var sub = fewestSubset(rest.map(function (v) { return v === Infinity ? 1e9 : v; }), target - mustFirst);
      if (sub) return [i].concat(sub);
    }
    return null;
  }
  /* the arrow games, worked out here by their own route (src/content/natur.js has the walk the screen shows) */
  var STEP_D = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  function stoneAt(sg, x, y) { for (var i = 0; i < sg.stones.length; i++) if (sg.stones[i][0] === x && sg.stones[i][1] === y) return true; return false; }
  // whether a row of arrows takes him to the berry: he must stand on it before the edge or a stone stops him
  function walkTo(sg, row) {
    var x = sg.start[0], y = sg.start[1];
    for (var i = 0; i < row.length; i++) {
      var d = STEP_D[row[i]];
      if (!d) return false;
      x += d[0]; y += d[1];
      if (x < 0 || y < 0 || x >= sg.w || y >= sg.h || stoneAt(sg, x, y)) return false;
      if (x === sg.goal[0] && y === sg.goal[1]) return true;
    }
    return false;
  }
  // every cell's distance to the berry, by a breadth-first search round the stones
  function stepsFrom(sg) {
    var dist = {}, q = [sg.goal];
    dist[sg.goal.join(',')] = 0;
    while (q.length) {
      var c = q.shift();
      Object.keys(STEP_D).forEach(function (k) {
        var n = [c[0] + STEP_D[k][0], c[1] + STEP_D[k][1]], key = n.join(',');
        if (n[0] < 0 || n[1] < 0 || n[0] >= sg.w || n[1] >= sg.h || stoneAt(sg, n[0], n[1]) || key in dist) return;
        dist[key] = dist[c.join(',')] + 1; q.push(n);
      });
    }
    return dist;
  }
  // a right row: the shortest way; with a row laid already, that row with its one wrong arrow turned
  function stepsSolution(sg) {
    if (sg.row) {
      for (var i = 0; i < sg.row.length; i++) for (var k in STEP_D) {
        if (k === sg.row[i]) continue;
        var row = sg.row.slice(); row[i] = k;
        if (walkTo(sg, row)) return row;
      }
      return null;
    }
    var dist = stepsFrom(sg), at = sg.start.slice(), out = [];
    if (!(at.join(',') in dist)) return null;
    while (dist[at.join(',')] > 0) {
      for (var d in STEP_D) {
        var n = [at[0] + STEP_D[d][0], at[1] + STEP_D[d][1]];
        if (dist[n.join(',')] === dist[at.join(',')] - 1) { out.push(d); at = n; break; }
      }
    }
    return out;
  }
  function check(task, answer) {
    var r = { ok: false, smart: false, smartKey: null, solution: null };
    var ui = task.ui;
    if (ui === 'choice') {
      r.solution = task.choice.correct;
      r.ok = answer === task.choice.correct;
    } else if (ui === 'fill') {
      r.solution = task.fill.need;
      r.ok = answer === task.fill.need;
    } else if (ui === 'spell') {
      r.solution = task.spell.word;
      r.ok = typeof answer === 'string' && answer.toLocaleUpperCase() === task.spell.word;
    } else if (ui === 'breathe') {
      r.solution = true;
      r.ok = answer !== false;
    } else if (ui === 'secret') {
      r.solution = task.secret.word;
      r.ok = typeof answer === 'string' && answer.toLocaleUpperCase() === task.secret.word;
    } else if (ui === 'match') {
      r.solution = task.match.correct;
      r.ok = answer === task.match.correct;
    } else if (ui === 'beats') {
      r.solution = task.beats.n;
      r.ok = answer === task.beats.n;
    } else if (ui === 'give') {
      r.solution = task.give.n;
      r.ok = answer === task.give.n;
    } else if (ui === 'shapes') {
      var want = [];
      task.shapes.items.forEach(function (it, k) { if (it.s === task.shapes.want) want.push(k); });
      r.solution = want;
      var got = Array.isArray(answer) ? answer.slice().sort(function (a, c) { return a - c; }) : null;
      r.ok = !!got && got.length === want.length && got.every(function (v, k) { return v === want[k]; });
    } else if (ui === 'test') {
      r.solution = task.test.correct;
      r.ok = answer === task.test.correct;
    } else if (ui === 'strings') {
      r.solution = task.strings.correct;
      r.ok = answer === task.strings.correct;
    } else if (ui === 'steps') {
      // any row of arrows that walks him to the berry is right, not only the shortest; with a row laid already, one
      // arrow of it is changed
      var sg = task.steps;
      r.solution = stepsSolution(sg);
      r.ok = Array.isArray(answer) && answer.length > 0 && answer.length <= sg.max && walkTo(sg, answer) &&
        (!sg.row || (answer.length === sg.row.length && answer.filter(function (d, k) { return d !== sg.row[k]; }).length === 1));
    } else if (ui === 'build') {
      var b = task.build, vals = tileVals(task), sm = task.key && task.key.smart;
      var picks = validPicks(answer, vals.length) ? answer : null;
      if (b.op === 'product') {
        r.ok = !!picks && picks.length === 2 && vals[picks[0]] * vals[picks[1]] === b.target;
        for (var i = 0; i < vals.length && r.solution == null; i++)
          for (var j = i + 1; j < vals.length; j++) if (vals[i] * vals[j] === b.target) { r.solution = [i, j]; break; }
      } else {
        var sum = picks ? picks.reduce(function (a, k) { return a + vals[k]; }, 0) : -1;
        r.ok = !!picks && picks.length > 0 && sum === b.target;
        if (sm && sm.type === 'prefix') {
          r.solution = subsetWith(vals, b.target, sm.v);
          if (r.ok) { var acc = 0; r.smart = picks.some(function (k) { acc += vals[k]; return acc === sm.v; }); }
        } else if (sm && sm.type === 'fewest') {
          r.solution = fewestSubset(vals, b.target);
          if (r.ok && r.solution) r.smart = picks.length === r.solution.length;
        } else if (sm && sm.type === 'set') {
          var want = sm.vals.slice(), sol = [];
          vals.forEach(function (v, k) { var at = want.indexOf(v); if (at >= 0) { want.splice(at, 1); sol.push(k); } });
          r.solution = want.length ? fewestSubset(vals, b.target) : sol;
          if (r.ok) {
            var got = picks.map(function (k) { return vals[k]; }).sort(function (a, c) { return a - c; });
            var exp = sm.vals.slice().sort(function (a, c) { return a - c; });
            r.smart = got.length === exp.length && got.every(function (v, k) { return v === exp[k]; });
          }
        } else {
          r.solution = fewestSubset(vals, b.target);
        }
        if (r.smart) r.smartKey = sm.id;
      }
    }
    if (r.ok && task.praise) r.praise = r.smart && task.smartPraise ? task.smartPraise : task.praise;
    return r;
  }

  /* ---------- verify: an independent second route ---------- */
  // Expression parser for the maths questions: numbers with , or . decimals, + − × x · : ÷ /, % and af/av/of, brackets, ▢.
  function tokenize(s) {
    var out = [], i = 0;
    s = String(s).replace(/−/g, '-').replace(/°C/g, '');
    while (i < s.length) {
      var c = s[i];
      if (c === ' ') { i++; continue; }
      var m = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
      if (m) { out.push({ t: 'n', v: parseFloat(m[0].replace(',', '.')) }); i += m[0].length; continue; }
      var w = /^(af|av|of)\b/.exec(s.slice(i));
      if (w) { out.push({ t: 'op', v: '*' }); i += w[0].length; continue; }
      if (c === '▢') { out.push({ t: 'x' }); i++; continue; }
      if ('+-'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }
      if ('×x·*'.indexOf(c) >= 0) { out.push({ t: 'op', v: '*' }); i++; continue; }
      if (':÷/'.indexOf(c) >= 0) { out.push({ t: 'op', v: '/' }); i++; continue; }
      if (c === '%') { out.push({ t: 'pct' }); i++; continue; }
      if (c === '(' || c === ')' || c === '=') { out.push({ t: c }); i++; continue; }
      throw new Error('bad char ' + c);
    }
    return out;
  }
  function evalTokens(toks, x) {
    var i = 0;
    function peek() { return toks[i]; }
    function atom() {
      var t = toks[i++];
      if (!t) throw new Error('end');
      var v;
      if (t.t === 'n') v = t.v;
      else if (t.t === 'x') v = x;
      else if (t.t === '(') { v = expr(); if (!toks[i] || toks[i].t !== ')') throw new Error('bracket'); i++; }
      else if (t.t === 'op' && t.v === '-') v = -atom();
      else throw new Error('atom');
      while (peek() && peek().t === 'pct') { i++; v = v / 100; }
      return v;
    }
    function term() {
      var v = atom();
      while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
        var op = toks[i++].v, r = atom();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function expr() {
      var v = term();
      while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        var op = toks[i++].v, r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    var v = expr();
    if (i !== toks.length) throw new Error('trailing');
    return v;
  }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }
  // Solves "expr = expr" with one ▢ by search, without knowing how the task was made.
  function solveEq(q) {
    var sides = String(q).split('=');
    if (sides.length !== 2) throw new Error('need one =');
    var L = tokenize(sides[0]), R = tokenize(sides[1]);
    var f = function (x) { return evalTokens(L, x) - evalTokens(R, x); };
    var f0 = f(0), f1 = f(1), f2 = f(2);
    if (isFinite(f0) && isFinite(f1) && isFinite(f2) && near(f2 - f1, f1 - f0) && !near(f1, f0)) {
      var x = -f0 / (f1 - f0);
      return Math.round(x * 1e6) / 1e6;
    }
    var hits = [];
    for (var k = -100; k <= 2000; k++) { var v = f(k); if (isFinite(v) && near(v, 0)) hits.push(k); }
    if (hits.length !== 1) throw new Error('no unique solution');
    return hits[0];
  }
  function parseLabel(s) {
    var t = String(s).replace(/−/g, '-').replace(/\s*(kr|°C)$/, '').trim();
    if (!/^-?\d+(?:[.,]\d+)?$/.test(t)) return NaN;
    return parseFloat(t.replace(',', '.'));
  }
  function exactlyOne(options, correct, test) {
    var hits = [];
    options.forEach(function (o, i) { if (test(o)) hits.push(i); });
    if (hits.length !== 1) return 'expected exactly one right option, found ' + hits.length;
    if (hits[0] !== correct) return 'correct index ' + correct + ' but the right option is ' + hits[0];
    return true;
  }
  function checkVisual(v) {
    if (v == null) return true;
    if (typeof v !== 'object' || VISUALS.indexOf(v.type) < 0) return 'bad visual type ' + (v && v.type);
    var need = { big: ['text'], emoji: ['emoji'], dots: ['n'], clock: ['h', 'm'], frac: ['n', 'd', 'shape'], seq: ['items'], grid: ['size', 'cells'],
      balance: ['rows'], machine: ['pairs', 'ask'], line: ['min', 'max'], scene: ['emoji', 'text'], tally: ['n'], hear: ['n'], shapes: ['items', 'want'], lab: ['scene'] }[v.type];
    for (var i = 0; i < need.length; i++) if (v[need[i]] == null) return 'visual ' + v.type + ' lacks ' + need[i];
    if (v.type === 'grid' && (v.cells.length !== v.size * v.size || [2, 3].indexOf(v.size) < 0)) return 'grid size';
    if (v.type === 'frac' && ['pie', 'bar'].indexOf(v.shape) < 0) return 'frac shape';
    if (v.type === 'clock' && (v.h < 1 || v.h > 12 || v.m < 0 || v.m > 59)) return 'clock range';
    if (v.type === 'big' && String(v.text).length > 40) return 'big text too long';
    if (v.type === 'line' && v.at != null && (v.at < v.min || v.at > v.max)) return 'line marker out of range';
    if (v.type === 'line' && v.hop && (v.hop.from + v.hop.by < v.min || v.hop.from + v.hop.by > v.max)) return 'line hop out of range';
    if (v.type === 'dots' && (v.n < 0 || v.n > 50)) return 'dots range';
    if ((v.type === 'tally' || v.type === 'hear') && (v.n < 1 || v.n > 10 || (v.n | 0) !== v.n)) return v.type + ' range';
    if (v.type === 'lab' && LABS.indexOf(v.scene) < 0) return 'lab scene ' + v.scene;
    if (v.type === 'shapes' && (!Array.isArray(v.items) || !v.items.length || v.items.length > 8 || v.items.some(function (x) { return SHAPES.indexOf(x.s) < 0; }))) return 'shapes items';
    return true;
  }
  var SHAPES = ['circle', 'triangle', 'square'];
  var LABS = ['float', 'magnet', 'ramp', 'strings', 'grid'];
  function strings(task) {
    var out = [task.prompt, task.say];
    if (task.intro) out.push(task.intro);
    var blk = task[task.ui];
    if (blk && Array.isArray(blk.says)) blk.says.forEach(function (s) { out.push(s); });
    if (task.ui === 'match' && task.match.pieces) task.match.pieces.forEach(function (p) { out.push(p.say); });
    (task.how || []).forEach(function (h) { out.push(h.text, h.say); });
    if (task.praise) out.push(task.praise);
    if (task.smartPraise) out.push(task.smartPraise);
    if (task.choice) task.choice.options.forEach(function (o) { if (o.label) out.push(o.label); if (o.say != null) out.push(o.say); });
    if (task.visual && task.visual.text) out.push(task.visual.text);
    if (task.visual && task.visual.caption) out.push(task.visual.caption);
    if (task.visual && task.visual.say) out.push(task.visual.say);
    return out;
  }

  // Rule families for number sequences, used to find the gap independently.
  function fitsSeq(a) {
    var n = a.length, d = [], k;
    for (k = 1; k < n; k++) d.push(a[k] - a[k - 1]);
    var fams = [];
    if (d.every(function (x) { return near(x, d[0]); })) fams.push('diff');
    if (a.every(function (x) { return x !== 0; })) {
      var r = a[1] / a[0];
      if (r !== 1 && a.every(function (x, i) { return i === 0 || near(x, a[i - 1] * r); })) fams.push('ratio');
    }
    if (d.length >= 4 && !near(d[0], d[1]) && d.every(function (x, i) { return near(x, d[i % 2]); })) fams.push('alt');
    if (d.length >= 3) {
      var dd = [];
      for (k = 1; k < d.length; k++) dd.push(d[k] - d[k - 1]);
      if (!near(dd[0], 0) && dd.every(function (x) { return near(x, dd[0]); })) fams.push('second');
    }
    if (n >= 5 && a.every(function (x, i) { return i < 2 || near(x, a[i - 1] + a[i - 2]); })) fams.push('fib');
    return fams;
  }
  function seqGap(items) {
    var gi = items.indexOf('?');
    if (gi < 0) throw new Error('no gap');
    var nums = items.map(function (x) { return x === '?' ? null : parseLabel(x); });
    if (nums.some(function (x, i) { return i !== gi && isNaN(x); })) throw new Error('not numbers');
    var hits = [];
    for (var x = -200; x <= 3000; x++) {
      var a = nums.slice(); a[gi] = x;
      if (fitsSeq(a).length) hits.push(x);
    }
    if (hits.length !== 1) throw new Error('sequence has ' + hits.length + ' fits');
    return hits[0];
  }
  function patternGap(items) {
    var gi = items.indexOf('?'), n = items.length;
    for (var p = 2; p <= n / 2; p++) {
      var ok = true, val = null;
      for (var i = 0; i < n && ok; i++) {
        if (i === gi) continue;
        for (var j = i + p; j < n; j += p) { if (j !== gi && items[j] !== items[i]) { ok = false; break; } }
      }
      if (!ok) continue;
      for (var k = gi % p; k < n; k += p) if (k !== gi) { val = items[k]; break; }
      // the repeating unit must be shown at least twice around the gap
      if (val != null && n >= 2 * p) return val;
    }
    throw new Error('no period');
  }
  function latinGap(size, cells) {
    var syms = [];
    cells.forEach(function (c) { if (c !== '?' && c !== '' && syms.indexOf(c) < 0) syms.push(c); });
    if (syms.length !== size) throw new Error('grid needs ' + size + ' symbols');
    var blanks = [];
    cells.forEach(function (c, i) { if (c === '?' || c === '') blanks.push(i); });
    var gi = cells.indexOf('?'), answers = {};
    var g = cells.slice();
    function okAt(i) {
      var r = Math.floor(i / size), c = i % size;
      for (var k = 0; k < size; k++) {
        var a = r * size + k, b = k * size + c;
        if (a !== i && g[a] === g[i]) return false;
        if (b !== i && g[b] === g[i]) return false;
      }
      return true;
    }
    (function rec(bi) {
      if (bi === blanks.length) { answers[g[gi]] = 1; return; }
      var at = blanks[bi];
      syms.forEach(function (s) { g[at] = s; if (okAt(at)) rec(bi + 1); g[at] = ''; });
    })(0);
    var keys = Object.keys(answers);
    if (keys.length !== 1) throw new Error('grid has ' + keys.length + ' answers');
    return keys[0];
  }
  function balanceSolve(rows, ask) {
    var unknown = [];
    rows.forEach(function (r) { r.left.forEach(function (x) { if (typeof x === 'string' && unknown.indexOf(x) < 0) unknown.push(x); }); });
    if (!unknown.length || unknown.length > 2) throw new Error('balance unknowns');
    var sols = {};
    var vals = {};
    (function rec(k) {
      if (k === unknown.length) {
        var all = rows.every(function (r) {
          return r.left.reduce(function (a, x) { return a + (typeof x === 'number' ? x : vals[x]); }, 0) === r.right;
        });
        if (all) sols[vals[ask]] = 1;
        return;
      }
      for (var v = 1; v <= 40; v++) { vals[unknown[k]] = v; rec(k + 1); }
    })(0);
    var keys = Object.keys(sols);
    if (keys.length !== 1) throw new Error('balance has ' + keys.length + ' answers');
    return Number(keys[0]);
  }
  function machineSolve(pairs, ask) {
    var preds = {};
    for (var a = 1; a <= 10; a++) for (var b = -30; b <= 30; b++) {
      if (pairs.every(function (p) { return p[0] * a + b === p[1]; })) preds[ask * a + b] = 1;
      if (pairs.every(function (p) { return (p[0] + b) * a === p[1]; })) preds[(ask + b) * a] = 1;
    }
    var keys = Object.keys(preds);
    if (keys.length !== 1) throw new Error('machine has ' + keys.length + ' answers');
    return Number(keys[0]);
  }
  function perms(arr) {
    if (arr.length <= 1) return [arr.slice()];
    var out = [];
    arr.forEach(function (x, i) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1));
      perms(rest).forEach(function (p) { out.push([x].concat(p)); });
    });
    return out;
  }
  function riddleSolve(m) {
    var answers = {};
    if (m.kind === 'order') {
      // perm lists names from most to least
      perms(m.names).forEach(function (p) {
        var ok = m.facts.every(function (f) { return p.indexOf(f[0]) < p.indexOf(f[1]); });
        if (ok) answers[m.ask === 'max' ? p[0] : p[p.length - 1]] = 1;
      });
    } else if (m.kind === 'has') {
      perms(m.items).forEach(function (p) {
        // p[i] is the item names[i] has
        var ok = m.facts.every(function (f) { var has = p[m.names.indexOf(f[0])] === f[1]; return f[2] ? has : !has; });
        if (ok) answers[m.names[p.indexOf(m.askItem)]] = 1;
      });
    } else if (m.kind === 'row') {
      perms(m.names).forEach(function (p) {
        var ok = m.facts.every(function (f) {
          if (f[1] === 'before') return p.indexOf(f[0]) < p.indexOf(f[2]);
          if (f[1] === 'last') return p.indexOf(f[0]) === p.length - 1;
          if (f[1] === 'first') return p.indexOf(f[0]) === 0;
          if (f[1] === 'next') return Math.abs(p.indexOf(f[0]) - p.indexOf(f[2])) === 1;
          return false;
        });
        if (ok) answers[m.ask === 'first' ? p[0] : m.ask === 'last' ? p[p.length - 1] : p[1]] = 1;
      });
    }
    var keys = Object.keys(answers);
    if (keys.length !== 1) throw new Error('riddle has ' + keys.length + ' answers');
    return keys[0];
  }
  function lexWord(e, lang) {
    var O = content().ord;
    if (!O) return null;
    for (var i = 0; i < O.lex.length; i++) if (O.lex[i][0] === e) return O.lex[i][1 + LANGS.indexOf(lang)];
    return null;
  }

  // the English word a spoken line says: the first sentence tagged [en] (src/voice.js plays it in the English voice)
  function enSaid(text) {
    var m = /(?:^|[.!?…]\s+)\[en\]\s*([^.!?…]+)[.!?…]/.exec(String(text || ''));
    return m ? m[1].trim().toLowerCase() : null;
  }
  function lexEmojis(word, lang) {
    var O = content().ord, out = [];
    if (!O) return out;
    O.lex.forEach(function (r) { var w = r[1 + LANGS.indexOf(lang)]; if (w && w.toLowerCase() === word) out.push(r[0]); });
    return out;
  }
  // an independent copy of the English numbers and colours (the content file has its own)
  var EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  var EN_COL = { red: '🔴', orange: '🟠', yellow: '🟡', green: '🟢', blue: '🔵', purple: '🟣', black: '⚫', white: '⚪', brown: '🟤' };
  // A spoken line may mark a sentence as English with "[en] " at its start, and nowhere else.
  function badTag(s) {
    var at = String(s).indexOf('[');
    while (at >= 0) {
      if (String(s).slice(at, at + 5) !== '[en] ') return 'bad tag in: ' + s;
      if (at > 0 && !/[.!?…] $/.test(String(s).slice(Math.max(0, at - 2), at))) return 'English tag not at a sentence start: ' + s;
      at = String(s).indexOf('[', at + 1);
    }
    return null;
  }

  function verifySemantic(task) {
    var k = task.key || {}, ch = task.choice, v = task.visual;
    var numOpt = function (want) { return exactlyOne(ch.options, ch.correct, function (o) { return near(parseLabel(o.label), want); }); };
    var labOpt = function (want) { return exactlyOne(ch.options, ch.correct, function (o) { return o.label === want; }); };
    switch (k.type) {
      case 'eq': {
        var x = solveEq(k.q);
        if (v && v.type === 'big' && v.text.indexOf('▢') >= 0) {
          var vq = solveEq(v.text.replace(/ kr/g, ''));
          if (!near(vq, x)) return 'visual and question disagree';
        }
        if (task.ui === 'choice') return numOpt(x);
        if (task.ui === 'build') {
          if (!near(task.build.target, x)) return 'target ' + task.build.target + ' but the question gives ' + x;
          return buildReach(task);
        }
        if (task.ui === 'fill') return near(task.fill.need, x) ? true : 'fill need ' + task.fill.need + ' vs ' + x;
        return 'eq on ' + task.ui;
      }
      case 'fillcount': {
        var n = v.type === 'big' ? parseLabel(v.text) : v.n;
        return task.fill.need === n && n <= task.fill.total ? true : 'fill need ' + task.fill.need + ' vs ' + n;
      }
      case 'count': return numOpt(v.n);
      case 'clock': {
        var want = v.h + ':' + (v.m < 10 ? '0' : '') + v.m;
        return labOpt(want);
      }
      case 'seqnum': return numOpt(seqGap(v.items));
      case 'seqpat': {
        var p = patternGap(v.items);
        return exactlyOne(ch.options, ch.correct, function (o) { return o.emoji === p; });
      }
      case 'grow': {
        var counts = v.items.map(function (it) { return it === '?' ? '?' : String(Array.from(it).filter(function (c) { return c === k.unit; }).length); });
        var g = seqGap(counts);
        return exactlyOne(ch.options, ch.correct, function (o) { return o.visual && o.visual.n === g; });
      }
      case 'grid': {
        var a = latinGap(v.size, v.cells);
        return exactlyOne(ch.options, ch.correct, function (o) { return o.emoji === a; });
      }
      case 'balance': return numOpt(balanceSolve(v.rows, k.ask));
      case 'machine': return numOpt(machineSolve(v.pairs, v.ask));
      case 'odd': {
        var cats = content().logik.cats;
        var cs = ch.options.map(function (o) { return cats[o.emoji]; });
        if (cs.some(function (c) { return !c; })) return 'odd: unknown picture';
        return exactlyOne(ch.options, ch.correct, function (o, i) {
          var mine = cats[o.emoji];
          return cs.filter(function (c) { return c === mine; }).length === 1 && cs.filter(function (c) { return c !== mine; }).every(function (c, j, arr) { return c === arr[0]; });
        });
      }
      case 'riddle': return labOpt(riddleSolve(k.m));
      case 'firstletter': {
        var w = lexWord(v.emoji, k.lang);
        if (!w) return 'word missing for ' + v.emoji;
        return labOpt(w[0].toLocaleUpperCase());
      }
      case 'case': return labOpt(v.text.toLocaleLowerCase());
      case 'spell': {
        var w2 = lexWord(v.emoji, k.lang);
        if (!w2) return 'word missing for ' + v.emoji;
        return w2.toLocaleUpperCase() === task.spell.word ? true : 'spell word ' + task.spell.word + ' vs ' + w2;
      }
      case 'english': {
        var w3 = lexWord(v.emoji, 'en');
        if (!w3) return 'no English word';
        // cards he can hear: each card's speaker says that card's own word, in the English voice
        var badSay = ch.options.filter(function (o) { return o.say != null && enSaid(o.say) !== String(o.label).toLowerCase(); })[0];
        if (badSay) return 'card ' + badSay.label + ' says ' + badSay.say;
        return labOpt(w3);
      }
      case 'enpic': {
        // the English word is the one the voice says, or, when he reads it, the one on the screen
        var we = v && v.type === 'big' ? String(v.text).toLowerCase() : enSaid(task.say);
        if (!we) return 'no English word in the task';
        var pics = lexEmojis(we, 'en');
        if (!pics.length) return 'English word ' + we + ' has no picture';
        return exactlyOne(ch.options, ch.correct, function (o) { return pics.indexOf(o.emoji) >= 0; });
      }
      case 'enword': {
        var wn = enSaid(task.say);
        if (!wn) return 'no English word in the task';
        var num = EN_NUM.indexOf(wn), col = EN_COL[wn];
        if (num < 1 && !col) return 'unknown English word ' + wn;
        return exactlyOne(ch.options, ch.correct, function (o) { return num >= 1 ? parseLabel(o.label) === num : o.emoji === col; });
      }
      case 'rhyme': {
        var O = content().ord, groups = O.rhymes[k.lang];
        var gOf = function (w) { for (var i = 0; i < groups.length; i++) if (groups[i].indexOf(w) >= 0) return i; return -1; };
        var tg = gOf(k.target);
        if (tg < 0) return 'rhyme target unknown';
        if (ch.options.some(function (o) { return gOf(o.label) < 0; })) return 'rhyme option unknown';
        return exactlyOne(ch.options, ch.correct, function (o) { return gOf(o.label) === tg && o.label !== k.target; });
      }
      case 'compound': {
        var list = content().ord.compounds[k.lang];
        var whole = {};
        list.forEach(function (c) { whole[c[0] + c[1]] = 1; });
        return exactlyOne(ch.options, ch.correct, function (o) { return !!whole[k.first + o.label]; });
      }
      case 'opposite': {
        var ops = content().ord.opposites[k.lang];
        var t = v.text;
        var rights = ops.filter(function (o) { return o[0] === t; }).map(function (o) { return o[1]; });
        var also = ops.filter(function (o) { return o[1] === t; }).map(function (o) { return o[0]; });
        if (rights.length !== 1) return 'opposite target ' + t + ' has ' + rights.length + ' answers';
        var bad = ch.options.some(function (o, i) { return i !== ch.correct && also.indexOf(o.label) >= 0; });
        if (bad) return 'a wrong option is also an opposite';
        return labOpt(rights[0]);
      }
      case 'wordclass': {
        var wc = content().ord.classes[k.lang];
        var clsOf = function (w) { for (var c in wc) if (wc[c].indexOf(w) >= 0) return c; return null; };
        if (ch.options.some(function (o) { return !clsOf(o.label); })) return 'word class unknown';
        return exactlyOne(ch.options, ch.correct, function (o) { return clsOf(o.label) === k.cls; });
      }
      case 'sentence': {
        var S = content().ord.sentences[k.set];
        var item = S.filter(function (s) { return s[0] === v.text; })[0];
        if (!item) return 'sentence unknown';
        return labOpt(item[1]);
      }
      case 'heart': return true;
      // the class 0 pack: each answer worked out again from the pictures' names
      case 'beats': {
        var wb = lexWord(task.beats.emoji, k.lang), ob = content().ord;
        if (!wb) return 'beats: word missing';
        var nv = ob.vowels(wb);
        return nv === task.beats.n ? true : 'beats: ' + wb + ' has ' + nv + ' vowels but ' + task.beats.n + ' beats';
      }
      case 'rhymepiece': {
        var groups = content().ord.rhymePics, mt2 = task.match;
        var gOf2 = function (e) { for (var i = 0; i < groups.length; i++) if (groups[i].indexOf(e) >= 0) return i; return -1; };
        var tg2 = gOf2(mt2.target);
        if (tg2 < 0 || mt2.pieces.some(function (p) { return gOf2(p.emoji) < 0; })) return 'rhyme piece unknown';
        var badName = mt2.pieces.filter(function (p) { var w = lexWord(p.emoji, k.lang); return !w || p.say !== w.charAt(0).toLocaleUpperCase() + w.slice(1) + '.'; })[0];
        if (badName) return 'piece says ' + badName.say;
        return exactlyOne(mt2.pieces, mt2.correct, function (p) { return gOf2(p.emoji) === tg2 && p.emoji !== mt2.target; });
      }
      case 'secret': {
        var sw2 = task.secret, tw = lexWord(sw2.target, k.lang);
        if (!tw || tw.toLocaleUpperCase() !== sw2.word) return 'secret word is not the picture: ' + sw2.word;
        for (var q = 0; q < sw2.pics.length; q++) {
          var pw2 = lexWord(sw2.pics[q], k.lang);
          if (!pw2 || pw2.charAt(0).toLocaleUpperCase() !== sw2.word[q]) return 'picture ' + sw2.pics[q] + ' does not start with ' + sw2.word[q];
          if (/^(hj|hv|c|ch|z)/.test(pw2)) return 'picture ' + pw2 + ' has a silent or odd first letter';
        }
        return true;
      }
      case 'samenum': {
        var amt = function (vv) { return !vv ? NaN : vv.type === 'big' ? parseLabel(vv.text) : vv.n; };
        var want2 = amt(v);
        if (!(want2 >= 1 && want2 <= 10)) return 'samenum out of 1 to 10';
        if (v.type === 'hear' && !new RegExp('(^|\\D)' + want2 + '\\.$').test(task.say)) return 'samenum: the number is not spoken';
        var forms = ch.options.map(function (o) { return o.visual ? o.visual.type : 'num'; });
        if (forms.indexOf(v.type === 'big' ? 'num' : v.type) >= 0) return 'samenum: an option looks like the question';
        return exactlyOne(ch.options, ch.correct, function (o) { return (o.visual ? amt(o.visual) : parseLabel(o.label)) === want2; });
      }
      case 'give': {
        var m2 = /(\d+)/.exec(task.say), ng = m2 ? +m2[1] : NaN;
        if (ng !== task.give.n || String(task.prompt).indexOf(String(ng)) < 0) return 'give: asks for ' + ng + ' but needs ' + task.give.n;
        return true;
      }
      case 'shapes': {
        var cnt = task.shapes.items.filter(function (it) { return it.s === task.shapes.want; }).length;
        if (cnt < 2 || cnt > 4 || task.shapes.items.length - cnt < 2) return 'shapes: ' + cnt + ' of ' + task.shapes.items.length;
        var nm = { circle: /cirkl|circle/, triangle: /trekant|triangle/, square: /firkant|square/ }[task.shapes.want];
        return nm && nm.test(task.say.toLowerCase()) ? true : 'shapes: the spoken name is not the wanted shape';
      }
      // Natur og teknik (slice 5): each answer worked out again from this copy of the fact list in slice-5.md
      case 'float': {
        var tt = task.test, fl = NATUR_FLOATS[tt.thing];
        if (fl == null) return 'float: ' + tt.thing + ' is not in the fact list';
        if (tt.correct !== (fl ? 0 : 1)) return 'float: ' + tt.thing + (fl ? ' floats' : ' sinks');
        var hv = task.how[0].visual;
        if (!hv || hv.thing !== tt.thing || hv.floats !== fl) return 'float: the how shows something else';
        if (new RegExp(fl ? 'flyder' : 'synker').test(task.how[0].text) === false) return 'float: the how says the wrong thing';
        return true;
      }
      case 'magnet': {
        var tm = task.test, pl = NATUR_MAGNET[tm.thing];
        if (pl == null) return 'magnet: ' + tm.thing + ' is not in the fact list';
        if (tm.correct !== (pl ? 0 : 1)) return 'magnet: ' + tm.thing + (pl ? ' is pulled' : ' is not pulled');
        var hm = task.how[0].visual;
        if (!hm || hm.thing !== tm.thing || hm.pulls !== pl) return 'magnet: the how shows something else';
        if (/ikke/.test(task.how[0].text) === pl) return 'magnet: the how says the wrong thing';
        return true;
      }
      case 'ramp': {
        var ta = task.test.angles;
        if (!Array.isArray(ta) || ta.length !== 2 || Math.abs(ta[0] - ta[1]) < 12) return 'ramp: the two ramps must differ clearly';
        return task.test.correct === (ta[0] > ta[1] ? 0 : 1) ? true : 'ramp: the steeper ramp is ' + (ta[0] > ta[1] ? 0 : 1);
      }
      case 'legs': {
        var nl = NATUR_LEGS[v && v.emoji];
        if (nl == null) return 'legs: ' + (v && v.emoji) + ' is not in the checked pictures';
        if (ch.options.length !== 5) return 'legs: five choices';
        return exactlyOne(ch.options, ch.correct, function (o) { return parseLabel(o.label) === nl; });
      }
      case 'tone': {
        var sr = task.strings, short = sr.lens[0] < sr.lens[1] ? 0 : 1;
        if (sr.lens[1 - short] < sr.lens[short] * 1.6) return 'tone: the lengths must differ clearly';
        if (!(sr.midi[short] > sr.midi[1 - short])) return 'tone: the short string must sound lighter';
        var want3 = sr.ask === 'lys' ? short : 1 - short;
        if (!new RegExp(sr.ask === 'lys' ? 'lyse' : 'dybe').test(task.say) || /høj/i.test(task.say + task.prompt)) return 'tone: the words';
        return sr.correct === want3 ? true : 'tone: the ' + sr.ask + ' string is ' + want3;
      }
      case 'path':
      case 'fix': {
        var sp3 = task.steps, best = stepsFrom(sp3)[sp3.start.join(',')];
        if (best == null) return 'steps: no way to the berry';
        if (best > sp3.max) return 'steps: the way takes ' + best + ' but the row holds ' + sp3.max;
        if (k.type === 'fix') {
          if (!sp3.row || walkTo(sp3, sp3.row)) return 'fix: the row laid already must be wrong';
          if (!stepsSolution(sp3)) return 'fix: no single arrow mends the row';
        } else if (sp3.row) return 'path: no row laid already';
        if (task.grade === 0 && (sp3.stones.length || best < 2 || best > 4)) return 'path: class 0 is two to four steps, no stones';
        if (task.grade >= 1 && (best < 4 || best > 6)) return 'steps: four to six steps from class 1';
        return true;
      }
      default: return 'no key type';
    }
  }
  // the fact list of slice-5.md, written out again for verify: floats (true) or sinks, and legs on a checked picture
  var NATUR_FLOATS = { '🍎': true, '⛵': true, 'nat:feather': true, 'nat:leaf': true, 'nat:stick': true, 'nat:beach-ball': true,
    '🥄': false, '🔑': false, stone: false, 'nat:nail': false, 'nat:screw': false, 'nat:coin-gold': false, 'nat:scissors': false };
  // the magnet (slice-5b.md): it pulls iron and steel; no key and no coin
  var NATUR_MAGNET = { 'nat:nail': true, 'nat:screw': true, 'nat:paper-clip': true, 'nat:scissors': true,
    'nat:feather': false, 'nat:leaf': false, 'nat:stick': false, 'nat:beach-ball': false, '✏️': false, '🍎': false, stone: false, '📖': false };
  // legs counted by eye on each slice 5b cut-out
  var NATUR_LEGS = { 'nat:spider': 8, 'nat:ant-6legs': 6, 'nat:ladybird-6legs': 6, 'nat:beetle': 6, 'nat:bee-6legs': 6,
    'nat:grasshopper': 6, 'nat:cat-4legs': 4, 'nat:hen': 2, 'nat:worm': 0 };
  function buildReach(task) {
    var vals = tileVals(task), b = task.build;
    if (b.op === 'product') {
      for (var i = 0; i < vals.length; i++) for (var j = i + 1; j < vals.length; j++) if (vals[i] * vals[j] === b.target) return true;
      return 'no pair makes ' + b.target;
    }
    if (!fewestSubset(vals, b.target)) return 'tiles cannot make ' + b.target;
    if (vals.indexOf(b.target) >= 0 && !(task.key && task.key.allowSingle)) return 'one tile is the whole answer';
    var sm = task.key && task.key.smart;
    if (sm && sm.type === 'prefix' && !subsetWith(vals, b.target, sm.v)) return 'smart route missing';
    if (sm && sm.type === 'set') {
      var s = sm.vals.reduce(function (a, x) { return a + x; }, 0), have = vals.slice();
      if (s !== b.target) return 'smart set does not sum to target';
      for (var k = 0; k < sm.vals.length; k++) { var at = have.indexOf(sm.vals[k]); if (at < 0) return 'smart tile missing'; have.splice(at, 1); }
    }
    return true;
  }

  function verify(task) {
    try {
      if (!task || typeof task !== 'object') return 'no task';
      var req = ['id', 'power', 'step', 'grade', 'ui', 'prompt', 'say', 'how'];
      for (var i = 0; i < req.length; i++) if (task[req[i]] == null) return 'missing ' + req[i];
      if (!('visual' in task)) return 'missing visual';
      if (HARD.concat('hjerte').indexOf(task.power) < 0) return 'bad power';
      if (UIS.indexOf(task.ui) < 0) return 'bad ui';
      if (task.grade < 0 || task.grade > 5) return 'bad grade';
      if (!task[task.ui]) return 'missing ' + task.ui + ' block';
      for (var u = 0; u < UIS.length; u++) if (UIS[u] !== task.ui && task[UIS[u]] != null) return 'extra ' + UIS[u] + ' block';
      if (typeof task.prompt !== 'string' || !task.prompt.length || task.prompt.length > 60) return 'prompt length ' + (task.prompt || '').length + ': ' + task.prompt;
      if (typeof task.say !== 'string' || !task.say.length) return 'empty say';
      var vr = checkVisual(task.visual);
      if (vr !== true) return vr;
      if (!Array.isArray(task.how) || task.how.length < 1 || task.how.length > 3) return 'how needs 1 to 3 steps';
      for (var h = 0; h < task.how.length; h++) {
        var hs = task.how[h];
        if (typeof hs.text !== 'string' || !hs.text || hs.text.length > 90) return 'how text length: ' + hs.text;
        if (typeof hs.say !== 'string' || !hs.say) return 'how say missing';
        if (!('visual' in hs)) return 'how visual missing';
        var hv = checkVisual(hs.visual);
        if (hv !== true) return 'how ' + hv;
      }
      if (task.praise != null && (typeof task.praise !== 'string' || task.praise.length > 60)) return 'praise length';
      var strs = strings(task);
      for (var s = 0; s < strs.length; s++) {
        if (typeof strs[s] !== 'string') return 'non-string text';
        if (/\{\w+\}|undefined|NaN|null|—/.test(strs[s])) return 'unfilled or bad text: ' + strs[s];
        var bt = badTag(strs[s]); if (bt) return bt;
      }
      if (task.ui === 'choice') {
        var ch = task.choice, max = task.power === 'hjerte' ? 60 : 22;
        // 2 to 4 options; "how many legs" has five (0, 2, 4, 6, 8)
        var most = task.key && task.key.type === 'legs' ? 5 : 4;
        if (!Array.isArray(ch.options) || ch.options.length < 2 || ch.options.length > most) return 'choice needs 2 to ' + most + ' options';
        if ((ch.correct | 0) !== ch.correct || ch.correct < 0 || ch.correct >= ch.options.length) return 'bad correct index';
        var seen = {};
        for (var o = 0; o < ch.options.length; o++) {
          var op = ch.options[o];
          if (!op.label && !op.emoji && !op.visual) return 'empty option';
          if (op.label && op.label.length > max) return 'option label too long: ' + op.label;
          var vo = checkVisual(op.visual);
          if (vo !== true) return 'option ' + vo;
          var sig = (op.label || '') + '|' + (op.emoji || '') + '|' + JSON.stringify(op.visual || null);
          if (seen[sig]) return 'duplicate option';
          seen[sig] = 1;
        }
      }
      if (task.ui === 'build') {
        var b = task.build;
        if (['sum', 'product'].indexOf(b.op) < 0) return 'bad op';
        if (!Array.isArray(b.tiles) || b.tiles.length < 2 || b.tiles.length > 16) return 'tiles count';
        if (b.tiles.some(function (t) { return typeof t.v !== 'number' || t.v <= 0 || t.label == null; })) return 'bad tile';
        if (!(b.target > 0)) return 'bad target';
        if (b.confirm != null && typeof b.confirm !== 'boolean') return 'confirm must be true or false';
        // the orb pot submits by itself when the sum reaches the target; when the target is not on the screen
        // that lets a child find it by trying, so such a task must ask for a "Færdig" press (build.confirm)
        if (b.op === 'sum') {
          var tg = String(b.target), vt = task.visual && task.visual.type === 'big' ? String(task.visual.text).replace(/ kr$/, '') : null;
          var shown = new RegExp('(^|[^\\d,.])' + tg + '($|[^\\d,.])').test(task.prompt) || vt === tg;
          if (!shown && b.confirm !== true) return 'target ' + tg + ' is not on the screen: build.confirm must be true';
          if (shown && b.confirm) return 'target is on the screen: build.confirm is not needed';
        }
      }
      if (task.ui === 'fill') {
        var f = task.fill;
        if (['bar', 'pie', 'dots'].indexOf(f.shape) < 0) return 'fill shape';
        if (!(f.total >= 1 && f.total <= 20) || !(f.need >= 1 && f.need <= f.total)) return 'fill range';
      }
      if (task.ui === 'spell') {
        var sp = task.spell;
        if (!/^[A-ZÆØÅÄÖ]+$/.test(sp.word)) return 'spell word not uppercase letters: ' + sp.word;
        if (!Array.isArray(sp.tiles) || sp.tiles.length > 12) return 'spell tiles';
        var pool = sp.tiles.slice();
        if (pool.some(function (t) { return !/^[A-ZÆØÅÄÖ]$/.test(t); })) return 'bad letter tile';
        for (var c = 0; c < sp.word.length; c++) { var at = pool.indexOf(sp.word[c]); if (at < 0) return 'tiles lack ' + sp.word[c]; pool.splice(at, 1); }
      }
      if (task.ui === 'breathe') {
        var br = task.breathe;
        if (!(br.breaths >= 1 && br.breaths <= 6 && br.inMs >= 1500 && br.inMs <= 8000 && br.outMs >= 1500 && br.outMs <= 9000)) return 'breathe range';
      }
      // the class 0 pack: nothing to read, numbers 1 to 10, never q, w, x or z
      if (task.ui === 'secret') {
        var sw = task.secret;
        if (!/^[A-ZÆØÅ]{2,4}$/.test(sw.word) || /[QWXZ]/.test(sw.word)) return 'secret word: ' + sw.word;
        if (!Array.isArray(sw.pics) || sw.pics.length !== sw.word.length) return 'secret: one picture per letter';
        if (!Array.isArray(sw.tiles) || sw.tiles.length > 8 || sw.tiles.some(function (x) { return !/^[A-ZÆØÅ]$/.test(x) || /[QWXZ]/.test(x); })) return 'secret tiles';
        var sp2 = sw.tiles.slice();
        for (var c2 = 0; c2 < sw.word.length; c2++) { var at2 = sp2.indexOf(sw.word[c2]); if (at2 < 0) return 'secret tiles lack ' + sw.word[c2]; sp2.splice(at2, 1); }
        if (sw.pics.indexOf(sw.target) >= 0) return 'secret: the answer picture is in the row';
      }
      if (task.ui === 'match') {
        var mt = task.match;
        if (!Array.isArray(mt.pieces) || mt.pieces.length < 2 || mt.pieces.length > 4) return 'match pieces';
        if ((mt.correct | 0) !== mt.correct || !mt.pieces[mt.correct]) return 'match correct';
        if (mt.pieces.some(function (x) { return !x.emoji || !x.say; })) return 'match piece without picture or name';
      }
      if (task.ui === 'beats' && !(task.beats.n >= 1 && task.beats.n <= 4 && task.beats.max >= task.beats.n + 2)) return 'beats range';
      if (task.ui === 'give' && !(task.give.n >= 1 && task.give.n <= 10 && task.give.total === 10)) return 'give range';
      if (task.ui === 'shapes') {
        var hv2 = checkVisual({ type: 'shapes', items: task.shapes.items, want: task.shapes.want });
        if (hv2 !== true) return hv2;
      }
      // Natur og teknik: two answers in the guess-then-test games and the strings, a small grid in the arrow games
      if (task.ui === 'test') {
        var tst = task.test;
        if (['float', 'magnet', 'ramp'].indexOf(tst.scene) < 0 || [0, 1].indexOf(tst.correct) < 0 || !Array.isArray(tst.says)) return 'test shape';
        if ((tst.scene === 'float' || tst.scene === 'magnet') && tst.says.length !== 1) return 'test: the thing says its name';
      }
      if (task.ui === 'strings') {
        var sr2 = task.strings;
        if (!Array.isArray(sr2.lens) || sr2.lens.length !== 2 || !Array.isArray(sr2.midi) || sr2.midi.length !== 2 || [0, 1].indexOf(sr2.correct) < 0 || ['lys', 'dyb'].indexOf(sr2.ask) < 0) return 'strings shape';
      }
      if (task.ui === 'steps') {
        var sq = task.steps, inGrid = function (c) { return Array.isArray(c) && c[0] >= 0 && c[1] >= 0 && c[0] < sq.w && c[1] < sq.h; };
        if (!(sq.w >= 3 && sq.w <= 6 && sq.h >= 3 && sq.h <= 5) || !inGrid(sq.start) || !inGrid(sq.goal) || !Array.isArray(sq.stones) || !sq.stones.every(inGrid)) return 'steps grid';
        if (sq.start.join() === sq.goal.join() || stoneAt(sq, sq.start[0], sq.start[1]) || stoneAt(sq, sq.goal[0], sq.goal[1])) return 'steps: start, berry and stones overlap';
        if (!(sq.max >= 2 && sq.max <= 8) || (sq.row && (!Array.isArray(sq.row) || sq.row.length !== sq.max || sq.row.some(function (d) { return !STEP_D[d]; })))) return 'steps row';
      }
      return verifySemantic(task);
    } catch (e) {
      return 'verify error: ' + e.message;
    }
  }

  var api = { create: create, verify: verify, check: check, LANGS: LANGS, POWERS: HARD, topicsFor: topicsFor, _solveEq: solveEq, _speak: speak, _fmt: fmtNum, _walkTo: walkTo };
  G.Brain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
