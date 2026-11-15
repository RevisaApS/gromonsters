/* Gromodex: every Gromonster, as far as the child knows it. SPEC.md 7, screen 5. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.i18n.add({
    da: { 'dex.l.seen': 'Set', 'dex.l.friend': 'Ven', 'dex.l.grown': 'Vokset', 'dex.lives': 'Bor i {place}', 'dex.caught': 'Fanget {date}', 'dex.grown': 'Vokset {date}', 'dex.met': 'Set, men ikke fanget endnu', 'dex.partner': 'Din makker', 'dex.back': 'Kommer igen i morgen' },
    en: { 'dex.l.seen': 'Seen', 'dex.l.friend': 'Friend', 'dex.l.grown': 'Grown', 'dex.lives': 'Lives in {place}', 'dex.caught': 'Caught {date}', 'dex.grown': 'Grew {date}', 'dex.met': 'Seen, not caught yet', 'dex.partner': 'Your partner', 'dex.back': 'Comes back tomorrow' }
  });
  var S = null;

  function lineId(id) { return G.isCaught(id) ? G.formId(G.profile, id) : id; }

  // the same Gromonster card as the camp, without the team buttons
  function openCard(id) {
    closeCard();
    var p = G.profile, base = G.creatures[id], e = p.dex[id], st = e ? e.stage : null;
    if (st === 'caught' && G.levelFor(id) >= 3) st = 'grown';
    var stTag = st === 'grown' ? ['grown', G.icon('star'), G.t('dex.l.grown')] : st === 'met' ? ['met', G.icon('eye'), G.t('dex.l.seen')] : ['caught', G.icon('paw'), G.t('dex.l.friend')];
    var chips = [], lines = [];
    if (base.power) chips.push('<span class="chip dc-pow pow-' + base.power + '">' + G.powers[base.power].icon + G.tx(G.powers[base.power].name) + '</span>');
    var r = G.regions[base.region];
    if (st === 'met') { lines.push(G.icon('eye') + G.t('dex.met')); if (r) lines.push(G.icon(base.region) + G.t('dex.lives', { place: G.tx(r.name) })); if (p.away[id] != null && p.away[id] > G.today()) lines.push(G.t('dex.back')); }
    else if (e && e.caughtDay != null) lines.push(G.icon('check') + G.t('dex.caught', { date: G.dayDate(e.caughtDay) }));
    S.card = G.GromCard.open(S.root, id, {
      met: st === 'met', closeAct: 'dex-close', chips: chips, lines: lines,
      top: '<span class="dc-state lg lg-' + stTag[0] + '"><i>' + stTag[1] + '</i>' + stTag[2] + '</span>',
      onClose: function () { if (S) S.card = null; }
    });
  }
  function closeCard() { if (S && S.card) S.card.close(); }

  G.screens.dex = {
    enter: function (root) {
      if (!G.profile) { G.go('title'); return; }
      S = { root: root, card: null };
      G.music('camp');
      var p = G.profile;
      root.appendChild(G.el('div', 'bg bg-camp dex-bg'));
      root.appendChild(G.el('div', 'dex-shade'));
      var caught = G.DEX_ORDER.filter(function (id) { return G.isCaught(id); }).length;
      var head = G.el('div', 'dex-head');
      head.appendChild(G.el('div', 'dex-title title', G.icon('book') + 'Gromodex'));
      head.appendChild(G.el('div', 'dex-count chip num', G.icon('paw') + caught + ' / ' + G.DEX_ORDER.length));
      root.appendChild(head);
      // one language for the four states, the same on the grid and the card
      var legend = G.el('div', 'dex-legend');
      [['unknown', '<b class="lg-q">?</b>', '???'], ['met', G.icon('eye'), G.t('dex.l.seen')], ['caught', G.icon('paw'), G.t('dex.l.friend')], ['grown', G.icon('star'), G.t('dex.l.grown')]]
        .forEach(function (x) { legend.appendChild(G.el('span', 'lg lg-' + x[0], '<i>' + x[1] + '</i>' + x[2])); });
      root.appendChild(legend);
      var grid = G.el('div', 'dex-grid');
      G.DEX_ORDER.forEach(function (id, i) {
        var st = G.stageOf(id), c = G.creatures[lineId(id)];
        if (st === 'caught' && G.levelFor(id) >= 3) st = 'grown';
        var cell = G.el('button', 'dex-cell rise-in ' + (st || 'unknown'));
        cell.style.animationDelay = (i * 0.02) + 's';
        cell.dataset.act = 'dex-' + id;
        cell.appendChild(G.picture(lineId(id), st ? '' : 'shadow'));
        if (!st) cell.appendChild(G.el('span', 'dex-q', '?'));
        if (st === 'grown') cell.appendChild(G.el('span', 'dex-spark', G.icon('star')));
        if (st === 'met') cell.appendChild(G.el('span', 'dex-eye', G.icon('eye')));
        var base = G.creatures[id];
        cell.appendChild(G.el('span', 'dex-name', st ? c.name : '???'));
        if (st && base.power) cell.appendChild(G.el('span', 'dex-pow pow-' + base.power, G.powers[base.power].icon));
        G.tap(cell, function () {
          if (!st) {
            // an unknown one points to the next adventure: where it lives
            cell.classList.remove('wobble'); void cell.offsetWidth; cell.classList.add('wobble');
            var r = G.regions[base.region], txt = G.t('dex.lives', { place: G.tx(r.name) });
            var old = cell.querySelector('.dex-where'); if (old) old.remove();
            var tip = G.el('span', 'dex-where pop-in', G.icon(base.region) + txt); cell.appendChild(tip);
            setTimeout(function () { tip.remove(); }, 2600);
            G.say(txt); return;
          }
          openCard(id);
        }, st ? 'open' : 'none');
        grid.appendChild(cell);
      });
      root.appendChild(grid);
      G.homeButton(root, function () { G.go('camp'); });
    },
    exit: function () { closeCard(); S = null; }
  };
})();
