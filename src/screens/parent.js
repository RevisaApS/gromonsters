/* Parent page: behind a gate (hold the lock in camp for 2 s, then a times-table answer).
   What the child has learned, in plain words, the settings and the test controls. SPEC.md 7, screen 6. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.i18n.add({
    da: {
      'pa.gate': 'For voksne', 'pa.gateQ': 'Skriv svaret for at åbne', 'pa.learn': 'Læring', 'pa.settings': 'Indstillinger', 'pa.test': 'Test',
      'pa.step': 'Trin {x} af {y}', 'pa.belongs': 'Passer til {grade}', 'pa.rate': 'Rigtigt i første forsøg, seneste 20', 'pa.proven': 'Trin der også lykkedes en anden dag',
      'pa.fixed': 'Fejl der senere blev rettet', 'pa.waiting': 'Fejl der skal øves igen', 'pa.none': 'Ingen svar endnu', 'pa.few': 'For få svar endnu', 'pa.moments': 'Hjerteøjeblikke',
      'pa.t.feel': 'Følelser', 'pa.t.help': 'At hjælpe', 'pa.t.breathe': 'Falde til ro', 'pa.t.grit': 'Ikke give op', 'pa.t.team': 'Samarbejde',
      'pa.today': 'Spilletid i dag', 'pa.week': 'De sidste 7 dage', 'pa.battles': 'Kampe', 'pa.sparks': 'Gnister', 'pa.min': '{n} min',
      'pa.lang': 'Sprog', 'pa.name': 'Navn', 'pa.grade': 'Klasse', 'pa.voice': 'Stemme', 'pa.music': 'Musik', 'pa.sfx': 'Lyde', 'pa.still': 'Mindre bevægelse',
      'pa.limit': 'Daglig grænse', 'pa.off': 'Fra', 'pa.on': 'Til', 'pa.extra': 'Giv 15 minutter mere i dag',
      'pa.testNote': 'Kun til afprøvning. Det ændrer spillerens fremskridt.', 'pa.day': 'Dag {n} i spillet', 'pa.nextDay': 'Spring til næste dag',
      'pa.reset': 'Nulstil denne spiller', 'pa.resetSure': 'Tryk igen for at slette alt', 'pa.switch': 'Skift spiller', 'pa.noBrain': 'Læringsdelen kunne ikke indlæses.'
    },
    en: {
      'pa.gate': 'For grown-ups', 'pa.gateQ': 'Type the answer to open', 'pa.learn': 'Learning', 'pa.settings': 'Settings', 'pa.test': 'Testing',
      'pa.step': 'Step {x} of {y}', 'pa.belongs': 'Belongs to {grade}', 'pa.rate': 'Right first time (last 20)', 'pa.proven': 'Steps that held on a later day',
      'pa.fixed': 'Misses later got right', 'pa.waiting': 'Misses coming back', 'pa.none': 'No answers yet', 'pa.few': 'Not enough play yet', 'pa.moments': 'Heart moments',
      'pa.t.feel': 'Feelings', 'pa.t.help': 'Helping', 'pa.t.breathe': 'Calming down', 'pa.t.grit': 'Not giving up', 'pa.t.team': 'Together',
      'pa.today': 'Played today', 'pa.week': 'Last 7 days', 'pa.battles': 'Battles', 'pa.sparks': 'Sparks', 'pa.min': '{n} min',
      'pa.lang': 'Language', 'pa.name': 'Name', 'pa.grade': 'Grade', 'pa.voice': 'Voice', 'pa.music': 'Music', 'pa.sfx': 'Sounds', 'pa.still': 'Less motion',
      'pa.limit': 'Daily limit', 'pa.off': 'Off', 'pa.on': 'On', 'pa.extra': 'Give 15 more minutes today',
      'pa.testNote': 'For trying things out only. It changes the player\'s data.', 'pa.day': 'Game day: {n}', 'pa.nextDay': 'Jump to next day',
      'pa.reset': 'Reset this player', 'pa.resetSure': 'Tap again to delete everything', 'pa.switch': 'Switch player', 'pa.noBrain': 'The learning part is not loaded.'
    }
  });
  G.i18n.add({
    da: { 'pa.players': 'Spillere', 'pa.del': 'Slet spiller', 'pa.delQ': 'Slet {name}? Hele spillet for denne spiller forsvinder.', 'pa.delYes': 'Ja, slet', 'pa.delNo': 'Nej',
      'pa.aiVoice': 'Den danske stemme er lavet med AI.', 'pa.playing': 'Spiller nu' },
    en: { 'pa.players': 'Players', 'pa.del': 'Delete player', 'pa.delQ': 'Delete {name}? Everything in this game will be gone.', 'pa.delYes': 'Yes, delete', 'pa.delNo': 'No',
      'pa.aiVoice': 'The Danish voice is made with AI.', 'pa.playing': 'Playing now' }
  });
  var S = null;
  var NAME_MAX = 12;
  var esc = function (s) { return G.esc ? G.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function cleanName(v) { return String(v || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX); }

  // ---------- the gate ----------
  function gate(root, onOpen) {
    var a = 6 + G.rand(4), b = 6 + G.rand(4), typed = '';
    var box = G.el('div', 'gate panel pop-in');
    box.appendChild(G.el('div', 'gate-head h', G.icon('lock') + G.t('pa.gate')));
    var q = G.el('div', 'gate-q num'); box.appendChild(q);
    box.appendChild(G.el('div', 'gate-note', G.t('pa.gateQ')));
    var pad = G.el('div', 'keypad');
    function show() { q.innerHTML = a + ' × ' + b + ' = <span class="gate-ans">' + (typed || '?') + '</span>'; }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach(function (k) {
      var key = G.el('button', 'btn key' + (k === 'ok' ? ' btn-green' : ''), k === 'del' ? G.icon('del') : k === 'ok' ? G.icon('check') : k);
      key.dataset.act = 'key-' + k;
      G.tap(key, function () {
        if (k === 'del') typed = typed.slice(0, -1);
        else if (k === 'ok') {
          if (+typed === a * b) { onOpen(); return; }
          box.classList.remove('nope'); void box.offsetWidth; box.classList.add('nope');
          a = 6 + G.rand(4); b = 6 + G.rand(4); typed = '';
        } else if (typed.length < 3) typed += k;
        show();
      });
      pad.appendChild(key);
    });
    box.appendChild(pad);
    show();
    root.appendChild(box);
    return box;
  }

  // ---------- small controls ----------
  function seg(options, value, onPick, act) {
    var w = G.el('div', 'seg');
    options.forEach(function (o) {
      var b = G.el('button', 'seg-btn' + (o.v === value ? ' on' : ''), o.html);
      if (act) b.dataset.act = act + '-' + o.v;
      G.tap(b, function () { [].forEach.call(w.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); onPick(o.v); });
      w.appendChild(b);
    });
    return w;
  }
  function row(label, ctl) {
    var r = G.el('div', 'set-row'); r.appendChild(G.el('div', 'set-label', label)); r.appendChild(ctl); return r;
  }
  function slider(v, on) {
    var s = G.el('input', 'set-range'); s.type = 'range'; s.min = 0; s.max = 100; s.value = Math.round(v * 100);
    s.addEventListener('input', function () { on(s.value / 100); });
    return s;
  }
  function onOff(v, on) { return seg([{ v: true, html: G.t('pa.on') }, { v: false, html: G.t('pa.off') }], v, on); }
  function volumes() { try { if (G.audio && G.audio.setVolume) G.audio.setVolume({ music: G.settings.music, sfx: G.settings.sfx }); } catch (e) { console.error(e); } }

  // ---------- tabs ----------
  function learnTab(body) {
    var sum = null;
    try { sum = G.brain && G.brain.summary ? G.brain.summary() : null; } catch (e) { console.error(e); }
    var cards = G.el('div', 'pa-cards');
    if (!sum) cards.appendChild(G.el('div', 'pa-empty', G.t('pa.noBrain')));
    else {
      ['tal', 'ord', 'logik'].forEach(function (pw) {
        var s = sum[pw] || {}, P = G.powers[pw];
        var c = G.el('div', 'pa-card pow-' + pw);
        c.appendChild(G.el('div', 'pa-pow', '<span class="pa-ico">' + P.icon + '</span>' + G.tx(P.name)));
        var count = s.stepCount || 1, idx = s.stepIndex | 0;
        var lad = G.el('div', 'ladder');
        for (var i = 0; i < count; i++) lad.appendChild(G.el('i', i < idx ? 'past' : i === idx ? 'now' : ''));
        c.appendChild(lad);
        c.appendChild(G.el('div', 'pa-step', G.t('pa.step', { x: idx + 1, y: count })));
        if (s.stepName) c.appendChild(G.el('div', 'pa-stepname', s.stepName));
        if (s.grade != null) c.appendChild(G.el('div', 'pa-grade chip', G.t('pa.belongs', { grade: G.gradeLabel(s.grade).full })));
        var stats = G.el('div', 'pa-stats');
        function stat(label, val, soft) { stats.appendChild(G.el('div', 'pa-stat', '<span>' + label + '</span><b class="num' + (soft ? ' soft' : '') + '">' + val + '</b>')); }
        var enough = (s.answered | 0) >= 8; // a rate on a handful of answers says nothing yet
        stat(G.t('pa.rate'), enough ? Math.round((s.firstTryRate || 0) * 100) + ' %' : G.t('pa.few'), !enough);
        stat(G.t('pa.proven'), s.provenSteps | 0);
        stat(G.t('pa.fixed'), s.comebacksFixed | 0);
        stat(G.t('pa.waiting'), s.comebacksWaiting | 0);
        c.appendChild(stats);
        cards.appendChild(c);
      });
      var h = sum.hjerte || { moments: 0, topics: {} }, P = G.powers.hjerte;
      var hc = G.el('div', 'pa-card pow-hjerte');
      hc.appendChild(G.el('div', 'pa-pow', '<span class="pa-ico">' + P.icon + '</span>' + G.tx(P.name)));
      hc.appendChild(G.el('div', 'pa-big num', String(h.moments | 0)));
      hc.appendChild(G.el('div', 'pa-step', G.t('pa.moments')));
      var ts = G.el('div', 'pa-stats pa-hstats');
      ['feel', 'help', 'breathe', 'grit', 'team'].forEach(function (k) { ts.appendChild(G.el('div', 'pa-stat', '<span>' + G.t('pa.t.' + k) + '</span><b class="num">' + ((h.topics && h.topics[k]) | 0) + '</b>')); });
      hc.appendChild(ts);
      cards.appendChild(hc);
    }
    body.appendChild(cards);
    var p = G.profile, d = G.today(), week = 0;
    for (var k = 0; k < 7; k++) week += G.minutesOn(d - k);
    var strip = G.el('div', 'pa-strip');
    [[G.t('pa.today'), G.t('pa.min', { n: G.minutesOn(d) })], [G.t('pa.week'), G.t('pa.min', { n: week })], [G.t('pa.battles'), p.stats.battles | 0], [G.t('map.team'), G.teamKraft(p)]]
      .forEach(function (x) { strip.appendChild(G.el('div', 'pa-fact', '<span>' + x[0] + '</span><b class="num">' + x[1] + '</b>')); });
    body.appendChild(strip);
  }

  function settingsTab(body, rerender) {
    var p = G.profile, cols = G.el('div', 'set-cols'), a = G.el('div', 'set-col'), b = G.el('div', 'set-col');
    a.appendChild(row(G.t('pa.lang'), seg(G.LANGS.map(function (l) { return { v: l, html: G.flag(l) + '<span>' + G.LANG_NAMES[l] + '</span>' }; }), G.lang, function (l) { G.setLang(l); rerender(); }, 'lang')));
    var name = G.el('input', 'set-text'); name.type = 'text'; name.maxLength = NAME_MAX; name.value = p.name || ''; name.placeholder = G.profileName(null, G.slot);
    name.addEventListener('change', function () { p.name = cleanName(name.value); G.save(); });
    a.appendChild(row(G.t('pa.name'), name));
    a.appendChild(row(G.t('pa.grade'), seg([0, 1, 2, 3, 4, 5].map(function (g) { return { v: g, html: G.gradeLabel(g).big }; }), p.grade, function (g) {
      p.grade = g; p.levels = null; G.save(); G.createBrain();
    }, 'grade-set')));
    a.appendChild(row(G.t('pa.limit'), seg([0, 15, 30, 45].map(function (m) { return { v: m, html: m ? G.t('pa.min', { n: m }) : G.t('pa.off') }; }), p.limitMin, function (m) { p.limitMin = m; G.save(); rerender(); }, 'limit')));
    if (p.limitMin) {
      var ex = G.el('button', 'btn set-extra', G.icon('plus') + G.t('pa.extra'));
      G.tap(ex, function () { var d = G.today(); p.extra = { day: d, min: (p.extra && p.extra.day === d ? p.extra.min : 0) + 15 }; G.save(); ex.classList.add('done'); });
      a.appendChild(ex);
    }
    var vr = row(G.t('pa.voice'), onOff(G.settings.voice, function (v) { G.settings.voice = v; G.save(); }));
    vr.appendChild(G.el('div', 'set-note', G.t('pa.aiVoice')));
    b.appendChild(vr);
    // music: on or off (the same switch as the small button on the child's screens), and how loud
    var mus = G.el('div', 'set-music'), musOn = onOff(G.settings.musicOn !== false, function (v) { G.setMusicOn(v); });
    [].forEach.call(musOn.children, function (x, i) { x.dataset.act = 'music-' + (i ? 'off' : 'on'); });
    mus.appendChild(musOn);
    mus.appendChild(slider(G.settings.music, function (v) { G.settings.music = v; volumes(); G.save(); }));
    b.appendChild(row(G.t('pa.music'), mus));
    b.appendChild(row(G.t('pa.sfx'), slider(G.settings.sfx, function (v) { G.settings.sfx = v; volumes(); G.save(); })));
    b.appendChild(row(G.t('pa.still'), onOff(G.settings.still, function (v) { G.settings.still = v; G.applyStill(); G.save(); })));
    cols.appendChild(a); cols.appendChild(b);
    body.appendChild(cols);
  }

  // the Spillere tab: every player, rename, change class, delete (with one more question)
  function playersTab(root, body, rerender) {
    var list = G.el('div', 'pl-list');
    G.data.profiles.forEach(function (p, i) {
      if (!p) return;
      var r = G.el('div', 'pl-row' + (i === G.slot ? ' open' : ''));
      r.appendChild(G.picture(G.partnerId(p), 'pl-pic'));
      var nm = G.el('div', 'pl-namebox');
      var name = G.el('input', 'set-text pl-name'); name.type = 'text'; name.maxLength = NAME_MAX; name.value = p.name || '';
      name.placeholder = G.profileName(null, i); name.dataset.act = 'rename-' + i;
      name.setAttribute('autocomplete', 'off'); name.setAttribute('autocapitalize', 'words'); name.spellcheck = false;
      name.setAttribute('aria-label', G.t('pa.name'));
      name.addEventListener('change', function () { p.name = cleanName(name.value); G.save(); });
      name.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') name.blur(); });
      nm.appendChild(name);
      if (i === G.slot) nm.appendChild(G.el('div', 'pl-now', G.t('pa.playing')));
      r.appendChild(nm);
      var cls = G.el('div', 'pl-class');
      cls.appendChild(G.el('div', 'pl-cap', G.t('pa.grade')));
      cls.appendChild(seg([0, 1, 2, 3, 4, 5].map(function (g) { return { v: g, html: G.gradeLabel(g).big }; }), p.grade | 0, function (g) {
        p.grade = g; p.levels = null; if (p.brain) delete p.brain.pg; G.save(); if (i === G.slot) G.createBrain();
      }, 'class-' + i));
      r.appendChild(cls);
      var del = G.el('button', 'btn btn-danger pl-del', G.icon('close') + '<span>' + G.t('pa.del') + '</span>');
      del.dataset.act = 'delete-player-' + i;
      G.tap(del, function () { askDelete(root, i, rerender); });
      r.appendChild(del);
      list.appendChild(r);
    });
    body.appendChild(list);
  }

  function askDelete(root, i, rerender) {
    var p = G.data.profiles[i]; if (!p) return;
    root.querySelectorAll('.pl-ask-wrap').forEach(function (n) { n.remove(); });
    var wrap = G.el('div', 'pl-ask-wrap');
    var box = G.el('div', 'pl-ask panel pop-in');
    box.appendChild(G.picture(G.partnerId(p), 'pl-ask-pic'));
    box.appendChild(G.el('div', 'pl-ask-q h', G.t('pa.delQ', { name: esc(G.profileName(p, i)) })));
    var btns = G.el('div', 'pl-ask-btns');
    var yes = G.el('button', 'btn btn-danger', G.icon('close') + '<span>' + G.t('pa.delYes') + '</span>'); yes.dataset.act = 'delete-yes';
    var no = G.el('button', 'btn', G.t('pa.delNo')); no.dataset.act = 'delete-no';
    G.tap(no, function () { wrap.remove(); });
    G.tap(yes, function () {
      var wasOpen = i === G.slot;
      G.data.profiles[i] = null;
      if (G.data.last === i || !G.data.profiles[G.data.last]) { var f = G.data.profiles.findIndex(Boolean); G.data.last = f < 0 ? 0 : f; }
      if (wasOpen) { G.profile = null; G.slot = -1; G.brain = null; }
      G.save();
      wrap.remove();
      if (wasOpen || !G.data.profiles.some(Boolean)) { G.go('title'); return; }
      rerender();
    });
    btns.appendChild(no); btns.appendChild(yes);
    box.appendChild(btns);
    wrap.appendChild(box);
    root.appendChild(wrap);
  }

  function testTab(body) {
    var p = G.profile;
    var box = G.el('div', 'test-box');
    box.appendChild(G.el('div', 'test-note', G.t('pa.testNote')));
    function dayText() { var d = new Date(2026, 0, 1 + G.today()); return G.t('pa.day', { n: d.toLocaleDateString(G.LOCALE[G.lang], { weekday: 'long', day: 'numeric', month: 'long' }) }); }
    var day = G.el('div', 'test-day num', dayText());
    box.appendChild(day);
    var next = G.el('button', 'btn', G.icon('moon') + G.t('pa.nextDay')); next.dataset.act = 'next-day';
    G.tap(next, function () { p.dayOffset = (p.dayOffset | 0) + 1; G.ensureDaily(); G.save(); day.textContent = dayText(); });
    box.appendChild(next);
    var reset = G.el('button', 'btn btn-danger', G.icon('close') + '<span>' + G.t('pa.reset') + '</span>'); reset.dataset.act = 'reset-player';
    var armed = false;
    G.tap(reset, function () {
      if (!armed) { armed = true; reset.classList.add('armed'); reset.querySelector('span').textContent = G.t('pa.resetSure'); return; }
      G.data.profiles[G.slot] = null; G.profile = null; G.slot = -1; G.brain = null;
      var f = G.data.profiles.findIndex(Boolean); if (f >= 0) G.data.last = f;
      G.save(); G.go('title');
    });
    box.appendChild(reset);
    var sw = G.el('button', 'btn', G.icon('paw') + G.t('pa.switch')); sw.dataset.act = 'switch-player';
    G.tap(sw, function () { G.go('title'); });
    box.appendChild(sw);
    body.appendChild(box);
  }

  function page(root, tab) {
    root.querySelectorAll('.pa-page').forEach(function (n) { n.remove(); });
    var pg = G.el('div', 'pa-page'); root.appendChild(pg);
    var head = G.el('div', 'pa-head');
    // from the title (no player open) only the player list makes sense
    var manage = !G.profile;
    if (manage) tab = 'players';
    if (manage) head.appendChild(G.el('div', 'pa-who h', G.t('pa.players')));
    else head.appendChild(G.el('div', 'pa-who h', esc(G.profileName(G.profile, G.slot)) + '<small>' + G.gradeLabel(G.profile.grade).full + '</small>'));
    var tabs = G.el('div', 'pa-tabs');
    (manage ? [] : [['learn', 'pa.learn'], ['settings', 'pa.settings'], ['players', 'pa.players'], ['test', 'pa.test']]).forEach(function (t) {
      var b = G.el('button', 'pa-tab' + (t[0] === tab ? ' on' : ''), G.t(t[1])); b.dataset.act = 'tab-' + t[0];
      G.tap(b, function () { page(root, t[0]); });
      tabs.appendChild(b);
    });
    if (!manage) head.appendChild(tabs);
    pg.appendChild(head);
    var body = G.el('div', 'pa-body'); pg.appendChild(body);
    if (tab === 'learn') learnTab(body);
    else if (tab === 'settings') settingsTab(body, function () { page(root, 'settings'); });
    else if (tab === 'players') playersTab(root, body, function () { page(root, 'players'); });
    else testTab(body);
  }

  G.screens.parent = {
    enter: function (root, params) {
      // with no open player only the title's "Ret spillere" may come here
      var manage = !G.profile;
      if (manage && !(params && params.manage)) { G.go('title'); return; }
      S = { root: root };
      G.music(null);
      root.appendChild(G.el('div', 'bg pa-bg'));
      var g = gate(root, function () { g.remove(); page(root, manage ? 'players' : 'learn'); });
      G.homeButton(root, function () { G.go(G.profile ? 'camp' : 'title'); });
    },
    exit: function () { S = null; }
  };
})();
