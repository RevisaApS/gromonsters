/* Setup: a new player. Step 1 the name, step 2 the school year, step 3 how hard each topic starts, step 4 the starter, then the first battle. SPEC.md 7, screen 2; SPEC-2.md 6. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.i18n.add({
    da: { 'setup.grade': 'Hvilken klasse går du i?', 'setup.pick': 'Vælg dit Gromonster', 'setup.choose': 'Vælg {name}',
      'setup.level': 'Hvor svært skal det være?', 'setup.other': 'Vis en anden' },
    en: { 'setup.grade': 'Which grade are you in?', 'setup.pick': 'Choose your Gromonster', 'setup.choose': 'Choose {name}',
      'setup.level': 'How hard should it be?', 'setup.other': 'Show another' }
  });
  G.i18n.add({
    da: { 'setup.name': 'Hvad hedder du?', 'setup.next': 'Videre', 'setup.skip': 'Spring over', 'setup.namePh': 'Dit navn' },
    en: { 'setup.name': 'What is your name?', 'setup.next': 'Next', 'setup.skip': 'Skip', 'setup.namePh': 'Your name' }
  });
  var NAME_MAX = 12;
  var STARTERS = ['mosli', 'kulli', 'narli'];
  var hosts = [], grade = 0, levels = null, picked = null, sid = 0, name = '';
  // the topics of this game language, from the brain's one list (Engelsk only in a Danish game)
  function topics() { return G.Brain && G.Brain.topicsFor ? G.Brain.topicsFor(G.lang) : ['tal', 'ord', 'logik']; }

  function clear() { hosts.forEach(function (h) { h.destroy(); }); hosts = []; }

  // the kind icon: the painted one when CORE has it, otherwise the old line icon
  function kindIcon(el) {
    if (typeof G.elIcon === 'function') { try { return G.elIcon(el); } catch (e) { console.error(e); } }
    return G.icon(el === 'leaf' ? 'forest' : el === 'fire' ? 'volcano' : el === 'water' ? 'bay' : 'star');
  }

  // step 1: the name. Field and button sit in the upper half: the tablet keyboard covers the lower half.
  function stepName(root, body) {
    clear(); body.innerHTML = ''; body.className = 'setup-body step-name'; name = '';
    body.appendChild(G.el('div', 'setup-q h rise-in', G.t('setup.name')));
    var form = G.el('form', 'name-form rise-in'); form.setAttribute('autocomplete', 'off');
    var field = G.el('input', 'name-field');
    field.type = 'text'; field.maxLength = NAME_MAX; field.dataset.act = 'name-field';
    field.placeholder = G.t('setup.namePh'); field.setAttribute('aria-label', G.t('setup.name'));
    field.setAttribute('autocomplete', 'off'); field.setAttribute('autocapitalize', 'words');
    field.setAttribute('autocorrect', 'off'); field.spellcheck = false; field.setAttribute('enterkeyhint', 'next');
    var next = G.el('button', 'btn btn-gold btn-big name-next is-off', '<span>' + G.t('setup.next') + '</span>' + G.icon('play'));
    next.type = 'submit'; next.dataset.act = 'name-next'; next.dataset.offOk = '1';
    function clean() { return field.value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX); }
    field.addEventListener('input', function () {
      if (field.value.length > NAME_MAX) field.value = field.value.slice(0, NAME_MAX);
      next.classList.toggle('is-off', !clean());
    });
    var done = false;
    function go(n) {
      if (done) return; done = true;
      name = n; field.blur();
      G.sfx('pick');
      setTimeout(function () { if (sid === G.screenId) stepGrade(root, body); }, G.fast ? 10 : 180);
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var n = clean();
      if (!n) { field.focus(); form.classList.remove('nope'); void form.offsetWidth; form.classList.add('nope'); return; }
      go(n);
    });
    form.appendChild(field); form.appendChild(next);
    body.appendChild(form);
    var skip = G.el('button', 'btn name-skip rise-in', G.t('setup.skip'));
    skip.type = 'button'; skip.dataset.act = 'name-skip';
    G.tap(skip, function () { go(''); });
    body.appendChild(skip);
    setTimeout(function () { if (sid === G.screenId && !done) { try { field.focus({ preventScroll: true }); } catch (e) { field.focus(); } } }, 450);
    G.say(G.t('setup.name'));
  }

  function stepGrade(root, body) {
    clear(); body.innerHTML = ''; body.className = 'setup-body step-grade';
    var q = G.el('div', 'setup-q h rise-in', G.t('setup.grade')); body.appendChild(q);
    var row = G.el('div', 'grade-row');
    for (var g = 0; g <= 5; g++) (function (g) {
      var lb = G.gradeLabel(g);
      var b = G.el('button', 'grade-btn pop-in', '<span class="gb-big num">' + lb.big + '</span><span class="gb-small">' + lb.small + '</span>');
      b.style.animationDelay = (g * 0.05) + 's';
      b.dataset.act = 'grade-' + g; b.setAttribute('aria-label', lb.full);
      G.tap(b, function () { grade = g; levels = null; b.classList.add('chosen'); G.sfx('pick'); setTimeout(function () { if (sid === G.screenId) (G.fast ? stepStarter : stepLevel)(root, body); }, G.fast ? 10 : 220); }, 'none');
      row.appendChild(b);
    })(g);
    body.appendChild(row);
    G.say(G.t('setup.grade'));
  }

  // step 3: how hard. One row per topic, filled in from the class; tapping a level shows a task from it.
  // The game starts a little under the level and climbs to it within a few answers, then follows the child.
  function stepLevel(root, body) {
    clear(); body.innerHTML = ''; body.className = 'setup-body step-level';
    var TOPICS = topics(), turn = {}, lastId = null; // which kind of task of the level is on show; "Vis en anden" moves to the next kind
    levels = levels || {};
    TOPICS.forEach(function (pw) { if (levels[pw] == null) levels[pw] = grade; turn[pw] = 0; });
    body.appendChild(G.el('div', 'setup-q h rise-in', G.t('setup.level')));
    var rows = G.el('div', 'lv-rows rise-in n' + TOPICS.length), ex = G.el('div', 'lv-ex panel rise-in'), sample = null, shown = TOPICS[0], ui = null;
    try { sample = G.Brain.create(null, { grade: grade, lang: G.lang }); } catch (e) { console.error(e); }
    function example() {
      if (ui && ui.destroy) { try { ui.destroy(); } catch (e) { /* gone */ } } ui = null;
      ex.innerHTML = ''; ex.className = 'lv-ex panel pow-' + shown;
      var e = null;
      try { e = sample && sample.example(shown, levels[shown], turn[shown], lastId); } catch (er) { console.error(er); }
      if (!e || !e.task) return;
      lastId = e.task.id;
      var head = G.el('div', 'lv-ex-head');
      head.appendChild(G.el('span', 'lv-ico', G.powers[shown].icon));
      var nm = G.el('b', 'lv-ex-name'); nm.textContent = e.name || G.tx(G.powers[shown].name); head.appendChild(nm);
      if (e.kinds > 1) { var cnt = G.el('span', 'lv-ex-count num'); cnt.textContent = (e.at + 1) + ' / ' + e.kinds; head.appendChild(cnt); }
      // a listening task's word is only in what the voice says: the grown-up can hear the example too
      var hear = G.el('button', 'btn btn-round lv-hear', G.icon('speaker')); hear.type = 'button'; hear.dataset.act = 'example-say';
      hear.setAttribute('aria-label', G.t('b.again') !== 'b.again' ? G.t('b.again') : 'Hør');
      (function (task) { G.tap(hear, function () { G.say(task.say || task.prompt, { cut: true }); }); })(e.task);
      head.appendChild(hear);
      var more = G.el('button', 'btn lv-more', G.t('setup.other')); more.type = 'button'; more.dataset.act = 'level-other';
      G.tap(more, function () { turn[shown]++; example(); });
      head.appendChild(more);
      ex.appendChild(head);
      var q = G.el('div', 'lv-ex-q h'); q.textContent = e.task.prompt || ''; ex.appendChild(q);
      var box = G.el('div', 'lv-ex-task'), host = G.el('div', 'bt-task'); box.appendChild(host); ex.appendChild(box);
      try { ui = G.TaskUI.render(host, e.task, { onAnswer: function () {}, solution: null }); ui.lock(); } catch (er2) { console.error(er2); }
    }
    TOPICS.forEach(function (pw) {
      var row = G.el('div', 'lv-row pow-' + pw);
      var lab = G.el('button', 'lv-topic', '<span class="lv-ico">' + G.powers[pw].icon + '</span><b>' + G.tx(G.powers[pw].name) + '</b><small>' + G.gradeLabel(0).small + '</small>');
      lab.type = 'button'; lab.dataset.act = 'level-topic-' + pw;
      G.tap(lab, function () { shown = pw; mark(); example(); });
      row.appendChild(lab);
      var chips = G.el('div', 'lv-chips');
      for (var g = 0; g <= 5; g++) (function (g) {
        var lb = G.gradeLabel(g);
        var c = G.el('button', 'lv-chip num', lb.big + '<small>.</small>');
        c.type = 'button'; c.dataset.act = 'level-' + pw + '-' + g; c.setAttribute('aria-label', G.tx(G.powers[pw].name) + ': ' + lb.full);
        G.tap(c, function () { levels[pw] = g; shown = pw; turn[pw] = 0; G.sfx('pick'); mark(); example(); }, 'none');
        chips.appendChild(c);
      })(g);
      row.appendChild(chips);
      rows.appendChild(row);
    });
    function mark() {
      [].forEach.call(rows.children, function (row, i) {
        var pw = TOPICS[i];
        row.classList.toggle('on', pw === shown);
        [].forEach.call(row.querySelectorAll('.lv-chip'), function (c, g) { c.classList.toggle('on', g === levels[pw]); });
      });
    }
    body.appendChild(rows); body.appendChild(ex);
    var next = G.el('button', 'btn btn-gold btn-big lv-next rise-in', '<span>' + G.t('setup.next') + '</span>' + G.icon('play'));
    next.type = 'button'; next.dataset.act = 'level-next';
    G.tap(next, function () { if (ui && ui.destroy) { try { ui.destroy(); } catch (e) { /* gone */ } } stepStarter(root, body); });
    body.appendChild(next);
    mark(); example();
    G.say(G.t('setup.level'));
  }

  function stepStarter(root, body) {
    clear(); body.innerHTML = ''; body.className = 'setup-body step-starter'; picked = null;
    body.appendChild(G.el('div', 'setup-q h rise-in', G.t('setup.pick')));
    var choose = G.el('button', 'btn btn-gold btn-big choose-btn is-hidden');
    choose.dataset.act = 'choose-starter';
    var cards = [], my = G.screenId;
    // one clear choice of three: equal cards side by side, each a single big tap area
    STARTERS.forEach(function (id, i) {
      var c = G.creatures[id];
      var card = G.el('button', 'starter-card el-' + c.element + ' rise-in');
      card.style.left = (60 + i * 400) + 'px'; card.style.animationDelay = (0.08 * i) + 's';
      card.dataset.act = 'starter-' + id; card.setAttribute('aria-label', c.name);
      card.appendChild(G.el('span', 'starter-pad'));
      var host = G.el('span', 'starter-host'); card.appendChild(host);
      card.appendChild(G.el('span', 'starter-tag', '<span class="st-name">' + c.name + '</span><span class="chip el-chip">' + '<span class="el-ico-wrap">' + kindIcon(c.element) + '</span><span class="el-word">' + G.t('el.' + c.element) + '</span>' + '</span>'));
      body.appendChild(card);
      var h = G.Creature.mount(host, id, { interactive: false });
      hosts.push(h); cards.push(card);
      // each says hello in turn when the screen opens
      setTimeout(function () { if (my === G.screenId && !picked) (i === 1 ? h.happy : h.hop)(); }, (G.fast ? 0 : 700) + i * 750);
      G.tap(card, function () {
        picked = id;
        cards.forEach(function (k) { k.classList.toggle('on', k === card); k.classList.toggle('dim', k !== card); });
        h.happy(); G.sfx('pick'); G.say(c.name);
        choose.innerHTML = G.icon('check') + '<span>' + G.t('setup.choose', { name: c.name }) + '</span>';
        choose.style.left = (60 + i * 400 + 180) + 'px';
        choose.classList.remove('is-hidden');
      }, 'none');
    });
    G.tap(choose, function () {
      if (!picked) return;
      var p = G.newProfile({ grade: grade, starter: picked, levels: levels });
      if (name) p.name = name;
      STARTERS.forEach(function (s) { if (s !== picked) p.dex[s] = { stage: 'met', metDay: G.today(), caughtDay: null, grownDay: null }; });
      G.save();
      // play data (slice 6): the class and the starting class per topic; the name travels as the row's player
      G.plog('setup', { grade: grade, levels: levels || null, starter: picked, named: !!name, lang: G.lang, place: G.slot + 1 });
      G.go('battle', { wildId: 'crabbi', regionId: 'bay', mode: 'intro' });
    });
    body.appendChild(choose);
    G.say(G.t('setup.pick'));
  }

  G.screens.setup = {
    enter: function (root) {
      sid = G.screenId;
      if (G.profile) G.closeProfile();
      G.music('title');
      root.appendChild(G.el('div', 'bg bg-camp'));
      root.appendChild(G.el('div', 'setup-shade'));
      var cv = G.el('canvas', 'setup-aurora'); root.appendChild(cv);
      this.aur = G.aurora(cv, 3);
      var body = G.el('div', 'setup-body'); root.appendChild(body);
      G.homeButton(root, function () { G.go('title'); });
      // the robot players run with ?fast=1: they start at the class step, as before
      if (G.fast) { name = ''; stepGrade(root, body); }
      else stepName(root, body);
    },
    exit: function () { clear(); if (this.aur) { this.aur.destroy(); this.aur = null; } }
  };
})();
