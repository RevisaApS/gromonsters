/* Content: logik (patterns and logic). Pictures carry the tasks; words only in the last step (riddles).
   Speech never reads emoji: spoken lines use words, the shown text may hold the pictures. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  G.Content = G.Content || {};

  function f(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; }); }
  function tx(o, L, v) { return f(o[L] || o.en, v); }
  function H(text, visual, say) { return { text: text, say: say || text, visual: visual || null }; }
  function big(t) { return { type: 'big', text: String(t) }; }
  function rep(e, n) { var s = ''; for (var i = 0; i < n; i++) s += e; return s; }

  var MINUS = '−', TIMES = '×';
  var DIV = { da: ':', sv: '/', no: ':', en: '÷' };
  var PICS = ['🔴', '🔵', '⭐', '🌙', '🍎', '🍌', '🐟', '🐸', '🍄', '🎈', '🐞', '🦆'];
  var DOT = ['🔵', '⭐', '🍎', '🐟', '🌸', '🍄'];

  // Picture categories for "odd one out", with a rough main colour so a colour rule never competes with the category rule.
  var CATS = {
    animal: [['🐶', 'brown'], ['🐱', 'yellow'], ['🐭', 'grey'], ['🐰', 'white'], ['🦊', 'orange'], ['🐻', 'brown'], ['🐷', 'pink'], ['🐮', 'white'], ['🐸', 'green'], ['🐴', 'brown']],
    fruit: [['🍎', 'red'], ['🍌', 'yellow'], ['🍐', 'green'], ['🍓', 'red'], ['🍋', 'yellow'], ['🍉', 'red'], ['🍍', 'yellow'], ['🍒', 'red']],
    wheels: [['🚗', 'red'], ['🚌', 'yellow'], ['🚂', 'black'], ['🚜', 'green'], ['🚲', 'mixed'], ['🚑', 'white'], ['🚒', 'red'], ['🚕', 'yellow']],
    wear: [['🎩', 'black'], ['👓', 'black'], ['👕', 'blue'], ['👖', 'blue'], ['🧦', 'mixed'], ['🧣', 'red'], ['👗', 'blue'], ['🧢', 'blue']]
  };
  var CAT_OF = {}, COLOUR = {};
  Object.keys(CATS).forEach(function (c) { CATS[c].forEach(function (x) { CAT_OF[x[0]] = c; COLOUR[x[0]] = x[1]; }); });
  var CAT_TXT = {
    animal: { da: 'er dyr', sv: 'är djur', no: 'er dyr', en: 'are animals' },
    fruit: { da: 'er frugt', sv: 'är frukt', no: 'er frukt', en: 'are fruit' },
    wheels: { da: 'har hjul', sv: 'har hjul', no: 'har hjul', en: 'have wheels' },
    wear: { da: 'kan man have på', sv: 'kan man ha på sig', no: 'kan man ha på seg', en: 'are things you wear' }
  };
  // Definite names for spoken lines about the balance and the riddles.
  var NAMES = {
    '🍎': { da: 'æblet', sv: 'äpplet', no: 'eplet', en: 'the apple' },
    '🍐': { da: 'pæren', sv: 'päronet', no: 'pæren', en: 'the pear' },
    '🍌': { da: 'bananen', sv: 'bananen', no: 'bananen', en: 'the banana' },
    '🍓': { da: 'jordbærret', sv: 'jordgubben', no: 'jordbæret', en: 'the strawberry' },
    '🥕': { da: 'guleroden', sv: 'moroten', no: 'gulroten', en: 'the carrot' }
  };
  var WEIGHTS = ['🍎', '🍐', '🍌', '🍓', '🥕'];
  var FRIENDS = ['Crabbi', 'Boblo', 'Ondi', 'Løvi', 'Elko', 'Kvisti', 'Glødi', 'Gnisti', 'Rimo', 'Kobbi', 'Lunni', 'Tordi', 'Glimra', 'Krysto', 'Paddo', 'Lygti'];

  var T = {
    next: { da: 'Hvad kommer nu?', sv: 'Vad kommer sedan?', no: 'Hva kommer nå?', en: 'What comes next?' },
    gap: { da: 'Hvad mangler?', sv: 'Vad fattas?', no: 'Hva mangler?', en: 'What is missing?' },
    nextNum: { da: 'Hvilket tal kommer nu?', sv: 'Vilket tal kommer sedan?', no: 'Hvilket tall kommer nå?', en: 'Which number comes next?' },
    gapNum: { da: 'Hvilket tal mangler?', sv: 'Vilket tal fattas?', no: 'Hvilket tall mangler?', en: 'Which number is missing?' },
    patH1: { da: 'Mønsteret er {u}. Det kommer igen og igen.', sv: 'Mönstret är {u}, om och om igen.', no: 'Mønsteret er {u}, igjen og igjen.', en: 'The pattern is {u}, again and again.' },
    patS1: { da: 'Find den del, der kommer igen og igen.', sv: 'Hitta den del av mönstret som upprepas.', no: 'Finn den delen av mønsteret som gjentar seg.', en: 'Find the part of the pattern that repeats.' },
    patH2: { da: 'Så skal der stå {x}.', sv: 'Då ska det stå {x}.', no: 'Da skal det stå {x}.', en: 'So it must be {x}.' },
    patS2: { da: 'Nu ved du, hvad der skal stå på den tomme plads.', sv: 'Då vet du vad som ska stå i luckan.', no: 'Da vet du hva som skal stå i hullet.', en: 'Now you know what goes in the gap.' },
    patOk: { da: 'Ja! Du fandt det, der kommer igen.', sv: 'Rätt: mönstret upprepar sig.', no: 'Riktig: mønsteret gjentar seg.', en: 'Right: the pattern repeats.' },
    oddP: { da: 'Hvilken hører ikke til?', sv: 'Vilken passar inte in?', no: 'Hvilken passer ikke inn?', en: 'Which one does not belong?' },
    oddH1: { da: '{abc} {cat}.', sv: '{abc} {cat}.', no: '{abc} {cat}.', en: '{abc} {cat}.' },
    oddS1: { da: 'Tre af dem {cat}.', sv: 'Tre av dem {cat}.', no: 'Tre av dem {cat}.', en: 'Three of them {cat}.' },
    oddH2: { da: '{d} hører ikke til.', sv: '{d} passar inte in.', no: '{d} passer ikke inn.', en: '{d} does not belong.' },
    oddS2: { da: 'Den sidste hører ikke til.', sv: 'Den sista passar inte in.', no: 'Den siste passer ikke inn.', en: 'The last one does not belong.' },
    oddOk: { da: 'Ja! Tre hører sammen, og én gør ikke.', sv: 'Rätt: tre hör ihop, en gör det inte.', no: 'Riktig: tre hører sammen, én gjør ikke.', en: 'Right: three go together, one does not.' },
    growS: { da: 'Mønsteret vokser. Hvad kommer nu?', sv: 'Mönstret växer. Vad kommer sedan?', no: 'Mønsteret vokser. Hva kommer nå?', en: 'The pattern grows. What comes next?' },
    growH1: { da: 'Hver gang kommer der {d} til.', sv: 'Det blir {d} mer varje gång.', no: 'Det blir {d} mer hver gang.', en: 'It grows by {d} each time.' },
    growOk: { da: 'Ja! Mønsteret vokser lige meget hver gang.', sv: 'Rätt! Mönstret växer lika mycket varje gång.', no: 'Riktig! Mønsteret vokser like mye hver gang.', en: 'Right! The pattern grows by the same each time.' },
    up: { da: 'Tallet bliver {k} større hver gang.', sv: 'Det blir {k} mer varje gång.', no: 'Det blir {k} mer hver gang.', en: 'It goes up by {k} each time.' },
    down: { da: 'Tallet bliver {k} mindre hver gang.', sv: 'Det blir {k} mindre varje gång.', no: 'Det blir {k} mindre hver gang.', en: 'It goes down by {k} each time.' },
    stepOk: { da: 'Ja! Samme spring hver gang.', sv: 'Rätt: samma hopp varje gång.', no: 'Riktig: samme hopp hver gang.', en: 'Right: the same jump each time.' },
    gridS: { da: 'Hver figur er der én gang i hver række og i hver søjle. Hvad mangler?', sv: 'Varje rad och varje kolumn har varje figur en gång. Vad fattas?', no: 'Hver rad og hver kolonne har hver figur én gang. Hva mangler?', en: 'Each row and each column has each picture once. What is missing?' },
    gridI: { da: 'Hver figur er der én gang i hver række og i hver søjle.', sv: 'Varje rad och varje kolumn har varje figur en gång.', no: 'Hver rad og hver kolonne har hver figur én gang.', en: 'Each row and each column has each picture once.' },
    gridH1: { da: 'Hver figur er der én gang i hver række og hver søjle.', sv: 'Varje rad och kolumn har varje figur en gång.', no: 'Hver rad og kolonne har hver figur én gang.', en: 'Each row and column has each picture once.' },
    gridH2: { da: 'Her mangler {x}.', sv: 'Här fattas {x}.', no: 'Her mangler {x}.', en: '{x} is missing here.' },
    gridS2: { da: 'Se, hvilken figur rækken og søjlen mangler.', sv: 'Se vilken figur raden och kolumnen saknar.', no: 'Se hvilken figur raden og kolonnen mangler.', en: 'See which picture the row and the column are missing.' },
    gridOk: { da: 'Ja! Én af hver i hver række.', sv: 'Rätt: en av varje i varje rad.', no: 'Riktig: én av hver i hver rad.', en: 'Right: one of each in every row.' },
    x2: { da: 'Hvert tal er det dobbelte af tallet før.', sv: 'Varje tal är det dubbla av det förra.', no: 'Hvert tall er det dobbelte av det forrige.', en: 'Each number is double the one before.' },
    alt: { da: 'To regler skiftes: først {r1}, så {r2}.', sv: 'Två regler turas om: {r1}, sedan {r2}.', no: 'To regler bytter på: {r1}, så {r2}.', en: 'Two rules take turns: {r1}, then {r2}.' },
    altNow: { da: 'Nu er det {rn}: {e}.', sv: 'Nu är det {rn}: {e}.', no: 'Nå er det {rn}: {e}.', en: 'Now it is {rn}: {e}.' },
    balP: { da: 'Hvad vejer {e}?', sv: 'Vad väger {e}?', no: 'Hva veier {e}?', en: 'What does {e} weigh?' },
    balS: { da: 'Vægten står lige. Hvad vejer {e}?', sv: 'Vågen väger jämnt. Vad väger {e}?', no: 'Vekten er i balanse. Hva veier {e}?', en: 'The scale is level. What does {e} weigh?' },
    balTake: { da: 'Tag {c} væk på begge sider. Så er der {rc} tilbage.', sv: 'Ta bort {c} från båda sidor. Kvar är {rc}.', no: 'Ta bort {c} fra begge sider. Igjen er {rc}.', en: 'Take {c} off both sides. That leaves {rc}.' },
    balSame: { da: 'Der ligger {k} ens på vægten. Tilsammen vejer de {R}.', sv: 'Det är {k} likadana på vågen, och de väger {R}.', no: 'Det er {k} like på vekten, og de veier {R}.', en: 'There are {k} the same on the scale, and they weigh {R}.' },
    balDiv: { da: '{rc} {div} {k} = {x}. Så vejer {e} {x}.', sv: '{rc} {div} {k} = {x}, så väger {e} {x}.', no: '{rc} {div} {k} = {x}, så veier {e} {x}.', en: '{rc} {div} {k} = {x}, so {e} weighs {x}.' },
    balOne: { da: 'Så vejer {e} {x}.', sv: 'Så väger {e} {x}.', no: 'Så veier {e} {x}.', en: 'So {e} weighs {x}.' },
    balOk: { da: 'Ja! Lige meget på begge sider.', sv: 'Rätt: lika mycket på båda sidor.', no: 'Riktig: det samme på begge sider.', en: 'Right: the same on both sides.' },
    bal2a: { da: 'Nederst er der det samme som øverst og så {e} en gang til.', sv: 'Nederst ligger samma sak som överst plus {e}.', no: 'Nederst ligger det samme som øverst pluss {e}.', en: 'The bottom scale has the same as the top, plus {e}.' },
    bal2b: { da: 'Så vejer {e} {T} − {S}. Det er {x}.', sv: 'Alltså väger {e} {T} − {S} = {x}.', no: 'Så veier {e} {T} − {S} = {x}.', en: 'So {e} weighs {T} − {S} = {x}.' },
    bal2c: { da: 'Og {e} vejer {S} − {x}. Det er {y}.', sv: 'Och {e} väger {S} − {x} = {y}.', no: 'Og {e} veier {S} − {x} = {y}.', en: 'And {e} weighs {S} − {x} = {y}.' },
    machP: { da: 'Hvad kommer ud?', sv: 'Vad kommer ut?', no: 'Hva kommer ut?', en: 'What comes out?' },
    machS: { da: 'Maskinen gør det samme ved alle tal. Hvad kommer ud?', sv: 'Maskinen gör samma sak med alla tal. Vad kommer ut?', no: 'Maskinen gjør det samme med alle tall. Hva kommer ut?', en: 'The machine does the same thing to every number. What comes out?' },
    machH1: { da: 'Maskinen gør to ting: først {s1}, så {s2}.', sv: 'Maskinen gör två saker: först {s1}, sedan {s2}.', no: 'Maskinen gjør to ting: først {s1}, så {s2}.', en: 'The machine does two things: first {s1}, then {s2}.' },
    machOk: { da: 'Ja! Begge trin i den rigtige rækkefølge.', sv: 'Rätt: båda stegen i ordning.', no: 'Riktig: begge trinnene i rekkefølge.', en: 'Right: both steps in order.' },
    sq: { da: 'Det er kvadrattal. Et tal gange sig selv.', sv: 'Det är kvadrattal: ett tal gånger sig självt.', no: 'Det er kvadrattall: et tall ganget med seg selv.', en: 'These are square numbers: a number times itself.' },
    tri: { da: 'Springet bliver 1 større hver gang.', sv: 'Hoppet blir 1 större varje gång.', no: 'Hoppet blir 1 større hver gang.', en: 'The jump grows by 1 each time.' },
    fib: { da: 'Læg de to sidste tal sammen.', sv: 'Lägg ihop de två sista talen.', no: 'Legg sammen de to siste tallene.', en: 'Add the last two numbers.' },
    ruleOk: { da: 'Ja! Du fandt reglen.', sv: 'Rätt: regeln hittad.', no: 'Riktig: regelen funnet.', en: 'Right: the rule found.' },
    ridH1: { da: 'Tag ét spor ad gangen. Sæt dem i rækkefølge.', sv: 'Ta en ledtråd i taget och ställ dem i ordning.', no: 'Ta ett hint om gangen og sett dem i rekkefølge.', en: 'Take one clue at a time and put them in order.' },
    ridH2: { da: 'Svaret er {a}.', sv: 'Svaret är {a}.', no: 'Svaret er {a}.', en: 'The answer is {a}.' },
    upS: { da: 'Se, hvor meget tallet ændrer sig hver gang.', sv: 'Se hur mycket talet ändras varje gång.', no: 'Se hvor mye tallet endrer seg hver gang.', en: 'See how much the number changes each time.' },
    againS: { da: 'Gør det samme én gang til.', sv: 'Gör samma sak en gång till.', no: 'Gjør det samme én gang til.', en: 'Do the same once more.' },
    x2S: { da: 'Gang det sidste tal med 2.', sv: 'Ta det sista talet gånger 2.', no: 'Gang det siste tallet med 2.', en: 'Multiply the last number by 2.' },
    p3S: { da: 'Læg 3 til det sidste tal.', sv: 'Lägg till 3 till det sista talet.', no: 'Legg 3 til det siste tallet.', en: 'Add 3 to the last number.' },
    altS: { da: 'To regler skiftes.', sv: 'Två regler turas om.', no: 'To regler bytter på.', en: 'Two rules take turns.' },
    altNowS: { da: 'Brug den regel, der er tur nu.', sv: 'Använd regeln som är på tur nu.', no: 'Bruk regelen som har tur nå.', en: 'Use the rule whose turn it is.' },
    balTakeS: { da: 'Tag det samme tal væk på begge sider.', sv: 'Ta bort samma tal från båda sidor.', no: 'Ta bort det samme tallet fra begge sider.', en: 'Take the same number off both sides.' },
    balSameS: { da: 'Frugterne på vægten vejer lige meget.', sv: 'Frukterna på vågen väger lika mycket.', no: 'Fruktene på vekten veier like mye.', en: 'The fruits on the scale weigh the same.' },
    balDivS: { da: 'Del med antallet af frugter. Så ved du, hvad én vejer.', sv: 'Dela med antalet frukter. Då vet du vad en väger.', no: 'Del på antallet frukter. Da vet du hva én veier.', en: 'Divide by the number of fruits. Then you know what one weighs.' },
    balOneS: { da: 'Så ved du, hvad den vejer.', sv: 'Då vet du vad den väger.', no: 'Da vet du hva den veier.', en: 'Then you know what it weighs.' },
    bal2aS: { da: 'Nederst er der én frugt mere end øverst.', sv: 'Nederst finns en frukt mer än överst.', no: 'Nederst er det én frukt mer enn øverst.', en: 'The bottom scale has one more fruit than the top.' },
    bal2bS: { da: 'Forskellen på de to vægte er, hvad den ekstra frugt vejer.', sv: 'Skillnaden mellan vågarna är vad den extra frukten väger.', no: 'Forskjellen på de to vektene er hva den ekstra frukten veier.', en: 'The difference between the scales is what the extra fruit weighs.' },
    bal2cS: { da: 'Træk den fra øverst. Så har du den anden.', sv: 'Ta bort den överst. Då har du den andra.', no: 'Trekk den fra øverst. Da har du den andre.', en: 'Take it off the top scale. Then you have the other one.' },
    machS1: { da: 'Maskinen gør to ting efter hinanden.', sv: 'Maskinen gör två saker efter varandra.', no: 'Maskinen gjør to ting etter hverandre.', en: 'The machine does two things, one after the other.' },
    machS2: { da: 'Gør de to ting med det nye tal.', sv: 'Gör de två sakerna med det nya talet.', no: 'Gjør de to tingene med det nye tallet.', en: 'Do the two things to the new number.' },
    sqS: { da: 'Gang det næste tal med sig selv.', sv: 'Ta nästa tal gånger sig självt.', no: 'Gang det neste tallet med seg selv.', en: 'Multiply the next number by itself.' },
    triS: { da: 'Gør springet én større.', sv: 'Gör hoppet ett större.', no: 'Gjør hoppet én større.', en: 'Make the jump one bigger.' },
    ridS: { da: 'Læs gåden, og find svaret.', sv: 'Läs gåtan och hitta svaret.', no: 'Les gåten og finn svaret.', en: 'Read the riddle and find the answer.' },
    ridS2: { da: 'Nu kan du se svaret.', sv: 'Nu kan du se svaret.', no: 'Nå kan du se svaret.', en: 'Now you can see the answer.' },
    ridOk: { da: 'Ja! Ét spor ad gangen.', sv: 'Rätt: en ledtråd i taget.', no: 'Riktig: ett hint om gangen.', en: 'Right: one clue at a time.' }
  };

  var steps = [];
  function step(o) { steps.push(o); }

  /* ---------- picture patterns ---------- */
  var UNITS = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2] };
  function patternTask(p, L, U) {
    var syms = p.s, unit = UNITS[p.u].map(function (i) { return syms[i]; });
    var items = [];
    for (var i = 0; i < p.n; i++) items.push(unit[i % unit.length]);
    var ans = items[p.g];
    items[p.g] = '?';
    var distinct = [];
    syms.forEach(function (s) { if (distinct.indexOf(s) < 0) distinct.push(s); });
    var wr = distinct.filter(function (s) { return s !== ans; });
    if (wr.length < 2) wr.push(p.x);
    var opts = U.choice({ emoji: ans }, wr.slice(0, 2).map(function (e) { return { emoji: e }; }), 3);
    var u = unit.join(' ');
    return {
      ui: 'choice', prompt: tx(p.g === p.n - 1 ? T.next : T.gap, L), say: tx(p.g === p.n - 1 ? T.next : T.gap, L),
      visual: { type: 'seq', items: items },
      choice: opts,
      how: [H(tx(T.patH1, L, { u: u }), { type: 'seq', items: unit }, tx(T.patS1, L)), H(tx(T.patH2, L, { x: ans }), { type: 'emoji', emoji: ans }, tx(T.patS2, L))],
      praise: tx(T.patOk, L),
      key: { type: 'seqpat' }
    };
  }
  function pickSyms(U, k) { var s = U.sample(PICS, k + 1); return { s: s.slice(0, k), x: s[k] }; }

  step({
    id: 'l01', grade: 0, name: { da: 'AB-mønstre', sv: 'AB-mönster', no: 'AB-mønstre', en: 'AB patterns' },
    pick: function (U, L, E) { var s = pickSyms(U, 2), n = U.int(E ? 6 : 5, 7); return { u: 'AB', s: s.s, x: s.x, n: n, g: n - 1 }; },
    key: function (p) { return p.u + p.s.join('') + p.n + ':' + p.g; },
    make: function (p, L, U) { return patternTask(p, L, U); }
  });

  step({
    id: 'l02', grade: 0, name: { da: 'Hvilken hører ikke til?', sv: 'Hitta den som inte passar', no: 'Finn den som ikke passer', en: 'Odd one out' },
    pick: function (U) {
      var cats = Object.keys(CATS), c = U.pick(cats), o = U.pick(cats.filter(function (x) { return x !== c; }));
      var three = U.sample(CATS[c], 3).map(function (x) { return x[0]; }), odd = U.pick(CATS[o])[0];
      var cols = three.concat(odd).map(function (e) { return COLOUR[e]; });
      var most = 0;
      cols.forEach(function (x) { var n = cols.filter(function (y) { return y === x; }).length; if (n > most) most = n; });
      if (most >= 3) return null;
      return { t: three, d: odd, c: c };
    },
    key: function (p) { return p.t.slice().sort().join('') + '|' + p.d; },
    make: function (p, L, U) {
      var cat = tx(CAT_TXT[p.c], L);
      var opts = U.choice({ emoji: p.d }, p.t.map(function (e) { return { emoji: e }; }), 4);
      return {
        ui: 'choice', prompt: tx(T.oddP, L), say: tx(T.oddP, L), visual: null, choice: opts,
        how: [H(tx(T.oddH1, L, { abc: p.t.join(' '), cat: cat }), { type: 'seq', items: p.t }, tx(T.oddS1, L, { cat: cat })),
          H(tx(T.oddH2, L, { d: p.d }), { type: 'emoji', emoji: p.d }, tx(T.oddS2, L))],
        praise: tx(T.oddOk, L),
        key: { type: 'odd' }
      };
    }
  });

  step({
    id: 'l03', grade: 1, name: { da: 'Længere mønstre', sv: 'Längre mönster', no: 'Lengre mønstre', en: 'Longer patterns' },
    pick: function (U, L, E) {
      var u = U.pick(E ? ['AAB', 'ABB'] : ['AAB', 'ABB', 'ABC']), s = pickSyms(U, u === 'ABC' ? 3 : 2), n = U.int(6, 8);
      return { u: u, s: s.s, x: s.x, n: n, g: n - 1 };
    },
    key: function (p) { return p.u + p.s.join('') + p.n + ':' + p.g; },
    make: function (p, L, U) { return patternTask(p, L, U); }
  });

  step({
    id: 'l04', grade: 1, name: { da: 'Hul i mønsteret', sv: 'Lucka i mönstret', no: 'Hull i mønsteret', en: 'A gap in the pattern' },
    pick: function (U, L, E) {
      var u = U.pick(E ? ['AB', 'AAB', 'ABB'] : ['AB', 'AAB', 'ABB', 'ABC']), len = UNITS[u].length, s = pickSyms(U, u === 'ABC' ? 3 : 2), n = len * 3;
      return { u: u, s: s.s, x: s.x, n: n, g: U.int(len, 2 * len - 1) };
    },
    key: function (p) { return p.u + p.s.join('') + p.n + ':' + p.g; },
    make: function (p, L, U) { return patternTask(p, L, U); }
  });

  step({
    id: 'l05', grade: 1, name: { da: 'Voksende mønstre', sv: 'Växande mönster', no: 'Voksende mønstre', en: 'Growing patterns' },
    pick: function (U, L, E) { var d = E ? 1 : U.pick([1, 1, 2]); return { s: d === 2 ? 1 : U.int(1, 2), d: d, e: U.int(0, DOT.length - 1) }; },
    key: function (p) { return p.s + '+' + p.d + DOT[p.e]; },
    make: function (p, L, U) {
      var e = DOT[p.e], items = [], i;
      for (i = 0; i < 3; i++) items.push(rep(e, p.s + i * p.d));
      var last = p.s + 2 * p.d, ans = last + p.d;
      items.push('?');
      var wrong = p.d === 2 ? [ans - 1, ans + 2] : [ans + 1, last];
      var dots = function (n) { return { visual: { type: 'dots', n: n, emoji: e } }; };
      return {
        ui: 'choice', prompt: tx(T.next, L), say: tx(T.growS, L),
        visual: { type: 'seq', items: items },
        choice: U.choice(dots(ans), wrong.map(dots), 3),
        how: [H(tx(T.growH1, L, { d: p.d }), { type: 'seq', items: items }), H(last + ' + ' + p.d + ' = ' + ans, { type: 'dots', n: ans, emoji: e }, U.sp(last + ' + ' + p.d + ' = ' + ans, L) + '.')],
        praise: tx(T.growOk, L),
        key: { type: 'grow', unit: e }
      };
    }
  });

  /* ---------- number sequences ---------- */
  function numSeqTask(items, gi, ans, how, L, U, cands, praise) {
    var shown = items.map(String);
    shown[gi] = '?';
    return {
      ui: 'choice', prompt: tx(gi === items.length - 1 ? T.nextNum : T.gapNum, L), say: tx(gi === items.length - 1 ? T.nextNum : T.gapNum, L),
      visual: { type: 'seq', items: shown },
      choice: U.numChoice(ans, cands, L, 3),
      how: how, praise: praise, key: { type: 'seqnum' }
    };
  }
  function sp(U, L, t) { return U.sp(t, L); }

  step({
    id: 'l06', grade: 2, name: { da: 'Talfølger', sv: 'Talföljder', no: 'Tallfølger', en: 'Number sequences' },
    pick: function (U, L, E) {
      var k = U.pick(E ? [2, 10, -1] : [2, 5, 10, -1, -2]), n = 6;
      var s = k > 0 ? U.int(0, E ? 6 : 12) : U.int(E ? 10 : 12, E ? 20 : 30);
      if (k === 5 || k === 10) s = k * U.int(0, 5);
      return { k: k, s: s, n: n, g: E || U.chance(0.7) ? n - 1 : U.int(2, n - 2) };
    },
    key: function (p) { return p.s + (p.k > 0 ? '+' : '') + p.k + ':' + p.g; },
    make: function (p, L, U) {
      var items = [];
      for (var i = 0; i < p.n; i++) items.push(p.s + i * p.k);
      var ans = items[p.g], k = Math.abs(p.k), prev = p.g > 0 ? items[p.g - 1] : null;
      var e = p.k > 0 ? prev + ' + ' + k + ' = ' + ans : prev + ' ' + MINUS + ' ' + k + ' = ' + ans;
      var how = [H(tx(p.k > 0 ? T.up : T.down, L, { k: k }), { type: 'seq', items: items.map(function (x, i) { return i === p.g ? '?' : String(x); }) }, tx(T.upS, L)),
        H(e, big(e), tx(T.againS, L))];
      return numSeqTask(items, p.g, ans, how, L, U, [ans + 1, ans - 1, ans + p.k, ans - p.k], tx(T.stepOk, L));
    }
  });

  step({
    id: 'l07', grade: 2, name: { da: 'Mini-sudoku 2 × 2', sv: 'Figurruta 2 × 2', no: 'Figurrute 2 × 2', en: 'Picture grid 2 × 2' },
    pick: function (U) { var s = U.sample(PICS, 3); return { a: s[0], b: s[1], x: s[2], g: U.int(0, 3), flip: U.chance(0.5) ? 1 : 0 }; },
    key: function (p) { return p.a + p.b + p.flip + ':' + p.g; },
    make: function (p, L, U) {
      var cells = p.flip ? [p.b, p.a, p.a, p.b] : [p.a, p.b, p.b, p.a];
      var ans = cells[p.g];
      cells[p.g] = '?';
      var other = ans === p.a ? p.b : p.a;
      return {
        // the rule is spoken only the first times he meets the grid (intro); after that the question alone
        ui: 'choice', prompt: tx(T.gap, L), say: tx(T.gap, L), intro: tx(T.gridI, L),
        visual: { type: 'grid', size: 2, cells: cells },
        choice: U.choice({ emoji: ans }, [{ emoji: other }, { emoji: p.x }], 3),
        how: [H(tx(T.gridH1, L), { type: 'grid', size: 2, cells: cells }, tx(T.gridS2, L)), H(tx(T.gridH2, L, { x: ans }), { type: 'emoji', emoji: ans }, tx(T.patS2, L))],
        praise: tx(T.gridOk, L),
        key: { type: 'grid' }
      };
    }
  });

  step({
    id: 'l08', grade: 3, name: { da: 'Talfølger med to regler', sv: 'Talföljder med två regler', no: 'Tallfølger med to regler', en: 'Sequences with two rules' },
    pick: function (U, L, E) {
      var kind = U.pick(E ? ['x2', 'p3'] : ['x2', 'p3', 'alt', 'alt']);
      if (kind === 'x2') return { kind: kind, s: U.int(1, 3) };   // the answer stays under 100
      if (kind === 'p3') return { kind: kind, s: U.int(1, E ? 10 : 20) };
      var a = U.int(2, 6), b = -U.int(1, a - 1);
      if (U.chance(0.3)) { a = U.int(5, 10); b = -U.int(1, 4); }
      return { kind: kind, s: U.int(1, 10), a: a, b: b };
    },
    key: function (p) { return p.kind + ':' + p.s + (p.a ? ':' + p.a + p.b : ''); },
    make: function (p, L, U) {
      var items = [p.s], i, how, n = p.kind === 'alt' ? 6 : 5;
      for (i = 1; i < n + 1; i++) {
        var prev = items[i - 1];
        items.push(p.kind === 'x2' ? prev * 2 : p.kind === 'p3' ? prev + 3 : prev + (i % 2 === 1 ? p.a : p.b));
      }
      var ans = items[n], last = items[n - 1];
      var shownList = items.slice(0, n).map(String).concat('?');
      if (p.kind === 'x2') {
        how = [H(tx(T.x2, L), { type: 'seq', items: shownList }), H(last + ' × 2 = ' + ans, big(last + ' ' + TIMES + ' 2 = ' + ans), tx(T.x2S, L))];
      } else if (p.kind === 'p3') {
        how = [H(tx(T.up, L, { k: 3 }), { type: 'seq', items: shownList }), H(last + ' + 3 = ' + ans, big(last + ' + 3 = ' + ans), tx(T.p3S, L))];
      } else {
        var r1 = '+ ' + p.a, r2 = MINUS + ' ' + (-p.b), rn = n % 2 === 1 ? r1 : r2;
        var e = last + ' ' + rn + ' = ' + ans;
        how = [H(tx(T.alt, L, { r1: r1, r2: r2 }), { type: 'seq', items: shownList }, tx(T.altS, L)),
          H(tx(T.altNow, L, { rn: rn, e: e }), big(e), tx(T.altNowS, L))];
      }
      var full = items.slice(0, n + 1);
      return numSeqTask(full, n, ans, how, L, U, [ans + 1, ans - 1, last + (ans - last) * 2, last * 2, last + 3], tx(T.ruleOk, L));
    }
  });

  step({
    id: 'l09', grade: 3, name: { da: 'Vægt med én ukendt', sv: 'Våg med en okänd', no: 'Vekt med én ukjent', en: 'Balance with one unknown' },
    pick: function (U, L, E) {
      var k = U.int(1, E ? 2 : 4), c = U.chance(0.5) || k === 1 ? U.int(1, E ? 5 : 9) : 0;
      return { e: U.int(0, WEIGHTS.length - 1), x: U.int(2, E ? 6 : 10), k: k, c: c };
    },
    key: function (p) { return WEIGHTS[p.e] + p.k + 'x+' + p.c + '=' + (p.k * p.x + p.c); },
    make: function (p, L, U) {
      var e = WEIGHTS[p.e], nm = NAMES[e][L], R = p.k * p.x + p.c, rc = p.k * p.x, left = [];
      for (var i = 0; i < p.k; i++) left.push(e);
      if (p.c) left.push(p.c);
      var how = [];
      if (p.c) how.push(H(tx(T.balTake, L, { c: p.c, rc: rc }), big(rep(e, p.k) + ' = ' + rc), tx(T.balTakeS, L)));
      else how.push(H(tx(T.balSame, L, { k: p.k, R: R }), big(rep(e, p.k) + ' = ' + R), tx(T.balSameS, L)));
      if (p.k > 1) how.push(H(tx(T.balDiv, L, { rc: rc, div: DIV[L], k: p.k, x: p.x, e: e }), big(e + ' = ' + p.x), tx(T.balDivS, L)));
      else how.push(H(tx(T.balOne, L, { e: e, x: p.x }), big(e + ' = ' + p.x), tx(T.balOneS, L)));
      return {
        ui: 'choice', prompt: tx(T.balP, L, { e: e }), say: tx(T.balS, L, { e: nm }),
        visual: { type: 'balance', rows: [{ left: left, right: R }] },
        choice: U.numChoice(p.x, [R, rc, p.x + 1, p.x - 1, R - p.x], L, 3, { min: 1 }),
        how: how, praise: tx(T.balOk, L), key: { type: 'balance', ask: e }
      };
    }
  });

  step({
    id: 'l10', grade: 4, name: { da: 'Mini-sudoku 3 × 3', sv: 'Figurruta 3 × 3', no: 'Figurrute 3 × 3', en: 'Picture grid 3 × 3' },
    pick: function (U) {
      var s = U.sample(PICS, 3), rows = U.shuffle([0, 1, 2]), cols = U.shuffle([0, 1, 2]);
      return { s: s, r: rows, c: cols, g: U.int(0, 8), b: U.int(0, 1) };
    },
    key: function (p) { return p.s.join('') + p.r.join('') + p.c.join('') + ':' + p.g + p.b; },
    make: function (p, L, U) {
      var cells = [];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cells.push(p.s[(p.r[r] + p.c[c]) % 3]);
      var ans = cells[p.g], row = Math.floor(p.g / 3), col = p.g % 3;
      cells[p.g] = '?';
      // hide one more cell in the same row, so the column must be used too
      var other = [0, 1, 2].filter(function (x) { return x !== col; })[p.b];
      cells[row * 3 + other] = '';
      var wr = p.s.filter(function (x) { return x !== ans; });
      return {
        ui: 'choice', prompt: tx(T.gap, L), say: tx(T.gap, L), intro: tx(T.gridI, L),
        visual: { type: 'grid', size: 3, cells: cells },
        choice: U.choice({ emoji: ans }, wr.map(function (x) { return { emoji: x }; }), 3),
        how: [H(tx(T.gridH1, L), { type: 'grid', size: 3, cells: cells }, tx(T.gridS2, L)), H(tx(T.gridH2, L, { x: ans }), { type: 'emoji', emoji: ans }, tx(T.patS2, L))],
        praise: tx(T.gridOk, L),
        key: { type: 'grid' }
      };
    }
  });

  step({
    id: 'l11', grade: 4, name: { da: 'Talmaskine', sv: 'Talmaskin', no: 'Tallmaskin', en: 'Number machine' },
    pick: function (U, L, E) {
      // three inputs in a row, so the jump between the outputs shows the multiplier; easy: the next input is asked
      var kind = U.pick(['mul-add', 'mul-sub', 'add-mul']), a = U.int(2, E ? 3 : 5), b = U.int(1, E ? 5 : 9);
      var s0 = U.int(1, 4), ins = [s0, s0 + 1, s0 + 2], ask = E ? s0 + 3 : U.int(s0 + 3, 10);
      if (kind === 'mul-sub' && a * ins[0] - b < 0) return null;
      return { kind: kind, a: a, b: b, ins: ins, ask: ask };
    },
    key: function (p) { return p.kind + p.a + ',' + p.b + ':' + p.ins.join('.') + '>' + p.ask; },
    make: function (p, L, U) {
      var fn = function (x) { return p.kind === 'mul-add' ? x * p.a + p.b : p.kind === 'mul-sub' ? x * p.a - p.b : (x + p.b) * p.a; };
      var pairs = p.ins.map(function (x) { return [x, fn(x)]; }), ans = fn(p.ask);
      var s1 = p.kind === 'add-mul' ? '+ ' + p.b : '× ' + p.a;
      var s2 = p.kind === 'add-mul' ? '× ' + p.a : p.kind === 'mul-add' ? '+ ' + p.b : MINUS + ' ' + p.b;
      var mid = p.kind === 'add-mul' ? p.ask + p.b : p.ask * p.a;
      var e = p.ask + ' ' + s1 + ' = ' + mid + '. ' + mid + ' ' + s2 + ' = ' + ans + '.';
      var firstOnly = mid, swapped = p.kind === 'add-mul' ? p.ask * p.a + p.b : (p.ask + p.b) * p.a;
      return {
        ui: 'choice', prompt: tx(T.machP, L), say: tx(T.machS, L),
        visual: { type: 'machine', pairs: pairs, ask: p.ask },
        choice: U.numChoice(ans, [firstOnly, swapped, ans + 1, ans - 1], L, 3, { min: 0 }),
        how: [H(tx(T.machH1, L, { s1: s1, s2: s2 }), { type: 'machine', pairs: pairs, ask: p.ask }, tx(T.machS1, L)),
          H(e, big(p.ask + ' → ' + ans), tx(T.machS2, L))],
        praise: tx(T.machOk, L),
        key: { type: 'machine' }
      };
    }
  });

  step({
    id: 'l12', grade: 5, name: { da: 'Vægt med to ukendte', sv: 'Våg med två okända', no: 'Vekt med to ukjente', en: 'Balance with two unknowns' },
    pick: function (U, L, E) {
      var pair = U.sample([0, 1, 2, 3, 4], 2), x = U.int(1, E ? 5 : 9), y = U.int(1, E ? 5 : 9);
      if (x === y) return null;
      return { A: pair[0], B: pair[1], x: x, y: y, ex: U.int(0, 1), ask: U.int(0, 1) };
    },
    key: function (p) { return WEIGHTS[p.A] + p.x + WEIGHTS[p.B] + p.y + ':' + p.ex + p.ask; },
    make: function (p, L, U) {
      var A = WEIGHTS[p.A], B = WEIGHTS[p.B], S = p.x + p.y;
      var exE = p.ex ? B : A, exV = p.ex ? p.y : p.x, otE = p.ex ? A : B, otV = p.ex ? p.x : p.y;
      var row2 = p.ex ? [A, B, B] : [A, A, B], T2 = S + exV;
      var askE = p.ask ? otE : exE, askV = p.ask ? otV : exV;
      var nm = function (e) { return NAMES[e][L]; };
      var how = [
        H(tx(T.bal2a, L, { e: exE }), { type: 'balance', rows: [{ left: [A, B], right: S }, { left: row2, right: T2 }] }, tx(T.bal2aS, L)),
        H(tx(T.bal2b, L, { e: exE, T: T2, S: S, x: exV }), big(exE + ' = ' + exV), tx(T.bal2bS, L))
      ];
      if (p.ask) how.push(H(tx(T.bal2c, L, { e: otE, S: S, x: exV, y: otV }), big(otE + ' = ' + otV), tx(T.bal2cS, L)));
      return {
        ui: 'choice', prompt: tx(T.balP, L, { e: askE }), say: tx(T.balS, L, { e: nm(askE) }),
        visual: { type: 'balance', rows: [{ left: [A, B], right: S }, { left: row2, right: T2 }] },
        choice: U.numChoice(askV, [p.ask ? exV : otV, askV + 1, askV - 1, S - askV + 1], L, 3, { min: 1 }),
        how: how, praise: tx(T.balOk, L), key: { type: 'balance', ask: askE }
      };
    }
  });

  step({
    id: 'l13', grade: 5, name: { da: 'Kvadrattal og andre talfølger', sv: 'Kvadrattal och fler följder', no: 'Kvadrattall og flere følger', en: 'Squares and more sequences' },
    pick: function (U, L, E) {
      var kind = U.pick(E ? ['sq', 'fib'] : ['sq', 'tri', 'fib']);
      if (kind === 'sq') return { kind: kind, s: U.int(1, E ? 3 : 5) };
      if (kind === 'tri') return { kind: kind, s: U.int(1, 4) };
      var a = U.int(1, 5);
      return { kind: kind, a: a, b: U.int(a, a + 4) };
    },
    key: function (p) { return p.kind + ':' + (p.s || p.a + ',' + p.b); },
    make: function (p, L, U) {
      var items = [], i, how, n = 5;
      if (p.kind === 'sq') for (i = 0; i <= n; i++) items.push((p.s + i) * (p.s + i));
      else if (p.kind === 'tri') for (i = 0; i <= n; i++) items.push((p.s + i) * (p.s + i + 1) / 2);
      else { items = [p.a, p.b]; while (items.length <= n) items.push(items[items.length - 1] + items[items.length - 2]); }
      var ans = items[n], last = items[n - 1], shown = items.slice(0, n).map(String).concat('?');
      if (p.kind === 'sq') {
        var m = p.s + n, e = m + ' × ' + m + ' = ' + ans;
        how = [H(tx(T.sq, L), { type: 'seq', items: shown }), H(e, big(m + ' ' + TIMES + ' ' + m + ' = ' + ans), tx(T.sqS, L))];
      } else if (p.kind === 'tri') {
        var e2 = last + ' + ' + (ans - last) + ' = ' + ans;
        how = [H(tx(T.tri, L), { type: 'seq', items: shown }), H(e2, big(e2), tx(T.triS, L))];
      } else {
        var e3 = items[n - 2] + ' + ' + last + ' = ' + ans;
        how = [H(tx(T.fib, L), { type: 'seq', items: shown }), H(e3, big(e3), tx(T.fib, L))];
      }
      var d = last - items[n - 2];
      return numSeqTask(items, n, ans, how, L, U, [last + d, ans + 1, ans - 1, ans + 2], tx(T.ruleOk, L));
    }
  });

  /* ---------- riddles in words ---------- */
  var RID = {
    bigger: { da: '{a} er større end {b}.', sv: '{a} är större än {b}.', no: '{a} er større enn {b}.', en: '{a} is bigger than {b}.' },
    smaller: { da: '{a} er mindre end {b}.', sv: '{a} är mindre än {b}.', no: '{a} er mindre enn {b}.', en: '{a} is smaller than {b}.' },
    faster: { da: '{a} er hurtigere end {b}.', sv: '{a} är snabbare än {b}.', no: '{a} er raskere enn {b}.', en: '{a} is faster than {b}.' },
    slower: { da: '{a} er langsommere end {b}.', sv: '{a} är långsammare än {b}.', no: '{a} er tregere enn {b}.', en: '{a} is slower than {b}.' },
    qBig: { da: 'Hvem er størst?', sv: 'Vem är störst?', no: 'Hvem er størst?', en: 'Who is the biggest?' },
    qSmall: { da: 'Hvem er mindst?', sv: 'Vem är minst?', no: 'Hvem er minst?', en: 'Who is the smallest?' },
    qFast: { da: 'Hvem er hurtigst?', sv: 'Vem är snabbast?', no: 'Hvem er raskest?', en: 'Who is the fastest?' },
    qSlow: { da: 'Hvem er langsomst?', sv: 'Vem är långsammast?', no: 'Hvem er tregest?', en: 'Who is the slowest?' },
    hasIntro: { da: '{a}, {b} og {c} har hver sin frugt.', sv: '{a}, {b} och {c} har var sin frukt.', no: '{a}, {b} og {c} har hver sin frukt.', en: '{a}, {b} and {c} each have one fruit.' },
    has: { da: '{a} har {i}.', sv: '{a} har {i}.', no: '{a} har {i}.', en: '{a} has {i}.' },
    hasNot: { da: '{a} har ikke {i}.', sv: '{a} har inte {i}.', no: '{a} har ikke {i}.', en: '{a} does not have {i}.' },
    qHas: { da: 'Hvem har {i}?', sv: 'Vem har {i}?', no: 'Hvem har {i}?', en: 'Who has {i}?' },
    before: { da: '{a} står foran {b}.', sv: '{a} står framför {b}.', no: '{a} står foran {b}.', en: '{a} stands in front of {b}.' },
    last: { da: '{a} står bagerst.', sv: '{a} står sist.', no: '{a} står bakerst.', en: '{a} is at the back.' },
    first: { da: '{a} står forrest.', sv: '{a} står först.', no: '{a} står fremst.', en: '{a} is at the front.' },
    qFirst: { da: 'Hvem står forrest?', sv: 'Vem står först?', no: 'Hvem står fremst?', en: 'Who is at the front?' },
    qMid: { da: 'Hvem står i midten?', sv: 'Vem står i mitten?', no: 'Hvem står i midten?', en: 'Who is in the middle?' },
    qLast: { da: 'Hvem står bagerst?', sv: 'Vem står sist?', no: 'Hvem står bakerst?', en: 'Who is at the back?' },
    rowIntro: { da: 'Tre venner står i kø.', sv: 'Tre vänner står i kö.', no: 'Tre venner står i kø.', en: 'Three friends stand in a line.' }
  };
  var FRUIT = ['🍎', '🍌', '🍐'];
  function perms(a) { if (a.length < 2) return [a.slice()]; var o = []; a.forEach(function (x, i) { perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { o.push([x].concat(p)); }); }); return o; }

  step({
    id: 'l14', grade: 5, name: { da: 'Logiske gåder', sv: 'Logiska gåtor', no: 'Logiske gåter', en: 'Logic riddles' },
    pick: function (U) {
      var names = U.sample(FRIENDS, 3), kind = U.pick(['order', 'has', 'row']);
      if (kind === 'order') {
        // names in true order, biggest or fastest first
        return { kind: kind, n: names, dim: U.pick(['size', 'speed']), ask: U.pick(['max', 'min']), flip: [U.int(0, 1), U.int(0, 1)], sw: U.int(0, 1) };
      }
      if (kind === 'has') {
        var items = U.shuffle(FRUIT);
        // facts: keep picking until exactly one assignment fits
        for (var t = 0; t < 30; t++) {
          var facts = [];
          var cnt = U.int(2, 3);
          for (var k = 0; k < cnt; k++) {
            var who = U.int(0, 2), yes = U.chance(0.4), item = yes ? items[who] : U.pick(items.filter(function (x) { return x !== items[who]; }));
            facts.push([who, FRUIT.indexOf(item), yes ? 1 : 0]);
          }
          var fits = perms(items).filter(function (pm) { return facts.every(function (fc) { return (pm[fc[0]] === FRUIT[fc[1]]) === !!fc[2]; }); });
          if (fits.length === 1) return { kind: kind, n: names, it: items.map(function (x) { return FRUIT.indexOf(x); }), f: facts, q: U.int(0, 2) };
        }
        return null;
      }
      var opts = [[[0, 'before', 1], [2, 'last']], [[1, 'before', 2], [0, 'first']], [[0, 'before', 1], [1, 'before', 2]], [[2, 'last'], [0, 'first']]];
      return { kind: 'row', n: names, f: U.pick(opts), ask: U.pick(['first', 'mid', 'last']) };
    },
    key: function (p) { return p.kind + ':' + p.n.join(',') + ':' + JSON.stringify(p.f || [p.dim, p.ask, p.flip, p.sw]) + (p.q != null ? p.q : '') + (p.kind === 'row' ? p.ask : ''); },
    make: function (p, L, U) {
      var N = p.n, lines = [], spoken = [], q, ans, meta;
      if (p.kind === 'order') {
        var big1 = p.dim === 'size' ? RID.bigger : RID.faster, small1 = p.dim === 'size' ? RID.smaller : RID.slower;
        var pairs = [[N[0], N[1]], [N[1], N[2]]];
        if (p.sw) pairs.reverse();
        pairs.forEach(function (pr, i) {
          var flip = p.flip[i];
          lines.push(flip ? tx(small1, L, { a: pr[1], b: pr[0] }) : tx(big1, L, { a: pr[0], b: pr[1] }));
        });
        q = tx(p.dim === 'size' ? (p.ask === 'max' ? RID.qBig : RID.qSmall) : (p.ask === 'max' ? RID.qFast : RID.qSlow), L);
        ans = p.ask === 'max' ? N[0] : N[2];
        meta = { kind: 'order', names: N.slice(), facts: [[N[0], N[1]], [N[1], N[2]]], ask: p.ask };
        spoken = lines.slice();
      } else if (p.kind === 'has') {
        var items = p.it.map(function (i) { return FRUIT[i]; });
        lines.push(tx(RID.hasIntro, L, { a: N[0], b: N[1], c: N[2] }));
        spoken.push(lines[0]);
        p.f.forEach(function (fc) {
          var tpl = fc[2] ? RID.has : RID.hasNot;
          lines.push(tx(tpl, L, { a: N[fc[0]], i: FRUIT[fc[1]] }));
          spoken.push(tx(tpl, L, { a: N[fc[0]], i: NAMES[FRUIT[fc[1]]][L] }));
        });
        var askItem = FRUIT[p.q];
        q = tx(RID.qHas, L, { i: askItem });
        ans = N[items.indexOf(askItem)];
        meta = { kind: 'has', names: N.slice(), items: FRUIT.slice(), facts: p.f.map(function (fc) { return [N[fc[0]], FRUIT[fc[1]], fc[2]]; }), askItem: askItem };
        spoken.push(tx(RID.qHas, L, { i: NAMES[askItem][L] }));
      } else {
        lines.push(tx(RID.rowIntro, L));
        p.f.forEach(function (fc) {
          if (fc[1] === 'before') lines.push(tx(RID.before, L, { a: N[fc[0]], b: N[fc[2]] }));
          else lines.push(tx(RID[fc[1]], L, { a: N[fc[0]] }));
        });
        q = tx(p.ask === 'first' ? RID.qFirst : p.ask === 'mid' ? RID.qMid : RID.qLast, L);
        ans = p.ask === 'first' ? N[0] : p.ask === 'mid' ? N[1] : N[2];
        meta = { kind: 'row', names: N.slice(), facts: p.f.map(function (fc) { return fc[1] === 'before' ? [N[fc[0]], 'before', N[fc[2]]] : [N[fc[0]], fc[1]]; }), ask: p.ask };
        spoken = lines.slice();
      }
      if (p.kind !== 'has') spoken.push(q);
      var text = lines.join(' ');
      return {
        // the child reads the riddle; the voice says one fixed line
        ui: 'choice', prompt: q, say: tx(T.ridS, L),
        visual: { type: 'scene', emoji: '🧩', text: text },
        choice: U.choice({ label: ans }, N.filter(function (x) { return x !== ans; }).map(function (x) { return { label: x }; }), 3),
        how: [H(tx(T.ridH1, L), { type: 'scene', emoji: '🧩', text: text }), H(tx(T.ridH2, L, { a: ans }), p.kind === 'has' ? big(ans) : { type: 'seq', items: N.slice() }, tx(T.ridS2, L))],
        praise: tx(T.ridOk, L),
        key: { type: 'riddle', m: meta }
      };
    }
  });

  var api = { steps: steps, cats: CAT_OF };
  G.Content.logik = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
