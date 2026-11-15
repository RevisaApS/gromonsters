/* Content: engelsk (English as a topic of its own, slice 3). A Danish game only: an English game has no such topic.
   Class 0 and 1 need no reading: the voice says an English word and he picks the picture, the number or the colour.
   Class 2 hears the Danish name and picks the English word on cards he can hear. Class 3 reads an English word. Classes
   4 and 5 are the three English steps that sat at the top of Ord until slice 3 (new ids here: e08, e09, e10).
   Every English word the game says is a sentence of its own marked "[en] " (src/voice.js plays it in the English voice,
   tools/voice-lines.mjs and tools/make_voice.py record it with an English style), so the Danish "Hat." and the English
   "[en] Hat." are two clips. The pictured words come from Ord's word list (G.Content.ord.lex). */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  G.Content = G.Content || {};
  var O = G.Content.ord;
  if (!O && typeof module !== 'undefined' && typeof require === 'function') { try { O = require('./ord.js'); } catch (e) { /* loaded by the page */ } }
  if (!O) throw new Error('engelsk.js needs ord.js first');
  var K = O.kit, LEX = O.lex, H = K.H, big = K.big, cap = K.cap;
  var DA = ['da'];

  function f(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; }); }
  // an English word as the voice says it: a sentence of its own, marked for the English voice
  function en(w) { return '[en] ' + cap(w) + '.'; }
  function emo(e) { return { type: 'emoji', emoji: e }; }

  // [emoji, Danish, English] for every picture with both words
  var ALL = LEX.filter(function (r) { return r[1] && r[4]; }).map(function (r) { return { e: r[0], da: r[1], en: r[4] }; });
  // pictures whose English word is not just the Danish one (tiger, bus, robot): those teach no English
  var REAL = ALL.filter(function (x) { return !K.close(x.en, x.da); });
  // the first words: short, everyday, easy to picture
  var FIRST = ['🐱', '🐶', '🐟', '🐮', '🐷', '🦆', '🐸', '🐻', '🦁', '🐝', '🌞', '🌙', '⭐', '🚗', '🏠', '🍎', '🥚', '🐭', '🐴', '🔑', '🦷', '📖'];
  var EASY = REAL.filter(function (x) { return FIRST.indexOf(x.e) >= 0; });
  function byE(e) { for (var i = 0; i < ALL.length; i++) if (ALL[i].e === e) return ALL[i]; return null; }

  var NUM = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  var NUM_DA = ['En', 'To', 'Tre', 'Fire', 'Fem', 'Seks', 'Syv', 'Otte', 'Ni', 'Ti'];
  // [English, emoji, Danish]
  var COL = [['red', '🔴', 'Rød'], ['blue', '🔵', 'Blå'], ['green', '🟢', 'Grøn'], ['yellow', '🟡', 'Gul'], ['black', '⚫', 'Sort'], ['white', '⚪', 'Hvid'],
    ['orange', '🟠', 'Orange'], ['purple', '🟣', 'Lilla'], ['brown', '🟤', 'Brun']];

  // [sentence with ▢, right, wrong, wrong]
  var GAP = O.sentences.gap;

  // Danish words on screen and in the voice. One short instruction per task.
  var T = {
    hearP: 'Find det, du hører', hearS: 'Find det, du hører. {en}',
    meanH: '{E} betyder {w}.', meanHS: '{en} {W}.',
    nameP: 'Hvad hedder det på engelsk?', nameS: '{W}. Hvad hedder det på engelsk?',
    nameH: '{W} hedder {e} på engelsk.', nameHS: 'Sådan hedder det på engelsk. {en}',
    readP: 'Find billedet', readS: 'Læs ordet, og find billedet.',
    spellP: 'Stav det på engelsk', spellS: '{W}. Stav det på engelsk.', spellH2: '{E} staves {s}.', spellH2S: 'Sådan staves det på engelsk. {s}',
    gapP: 'Hvilket ord passer?', gapS: 'Hvilket engelsk ord passer i sætningen?', gapH: 'Sådan lyder hele sætningen: {s}', gapHS: 'Sådan lyder hele sætningen. {en}',
    heard: 'Godt lyttet!', read: 'Godt læst!', good: 'Flot!'
  };
  function nm(da, en) { return { da: da, sv: da, no: da, en: en }; }

  var steps = [];
  function step(o) { o.langs = DA; steps.push(o); }

  // three pictures: the right one and two others with other English words
  function picChoice(right, pool, U) {
    var wr = U.sample(pool.filter(function (x) { return x.e !== right.e && x.en !== right.en; }), 2);
    return U.choice({ emoji: right.e }, wr.map(function (x) { return { emoji: x.e }; }), 3);
  }
  // hear an English word, find its picture (no reading)
  function hearTask(x, pool, U) {
    return {
      ui: 'choice', prompt: T.hearP, say: f(T.hearS, { en: en(x.en) }),
      visual: null,
      choice: picChoice(x, pool, U),
      how: [H(f(T.meanH, { E: cap(x.en), w: x.da }), emo(x.e), f(T.meanHS, { en: en(x.en), W: cap(x.da) }))],
      praise: T.heard,
      key: { type: 'enpic' }
    };
  }

  /* ---------------- class 0: hear and find ---------------- */
  step({
    id: 'e01', grade: 0, name: nm('Hør og find', 'Hear and find'),
    pick: function (U) { return { e: U.pick(EASY).e }; },
    key: function (p) { return p.e; },
    make: function (p, L, U) { var x = byE(p.e); return x ? hearTask(x, EASY, U) : null; }
  });

  /* ---------------- classes 0 and 1: numbers and colours, then more words ---------------- */
  // numbers 1 to `top` and the first `cols` colours
  function numColStep(id, grade, name, top, cols) { step({
    id: id, grade: grade, name: name,
    pick: function (U, L, easy) {
      if (U.chance(0.5)) return { n: U.int(1, easy ? Math.min(top, 5) : top) };
      return { c: U.pick(COL.slice(0, easy ? Math.min(cols, 4) : cols))[0] };
    },
    key: function (p) { return p.n ? 'n' + p.n : 'c' + p.c; },
    make: function (p, L, U) {
      if (p.n) {
        if (p.n < 1 || p.n > top) return null;
        var others = U.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, Math.max(top, 3)).filter(function (k) { return k !== p.n; }), 2);
        return {
          ui: 'choice', prompt: T.hearP, say: f(T.hearS, { en: en(NUM[p.n - 1]) }),
          visual: null,
          choice: U.choice({ label: String(p.n) }, others.map(function (k) { return { label: String(k) }; }), 3),
          how: [H(f(T.meanH, { E: cap(NUM[p.n - 1]), w: NUM_DA[p.n - 1].toLowerCase() }), big(p.n), f(T.meanHS, { en: en(NUM[p.n - 1]), W: NUM_DA[p.n - 1] }))],
          praise: T.heard,
          key: { type: 'enword' }
        };
      }
      var pal = COL.slice(0, cols), c = pal.filter(function (x) { return x[0] === p.c; })[0];
      if (!c) return null;
      var wr = U.sample(pal.filter(function (x) { return x[0] !== c[0]; }), 2);
      return {
        ui: 'choice', prompt: T.hearP, say: f(T.hearS, { en: en(c[0]) }),
        visual: null,
        choice: U.choice({ emoji: c[1] }, wr.map(function (x) { return { emoji: x[1] }; }), 3),
        how: [H(f(T.meanH, { E: cap(c[0]), w: c[2].toLowerCase() }), emo(c[1]), f(T.meanHS, { en: en(c[0]), W: c[2] }))],
        praise: T.heard,
        key: { type: 'enword' }
      };
    }
  }); }
  numColStep('e02', 0, nm('Tal og farver', 'Numbers and colours'), 5, 4);
  numColStep('e03', 1, nm('Flere tal og farver', 'More numbers and colours'), 10, 9);

  step({
    id: 'e04', grade: 1, name: nm('Hør flere ord', 'Hear more words'),
    pick: function (U, L, easy) { return { e: U.pick(easy ? EASY : REAL).e }; },
    key: function (p) { return p.e; },
    make: function (p, L, U) { var x = byE(p.e); return x && !K.close(x.en, x.da) ? hearTask(x, REAL, U) : null; }
  });

  /* ---------------- class 2: the Danish name, the English word on cards he can hear ---------------- */
  // three English words: the right one and two with another first letter (hard: the same first letter)
  function wordCards(x, U, hard, speak) {
    var pool = REAL.filter(function (y) { return y.en !== x.en; });
    var same = pool.filter(function (y) { return y.en.charAt(0) === x.en.charAt(0); });
    var wr = hard ? U.sample(same, 2) : [];
    U.shuffle(pool.filter(function (y) { return hard || y.en.charAt(0) !== x.en.charAt(0); })).forEach(function (y) {
      if (wr.length < 2 && wr.indexOf(y) < 0) wr.push(y);
    });
    var card = function (y) { var o = { label: y.en }; if (speak) o.say = en(y.en); return o; };
    var ch = U.choice(card(x), wr.map(card), 3);
    if (speak) ch.speak = true;
    return ch;
  }
  function nameTask(x, U, hard, speak) {
    return {
      ui: 'choice', prompt: T.nameP, say: f(T.nameS, { W: cap(x.da) }),
      visual: emo(x.e),
      choice: wordCards(x, U, hard, speak),
      how: [H(f(T.nameH, { W: cap(x.da), e: x.en }), emo(x.e), f(T.nameHS, { en: en(x.en) }))],
      praise: T.good,
      key: { type: 'english' }
    };
  }
  step({
    id: 'e05', grade: 2, name: nm('Find det engelske ord', 'Find the English word'),
    pick: function (U, L, easy) { return { e: U.pick(easy ? EASY : REAL).e }; },
    key: function (p) { return p.e; },
    make: function (p, L, U) { var x = byE(p.e); return x && !K.close(x.en, x.da) ? nameTask(x, U, false, true) : null; }
  });

  /* ---------------- class 3: read an English word ---------------- */
  var READ = REAL.filter(function (x) { return x.en.length <= 8 && /^[a-z]+$/.test(x.en); });
  function readStep(id, name, lo, hi) { step({
    id: id, grade: 3, name: name,
    pick: function (U, L, easy) {
      var pool = READ.filter(function (x) { return x.en.length >= lo && x.en.length <= (easy ? Math.min(hi, lo + 1) : hi); });
      return { e: U.pick(pool).e };
    },
    key: function (p) { return p.e; },
    make: function (p, L, U) {
      var x = byE(p.e);
      if (!x || READ.indexOf(x) < 0 || x.en.length < lo || x.en.length > hi) return null;
      return {
        ui: 'choice', prompt: T.readP, say: T.readS,
        visual: big(x.en),
        choice: picChoice(x, READ, U),
        how: [H(f(T.meanH, { E: cap(x.en), w: x.da }), emo(x.e), f(T.meanHS, { en: en(x.en), W: cap(x.da) }))],
        praise: T.read,
        key: { type: 'enpic' }
      };
    }
  }); }
  readStep('e06', nm('Læs korte ord', 'Read short words'), 3, 4);
  readStep('e07', nm('Læs længere ord', 'Read longer words'), 5, 8);

  /* ---------------- class 4: English words and spelling (Ord's o09 and o10 until slice 3) ---------------- */
  step({
    id: 'e08', grade: 4, name: nm('Engelske ord', 'English words'),
    pick: function (U) { return { e: U.pick(REAL).e }; },
    key: function (p) { return p.e; },
    make: function (p, L, U) { var x = byE(p.e); return x && !K.close(x.en, x.da) ? nameTask(x, U, true, false) : null; }
  });

  var SPELL = REAL.filter(function (x) { return x.en.length >= 3 && x.en.length <= 6 && /^[a-z]+$/.test(x.en); });
  step({
    id: 'e09', grade: 4, name: nm('Stav på engelsk', 'Spell in English'),
    pick: function (U) { return { e: U.pick(SPELL).e }; },
    key: function (p) { return p.e; },
    make: function (p, L, U) {
      var x = byE(p.e);
      if (!x || SPELL.indexOf(x) < 0) return null;
      var ls = K.letters(x.en);
      return K.spellTask(x.e, x.en, 'da', U, 2, {
        prompt: { da: T.spellP }, sayText: f(T.spellS, { W: cap(x.da) }), picName: x.da, wordLang: 'en', alphaLang: 'en',
        how: [H(f(T.nameH, { W: cap(x.da), e: x.en }), emo(x.e), f(T.nameHS, { en: en(x.en) })),
          H(f(T.spellH2, { E: cap(x.en), s: ls.join('-') }), big(K.up(x.en)), f(T.spellH2S, { s: K.spLetters(ls, 'da') }))]
      });
    }
  });

  /* ---------------- class 5: English sentences (Ord's o13 until slice 3) ---------------- */
  step({
    id: 'e10', grade: 5, name: nm('Engelske sætninger', 'English sentences'),
    pick: function (U) { return { i: U.int(0, GAP.length - 1) }; },
    key: function (p) { return 'gap' + p.i; },
    make: function (p, L, U) {
      var it = GAP[p.i];
      if (!it) return null;
      var full = it[0].replace('▢', it[1]);
      return {
        ui: 'choice', prompt: T.gapP, say: T.gapS,
        visual: big(it[0]),
        choice: U.choice({ label: it[1] }, it.slice(2).map(function (w) { return { label: w }; }), it.length - 1),
        how: [H(f(T.gapH, { s: full }), big(full), f(T.gapHS, { en: '[en] ' + full }))],
        praise: T.good,
        key: { type: 'sentence', set: 'gap' }
      };
    }
  });

  var api = { steps: steps, numbers: NUM, colours: COL, en: en };
  G.Content.engelsk = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
