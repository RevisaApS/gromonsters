/* Content: tal (numbers and maths). The ladder of steps, grades 0 to 5, each with a generator.
   A step: {id, grade, name, pick(U, L, easy) -> params, key(params) -> string, make(params, L, U) -> raw task}.
   `easy` is true the first times a step is met: pick then draws from the easy half of the step's range.
   Answers are computed here; G.Brain.verify recomputes them from the question text by its own route.
   The ladder order is set by ORDER at the end of the file, so steps can move without renaming them.
   Audit (2026-11-11, SPEC-2.md section 7): every step was checked against Fælles Mål and the common Danish books
   (Matematrix, Kontext, Format, SuperMatematik) and the test "can a typical child of that class do it in his head
   in about 15 seconds from what the screen shows".
   Speech (every Danish sentence is recorded ahead of time, so the set must stay small):
   - classes 0 and 1 cannot read, so the voice speaks the numbers, in short sentences that many tasks share
     ("Hvad er 6 plus 3?", "Start ved 6.", "Det er 9.");
   - from class 2 the numbers stay on the screen: `say` and every how `say` are a few fixed sentences per step,
     while the prompt, the how text and the pictures show the worked numbers;
   - praise names the strategy and never a number. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  G.Content = G.Content || {};

  function f(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; }); }
  function tx(o, L, v) { return f(o[L] || o.en, v); }
  function H(U, L, text, visual, say) { return { text: text, say: say || U.sp(text, L), visual: visual || null }; }
  function big(text) { return { type: 'big', text: String(text) }; }
  function seq(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o.join(', '); }
  function tiles(vals) { return vals.map(function (v) { return { v: v, label: String(v) }; }); }
  function sortN(a) { return a.slice().sort(function (x, y) { return x - y; }); }

  var MINUS = '−', TIMES = '×';
  var DIV = { da: ':', sv: '/', no: ':', en: '÷' };
  var OF = { da: 'af', sv: 'av', no: 'av', en: 'of' };
  var PCT = { da: ' %', sv: ' %', no: ' %', en: '%' };
  var EMO = ['🐟', '🍎', '🐞', '🦆', '🍓', '🐸', '🚗', '🎈', '🐝', '🍄', '⭐', '🐢'];

  var COMMON = {
    calc: { da: 'Hvad giver det?', sv: 'Vad blir det?', no: 'Hva blir det?', en: 'What is the answer?' },
    whatIs: { da: 'Hvad er {e}?', sv: 'Vad är {e}?', no: 'Hva er {e}?', en: 'What is {e}?' },
    missing: { da: 'Hvad mangler?', sv: 'Vad fattas?', no: 'Hva mangler?', en: 'What is missing?' },
    make: { da: 'Lav {t}', sv: 'Bygg {t}', no: 'Lag {t}', en: 'Make {t}' },
    fewestOrbs: { da: 'Flot! Du brugte så få kugler som muligt.', sv: 'Super! Du använde färst kulor.', no: 'Super! Du brukte færrest kuler.', en: 'Super! You used the fewest orbs.' },
    time: { da: 'Hvad er klokken?', sv: 'Vad är klockan?', no: 'Hva er klokka?', en: 'What time is it?' },
    // the shared number sentence for classes 0 and 1
    is: { da: 'Det er {n}.', sv: 'Det är {n}.', no: 'Det er {n}.', en: 'That is {n}.' },
    // fixed sentences for class 2 and up
    add: { da: 'Læg de to tal sammen.', sv: 'Lägg ihop de två talen.', no: 'Legg sammen de to tallene.', en: 'Add the two numbers.' },
    sub: { da: 'Træk det andet tal fra det første.', sv: 'Ta bort det andra talet från det första.', no: 'Trekk det andre tallet fra det første.', en: 'Take the second number away from the first.' },
    tensFirst: { da: 'Læg tierne sammen først.', sv: 'Lägg ihop tiotalen först.', no: 'Legg sammen tierne først.', en: 'Add the tens first.' },
    onesThen: { da: 'Læg så enerne sammen.', sv: 'Lägg sedan ihop entalen.', no: 'Legg så sammen enerne.', en: 'Then add the ones.' },
    both: { da: 'Læg de to svar sammen.', sv: 'Lägg ihop de två svaren.', no: 'Legg sammen de to svarene.', en: 'Add the two answers.' },
    tensOff: { da: 'Træk tierne fra først.', sv: 'Ta bort tiotalen först.', no: 'Trekk fra tierne først.', en: 'Take away the tens first.' },
    onesOff: { da: 'Træk så enerne fra.', sv: 'Ta sedan bort entalen.', no: 'Trekk så fra enerne.', en: 'Then take away the ones.' },
    tensOnes: { da: 'Ja! Først tierne, så enerne.', sv: 'Rätt! Först tiotalen, sedan entalen.', no: 'Riktig! Først tierne, så enerne.', en: 'Right! The tens first, then the ones.' }
  };
  function sayQ(q, L, U) {
    var m = /^(.*) = ▢$/.exec(q);
    if (m) return tx(COMMON.whatIs, L, { e: U.sp(m[1], L) });
    if (L === 'da') return U.sp(q.replace(' = ', ' giver '), L) + '?';
    return U.sp(q, L) + '?';
  }
  function eqChoice(U, L, q, ans, cands, how, praise, o) {
    var ch = U.numChoice(ans, cands, L, (o && o.n) || 3, o);
    return { ui: 'choice', prompt: tx((o && o.prompt) || COMMON.calc, L), say: (o && o.say) || sayQ(q, L, U), visual: big(q), choice: ch, how: how, praise: praise, key: { type: 'eq', q: q } };
  }
  function is(L, n) { return tx(COMMON.is, L, { n: n }); }

  var steps = [];
  function step(o) { steps.push(o); }

  /* ---------------- grade 0 ---------------- */
  var STAR = { da: ['stjerne', 'stjerner'], sv: ['stjärna', 'stjärnor'], no: ['stjerne', 'stjerner'], en: ['star', 'stars'] };
  function lightStep(id, lo, hi, easyHi, name) {
    step({
      id: id, grade: 0, name: name,
      pick: function (U, L, E) { return { n: U.int(lo, E ? easyHi : hi), m: U.chance(0.5) ? 'num' : 'pic', e: U.int(0, EMO.length - 1) }; },
      key: function (p) { return p.m === 'num' ? 'n' + p.n : 'p' + p.n + EMO[p.e]; },
      make: function (p, L, U) {
        var vis = p.m === 'num' ? big(p.n) : { type: 'dots', n: p.n, emoji: EMO[p.e] };
        var v = { n: p.n, st: (STAR[L] || STAR.en)[p.n === 1 ? 0 : 1], s: seq(1, p.n) };
        var light = tx({ da: 'Tænd {n} {st}.', sv: 'Tänd {n} {st}.', no: 'Tenn {n} {st}.', en: 'Light {n} {st}.' }, L, v);
        var one = tx({ da: 'Tæl én ad gangen.', sv: 'Räkna en i taget.', no: 'Tell én om gangen.', en: 'Count one at a time.' }, L);
        var stop = tx({ da: 'Stop ved {n}.', sv: 'Stanna på {n}.', no: 'Stopp på {n}.', en: 'Stop at {n}.' }, L, v);
        return {
          ui: 'fill',
          prompt: p.m === 'num' ? tx({ da: 'Tænd {n}', sv: 'Tänd {n}', no: 'Tenn {n}', en: 'Light {n}' }, L, p)
            : tx({ da: 'Tænd lige så mange', sv: 'Tänd lika många', no: 'Tenn like mange', en: 'Light the same number' }, L),
          say: p.m === 'num' ? light
            : tx({ da: 'Tæl billederne. Tænd lige så mange stjerner.', sv: 'Räkna bilderna. Tänd lika många stjärnor.', no: 'Tell bildene. Tenn like mange stjerner.', en: 'Count the pictures. Light the same number of stars.' }, L),
          visual: vis,
          fill: { total: 10, need: p.n, shape: 'dots' },
          how: [
            H(U, L, one.replace(/\.$/, ': ') + v.s + '.', { type: 'dots', n: p.n, emoji: p.m === 'pic' ? EMO[p.e] : undefined }, one + ' ' + v.s + '.'),
            H(U, L, stop + ' ' + light, big(p.n), stop + ' ' + light)
          ],
          praise: tx({ da: 'Ja! Du talte én ad gangen.', sv: 'Rätt! Du räknade en i taget.', no: 'Riktig! Du talte én om gangen.', en: 'Right! You counted one at a time.' }, L),
          key: { type: 'fillcount' }
        };
      }
    });
  }
  lightStep('t01', 1, 5, 3, { da: 'Tænd op til 5', sv: 'Tänd upp till 5', no: 'Tenn opp til 5', en: 'Light up to 5' });
  lightStep('t02', 4, 10, 7, { da: 'Tænd op til 10', sv: 'Tänd upp till 10', no: 'Tenn opp til 10', en: 'Light up to 10' });

  step({
    id: 't03', grade: 0, name: { da: 'Tæl ting', sv: 'Räkna saker', no: 'Tell ting', en: 'Count things' },
    pick: function (U, L, E) { return { n: U.int(2, E ? 6 : 10), e: U.int(0, EMO.length - 1) }; },
    key: function (p) { return p.n + EMO[p.e]; },
    make: function (p, L, U) {
      var e = EMO[p.e], s = seq(1, p.n);
      var point = tx({ da: 'Peg på dem én ad gangen, og tæl.', sv: 'Peka på en i taget och räkna.', no: 'Pek på én om gangen og tell.', en: 'Point at each one and count.' }, L);
      var last = tx({ da: 'Det sidste tal, du siger, er svaret.', sv: 'Det sista talet du säger är svaret.', no: 'Det siste tallet du sier, er svaret.', en: 'The last number you say is the answer.' }, L);
      return {
        ui: 'choice',
        prompt: tx({ da: 'Hvor mange?', sv: 'Hur många?', no: 'Hvor mange?', en: 'How many?' }, L),
        say: tx({ da: 'Hvor mange er der? Tæl dem.', sv: 'Hur många är det? Räkna dem.', no: 'Hvor mange er det? Tell dem.', en: 'How many are there? Count them.' }, L),
        visual: { type: 'dots', n: p.n, emoji: e },
        choice: U.numChoice(p.n, [p.n - 1, p.n + 1, p.n + 2, p.n - 2], L, 3, { min: 1 }),
        how: [
          H(U, L, point.replace(/\.$/, ': ') + s + '.', { type: 'dots', n: p.n, emoji: e }, point + ' ' + s + '.'),
          H(U, L, last.replace(/\.$/, ': ') + p.n + '.', big(p.n), last + ' ' + is(L, p.n))
        ],
        praise: tx({ da: 'Ja! Du pegede og talte.', sv: 'Rätt! Du pekade och räknade.', no: 'Riktig! Du pekte og talte.', en: 'Right! You pointed and counted.' }, L),
        key: { type: 'count' }
      };
    }
  });

  step({
    id: 't04', grade: 0, name: { da: 'Tal der giver 5', sv: 'Tal som blir 5', no: 'Tall som blir 5', en: 'Make 5' },
    pick: function (U, L, E) {
      var t = U.pick(E ? [3, 4, 5] : [3, 4, 5, 5, 5]), a = U.int(1, t - 1), b = t - a;
      var vals = [a, b];
      var extra = E ? 1 : U.int(2, 3);
      while (vals.length < 2 + extra) vals.push(U.int(1, Math.min(4, t - 1)));
      return { t: t, a: a, b: b, v: sortN(vals) };
    },
    key: function (p) { return p.t + ':' + p.v.join(''); },
    make: function (p, L, U) {
      var take = tx({ da: 'Tag {a}.', sv: 'Ta {a}.', no: 'Ta {a}.', en: 'Take {a}.' }, L, p);
      var need = tx({ da: 'Så mangler du {b}.', sv: 'Då fattas {b}.', no: 'Da mangler du {b}.', en: 'Then you need {b} more.' }, L, p);
      return {
        ui: 'build',
        prompt: tx(COMMON.make, L, p),
        say: tx({ da: 'Lav {t}. Tag kugler, der giver {t} tilsammen.', sv: 'Bygg {t}. Ta kulor som blir {t} tillsammans.', no: 'Lag {t}. Ta kuler som blir {t} til sammen.', en: 'Make {t}. Pick orbs that add up to {t}.' }, L, p),
        visual: { type: 'dots', n: p.t },
        build: { target: p.t, op: 'sum', tiles: tiles(U.shuffle(p.v)) },
        how: [
          H(U, L, take + ' ' + need, { type: 'dots', n: p.a }, take + ' ' + need),
          H(U, L, p.a + ' + ' + p.b + ' = ' + p.t, big(p.a + ' + ' + p.b + ' = ' + p.t), is(L, p.t))
        ],
        praise: tx({ da: 'Ja! Det passer præcis.', sv: 'Rätt! Det blev exakt.', no: 'Riktig! Det ble akkurat.', en: 'Right! That is exactly it.' }, L),
        key: { type: 'eq', q: '▢ = ' + p.t }
      };
    }
  });

  step({
    id: 't05', grade: 0, name: { da: 'Tiervenner', sv: 'Tiokamrater', no: 'Tiervenner', en: 'Pairs that make 10' },
    pick: function (U, L, E) { return { n: U.int(E ? 5 : 1, 9), e: U.int(-1, 4) }; },
    key: function (p) { return p.n + (p.e >= 0 ? EMO[p.e] : ''); },
    make: function (p, L, U) {
      var m = 10 - p.n, dots = { type: 'dots', n: p.n, frame: 10 };
      if (p.e >= 0) dots.emoji = EMO[p.e];
      return {
        ui: 'choice',
        prompt: tx({ da: 'Hvor mange mangler til 10?', sv: 'Hur många fattas till 10?', no: 'Hvor mange mangler til 10?', en: 'How many more make 10?' }, L),
        say: tx({ da: 'Der er {n}. Hvor mange mangler til 10?', sv: 'Det är {n}. Hur många fattas till 10?', no: 'Det er {n}. Hvor mange mangler til 10?', en: 'There are {n}. How many more make 10?' }, L, p),
        visual: dots,
        choice: U.numChoice(m, [m + 1, m - 1, p.n !== m ? p.n : m + 2], L, 3, { min: 0, max: 10 }),
        how: [
          H(U, L, tx({ da: 'Tæl de tomme felter.', sv: 'Räkna de tomma rutorna.', no: 'Tell de tomme rutene.', en: 'Count the empty boxes.' }, L), dots),
          H(U, L, p.n + ' + ' + m + ' = 10', big(p.n + ' + ' + m + ' = 10'), is(L, m))
        ],
        praise: tx({ da: 'Ja! Tiervenner giver 10.', sv: 'Rätt! Tiokamrater blir 10.', no: 'Riktig! Tiervenner blir 10.', en: 'Right! Those two make 10.' }, L),
        key: { type: 'eq', q: p.n + ' + ▢ = 10' }
      };
    }
  });

  /* ---------------- grade 1 ---------------- */
  var START = { da: 'Start ved {a}.', sv: 'Börja på {a}.', no: 'Start på {a}.', en: 'Start at {a}.' };
  step({
    id: 't06', grade: 1, name: { da: 'Plus til 10', sv: 'Plus till 10', no: 'Pluss til 10', en: 'Adding within 10' },
    pick: function (U, L, E) {
      if (E) { var e = U.int(2, 7); return { a: e, b: U.int(1, Math.min(3, 10 - e)) }; }
      var a = U.int(1, 8); return { a: a, b: U.int(1, 10 - a) };
    },
    key: function (p) { return p.a + '+' + p.b; },
    make: function (p, L, U) {
      var s = p.a + p.b, bg = Math.max(p.a, p.b), sm = Math.min(p.a, p.b), q = p.a + ' + ' + p.b + ' = ▢', v = { a: bg, sm: sm };
      var st = tx({ da: 'Start ved det største tal, {a}.', sv: 'Börja på det största talet, {a}.', no: 'Start på det største tallet, {a}.', en: 'Start on the bigger number, {a}.' }, L, v);
      var on = tx({ da: 'Tæl {sm} frem.', sv: 'Räkna {sm} steg fram.', no: 'Tell {sm} fram.', en: 'Count on {sm}.' }, L, v);
      return eqChoice(U, L, q, s, [s + 1, s - 1, s + 2], [
        H(U, L, st + ' ' + on, { type: 'line', min: 0, max: 10, at: bg, hop: { from: bg, by: sm } }, st + ' ' + on),
        H(U, L, bg + ' + ' + sm + ' = ' + s, big(bg + ' + ' + sm + ' = ' + s), is(L, s))
      ], tx({ da: 'Ja! Du talte frem fra det største tal.', sv: 'Rätt! Du räknade fram från det största talet.', no: 'Riktig! Du talte fram fra det største tallet.', en: 'Right! You counted on from the bigger number.' }, L), { min: 1 });
    }
  });

  step({
    id: 't07', grade: 1, name: { da: 'Minus til 10', sv: 'Minus till 10', no: 'Minus til 10', en: 'Taking away within 10' },
    pick: function (U, L, E) { var a = U.int(3, E ? 7 : 10); return { a: a, b: U.int(1, E ? Math.min(3, a - 1) : a - 1) }; },
    key: function (p) { return p.a + '-' + p.b; },
    make: function (p, L, U) {
      var d = p.a - p.b, q = p.a + ' ' + MINUS + ' ' + p.b + ' = ▢';
      var st = tx(START, L, p), back = tx({ da: 'Gå {b} tilbage.', sv: 'Gå {b} steg bakåt.', no: 'Gå {b} tilbake.', en: 'Count back {b}.' }, L, p);
      return eqChoice(U, L, q, d, [p.a + p.b, d + 1, d - 1], [
        H(U, L, st + ' ' + back, { type: 'line', min: 0, max: 10, at: p.a, hop: { from: p.a, by: -p.b } }, st + ' ' + back),
        H(U, L, p.a + ' ' + MINUS + ' ' + p.b + ' = ' + d, big(p.a + ' ' + MINUS + ' ' + p.b + ' = ' + d), is(L, d))
      ], tx({ da: 'Ja! Du gik tilbage på tallinjen.', sv: 'Rätt! Du gick bakåt på tallinjen.', no: 'Riktig! Du gikk tilbake på tallinjen.', en: 'Right! You counted back on the number line.' }, L));
    }
  });

  step({
    id: 't08', grade: 1, name: { da: 'Lav 10 med mange kugler', sv: 'Bygg 10 av många', no: 'Lag 10 av mange', en: 'Make 10 from many' },
    pick: function (U, L, E) {
      var parts = [], left = 10;
      while (left > 0) { var x = Math.min(left, U.int(1, 4)); parts.push(x); left -= x; }
      if (parts.length < 3 || parts.length > (E ? 4 : 5)) return null;
      var vals = parts.slice(), extra = E ? 1 : U.int(1, 2);
      for (var i = 0; i < extra; i++) vals.push(U.int(1, 4));
      return { parts: parts, v: sortN(vals) };
    },
    key: function (p) { return p.v.join(''); },
    make: function (p, L, U) {
      var run = [], acc = p.parts[0];
      for (var i = 1; i < p.parts.length; i++) { run.push(acc + ' + ' + p.parts[i] + ' = ' + (acc + p.parts[i])); acc += p.parts[i]; }
      var sum = p.parts.join(' + ') + ' = 10';
      return {
        ui: 'build',
        prompt: tx(COMMON.make, L, { t: 10 }),
        say: tx({ da: 'Lav 10 med tre eller flere kugler.', sv: 'Bygg 10 med tre eller fler kulor.', no: 'Lag 10 med tre eller flere kuler.', en: 'Make 10 with three or more orbs.' }, L),
        visual: { type: 'dots', n: 10, frame: 10 },
        build: { target: 10, op: 'sum', tiles: tiles(U.shuffle(p.v)) },
        how: [
          H(U, L, tx({ da: 'Læg én kugle i ad gangen. Se, hvad det giver.', sv: 'Lägg i en kula i taget. Se vad det blir.', no: 'Legg i én kule om gangen. Se hva det blir.', en: 'Add one orb at a time. See what it makes.' }, L), big(p.parts.join(' + '))),
          H(U, L, run.slice(0, 3).join(', '), big(sum), tx({ da: 'Til sidst har du 10.', sv: 'Till sist har du 10.', no: 'Til slutt har du 10.', en: 'In the end you have 10.' }, L))
        ],
        praise: tx({ da: 'Ja! Det passer præcis.', sv: 'Rätt! Det blev exakt.', no: 'Riktig! Det ble akkurat.', en: 'Right! That is exactly it.' }, L),
        key: { type: 'eq', q: '▢ = 10' }
      };
    }
  });

  step({
    id: 't09', grade: 1, name: { da: 'Over 10: lav 10 først', sv: 'Över 10: gör 10 först', no: 'Over 10: lag 10 først', en: 'Past 10: make 10 first' },
    pick: function (U, L, E) {
      var a = E ? U.int(8, 9) : U.int(6, 9), t = U.int(11, Math.min(E ? 14 : 18, a + 9)), m = t - a, c = 10 - a, r = t - 10;
      if (m <= c) return null;
      var vals = [c, r], tries = 0;
      while (vals.length < 5 && tries++ < 40) {
        var x = U.int(1, 9);
        if (x !== m) vals.push(x);
      }
      return { a: a, t: t, v: sortN(vals) };
    },
    key: function (p) { return p.a + '+?=' + p.t + ':' + p.v.join(''); },
    make: function (p, L, U) {
      var m = p.t - p.a, c = 10 - p.a, r = p.t - 10, q = p.a + ' + ▢ = ' + p.t, v = { a: p.a, t: p.t, m: m, c: c, r: r };
      var sum = tx({ da: 'Læg dem sammen.', sv: 'Lägg ihop dem.', no: 'Legg dem sammen.', en: 'Add them up.' }, L);
      return {
        ui: 'build',
        prompt: tx(COMMON.missing, L),
        say: tx({ da: '{a} plus hvad giver {t}? Byg det med kuglerne.', sv: '{a} plus vad blir {t}? Bygg det med kulorna.', no: '{a} pluss hva blir {t}? Bygg det med kulene.', en: '{a} plus what makes {t}? Build it with the orbs.' }, L, v),
        visual: big(q),
        build: { target: m, op: 'sum', tiles: tiles(U.shuffle(p.v)), confirm: true },
        how: [
          H(U, L, tx({ da: '{a} mangler {c} for at nå 10.', sv: '{a} behöver {c} för att bli 10.', no: '{a} trenger {c} for å bli 10.', en: '{a} needs {c} to make 10.' }, L, v), { type: 'dots', n: p.a, frame: 10 }),
          H(U, L, tx({ da: 'Fra 10 til {t} er der {r}.', sv: 'Från 10 till {t} är det {r}.', no: 'Fra 10 til {t} er det {r}.', en: 'From 10 to {t} is {r} more.' }, L, v), { type: 'line', min: 0, max: 20, at: p.t, hop: { from: 10, by: r } }),
          H(U, L, c + ' + ' + r + ' = ' + m + '. ' + p.a + ' + ' + m + ' = ' + p.t + '.', big(p.a + ' + ' + c + ' + ' + r + ' = ' + p.t), sum + ' ' + is(L, m))
        ],
        praise: tx({ da: 'Ja! Du fandt det, der mangler.', sv: 'Rätt! Du hittade det som fattas.', no: 'Riktig! Du fant det som mangler.', en: 'Right! You found what was missing.' }, L),
        smartPraise: tx({ da: 'Flot! Du lavede 10 først.', sv: 'Super! Du gjorde 10 först.', no: 'Super! Du lagde 10 først.', en: 'Super! You made ten first.' }, L),
        key: { type: 'eq', q: q, smart: { id: 'make10', type: 'prefix', v: c } }
      };
    }
  });

  step({
    id: 't10', grade: 1, name: { da: 'Minus til 20', sv: 'Minus till 20', no: 'Minus til 20', en: 'Taking away within 20' },
    pick: function (U, L, E) {
      var a = U.int(11, E ? 14 : 18), u = a - 10, b = U.int(u + 1, E ? Math.min(9, u + 3) : 9);
      return { a: a, b: b };
    },
    key: function (p) { return p.a + '-' + p.b; },
    make: function (p, L, U) {
      var d = p.a - p.b, u = p.a - 10, rest = p.b - u, q = p.a + ' ' + MINUS + ' ' + p.b + ' = ▢', v = { a: p.a, u: u, rest: rest, d: d };
      var first = tx({ da: 'Gå først {u} ned til 10.', sv: 'Gå först {u} steg ner till 10.', no: 'Gå først {u} ned til 10.', en: 'First go {u} down to 10.' }, L, v);
      var then = tx({ da: 'Gå så {rest} mere ned.', sv: 'Gå sedan {rest} steg till.', no: 'Gå så {rest} til ned.', en: 'Then go {rest} more down.' }, L, v);
      return eqChoice(U, L, q, d, [d + 1, d - 1, d + 2], [
        H(U, L, first.replace(/\.$/, ': ') + p.a + ' − ' + u + ' = 10.', { type: 'line', min: 0, max: 20, at: p.a, hop: { from: p.a, by: -u } }, first),
        H(U, L, then.replace(/\.$/, ': ') + '10 − ' + rest + ' = ' + d + '.', { type: 'line', min: 0, max: 20, at: d, hop: { from: 10, by: -rest } }, then + ' ' + is(L, d))
      ], tx({ da: 'Ja! Først ned til 10, så resten.', sv: 'Rätt! Ner till 10 först, sedan resten.', no: 'Riktig! Ned til 10 først, så resten.', en: 'Right! Down to 10 first, then the rest.' }, L), { min: 0 });
    }
  });

  step({
    id: 't11', grade: 1, name: { da: 'Dobbelt og næsten dobbelt', sv: 'Dubbelt och nästan dubbelt', no: 'Dobbelt og nesten dobbelt', en: 'Doubles and near doubles' },
    pick: function (U, L, E) {
      var hi = E ? 5 : 10;
      if (U.chance(0.45)) { var a = U.int(2, hi); return { a: a, b: a }; }
      var x = U.int(2, hi - 1);
      return U.chance(0.5) ? { a: x, b: x + 1 } : { a: x + 1, b: x };
    },
    key: function (p) { return p.a + '+' + p.b; },
    make: function (p, L, U) {
      var s = p.a + p.b, q = p.a + ' + ' + p.b + ' = ▢', x = Math.min(p.a, p.b), dd = 2 * x, v = { a: p.a, b: p.b, x: x, dd: dd, s: s };
      var how, praise;
      if (p.a === p.b) {
        var rows = tx({ da: 'To lige lange rækker med {a} i hver.', sv: 'Två lika långa rader med {a} i varje.', no: 'To like lange rader med {a} i hver.', en: 'Two equal rows with {a} in each.' }, L, v);
        how = [H(U, L, rows, { type: 'dots', n: s }, rows), H(U, L, q.replace('▢', s), big(q.replace('▢', s)), is(L, s))];
        praise = tx({ da: 'Ja! Du brugte det dobbelte.', sv: 'Rätt! Du använde dubbelt.', no: 'Riktig! Du brukte dobbelt.', en: 'Right! You used a double.' }, L);
      } else {
        var dbl = tx({ da: 'Det dobbelte af {x} er {dd}.', sv: 'Dubbelt {x} är {dd}.', no: 'Dobbelt {x} er {dd}.', en: 'Double {x} is {dd}.' }, L, v);
        var more = tx({ da: 'Og så én mere.', sv: 'Och sedan en till.', no: 'Og så én til.', en: 'And then one more.' }, L);
        how = [H(U, L, dbl, big(x + ' + ' + x + ' = ' + dd), dbl), H(U, L, more, big(q.replace('▢', s)), more + ' ' + is(L, s))];
        praise = tx({ da: 'Ja! Det dobbelte og så én mere.', sv: 'Rätt! Dubbelt och en till.', no: 'Riktig! Dobbelt og én til.', en: 'Right! A double and one more.' }, L);
      }
      return eqChoice(U, L, q, s, [s + 1, s - 1, s + 2, s - 2], how, praise);
    }
  });

  /* ---------------- grade 2 ---------------- */
  step({
    id: 't12', grade: 2, name: { da: 'Tiere og enere', sv: 'Tiotal och ental', no: 'Tiere og enere', en: 'Tens and ones' },
    pick: function (U, L, E) { return { t: U.int(1, E ? 3 : 5), o: U.int(1, 9) }; },
    key: function (p) { return String(p.t * 10 + p.o); },
    make: function (p, L, U) {
      var T = p.t * 10 + p.o, vals = [], i;
      for (i = 0; i <= p.t; i++) vals.push(10);
      var ones = p.o;
      if (p.o >= 5) { vals.push(5); ones = p.o - 5; }
      for (i = 0; i <= ones; i++) vals.push(1);
      var plan = [];
      for (i = 0; i < p.t; i++) plan.push(10);
      if (p.o >= 5) plan.push(5);
      for (i = 0; i < ones; i++) plan.push(1);
      var TEN = { da: ['tier', 'tiere'], sv: ['tiotal', 'tiotal'], no: ['tier', 'tiere'], en: ['ten', 'tens'] }[L], ONE = { da: ['ener', 'enere'], sv: ['ental', 'ental'], no: ['ener', 'enere'], en: ['one', 'ones'] }[L];
      var v = { T: T, t: p.t, o: p.o, tt: p.t * 10, plan: plan.join(' + '), tw: TEN[p.t === 1 ? 0 : 1], ow: ONE[p.o === 1 ? 0 : 1] };
      return {
        ui: 'build',
        prompt: tx(COMMON.make, L, { t: T }),
        say: tx({ da: 'Lav tallet med tiere og enere.', sv: 'Bygg talet med tiotal och ental.', no: 'Lag tallet med tiere og enere.', en: 'Make the number with tens and ones.' }, L),
        visual: big(T),
        build: { target: T, op: 'sum', tiles: tiles(U.shuffle(vals)) },
        how: [
          H(U, L, tx({ da: '{T} har {t} {tw} og {o} {ow}.', sv: '{T} har {t} {tw} och {o} {ow}.', no: '{T} har {t} {tw} og {o} {ow}.', en: '{T} has {t} {tw} and {o} {ow}.' }, L, v), big(T + ' = ' + v.tt + ' + ' + p.o),
            tx({ da: 'Tag tierne først.', sv: 'Ta tiotalen först.', no: 'Ta tierne først.', en: 'Take the tens first.' }, L)),
          H(U, L, tx({ da: 'Med færrest kugler: {plan}.', sv: 'Färst kulor: {plan}.', no: 'Færrest kuler: {plan}.', en: 'Fewest orbs: {plan}.' }, L, v), big(T),
            tx({ da: 'Tag så enerne. Brug så få kugler som muligt.', sv: 'Ta sedan entalen. Använd så få kulor som möjligt.', no: 'Ta så enerne. Bruk så få kuler som mulig.', en: 'Then take the ones. Use as few orbs as you can.' }, L))
        ],
        praise: tx(COMMON.tensOnes, L),
        smartPraise: tx(COMMON.fewestOrbs, L),
        key: { type: 'eq', q: '▢ = ' + T, smart: { id: 'fewest', type: 'fewest' } }
      };
    }
  });

  step({
    id: 't13', grade: 2, name: { da: 'Plus enere eller tiere', sv: 'Plus ental eller tiotal', no: 'Pluss enere eller tiere', en: 'Add ones or tens' },
    pick: function (U, L, E) {
      var a = U.int(11, E ? 49 : 79), ao = a % 10;
      if (U.chance(0.5)) { if (ao > 8) return null; return { a: a, b: U.int(1, 9 - ao), k: 'o' }; }
      var maxT = Math.floor((99 - a) / 10);
      if (maxT < 1) return null;
      return { a: a, b: 10 * U.int(1, Math.min(E ? 3 : 5, maxT)), k: 't' };
    },
    key: function (p) { return p.a + '+' + p.b; },
    make: function (p, L, U) {
      var s = p.a + p.b, q = p.a + ' + ' + p.b + ' = ▢', ao = p.a % 10, at = p.a - ao;
      var v = { a: p.a, b: p.b, s: s, ao: ao, so: ao + p.b, at: at, st: at + p.b };
      var say = { say: tx(COMMON.add, L) };
      if (p.k === 'o') {
        return eqChoice(U, L, q, s, [s - 1, s + 1, p.a + 10 * p.b <= 99 ? p.a + 10 * p.b : s + 10], [
          H(U, L, tx({ da: 'Læg enerne sammen: {ao} + {b} = {so}.', sv: 'Lägg ihop entalen: {ao} + {b} = {so}.', no: 'Legg sammen enerne: {ao} + {b} = {so}.', en: 'Add the ones: {ao} + {b} = {so}.' }, L, v), big(ao + ' + ' + p.b + ' = ' + v.so),
            tx({ da: 'Læg enerne sammen.', sv: 'Lägg ihop entalen.', no: 'Legg sammen enerne.', en: 'Add the ones.' }, L)),
          H(U, L, tx({ da: 'Tierne er de samme: {s}.', sv: 'Tiotalen är desamma: {s}.', no: 'Tierne er de samme: {s}.', en: 'The tens stay the same: {s}.' }, L, v), big(q.replace('▢', s)),
            tx({ da: 'Tierne er de samme.', sv: 'Tiotalen är desamma.', no: 'Tierne er de samme.', en: 'The tens stay the same.' }, L))
        ], tx({ da: 'Ja! Enere plus enere.', sv: 'Rätt! Ental med ental.', no: 'Riktig! Enere med enere.', en: 'Right! Ones with ones.' }, L), say);
      }
      return eqChoice(U, L, q, s, [p.a + p.b / 10, s + 10, s - 1, s + 1], [
        H(U, L, tx({ da: 'Læg tierne sammen: {at} + {b} = {st}.', sv: 'Lägg ihop tiotalen: {at} + {b} = {st}.', no: 'Legg sammen tierne: {at} + {b} = {st}.', en: 'Add the tens: {at} + {b} = {st}.' }, L, v), big(at + ' + ' + p.b + ' = ' + v.st),
          tx({ da: 'Læg tierne sammen.', sv: 'Lägg ihop tiotalen.', no: 'Legg sammen tierne.', en: 'Add the tens.' }, L)),
        H(U, L, tx({ da: 'Enerne er de samme: {s}.', sv: 'Entalen är desamma: {s}.', no: 'Enerne er de samme: {s}.', en: 'The ones stay the same: {s}.' }, L, v), big(q.replace('▢', s)),
          tx({ da: 'Enerne er de samme.', sv: 'Entalen är desamma.', no: 'Enerne er de samme.', en: 'The ones stay the same.' }, L))
      ], tx({ da: 'Ja! Tiere plus tiere.', sv: 'Rätt! Tiotal med tiotal.', no: 'Riktig! Tiere med tiere.', en: 'Right! Tens with tens.' }, L), say);
    }
  });

  // Plus within 100. Easy half: no carry (34 + 25). Hard half: carry, the second number at most 29 (47 + 26).
  step({
    id: 't14', grade: 2, name: { da: 'Plus til 100', sv: 'Plus till 100', no: 'Pluss til 100', en: 'Adding within 100' },
    pick: function (U, L, E) {
      var a = U.int(14, 69), b = U.int(12, Math.min(29, 99 - a)), carry = (a % 10) + (b % 10) >= 10;
      if (b % 10 === 0 || a % 10 === 0 || carry === !!E) return null;
      return { a: a, b: b };
    },
    key: function (p) { return p.a + '+' + p.b; },
    make: function (p, L, U) {
      var s = p.a + p.b, q = p.a + ' + ' + p.b + ' = ▢', ao = p.a % 10, bo = p.b % 10;
      var v = { at: p.a - ao, bt: p.b - bo, ao: ao, bo: bo, st: p.a - ao + p.b - bo, so: ao + bo, s: s };
      return eqChoice(U, L, q, s, [s - 10, s + 1, s - 1, s + 10], [
        H(U, L, tx({ da: 'Tiere først: {at} + {bt} = {st}.', sv: 'Tiotal först: {at} + {bt} = {st}.', no: 'Tiere først: {at} + {bt} = {st}.', en: 'Tens first: {at} + {bt} = {st}.' }, L, v), big(v.at + ' + ' + v.bt + ' = ' + v.st), tx(COMMON.tensFirst, L)),
        H(U, L, tx({ da: 'Så enerne: {ao} + {bo} = {so}.', sv: 'Sedan entalen: {ao} + {bo} = {so}.', no: 'Så enerne: {ao} + {bo} = {so}.', en: 'Then the ones: {ao} + {bo} = {so}.' }, L, v), big(ao + ' + ' + bo + ' = ' + v.so), tx(COMMON.onesThen, L)),
        H(U, L, v.st + ' + ' + v.so + ' = ' + s, big(q.replace('▢', s)), tx(COMMON.both, L))
      ], tx(COMMON.tensOnes, L), { say: tx(COMMON.add, L) });
    }
  });

  // Minus within 100. Easy half: no borrowing (68 − 25). Hard half: borrowing, the second number at most 29 (52 − 17).
  step({
    id: 't15', grade: 2, name: { da: 'Minus til 100', sv: 'Minus till 100', no: 'Minus til 100', en: 'Subtracting within 100' },
    pick: function (U, L, E) {
      var a = U.int(31, 99), b = U.int(11, Math.min(29, a - 10)), borrow = (b % 10) > (a % 10);
      if (b % 10 === 0 || (E && borrow)) return null;
      return { a: a, b: b };
    },
    key: function (p) { return p.a + '-' + p.b; },
    make: function (p, L, U) {
      var d = p.a - p.b, q = p.a + ' ' + MINUS + ' ' + p.b + ' = ▢', bo = p.b % 10, bt = p.b - bo, x = p.a - bt;
      var v = { a: p.a, bt: bt, bo: bo, x: x, d: d };
      return eqChoice(U, L, q, d, [d + 10, d - 10, d + 1, d - 1], [
        H(U, L, tx({ da: 'Træk tierne fra: {a} − {bt} = {x}.', sv: 'Ta bort tiotalen: {a} − {bt} = {x}.', no: 'Trekk fra tierne: {a} − {bt} = {x}.', en: 'Take away the tens: {a} − {bt} = {x}.' }, L, v), big(p.a + ' ' + MINUS + ' ' + bt + ' = ' + x), tx(COMMON.tensOff, L)),
        H(U, L, tx({ da: 'Træk så enerne fra: {x} − {bo} = {d}.', sv: 'Ta bort entalen: {x} − {bo} = {d}.', no: 'Trekk fra enerne: {x} − {bo} = {d}.', en: 'Take away the ones: {x} − {bo} = {d}.' }, L, v), big(x + ' ' + MINUS + ' ' + bo + ' = ' + d), tx(COMMON.onesOff, L))
      ], tx(COMMON.tensOnes, L), { say: tx(COMMON.sub, L) });
    }
  });

  step({
    id: 't16', grade: 2, name: { da: '2-, 5- og 10-tabellen', sv: '2:ans, 5:ans och 10:ans tabell', no: '2-, 5- og 10-gangen', en: '2, 5 and 10 times tables' },
    pick: function (U, L, E) {
      var k = U.pick([2, 5, 10]), fct = U.int(2, E ? 5 : 10), T = k * fct, vals = [k, fct], tries = 0;
      while (vals.length < 5 && tries++ < 40) { var x = U.int(1, 10); if (x !== T) vals.push(x); }
      return { k: k, f: fct, v: sortN(vals) };
    },
    key: function (p) { return (p.k * p.f) + ':' + p.v.join('.'); },
    make: function (p, L, U) {
      var T = p.k * p.f, skips = [];
      for (var i = 1; i <= p.f; i++) skips.push(p.k * i);
      var v = { T: T, k: p.k, f: p.f, s: skips.join(', ') };
      return {
        ui: 'build',
        prompt: tx({ da: 'Hvilke to tal giver {T}, når du ganger?', sv: 'Välj två tal som gånger varandra blir {T}', no: 'Velg to tall som ganget blir {T}', en: 'Pick two numbers that multiply to {T}' }, L, v),
        say: tx({ da: 'Find to tal, der giver tallet, når du ganger dem.', sv: 'Välj två tal som blir talet när du tar dem gånger varandra.', no: 'Velg to tall som blir tallet når du ganger dem.', en: 'Pick two numbers that make the number when you multiply them.' }, L),
        visual: big(T),
        build: { target: T, op: 'product', tiles: tiles(U.shuffle(p.v)) },
        how: [
          H(U, L, tx({ da: 'Tæl i {k}-spring: {s}.', sv: 'Räkna med hopp om {k}: {s}.', no: 'Tell i hopp på {k}: {s}.', en: 'Count in {k}s: {s}.' }, L, v), { type: 'line', min: 0, max: Math.max(20, T), at: T, marks: skips },
            tx({ da: 'Tæl i {k}-spring.', sv: 'Räkna med hopp om {k}.', no: 'Tell i hopp på {k}.', en: 'Count in {k}s.' }, L, v)),
          H(U, L, tx({ da: '{f} spring på {k}: {f} × {k} = {T}.', sv: '{f} hopp om {k}: {f} × {k} = {T}.', no: '{f} hopp på {k}: {f} × {k} = {T}.', en: '{f} jumps of {k}: {f} × {k} = {T}.' }, L, v), big(p.f + ' ' + TIMES + ' ' + p.k + ' = ' + T),
            tx({ da: 'Tæl, hvor mange spring du tog.', sv: 'Räkna hur många hopp du tog.', no: 'Tell hvor mange hopp du tok.', en: 'Count how many jumps you made.' }, L))
        ],
        praise: tx({ da: 'Ja! Du talte i spring.', sv: 'Rätt! Du räknade med hopp.', no: 'Riktig! Du talte i hopp.', en: 'Right! You counted in jumps.' }, L),
        key: { type: 'eq', q: '▢ = ' + T }
      };
    }
  });

  step({
    id: 't17', grade: 2, name: { da: 'Tæl i spring', sv: 'Räkna med hopp', no: 'Tell med hopp', en: 'Skip counting' },
    pick: function (U, L, E) { var k = U.pick(E ? [2, 10] : [2, 5, 10]); return { k: k, s: k * U.int(0, E ? 3 : 6), n: U.int(5, 6) }; },
    key: function (p) { return p.k + ':' + p.s + ':' + p.n; },
    make: function (p, L, U) {
      var items = [], i;
      for (i = 0; i < p.n - 1; i++) items.push(String(p.s + i * p.k));
      var last = p.s + (p.n - 2) * p.k, ans = last + p.k;
      items.push('?');
      var v = { k: p.k, last: last, ans: ans };
      return {
        ui: 'choice',
        prompt: tx({ da: 'Hvilket tal kommer nu?', sv: 'Vilket tal kommer sedan?', no: 'Hvilket tall kommer nå?', en: 'Which number comes next?' }, L),
        say: tx({ da: 'Hvilket tal kommer nu?', sv: 'Vilket tal kommer sedan?', no: 'Hvilket tall kommer nå?', en: 'Which number comes next?' }, L),
        visual: { type: 'seq', items: items },
        choice: U.numChoice(ans, [last + 1, ans + p.k, ans + 1, ans - 1], L, 3),
        how: [
          H(U, L, tx({ da: 'Tallet bliver {k} større hver gang.', sv: 'Det blir {k} mer varje gång.', no: 'Det blir {k} mer hver gang.', en: 'It goes up by {k} each time.' }, L, v), { type: 'seq', items: items },
            tx({ da: 'Se, hvor meget tallet bliver større hver gang.', sv: 'Se hur mycket talet växer varje gång.', no: 'Se hvor mye tallet vokser hver gang.', en: 'See how much the number grows each time.' }, L)),
          H(U, L, last + ' + ' + p.k + ' = ' + ans, big(last + ' + ' + p.k + ' = ' + ans),
            tx({ da: 'Læg det samme til én gang til.', sv: 'Lägg till lika mycket en gång till.', no: 'Legg til like mye én gang til.', en: 'Add the same once more.' }, L))
        ],
        praise: tx({ da: 'Ja! Samme spring hver gang.', sv: 'Rätt! Samma hopp varje gång.', no: 'Riktig! Samme hopp hver gang.', en: 'Right! The same jump each time.' }, L),
        key: { type: 'seqnum' }
      };
    }
  });

  function clockLbl(h, m) { return h + ':' + (m < 10 ? '0' : '') + m; }
  function nextH(h) { return h % 12 + 1; }
  var SMALL = { da: 'Se så på den lille viser.', sv: 'Titta sedan på den korta visaren.', no: 'Se så på den korte viseren.', en: 'Then look at the short hand.' };
  step({
    id: 't18', grade: 1, name: { da: 'Hel og halv time', sv: 'Hel och halv timme', no: 'Hel og halv time', en: "O'clock and half past" },
    pick: function (U, L, E) { return { h: U.int(1, 12), m: E || U.chance(0.5) ? 0 : 30 }; },
    key: function (p) { return clockLbl(p.h, p.m); },
    make: function (p, L, U) {
      var lbl = clockLbl(p.h, p.m), v = { h: p.h, h1: nextH(p.h), lbl: lbl };
      var wr = p.m === 0 ? [clockLbl(p.h, 30), clockLbl(nextH(p.h), 0)] : [clockLbl(nextH(p.h), 30), clockLbl(p.h, 0)];
      // the clock is said in words: a small, fixed set ("Klokken er 3.", "Klokken er halv 4.")
      var said = p.m === 0 ? tx({ da: 'Klokken er {h}.', sv: 'Klockan är {h}.', no: 'Klokka er {h}.', en: "It is {h} o'clock." }, L, v)
        : tx({ da: 'Klokken er halv {h1}.', sv: 'Klockan är halv {h1}.', no: 'Klokka er halv {h1}.', en: 'It is half past {h}.' }, L, v);
      var how = p.m === 0 ? [
        H(U, L, tx({ da: 'Den store viser peger på 12. Så er klokken hel.', sv: 'Den långa visaren pekar på 12. Då är det hel timme.', no: 'Den lange viseren peker på 12. Da er det hel time.', en: "The long hand points to 12. That means o'clock." }, L), { type: 'clock', h: p.h, m: p.m }),
        H(U, L, tx({ da: 'Den lille viser peger på {h}. Klokken er {lbl}.', sv: 'Den korta visaren pekar på {h}. Klockan är {lbl}.', no: 'Den korte viseren peker på {h}. Klokka er {lbl}.', en: 'The short hand points to {h}. It is {lbl}.' }, L, v), big(lbl), tx(SMALL, L) + ' ' + said)
      ] : [
        H(U, L, tx({ da: 'Den store viser peger på 6. Det er en halv time over {h}.', sv: 'Den långa visaren pekar på 6. Det är 30 minuter över.', no: 'Den lange viseren peker på 6. Det er 30 minutter over.', en: 'The long hand points to 6. That is 30 minutes past.' }, L, v), { type: 'clock', h: p.h, m: p.m },
          tx({ da: 'Den store viser peger på 6. Det er en halv time.', sv: 'Den långa visaren pekar på 6. Det är en halvtimme.', no: 'Den lange viseren peker på 6. Det er en halvtime.', en: 'The long hand points to 6. That is half an hour.' }, L)),
        H(U, L, tx({ da: 'Den lille viser er mellem {h} og {h1}. Klokken er {lbl}.', sv: 'Den korta visaren är mellan {h} och {h1}. Klockan är {lbl}.', no: 'Den korte viseren er mellom {h} og {h1}. Klokka er {lbl}.', en: 'The short hand is between {h} and {h1}. It is {lbl}.' }, L, v), big(lbl), tx(SMALL, L) + ' ' + said)
      ];
      return {
        ui: 'choice', prompt: tx(COMMON.time, L), say: tx(COMMON.time, L),
        visual: { type: 'clock', h: p.h, m: p.m },
        choice: U.choice({ label: lbl }, wr.map(function (x) { return { label: x }; }), 3),
        how: how,
        praise: tx({ da: 'Ja! Først den lille viser, så den store.', sv: 'Rätt! Först den korta visaren, sedan den långa.', no: 'Riktig! Først den korte viseren, så den lange.', en: 'Right! The short hand, then the long hand.' }, L),
        key: { type: 'clock' }
      };
    }
  });

  // Class 2 goes on with the clock: quarter past and quarter to. The digital answer stays on the cards (3:15, 3:45).
  step({
    id: 't35', grade: 2, name: { da: 'Kvart over og kvart i', sv: 'Kvart över och kvart i', no: 'Kvart over og kvart på', en: 'Quarter past and quarter to' },
    pick: function (U, L, E) { return { h: U.int(1, 12), m: E || U.chance(0.5) ? 15 : 45 }; },
    key: function (p) { return clockLbl(p.h, p.m); },
    make: function (p, L, U) {
      var lbl = clockLbl(p.h, p.m), v = { h: p.h, h1: nextH(p.h), lbl: lbl };
      var wr = p.m === 15 ? [clockLbl(p.h, 45), clockLbl(p.h, 30), clockLbl(nextH(p.h), 15)] : [clockLbl(p.h, 15), clockLbl(nextH(p.h), 45), clockLbl(p.h, 30)];
      var said = p.m === 15 ? tx({ da: 'Klokken er kvart over {h}.', sv: 'Klockan är kvart över {h}.', no: 'Klokka er kvart over {h}.', en: 'It is quarter past {h}.' }, L, v)
        : tx({ da: 'Klokken er kvart i {h1}.', sv: 'Klockan är kvart i {h1}.', no: 'Klokka er kvart på {h1}.', en: 'It is quarter to {h1}.' }, L, v);
      var how = p.m === 15 ? [
        H(U, L, tx({ da: 'Den store viser peger på 3. Det er et kvarter over.', sv: 'Den långa visaren pekar på 3. Det är en kvart över.', no: 'Den lange viseren peker på 3. Det er et kvarter over.', en: 'The long hand points to 3. That is a quarter past.' }, L), { type: 'clock', h: p.h, m: p.m }),
        H(U, L, tx({ da: 'Den lille viser er lige efter {h}. Klokken er {lbl}.', sv: 'Den korta visaren är strax efter {h}. Klockan är {lbl}.', no: 'Den korte viseren er rett etter {h}. Klokka er {lbl}.', en: 'The short hand is just past {h}. It is {lbl}.' }, L, v), big(lbl), tx(SMALL, L) + ' ' + said)
      ] : [
        H(U, L, tx({ da: 'Den store viser peger på 9. Det er et kvarter i.', sv: 'Den långa visaren pekar på 9. Det är en kvart i.', no: 'Den lange viseren peker på 9. Det er et kvarter på.', en: 'The long hand points to 9. That is a quarter to.' }, L), { type: 'clock', h: p.h, m: p.m }),
        H(U, L, tx({ da: 'Den lille viser er lige før {h1}. Klokken er {lbl}.', sv: 'Den korta visaren är strax före {h1}. Klockan är {lbl}.', no: 'Den korte viseren er rett før {h1}. Klokka er {lbl}.', en: 'The short hand is just before {h1}. It is {lbl}.' }, L, v), big(lbl), tx(SMALL, L) + ' ' + said)
      ];
      return {
        ui: 'choice', prompt: tx(COMMON.time, L), say: tx(COMMON.time, L),
        visual: { type: 'clock', h: p.h, m: p.m },
        choice: U.choice({ label: lbl }, wr.slice(0, 2).map(function (x) { return { label: x }; }), 3),
        how: how,
        praise: tx({ da: 'Ja! Først den lille viser, så den store.', sv: 'Rätt! Först den korta visaren, sedan den långa.', no: 'Riktig! Først den korte viseren, så den lange.', en: 'Right! The short hand, then the long hand.' }, L),
        key: { type: 'clock' }
      };
    }
  });

  var COINS = { da: [1, 2, 5, 10, 20], sv: [1, 2, 5, 10], no: [1, 5, 10, 20], en: [1, 2, 5, 10, 20] };
  function greedy(A, coins) {
    var out = [], left = A, cs = coins.slice().sort(function (a, b) { return b - a; });
    cs.forEach(function (c) { while (left >= c) { out.push(c); left -= c; } });
    return out;
  }
  // Class 1 learns money together with adding (Steve, 2026-11-15): pay a small amount with 1, 2, 5 and 10 kroner coins.
  // He cannot read yet, so the voice says the amount ("Betal 7 kroner."), one recorded sentence per amount from 3 to 20.
  var COINS1 = [1, 2, 5, 10];
  step({
    id: 't34', grade: 1, name: { da: 'Mønter til 20 kroner', sv: 'Mynt till 20 kronor', no: 'Mynter til 20 kroner', en: 'Coins up to 20 kroner' },
    pick: function (U, L, E) {
      var A = U.int(E ? 3 : 6, E ? 10 : 20), g = greedy(A, COINS1);
      if (g.length < 2 || g.length > (E ? 3 : 4)) return null;
      var purse = g.slice(), small = COINS1.filter(function (c) { return c < Math.max.apply(null, g); });
      if (!small.length) small = [1];
      var add = U.int(2, 3);
      for (var i = 0; i < add; i++) purse.push(U.pick(small));
      return { A: A, v: sortN(purse) };
    },
    key: function (p) { return p.A + 'kr:' + p.v.join('.'); },
    make: function (p, L, U) {
      var plan = greedy(p.A, COINS1), v = { A: p.A, plan: plan.join(' + ') };
      var exact = tx({ da: 'Det skal passe præcis.', sv: 'Det ska bli exakt.', no: 'Det skal bli akkurat.', en: 'It must be exact.' }, L);
      return {
        ui: 'build',
        prompt: tx({ da: 'Betal {A} kr', sv: 'Betala {A} kr', no: 'Betal {A} kr', en: 'Pay {A} kr' }, L, v),
        say: tx({ da: 'Betal {A} kroner.', sv: 'Betala {A} kronor.', no: 'Betal {A} kroner.', en: 'Pay {A} kroner.' }, L, v) + ' ' + exact,
        visual: big(p.A + ' kr'),
        build: { target: p.A, op: 'sum', tiles: tiles(U.shuffle(p.v)), unit: 'kr' },
        how: [
          H(U, L, tx({ da: 'Start med den største mønt, der passer.', sv: 'Börja med det största myntet som passar.', no: 'Start med den største mynten som passer.', en: 'Start with the biggest coin that fits.' }, L), big(plan[0] + ' kr')),
          H(U, L, tx({ da: 'Tag så de næste: {plan} = {A} kr.', sv: 'Sedan nästa: {plan} = {A} kr.', no: 'Så de neste: {plan} = {A} kr.', en: 'Then the next ones: {plan} = {A} kr.' }, L, v), big(plan.join(' + ')),
            tx({ da: 'Tag så de næste mønter, til det passer.', sv: 'Ta sedan nästa mynt tills det stämmer.', no: 'Ta så de neste myntene til det stemmer.', en: 'Then take the next coins until it fits.' }, L))
        ],
        praise: tx({ da: 'Ja! Det passer præcis.', sv: 'Rätt! Det blev exakt.', no: 'Riktig! Det ble akkurat.', en: 'Right! That is exactly it.' }, L),
        smartPraise: tx({ da: 'Flot! Du brugte så få mønter som muligt.', sv: 'Super! Du använde färst mynt.', no: 'Super! Du brukte færrest mynter.', en: 'Super! You used the fewest coins.' }, L),
        key: { type: 'eq', q: '▢ = ' + p.A, smart: { id: 'fewest', type: 'fewest' }, allowSingle: true }
      };
    }
  });

  step({
    id: 't19', grade: 2, name: { da: 'Betal med mønter', sv: 'Betala med mynt', no: 'Betal med mynter', en: 'Pay with coins' },
    pick: function (U, L, E) {
      var coins = COINS[L] || COINS.da, A = U.int(6, E ? 25 : 48), g = greedy(A, coins);
      if (g.length < 2 || g.length > 5) return null;
      var purse = g.slice();
      // add smaller coins that could also pay part of it, so the fewest-coins choice is a real choice
      var small = coins.filter(function (c) { return c < Math.max.apply(null, g); });
      var add = U.int(2, 4);
      for (var i = 0; i < add && small.length; i++) purse.push(U.pick(small));
      if (purse.length > 9) return null;
      return { A: A, v: sortN(purse) };
    },
    key: function (p) { return p.A + 'kr:' + p.v.join('.'); },
    make: function (p, L, U) {
      var coins = COINS[L] || COINS.da;
      if (p.v.some(function (c) { return coins.indexOf(c) < 0; })) return null;
      var plan = greedy(p.A, coins), v = { A: p.A, plan: plan.join(' + ') };
      return {
        ui: 'build',
        prompt: tx({ da: 'Betal {A} kr', sv: 'Betala {A} kr', no: 'Betal {A} kr', en: 'Pay {A} kr' }, L, v),
        say: tx({ da: 'Betal med mønterne. Det skal passe præcis.', sv: 'Betala med mynten. Det ska bli exakt.', no: 'Betal med myntene. Det skal bli akkurat.', en: 'Pay with the coins. It must be exact.' }, L),
        visual: big(p.A + ' kr'),
        build: { target: p.A, op: 'sum', tiles: tiles(U.shuffle(p.v)), unit: 'kr' },
        how: [
          H(U, L, tx({ da: 'Start med den største mønt, der passer.', sv: 'Börja med det största myntet som passar.', no: 'Start med den største mynten som passer.', en: 'Start with the biggest coin that fits.' }, L), big(plan[0] + ' kr')),
          H(U, L, tx({ da: 'Tag så de næste: {plan} = {A} kr.', sv: 'Sedan nästa: {plan} = {A} kr.', no: 'Så de neste: {plan} = {A} kr.', en: 'Then the next ones: {plan} = {A} kr.' }, L, v), big(plan.join(' + ')),
            tx({ da: 'Tag så de næste mønter, til det passer.', sv: 'Ta sedan nästa mynt tills det stämmer.', no: 'Ta så de neste myntene til det stemmer.', en: 'Then take the next coins until it fits.' }, L))
        ],
        praise: tx({ da: 'Ja! Det passer præcis.', sv: 'Rätt! Det blev exakt.', no: 'Riktig! Det ble akkurat.', en: 'Right! That is exactly it.' }, L),
        smartPraise: tx({ da: 'Flot! Du brugte så få mønter som muligt.', sv: 'Super! Du använde färst mynt.', no: 'Super! Du brukte færrest mynter.', en: 'Super! You used the fewest coins.' }, L),
        key: { type: 'eq', q: '▢ = ' + p.A, smart: { id: 'fewest', type: 'fewest' }, allowSingle: true }
      };
    }
  });

  /* ---------------- grade 3 (and the 6 to 9 tables in grade 4) ---------------- */
  function tableHow(U, L, fct, k) {
    var p = fct * k, v = { f: fct, k: k, p: p, p5: 5 * k, r: fct - 5, pr: (fct - 5) * k };
    if (fct <= 5) {
      var parts = [];
      for (var i = 0; i < fct; i++) parts.push(k);
      return [
        H(U, L, tx({ da: '{f} × {k} er {f} grupper med {k} i hver.', sv: '{f} × {k} är {f} grupper med {k}.', no: '{f} × {k} er {f} grupper med {k}.', en: '{f} × {k} is {f} groups of {k}.' }, L, v), { type: 'dots', n: Math.min(50, p) },
          tx({ da: 'Det er grupper, der er lige store.', sv: 'Det är grupper som är lika stora.', no: 'Det er grupper som er like store.', en: 'These are groups of the same size.' }, L)),
        H(U, L, parts.join(' + ') + ' = ' + p, big(parts.join(' + ') + ' = ' + p),
          tx({ da: 'Læg grupperne sammen.', sv: 'Lägg ihop grupperna.', no: 'Legg sammen gruppene.', en: 'Add the groups together.' }, L))
      ];
    }
    return [
      H(U, L, tx({ da: 'Start med 5 × {k} = {p5}.', sv: 'Börja med 5 × {k} = {p5}.', no: 'Start med 5 × {k} = {p5}.', en: 'Start with 5 × {k} = {p5}.' }, L, v), big('5 ' + TIMES + ' ' + k + ' = ' + v.p5),
        tx({ da: 'Start med 5 gange tallet.', sv: 'Börja med 5 gånger talet.', no: 'Start med 5 ganger tallet.', en: 'Start with 5 times the number.' }, L)),
      H(U, L, tx({ da: 'Så {r} × {k} mere: {pr}. I alt {p5} + {pr} = {p}.', sv: '{r} × {k} = {pr} till. {p5} + {pr} = {p}.', no: '{r} × {k} = {pr} til. {p5} + {pr} = {p}.', en: '{r} × {k} = {pr} more. {p5} + {pr} = {p}.' }, L, v), big(fct + ' ' + TIMES + ' ' + k + ' = ' + p),
        tx({ da: 'Læg så resten til.', sv: 'Lägg sedan till resten.', no: 'Legg så til resten.', en: 'Then add the rest.' }, L))
    ];
  }
  function tablePraise(L, fct) {
    return fct <= 5
      ? tx({ da: 'Ja! Du lagde lige store grupper sammen.', sv: 'Rätt! Du lade ihop lika stora grupper.', no: 'Riktig! Du la sammen like store grupper.', en: 'Right! You added equal groups.' }, L)
      : tx({ da: 'Ja! Først 5 gange, så resten.', sv: 'Rätt! Först 5 gånger, sedan resten.', no: 'Riktig! Først 5 ganger, så resten.', en: 'Right! 5 times first, then the rest.' }, L);
  }
  function tableStep(id, grade, ks, name) {
    step({
      id: id, grade: grade, name: name,
      pick: function (U, L, E) { return { k: U.pick(ks), f: U.int(2, E ? 5 : 10), o: U.chance(0.5) ? 1 : 0 }; },
      key: function (p) { return p.o ? p.k + 'x' + p.f : p.f + 'x' + p.k; },
      make: function (p, L, U) {
        // the voice says the table question ("Hvad er 7 gange 8?"): one spoken number pair, a small fixed set
        var prod = p.k * p.f, q = (p.o ? p.k + ' ' + TIMES + ' ' + p.f : p.f + ' ' + TIMES + ' ' + p.k) + ' = ▢';
        return eqChoice(U, L, q, prod, [prod + p.k, prod - p.k, prod + 1, prod - 1, p.k + p.f], tableHow(U, L, p.f, p.k), tablePraise(L, p.f), { min: 1 });
      }
    });
  }
  tableStep('t20', 3, [3, 4], { da: '3- og 4-tabellen', sv: '3:ans och 4:ans tabell', no: '3- og 4-gangen', en: '3 and 4 times tables' });
  // 7 × 8 in 15 seconds is end-of-class-3 at best: the 6 to 9 tables sit in class 4, where they are practised until they stick.
  tableStep('t21', 4, [6, 7, 8, 9], { da: '6- til 9-tabellen', sv: '6:ans till 9:ans tabell', no: '6- til 9-gangen', en: '6 to 9 times tables' });

  step({
    id: 't22', grade: 3, name: { da: 'Del lige ud', sv: 'Dela lika', no: 'Del likt', en: 'Sharing equally' },
    pick: function (U, L, E) { return { k: U.int(2, E ? 3 : 5), q: U.int(2, E ? 5 : 8) }; },
    key: function (p) { return (p.k * p.q) + '/' + p.k; },
    make: function (p, L, U) {
      var T = p.k * p.q, qq = T + ' ' + DIV[L] + ' ' + p.k + ' = ▢', v = { T: T, k: p.k, q: p.q };
      var ch = U.numChoice(p.q, [p.q + 1, p.q - 1, p.k !== p.q ? p.k : p.q + 2, p.q + 2], L, 3, { min: 1 });
      return {
        ui: 'choice',
        prompt: tx({ da: 'Del lige ud', sv: 'Dela lika', no: 'Del likt', en: 'Share equally' }, L),
        say: tx({ da: 'Del lige ud. Hvor mange får hver?', sv: 'Dela lika. Hur många får var och en?', no: 'Del likt. Hvor mange får hver?', en: 'Share equally. How many does each get?' }, L),
        visual: big(qq), choice: ch,
        how: [
          H(U, L, tx({ da: 'Giv én til hver ad gangen, til der ikke er flere.', sv: 'Ge en till var och en i taget tills det tar slut.', no: 'Gi én til hver om gangen til det er tomt.', en: 'Give one to each in turn until none are left.' }, L), { type: 'dots', n: T }),
          H(U, L, tx({ da: 'Hver får {q}, fordi {k} × {q} = {T}.', sv: 'Var och en får {q}, eftersom {k} × {q} = {T}.', no: 'Hver får {q}, fordi {k} × {q} = {T}.', en: 'Each gets {q}, because {k} × {q} = {T}.' }, L, v), big(qq.replace('▢', p.q)),
            tx({ da: 'Tjek det med gangetabellen.', sv: 'Kolla med multiplikationstabellen.', no: 'Sjekk det med gangetabellen.', en: 'Check it with the times table.' }, L))
        ],
        praise: tx({ da: 'Ja! Du delte lige ud.', sv: 'Rätt! Du delade lika.', no: 'Riktig! Du delte likt.', en: 'Right! You shared equally.' }, L),
        key: { type: 'eq', q: qq }
      };
    }
  });

  // Missing addend with hundreds. Easy half: from a whole hundred (300 + ▢ = 640). Hard half: no carry in the tens (340 + ▢ = 590).
  step({
    id: 't23', grade: 3, name: { da: 'Byg med hundreder', sv: 'Bygg med hundratal', no: 'Bygg med hundrere', en: 'Build with hundreds' },
    pick: function (U, L, E) {
      var xt = E ? 0 : U.int(1, 5), X = 100 * U.int(1, 6) + 10 * xt, D = 100 * U.int(1, 3) + 10 * U.int(1, E ? 5 : 9 - xt);
      if (X + D > 990) return null;
      return { X: X, D: D };
    },
    key: function (p) { return p.X + '+?=' + (p.X + p.D); },
    make: function (p, L, U) {
      var Y = p.X + p.D, h = Math.floor(p.D / 100), te = (p.D % 100) / 10, vals = [], i;
      for (i = 0; i <= h; i++) vals.push(100);
      var tens = te;
      if (te >= 5) { vals.push(50); tens = te - 5; }
      for (i = 0; i <= tens; i++) vals.push(10);
      var q = p.X + ' + ▢ = ' + Y, v = { X: p.X, Y: Y, H: h * 100, XH: p.X + h * 100, Tn: te * 10, D: p.D };
      return {
        ui: 'build',
        prompt: tx(COMMON.missing, L),
        say: tx({ da: 'Hvad mangler? Byg det med kuglerne.', sv: 'Vad fattas? Bygg det med kulorna.', no: 'Hva mangler? Bygg det med kulene.', en: 'What is missing? Build it with the orbs.' }, L),
        visual: big(q),
        build: { target: p.D, op: 'sum', tiles: tiles(U.shuffle(vals)), confirm: true },
        how: [
          H(U, L, tx({ da: 'Tæl op med hundreder: {X} + {H} = {XH}.', sv: 'Räkna upp i hundratal: {X} + {H} = {XH}.', no: 'Tell opp i hundrere: {X} + {H} = {XH}.', en: 'Count up in hundreds: {X} + {H} = {XH}.' }, L, v), big(p.X + ' + ' + v.H + ' = ' + v.XH),
            tx({ da: 'Tæl op med hundreder først.', sv: 'Räkna upp i hundratal först.', no: 'Tell opp i hundrere først.', en: 'Count up in hundreds first.' }, L)),
          H(U, L, tx({ da: 'Så med tiere: {XH} + {Tn} = {Y}.', sv: 'Sedan tiotal: {XH} + {Tn} = {Y}.', no: 'Så tiere: {XH} + {Tn} = {Y}.', en: 'Then tens: {XH} + {Tn} = {Y}.' }, L, v), big(v.XH + ' + ' + v.Tn + ' = ' + Y),
            tx({ da: 'Tæl så op med tiere.', sv: 'Räkna sedan upp i tiotal.', no: 'Tell så opp i tiere.', en: 'Then count up in tens.' }, L)),
          H(U, L, v.H + ' + ' + v.Tn + ' = ' + p.D, big(q.replace('▢', p.D)),
            tx({ da: 'Læg hundrederne og tierne sammen.', sv: 'Lägg ihop hundratalen och tiotalen.', no: 'Legg sammen hundrerne og tierne.', en: 'Add the hundreds and the tens.' }, L))
        ],
        praise: tx({ da: 'Ja! Du talte op til tallet.', sv: 'Rätt! Du räknade upp till talet.', no: 'Riktig! Du talte opp til tallet.', en: 'Right! You counted up to the number.' }, L),
        smartPraise: tx(COMMON.fewestOrbs, L),
        key: { type: 'eq', q: q, smart: { id: 'fewest', type: 'fewest' } }
      };
    }
  });

  // Plus and minus with whole tens up to 1000. Easy half: no carry or borrowing in the tens (420 + 350).
  step({
    id: 't24', grade: 3, name: { da: 'Plus og minus til 1000', sv: 'Plus och minus till 1000', no: 'Pluss og minus til 1000', en: 'Add and subtract within 1000' },
    pick: function (U, L, E) {
      if (U.chance(0.5)) {
        var a = 10 * U.int(11, 79), b = 10 * U.int(11, 99 - a / 10);
        if (b % 100 === 0 || a + b > 1000 || (E && a % 100 + b % 100 >= 100)) return null;
        return { a: a, b: b, op: '+' };
      }
      var a2 = 10 * U.int(30, 99), b2 = 10 * U.int(11, a2 / 10 - 10);
      if (b2 % 100 === 0 || (E && b2 % 100 > a2 % 100)) return null;
      return { a: a2, b: b2, op: '-' };
    },
    key: function (p) { return p.a + p.op + p.b; },
    make: function (p, L, U) {
      var res = p.op === '+' ? p.a + p.b : p.a - p.b, sym = p.op === '+' ? '+' : MINUS, q = p.a + ' ' + sym + ' ' + p.b + ' = ▢';
      var ah = p.a - p.a % 100, bh = p.b - p.b % 100, at = p.a % 100, bt = p.b % 100;
      var how, v = { ah: ah, bh: bh, sh: ah + bh, at: at, bt: bt, st: at + bt, s: res, a: p.a, x: p.a - bh, d: res };
      if (p.op === '+') {
        how = [
          H(U, L, tx({ da: 'Hundreder: {ah} + {bh} = {sh}.', sv: 'Hundratal: {ah} + {bh} = {sh}.', no: 'Hundrere: {ah} + {bh} = {sh}.', en: 'Hundreds: {ah} + {bh} = {sh}.' }, L, v), big(ah + ' + ' + bh + ' = ' + v.sh),
            tx({ da: 'Læg hundrederne sammen.', sv: 'Lägg ihop hundratalen.', no: 'Legg sammen hundrerne.', en: 'Add the hundreds.' }, L)),
          H(U, L, tx({ da: 'Tiere: {at} + {bt} = {st}.', sv: 'Tiotal: {at} + {bt} = {st}.', no: 'Tiere: {at} + {bt} = {st}.', en: 'Tens: {at} + {bt} = {st}.' }, L, v), big(at + ' + ' + bt + ' = ' + v.st),
            tx({ da: 'Læg tierne sammen.', sv: 'Lägg ihop tiotalen.', no: 'Legg sammen tierne.', en: 'Add the tens.' }, L)),
          H(U, L, v.sh + ' + ' + v.st + ' = ' + res, big(q.replace('▢', res)), tx(COMMON.both, L))
        ];
      } else {
        how = [
          H(U, L, tx({ da: 'Træk hundrederne fra: {a} − {bh} = {x}.', sv: 'Ta bort hundratalen: {a} − {bh} = {x}.', no: 'Trekk fra hundrerne: {a} − {bh} = {x}.', en: 'Take away the hundreds: {a} − {bh} = {x}.' }, L, v), big(p.a + ' ' + MINUS + ' ' + bh + ' = ' + v.x),
            tx({ da: 'Træk hundrederne fra først.', sv: 'Ta bort hundratalen först.', no: 'Trekk fra hundrerne først.', en: 'Take away the hundreds first.' }, L)),
          H(U, L, tx({ da: 'Træk så tierne fra: {x} − {bt} = {d}.', sv: 'Ta bort tiotalen: {x} − {bt} = {d}.', no: 'Trekk fra tierne: {x} − {bt} = {d}.', en: 'Take away the tens: {x} − {bt} = {d}.' }, L, v), big(v.x + ' ' + MINUS + ' ' + bt + ' = ' + res),
            tx({ da: 'Træk så tierne fra.', sv: 'Ta sedan bort tiotalen.', no: 'Trekk så fra tierne.', en: 'Then take away the tens.' }, L))
        ];
      }
      return eqChoice(U, L, q, res, [res + 100, res - 100, res + 10, res - 10], how,
        tx({ da: 'Ja! Hundreder for sig og tiere for sig.', sv: 'Rätt! Hundratal och tiotal var för sig.', no: 'Riktig! Hundrere og tiere hver for seg.', en: 'Right! Hundreds and tens separately.' }, L),
        { step: 10, say: tx(p.op === '+' ? COMMON.add : COMMON.sub, L) });
    }
  });

  step({
    id: 't25', grade: 3, name: { da: 'Klokken på 5 minutter', sv: 'Klockan på 5 minuter', no: 'Klokka på 5 minutter', en: 'Time to 5 minutes' },
    pick: function (U, L, E) { var m = 5 * U.pick(E ? [2, 3, 9, 10] : [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]); return { h: U.int(1, 12), m: m }; },
    key: function (p) { return clockLbl(p.h, p.m); },
    make: function (p, L, U) {
      var lbl = clockLbl(p.h, p.m), k = p.m / 5, v = { h: p.h, h1: nextH(p.h), lbl: lbl, k: k, m: p.m };
      var wr = [clockLbl(p.h, k)];
      wr.push(p.m > 30 ? clockLbl(nextH(p.h), p.m) : clockLbl(p.h, 60 - p.m));
      return {
        ui: 'choice', prompt: tx(COMMON.time, L), say: tx(COMMON.time, L),
        visual: { type: 'clock', h: p.h, m: p.m },
        choice: U.choice({ label: lbl }, wr.map(function (x) { return { label: x }; }), 3),
        how: [
          H(U, L, tx({ da: 'Den store viser peger på {k}. {k} × 5 = {m} minutter.', sv: 'Den långa visaren pekar på {k}. {k} × 5 = {m} minuter.', no: 'Den lange viseren peker på {k}. {k} × 5 = {m} minutter.', en: 'The long hand points to {k}. {k} × 5 = {m} minutes.' }, L, v), { type: 'clock', h: p.h, m: p.m },
            tx({ da: 'Den store viser peger på {k}. Hvert tal er 5 minutter.', sv: 'Den långa visaren pekar på {k}. Varje siffra är 5 minuter.', no: 'Den lange viseren peker på {k}. Hvert tall er 5 minutter.', en: 'The long hand points to {k}. Each number is 5 minutes.' }, L, v)),
          H(U, L, tx({ da: 'Den lille viser er mellem {h} og {h1}. Klokken er {lbl}.', sv: 'Den korta visaren är mellan {h} och {h1}. Klockan är {lbl}.', no: 'Den korte viseren er mellom {h} og {h1}. Klokka er {lbl}.', en: 'The short hand is between {h} and {h1}. It is {lbl}.' }, L, v), big(lbl), tx(SMALL, L))
        ],
        praise: tx({ da: 'Ja! 5 minutter for hvert tal.', sv: 'Rätt! 5 minuter för varje siffra.', no: 'Riktig! 5 minutter for hvert tall.', en: 'Right! 5 minutes for each number.' }, L),
        key: { type: 'clock' }
      };
    }
  });

  /* ---------------- grade 4 ---------------- */
  step({
    id: 't26', grade: 4, name: { da: 'Farv en brøk', sv: 'Färglägg ett bråk', no: 'Fargelegg en brøk', en: 'Shade a fraction' },
    pick: function (U, L, E) {
      var d = U.pick(E ? [2, 3, 4] : [2, 3, 4, 5, 6, 8, 10]), n = U.int(1, d - 1), mult = !E && d <= 6 && U.chance(0.35) ? 2 : 1;
      return { n: n, d: d, mult: mult, sh: U.chance(0.5) ? 'pie' : 'bar' };
    },
    key: function (p) { return p.n + '/' + p.d + 'x' + p.mult + p.sh; },
    make: function (p, L, U) {
      var total = p.d * p.mult, need = p.n * p.mult, fr = p.n + '/' + p.d, v = { n: p.n, d: p.d, f: fr, total: total, need: need, mult: p.mult };
      var over = tx({ da: 'Farv så mange, som tallet over brøkstregen siger.', sv: 'Färglägg så många som talet ovanför bråkstrecket säger.', no: 'Fargelegg så mange som tallet over brøkstreken sier.', en: 'Shade as many as the top number says.' }, L);
      var how = p.mult === 1 ? [
        H(U, L, tx({ da: 'Figuren har {d} lige store dele.', sv: 'Figuren har {d} lika stora delar.', no: 'Figuren har {d} like store deler.', en: 'The shape has {d} equal parts.' }, L, v), { type: 'frac', n: 0, d: p.d, shape: p.sh },
          tx({ da: 'Tæl de lige store dele.', sv: 'Räkna de lika stora delarna.', no: 'Tell de like store delene.', en: 'Count the equal parts.' }, L)),
        H(U, L, tx({ da: 'Farv {n} af dem.', sv: 'Färglägg {n} av dem.', no: 'Fargelegg {n} av dem.', en: 'Shade {n} of them.' }, L, v), { type: 'frac', n: p.n, d: p.d, shape: p.sh }, over)
      ] : [
        H(U, L, tx({ da: 'Der er {total} dele: {d} grupper med {mult} i hver.', sv: 'Det är {total} delar: {d} grupper med {mult} i varje.', no: 'Det er {total} deler: {d} grupper med {mult} i hver.', en: 'There are {total} parts: {d} groups of {mult}.' }, L, v), { type: 'frac', n: 0, d: total, shape: p.sh },
          tx({ da: 'Tæl delene i grupper med 2.', sv: 'Räkna delarna i grupper om 2.', no: 'Tell delene i grupper på 2.', en: 'Count the parts in groups of 2.' }, L)),
        H(U, L, tx({ da: '{f} er {n} grupper: {n} × {mult} = {need} dele.', sv: '{f} är {n} grupper: {n} × {mult} = {need} delar.', no: '{f} er {n} grupper: {n} × {mult} = {need} deler.', en: '{f} is {n} groups: {n} × {mult} = {need} parts.' }, L, v), { type: 'frac', n: need, d: total, shape: p.sh },
          tx({ da: 'Farv så mange grupper, som tallet over brøkstregen siger.', sv: 'Färglägg så många grupper som talet ovanför bråkstrecket säger.', no: 'Fargelegg så mange grupper som tallet over brøkstreken sier.', en: 'Shade as many groups as the top number says.' }, L))
      ];
      return {
        ui: 'fill',
        prompt: tx({ da: 'Farv {f}', sv: 'Färglägg {f}', no: 'Fargelegg {f}', en: 'Shade {f}' }, L, v),
        say: tx({ da: 'Farv lige så meget af figuren, som brøken siger.', sv: 'Färglägg så mycket av figuren som bråket säger.', no: 'Fargelegg så mye av figuren som brøken sier.', en: 'Shade as much of the shape as the fraction says.' }, L),
        visual: big(fr),
        fill: { total: total, need: need, shape: p.sh },
        how: how,
        praise: tx({ da: 'Ja! Du farvede den rigtige brøk.', sv: 'Rätt! Du färglade rätt bråk.', no: 'Riktig! Du fargela riktig brøk.', en: 'Right! You shaded the right fraction.' }, L),
        key: { type: 'eq', q: fr + ' × ' + total + ' = ▢' }
      };
    }
  });

  // Fraction of a number. Easy half: unit fractions of small numbers (1/4 af 12). Hard half: at most 3 parts (3/5 af 40).
  step({
    id: 't27', grade: 4, name: { da: 'Brøkdel af et tal', sv: 'Bråkdel av ett tal', no: 'Brøkdel av et tall', en: 'Fraction of a number' },
    pick: function (U, L, E) {
      var d = U.pick(E ? [2, 4, 10] : [2, 3, 4, 5, 10]);
      return { d: d, n: E ? 1 : U.int(1, Math.min(3, d - 1)), u: U.int(2, E ? 5 : 8) };
    },
    key: function (p) { return p.n + '/' + p.d + 'of' + (p.d * p.u); },
    make: function (p, L, U) {
      var N = p.d * p.u, ans = p.n * p.u, q = p.n + '/' + p.d + ' ' + OF[L] + ' ' + N + ' = ▢', v = { N: N, d: p.d, u: p.u, n: p.n, ans: ans, div: DIV[L] };
      return eqChoice(U, L, q, ans, [p.n > 1 ? p.u : ans + p.u, ans + p.u, ans - p.u, N - ans, N / p.n], [
        H(U, L, tx({ da: 'Del {N} i {d} lige store dele: {N} {div} {d} = {u}.', sv: 'Dela {N} i {d} lika delar: {N} {div} {d} = {u}.', no: 'Del {N} i {d} like deler: {N} {div} {d} = {u}.', en: 'Split {N} into {d} equal parts: {N} {div} {d} = {u}.' }, L, v), big(N + ' ' + DIV[L] + ' ' + p.d + ' = ' + p.u),
          tx({ da: 'Del tallet i lige store dele.', sv: 'Dela talet i lika stora delar.', no: 'Del tallet i like store deler.', en: 'Split the number into equal parts.' }, L)),
        p.n === 1 ? H(U, L, tx({ da: 'Én del er {u}.', sv: 'En del är {u}.', no: 'Én del er {u}.', en: 'One part is {u}.' }, L, v), big(q.replace('▢', ans)),
          tx({ da: 'Én del er svaret.', sv: 'En del är svaret.', no: 'Én del er svaret.', en: 'One part is the answer.' }, L))
          : H(U, L, tx({ da: '{n} dele: {n} × {u} = {ans}.', sv: '{n} delar: {n} × {u} = {ans}.', no: '{n} deler: {n} × {u} = {ans}.', en: '{n} parts: {n} × {u} = {ans}.' }, L, v), big(q.replace('▢', ans)),
            tx({ da: 'Gang så med tallet over brøkstregen.', sv: 'Ta sedan gånger talet ovanför bråkstrecket.', no: 'Gang så med tallet over brøkstreken.', en: 'Then multiply by the top number.' }, L))
      ], p.n === 1 ? tx({ da: 'Ja! Du delte i lige store dele.', sv: 'Rätt! Du delade i lika stora delar.', no: 'Riktig! Du delte i like store deler.', en: 'Right! You split it into equal parts.' }, L)
        : tx({ da: 'Ja! Først delt, så ganget.', sv: 'Rätt! Först delat, sedan gånger.', no: 'Riktig! Først delt, så ganget.', en: 'Right! Divide first, then multiply.' }, L),
      { min: 1, say: tx({ da: 'Find brøkdelen af tallet.', sv: 'Hitta bråkdelen av talet.', no: 'Finn brøkdelen av tallet.', en: 'Find the fraction of the number.' }, L) });
    }
  });

  // Two-digit times one-digit, class 4: friendly numbers and the split is on the screen ("10 × 4 + 3 × 4").
  // A choice, not a tray of orbs: the orb tray accepts any set that reaches the hidden target, which turned this into guessing.
  step({
    id: 't28', grade: 4, name: { da: 'Gange i to dele', sv: 'Multiplicera i två delar', no: 'Gange i to deler', en: 'Multiply in two parts' },
    pick: function (U, L, E) {
      var T, O, k;
      if (E) { T = 10; O = U.int(1, 5); k = U.int(2, 5); }
      else if (U.chance(0.25)) { T = 30; O = U.int(1, 3); k = U.int(2, 4); }
      else { T = 10 * U.int(1, 2); O = U.int(1, 5); k = U.int(2, 6); }
      return { a: T + O, k: k };
    },
    key: function (p) { return p.a + 'x' + p.k; },
    make: function (p, L, U) {
      var T = p.a - p.a % 10, O = p.a % 10, p1 = T * p.k, p2 = O * p.k, ans = p1 + p2, v = { a: p.a, k: p.k, T: T, O: O, p1: p1, p2: p2, ans: ans };
      var split = T + ' ' + TIMES + ' ' + p.k + ' + ' + O + ' ' + TIMES + ' ' + p.k;
      var cut = tx({ da: 'Del tallet op i tiere og enere.', sv: 'Dela upp talet i tiotal och ental.', no: 'Del tallet opp i tiere og enere.', en: 'Split the number into tens and ones.' }, L);
      return {
        ui: 'choice',
        prompt: tx({ da: 'Hvad er {a} × {k}?', sv: 'Vad är {a} × {k}?', no: 'Hva er {a} × {k}?', en: 'What is {a} × {k}?' }, L, v),
        say: cut + ' ' + tx({ da: 'Gang hver del for sig.', sv: 'Ta varje del gånger för sig.', no: 'Gang hver del for seg.', en: 'Multiply each part on its own.' }, L),
        visual: big(split),
        choice: U.numChoice(ans, [p1 + O, ans + 10, ans - 10, p1 + p.k, ans + p.k], L, 3, { min: 1 }),
        how: [
          H(U, L, tx({ da: 'Del {a} op: {a} = {T} + {O}.', sv: 'Dela upp {a}: {a} = {T} + {O}.', no: 'Del opp {a}: {a} = {T} + {O}.', en: 'Split {a}: {a} = {T} + {O}.' }, L, v), big(p.a + ' = ' + T + ' + ' + O), cut),
          H(U, L, tx({ da: '{T} × {k} = {p1}, og {O} × {k} = {p2}.', sv: '{T} × {k} = {p1} och {O} × {k} = {p2}.', no: '{T} × {k} = {p1} og {O} × {k} = {p2}.', en: '{T} × {k} = {p1} and {O} × {k} = {p2}.' }, L, v), big(p1 + ' + ' + p2),
            tx({ da: 'Gang tierne, og gang enerne.', sv: 'Ta tiotalen gånger, och entalen gånger.', no: 'Gang tierne, og gang enerne.', en: 'Multiply the tens, and multiply the ones.' }, L)),
          H(U, L, p1 + ' + ' + p2 + ' = ' + ans, big(p.a + ' ' + TIMES + ' ' + p.k + ' = ' + ans), tx(COMMON.both, L))
        ],
        praise: tx({ da: 'Ja! Du gangede i to dele.', sv: 'Rätt! Du räknade gånger i två delar.', no: 'Riktig! Du ganget i to deler.', en: 'Right! You multiplied in two parts.' }, L),
        key: { type: 'eq', q: p.a + ' × ' + p.k + ' = ▢' }
      };
    }
  });

  step({
    id: 't29', grade: 4, name: { da: 'Decimaltal med tiendedele', sv: 'Decimaltal med tiondelar', no: 'Desimaltall med tideler', en: 'Decimals with tenths' },
    pick: function (U, L, E) {
      if (U.chance(0.55)) {
        var A1 = U.int(1, 29), B1 = U.int(1, 9);
        if (E && (A1 % 10) + B1 >= 10) return null;
        return { A: A1, B: B1, op: '+' };
      }
      var A = U.int(6, 39), B = U.int(1, Math.min(9, A - 2));
      if (E && B > A % 10) return null;
      return { A: A, B: B, op: '-' };
    },
    key: function (p) { return p.A + p.op + p.B; },
    make: function (p, L, U) {
      var R = p.op === '+' ? p.A + p.B : p.A - p.B, a = U.fmt(p.A / 10, L), b = U.fmt(p.B / 10, L), r = U.fmt(R / 10, L);
      var sym = p.op === '+' ? '+' : MINUS, q = a + ' ' + sym + ' ' + b + ' = ▢', v = { A: p.A, B: p.B, R: R, r: r, s: sym };
      var cands = [R, (R + 1) / 10, (R - 1) / 10, (R + 10) / 10];
      return eqChoice(U, L, q, R / 10, cands, [
        H(U, L, tx({ da: 'Regn i tiendedele: {A} {s} {B} = {R} tiendedele.', sv: 'Räkna i tiondelar: {A} {s} {B} = {R} tiondelar.', no: 'Regn i tideler: {A} {s} {B} = {R} tideler.', en: 'Count in tenths: {A} {s} {B} = {R} tenths.' }, L, v), big(p.A + ' ' + sym + ' ' + p.B + ' = ' + R),
          tx({ da: 'Regn i tiendedele.', sv: 'Räkna i tiondelar.', no: 'Regn i tideler.', en: 'Work in tenths.' }, L)),
        H(U, L, tx({ da: '{R} tiendedele er {r}.', sv: '{R} tiondelar är {r}.', no: '{R} tideler er {r}.', en: '{R} tenths is {r}.' }, L, v), big(q.replace('▢', r)),
          tx({ da: 'Sæt så kommaet.', sv: 'Sätt sedan ut kommat.', no: 'Sett så kommaet.', en: 'Then put the decimal point back.' }, L))
      ], tx({ da: 'Ja! Du regnede i tiendedele.', sv: 'Rätt! Du räknade i tiondelar.', no: 'Riktig! Du regnet i tideler.', en: 'Right! You worked in tenths.' }, L),
      { min: 0.1, step: 0.1, say: tx(p.op === '+' ? { da: 'Læg de to decimaltal sammen.', sv: 'Lägg ihop de två decimaltalen.', no: 'Legg sammen de to desimaltallene.', en: 'Add the two decimals.' }
        : { da: 'Træk det andet decimaltal fra det første.', sv: 'Ta bort det andra decimaltalet från det första.', no: 'Trekk det andre desimaltallet fra det første.', en: 'Take the second decimal away from the first.' }, L) });
    }
  });

  /* ---------------- grade 5 ---------------- */
  step({
    id: 't30', grade: 5, name: { da: 'Brøker der er lige store', sv: 'Lika stora bråk', no: 'Like store brøker', en: 'Equivalent fractions' },
    pick: function (U, L, E) { var d = U.int(2, E ? 4 : 6); return { d: d, n: U.int(1, d - 1), k: U.int(2, E ? 3 : 5), top: U.chance(0.6) ? 1 : 0 }; },
    key: function (p) { return p.n + '/' + p.d + 'x' + p.k + (p.top ? 't' : 'b'); },
    make: function (p, L, U) {
      var nk = p.n * p.k, dk = p.d * p.k, v = { n: p.n, d: p.d, k: p.k, nk: nk, dk: dk };
      var q = p.top ? p.n + '/' + p.d + ' = ▢/' + dk : p.n + '/' + p.d + ' = ' + nk + '/▢';
      var ans = p.top ? nk : dk;
      var look = p.top ? tx({ da: 'Se, hvad tallet under brøkstregen er ganget med.', sv: 'Se vad talet under bråkstrecket är gånger.', no: 'Se hva tallet under brøkstreken er ganget med.', en: 'See what the bottom number was multiplied by.' }, L)
        : tx({ da: 'Se, hvad tallet over brøkstregen er ganget med.', sv: 'Se vad talet ovanför bråkstrecket är gånger.', no: 'Se hva tallet over brøkstreken er ganget med.', en: 'See what the top number was multiplied by.' }, L);
      var same = tx({ da: 'Gang det andet tal med det samme.', sv: 'Ta det andra talet gånger samma tal.', no: 'Gang det andre tallet med det samme.', en: 'Multiply the other number by the same.' }, L);
      var how = p.top ? [
        H(U, L, tx({ da: '{d} bliver til {dk}, når du ganger med {k}.', sv: '{d} blir {dk} när du multiplicerar med {k}.', no: '{d} blir {dk} når du ganger med {k}.', en: '{d} becomes {dk} when you multiply by {k}.' }, L, v), big(p.d + ' ' + TIMES + ' ' + p.k + ' = ' + dk), look),
        H(U, L, tx({ da: 'Gang også {n} med {k}: {n} × {k} = {nk}.', sv: 'Multiplicera också {n} med {k}: {n} × {k} = {nk}.', no: 'Gang også {n} med {k}: {n} × {k} = {nk}.', en: 'Multiply {n} by {k} too: {n} × {k} = {nk}.' }, L, v), big(p.n + '/' + p.d + ' = ' + nk + '/' + dk), same)
      ] : [
        H(U, L, tx({ da: '{n} bliver til {nk}, når du ganger med {k}.', sv: '{n} blir {nk} när du multiplicerar med {k}.', no: '{n} blir {nk} når du ganger med {k}.', en: '{n} becomes {nk} when you multiply by {k}.' }, L, v), big(p.n + ' ' + TIMES + ' ' + p.k + ' = ' + nk), look),
        H(U, L, tx({ da: 'Gang også {d} med {k}: {d} × {k} = {dk}.', sv: 'Multiplicera också {d} med {k}: {d} × {k} = {dk}.', no: 'Gang også {d} med {k}: {d} × {k} = {dk}.', en: 'Multiply {d} by {k} too: {d} × {k} = {dk}.' }, L, v), big(p.n + '/' + p.d + ' = ' + nk + '/' + dk), same)
      ];
      var cands = p.top ? [p.n + dk - p.d, nk + 1, nk - 1, dk - p.d] : [p.d + nk - p.n, dk + 1, dk - 1, dk + p.k];
      var say = p.top ? tx({ da: 'Brøkerne er lige store. Hvad skal stå over brøkstregen?', sv: 'Bråken är lika stora. Vad ska stå ovanför bråkstrecket?', no: 'Brøkene er like store. Hva skal stå over brøkstreken?', en: 'The fractions are equal. What goes on top?' }, L)
        : tx({ da: 'Brøkerne er lige store. Hvad skal stå under brøkstregen?', sv: 'Bråken är lika stora. Vad ska stå under bråkstrecket?', no: 'Brøkene er like store. Hva skal stå under brøkstreken?', en: 'The fractions are equal. What goes on the bottom?' }, L);
      return eqChoice(U, L, q, ans, cands, how, tx({ da: 'Ja! Samme tal over og under brøkstregen.', sv: 'Rätt! Samma tal över och under bråkstrecket.', no: 'Riktig! Samme tall over og under brøkstreken.', en: 'Right! The same number on top and bottom.' }, L), { min: 1, say: say, prompt: COMMON.missing });
    }
  });

  // Percent. 10 % and 50 % of round numbers; 25 % of numbers up to 60 (halve, then halve again).
  step({
    id: 't31', grade: 5, name: { da: 'Procent', sv: 'Procent', no: 'Prosent', en: 'Percent' },
    pick: function (U, L, E) {
      var pc = U.pick(E ? [10, 50] : [10, 25, 50]);
      var N = pc === 10 ? 10 * U.int(2, E ? 10 : 20) : pc === 25 ? 4 * U.int(2, 15) : 2 * U.int(5, E ? 30 : 60);
      return { pc: pc, N: N };
    },
    key: function (p) { return p.pc + '%' + p.N; },
    make: function (p, L, U) {
      var dv = 100 / p.pc, ans = p.N / dv, q = p.pc + PCT[L] + ' ' + OF[L] + ' ' + p.N + ' = ▢', v = { N: p.N, ans: ans, div: DIV[L], dv: dv, pc: p.pc };
      var first = {
        10: { da: '10 % er en tiendedel.', sv: '10 % är en tiondel.', no: '10 % er en tidel.', en: '10% is one tenth.' },
        25: { da: '25 % er en fjerdedel.', sv: '25 % är en fjärdedel.', no: '25 % er en firedel.', en: '25% is one quarter.' },
        50: { da: '50 % er halvdelen.', sv: '50 % är hälften.', no: '50 % er halvparten.', en: '50% is one half.' }
      }[p.pc];
      return eqChoice(U, L, q, ans, [p.N / 10, p.N / 2, p.N / 4, ans * 2, ans + 10, p.N - ans].filter(function (x) { return x % 1 === 0; }), [
        H(U, L, tx(first, L), big(p.pc + PCT[L] + ' = 1/' + dv)),
        H(U, L, tx({ da: '{N} {div} {dv} = {ans}.', sv: '{N} {div} {dv} = {ans}.', no: '{N} {div} {dv} = {ans}.', en: '{N} {div} {dv} = {ans}.' }, L, v), big(q.replace('▢', ans)),
          tx({ da: 'Del tallet med {dv}.', sv: 'Dela talet med {dv}.', no: 'Del tallet på {dv}.', en: 'Divide the number by {dv}.' }, L, v))
      ], tx({ da: 'Ja! Du regnede procent som en brøk.', sv: 'Rätt! Du räknade procent som ett bråk.', no: 'Riktig! Du regnet prosent som en brøk.', en: 'Right! You worked out percent as a fraction.' }, L),
      { min: 1, say: U.sp(tx({ da: 'Hvad er {pc} % af tallet?', sv: 'Vad är {pc} % av talet?', no: 'Hva er {pc} % av tallet?', en: 'What is {pc}% of the number?' }, L, v), L) });
    }
  });

  step({
    id: 't32', grade: 5, name: { da: 'Minusgrader', sv: 'Minusgrader', no: 'Minusgrader', en: 'Below zero' },
    pick: function (U, L, E) {
      var s = U.int(-8, 8), c = U.int(2, E ? 4 : 9) * (U.chance(0.5) ? 1 : -1), r = s + c;
      if (r < -10 || r > 10 || (s >= 0 && r >= 0)) return null;
      return { s: s, c: c };
    },
    key: function (p) { return p.s + (p.c > 0 ? '+' : '') + p.c; },
    make: function (p, L, U) {
      var r = p.s + p.c, warm = p.c > 0, abs = Math.abs(p.c), S = U.fmt(p.s, L), R = U.fmt(r, L);
      var v = { s: S, c: abs, r: R };
      var prompt = warm
        ? tx({ da: 'Det er {s} °C. Så bliver det {c} grader varmere.', sv: 'Det är {s} °C. Sedan blir det {c} grader varmare.', no: 'Det er {s} °C. Så blir det {c} grader varmere.', en: 'It is {s} °C. Then it gets {c} degrees warmer.' }, L, v)
        : tx({ da: 'Det er {s} °C. Så bliver det {c} grader koldere.', sv: 'Det är {s} °C. Sedan blir det {c} grader kallare.', no: 'Det er {s} °C. Så blir det {c} grader kaldere.', en: 'It is {s} °C. Then it gets {c} degrees colder.' }, L, v);
      var say = warm
        ? tx({ da: 'Det bliver varmere. Hvor mange grader er det så?', sv: 'Det blir varmare. Hur många grader är det då?', no: 'Det blir varmere. Hvor mange grader er det da?', en: 'It gets warmer. What is the temperature now?' }, L)
        : tx({ da: 'Det bliver koldere. Hvor mange grader er det så?', sv: 'Det blir kallare. Hur många grader är det då?', no: 'Det blir kaldere. Hvor mange grader er det da?', en: 'It gets colder. What is the temperature now?' }, L);
      var q = p.s + (warm ? ' + ' : ' - ') + abs + ' = ▢';
      var ch = U.numChoice(r, [-r, r + 1, r - 1, p.s - p.c], L, 3, { min: -20, unit: ' °C' });
      return {
        ui: 'choice', prompt: prompt, say: say,
        visual: { type: 'line', min: -10, max: 10, marks: [-10, -5, 0, 5, 10], at: p.s },
        choice: ch,
        how: [
          H(U, L, warm ? tx({ da: 'Start ved {s} °C. Gå {c} streger op.', sv: 'Börja på {s} °C och gå {c} steg upp.', no: 'Start på {s} °C og gå {c} streker opp.', en: 'Start at {s} °C and go {c} steps up.' }, L, v)
            : tx({ da: 'Start ved {s} °C. Gå {c} streger ned.', sv: 'Börja på {s} °C och gå {c} steg ner.', no: 'Start på {s} °C og gå {c} streker ned.', en: 'Start at {s} °C and go {c} steps down.' }, L, v),
          { type: 'line', min: -10, max: 10, marks: [-10, -5, 0, 5, 10], at: r, hop: { from: p.s, by: p.c } },
          warm ? tx({ da: 'Start ved tallet på termometeret. Gå op.', sv: 'Börja på talet på termometern. Gå uppåt.', no: 'Start på tallet på termometeret. Gå opp.', en: 'Start at the number on the thermometer. Go up.' }, L)
            : tx({ da: 'Start ved tallet på termometeret. Gå ned.', sv: 'Börja på talet på termometern. Gå neråt.', no: 'Start på tallet på termometeret. Gå ned.', en: 'Start at the number on the thermometer. Go down.' }, L)),
          H(U, L, tx({ da: 'Du lander på {r} °C.', sv: 'Du hamnar på {r} °C.', no: 'Du lander på {r} °C.', en: 'You land on {r} °C.' }, L, v), big(R + ' °C'),
            tx({ da: 'Se, hvor du lander.', sv: 'Se var du hamnar.', no: 'Se hvor du lander.', en: 'See where you land.' }, L))
        ],
        praise: (p.s < 0) !== (r < 0) || r === 0
          ? tx({ da: 'Ja! Du talte forbi 0 på termometeret.', sv: 'Rätt! Du räknade förbi 0 på termometern.', no: 'Riktig! Du talte forbi 0 på termometeret.', en: 'Right! You counted past 0 on the thermometer.' }, L)
          : tx({ da: 'Ja! Du talte streg for streg på termometeret.', sv: 'Rätt! Du räknade steg för steg på termometern.', no: 'Riktig! Du talte strek for strek på termometeret.', en: 'Right! You counted step by step on the thermometer.' }, L),
        key: { type: 'eq', q: q }
      };
    }
  });

  step({
    id: 't33', grade: 5, name: { da: 'Regnearternes rækkefølge', sv: 'Räknesättens ordning', no: 'Regnerekkefølge', en: 'Order of operations' },
    pick: function (U, L, E) {
      var form = U.pick(['a+bc', 'ab+c', 'a-bc', '(a+b)c', 'a+b:c']), hi = E ? 5 : 9, a = U.int(2, E ? 10 : 20), b = U.int(2, hi), c = U.int(2, hi);
      if (form === 'a-bc' && a <= b * c) a = b * c + U.int(1, E ? 5 : 15);
      if (form === 'a+b:c') { b = c * U.int(2, hi); }
      return { f: form, a: a, b: b, c: c };
    },
    key: function (p) { return p.f + ':' + p.a + ',' + p.b + ',' + p.c; },
    make: function (p, L, U) {
      var a = p.a, b = p.b, c = p.c, D = DIV[L], q, ans, err, how;
      var gen1 = tx({ da: 'Gange og division regner du før plus og minus.', sv: 'Gånger och delat kommer före plus och minus.', no: 'Ganging og deling kommer før pluss og minus.', en: 'Multiply and divide before you add and subtract.' }, L);
      var rest = tx({ da: 'Regn så resten.', sv: 'Räkna sedan resten.', no: 'Regn så resten.', en: 'Then work out the rest.' }, L);
      if (p.f === 'a+bc') { q = a + ' + ' + b + ' × ' + c; ans = a + b * c; err = (a + b) * c;
        how = [H(U, L, gen1, big(q), gen1), H(U, L, b + ' × ' + c + ' = ' + b * c + '. ' + a + ' + ' + b * c + ' = ' + ans + '.', big(q + ' = ' + ans), rest)]; }
      else if (p.f === 'ab+c') { q = a + ' × ' + b + ' + ' + c; ans = a * b + c; err = a * (b + c);
        how = [H(U, L, gen1, big(q), gen1), H(U, L, a + ' × ' + b + ' = ' + a * b + '. ' + a * b + ' + ' + c + ' = ' + ans + '.', big(q + ' = ' + ans), rest)]; }
      else if (p.f === 'a-bc') { q = a + ' ' + MINUS + ' ' + b + ' × ' + c; ans = a - b * c; err = (a - b) * c;
        how = [H(U, L, gen1, big(q), gen1), H(U, L, b + ' × ' + c + ' = ' + b * c + '. ' + a + ' ' + MINUS + ' ' + b * c + ' = ' + ans + '.', big(q + ' = ' + ans), rest)]; }
      else if (p.f === '(a+b)c') { q = '(' + a + ' + ' + b + ') × ' + c; ans = (a + b) * c; err = a + b * c;
        how = [H(U, L, tx({ da: 'Regn parentesen først: {a} + {b} = {s}.', sv: 'Parentesen räknas först: {a} + {b} = {s}.', no: 'Parentesen regnes først: {a} + {b} = {s}.', en: 'Work out the brackets first: {a} + {b} = {s}.' }, L, { a: a, b: b, s: a + b }), big(q),
          tx({ da: 'Regn parentesen først.', sv: 'Räkna parentesen först.', no: 'Regn parentesen først.', en: 'Work out the brackets first.' }, L)),
          H(U, L, (a + b) + ' × ' + c + ' = ' + ans + '.', big(q + ' = ' + ans), rest)]; }
      else { q = a + ' + ' + b + ' ' + D + ' ' + c; ans = a + b / c; err = (a + b) % c === 0 ? (a + b) / c : a + b;
        how = [H(U, L, gen1, big(q), gen1), H(U, L, b + ' ' + D + ' ' + c + ' = ' + b / c + '. ' + a + ' + ' + b / c + ' = ' + ans + '.', big(q + ' = ' + ans), rest)]; }
      var praise = p.f === '(a+b)c'
        ? tx({ da: 'Ja! Parentesen først.', sv: 'Rätt! Parentesen först.', no: 'Riktig! Parentesen først.', en: 'Right! Brackets first.' }, L)
        : tx({ da: 'Ja! Gange og division først.', sv: 'Rätt! Gånger och delat först.', no: 'Riktig! Ganging og deling først.', en: 'Right! Multiply and divide first.' }, L);
      var say = p.f === '(a+b)c' ? tx({ da: 'Regn stykket ud. Husk at regne parentesen først.', sv: 'Räkna ut talet. Kom ihåg att räkna parentesen först.', no: 'Regn ut stykket. Husk å regne parentesen først.', en: 'Work it out. Remember to do the brackets first.' }, L)
        : tx({ da: 'Regn stykket ud. Husk regnearternes rækkefølge.', sv: 'Räkna ut talet. Kom ihåg räknesättens ordning.', no: 'Regn ut stykket. Husk regnerekkefølgen.', en: 'Work it out. Remember the order of operations.' }, L);
      return eqChoice(U, L, q + ' = ▢', ans, [err, ans + 1, ans - 1, ans + 2], how, praise, { min: 0, say: say });
    }
  });

  /* ---------------- grade 0, the class 0 pack (slice 4, 2026-11-15) ----------------
     Numbers 1 to 10 by eye, ear and finger, and plain shapes. Nothing to read: the instruction is spoken, the numbers
     are dots, tally strokes, a numeral or a spoken word. */
  var PRAISE0 = { da: ['Flot!', 'Ja!', 'Super!'], en: ['Well done!', 'Yes!', 'Super!'] };
  function praise0(U, L) { return U.pick(PRAISE0[L] || PRAISE0.en); }
  function countHow(U, L, n, vis) {
    var s = seq(1, n), point = tx({ da: 'Peg på dem én ad gangen, og tæl.', sv: 'Peka på en i taget och räkna.', no: 'Pek på én om gangen og tell.', en: 'Point at each one and count.' }, L);
    return H(U, L, point.replace(/\.$/, ': ') + s + '.', vis, point + ' ' + s + '.');
  }
  // how a number is shown: dots, tally strokes, the numeral, or only the spoken word
  function amountVis(form, n) {
    if (form === 'dots') return { type: 'dots', n: n };
    if (form === 'tally') return { type: 'tally', n: n };
    if (form === 'hear') return { type: 'hear', n: n };
    return big(n);
  }
  step({
    id: 't36', grade: 0, name: { da: 'Samme tal', sv: 'Samma tal', no: 'Samme tall', en: 'The same number' },
    pick: function (U, L, E) {
      var n = U.int(1, E ? 5 : 10), shown = U.pick(['dots', 'tally', 'num', 'hear']);
      var other = { dots: ['num'], tally: ['num', 'dots'], num: ['dots', 'tally'], hear: ['num', 'dots'] }[shown];
      var near = [n - 1, n + 1, n - 2, n + 2, n + 3, n - 3].filter(function (k) { return k >= 1 && k <= 10; });
      return { n: n, s: shown, o: U.pick(other), w: U.sample(near.slice(0, 4), 2) };
    },
    key: function (p) { return p.s + p.n + p.o + p.w.join(','); },
    make: function (p, L, U) {
      var ask = tx({ da: 'Find det samme tal', sv: 'Hitta samma tal', no: 'Finn det samme tallet', en: 'Find the same number' }, L);
      function opt(k) { return p.o === 'num' ? { label: String(k) } : { visual: amountVis(p.o, k) }; }
      return {
        ui: 'choice', prompt: ask, say: ask + '.' + (p.s === 'hear' ? ' ' + p.n + '.' : ''),
        visual: amountVis(p.s, p.n),
        choice: U.choice(opt(p.n), p.w.map(opt), 3),
        how: [countHow(U, L, p.n, { type: 'dots', n: p.n }), H(U, L, String(p.n), big(p.n), is(L, p.n))],
        praise: praise0(U, L),
        key: { type: 'samenum' }
      };
    }
  });

  step({
    id: 't37', grade: 0, name: { da: 'Giv præcis så mange', sv: 'Ge exakt så många', no: 'Gi akkurat så mange', en: 'Give exactly that many' },
    pick: function (U, L, E) { return { n: U.int(2, E ? 5 : 10) }; },
    key: function (p) { return String(p.n); },
    make: function (p, L, U) {
      var ask = tx({ da: 'Må jeg få {n} bær?', sv: 'Får jag {n} bär?', no: 'Kan jeg få {n} bær?', en: 'Can I have {n} berries?' }, L, p);
      var one = tx({ da: 'Tæl én ad gangen.', sv: 'Räkna en i taget.', no: 'Tell én om gangen.', en: 'Count one at a time.' }, L);
      var stop = tx({ da: 'Stop ved {n}.', sv: 'Stanna på {n}.', no: 'Stopp på {n}.', en: 'Stop at {n}.' }, L, p);
      return {
        ui: 'give', prompt: ask, say: ask,
        visual: null,
        give: { n: p.n, emoji: '🍓', total: 10 },
        how: [H(U, L, one.replace(/\.$/, ': ') + seq(1, p.n) + '.', { type: 'dots', n: p.n, emoji: '🍓' }, one + ' ' + seq(1, p.n) + '.'), H(U, L, stop, big(p.n), stop)],
        praise: praise0(U, L),
        key: { type: 'give' }
      };
    }
  });

  var SHAPES = ['circle', 'triangle', 'square'];
  var SHAPE_T = {
    circle: { p: { da: 'Find alle cirklerne', en: 'Find all the circles' }, all: { da: 'Her er alle cirklerne.', en: 'Here are all the circles.' }, rule: { da: 'En cirkel er helt rund.', en: 'A circle is round all the way.' } },
    triangle: { p: { da: 'Find alle trekanterne', en: 'Find all the triangles' }, all: { da: 'Her er alle trekanterne.', en: 'Here are all the triangles.' }, rule: { da: 'En trekant har 3 hjørner.', en: 'A triangle has 3 corners.' } },
    square: { p: { da: 'Find alle firkanterne', en: 'Find all the squares' }, all: { da: 'Her er alle firkanterne.', en: 'Here are all the squares.' }, rule: { da: 'En firkant har 4 hjørner.', en: 'A square has 4 corners.' } }
  };
  step({
    id: 't38', grade: 0, name: { da: 'Find figuren', sv: 'Hitta formen', no: 'Finn formen', en: 'Find the shape' },
    pick: function (U, L, E) {
      var want = U.pick(SHAPES), k = U.int(2, E ? 3 : 4), others = SHAPES.filter(function (s) { return s !== want; }), items = [];
      for (var i = 0; i < 8; i++) {
        var s = i < k ? want : others[i % 2];
        // squares turn a little (a square on its corner reads as another shape to a six-year-old); triangles any way
        var rot = s === 'triangle' ? U.int(0, 11) * 30 : s === 'square' ? U.pick([-20, -10, 0, 10, 20]) : 0;
        items.push({ s: s, z: U.int(0, 2), r: rot, c: U.int(0, 4) });
      }
      return { want: want, items: U.shuffle(items) };
    },
    key: function (p) { return p.want + ':' + p.items.map(function (x) { return x.s.charAt(0) + x.z + x.r + x.c; }).join(''); },
    make: function (p, L, U) {
      var T = SHAPE_T[p.want];
      if (!T) return null;
      var ask = tx(T.p, L);
      return {
        ui: 'shapes', prompt: ask, say: ask + '.',
        visual: null,
        shapes: { items: p.items, want: p.want },
        how: [H(U, L, tx(T.all, L), { type: 'shapes', items: p.items, want: p.want, mark: true }), H(U, L, tx(T.rule, L), { type: 'shapes', items: [{ s: p.want, z: 2, r: 0, c: 0 }], want: p.want })],
        praise: praise0(U, L),
        key: { type: 'shapes' }
      };
    }
  });

  /* ---------------- ladder order: easiest first inside each class ---------------- */
  // Slice 4 put the class 0 pack in among the class 0 steps; a save finds its step by id, so nobody moves.
  var ORDER = ['t01', 't36', 't37', 't38', 't02', 't03', 't04', 't05',
    't06', 't07', 't18', 't08', 't11', 't34', 't09', 't10',
    't12', 't17', 't13', 't35', 't16', 't19', 't14', 't15',
    't20', 't22', 't25', 't23', 't24',
    't26', 't21', 't27', 't28', 't29',
    't30', 't31', 't32', 't33'];
  var byId = {};
  steps.forEach(function (s) { byId[s.id] = s; });
  if (ORDER.length !== steps.length || ORDER.some(function (id) { return !byId[id]; })) throw new Error('tal: ORDER does not match the steps');
  steps = ORDER.map(function (id) { return byId[id]; });

  var api = { steps: steps };
  G.Content.tal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
