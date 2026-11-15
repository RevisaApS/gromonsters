/* The encounter (milestone-1.md, storyboard version 4): wear down a wild Gromonster's life with tasks, watch how it
   thinks on its turn (it is always right), win its trust, make it a friend. Every hit and life bar comes from the two power numbers.
   G.Battle.start(root, {wildId, partnerId, regionId, mode, brain, today, onDone}) -> {destroy()}
   G.Battle.robot = {state(), answer('right'|'wrong'), strike(), next(), quit()}
   Every delay goes through G.wait (fast for robots) and nothing waits on a creature's own events,
   so a slow or missing picture can never hang a battle. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/src\/battle\.js.*$/, '') : ''; })();

  var STR = {
    da: {
      'b.appears': 'En vild {name} dukker op!', 'b.breakShield': 'Knus skjoldet med dine kræfter!', 'b.super': 'Super!', 'b.idk': 'Ved ikke',
      'b.strike': 'Kraftslag', 'b.strikeReady': 'Dit kraftslag er klar! Tryk på det når du vil.', 'b.shows': '{name} viser dig hvordan', 'b.follow': 'Følg lyset',
      'b.thatsIt': 'Sådan der!', 'b.wildTurn': '{name} angriber!', 'b.calm': '{name} er faldet til ro. Vis den at du er en ven.',
      'b.heartIntro': 'Skjoldet er væk! Nu skal den lære at stole på dig.', 'b.kinder': 'Prøv det mest venlige svar.', 'b.friend': '{name} er blevet din ven!',
      'b.trained': 'Flot træning!', 'b.bye': 'Vi ses!', 'b.slip': '{name} smutter væk. Den kommer igen i morgen.',
      'b.slipTrain': '{name} trænger til en pause. I kan træne igen senere.', 'b.newFriend': 'Ny ven!', 'b.nextTime': 'Det lykkes næste gang!',
      'b.keep': 'Du beholder alt det du har fået.', 'b.sparks': 'Gnister', 'b.shield': 'Skjold', 'b.stars': 'Rigtigt i første forsøg', 'b.toCamp': 'Til lejren',
      'b.quitAsk': 'Vil du stoppe kampen?', 'b.quitYes': 'Ja, stop', 'b.quitNo': 'Spil videre', 'b.again': 'Hør igen', 'b.next': 'Videre',
      'b.energy': 'Energi', 'b.charge': 'Kraft', 'b.home': 'Hjem', 'b.holdOn': '{name} klarer den!', 'b.heal': 'Du huskede det! +1 energi', 'b.feelToo': 'Sådan kan man også have det.', 'b.addedDex': 'Nu er den i din Gromodex',
      'b.plusXp': '+1 styrke', 'b.xpTeam': '+{n} styrke til holdet', 'b.level': 'Level {n}', 'b.team': 'Dit hold',
      'b.judge': 'Er det rigtigt?', 'b.superAsk': 'Superslag?', 'b.goodEye': 'Godt set!', 'b.yes': 'Rigtigt', 'b.no': 'Forkert', 'b.showMe': 'Vis mig',
      'b.tryAgain': 'Prøv igen', 'b.life': 'Liv', 'b.kraft': 'Kraft', 'b.superYes': 'Superslag', 'b.superNo': 'Nej tak', 'b.xpGain': '+{n} kraft', 'b.turnOf': '{name}s tur', 'b.thinks': '{name} tænker', 'b.marks': '{a} af {b} rigtige selv'
    },
    en: {
      'b.appears': 'A wild {name} appears!', 'b.breakShield': 'Break its shield with your powers!', 'b.super': 'Super!', 'b.idk': "I don't know",
      'b.strike': 'Power strike', 'b.strikeReady': 'Your power strike is ready! Tap it when you want.', 'b.shows': '{name} shows how', 'b.follow': 'Follow the glow',
      'b.thatsIt': "That's it!", 'b.wildTurn': '{name} attacks!', 'b.calm': '{name} is calm now. Show it you are a friend.',
      'b.heartIntro': 'The shield is gone! Now win its trust.', 'b.kinder': 'Try the kindest choice.', 'b.friend': '{name} is your friend now!',
      'b.trained': 'Well trained!', 'b.bye': 'See you!', 'b.slip': '{name} slips away. It will come back tomorrow.',
      'b.slipTrain': '{name} wants to rest now. You can train again later.', 'b.newFriend': 'New friend!', 'b.nextTime': 'Next time!',
      'b.keep': 'You keep everything you earned.', 'b.sparks': 'Sparks', 'b.shield': 'Shield', 'b.stars': 'Right first time', 'b.toCamp': 'To camp',
      'b.quitAsk': 'Do you want to stop the battle?', 'b.quitYes': 'Yes, stop', 'b.quitNo': 'Keep playing', 'b.again': 'Hear again', 'b.next': 'Next',
      'b.energy': 'Energy', 'b.charge': 'Charge', 'b.home': 'Home', 'b.holdOn': '{name} holds on!', 'b.heal': 'You remembered! +1 energy', 'b.feelToo': 'It can feel that way too.', 'b.addedDex': 'Added to your Gromodex',
      'b.plusXp': '+1 strength', 'b.xpTeam': '+{n} strength for the team', 'b.level': 'Level {n}', 'b.team': 'Your team',
      'b.judge': 'Is it right?', 'b.superAsk': 'Super hit?', 'b.goodEye': 'Good eye!', 'b.yes': 'Right', 'b.no': 'Wrong', 'b.showMe': 'Show me',
      'b.tryAgain': 'Try again', 'b.life': 'Life', 'b.kraft': 'Power', 'b.superYes': 'Super hit', 'b.superNo': 'No thanks', 'b.xpGain': '+{n} power', 'b.turnOf': "{name}'s turn", 'b.thinks': '{name} is thinking', 'b.marks': '{a} of {b} right by himself'
    }
  };
  if (G.i18n && G.i18n.add) G.i18n.add(STR);

  function t(k, v) {
    var s;
    if (G.t) { s = G.t(k, v); if (s && s !== k) return s; }
    s = (STR[G.lang] || STR.en)[k] || STR.en[k] || k;
    return s.replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] != null ? v[n] : m; });
  }
  function el(tag, cls, html, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(tag, cls, text, parent) { var e = el(tag, cls, null, parent); e.textContent = text == null ? '' : String(text); return e; }
  function still() { return document.documentElement.classList.contains('still'); }
  function sfx(n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { /* never let sound break a battle */ } }
  function music(n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { /* idem */ } }
  function say(s, opt) { try { if (s && G.say) G.say(s, opt); } catch (e) { /* voice is optional */ } }
  function fx(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    try { if (G.fx && G.fx[name]) return G.fx[name].apply(G.fx, args); } catch (e) { console.error('fx.' + name, e); }
    return null;
  }
  function rawWait(ms) { return G.wait ? G.wait(ms) : new Promise(function (r) { setTimeout(r, ms); }); }
  function pick(a) { return G.pick ? G.pick(a) : a[Math.floor(Math.random() * a.length)]; }
  function loc(v) { return v && typeof v === 'object' ? (v[G.lang] || v.en || v.da || '') : (v || ''); }

  var ELEM = {
    leaf: { kind: 'leaf', color: '#7ad63a' }, fire: { kind: 'ember', color: '#ff8a2a' },
    water: { kind: 'drop', color: '#49c6f5' }, plain: { kind: 'star', color: '#ffd166' }
  };
  var ICON = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2L12 4l8.5 7.2M6 9.6V20h4.4v-5.4h3.2V20H18V9.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 2.5L4.8 13.4h6.1l-1.5 8.1 8.8-11h-6.1z" fill="currentColor" stroke="#0b1430" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12.5M12.5 6.5L18 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c.7 5 2.2 7.3 8.6 10.2-6.4 2.9-7.9 5.2-8.6 10.2-.7-5-2.2-7.3-8.6-10.2 6.4-2.9 7.9-5.2 8.6-10.2z" fill="currentColor" stroke="#0b1430" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    hex: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l8.5 4.9v9.8L12 21.8l-8.5-4.9V7.1z" fill="currentColor" stroke="#0b1430" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 5.6l5.5 3.2" stroke="rgba(255,255,255,.75)" stroke-width="1.8" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor" stroke="#0b1430" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.2 15 3.2 8.9A4.6 4.6 0 0112 6.6a4.6 4.6 0 018.8 2.3c0 6.1-8.8 11.6-8.8 11.6z" fill="currentColor" stroke="#0b1430" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    wave: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 30V14a4 4 0 018 0v12-16a4 4 0 018 0v16-12a4 4 0 018 0v16-8a4 4 0 018 0v16c0 11-7 18-18 18h-2c-7 0-11-3-15-9l-8-12a4 4 0 016-5z" fill="#ffd9b3" stroke="#0b1430" stroke-width="3.5" stroke-linejoin="round"/><path d="M6 14q-3 6 0 12M12 8q-4 9 0 18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5C6.5 3.4 9.4 3.6 12 5.2c2.6-1.6 5.5-1.8 8-.7v14.8c-2.5-1.1-5.4-.9-8 .7-2.6-1.6-5.5-1.8-8-.7z" fill="#ffd34d" stroke="#0b1430" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 5.2v14.8" stroke="#0b1430" stroke-width="1.7"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l7.6 8.2h-4.5v9.4H8.9v-9.4H4.4z" fill="currentColor" stroke="#0b1430" stroke-width="1.9" stroke-linejoin="round"/></svg>',
    again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M4 3.5v5h5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.8l5 5L19.5 6.6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
    guard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4l8 3v6.2c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V5.4z" fill="currentColor" stroke="#0b1430" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    hand: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 6c3 0 5 2 5 5v17l2-1c3-1 6 0 7 3l1-1c3-1 6 0 7 3 3-1 6 1 6 4v12c0 9-6 15-15 15h-4c-6 0-10-3-13-8L12 41c-2-3-1-6 2-7 2-1 5 0 6 2l-1-1V11c0-3 2-5 5-5z" fill="#fff" stroke="#0b1430" stroke-width="3.5" stroke-linejoin="round"/></svg>'
  };

  // stage centre of an element; CORE's G.stageXY when present
  function xy(e) {
    if (G.stageXY) { try { var p = G.stageXY(e); if (p && isFinite(p.x)) return p; } catch (er) { /* fall through */ } }
    var st = document.getElementById('stage') || document.body, sr = st.getBoundingClientRect(), k = sr.width / (st.offsetWidth || sr.width || 1) || 1, r = e.getBoundingClientRect();
    return { x: (r.left - sr.left + r.width / 2) / k, y: (r.top - sr.top + r.height / 2) / k };
  }

  function creature(id) {
    var c = (G.creatures || {})[id] || {};
    return { id: id, name: loc(c.name) || (id ? id.charAt(0).toUpperCase() + id.slice(1) : '?'), element: c.element || 'plain', power: c.power || 'tal', region: c.region };
  }
  function mount(host, id, flip) {
    var m = null;
    try { if (G.Creature && G.Creature.mount) m = G.Creature.mount(host, id, { flip: flip, interactive: true }); } catch (e) { console.error('Creature.mount', id, e); }
    if (m) return m;
    // last resort: a plain picture, so a battle never stops for want of a creature host
    host.innerHTML = '<img class="bt-fallback" alt="" src="' + BASE + 'assets/creatures/' + id + '.webp">';
    if (flip) host.style.transform = 'scaleX(-1)';
    var img = host.firstChild; img.onerror = function () { img.remove(); host.classList.add('bt-blob'); };
    var nop = function () {};
    return { attack: nop, hit: nop, hop: nop, happy: nop, grow: nop, sleep: nop, wake: nop, on: nop, destroy: function () { host.innerHTML = ''; }, el: host };
  }
  function call(m, name) { try { if (m && typeof m[name] === 'function') m[name](); } catch (e) { console.error('creature.' + name, e); } }

  /* ---------- answers worked out here too, so the how and the robot never depend on one source ---------- */
  function localSolution(task) {
    var u = task.ui;
    if (u === 'choice') return task.choice ? task.choice.correct : 0;
    if (u === 'fill') return task.fill ? task.fill.need : 1;
    if (u === 'spell') return task.spell ? String(task.spell.word).toUpperCase() : '';
    if (u === 'breathe') return true;
    // the class 0 pack (slice 4)
    if (u === 'secret') return task.secret ? String(task.secret.word).toUpperCase() : '';
    if (u === 'match') return task.match ? task.match.correct : 0;
    if (u === 'beats') return task.beats ? task.beats.n : 1;
    if (u === 'give') return task.give ? task.give.n : 1;
    if (u === 'shapes') { var it = (task.shapes && task.shapes.items) || [], o = []; it.forEach(function (x, k) { if (x.s === task.shapes.want) o.push(k); }); return o; }
    // Natur og teknik (slice 5)
    if (u === 'test') return task.test ? task.test.correct : 0;
    if (u === 'strings') return task.strings ? task.strings.correct : 0;
    if (u === 'steps') return stepsRow(task.steps);
    if (u === 'build') {
      var b = task.build || {}, tiles = b.tiles || [], n = tiles.length;
      if (b.op === 'product') {
        for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (tiles[i].v * tiles[j].v === b.target) return [i, j];
        return [];
      }
      var best = null;
      (function dfs(k, sum, path) {
        if (sum === b.target && path.length) { if (!best || path.length < best.length) best = path.slice(); return; }
        if (k >= n || sum > b.target || (best && path.length >= best.length)) return;
        path.push(k); dfs(k + 1, sum + (+tiles[k].v || 0), path); path.pop();
        dfs(k + 1, sum, path);
      })(0, 0, []);
      return best || [];
    }
    return null;
  }
  // a row of arrows that walks him to the berry (src/content/natur.js has the walk): the shortest, or the laid row mended
  function stepsRow(sg) {
    var N = G.Content && G.Content.natur;
    if (!sg || !N) return [];
    if (!sg.row) return N.shortest(sg) || [];
    for (var i = 0; i < sg.row.length; i++) for (var d in N.DIRS) { var r = sg.row.slice(); r[i] = d; if (N.walk(sg, r).ok) return r; }
    return sg.row.slice();
  }
  function localCheck(task, a) {
    var sol = localSolution(task), ok = false;
    if (task.ui === 'build') {
      var b = task.build || {}, tiles = b.tiles || [];
      if (Array.isArray(a)) {
        if (b.op === 'product') ok = a.length === 2 && tiles[a[0]] && tiles[a[1]] && tiles[a[0]].v * tiles[a[1]].v === b.target;
        else ok = a.length > 0 && a.reduce(function (s, i) { return s + (tiles[i] ? +tiles[i].v : 0); }, 0) === b.target;
      }
    } else if (task.ui === 'spell' || task.ui === 'secret') ok = String(a).toUpperCase() === sol;
    else if (task.ui === 'shapes') ok = Array.isArray(a) && a.slice().sort(function (x, y) { return x - y; }).join(',') === sol.join(',');
    else if (task.ui === 'breathe') ok = a === true;
    else if (task.ui === 'steps') {
      var N = G.Content && G.Content.natur, sg = task.steps;
      ok = !!N && Array.isArray(a) && a.length > 0 && a.length <= sg.max && N.walk(sg, a).ok && (!sg.row || a.filter(function (d, k) { return d !== sg.row[k]; }).length === 1);
    }
    else ok = a === sol;
    return { ok: !!ok, smart: false, smartKey: null, solution: sol };
  }
  function wrongAnswer(task) {
    var u = task.ui;
    if (u === 'choice') { var n = (task.choice.options || []).length; for (var i = 0; i < n; i++) if (i !== task.choice.correct) return i; return undefined; }
    if (u === 'fill') { var f = task.fill; return f.need + 1 <= f.total ? f.need + 1 : f.need > 1 ? f.need - 1 : undefined; }
    if (u === 'spell') {
      var w = String(task.spell.word).toUpperCase(), r = w.split('').reverse().join('');
      if (r !== w) return r;
      var extra = (task.spell.tiles || []).map(function (x) { return String(x).toUpperCase(); }).filter(function (L) { return w.indexOf(L) < 0; })[0];
      return extra ? extra + w.slice(1) : undefined;
    }
    if (u === 'secret') { var sw = String(task.secret.word).toUpperCase(), sr = sw.split('').reverse().join(''); if (sr !== sw) return sr; var sx = (task.secret.tiles || []).filter(function (L) { return sw.indexOf(L) < 0; })[0]; return sx ? sx + sw.slice(1) : undefined; }
    if (u === 'match') return task.match.correct === 0 ? 1 : 0;
    if (u === 'beats') return task.beats.n + 1;
    if (u === 'give') return task.give.n < task.give.total ? task.give.n + 1 : task.give.n - 1;
    if (u === 'shapes') { var ws = localSolution(task); return ws.slice(1); }
    if (u === 'test') return 1 - task.test.correct;
    if (u === 'strings') return 1 - task.strings.correct;
    if (u === 'steps') {
      // the laid row as it is, or a row of one way only that walks off the grid or into a stone
      var sg = task.steps;
      var N = G.Content && G.Content.natur;
      // a laid row: one arrow changed, to a way that still does not reach the berry (the row unchanged is not handed in)
      if (sg.row) {
        for (var wi = 0; N && wi < sg.row.length; wi++) for (var wd in N.DIRS) {
          if (wd === sg.row[wi]) continue;
          var wrow = sg.row.slice(); wrow[wi] = wd;
          if (!N.walk(sg, wrow).ok) return wrow;
        }
        return undefined;
      }
      for (var dk in { u: 1, r: 1, d: 1, l: 1 }) { var wr = []; for (var q2 = 0; q2 < sg.max; q2++) wr.push(dk); if (N && !N.walk(sg, wr).ok) return wr; }
      return undefined;
    }
    if (u === 'build' && task.build.op !== 'product' && task.build.confirm) {
      // a hidden target is pressed in with "Færdig", so one orb that is not the answer is a real wrong try
      var ct = task.build.tiles || [];
      for (var q = 0; q < ct.length; q++) if (+ct[q].v !== task.build.target) return [q];
    }
    if (u === 'build' && task.build.op === 'product') {
      var tl = task.build.tiles;
      for (var a = 0; a < tl.length; a++) for (var b = a + 1; b < tl.length; b++) if (tl[a].v * tl[b].v !== task.build.target) return [a, b];
    }
    return undefined; // a sum can not be built wrong by tapping: the robot presses "?" instead
  }
  function answerText(task, v) {
    try {
      if (task.ui === 'build') {
        var b = task.build;
        if (b.op === 'product') return v.map(function (i) { return b.tiles[i].v; }).join(' × ');
        return b.target + (b.unit ? ' ' + b.unit : '');
      }
      if (task.ui === 'fill') return String(v);
      if (task.ui === 'spell') return String(v);
      if (task.ui === 'choice') { var o = task.choice.options[v] || {}; return o.label != null && o.label !== '' ? String(o.label) : o.emoji || ''; }
    } catch (e) { /* no text then */ }
    return '';
  }

  /* ---------------- the rules: every number comes from the two power numbers ----------------
     Power is small: 1 for a new Gromonster, one more for every battle it wins. Life is worked out from power
     (lifeOf), and every hit is a share of the hitter's full life, so the same rules hold at power 1 and at power 60. */
  var RULES = {
    life0: 18,        // life at full = life0 + lifeStep for each point of power
    lifeStep: 2,
    hit: 0.20,        // his hit, as a share of his fighter's full life
    wildHit: 0.10,    // the wild one's hit, as a share of its full life. It always lands: the wild one is never wrong
    superHit: 2,      // a super hit does double
    introLife: 0.80,  // the first wild one is a little shorter
    streak: 3         // first-try rights in a row that earn the super hit offer
  };
  function part(n, share) { return Math.max(1, Math.round(n * share)); }
  // what is left after a hit: a hit always takes off what it shows, in every battle, the first one too (Steve's play
  // notes 4: the first battle can be lost)
  function lifeAfter(life, hit) { return Math.max(0, (+life || 0) - Math.max(0, +hit || 0)); }
  function lifeOf(kraft) { return RULES.life0 + RULES.lifeStep * Math.max(1, Math.round(+kraft) || 1); }
  // what the wild one's hit costs
  function wildDamage(wildKraft) { return part(lifeOf(wildKraft), RULES.wildHit); }

  /* ---------------- the battle ---------------- */
  var cur = null;

  function start(root, opts) {
    if (cur) cur.destroy();
    cur = makeBattle(root, opts || {});
    return { destroy: cur.destroy };
  }

  function makeBattle(root, o) {
    var mode = o.mode === 'intro' || o.mode === 'train' ? o.mode : 'catch';
    var brain = o.brain, today = o.today != null ? o.today : (G.today ? G.today() : 0);
    // the team: the fighter first, then the ones who step in when it faints. Each has its own power and life.
    var fighters = (Array.isArray(o.fighters) && o.fighters.length ? o.fighters : [{ id: o.partnerId || 'mosli', baseId: o.partnerId || 'mosli', kraft: 1 }])
      .filter(function (f) { return f && f.id; }).slice(0, 3)
      .map(function (f) { var k = Math.max(1, Math.round(+f.kraft) || 1); return { id: f.id, baseId: f.baseId || f.id, kraft: k, lifeMax: lifeOf(k), life: lifeOf(k), out: false }; });
    var wildKraft = Math.max(1, Math.round(+o.wildKraft) || 1);
    var wildC = creature(o.wildId), partC = creature(fighters[0].id);
    var region = (G.regions || {})[o.regionId || wildC.region] || {};
    var pE = ELEM[partC.element] || ELEM.plain, wE = ELEM[wildC.element] || ELEM.plain;
    var S = {
      phase: 'enter', busy: true, fi: 0, streak: 0, xpBy: {}, xp: 0, sparks: 0, records: [], used: {},
      firstTry: 0, tasks: 0, broken: 0, heart: false, done: false, dead: false, result: null, task: null, solution: null, ui: null,
      waiter: null, nextWaiter: null, strikeTold: false, quitOpen: false
    };
    S.wLifeMax = S.wLife = mode === 'intro' ? part(lifeOf(wildKraft), RULES.introLife) : lifeOf(wildKraft);
    function me() { return fighters[S.fi]; }
    var DEAD = { dead: true };
    function w(ms) { return rawWait(ms).then(function () { if (S.dead) throw DEAD; }); }
    function race(p, ms) { return Promise.race([Promise.resolve(p).catch(function () {}), rawWait(ms)]).then(function () { if (S.dead) throw DEAD; }); }

    // The voice always finishes its line. Before the battle itself brings a new spoken line (a task, a turn, a cheer),
    // it waits here until the one before has ended, so the screen and the voice stay together. At most `max` ms.
    function spoken(max) {
      var v = G.voice;
      if (!v || !v.idle || !v.on || !v.on()) return Promise.resolve();
      return v.idle(max == null ? 8000 : max).then(function () { if (S.dead) throw DEAD; });
    }
    // two tasks that look the same to him count as one, whatever step they came from
    function seen(task) { return !!(S.used[task.id] || (task.sig && S.used[task.sig])); }
    function use(task) { S.used[task.id] = 1; if (task.sig) S.used[task.sig] = 1; }

    /* ---- build the stage ---- */
    root.innerHTML = '';
    var R = el('div', 'bt bt-' + mode + ' is-enter', null, root);
    R.addEventListener('contextmenu', function (e) { e.preventDefault(); }); // a held finger must never open a menu
    var arena = el('div', 'bt-arena', null, R);
    arena.style.backgroundImage = 'url("' + BASE + 'assets/bg/' + (region.bg || 'arena-forest') + '.webp")';
    var wcan = el('canvas', 'bt-weather', null, arena); wcan.width = 1280; wcan.height = 470;
    var beam = el('div', 'bt-beam', '<i></i><i></i><i></i>', R);

    function monster(side, c, flip) {
      var wrap = el('div', 'bt-mon bt-' + side, null, R);
      var move = el('div', 'bt-move', null, wrap);
      var host = el('div', 'bt-host', null, move);
      return { wrap: wrap, move: move, host: host, c: c, m: mount(host, c.id, flip) };
    }
    var P = monster('p', partC, false), W = monster('w', wildC, true);
    P.e = pE; W.e = wE;
    var dizzy = el('div', 'bt-dizzy', ICON.star + ICON.star + ICON.star, W.move);
    // HUD
    var home = el('button', 'btn btn-round bt-home', ICON.home, R);
    home.type = 'button'; home.dataset.act = 'home'; home.setAttribute('aria-label', t('b.home'));
    if (G.musicButton) { try { G.musicButton(R, 'battle'); } catch (e) { console.error(e); } }
    function lifeHud(side) {
      var box = el('div', 'bt-hud bt-hud-' + side, null, R);
      var row = el('div', 'bt-hud-name h', null, box);
      var name = txt('span', 'bt-pname', '', row);
      var kr = el('span', 'bt-kraft', ICON.bolt + '<b class="num"></b>', row);
      kr.setAttribute('aria-label', t('b.kraft'));
      var bar = el('div', 'bt-life', '<i></i><b class="num"></b>', box);
      bar.setAttribute('aria-label', t('b.life'));
      return { box: box, row: row, name: name, kraft: kr.querySelector('b'), bar: bar, fill: bar.querySelector('i'), num: bar.querySelector('b') };
    }
    var hudL = lifeHud('l'), hudR = lifeHud('r');
    hudR.name.textContent = wildC.name; hudR.kraft.textContent = wildKraft;
    // the rest of the team: small still faces under the fighter's life bar
    var mates = el('div', 'bt-team', null, hudL.box);
    mates.setAttribute('aria-label', t('b.team'));
    function drawTeam() {
      hudL.name.textContent = partC.name; hudL.kraft.textContent = me().kraft;
      mates.innerHTML = '';
      fighters.forEach(function (f, i) {
        if (i === S.fi) return;
        var m = el('span', 'bt-mate' + (f.out ? ' is-out' : ''), null, mates), im = el('img', null, null, m);
        im.alt = ''; im.draggable = false; im.src = BASE + 'assets/creatures/' + f.id + '.webp';
        im.onerror = function () { m.remove(); };
      });
      hudL.box.classList.toggle('has-team', fighters.length > 1);
    }
    drawTeam();
    var sparkChip = el('div', 'bt-sparkchip', ICON.spark + '<span class="num">0</span>', R);
    var sparkNum = sparkChip.querySelector('span');

    // the task panel
    var panel = el('div', 'bt-panel panel', null, R);
    var head = el('div', 'bt-head', null, panel);
    var powChip = el('div', 'bt-powchip', null, head);
    var promptEl = el('div', 'bt-prompt h', null, head);
    var tagEl = el('div', 'bt-tag', null, head);
    var speak = el('button', 'btn btn-round bt-speak', ICON.speak, head);
    speak.type = 'button'; speak.dataset.act = 'speak'; speak.setAttribute('aria-label', t('b.again'));
    var body = el('div', 'bt-body', null, panel);
    var taskHost = el('div', 'bt-task', null, body);
    var side = el('div', 'bt-side', null, body);
    var idk = el('button', 'btn btn-round bt-idk', '<span class="h">?</span>', side);
    idk.type = 'button'; idk.dataset.act = 'idk'; idk.setAttribute('aria-label', t('b.idk'));
    // while the wild one thinks: the arrow that skips to its answer, where the "?" sits on his own turn
    var watchNext = el('button', 'btn btn-round bt-watch-next', ICON.next, side);
    watchNext.type = 'button'; watchNext.dataset.act = 'watch-next'; watchNext.setAttribute('aria-label', t('b.next'));
    watchNext.addEventListener('click', function () { if (S.phase === 'watch') next(); });
    // the super hit offer: two big buttons in place of a task
    var offer = el('div', 'bt-offer', null, panel);
    var offerYes = el('button', 'btn btn-gold bt-offer-yes', ICON.star + ICON.bolt, offer);
    offerYes.type = 'button'; offerYes.dataset.act = 'super-yes'; offerYes.setAttribute('aria-label', t('b.superYes'));
    txt('span', 'h', t('b.superYes'), offerYes);
    var offerNo = el('button', 'btn bt-offer-no', ICON.next, offer);
    offerNo.type = 'button'; offerNo.dataset.act = 'super-no'; offerNo.setAttribute('aria-label', t('b.superNo'));
    offerYes.addEventListener('click', function () { if (S.phase === 'offer' && !S.busy) { sfx('tap'); input({ kind: 'offer', value: true }); } });
    offerNo.addEventListener('click', function () { if (S.phase === 'offer' && !S.busy) { sfx('tap'); input({ kind: 'offer', value: false }); } });
    var how = el('div', 'bt-how', null, panel);
    var howVis = el('div', 'bt-how-vis', null, how);
    var howMain = el('div', 'bt-how-main', null, how);
    var face = el('div', 'bt-how-face', null, howMain);
    function drawFace(id, flip) { // the face of the one who explains, cut from its picture
      id = id || partC.id;
      face.innerHTML = '';
      var img = el('img', null, null, face), c = (G.creatures || {})[id] || {}, rig = window.STARTER_RIGS && c.rig ? STARTER_RIGS[c.rig] : null;
      var e = rig && rig.eyes && rig.eyes.length ? rig.eyes : [{ c: [0.58, 0.4] }], fx0 = 0, fy0 = 0;
      e.forEach(function (q) { fx0 += q.c[0]; fy0 += q.c[1]; }); fx0 /= e.length; fy0 /= e.length;
      img.alt = ''; img.draggable = false; img.src = BASE + 'assets/creatures/' + id + '.webp';
      img.style.transformOrigin = (fx0 * 100).toFixed(0) + '% ' + ((fy0 + 0.04) * 100).toFixed(0) + '%';
      face.classList.toggle('is-flip', !!flip);
      img.onerror = function () { img.remove(); };
    }
    drawFace();
    var howCol = el('div', 'bt-how-col', null, howMain);
    var howText = txt('div', 'bt-how-text', '', howCol);
    var howDots = el('div', 'bt-how-dots', null, howCol);
    var howNext = el('button', 'btn btn-green btn-round bt-how-next', ICON.next, how);
    howNext.type = 'button'; howNext.dataset.act = 'how-next'; howNext.setAttribute('aria-label', t('b.next'));

    var think = el('div', 'bt-think', '<i></i><i></i><i></i>', W.move); // three dots over the wild one while it works on its task
    var story = el('div', 'bt-story', null, R);
    var lineEl = el('div', 'bt-line', null, R);
    var bubble = el('div', 'bt-bubble', null, R);
    var banner = el('div', 'bt-banner title', null, R);
    var catchName = el('div', 'bt-catchname', null, R);
    var over = el('div', 'bt-over', null, R);

    function powIcon(p) { var pw = (G.powers || {})[p]; return pw && pw.icon ? pw.icon : ICON.spark; }

    /* ---- weather ---- */
    var weather = null;
    try { if (G.fx && G.fx.Weather && region.weather) weather = G.fx.Weather(wcan, region.weather); } catch (e) { console.error('Weather', e); }

    /* ---- HUD state ---- */
    function lifeBar(h, now, max) {
      var f = Math.max(0, Math.min(1, now / Math.max(1, max)));
      h.fill.style.width = (f * 100).toFixed(1) + '%';
      h.bar.classList.toggle('is-mid', f <= 0.5 && f > 0.25);
      h.bar.classList.toggle('is-low', f <= 0.25);
      h.num.textContent = Math.max(0, now) + ' / ' + max;
    }
    function hud() {
      lifeBar(hudL, me().life, me().lifeMax);
      lifeBar(hudR, S.wLife, S.wLifeMax);
      sparkNum.textContent = S.sparks;
      idk.classList.toggle('is-off', !(S.phase === 'task' || S.phase === 'help' || S.phase === 'heart' || S.phase === 'fix') || S.busy);
    }
    function setPhase(p) {
      S.phase = p;
      S.busy = p === 'busy' || p === 'enter' || p === 'catch' || p === 'slip';
      panel.classList.toggle('is-busy', S.busy);
      panel.classList.toggle('is-watch', p === 'watch');
      panel.classList.toggle('is-offer', p === 'offer');
      hud();
    }

    /* ---- small effects ---- */
    var lineTimer = 0;
    function line(text, ms, cls) {
      clearTimeout(lineTimer);
      lineEl.className = 'bt-line ' + (cls || '');
      lineEl.textContent = text;
      void lineEl.offsetWidth; lineEl.classList.add('is-on');
      lineTimer = setTimeout(function () { lineEl.classList.remove('is-on'); }, ms || 2400);
    }
    function showBanner(text, cls) {
      banner.className = 'bt-banner title ' + (cls || '');
      banner.textContent = text;
      void banner.offsetWidth; banner.classList.add('is-on');
      setTimeout(function () { banner.classList.remove('is-on'); }, 1200);
    }
    function showBubble(html, cls) {
      bubble.className = 'bt-bubble ' + (cls || '');
      bubble.innerHTML = html;
      void bubble.offsetWidth; bubble.classList.add('is-on');
    }
    function hideBubble() { bubble.classList.remove('is-on'); }
    function hitXY(side) { var p = xy(side.host); return { x: p.x + (side === W ? -10 : 10), y: p.y - 4 }; }
    function fromXY(side) { var p = xy(side.host); return { x: p.x + (side === P ? 70 : -70), y: p.y - 30 }; }
    // a number that pops over the one who was hit; a shield when the hit was blocked
    function popNumber(side, html, cls) {
      var q = xy(side.host), f = el('div', 'bt-dmg ' + (cls || ''), html, R);
      f.style.left = q.x + 'px'; f.style.top = (q.y - 120) + 'px';
      setTimeout(function () { f.remove(); }, 1300);
    }
    function flyText(text, from, to) {
      if (!text) return;
      var f = txt('div', 'bt-fly num', text, R);
      f.style.left = from.x + 'px'; f.style.top = from.y + 'px';
      void f.offsetWidth;
      f.style.transform = 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px) scale(1.25)';
      setTimeout(function () { f.classList.add('is-pop'); }, 280);
      setTimeout(function () { f.remove(); }, 900);
    }

    /* ---- one attack, either way ---- */
    async function strikeAnim(from, to, opt) {
      opt = opt || {};
      call(from.m, 'attack');
      from.wrap.classList.add('is-windup');
      if (!opt.quick) sfx(opt.big ? 'charge' : 'tap');
      await w(opt.quick ? 150 : opt.big ? 380 : 250);
      from.wrap.classList.remove('is-windup'); from.wrap.classList.add('is-lunge');
      var a = fromXY(from), b = hitXY(to);
      if (opt.text) flyText(opt.text, opt.textFrom || a, b);
      var n = opt.big ? 3 : 1, trails = [];
      for (var i = 0; i < n; i++) trails.push(fx('trail', { x: a.x, y: a.y - i * 26 + (n > 1 ? 26 : 0) }, b, { kind: from.e.kind, color: from.e.color, ms: 230 + i * 40 }));
      await race(Promise.all(trails), 420);
      // impact
      if (!opt.blocked) { call(to.m, 'hit'); to.wrap.classList.remove('is-hurt'); void to.wrap.offsetWidth; to.wrap.classList.add('is-hurt'); }
      fx('burst', b.x, b.y, { kind: opt.blocked ? 'shield' : 'hit', count: opt.big ? 30 : 16, color: opt.blocked ? '#bdf4ff' : '#ffffff' });
      fx('burst', b.x, b.y, { kind: from.e.kind, count: opt.big ? 22 : 10, color: from.e.color });
      fx('shake', opt.big ? R : to.wrap, opt.big ? 0.9 : 0.5);
      if (opt.big && !still()) fx('flash', from.e.color, 160);
      sfx(opt.blocked ? 'shield' : opt.hitSfx || 'hit');
      if (opt.damage != null) takeLife(to, opt.damage, opt.blocked);
      await w(200);
      from.wrap.classList.remove('is-lunge');
      setTimeout(function () { to.wrap.classList.remove('is-hurt'); }, 500);
    }
    function takeLife(to, n, blocked) {
      if (blocked || n <= 0) { popNumber(to, ICON.guard, 'is-block'); return; }
      if (to === W) S.wLife = lifeAfter(S.wLife, n);
      else me().life = lifeAfter(me().life, n);
      popNumber(to, '<span class="num">−' + n + '</span>', to === W ? 'is-wild' : 'is-mine');
      hud();
    }
    function sparksFly(n) {
      return; // milestone 1, slice 2: sparks no longer open anything, so they are not shown
      var from = hitXY(W), to = xy(sparkChip), k = Math.min(n, 5);
      for (var i = 0; i < k; i++) {
        (function (i) {
          setTimeout(function () {
            if (S.dead) return;
            Promise.resolve(fx('trail', { x: from.x + (Math.random() - 0.5) * 60, y: from.y - 40 }, to, { kind: 'spark', color: '#ffd34d', ms: 520 })).then(function () {
              if (i === k - 1) { sfx('spark'); hud(); sparkChip.classList.remove('is-bump'); void sparkChip.offsetWidth; sparkChip.classList.add('is-bump'); }
            });
          }, i * 90);
        })(i);
      }
      setTimeout(hud, 800); // the counter is right even if the trail never arrives
    }

    /* ---- input ---- */
    function waitInput() { return new Promise(function (res) { S.waiter = res; }); }
    function input(x) { var f = S.waiter; if (!f || S.dead) return; S.waiter = null; f(x); }
    function waitNext(autoMs) {
      var p = new Promise(function (res) { S.nextWaiter = res; });
      if (G.fast && autoMs) rawWait(autoMs).then(function () { if (S.nextWaiter) next(); });
      return p.then(function () { if (S.dead) throw DEAD; });
    }
    function next() { var f = S.nextWaiter; if (!f) return false; S.nextWaiter = null; sfx('tap'); f(); return true; }

    idk.addEventListener('click', function () {
      if (S.busy || S.done || !(S.phase === 'task' || S.phase === 'help' || S.phase === 'heart' || S.phase === 'fix')) return;
      sfx('tap'); input({ kind: 'idk' });
    });
    speak.addEventListener('click', function () {
      sfx('tap');
      // his own "hear it again": the one tap that may stop the voice and start the line over
      if (S.phase === 'how' && S.howSay) say(S.howSay, { cut: true });
      else if (S.phase === 'watch' && S.watchSay) say(S.watchSay, { cut: true });
      else if (S.task) say(S.task.say || S.task.prompt, { cut: true });
    });
    howNext.addEventListener('click', next);
    home.addEventListener('click', function () { sfx('tap'); askQuit(); });

    /* ---- the task on screen ---- */
    function openTask(task, sol, kind) {
      // praise belongs to the task that earned it: it fades as the next instruction appears
      if (lineEl.classList.contains('is-praise')) { clearTimeout(lineTimer); lineEl.classList.remove('is-on'); }
      if (S.ui) S.ui.destroy();
      S.robotSent = false;
      taskHost.innerHTML = '';
      panel.className = 'bt-panel panel pow-' + (task.power || 'tal') + (kind === 'help' ? ' is-help' : '') + (kind === 'heart' ? ' is-heart' : '') + (kind === 'heart' && story.classList.contains('is-on') ? ' has-story' : '') + (S.busy ? ' is-busy' : '');
      powChip.innerHTML = powIcon(task.power);
      promptEl.textContent = task.prompt || '';
      promptEl.className = 'bt-prompt h' + ((task.prompt || '').length > 34 ? ' is-long' : '');
      tagEl.textContent = kind === 'help' ? t('b.follow') : '';
      tagEl.classList.toggle('is-on', kind === 'help');
      if (kind === 'heart' && S.heartWhy) { promptEl.textContent = S.heartWhy; promptEl.className = 'bt-prompt h is-why' + (S.heartWhy.length > 34 ? ' is-long' : ''); }
      var ghost = mode === 'intro' && kind === 'task' && task.ui === 'build' && !S.ghostShown ? (localSolution(task) || []).length : 0;
      if (ghost) S.ghostShown = true;
      S.ui = G.TaskUI.render(taskHost, task, {
        onAnswer: function (a) { input({ kind: 'answer', value: a }); },
        solution: sol == null ? null : sol,
        onBreath: onBreath,
        ghost: ghost,
        fighter: me().id   // the one fighting now walks the arrow grid (after a step-in it is not team[0])
      });
      if (!still()) { taskHost.classList.remove('rise-in'); void taskHost.offsetWidth; taskHost.classList.add('rise-in'); }
      say(task.say || task.prompt);
    }
    function check(task, a) {
      var r = null;
      try { if (brain && brain.check) r = brain.check(task, a); } catch (e) { console.error('brain.check', e); }
      if (!r || typeof r.ok !== 'boolean') r = localCheck(task, a);
      if (r.solution == null) r.solution = localSolution(task);
      return r;
    }
    function solutionFor(task) {
      var probe = { build: [], fill: -1, choice: -1, spell: '', breathe: false, secret: '', match: -1, beats: -1, give: -1, shapes: [], test: -1, strings: -1, steps: [] }[task.ui];
      try { var r = brain && brain.check ? brain.check(task, probe) : null; if (r && r.solution != null) return r.solution; } catch (e) { /* the local route covers it */ }
      return localSolution(task);
    }
    function record(task, ok, helped) {
      var rec = { power: task.power, step: task.step, ok: !!ok, firstTry: !!ok, helped: !!helped };
      S.records.push(rec);
      try { if (brain && brain.record) brain.record(task, { ok: rec.ok, firstTry: rec.firstTry, helped: rec.helped, today: today }); } catch (e) { console.error('brain.record', e); }
    }
    // the topics this battle may use: those that are on for this player (the parent page), from the brain
    function topics() {
      var all = (G.Brain && G.Brain.POWERS) || ['tal', 'ord', 'logik'];
      try { if (brain && brain.topics) { var on = brain.topics(); if (on && on.length) return on; } } catch (e) { console.error('brain.topics', e); }
      return all;
    }
    function nextTask() {
      // a wild one that leans to a topic that is off simply draws from the others
      var hard = topics(), own = wildC.power, others = hard.filter(function (p) { return p !== own; });
      if (!others.length) others = hard;
      for (var tries = 0; tries < 10; tries++) {
        var p = hard.indexOf(own) < 0 ? pick(hard) : (S.tasks === 0 || Math.random() < 0.6) ? own : pick(others);
        if (tries > 5) p = pick(hard);
        var task = null;
        try { task = brain && brain.next ? brain.next({ power: p, today: today }) : null; } catch (e) { console.error('brain.next', e); }
        if (task && task.ui && !seen(task)) return task;
      }
      // every question of his steps has been asked in this battle (Natur og teknik's float game has five): the step
      // above in one of his topics, rather than a hit without a question
      var order = [own].concat(others).filter(function (p) { return hard.indexOf(p) >= 0; });
      for (var k = 0; k < order.length; k++) { var up = stretchTask(order[k]); if (up) return up; }
      return null;
    }

    // the wild one's own task, picked to teach him: the step above his own or one he has found hard, more often from
    // the topic he misses most (brain.teach). An older brain without it gives a step above in the last topic.
    function teachTask() {
      if (!(brain && brain.teach)) return stretchTask(S.lastPower || wildC.power);
      for (var tries = 0; tries < 8; tries++) {
        var task = null;
        try { task = brain.teach({ today: today }); } catch (e) { console.error('brain.teach', e); }
        if (task && task.ui && task.ui !== 'breathe' && !seen(task)) return task;
      }
      return stretchTask(S.lastPower || wildC.power);
    }
    // one step above his level, same topic: the super hit. It never moves his level.
    function stretchTask(power) {
      var hard = topics();
      if (hard.indexOf(power) < 0) power = pick(hard);
      for (var tries = 0; tries < 8; tries++) {
        var task = null;
        try { task = brain && brain.stretch ? brain.stretch({ power: power }) : brain && brain.next ? brain.next({ power: power, today: today }) : null; } catch (e) { console.error('brain.stretch', e); }
        if (task && task.ui && task.ui !== 'breathe' && !seen(task)) return task;
      }
      return null;
    }

    /* ---- the flow ---- */
    async function run() {
      await entrance();
      while (!S.dead) {
        if (S.wLife <= 0) { await heartMoment(); S.result = mode === 'intro' ? 'caught' : 'won'; S.xp = 1; S.xpBy[me().baseId] = 1; await catchMoment(); break; }
        if (me().life <= 0 && !(await stepIn())) { S.result = 'slipped'; await faint(); await slipAway(); break; }
        await turn();
        if (!S.dead && S.wLife > 0 && me().life > 0) await wildTurn();
      }
      await resultCard();
    }

    async function entrance() {
      setPhase('enter');
      music('battle');
      sfx('open');
      await w(450);
      R.classList.remove('is-enter');
      call(W.m, 'hop');
      var hello = t('b.appears', { name: wildC.name });
      line(hello, 2600, 'is-big');
      say(hello);
      await w(400);
      sfx('shield');
      await w(mode === 'intro' ? 1900 : 1100);
      await spoken();
    }

    async function turn() {
      // three right in a row: the wild one is dizzy and he may try a super hit on a harder task
      var superTry = false;
      if (S.streak >= RULES.streak) { S.streak = 0; superTry = await superOffer(); }
      var task = superTry ? stretchTask(S.lastPower || wildC.power) : null;
      if (superTry && !task) superTry = false;
      if (!task) task = nextTask();
      if (!task) { takeLife(W, part(me().lifeMax, RULES.hit)); return; } // never stuck without a task
      S.task = task; use(task); S.tasks++; S.lastPower = task.power;
      S.solution = solutionFor(task);
      await spoken();
      setPhase('task');
      openTask(task, null, 'task');
      panel.classList.toggle('is-super', superTry);
      if (mode === 'intro' && S.tasks === 1) rawWait(700).then(function () { if (S.ui && S.phase === 'task' && S.task === task) S.ui.hint(S.solution); });
      var inp = await waitInput();
      if (S.dead) throw DEAD;
      clearPointer();
      // he answered before the voice got to the question: it is no longer read out
      try { if (G.voice && G.voice.unsay) G.voice.unsay(task.say || task.prompt); } catch (e) { /* voice is optional */ }
      var res = inp.kind === 'answer' ? check(task, inp.value) : null;
      if (res && res.ok) {
        if (superTry) {
          S.records.push({ power: task.power, step: task.step, ok: true, firstTry: false, helped: false, stretch: true, kind: 'super' });
          // a super hit is a task from the step above: getting it right moves him up to that step
          try { if (brain && brain.record) brain.record(task, { ok: true, firstTry: true, helped: false, super: true, today: today }); } catch (e) { console.error('brain.record', e); }
        } else record(task, true, false);
        await rightHit(task, res, inp.value, superTry);
        panel.classList.remove('is-super');
        return;
      }
      // a miss or "?": soft, no blame, then the how. A missed super hit costs only the chance.
      S.streak = 0;
      setPhase('busy');
      if (S.ui) { S.ui.lock(); S.ui.el.classList.add('is-soft'); }
      sfx('miss');
      if (res && res.solution != null) S.solution = res.solution;
      await w(450);
      await showHow(task);
      await helped(task, S.solution);
      if (superTry) S.records.push({ power: task.power, step: task.step, ok: false, firstTry: false, helped: true, stretch: true, kind: 'super' });
      else record(task, false, true);
      panel.classList.remove('is-super');
      S.sparks += 1; sparksFly(1);
    }

    async function superOffer() {
      await spoken();
      setPhase('offer');
      if (S.ui) { S.ui.destroy(); S.ui = null; }
      taskHost.innerHTML = '';
      W.wrap.classList.add('is-dizzy');
      powChip.innerHTML = ICON.star.replace('currentColor', '#ffd34d');
      promptEl.textContent = t('b.superAsk'); promptEl.className = 'bt-prompt h';
      tagEl.classList.remove('is-on');
      sfx('ready');
      say(t('b.superAsk'));
      var inp = await waitInput();
      if (S.dead) throw DEAD;
      W.wrap.classList.remove('is-dizzy');
      return !!(inp && inp.kind === 'offer' && inp.value);
    }

    async function rightHit(task, res, value, superTry) {
      setPhase('busy');
      if (S.ui) { S.ui.lock(); S.ui.el.classList.add('is-right'); }
      var smart = !!res.smart, big = superTry || smart;
      sfx(big ? 'super' : 'right');
      if (!superTry) { S.firstTry++; S.streak++; }
      S.sparks += 3 + (smart ? 2 : 0);
      var praise = res.praise || task.praise;
      // praise is shown; it is spoken only when the voice is free (he may have answered while the task was still being read)
      if (praise && !superTry) { line(praise, 2600, 'is-praise'); say(praise, { skip: true }); }
      if (big) showBanner(t('b.super'), 'is-gold');
      await comet(task, value);
      await strikeAnim(P, W, { big: big, damage: part(me().lifeMax, RULES.hit) * (superTry ? RULES.superHit : 1), quick: true });
      sparksFly(3 + (smart ? 2 : 0));
      hud();
      await w(big ? 750 : 550);
    }

    // finger to shield in one motion: what he built fuses, flies up to the starter as a comet, and the starter fires
    async function comet(task, value) {
      var src = S.ui && S.ui.built ? S.ui.built() : null;
      if (!src) return;
      var st = document.getElementById('stage') || document.body, sr = st.getBoundingClientRect(), k = sr.width / (st.offsetWidth || sr.width || 1) || 1;
      var r = src.getBoundingClientRect(), from = xy(src), to = xy(P.host), col = getComputedStyle(panel).getPropertyValue('--pow').trim() || '#ffd34d';
      to = { x: to.x + 40, y: to.y - 30 };
      var c = el('div', 'bt-comet pow-' + (task.power || 'tal'), null, R);
      if (task.ui === 'build') {
        c.innerHTML = '<div class="orb bt-fused"><span class="orb-v num"></span></div>';
        c.querySelector('.orb-v').textContent = String(task.build.target) + (task.build.unit ? ' ' + task.build.unit : '');
      } else {
        var cl = src.cloneNode(true);
        cl.querySelectorAll('[data-act]').forEach(function (e) { e.removeAttribute('data-act'); }); cl.removeAttribute('data-act');
        cl.style.width = (r.width / k) + 'px'; cl.style.height = (r.height / k) + 'px'; cl.style.margin = '0';
        c.appendChild(cl);
      }
      c.style.left = from.x + 'px'; c.style.top = from.y + 'px';
      c.style.setProperty('--glow', col);
      src.style.visibility = 'hidden';
      void c.offsetWidth; c.classList.add('is-fuse');
      sfx('charge');
      await w(200);
      c.classList.add('is-fly');
      c.style.transform = 'translate(' + (to.x - from.x).toFixed(0) + 'px,' + (to.y - from.y).toFixed(0) + 'px) scale(.32)';
      fx('trail', from, to, { kind: 'spark', color: col, ms: 360 });
      await w(380);
      c.remove();
      fx('burst', to.x, to.y, { kind: 'spark', count: 14, color: col });
      P.wrap.classList.add('is-power');
      setTimeout(function () { P.wrap.classList.remove('is-power'); }, 650);
    }

    // opt.wild: the wild one thinks aloud on its own turn (it moves on by itself; the arrow skips ahead).
    // opt.from / opt.to: only these steps of the how.
    async function showHow(task, opt) {
      opt = opt || {};
      var all = howSteps(task), wild = !!opt.wild;
      var from = Math.max(0, opt.from | 0), to = opt.to == null ? all.length : Math.min(all.length, opt.to);
      var steps = all.slice(from, to);
      if (!steps.length) return;
      await spoken();
      setPhase('how');
      panel.classList.add('is-how');
      how.classList.toggle('is-wild', wild);
      drawFace(wild ? wildC.id : partC.id, wild);
      if (wild) powChip.innerHTML = '<img class="bt-wface" alt="" src="' + BASE + 'assets/creatures/' + wildC.id + '.webp">';
      else powChip.innerHTML = ICON.heart.replace('currentColor', pE.color);
      promptEl.textContent = wild ? t('b.thinks', { name: wildC.name }) : t('b.shows', { name: partC.name });
      promptEl.className = 'bt-prompt h';
      tagEl.classList.remove('is-on');
      var who = wild ? W : P;
      if (!wild) P.wrap.classList.add('is-teach');
      call(who.m, 'hop');
      howDots.innerHTML = '';
      var dots = steps.map(function () { return el('span', 'bt-dot', null, howDots); });
      for (var i = 0; i < steps.length; i++) {
        var st = steps[i];
        if (task.ui === 'spell' && from + i === all.length - 1 && task.spell && task.spell.word) {
          dots.forEach(function (d, k) { d.classList.toggle('is-on', k <= i); });
          await spellHow(task, wild);
          continue;
        }
        dots.forEach(function (d, k) { d.classList.toggle('is-on', k <= i); });
        howVis.innerHTML = '';
        var sv = st.visual && st.visual.type ? st.visual : null;
        if (sv && sv.type === 'big' && String(sv.text).trim() === String(st.text || '').trim()) sv = null; // say it once, not twice
        how.classList.toggle('has-vis', !!sv);
        if (sv) G.TaskUI.visual(howVis, sv, { fighter: wild ? wildC.id : me().id });
        howVis.classList.remove('is-anim'); void howVis.offsetWidth; howVis.classList.add('is-anim');
        howText.textContent = st.text || '';
        how.classList.remove('is-step'); void how.offsetWidth; how.classList.add('is-step');
        S.howSay = st.say || st.text;
        say(S.howSay);
        if (i) call(who.m, 'hop');
        if (wild) await nextOrSpoken(1200, sayMs(S.howSay)); else await waitNext(1800);
      }
      S.howSay = null;
      panel.classList.remove('is-how');
      P.wrap.classList.remove('is-teach');
    }

    // "b", "u", "s": each letter lights up as the voice says it, then the whole word with its picture
    async function spellHow(task, wild) {
      var word = String(task.spell.word), letters = word.split(''), lang = (task.key && task.key.lang) || G.lang;
      var pic = task.visual && task.visual.type === 'emoji' ? task.visual : null;
      howVis.innerHTML = '';
      how.classList.toggle('has-vis', !!pic);
      if (pic) G.TaskUI.visual(howVis, { type: 'emoji', emoji: pic.emoji });
      howText.textContent = '';
      var row = el('div', 'bt-spell', null, howText);
      var cells = letters.map(function (L) { return txt('span', 'bt-sl num', L, row); });
      var whole = txt('div', 'bt-sw num', word.charAt(0) + word.slice(1).toLowerCase(), howText);
      how.classList.remove('is-step'); void how.offsetWidth; how.classList.add('is-step');
      // capital letters, one sentence each ("S. O. L. Sol."): the recorded voice has a clip per letter and per word
      // an English word is said by the English voice: "[en] Cat." (src/voice.js), never by the Danish one
      var lineSay = letters.join('. ') + '. ' + (lang === 'en' ? '[en] ' : '') + word.charAt(0) + word.slice(1).toLowerCase() + '.';
      var shown = -1;
      function light(i) {
        if (i <= shown || S.dead) return;
        shown = i;
        cells.forEach(function (c, k) { c.classList.toggle('is-on', k <= i); c.classList.toggle('is-now', k === i && i < cells.length); });
        if (i < cells.length) sfx('pick');
        if (i >= cells.length) { whole.classList.add('is-on'); call(P.m, 'hop'); }
      }
      // the voice tells us when each sentence starts; without a recorded voice a steady beat does the same job
      // the voice finishes the line before (it is never cut), so the letters wait for it: then this line starts at once,
      // and only this line's sentences light the letters
      await spoken();
      var heard = false;
      if (G.voice) G.voice.onSentence = function (i, s, said) { if (said !== lineSay) return; heard = true; light(i); };
      S.howSay = lineSay;
      say(lineSay);
      await w(500);
      for (var i = 0; i <= cells.length; i++) {
        if (!heard) light(i);
        else if (shown >= cells.length) break;
        await w(heard ? 900 : 750);
      }
      light(cells.length);
      if (G.voice) G.voice.onSentence = null;
      if (wild) await nextOrSpoken(900, 1500); else await waitNext(1200);
    }

    async function helped(task, sol) {
      var tries = 0;
      await spoken();
      setPhase('help');
      openTask(task, sol, 'help');
      var auto = false;
      for (;;) {
        // the waiter is always set before anything can answer, so no tap is ever lost
        var p = waitInput();
        if (auto) { auto = false; rawWait(350).then(function () { if (S.ui && !S.dead && S.phase === 'help') S.ui.answer(sol); }); }
        var inp = await p;
        if (S.dead) throw DEAD;
        if (inp.kind === 'idk') { auto = true; continue; } // he asks again: the starter does it with him
        var res = check(task, inp.value);
        if (res.ok) break;
        tries++;
        sfx('miss');
        setPhase('busy');
        await w(500);
        setPhase('help');
        openTask(task, sol, 'help');
        if (tries >= 2) auto = true;
      }
      setPhase('busy');
      S.ui.lock(); S.ui.el.classList.add('is-right');
      sfx('right');
      line(t('b.thatsIt'), 1500, 'is-praise');
      call(P.m, 'hop');
      await w(800);
    }

    /* The wild one's turn. It works a task and he watches how it thinks: the task, the steps one at a time, then the
       answer. It is always right, so everything he sees here is safe to learn from. The brain picks the task to teach
       him (teachTask). He judges nothing: it moves on by itself when the voice is done, and the arrow skips ahead. */
    function sayMs(text) { return Math.max(2200, Math.min(6000, 1300 + 62 * String(text || '').length)); }
    // waits for a tap on the arrow, or until the spoken line has ended (never less than minMs)
    function nextOrSpoken(minMs, estMs) {
      var over = false;
      var tap = new Promise(function (res) { S.nextWaiter = res; });
      var timed = (async function () {
        var at = 0, v = G.voice, talks = !!(v && v.idle && v.on && v.on());
        while (!over && !S.dead) {
          await rawWait(150); at += 150;
          // with the voice on: until it has said the line (never less than minMs, never more than 12 s);
          // with the voice off: the time it takes to read the line
          if (talks ? (at >= minMs && (!v.busy || at >= 12000)) : at >= estMs) break;
        }
        if (!over && !S.dead) await rawWait(250);
      })();
      return Promise.race([tap, timed]).then(function () { over = true; S.nextWaiter = null; if (S.dead) throw DEAD; });
    }
    function howSteps(task) { return (task.how || []).filter(function (s) { return s && (s.text || s.visual); }).slice(0, 3); }
    function mark(side, ok) { popNumber(side, ok ? ICON.check : ICON.cross, 'is-mark ' + (ok ? 'is-yes' : 'is-no')); }
    async function wildTurn() {
      setPhase('busy');
      await spoken();
      var task = teachTask();
      if (S.ui) { S.ui.destroy(); S.ui = null; }
      taskHost.innerHTML = '';
      clearTimeout(lineTimer); lineEl.classList.remove('is-on'); // his praise ends where its turn begins
      R.classList.add('is-wildturn');
      panel.className = 'bt-panel panel is-busy pow-' + ((task && task.power) || 'tal');
      powChip.innerHTML = '<img class="bt-wface" alt="" src="' + BASE + 'assets/creatures/' + wildC.id + '.webp">';
      promptEl.textContent = ''; promptEl.className = 'bt-prompt h';
      tagEl.classList.remove('is-on');
      showBanner(t('b.turnOf', { name: wildC.name }), 'is-turn');
      sfx('open');
      call(W.m, 'hop');
      await w(250); // the banner stays up while its task appears and is read out: no waiting for it
      if (!task) { await w(500); await wildStrike(); R.classList.remove('is-wildturn'); return; }
      use(task);
      var sol = solutionFor(task);
      S.task = task; S.solution = sol; S.watch = { teach: task.teach || null };
      // its task, in the same picture he knows, locked: nothing here is his to tap but the arrow
      promptEl.textContent = task.prompt || ''; promptEl.className = 'bt-prompt h' + ((task.prompt || '').length > 34 ? ' is-long' : '');
      S.ui = G.TaskUI.render(taskHost, task, { onAnswer: function () {}, solution: null, fighter: wildC.id });
      S.ui.lock(); S.ui.el.classList.add('is-theirs');
      S.robotSent = false;
      setPhase('watch');
      W.wrap.classList.add('is-thinking');
      // the question is on screen and is not read out again (Steve's play notes 4); his own hear-again tap still reads it
      S.watchSay = task.say || task.prompt;
      // how it thinks, one small step at a time, on the task itself; the old how is the fallback
      if (!(await thinkTurn(task, sol))) await showHow(task, { wild: true });
      setPhase('busy');
      promptEl.textContent = task.prompt || ''; promptEl.className = 'bt-prompt h' + ((task.prompt || '').length > 34 ? ' is-long' : '');
      W.wrap.classList.remove('is-thinking');
      S.ui.show(sol);
      S.ui.el.classList.add('is-right');
      sfx('right'); mark(W, true);
      call(W.m, 'hop');
      await w(750);
      await wildStrike();
      S.records.push({ power: task.power, step: task.step, ok: true, firstTry: false, helped: false, stretch: true, kind: 'watch', teach: task.teach || null,
        firstWatch: S.lastThink ? S.lastThink.first : null, thinkMs: S.lastThink ? S.lastThink.ms : null, beats: S.lastThink ? S.lastThink.beats : null, skipped: S.lastThink ? S.lastThink.skipped : null });
      S.lastThink = null;
      R.classList.remove('is-wildturn');
      S.watch = null; S.watchSay = null;
    }
    /* The wild one thinks on its own task, step by step (src/think.js has the steps of every kind of task). Slow the
       first time he watches a step of the ladder: every step spoken, a pause after each. After he has watched it once:
       only the steps that carry the idea are spoken, with short pauses. "Watched" is kept per step in his save
       (o.watched). The arrow skips to its answer; a line being spoken is never cut (the next one waits its turn). */
    var watched = o.watched && typeof o.watched === 'object' ? o.watched : {};
    function estMs(text) { return Math.min(6000, 350 + 68 * String(text || '').replace(/\[en\]\s*/g, '').length); }
    // a Danish game speaks only steps that have a recorded clip (the rest are shown); an English game uses the device voice
    function hasClip(text) { var v = G.voice; return G.lang !== 'da' || !v || !v.ready || !v.has || v.has(text); }
    function nowMs() { return window.performance && performance.now ? performance.now() : Date.now(); }
    // waits for the spoken line to end (never less than pc.min), then the pause; a tap on the arrow skips ahead
    async function beatWait(text, pc) {
      var v = G.voice, talks = !!(text && v && v.on && v.on() && v.idle), at = 0, est = text ? Math.max(pc.min, estMs(text)) : pc.min, tap = false;
      S.nextWaiter = function () { tap = true; S.thinkSkip = true; };
      while (!tap && !S.dead) {
        await rawWait(50); at += 50;
        if (talks ? (at >= pc.min && (!v.busy || at >= 12000)) : at >= est) break;
      }
      for (var q = 0; !tap && !S.dead && q < pc.pause; q += 50) await rawWait(50);
      S.nextWaiter = null;
      if (S.dead) throw DEAD;
    }
    function thinkEls(list) {
      var out = [], root = S.ui && S.ui.el;
      (list || []).forEach(function (a) {
        var sel = typeof a === 'string' ? a : a.sel, i = typeof a === 'string' ? 0 : a.i;
        var all = root ? root.querySelectorAll(sel) : [];
        if (!all.length) all = R.querySelectorAll(sel);
        if (all[i]) out.push(all[i]);
      });
      return out;
    }
    async function thinkTurn(task, sol) {
      var plan = G.Think && G.Think.plan ? G.Think.plan(task, sol) : null, beats = plan ? plan.beats : [];
      if (!beats.length || !S.ui || !S.ui.el) return false;
      var stepId = task.step || task.id, first = !(watched[stepId] > 0), pace = G.Think.PACE[first ? 'first' : 'later'];
      var root = S.ui.el, vbox = root.querySelector('.tk-vis'), kept = null, lit = [], spokenN = 0;
      S.thinkSkip = false;
      R.classList.add('is-thinkturn');
      root.classList.add('is-thinking');
      var t0 = nowMs();
      function restoreVis() {
        if (!vbox || !kept) return;
        vbox.innerHTML = ''; kept.forEach(function (n) { vbox.appendChild(n); }); kept = null;
        vbox.classList.remove('is-thinkvis');
      }
      try {
        for (var i = 0; i < beats.length; i++) {
          var b = beats[i];
          if (S.thinkSkip && i < beats.length - 1) continue;   // the arrow: straight to its answer
          lit.forEach(function (e) { e.classList.remove('is-think'); });
          // a picture of its how, drawn where the question's picture is (the question's own comes back after)
          if (b.vis && vbox) {
            if (!kept) kept = Array.prototype.slice.call(vbox.childNodes);
            vbox.innerHTML = '';
            vbox.classList.add('is-thinkvis');
            var sv = b.vis.type === 'big' && String(b.vis.text).trim() === String(b.text || '').trim() ? null : b.vis;
            if (sv) G.TaskUI.visual(vbox, sv, { fighter: wildC.id });
            if (b.text) txt('div', 'tk-thinktext', b.text, vbox);
          } else restoreVis();
          // the part of the answer first (a berry on the plate, a letter in its box), then what it looks at lights up
          if (b.show !== undefined) { try { S.ui.show(b.show); } catch (e) { console.error('think show', e); } }
          // the secret word's chest opens on its last step (the whole word), not with the last letter
          if (task.ui === 'secret' && i < beats.length - 1) root.querySelectorAll('.sw-chest.is-open').forEach(function (e) { e.classList.remove('is-open'); });
          lit = thinkEls(b.light);
          lit.forEach(function (e) { e.classList.remove('is-think'); void e.getBoundingClientRect(); e.classList.add('is-think'); });
          if (b.pluck != null) { var str = root.querySelector('[data-act="string-' + b.pluck + '"]'); if (str) str.click(); }
          var speak = b.say && (first || b.key) && hasClip(b.say) ? b.say : null;
          if (speak) { say(speak); spokenN++; }
          else if (b.pace === 'count') sfx('pick');
          if (b.pace !== 'count' || i === beats.length - 1) call(W.m, 'hop');
          await beatWait(speak, pace[b.pace] || pace.step);
        }
      } finally {
        lit.forEach(function (e) { e.classList.remove('is-think'); });
        restoreVis();
        root.classList.remove('is-thinking');
        R.classList.remove('is-thinkturn');
      }
      var ms = Math.round(nowMs() - t0);
      S.lastThink = { first: first, ms: ms, beats: beats.length, spoken: spokenN, skipped: !!S.thinkSkip, step: stepId };
      watched[stepId] = (watched[stepId] | 0) + 1;
      try { if (o.onWatched) o.onWatched(stepId); } catch (e) { console.error('onWatched', e); }
      return true;
    }
    async function wildStrike() {
      await strikeAnim(W, P, { hitSfx: 'wildhit', damage: wildDamage(wildKraft) });
      await w(450);
    }
    // his last Gromonster is out of life: it faints where it stands (no one is left to step in)
    async function faint() {
      me().out = true;
      setPhase('busy');
      P.wrap.classList.add('is-faint');
      call(P.m, 'sleep');
      sfx('slip');
      await w(1100);
    }
    // the fighter is out of life: the next one on the team steps in with a full bar of its own
    async function stepIn() {
      me().out = true;
      var nx = -1;
      for (var i = 0; i < fighters.length; i++) if (!fighters[i].out && fighters[i].life > 0) { nx = i; break; }
      if (nx < 0) return false;
      setPhase('busy');
      P.wrap.classList.add('is-out');
      sfx('slip');
      await w(600);
      try { if (P.m && P.m.destroy) P.m.destroy(); } catch (e) { /* already gone */ }
      S.fi = nx;
      partC = creature(me().id); pE = ELEM[partC.element] || ELEM.plain;
      P.c = partC; P.e = pE; P.host.innerHTML = '';
      P.m = mount(P.host, partC.id, false);
      drawTeam(); drawFace(); hud();
      P.wrap.classList.remove('is-out');
      sfx('open');
      await w(300);
      call(P.m, 'hop');
      await w(700);
      return true;
    }

    function onBreath(done, total) {
      W.wrap.style.setProperty('--calm', (done / total).toFixed(2));
      var q = hitXY(W);
      fx('burst', q.x, q.y - 60, { kind: 'heart', count: 6, color: '#ff8fb8' });
      if (done >= total) dizzy.classList.add('is-gone');
    }

    async function heartMoment() {
      setPhase('busy');
      clearPointer();
      if (S.ui) { S.ui.destroy(); S.ui = null; }
      W.wrap.classList.add('is-dizzy');
      music('heart');
      await w(700);
      await spoken();
      var calmLine = t('b.calm', { name: wildC.name });
      line(calmLine, 3200, 'is-heart is-big');
      say(calmLine);
      await w(mode === 'intro' ? 3000 : 2200);
      await spoken();
      var task = null;
      try { task = brain && brain.heart ? brain.heart({ today: today, name: wildC.name }) : null; } catch (e) { console.error('brain.heart', e); }
      if (!task || !task.ui) { W.wrap.classList.remove('is-dizzy'); return; }
      S.task = task; S.solution = solutionFor(task); S.heartWhy = null;
      showStory(task);
      clearTimeout(lineTimer); lineEl.classList.remove('is-on');
      var first = true, firstOk = false;
      for (;;) {
        setPhase('heart');
        openTask(task, first ? null : S.solution, 'heart');
        var inp = await waitInput();
        if (S.dead) throw DEAD;
        var res = inp.kind === 'answer' ? check(task, inp.value) : null;
        if (task.ui === 'breathe' || (res && res.ok)) { firstOk = first; break; }
        first = false;
        if (res && res.solution != null) S.solution = res.solution;
        // never "wrong": the kinder choice in one line, then he picks again
        setPhase('busy');
        if (S.ui) { S.ui.lock(); S.ui.el.classList.add('is-soft'); }
        sfx('tap');
        var h = (task.how || [])[0] || {}, why = h.text || t('b.kinder');
        // naming a feeling is not a test: another feeling is fine too, here is what many would feel
        if (task.key && task.key.topic === 'feel') why = t('b.feelToo') + ' ' + why;
        S.heartWhy = why;
        promptEl.textContent = why; promptEl.className = 'bt-prompt h is-why' + (why.length > 34 ? ' is-long' : '');
        say(why);
        await w(2600);
        await spoken();
      }
      S.heartWhy = null;
      record(task, firstOk, !firstOk);
      S.heart = true;
      S.sparks += 3;
      setPhase('busy');
      if (S.ui) { S.ui.lock(); S.ui.el.classList.add('is-right'); }
      sfx('right');
      var q = hitXY(W);
      fx('burst', q.x, q.y - 40, { kind: 'heart', count: 26, color: '#ff6b9d' });
      W.wrap.classList.remove('is-dizzy');
      call(W.m, 'happy');
      sparksFly(3);
      await w(1300);
      story.classList.remove('is-on');
    }
    // the heart moment's picture, big on the stage between the two
    function showStory(task) {
      var v = task.visual || {}, id = String(task.id || '').replace(/^hjerte\./, ''), u = null, cls = 'is-scene';
      if (G.PICS && G.PICS['scene:' + id]) u = BASE + G.PICS['scene:' + id];
      else if (v.text && wildC.name && String(v.text).indexOf(wildC.name) >= 0) { u = BASE + 'assets/creatures/' + wildC.id + '.webp'; cls = 'is-wild'; }
      else if (v.emoji && G.TaskUI.pic) { u = G.TaskUI.pic(v.emoji); cls = 'is-thing'; }
      story.innerHTML = '';
      story.className = 'bt-story ' + cls;
      if (u) {
        var img = el('img', null, null, story); img.alt = ''; img.draggable = false;
        img.onerror = function () { img.remove(); if (v.emoji) txt('div', 'bt-story-e', v.emoji, story); };
        img.src = u;
      } else if (v.emoji) txt('div', 'bt-story-e', v.emoji, story);
      else return;
      void story.offsetWidth; story.classList.add('is-on');
      panel.classList.add('has-story');
    }

    async function catchMoment() {
      setPhase('catch');
      closeQuit();
      S.sparks += mode === 'train' ? 5 : 10;
      R.classList.add('is-finale');
      hideBubble();
      R.classList.add('is-stagey');
      // only the first battle ends in a friend here; any other win is a win, and the friend is picked at camp
      if (mode !== 'intro') {
        W.wrap.classList.add('is-center');
        sfx('win');
        call(W.m, 'happy'); call(P.m, 'happy');
        fx('confetti', 1800);
        var cheer = mode === 'train' ? t('b.trained') : t('b.super');
        showCatchName(cheer, '');
        say(cheer);
        await w(2600);
        await spoken();
        return;
      }
      W.wrap.classList.add('is-center');
      R.classList.add('is-beam');
      sfx('catch');
      await w(500);
      var q = hitXY(W);
      fx('burst', q.x, q.y - 80, { kind: 'star', count: 40, color: '#5df2b0' });
      W.wrap.classList.add('is-turn');
      await w(800);
      call(W.m, 'hop');
      await w(700);
      call(W.m, 'happy'); call(P.m, 'happy');
      fx('confetti', 2600);
      q = hitXY(W);
      fx('burst', q.x, q.y - 60, { kind: 'heart', count: 20, color: '#ff6b9d' });
      var friend = t('b.friend', { name: wildC.name });
      showCatchName(wildC.name, friend.replace(wildC.name, '').trim());
      say(friend);
      await w(2900);
      await spoken();
    }
    function showCatchName(big, small) {
      catchName.innerHTML = '';
      txt('div', 'bt-cn-big title', big, catchName);
      if (small) txt('div', 'bt-cn-small h', small, catchName);
      catchName.classList.add('is-on');
    }

    async function slipAway() {
      setPhase('slip');
      closeQuit();
      R.classList.add('is-finale');
      sfx('slip');
      call(W.m, 'hop');
      showBubble(ICON.wave + '<span></span>', 'is-bye');
      bubble.querySelector('span').textContent = t('b.bye');
      await w(800);
      call(W.m, 'hop');
      // it stays on the map, so he can try again whenever he likes. In the first battle a new player has nothing to
      // keep yet, and the wild one waits for the try again on the card
      var s = mode === 'train' ? t('b.slipTrain', { name: wildC.name }) + ' ' + t('b.keep') : mode === 'intro' ? '' : t('b.keep');
      if (s) { line(s, 4200, 'is-big'); say(s); }
      await w(1600);
      hideBubble();
      if (mode !== 'train' && mode !== 'intro') W.wrap.classList.add('is-leave');
      await w(1300);
      await spoken();
    }

    async function collectCard() {
      // the new friend as a card that flips in, then tucks itself into the Gromodex
      var reg = (G.regions || {})[o.regionId || wildC.region] || {}, pw = (G.powers || {})[wildC.power] || {};
      var cc = el('div', 'bt-collect pow-' + wildC.power, null, R);
      var face = el('div', 'bt-collect-pic', null, cc), img = el('img', null, null, face);
      img.alt = ''; img.draggable = false; img.onerror = function () { img.remove(); face.classList.add('bt-blob'); };
      img.src = BASE + 'assets/creatures/' + wildC.id + '.webp';
      txt('div', 'bt-collect-name title', wildC.name, cc);
      var meta = el('div', 'bt-collect-meta', null, cc);
      el('span', 'bt-powi', powIcon(wildC.power), meta);
      txt('span', null, loc(pw.name) + (loc(reg.name) ? ' · ' + loc(reg.name) : ''), meta);
      var book = el('div', 'bt-book', ICON.book, R);
      void cc.offsetWidth; cc.classList.add('is-in');
      sfx('open');
      await w(1700);
      book.classList.add('is-on');
      await w(250);
      cc.classList.add('is-stash');
      line(t('b.addedDex'), 1800, 'is-gold'); say(t('b.addedDex'));
      await w(650);
      book.classList.add('is-gulp'); sfx('spark');
      await w(600);
      cc.remove(); book.remove();
    }

    async function resultCard() {
      setPhase('result');
      closeQuit();
      catchName.classList.remove('is-on');
      clearTimeout(lineTimer); lineEl.classList.remove('is-on'); hideBubble();
      story.classList.remove('is-on');
      var res = S.result;
      if (res === 'caught') { S.phase = 'collect'; await collectCard(); S.phase = 'result'; clearTimeout(lineTimer); lineEl.classList.remove('is-on'); }
      var card = el('div', 'bt-card panel pop-in', null, over);
      txt('div', 'bt-card-title title', res === 'caught' ? t('b.newFriend') : res === 'won' ? (mode === 'train' ? t('b.trained') : t('b.super')) : t('b.nextTime'), card);
      var pic = el('div', 'bt-card-pic' + (res === 'slipped' ? ' is-away' : ''), null, card);
      var img = el('img', null, null, pic); img.alt = '';
      img.onerror = function () { img.remove(); pic.classList.add('bt-blob'); };
      img.src = BASE + 'assets/creatures/' + wildC.id + '.webp';
      txt('div', 'bt-card-name h', wildC.name, card);
      // Today's friend (Steve's play notes 4): one new friend a day. After a win in the wild, the same mark as on the map
      // and at camp sits in the card's corner. Today's friend still open: the ring glows gold with this one's face in it
      // (it can be picked at camp). Already chosen: today's friend's face and a moon (a new one tomorrow), and this one
      // waves goodbye, faded, so nothing on the card looks like a catch. The first battle's Crabbi is today's friend.
      var todayMark = null;
      if (G.todayMark && ((res === 'won' && mode === 'catch') || res === 'caught')) {
        var taken = res === 'caught' ? wildC.id : o.friendToday || null;
        todayMark = G.todayMark(el('div', 'bt-today'), taken ? { state: 'filled', id: taken } : { state: 'ready', id: wildC.id });
        card.appendChild(todayMark);
        if (res === 'won' && taken) {
          pic.classList.add('is-away', 'is-bye');
          el('span', 'bt-bye', ICON.wave, pic);
        }
      }
      // his own tasks in the order he met them: a green tick for one he got right by himself, a soft question mark for
      // one where his Gromonster showed him how. No words and no score to work out (Steve, 2026-11-15: the stars and
      // "Rigtigt i første forsøg" made no sense).
      var mine = S.records.filter(function (r) { return r.kind !== 'watch' && r.power !== 'hjerte'; }).slice(-12);
      if (mine.length) {
        var marks = el('div', 'bt-marks', null, card), rights = mine.filter(function (r) { return r.ok && !r.helped; }).length;
        marks.setAttribute('aria-label', t('b.marks', { a: rights, b: mine.length }));
        mine.forEach(function (r, i) {
          var good = r.ok && !r.helped;
          el('span', 'bt-mark ' + (good ? 'is-yes' : 'is-help') + (r.kind === 'super' && good ? ' is-super' : ''), good ? ICON.check : '<b class="h">?</b>', marks).style.setProperty('--d', (300 + i * 110) + 'ms');
        });
      }
      if (S.xp > 0) {
        // what the team earned, with the same count CORE adds to every member
        var xr = el('div', 'bt-xprow', null, card), faces = el('div', 'bt-xpfaces', null, xr);
        fighters.filter(function (f) { return S.xpBy[f.baseId]; }).map(function (f) { return f.id; }).forEach(function (id) {
          var f = el('span', 'bt-mate', null, faces), im = el('img', null, null, f);
          im.alt = ''; im.draggable = false; im.src = BASE + 'assets/creatures/' + id + '.webp';
          im.onerror = function () { f.remove(); };
        });
        el('span', 'bt-xpico', ICON.up, xr);
        txt('span', 'bt-xptext h', t('b.xpGain', { n: S.xp }), xr);
      }
      // a lost battle has a clear way to try again. The first battle has no camp yet: trying again is the only way on.
      var lost = res === 'slipped', again = false, row = el('div', 'bt-card-btns', null, card);
      if (!lost || mode !== 'intro') {
        var go = el('button', 'btn btn-gold btn-big bt-done', null, row);
        go.type = 'button'; go.dataset.act = 'battle-done';
        txt('span', null, t('b.toCamp'), go);
        go.addEventListener('click', next);
      }
      if (lost) {
        var re = el('button', 'btn ' + (mode === 'intro' ? 'btn-gold btn-big bt-done' : 'btn-green') + ' bt-again', ICON.again, row);
        re.type = 'button'; re.dataset.act = mode === 'intro' ? 'battle-done' : 'battle-again';
        txt('span', null, t('b.tryAgain'), re);
        re.addEventListener('click', function () { if (!S.nextWaiter) return; again = true; next(); });
      }
      over.classList.add('is-on');
      sfx(res === 'slipped' ? 'step' : 'win');
      await waitNext();
      // the first battle's card has only "try again", so its one button (and a robot's next) always means that
      if (lost && mode === 'intro') again = true;
      finish(res, again);
    }

    /* ---- quitting, kindly ---- */
    // once the shield or the energy is gone the battle is finishing: Home then leads to the result, never to a dialog
    function finishing() { return !!S.result || S.phase === 'catch' || S.phase === 'slip' || S.phase === 'result' || (S.wLife <= 0 && S.phase !== 'heart'); }
    function closeQuit() {
      var q = over.querySelector('.bt-quit');
      if (q) q.remove();
      S.quitOpen = false;
      if (!over.querySelector('.bt-card')) over.classList.remove('is-on');
    }
    function askQuit() {
      if (S.done || S.quitOpen) return;
      if (S.phase === 'result') { next(); return; }
      if (finishing()) { sfx('locked'); return; }
      S.quitOpen = true;
      var card = el('div', 'bt-card bt-quit panel pop-in', null, over);
      txt('div', 'bt-card-title h', t('b.quitAsk'), card);
      txt('div', 'bt-quit-keep', t('b.keep'), card);
      var row = el('div', 'bt-quit-row', null, card);
      var yes = el('button', 'btn bt-quit-yes', ICON.home, row); yes.type = 'button'; yes.dataset.act = 'quit-yes';
      txt('span', null, t('b.quitYes'), yes);
      var no = el('button', 'btn btn-green bt-quit-no', ICON.next, row); no.type = 'button'; no.dataset.act = 'quit-no';
      txt('span', null, t('b.quitNo'), no);
      over.classList.add('is-on');
      say(t('b.quitAsk'));
      no.addEventListener('click', function () { sfx('tap'); closeQuit(); });
      yes.addEventListener('click', function () { if (!S.quitOpen) return; sfx('tap'); S.dead = true; finish('quit'); });
    }

    /* ---- pointing hand for the first battle ---- */
    var hand = null;
    function pointAt(target) {
      clearPointer();
      var p = xy(target);
      hand = el('div', 'bt-hand', ICON.hand, R);
      hand.style.left = p.x + 'px'; hand.style.top = p.y + 'px';
    }
    function clearPointer() { if (hand) { hand.remove(); hand = null; } }

    /* ---- the end ---- */
    function cleanup() {
      clearTimeout(lineTimer);
      try { if (weather && weather.destroy) weather.destroy(); } catch (e) { /* already gone */ }
      weather = null;
      [P, W].forEach(function (s) { try { if (s.m && s.m.destroy) s.m.destroy(); } catch (e) { /* CORE may have destroyed it already */ } s.m = null; });
      if (S.ui) { try { S.ui.destroy(); } catch (e) { /* gone */ } S.ui = null; }
      S.waiter = null; S.nextWaiter = null;
    }
    function finish(result, again) {
      if (S.done) return;
      S.done = true; S.dead = true; S.phase = 'done'; S.result = result;
      cleanup();
      var out = { result: result, wildId: wildC.id, sparks: S.sparks, heart: S.heart, records: S.records.slice(), xpBy: Object.assign({}, S.xpBy), again: !!again };
      try { if (o.onDone) o.onDone(out); } catch (e) { console.error('Battle onDone', e); }
    }
    function destroy() {
      if (!S.done) { S.done = true; S.dead = true; S.phase = 'done'; }
      cleanup();
      if (cur && cur.S === S) cur = null;
    }

    /* ---- robot ---- */
    var robot = {
      state: function () {
        return {
          phase: S.phase, busy: S.busy, life: me().life, lifeMax: me().lifeMax, wildLife: S.wLife, wildLifeMax: S.wLifeMax, kraft: me().kraft, wildKraft: wildKraft,
          fighter: me().id, fighterIndex: S.fi, streak: S.streak, watch: S.watch ? { teach: S.watch.teach, say: S.watchSay, step: S.task && S.task.step } : null,
          // kept for older robots: shield and energy now mean the two life bars
          shield: S.wLife, shieldMax: S.wLifeMax, energy: me().life, energyMax: me().lifeMax, charge: S.streak,
          taskUi: S.phase === 'watch' ? 'watch' : S.phase === 'offer' ? 'offer' : S.task && S.ui && (S.phase === 'task' || S.phase === 'help' || S.phase === 'heart' || S.phase === 'fix') ? S.task.ui : null,
          taskId: S.task ? S.task.id : null, power: S.task ? S.task.power : null, mode: mode,
          sparks: S.sparks, firstTry: S.firstTry, xp: S.xp, xpBy: Object.assign({}, S.xpBy), tasks: S.tasks, heart: S.heart, result: S.result, done: S.done,
          canStrike: false, waitingNext: !!S.nextWaiter, quitOpen: S.quitOpen,
          // a guess-then-test or an arrow walk is playing (Natur og teknik): his answer is in, it is handed in after
          testing: !!(S.ui && S.ui.el && S.ui.el.classList.contains('is-testing')),
          task: S.task ? JSON.parse(JSON.stringify(S.task)) : null // read-only copy, so a test can work out where a finger should go
        };
      },
      answer: function (kind) {
        if (S.busy || S.done || S.quitOpen) return false;
        // 'ask' taps the question mark wherever one is on screen
        if (S.phase === 'offer') { (kind === 'right' ? offerYes : offerNo).click(); return true; }
        if (S.phase === 'watch') return next();
        if (!S.ui || !S.task) return false;
        if (!(S.phase === 'task' || S.phase === 'help' || S.phase === 'heart' || S.phase === 'fix')) return false;
        if (S.robotSent) return false; // one answer per open task, like one finger
        S.robotSent = true;
        if (kind === 'ask') { idk.click(); return true; }
        var sol = S.solution;
        if (kind === 'wrong' && !(S.phase === 'heart' && S.task.ui === 'breathe')) {
          var wa = wrongAnswer(S.task);
          if (wa === undefined) { idk.click(); return true; }
          S.ui.answer(wa); return true;
        }
        S.ui.answer(sol);
        return true;
      },
      strike: function () { return false; },
      next: function () { return next(); },
      quit: function () { if (S.done) return false; askQuit(); var y = over.querySelector('[data-act="quit-yes"]'); if (y) y.click(); return S.done; }
    };

    run().catch(function (e) { if (e !== DEAD) { console.error('Battle', e); if (!S.done) { S.result = S.result || 'quit'; finish(S.result); } } });
    return { S: S, destroy: destroy, robot: robot };
  }

  var idleRobot = { phase: 'none', done: true };
  G.Battle = {
    start: start,
    RULES: RULES, wildDamage: wildDamage, lifeOf: lifeOf, lifeAfter: lifeAfter,
    stop: function () { if (cur) cur.destroy(); },
    robot: {
      state: function () { return cur ? cur.robot.state() : idleRobot; },
      answer: function (k) { return cur ? cur.robot.answer(k) : false; },
      strike: function () { return cur ? cur.robot.strike() : false; },
      next: function () { return cur ? cur.robot.next() : false; },
      quit: function () { return cur ? cur.robot.quit() : false; }
    }
  };
})();
