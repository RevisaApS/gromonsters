/* Camp: home. The team of three on the leaf pads (the middle one fights), the Nordlys panel and what it means,
   the Gromonster card and the picker, the campfire, today's friend, and the celebrations after a battle.
   SPEC.md 7 screen 3, SPEC-2.md sections 4 and 5. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.i18n.add({
    da: {
      'camp.map': 'Kortet', 'camp.today': 'I dag', 'camp.full': 'Hele nordlyset lyser!',
      'camp.done': 'Du er færdig for i dag. Flot klaret!', 'camp.train': 'Du kan stadig træne på kortet.',
      'camp.limit': 'Nu er det tid til en pause. Vi ses i morgen!', 'camp.band': 'Et nyt lys er tændt på himlen!', 'camp.unlocked': '{place} er åbnet på kortet!',
      'camp.evolved': '{a} blev til {b}!', 'camp.friend': '{name} bor i lejren nu!', 'camp.joined': '{name} er med på dit hold nu!',
      'camp.go': 'Tryk på kortet og find et Gromonster.', 'camp.newPlace': 'Nyt sted', 'camp.hold': 'Hold knappen inde',
      'camp.level': 'Nordlys {n} af 7', 'camp.sparksOf': '{a} af {b} gnister', 'camp.opens': 'Åbner {place}', 'camp.adults': 'Voksne', 'camp.player': 'Skift spiller',
      'au.head': 'Nordlyset', 'au.l1': 'Rigtige svar giver gnister.', 'au.l2': 'Gnister tænder nordlyset.', 'au.l3': 'Hvert nyt lys åbner et nyt sted på øen.',
      'au.need': 'Du mangler {n} gnister', 'au.sparks': '{n} gnister',
      'team.head': 'Dit hold', 'team.fighter': 'Kæmper', 'level': 'Level {n}', 'team.catch': 'Fang en ven på kortet.', 'team.ready': 'Klar til kamp!', 'team.add': 'Tom plads',
      'card.bar': '{a} af {b} styrke til Level {n}', 'card.rule': 'Bliver stærkere, hver gang du svarer rigtigt i første forsøg.',
      'card.n.energy': 'Level {n}: mere energi i kamp', 'card.n.more': 'Level {n}: endnu mere energi', 'card.n.evolve': 'Level {n}: bliver til {name}',
      'card.n.top': 'Level {n}: fuld styrke', 'card.max': 'Fuld styrke!', 'card.fight': 'Lad {name} kæmpe', 'card.swap': 'Skift ud',
      'pick.head': 'Vælg et Gromonster', 'pick.on': 'På holdet', 'pick.keep': 'Kæmperen skal blive på holdet.',
      'cel.strength': '+{n} styrke', 'cel.stronger': 'Dit hold er blevet stærkere!', 'cel.level': 'Level {n}!'
    },
    en: {
      'camp.map': 'Map', 'camp.today': 'Today', 'camp.full': 'The whole aurora is shining!',
      'camp.done': 'Done for today. Well done!', 'camp.train': 'You can still train on the map.',
      'camp.limit': 'Time for a break. See you tomorrow!', 'camp.band': 'A new light is shining in the sky!', 'camp.unlocked': '{place} is open on the map!',
      'camp.evolved': '{a} became {b}!', 'camp.friend': '{name} lives at camp now!', 'camp.joined': '{name} is on your team now!',
      'camp.go': 'Tap the map to find a Gromonster.', 'camp.newPlace': 'New place', 'camp.hold': 'Keep holding the button',
      'camp.level': 'Aurora {n} of 7', 'camp.sparksOf': '{a} of {b} sparks', 'camp.opens': 'Opens {place}', 'camp.adults': 'Grown-ups', 'camp.player': 'Switch player',
      'au.head': 'The aurora', 'au.l1': 'Right answers give sparks.', 'au.l2': 'Sparks light up the aurora.', 'au.l3': 'Each new light opens a new place on the island.',
      'au.need': '{n} sparks to go', 'au.sparks': '{n} sparks',
      'team.head': 'Your team', 'team.fighter': 'Fighter', 'level': 'Level {n}', 'team.catch': 'Catch a friend on the map.', 'team.ready': 'Ready to fight!', 'team.add': 'Empty place',
      'card.bar': '{a} of {b} strength to Level {n}', 'card.rule': 'Gets stronger every time you answer right on the first try.',
      'card.n.energy': 'Level {n}: more energy in battle', 'card.n.more': 'Level {n}: even more energy', 'card.n.evolve': 'Level {n}: becomes {name}',
      'card.n.top': 'Level {n}: full strength', 'card.max': 'Full strength!', 'card.fight': 'Let {name} fight', 'card.swap': 'Swap',
      'pick.head': 'Pick a Gromonster', 'pick.on': 'On the team', 'pick.keep': 'The fighter has to stay on the team.',
      'cel.strength': '+{n} strength', 'cel.stronger': 'Your team got stronger!', 'cel.level': 'Level {n}!'
    }
  });

  G.i18n.add({
    da: { 'fr.head': 'Dagens ven', 'fr.say': 'Vælg dagens ven.', 'fr.pick': 'Vælg', 'card.grows': 'Ved {n} vokser {name}', 'card.becomes': 'Ved {n} bliver {name} til {next}' },
    en: { 'fr.head': "Today's friend", 'fr.say': "Pick today's friend.", 'fr.pick': 'Pick', 'card.grows': 'At {n} {name} grows', 'card.becomes': 'At {n} {name} becomes {next}' }
  });

  // leaf pads in stage pixels, measured on camp.webp: x = centre, feet = where the feet stand, size = host square
  var PADS = [
    { x: 646, feet: 646, size: 430 },   // middle: the fighter (team[0])
    { x: 244, feet: 468, size: 320 },   // left (team[1])
    { x: 1046, feet: 490, size: 320 }   // right (team[2])
  ];
  G.CAMP_PADS = PADS;
  var FEET = 0.8; // share of the host where the feet stand

  var S = null; // this visit's state
  function alive(root) { return !!S && S.root === root; }
  // few bands need a strong boost to read over the painted trees; many bands glow on their own
  function tone(L) { if (S && S.cv) S.cv.style.setProperty('--aur-boost', String([2.6, 2.6, 2.4, 2.1, 1.8, 1.55, 1.35, 1.15][L] || 2)); }
  // the sky has one more light for every region that is open
  function skyLevel(opened) { return Math.max(0, Math.min(7, (opened | 0) - 1)); }

  // ---------- the team's power: what opens the next region ----------
  function drawTeam(k) {
    var nr = G.nextRegion(), need = nr ? G.regions[nr].need : 0;
    S.tkNum.textContent = nr ? k + ' / ' + need : String(k);
    S.tkFill.style.width = (nr ? Math.min(100, k / need * 100) : 100).toFixed(1) + '%';
  }
  function teamPanel(root, k) {
    var b = G.el('button', 'team-bar camp-team panel');
    b.dataset.act = 'team-power';
    b.appendChild(G.el('span', 'tb-ico', G.icon('bolt')));
    var mid = G.el('div', 'tb-mid');
    var top = G.el('div', 'tb-top', '<span class="tb-label">' + G.t('map.team') + '</span>');
    S.tkNum = G.el('b', 'num'); top.appendChild(S.tkNum); mid.appendChild(top);
    var tr = G.el('div', 'tb-track'); S.tkFill = G.el('i'); tr.appendChild(S.tkFill); mid.appendChild(tr);
    b.appendChild(mid);
    // one tap shows where the next region is
    G.tap(b, function () { if (!S.root.classList.contains('celebrating') && !S.overlay) G.go('map', { highlight: G.nextRegion() || undefined }); }, 'open');
    root.appendChild(b);
    S.teamBox = b;
    drawTeam(k);
  }
  function closeOverlay() { if (S && S.overlay) { var o = S.overlay; S.overlay = null; o.close(); } }

  // ---------- the player chip and the grown-ups' pill ----------
  function playerChip(root, picId) {
    var b = G.el('button', 'player-chip');
    b.dataset.act = 'switch-player'; b.setAttribute('aria-label', G.t('camp.player'));
    var face = G.el('span', 'pc-face'); face.appendChild(G.picture(picId || G.partnerId()));
    b.appendChild(face);
    var nm = G.el('span', 'pc-name'); nm.textContent = G.profileName(G.profile, G.slot); b.appendChild(nm);
    G.tap(b, function () { G.save(); G.go('title'); });
    root.appendChild(b);
    S.chip = b;
  }
  function refreshChip() {
    if (!S || !S.chip) return;
    var face = S.chip.querySelector('.pc-face'); face.innerHTML = ''; face.appendChild(G.picture(G.partnerId()));
  }
  // hold it for 2 seconds; a short tap says how
  function adultsButton(root) {
    var b = G.el('button', 'adults-btn', '<span class="ab-fill"></span>' + G.icon('lock') + '<span class="ab-word">' + G.t('camp.adults') + '</span>');
    b.dataset.act = 'parent'; b.dataset.sfx = 'none';
    var tip = G.el('div', 'lock-tip', G.t('camp.hold'));
    root.appendChild(tip);
    var timer = 0;
    function cancel() { clearTimeout(timer); timer = 0; b.classList.remove('holding'); }
    b.addEventListener('pointerdown', function (ev) {
      ev.preventDefault(); b.classList.add('holding'); G.sfx('tap');
      timer = setTimeout(function () { cancel(); G.sfx('open'); G.go('parent'); }, G.fast ? 100 : 2000);
    });
    b.addEventListener('pointerup', function () {
      if (timer) { tip.classList.add('show'); clearTimeout(tip._t); tip._t = setTimeout(function () { tip.classList.remove('show'); }, 2200); G.say(G.t('camp.hold')); }
      cancel();
    });
    ['pointerleave', 'pointercancel'].forEach(function (e) { b.addEventListener(e, cancel); });
    root.appendChild(b);
    return cancel;
  }

  // ---------- the team on the pads ----------
  function setPlate(i, xp) {
    var pd = S.pads[i]; if (!pd || !pd.id) return;
    var k = G.KRAFT0 + G.KRAFT_STEP * Math.max(0, xp | 0);
    pd.lvl.innerHTML = G.icon('bolt') + '<b>' + k + '</b>';
    pd.slot.classList.toggle('big', k >= G.GROW_KRAFT);
    pd.plate.classList.toggle('grown', k >= G.GROW_KRAFT);
  }
  // o: {xp, pic} to show a state from before a celebration
  function mountPad(i, id, o) {
    o = o || {};
    var pad = PADS[i], old = S.pads[i];
    if (old) { if (old.h) old.h.destroy(); old.slot.remove(); }
    S.pads[i] = null;
    var slot = G.el('div', 'pad-slot' + (i === 0 ? ' main' : ''));
    slot.style.cssText = 'left:' + (pad.x - pad.size / 2) + 'px;top:' + (pad.feet - pad.size * FEET) + 'px;width:' + pad.size + 'px;height:' + pad.size + 'px';
    if (!id) {
      slot.classList.add('empty');
      var add = G.el('button', 'pad-add', G.icon('plus'));
      add.dataset.act = 'team-add-' + i; add.setAttribute('aria-label', G.t('team.add'));
      G.tap(add, function () { emptyTap(i, add); }, 'open');
      slot.appendChild(add);
      S.padLayer.appendChild(slot);
      S.pads[i] = { id: null, slot: slot, add: add };
      return null;
    }
    var host = G.el('div', 'pad-host'); slot.appendChild(host);
    var c = G.creatures[o.pic || G.formId(G.profile, id)] || G.creatures[id];
    var plate = G.el('div', 'pad-plate');
    if (i === 0) plate.appendChild(G.el('span', 'pp-fighter', G.icon('star') + G.t('team.fighter')));
    var row = G.el('div', 'pp-row');
    row.appendChild(G.el('span', 'pp-name', c.name));
    var lvl = G.el('span', 'pp-lvl kraft-pill num'); row.appendChild(lvl);
    plate.appendChild(row);
    slot.appendChild(plate);
    slot.dataset.act = 'team-' + i; slot.setAttribute('role', 'button');
    S.padLayer.appendChild(slot);
    var h = G.Creature.mount(host, c.id, { interactive: false });
    S.pads[i] = { h: h, slot: slot, id: id, plate: plate, lvl: lvl };
    setPlate(i, o.xp != null ? o.xp : G.xpOf(id));
    G.tap(slot, function () {
      if (S.root.classList.contains('celebrating') || S.overlay) return;
      h.hop(); G.sfx('pick');
      var my = S.root;
      G.wait(420).then(function () { if (alive(my) && !S.overlay) openTeamCard(i); });
    }, 'none');
    return h;
  }
  function mountTeam() { G.profile.team.forEach(function (id, i) { mountPad(i, id); }); refreshChip(); }
  function candidates() { return G.friendIds().filter(function (id) { return !G.onTeam(id); }); }
  function emptyTap(i, el) {
    if (S.root.classList.contains('celebrating') || S.overlay) return;
    if (candidates().length) { openPicker(i); return; }
    var old = S.root.querySelector('.pad-say'); if (old) old.remove();
    var b = G.el('div', 'pad-say pop-in', G.icon('map') + G.t('team.catch'));
    el.parentNode.appendChild(b); G.say(G.t('team.catch'));
    el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
    setTimeout(function () { b.remove(); }, 2600);
  }

  // ---------- the Gromonster card (camp and Gromodex) ----------
  // the next form mark, as power: grown, then the next form (only some have one)
  function nextMark(baseId) {
    var c = G.creatures[baseId] || {}, k = G.kraftOf(baseId), name = c.name;
    if (k < G.GROW_KRAFT) return { at: G.GROW_KRAFT, from: G.KRAFT0, text: G.t('card.grows', { n: G.GROW_KRAFT, name: name }) };
    if (c.evolvesTo && k < G.EVOLVE_KRAFT) return { at: G.EVOLVE_KRAFT, from: G.GROW_KRAFT, text: G.t('card.becomes', { n: G.EVOLVE_KRAFT, name: name, next: G.creatures[c.evolvesTo].name }) };
    return null;
  }
  /* G.GromCard.open(root, baseId, opts) -> {close()}
     opts: {buttons: [{act, label, cls, fn}], top: html above the chips, lines: [html], met: true (seen only), onClose} */
  G.GromCard = {
    open: function (root, baseId, opts) {
      opts = opts || {};
      var p = G.profile, met = !!opts.met, picId = met ? baseId : G.formId(p, baseId), c = G.creatures[picId] || G.creatures[baseId];
      var kr = G.kraftOf(baseId);
      var veil = G.el('div', 'ov-veil'); root.appendChild(veil);
      var card = G.el('div', 'gcard panel pop-in' + (!met && kr >= G.GROW_KRAFT ? ' grown' : '') + (met ? ' met' : ''));
      var host = G.el('div', 'gc-host'); card.appendChild(host);
      var info = G.el('div', 'gc-info');
      info.appendChild(G.el('div', 'gc-name title', c.name));
      var chips = G.el('div', 'gc-chips');
      if (opts.top) chips.insertAdjacentHTML('beforeend', opts.top);
      chips.appendChild(G.el('span', 'chip gc-kind el-' + c.element, G.elIcon(c.element) + G.t('el.' + c.element)));
      if (!met) chips.insertAdjacentHTML('beforeend', G.kraftPill(kr, 'gc-lvl'));
      (opts.chips || []).forEach(function (h) { chips.insertAdjacentHTML('beforeend', h); });
      info.appendChild(chips);
      var spoken = [c.name + '.'];
      var mark = met ? null : nextMark(baseId);
      if (mark) {
        var xb = G.el('div', 'gc-xp');
        var bar = G.el('div', 'gc-bar'), f = G.el('div', 'gc-fill'); f.style.width = Math.min(100, (kr - mark.from) / (mark.at - mark.from) * 100).toFixed(1) + '%';
        bar.appendChild(f); xb.appendChild(bar); info.appendChild(xb);
        info.appendChild(G.el('div', 'gc-line next', G.icon('star') + '<span>' + mark.text + '</span>'));
      }
      (opts.lines || []).forEach(function (l) { info.appendChild(G.el('div', 'gc-line', l)); });
      if (opts.buttons && opts.buttons.length) {
        var bt = G.el('div', 'gc-btns');
        opts.buttons.forEach(function (b) {
          var e = G.el('button', 'btn ' + (b.cls || ''), b.label); e.dataset.act = b.act;
          G.tap(e, b.fn); bt.appendChild(e);
        });
        info.appendChild(bt);
      }
      card.appendChild(info);
      var x = G.el('button', 'btn btn-round ov-close', G.icon('close')); x.dataset.act = opts.closeAct || 'card-close';
      card.appendChild(x);
      root.appendChild(card);
      var h = G.Creature.mount(host, picId, { interactive: true });
      if (met) host.classList.add('greyed');
      var done = false;
      var ctl = {
        el: card, h: h,
        close: function () { if (done) return; done = true; h.destroy(); veil.remove(); card.remove(); if (opts.onClose) opts.onClose(); }
      };
      G.tap(x, ctl.close); G.tap(veil, ctl.close, 'none');
      G.say(spoken.join(' '));
      return ctl;
    }
  };

  function openTeamCard(i) {
    closeOverlay();
    var p = G.profile, id = p.team[i]; if (!id) return;
    var name = G.creatures[G.formId(p, id)].name, btns = [];
    if (i !== 0) btns.push({ act: 'make-fighter', cls: 'btn-gold', label: G.icon('star') + G.t('card.fight', { name: name }), fn: function () { closeOverlay(); setTeam(swapped(0, i), [0, i], 0); } });
    btns.push({ act: 'swap', cls: i === 0 ? 'btn-gold' : '', label: G.t('card.swap'), fn: function () { closeOverlay(); openPicker(i); } });
    var top = i === 0 ? '<span class="chip gc-fighter">' + G.icon('star') + G.t('team.fighter') + '</span>' : '';
    var card = G.GromCard.open(S.root, id, { buttons: btns, top: top, onClose: function () { if (S && S.overlay === card) S.overlay = null; } });
    S.overlay = card;
  }
  function swapped(a, b) { var t = G.profile.team.slice(), x = t[a]; t[a] = t[b]; t[b] = x; return t; }
  // save the new team, then show it: the places that changed get their creature again, and the one in place `hop` says hello
  function setTeam(t, changed, hop) {
    var p = G.profile;
    p.team = t;
    var opened = G.openRegions(p); // a stronger friend on the team can be what opens the next region
    G.save();
    changed.forEach(function (k) { mountPad(k, t[k]); });
    refreshChip();
    drawTeam(G.teamKraft());
    if (opened.length) {
      var my = G.screenId, on = function () { return my === G.screenId && !!S; };
      S.root.classList.add('celebrating');
      openedRegions(opened, on).then(function () { if (!on()) return; S.root.classList.remove('celebrating'); newPlaceButton(opened); });
      return;
    }
    var pd = S.pads[hop];
    if (pd && pd.h) {
      var nm = G.creatures[G.formId(p, pd.id)].name;
      setTimeout(function () { if (pd.h) pd.h.happy(); }, 350);
      G.sfx('win');
      G.say(hop === 0 ? nm + '. ' + G.t('team.ready') : nm + '.');
    }
  }

  // ---------- the picker: every friend, plain pictures ----------
  function openPicker(place) {
    closeOverlay();
    var p = G.profile;
    var veil = G.el('div', 'ov-veil'), box = G.el('div', 'picker panel pop-in');
    box.appendChild(G.el('div', 'pk-head title', G.t('pick.head')));
    var grid = G.el('div', 'pk-grid');
    G.friendIds().forEach(function (id) {
      var on = p.team.indexOf(id), c = G.creatures[G.formId(p, id)];
      var cell = G.el('button', 'pk-cell' + (on >= 0 ? ' on' : '') + (on === place ? ' here' : ''));
      cell.dataset.act = 'pick-' + id;
      cell.appendChild(G.picture(c.id));
      cell.appendChild(G.el('span', 'pk-name', c.name));
      cell.appendChild(G.el('span', 'pk-lvl num', G.elIcon(c.element) + G.kraftPill(G.kraftOf(id))));
      if (on >= 0) cell.appendChild(G.el('span', 'pk-on', (on === 0 ? G.icon('star') : G.icon('check')) + G.t('pick.on')));
      G.tap(cell, function () {
        var t = p.team.slice(), j = t.indexOf(id);
        if (j === place) { closeOverlay(); return; }
        var old = t[place]; t[place] = id; if (j >= 0) t[j] = old;
        if (!t[0]) { cell.classList.remove('wobble'); void cell.offsetWidth; cell.classList.add('wobble'); G.sfx('locked'); G.say(G.t('pick.keep')); return; }
        closeOverlay();
        setTeam(t, j >= 0 ? [place, j] : [place], place);
      }, 'pick');
      grid.appendChild(cell);
    });
    box.appendChild(grid);
    var x = G.el('button', 'btn btn-round ov-close', G.icon('close')); x.dataset.act = 'picker-close';
    box.appendChild(x);
    S.root.appendChild(veil); S.root.appendChild(box);
    S.overlay = { close: function () { veil.remove(); box.remove(); } };
    G.tap(x, closeOverlay); G.tap(veil, closeOverlay, 'none');
    G.say(G.t('pick.head') + '.');
  }

  // ---------- today's friend ----------
  // one round slot: empty, glowing when he has beaten someone he can pick, or today's friend with a tick
  function todaySlot() {
    var box = S.sight, f = G.friendToday(), can = G.friendChoices().length > 0;
    box.innerHTML = '';
    box.className = 'today-slot' + (f ? ' done' : can ? ' ready' : '');
    if (f) { box.appendChild(G.picture(G.formId(G.profile, f))); box.appendChild(G.el('span', 'ts-tick', G.icon('check'))); }
    else box.appendChild(G.el('span', 'ts-ico', G.icon(can ? 'paw' : 'plus')));
  }
  function todayTap() {
    if (S.root.classList.contains('celebrating') || S.overlay) return;
    var f = G.friendToday();
    if (f) { G.say(G.creatures[G.formId(G.profile, f)].name + '.'); return; }
    if (G.friendChoices().length) { openFriendPick(); return; }
    S.sight.classList.remove('wobble'); void S.sight.offsetWidth; S.sight.classList.add('wobble');
    G.say(G.t('team.catch'));
  }
  // the pick: those he beat today, side by side; closing it means "not now"
  function openFriendPick() {
    closeOverlay();
    // at most three, the ones he beat most recently, so the cards always fit the screen (storyboard part 3)
    var ids = G.friendChoices().slice(-3); if (!ids.length) return;
    var veil = G.el('div', 'ov-veil'), box = G.el('div', 'fr-pick panel pop-in');
    box.appendChild(G.el('div', 'fr-head title', G.t('fr.head')));
    var row = G.el('div', 'fr-row');
    ids.forEach(function (id) {
      var c = G.creatures[id], card = G.el('div', 'fr-card' + (c.power ? ' pow-' + c.power : ''));
      var host = G.el('div', 'fr-host'); card.appendChild(host);
      card.appendChild(G.el('div', 'fr-name h', c.name));
      if (c.power) card.appendChild(G.el('span', 'fr-pow', G.powers[c.power].icon));
      var b = G.el('button', 'btn btn-gold fr-btn', G.icon('paw') + '<span>' + G.t('fr.pick') + '</span>');
      b.dataset.act = 'befriend-' + id;
      G.tap(b, function () { closeOverlay(); befriend(id); }, 'pick');
      card.appendChild(b);
      row.appendChild(card);
      card._h = G.Creature.mount(host, id, { interactive: true });
    });
    box.appendChild(row);
    var x = G.el('button', 'btn btn-round ov-close', G.icon('close')); x.dataset.act = 'befriend-close';
    box.appendChild(x);
    S.root.appendChild(veil); S.root.appendChild(box);
    S.overlay = { close: function () { [].forEach.call(row.children, function (c) { if (c._h) c._h.destroy(); }); veil.remove(); box.remove(); if (alive(S && S.root)) refreshState(); } };
    G.tap(x, closeOverlay); G.tap(veil, closeOverlay, 'none');
    G.say(G.t('fr.say'));
  }
  async function befriend(id) {
    var r = G.pickFriend(id); if (!r || !S) return;
    var my = G.screenId;
    function on() { return my === G.screenId && !!S; }
    S.root.classList.add('celebrating');
    if (r.joined >= 0) mountPad(r.joined, id);
    todaySlot();
    var fi = padOf(id), fname = G.creatures[id].name;
    if (fi >= 0 && S.pads[fi].h) { S.pads[fi].h.happy(); S.pads[fi].slot.classList.add('joined'); }
    G.sfx('win'); G.fxCall('confetti', 1800);
    drawTeam(r.teamTo); bump(S.teamBox);
    var msg = fi >= 0 ? G.t('camp.joined', { name: fname }) : G.t('camp.friend', { name: fname });
    var fl = showLine('<span class="cel-big">' + msg + '</span>');
    G.say(msg);
    await G.wait(2200); fl.remove(); if (!on()) return;
    await openedRegions(r.opened, on); if (!on()) return;
    S.root.classList.remove('celebrating');
    newPlaceButton(r.opened);
    refreshState();
  }
  function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  function refreshState() {
    var limit = G.limitReached(), can = G.friendChoices().length > 0;
    S.mapBtn.classList.toggle('pulse', !limit && !can);
    S.mapBtn.classList.toggle('is-off', limit);
    todaySlot();
    S.banner.innerHTML = '';
    S.banner.className = 'camp-banner';
    if (limit) {
      S.banner.innerHTML = G.icon('moon') + '<span>' + G.t('camp.limit') + '</span>';
      S.banner.classList.add('show', 'limit');
      if (S.pads[0] && S.pads[0].h) S.pads[0].h.sleep();
    }
    return { limit: limit, canPick: can };
  }

  // ---------- celebrations ----------
  function showLine(html, cls) {
    var l = G.el('div', 'cel-line pop-in ' + (cls || ''), html);
    S.root.appendChild(l);
    return l;
  }
  function padOf(id) { for (var i = 0; i < 3; i++) if (S.pads[i] && S.pads[i].id === id) return i; return -1; }
  // a region that just opened: one more light in the sky, and its name
  async function openedRegions(list, on) {
    for (var k = 0; k < (list || []).length; k++) {
      var rid = list[k], L = skyLevel(G.profile.opened.indexOf(rid) + 1);
      if (S.aur) S.aur.setLevel(L, true); tone(L);
      S.skyFlash.style.setProperty('--band', 'var(--aur-' + Math.max(1, L) + ')');
      S.skyFlash.classList.remove('go'); void S.skyFlash.offsetWidth; S.skyFlash.classList.add('go');
      G.sfx('aurora');
      var msg = G.t('camp.unlocked', { place: G.tx(G.regions[rid].name) });
      var line = showLine('<span class="cel-big">' + G.icon(rid) + msg + '</span>', 'aurora');
      G.say(msg);
      drawTeam(G.teamKraft());
      await G.wait(2600); line.remove(); if (!on()) return;
    }
  }
  // one tap goes straight to a place that just opened
  function newPlaceButton(list) {
    if (!list || !list.length || !S) return;
    var rid = list[list.length - 1], old = S.root.querySelector('.new-place'); if (old) old.remove();
    var np = G.el('button', 'new-place pop-in', G.icon(rid, 'np-ico') + '<span><small>' + G.t('camp.newPlace') + '</small>' + G.tx(G.regions[rid].name) + '</span>' + G.icon('map'));
    np.dataset.act = 'go-new-place';
    G.tap(np, function () { G.go('map', { highlight: rid }); });
    S.root.appendChild(np);
  }
  async function celebrate(c) {
    var my = G.screenId;
    function on() { return my === G.screenId && !!S; }
    S.root.classList.add('celebrating');
    await G.wait(500); if (!on()) return;

    // 1. "+15" over each one that fought, and its number counts up
    var gains = (c.team || []).filter(function (g) { return g.to > g.from && padOf(g.id) >= 0; });
    if (gains.length) {
      await Promise.all(gains.map(function (g, k) {
        return G.wait(k * 160).then(function () {
          if (!on()) return;
          var pi = padOf(g.id), pd = S.pads[pi], dst = G.stageXY(pd.plate);
          var chip = G.el('div', 'xp-fly num', G.icon('bolt') + '+' + (g.kraftTo - g.kraftFrom));
          chip.style.left = dst.x + 'px'; chip.style.top = (dst.y - 20) + 'px';
          S.root.appendChild(chip);
          void chip.offsetWidth;
          chip.classList.add('go'); chip.style.top = (dst.y - 70) + 'px';
          G.sfx('spark');
          return G.wait(650).then(function () {
            if (!on()) return;
            chip.classList.add('land');
            setPlate(pi, g.to); bump(pd.plate);
            return G.wait(900).then(function () { chip.remove(); });
          });
        });
      }));
      if (!on()) return;
      drawTeam(c.teamTo); bump(S.teamBox);
      await G.wait(300); if (!on()) return;
    } else drawTeam(c.teamTo);

    // 2. a power mark reached: it grows (no words, the picture says it)
    var ups = gains.filter(function (g) { return g.levelFrom < 3 && g.levelTo >= 3 && (c.evolvedIds || []).indexOf(g.id) < 0; });
    for (var u = 0; u < ups.length; u++) {
      var pi = padOf(ups[u].id), pd = S.pads[pi]; if (pi < 0) continue;
      if (pd.h) pd.h.grow(); G.sfx('grow');
      await G.wait(1600); if (!on()) return;
    }

    // 3. the next form
    var evo = (c.evolvedIds || []);
    for (var v = 0; v < evo.length; v++) {
      var base = G.creatures[evo[v]], next = G.creatures[base.evolvesTo];
      if (!next) continue;
      var ev = G.el('div', 'evolve');
      var stagePic = G.el('div', 'evo-pic'); stagePic.appendChild(G.picture(base.id, 'evo-img'));
      ev.appendChild(stagePic);
      S.root.appendChild(ev);
      var at = padOf(base.id);
      if (at >= 0 && S.pads[at].h) { S.pads[at].h.destroy(); S.pads[at].h = null; }
      G.music(null);
      await G.wait(400); if (!on()) return;
      stagePic.classList.add('glow');
      await G.wait(1800); if (!on()) return;
      stagePic.innerHTML = '';
      var evoHost = G.el('div', 'evo-host'); stagePic.appendChild(evoHost);
      stagePic.classList.remove('glow'); stagePic.classList.add('reveal');
      var eh = G.Creature.mount(evoHost, next.id, { interactive: false });
      G.sfx('evolve'); G.fxCall('flash', '#ffffff', 450); G.fxCall('confetti', 2500);
      ev.appendChild(G.el('div', 'evo-name pop-in', G.t('camp.evolved', { a: base.name, b: next.name })));
      G.say(G.t('camp.evolved', { a: base.name, b: next.name }));
      await G.wait(900); if (!on()) return;
      eh.happy();
      await G.wait(2600); if (!on()) return;
      eh.destroy(); ev.classList.add('out'); await G.wait(350); ev.remove(); if (!on()) return;
      if (at >= 0) mountPad(at, base.id);
      refreshChip();
      G.music('camp');
    }

    // 4. the first friend (the first battle): on the team
    if (c.newFriend) {
      var fi = padOf(c.newFriend), fname = G.creatures[c.newFriend].name;
      if (fi >= 0 && S.pads[fi].h) { S.pads[fi].h.hop(); S.pads[fi].slot.classList.add('joined'); }
      G.sfx('win');
      var msg = fi >= 0 ? G.t('camp.joined', { name: fname }) : G.t('camp.friend', { name: fname });
      var fl = showLine('<span class="cel-big">' + msg + '</span>');
      G.say(msg);
      todaySlot();
      await G.wait(2200); fl.remove(); if (!on()) return;
    }

    // 5. the team's power opened a region
    await openedRegions(c.opened, on); if (!on()) return;
    S.root.classList.remove('celebrating');
    newPlaceButton(c.opened);
    // 6. he beat a wild one and has no friend today yet: the pick comes up by itself
    if (c.canPick && G.friendChoices().length) openFriendPick();
  }

  G.screens.camp = {
    enter: function (root, params) {
      if (!G.profile) { G.go('title'); return; }
      if (!G.profile.introDone) { G.go('battle', { wildId: 'crabbi', regionId: 'bay', mode: 'intro' }); return; }
      var cel = params && params.celebrate;
      S = { root: root, pads: [null, null, null], overlay: null };
      G.ensureDaily();
      G.music('camp');
      var p = G.profile;
      root.appendChild(G.el('div', 'bg bg-camp'));
      root.appendChild(G.el('div', 'camp-night'));
      var cv = G.el('canvas', 'camp-aurora'); root.appendChild(cv);
      var skyNow = skyLevel(p.opened.length - (cel && cel.opened ? cel.opened.length : 0));
      S.cv = cv; tone(skyNow);
      S.skyFlash = G.el('div', 'camp-sky-flash'); root.appendChild(S.skyFlash);
      S.aur = G.aurora(cv, skyNow);
      // the campfire: living flames over the painted fire (G.fx.Campfire, src/fx.js)
      var fc = G.el('canvas', 'camp-fire'); fc.width = 240; fc.height = 260; root.appendChild(fc);
      try { if (G.fx && G.fx.Campfire) S.fire = G.fx.Campfire(fc, {}) || null; } catch (e) { console.error(e); }
      var wc = G.el('canvas', 'weather'); root.appendChild(wc);
      S.weather = G.weather(wc, 'fireflies');
      S.padLayer = G.el('div', 'pad-layer'); root.appendChild(S.padLayer);
      root.appendChild(G.el('div', 'team-head', G.icon('paw') + G.t('team.head')));

      // top bar: the team's power, today's friend, the player, the grown-ups
      teamPanel(root, cel ? cel.teamFrom : G.teamKraft());
      S.sight = G.el('button', 'today-slot'); S.sight.dataset.act = 'today-friend'; root.appendChild(S.sight);
      G.tap(S.sight, todayTap, 'none');
      playerChip(root, cel && (cel.evolvedIds || []).indexOf(p.team[0]) >= 0 ? p.team[0] : null);
      S.cancelLock = adultsButton(root);

      S.banner = G.el('div', 'camp-banner'); root.appendChild(S.banner);

      var dex = G.el('button', 'btn btn-round dex-btn', G.icon('book'));
      dex.dataset.act = 'go-dex'; dex.setAttribute('aria-label', 'Gromodex');
      G.tap(dex, function () { G.go('dex'); });
      root.appendChild(dex);

      S.mapBtn = G.el('button', 'btn btn-gold btn-big map-btn', G.icon('map') + '<span>' + G.t('camp.map') + '</span>');
      S.mapBtn.dataset.act = 'go-map';
      G.tap(S.mapBtn, function () {
        if (G.limitReached()) { G.say(G.t('camp.limit')); return; }
        G.go('map');
      });
      root.appendChild(S.mapBtn);

      // before a celebration, show the team as it was: old strength, the starter not yet evolved
      p.team.forEach(function (id, i) {
        if (!cel || !id) { mountPad(i, id); return; }
        var g = (cel.team || []).filter(function (x) { return x.id === id; })[0];
        var evolving = (cel.evolvedIds || []).indexOf(id) >= 0;
        mountPad(i, id, { xp: g ? g.from : G.xpOf(id), pic: evolving ? id : null });
      });
      var st = refreshState();
      if (cel) celebrate(cel).then(function () { if (alive(root)) refreshState(); });
      else if (st.limit) G.say(G.t('camp.limit'));
      else if (st.canPick) openFriendPick();
      else G.say(G.t('camp.go'));
    },
    exit: function () {
      if (!S) return;
      closeOverlay();
      if (S.cancelLock) S.cancelLock();
      if (S.aur) S.aur.destroy();
      if (S.fire) { try { S.fire.destroy(); } catch (e) { console.error(e); } }
      if (S.weather) S.weather.destroy();
      S = null;
    }
  };
})();
