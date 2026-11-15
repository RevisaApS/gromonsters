/* BRAIN: the learning engine. Picks every task, places the child, checks answers, verifies content.
   Pure logic, no DOM. Runs in the browser (G.Brain) and in Node (module.exports). SPEC.md section 9. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  if (typeof module !== 'undefined' && typeof require === 'function') {
    ['tal', 'ord', 'logik', 'hjerte'].forEach(function (p) {
      if (!(G.Content && G.Content[p])) { try { require('./content/' + p + '.js'); } catch (e) { /* loaded by the page instead */ } }
    });
  }

  var LANGS = ['da', 'sv', 'no', 'en'];
  var HARD = ['tal', 'ord', 'logik'];
  var PLACE = 12;         // placement answers per power (placement also ends when the child reaches his own class)
  var EASY = 3;           // the first times a step is met, its numbers come from the easy half of its range
  var PV = 2;             // placement version: saves made before the gentle start are placed again while still early
  var RECENT = 12;        // ids kept to avoid repeats
  var REVIEW = 0.2;       // share of tasks from an earlier step
  var TEACH_WEIGHT = 6;   // the wild one's task: a topic he misses half the time comes up about twice as often as one he misses a tenth of the time
  var TEACH_MISSED = 0.4; // ... and this share of its tasks is a step he missed lately, when there is one; the rest is the step above his own
  var TOPICS = ['feel', 'help', 'breathe', 'grit', 'team'];
  var VISUALS = ['big', 'emoji', 'dots', 'clock', 'frac', 'seq', 'grid', 'balance', 'machine', 'line', 'scene'];
  var UIS = ['build', 'fill', 'choice', 'spell', 'breathe'];

  function content() { return G.Content || {}; }
  function ladder(power) { var c = content()[power]; return c && c.steps ? c.steps : []; }
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
     jumps `j` steps up below his own class (sized so a strong child reaches it in about 6 answers) and one step up
     from there, as far as the end of the class above his own. The first miss steps down one and slows the climb:
     from then on it takes two first-try rights in a row to go one step up. Then the steady rule (4 of the last 5
     right) aims at about 80% first-try success. */
  function firstOfGrade(steps, g) {
    for (var i = 0; i < steps.length; i++) if (steps[i].grade >= g) return i;
    return steps.length - 1;
  }
  function startIndex(power, grade) {
    var steps = ladder(power);
    if (!steps.length || grade <= 1) return 0;
    var g = grade - 2, i = firstOfGrade(steps, g);
    while (i > 0 && steps[i].grade > g) i--;   // never start above class - 2, even if that class has no steps
    return i;
  }
  function targetIndex(power, grade) { var steps = ladder(power); return steps.length ? firstOfGrade(steps, grade) : 0; }
  // the highest step placement may reach: the last step of the class above his own
  function ceilingIndex(power, grade) {
    var steps = ladder(power), i = steps.length - 1;
    while (i > 0 && steps[i].grade > grade + 1) i--;
    return Math.max(0, i);
  }
  function jumpFor(power, grade) { return Math.max(1, Math.ceil((targetIndex(power, grade) - startIndex(power, grade)) / 6)); }
  // The ladders as they were before step ids were saved (build 16ba584 / 9e22735): plain id order.
  function ids(ch, n) { var o = []; for (var i = 1; i <= n; i++) o.push(ch + (i < 10 ? '0' : '') + i); return o; }
  var LEGACY = { tal: ids('t', 33), ord: ids('o', 13), logik: ids('l', 14) };
  function sidOf(power, si) { var s = ladder(power)[si]; return s ? s.id : null; }
  function freshPower(power, grade) {
    var si = startIndex(power, grade);
    return { si: si, sid: sidOf(power, si), pl: 0, run: 0, j: jumpFor(power, grade), m: 0, h: {}, d: {}, pr: [], a: 0, ft: [], fx: 0, c: {} };
  }
  function replace(P, power, grade) {
    P.si = startIndex(power, grade); P.sid = sidOf(power, P.si);
    P.pl = 0; P.run = 0; P.m = 0; P.j = jumpFor(power, grade);
  }
  // the class a power is placed from: the parent's own pick for that topic (st.pg), or the child's class
  function gradeOf(st, power) { return st.pg && st.pg[power] != null ? st.pg[power] : st.grade; }
  function fresh(opts) {
    var grade = clamp(opts.grade | 0, 0, 5);
    var seed = opts.seed != null ? opts.seed : (Date.now() ^ Math.floor(Math.random() * 1e9));
    var st = { v: 1, pv: PV, rng: seed >>> 0, n: 0, grade: grade, lang: opts.lang || 'da', p: {}, cb: [], rc: [], hj: { m: 0, t: {}, rc: [] } };
    HARD.forEach(function (p) { st.p[p] = freshPower(p, grade); });
    TOPICS.forEach(function (t) { st.hj.t[t] = 0; });
    return st;
  }

  function create(saved, opts) {
    opts = opts || {};
    var st;
    if (saved && saved.v === 1 && saved.p) {
      st = clone(saved);
      HARD.forEach(function (p) {
        var P = st.p[p];
        if (!P) { st.p[p] = freshPower(p, gradeOf(st, p)); return; }
        // the ladder may have been reordered since the save: find the step by its id. A save from before step ids
        // were stored holds only an index into the old ladder: read it there first.
        var sid = P.sid || (st.pv !== PV && LEGACY[p] ? LEGACY[p][clamp(P.si | 0, 0, LEGACY[p].length - 1)] : null);
        if (sid) { var at = ladder(p).map(function (s) { return s.id; }).indexOf(sid); if (at >= 0) P.si = at; }
        if (P.j == null) P.j = jumpFor(p, gradeOf(st, p));
        if (P.m == null) P.m = 0;
        if (!P.c) P.c = {};
      });
      // A save from before the gentle start: place again any power still early in its placement.
      if (st.pv !== PV) {
        // Its old comebacks wait until the new placement is done, so the gentle start comes first.
        HARD.forEach(function (p) {
          if (st.p[p].pl >= 8) return;
          replace(st.p[p], p, gradeOf(st, p));
          (st.cb || []).forEach(function (c) { if (c.p === p) c.old = 1; });
        });
        st.pv = PV;
      }
      if (opts.lang) st.lang = opts.lang;
      // A parent changed the class: place again from the new grade, keep the history.
      if (opts.grade != null && (opts.grade | 0) !== st.grade) {
        st.grade = clamp(opts.grade | 0, 0, 5);
        st.pg = {};
        HARD.forEach(function (p) { replace(st.p[p], p, st.grade); });
      }
      if (opts.seed != null) st.rng = opts.seed >>> 0;
    } else {
      st = fresh(opts);
    }
    // A grown-up picked a starting level for a topic (setup): place that topic from it.
    if (opts.levels && typeof opts.levels === 'object') HARD.forEach(function (p) {
      if (opts.levels[p] == null) return;
      var want = clamp(opts.levels[p] | 0, 0, 5);
      if (gradeOf(st, p) === want) return;
      st.pg = st.pg || {}; st.pg[p] = want;
      replace(st.p[p], p, want);
    });
    if (LANGS.indexOf(st.lang) < 0) st.lang = 'da';
    HARD.forEach(function (p) { var P = st.p[p], n = ladder(p).length; if (n) { P.si = clamp(P.si, 0, n - 1); P.sid = sidOf(p, P.si); } });

    var rng = new Rng(st.rng);
    var U = makeU(rng);

    function stepById(power, id) {
      var steps = ladder(power);
      for (var i = 0; i < steps.length; i++) if (steps[i].id === id) return { step: steps[i], index: i };
      return null;
    }
    function remember(id) { st.rc.push(id); if (st.rc.length > RECENT) st.rc.splice(0, st.rc.length - RECENT); }

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
        if (t.id !== avoidId && st.rc.indexOf(t.id) < 0) return t;
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
        var found = stepById(power, c.s);
        if (!found) { st.cb.splice(i, 1); i--; continue; }
        var t = c.kind === 'sib' ? fresh1(power, found.step, c.id, isEasy(power, found.step)) : build(power, found.step, c.k);
        if (!t) { st.cb.splice(i, 1); i--; continue; }
        if (st.rc.indexOf(t.id) >= 0) continue;    // shown too recently: wait
        st.cb.splice(i, 1);
        t.cb = c.kind;
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
      for (var i = st.cb.length - 1; i >= 0; i--) if (st.cb[i].p === power) add(st.cb[i].s);
      Object.keys(P.h || {}).forEach(function (id) { if ((P.h[id] || []).indexOf(0) >= 0) add(id); });
      return out;
    }

    var brain = {
      setLang: function (lang) { if (LANGS.indexOf(lang) >= 0) st.lang = lang; },
      next: function (o) {
        o = o || {};
        var power = o.power, today = o.today != null ? o.today : 0;
        if (power === 'hjerte') return brain.heart({ today: today });
        if (HARD.indexOf(power) < 0) power = 'tal';
        var steps = ladder(power);
        if (!steps.length) throw new Error('Brain: no content for ' + power);
        var P = st.p[power];
        st.n++;
        var t = dueComeback(power, today);
        if (!t) {
          var si = P.si;
          if (P.pl >= PLACE && si > 0 && U.chance(REVIEW)) si = U.int(Math.max(0, si - 5), si - 1);
          t = fresh1(power, steps[si], null, isEasy(power, steps[si]));
          met(power, steps[si]);
        }
        remember(t.id);
        st.rng = rng.s;
        return t;
      },
      // One step above where he is, from the easy half of that step. Used for the wild one's own tasks and the
      // super hit. It counts nothing: no placement, no step movement, no comeback.
      stretch: function (o) {
        o = o || {};
        var power = HARD.indexOf(o.power) < 0 ? 'tal' : o.power, steps = ladder(power);
        if (!steps.length) return null;
        var si = Math.min(steps.length - 1, st.p[power].si + 1);
        var t = fresh1(power, steps[si], null, true);
        if (t) { t.stretch = true; remember(t.id); }
        st.rng = rng.s;
        return t;
      },
      // The wild one's own task. It always gets it right and shows how, so this is where he sees the next thing he will
      // learn and the things he finds hard. The topic is drawn by how often he misses in it; inside the topic it is a
      // step he missed lately (TEACH_MISSED of the time, when there is one) or else the step above his own.
      // It counts nothing: no placement, no step movement, no comeback.
      teach: function (o) {
        o = o || {};
        var powers = HARD.filter(function (p) { return ladder(p).length > 0; });
        if (!powers.length) return null;
        var weights = powers.map(function (p) { return 1 + TEACH_WEIGHT * missRate(p); });
        var roll = U.r() * weights.reduce(function (a, b) { return a + b; }, 0), power = powers[powers.length - 1];
        for (var i = 0; i < powers.length; i++) { roll -= weights[i]; if (roll < 0) { power = powers[i]; break; } }
        var steps = ladder(power), missed = missedSteps(power), step, why;
        if (missed.length && U.chance(TEACH_MISSED)) { step = stepById(power, U.pick(missed.slice(0, 3))).step; why = 'missed'; }
        else { step = steps[Math.min(steps.length - 1, st.p[power].si + 1)]; why = 'next'; }
        var t = fresh1(power, step, null, why === 'next');
        if (t) { t.stretch = true; t.teach = why; remember(t.id); }
        st.rng = rng.s;
        return t;
      },
      // For the parent page and tests: how the wild one's topics are weighted right now.
      teachWeights: function () {
        var out = {};
        HARD.forEach(function (p) { out[p] = { missRate: missRate(p), weight: 1 + TEACH_WEIGHT * missRate(p), missed: missedSteps(p) }; });
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
        var P = st.p[task.power], steps = ladder(task.power), today = res.today != null ? res.today : 0;
        var ft = !!(res.ok && res.firstTry && !res.helped);
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
        var cur = steps[P.si], placing = P.pl < PLACE, tgt = targetIndex(task.power, gradeOf(st, task.power)), cap = ceilingIndex(task.power, gradeOf(st, task.power));
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
            var last5 = h.slice(-5), last4 = h.slice(-4);
            var rights = last5.reduce(function (a, b) { return a + b; }, 0);
            var misses = last4.filter(function (x) { return !x; }).length;
            if (h.length >= 4 && rights >= 4) up = 1;
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
        HARD.forEach(function (p) {
          var P = st.p[p], steps = ladder(p), s = steps[P.si] || {};
          out[p] = {
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
        var steps = ladder(power); if (!steps.length) return null;
        var g = clamp(grade | 0, 0, 5);
        var kinds = steps.filter(function (s) { return s.grade === g; });
        if (!kinds.length) kinds = [steps[targetIndex(power, g)]];
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
      balance: ['rows'], machine: ['pairs', 'ask'], line: ['min', 'max'], scene: ['emoji', 'text'] }[v.type];
    for (var i = 0; i < need.length; i++) if (v[need[i]] == null) return 'visual ' + v.type + ' lacks ' + need[i];
    if (v.type === 'grid' && (v.cells.length !== v.size * v.size || [2, 3].indexOf(v.size) < 0)) return 'grid size';
    if (v.type === 'frac' && ['pie', 'bar'].indexOf(v.shape) < 0) return 'frac shape';
    if (v.type === 'clock' && (v.h < 1 || v.h > 12 || v.m < 0 || v.m > 59)) return 'clock range';
    if (v.type === 'big' && String(v.text).length > 40) return 'big text too long';
    if (v.type === 'line' && v.at != null && (v.at < v.min || v.at > v.max)) return 'line marker out of range';
    if (v.type === 'line' && v.hop && (v.hop.from + v.hop.by < v.min || v.hop.from + v.hop.by > v.max)) return 'line hop out of range';
    if (v.type === 'dots' && (v.n < 0 || v.n > 50)) return 'dots range';
    return true;
  }
  function strings(task) {
    var out = [task.prompt, task.say];
    (task.how || []).forEach(function (h) { out.push(h.text, h.say); });
    if (task.praise) out.push(task.praise);
    if (task.smartPraise) out.push(task.smartPraise);
    if (task.choice) task.choice.options.forEach(function (o) { if (o.label) out.push(o.label); });
    if (task.visual && task.visual.text) out.push(task.visual.text);
    if (task.visual && task.visual.caption) out.push(task.visual.caption);
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
        return w3 ? labOpt(w3) : 'no English word';
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
      default: return 'no key type';
    }
  }
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
      }
      if (task.ui === 'choice') {
        var ch = task.choice, max = task.power === 'hjerte' ? 60 : 22;
        if (!Array.isArray(ch.options) || ch.options.length < 2 || ch.options.length > 4) return 'choice needs 2 to 4 options';
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
      return verifySemantic(task);
    } catch (e) {
      return 'verify error: ' + e.message;
    }
  }

  var api = { create: create, verify: verify, check: check, LANGS: LANGS, POWERS: HARD, _solveEq: solveEq, _speak: speak, _fmt: fmtNum };
  G.Brain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
