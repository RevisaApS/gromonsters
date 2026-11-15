/* Content: natur (Natur og teknik, slice 5). A Danish game only, like Engelsk. Classes 0 to 2; an older child lands
   on the last step. Nothing to read: one short spoken instruction, pictures that say their name, picture buttons.
   The facts are only the clear cases in ../../slice-5.md ("The facts must be right"), and only things the game has a
   picture for (assets/pics, src/data/pics.js). Left out for want of a picture: leaf, stick, feather, cork, coin and nail
   (float or sink), every thing the magnet pulls (nail, screw, paper clip, scissors: so the magnet step is left out),
   spider and worm. Left out after looking at the picture: the ball (it could be a marble or a solid rubber ball, which
   sink), the ant, bee and ladybird (fewer than six legs show), the butterfly (no legs show) and the cat (three paws
   show). The stone may be drawn in code (slice-5.md, Art).
   Steps (ids follow the numbers in slice-5.md; n02, the magnet, waits for pictures):
     n01 Flyder eller synker (class 0)   ui 'test', scene 'float': he guesses, then the thing drops into the tub
     n04 Hvor mange ben (class 0)        ui 'choice': 0, 2, 4, 6 or 8
     n06 Kort vej (class 0)              ui 'steps': two to four arrow steps, at most one turn
     n05 Lys eller dyb tone (class 1)    ui 'strings': pluck both, pick the light (or the deep) one
     n07 Uden om stenene (class 1)       ui 'steps': four to six steps, stones in the way
     n03 Rampen (class 2)                ui 'test', scene 'ramp': which ball rolls longest; then both roll
     n08 Find den forkerte pil (class 2) ui 'steps' with a row laid already: one arrow is wrong
   The walk of the arrow games (walk, below) is shared with the task screen (src/taskui.js); the brain's verify works
   every answer out again by its own route (src/brain.js). */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  G.Content = G.Content || {};
  var DA = ['da'];

  function H(text, visual, say) { return { text: text, say: say || text, visual: visual || null }; }
  function nm(da, en) { return { da: da, sv: da, no: da, en: en }; }
  var PRAISE = ['Ja!', 'Flot!', 'Super!'];
  // the rule of a guess-then-test game, said the first two times only (task.intro, src/brain.js INTRO)
  var GUESS = 'Gæt først. Så prøver vi.';

  /* ---------- the facts ---------- */
  // [emoji or 'stone', its name on a tap, the how sentence, floats]
  var FLOAT = [
    ['🍎', 'Æble.', 'Æblet flyder.', true],
    ['⛵', 'Båd.', 'Båden flyder.', true],
    ['🥄', 'Ske.', 'Skeen synker.', false],
    ['🔑', 'Nøgle.', 'Nøglen synker.', false],
    ['stone', 'Sten.', 'Stenen synker.', false]
  ];
  // [emoji, its name on a tap, legs, the how sentence]. Each picture was looked at: the legs show and can be counted.
  var LEGS = [
    ['🐶', 'Hund.', 4, 'Hunden har 4 ben.'],
    ['🐦', 'Fugl.', 2, 'Fuglen har 2 ben.'],
    ['🦆', 'And.', 2, 'Anden har 2 ben.'],
    ['🦉', 'Ugle.', 2, 'Uglen har 2 ben.'],
    ['🦜', 'Papegøje.', 2, 'Papegøjen har 2 ben.'],
    ['🦅', 'Ørn.', 2, 'Ørnen har 2 ben.'],
    ['🐌', 'Snegl.', 0, 'Sneglen har ingen ben.'],
    ['🐟', 'Fisk.', 0, 'Fisken har ingen ben.']
  ];
  var LEG_CHOICES = [0, 2, 4, 6, 8];

  /* ---------- the arrow games ---------- */
  var DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  var DIR_KEYS = ['u', 'r', 'd', 'l'];
  function same(a, b) { return a[0] === b[0] && a[1] === b[1]; }
  function isStone(g, x, y) { return (g.stones || []).some(function (s) { return s[0] === x && s[1] === y; }); }
  // Walks a row of arrows from the start. It stops on the berry (right, even with arrows left), at the edge or a stone
  // (it stays where it was and bumps), or when the arrows run out. path: every cell it stood on, in order.
  function walk(g, row) {
    var at = g.start.slice(), path = [at.slice()];
    for (var i = 0; i < (row || []).length; i++) {
      var d = DIRS[row[i]];
      if (!d) return { ok: false, stop: 'bad', at: at, path: path, i: i };
      var nx = at[0] + d[0], ny = at[1] + d[1];
      if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) return { ok: false, stop: 'edge', at: at, path: path, i: i, to: [nx, ny] };
      if (isStone(g, nx, ny)) return { ok: false, stop: 'stone', at: at, path: path, i: i, to: [nx, ny] };
      at = [nx, ny]; path.push(at.slice());
      if (same(at, g.goal)) return { ok: true, stop: 'goal', at: at, path: path, i: i };
    }
    return { ok: false, stop: 'end', at: at, path: path, i: row ? row.length : 0 };
  }
  // the shortest row of arrows from the start to the berry, around the stones (null when there is none). Of the
  // shortest rows it takes one that keeps going the same way where it can, so it has few turns.
  function shortest(g) {
    var key = function (p) { return p[0] + ',' + p[1]; }, dist = {}, q = [g.goal.slice()];
    var free = function (n) { return n[0] >= 0 && n[1] >= 0 && n[0] < g.w && n[1] < g.h && !isStone(g, n[0], n[1]); };
    dist[key(g.goal)] = 0;
    while (q.length) {
      var c = q.shift();
      for (var j = 0; j < DIR_KEYS.length; j++) {
        var d = DIRS[DIR_KEYS[j]], n = [c[0] + d[0], c[1] + d[1]];
        if (!free(n) || key(n) in dist) continue;
        dist[key(n)] = dist[key(c)] + 1;
        q.push(n);
      }
    }
    if (!(key(g.start) in dist)) return null;
    var at = g.start.slice(), row = [], last = null;
    while (!same(at, g.goal)) {
      var here = dist[key(at)], opts = (last ? [last] : []).concat(DIR_KEYS);
      for (var k = 0; k < opts.length; k++) {
        var dd = DIRS[opts[k]], nx = [at[0] + dd[0], at[1] + dd[1]];
        if (free(nx) && dist[key(nx)] === here - 1) { row.push(opts[k]); last = opts[k]; at = nx; break; }
      }
    }
    return row;
  }
  function turns(row) { var n = 0; for (var i = 1; i < row.length; i++) if (row[i] !== row[i - 1]) n++; return n; }
  function cell(U, w, h) { return [U.int(0, w - 1), U.int(0, h - 1)]; }
  function gridKey(g) { return g.w + 'x' + g.h + ':' + g.start.join(',') + '>' + g.goal.join(',') + ':' + (g.stones || []).map(function (s) { return s.join(','); }).join(';'); }
  function labGrid(g, row, mark) { var v = { type: 'lab', scene: 'grid', w: g.w, h: g.h, start: g.start, goal: g.goal, stones: g.stones || [], row: row }; if (mark != null) v.mark = mark; return v; }

  var ASK_PATH = 'Find vej hen til bærret', RULE_PATH = 'Tryk på pilene. Tryk så på start.';
  var ASK_FIX = 'Find den forkerte pil', RULE_FIX = 'Tryk på den forkerte pil, og vælg en ny.';

  /* ---------- the ramp and the strings ---------- */
  var STEEP = [35, 40, 45], FLAT = [12, 16, 20];
  var LONG = [540, 560, 580, 600], SHORT = [220, 260, 300];
  // a string's tone from its length: half the length is an octave up (the long ones sit around a low C)
  function midiOf(len) { return Math.round(48 + 12 * Math.log(600 / len) / Math.LN2); }

  var steps = [];
  function step(o) { o.langs = DA; steps.push(o); }

  // 1. Floats or sinks (class 0). A thing hangs over a tub of water; he picks "floats" or "sinks", then it drops.
  step({
    id: 'n01', grade: 0, name: nm('Flyder eller synker', 'Floats or sinks'),
    pick: function (U) { return { k: U.int(0, FLOAT.length - 1) }; },
    key: function (p) { return FLOAT[p.k] ? FLOAT[p.k][0] : 'x'; },
    make: function (p, L, U) {
      var f = FLOAT[p.k];
      if (!f || L !== 'da') return null;
      var ask = 'Flyder den, eller synker den?';
      return {
        ui: 'test', prompt: ask, say: ask, intro: GUESS,
        visual: null,
        // options: 0 floats, 1 sinks
        test: { scene: 'float', thing: f[0], says: [f[1]], correct: f[3] ? 0 : 1 },
        how: [H(f[2], { type: 'lab', scene: 'float', thing: f[0], floats: f[3] })],
        praise: U.pick(PRAISE),
        key: { type: 'float' }
      };
    }
  });

  // 3. The ramp (class 2). Two ramps of the same length, one steep and one flat, the same ball on each. The steeper
  // ramp starts its ball higher, so it rolls longest across the same floor.
  step({
    id: 'n03', grade: 2, name: nm('Rampen', 'The ramp'),
    pick: function (U) { var s = U.pick(STEEP), f = U.pick(FLAT), top = U.chance(0.5); return { a: top ? [s, f] : [f, s], c: U.int(0, 4) }; },
    key: function (p) { return p.a.join('-') + ':' + p.c; },
    make: function (p, L, U) {
      if (L !== 'da') return null;
      var ask = 'Hvilken kugle triller længst?', steep = p.a[0] > p.a[1] ? 0 : 1;
      return {
        ui: 'test', prompt: ask, say: ask, intro: GUESS,
        visual: null,
        test: { scene: 'ramp', angles: p.a.slice(), ball: p.c, says: [], correct: steep },
        how: [H('Kuglen på den stejle rampe triller længst.', { type: 'lab', scene: 'ramp', angles: p.a.slice(), ball: p.c, end: true })],
        praise: U.pick(PRAISE),
        key: { type: 'ramp' }
      };
    }
  });

  // 4. How many legs (class 0). A small animal; he picks 0, 2, 4, 6 or 8.
  step({
    id: 'n04', grade: 0, name: nm('Hvor mange ben', 'How many legs'),
    pick: function (U, L, E) {
      // the easy half: one animal of each count
      var pool = E ? [0, 1, 6, 7] : LEGS.map(function (x, i) { return i; });
      return { k: U.pick(pool) };
    },
    key: function (p) { return LEGS[p.k] ? LEGS[p.k][0] : 'x'; },
    make: function (p, L, U) {
      var a = LEGS[p.k];
      if (!a || L !== 'da') return null;
      var ask = 'Hvor mange ben har den?';
      var opts = LEG_CHOICES.map(function (n) { return { label: String(n) }; });
      return {
        ui: 'choice', prompt: ask, say: ask,
        // the picture says its name when tapped
        visual: { type: 'emoji', emoji: a[0], say: a[1] },
        choice: { options: opts, correct: LEG_CHOICES.indexOf(a[2]), cols: 5 },
        how: [H(a[3], { type: 'emoji', emoji: a[0] })],
        praise: U.pick(PRAISE),
        key: { type: 'legs' }
      };
    }
  });

  // 5. Light or deep tone (class 1). Two strings, one long and one short. He plucks them as often as he likes and
  // picks the one with the light tone, or the deep one. The shorter string has the light tone.
  step({
    id: 'n05', grade: 1, name: nm('Lys eller dyb tone', 'High or low note'),
    pick: function (U, L, E) {
      var lo = U.pick(LONG), hi = E ? 220 : U.pick(SHORT), top = U.chance(0.5);
      return { lens: top ? [lo, hi] : [hi, lo], ask: U.pick(['lys', 'dyb']) };
    },
    key: function (p) { return p.lens.join('-') + ':' + p.ask; },
    make: function (p, L, U) {
      if (L !== 'da') return null;
      var shortAt = p.lens[0] < p.lens[1] ? 0 : 1, light = p.ask === 'lys';
      var ask = light ? 'Find den lyse tone' : 'Find den dybe tone';
      var why = light ? 'Den korte streng har den lyse tone.' : 'Den lange streng har den dybe tone.';
      var correct = light ? shortAt : 1 - shortAt;
      return {
        ui: 'strings', prompt: ask, say: ask + '.', intro: 'Tryk på strengene, og lyt.',
        visual: null,
        strings: { lens: p.lens.slice(), midi: p.lens.map(midiOf), ask: p.ask, correct: correct },
        how: [H(why, { type: 'lab', scene: 'strings', lens: p.lens.slice(), mark: correct })],
        praise: U.pick(PRAISE),
        key: { type: 'tone' }
      };
    }
  });

  // the arrow games share one task kind: a grid seen from above, his Gromonster, a berry, maybe stones
  function pathTask(g, U, grade) {
    var row = shortest(g);
    return {
      ui: 'steps', prompt: ASK_PATH, say: ASK_PATH + '.', intro: RULE_PATH,
      visual: null,
      steps: { w: g.w, h: g.h, start: g.start, goal: g.goal, stones: g.stones || [], max: grade === 0 ? 6 : 8, row: null },
      how: [H('Sådan kommer den hen til bærret.', labGrid(g, row))],
      praise: U.pick(PRAISE),
      key: { type: 'path' }
    };
  }

  // 6. A short path (class 0): two to four steps, at most one turn, no stones.
  step({
    id: 'n06', grade: 0, name: nm('Kort vej', 'A short path'),
    pick: function (U, L, E) {
      for (var t = 0; t < 60; t++) {
        var g = { w: 5, h: 4, start: cell(U, 5, 4), goal: cell(U, 5, 4), stones: [] };
        var n = Math.abs(g.goal[0] - g.start[0]) + Math.abs(g.goal[1] - g.start[1]);
        if (n >= 2 && n <= (E ? 3 : 4)) return g;
      }
      return null;
    },
    key: gridKey,
    make: function (g, L, U) { return L === 'da' ? pathTask(g, U, 0) : null; }
  });

  // stones that are in the way: neither of the two straight-and-one-turn paths gets through, and the way round takes
  // between lo and hi steps
  function stoneGrid(U, lo, hi, nStones) {
    for (var t = 0; t < 200; t++) {
      var g = { w: 6, h: 4, start: cell(U, 6, 4), goal: cell(U, 6, 4), stones: [] };
      if (same(g.start, g.goal)) continue;
      var k = nStones[0] + U.int(0, nStones[1] - nStones[0]);
      for (var s = 0; s < k * 4 && g.stones.length < k; s++) {
        var c = cell(U, 6, 4);
        if (same(c, g.start) || same(c, g.goal) || isStone(g, c[0], c[1])) continue;
        g.stones.push(c);
      }
      var row = shortest(g);
      if (!row || row.length < lo || row.length > hi) continue;
      var dx = g.goal[0] - g.start[0], dy = g.goal[1] - g.start[1];
      var hx = [], vy = [];
      for (var i = 0; i < Math.abs(dx); i++) hx.push(dx > 0 ? 'r' : 'l');
      for (var j = 0; j < Math.abs(dy); j++) vy.push(dy > 0 ? 'd' : 'u');
      if (walk(g, hx.concat(vy)).ok || walk(g, vy.concat(hx)).ok) continue;
      g.stones.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
      return g;
    }
    return null;
  }

  // 7. Around the stones (class 1): four to six steps, stones in the way.
  step({
    id: 'n07', grade: 1, name: nm('Uden om stenene', 'Around the stones'),
    pick: function (U, L, E) { return stoneGrid(U, 4, E ? 5 : 6, [2, 4]); },
    key: gridKey,
    make: function (g, L, U) { return L === 'da' ? pathTask(g, U, 1) : null; }
  });

  // 8. Find the wrong arrow (class 2): the row is laid already, one arrow is wrong and walks him into a stone or off
  // the grid. He taps the wrong arrow and picks the right one.
  step({
    id: 'n08', grade: 2, name: nm('Find den forkerte pil', 'Find the wrong arrow'),
    pick: function (U, L, E) {
      for (var t = 0; t < 40; t++) {
        var g = stoneGrid(U, 4, E ? 5 : 6, [1, 3]);
        if (!g) continue;
        var row = shortest(g), at = U.int(0, row.length - 1), wrongs = DIR_KEYS.filter(function (d) { return d !== row[at]; });
        var d = U.pick(wrongs), bad = row.slice(); bad[at] = d;
        var w = walk(g, bad);
        if (w.ok || (w.stop !== 'stone' && w.stop !== 'edge')) continue;
        g.row = bad;
        return g;
      }
      return null;
    },
    key: function (g) { return gridKey(g) + ':' + g.row.join(''); },
    make: function (g, L, U) {
      if (L !== 'da') return null;
      var fix = shortest(g), at = -1;
      for (var i = 0; i < g.row.length; i++) if (g.row[i] !== fix[i]) at = i;
      return {
        ui: 'steps', prompt: ASK_FIX, say: ASK_FIX + '.', intro: RULE_FIX,
        visual: null,
        steps: { w: g.w, h: g.h, start: g.start, goal: g.goal, stones: g.stones, max: g.row.length, row: g.row.slice() },
        how: [H('Den pil skal pege en anden vej.', labGrid(g, fix, at))],
        praise: U.pick(PRAISE),
        key: { type: 'fix' }
      };
    }
  });

  /* ---------- ladder order: easiest first inside each class ---------- */
  var ORDER = ['n01', 'n04', 'n06', 'n05', 'n07', 'n03', 'n08'];
  var byId = {};
  steps.forEach(function (s) { byId[s.id] = s; });
  if (ORDER.length !== steps.length || ORDER.some(function (id) { return !byId[id]; })) throw new Error('natur: ORDER does not match the steps');
  steps = ORDER.map(function (id) { return byId[id]; });

  var api = { steps: steps, walk: walk, shortest: shortest, turns: turns, midiOf: midiOf, DIRS: DIRS, float: FLOAT, legs: LEGS, legChoices: LEG_CHOICES };
  G.Content.natur = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
