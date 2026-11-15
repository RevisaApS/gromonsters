/* Map: the island from above, one marker per region, today's sightings in bobbing bubbles. SPEC.md 7, screen 4. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  G.i18n.add({
    da: { 'map.nothing': 'Her er ingen at træne med endnu', 'map.hint': 'Tryk på et Gromonster for at møde det.', 'map.camp': 'Lejren', 'map.train': 'Træn', 'map.team': 'Holdets kraft' },
    en: { 'map.nothing': 'Nobody to train with here yet', 'map.hint': 'Tap a Gromonster to meet it.', 'map.camp': 'Camp', 'map.train': 'Train', 'map.team': 'Team power' }
  });
  // share of the 1536 x 1024 picture -> stage pixels (cover: 1280 x 853, 26.7 px cut top and bottom)
  function spot(x, y) { return { x: x * 1280, y: y * 853.33 - 26.67 }; }
  // where sighting bubbles sit for each region (stage pixels), chosen to keep names and other markers clear
  var BUBBLES = {
    bay: [[430, 476], [566, 550], [262, 548]], forest: [[404, 322], [548, 392], [108, 498]], volcano: [[505, 160], [596, 260]],
    snow: [[812, 116], [520, 118]], sky: [[1168, 150], [900, 230]], cave: [[1180, 540], [930, 300]], swamp: [[738, 548], [1030, 520]]
  };
  var S = null;

  function say(el, text, ms) {
    var b = G.el('div', 'map-say pop-in', text);
    el.appendChild(b); G.say(text);
    setTimeout(function () { b.classList.add('out'); setTimeout(function () { b.remove(); }, 300); }, ms || 2400);
  }
  function meet(wildId) {
    G.go('battle', { wildId: wildId, regionId: G.creatures[wildId].region, mode: 'catch' });
  }
  function train(regionId, mk) {
    var friends = G.wildIds().filter(function (id) { return G.creatures[id].region === regionId && G.isCaught(id) && !G.onTeam(id); });
    if (!friends.length) { G.sfx('locked'); say(mk, G.t('map.nothing')); return; }
    G.go('battle', { wildId: G.pick(friends), regionId: regionId, mode: 'train' });
  }

  G.screens.map = {
    enter: function (root, params) {
      if (!G.profile) { G.go('title'); return; }
      S = { root: root };
      var highlight = params && params.highlight;
      G.music('map');
      root.appendChild(G.el('div', 'bg bg-map'));
      var wc = G.el('canvas', 'weather'); root.appendChild(wc);
      S.weather = G.weather(wc, 'clouds');
      var links = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); links.setAttribute('class', 'map-links'); root.appendChild(links);
      var layer = G.el('div', 'map-layer'); root.appendChild(layer);
      G.ensureDaily();
      var wild = G.wildOnMap();
      // the one obvious next adventure: the weakest one he has not beaten today
      var hero = wild.filter(function (id) { return !G.beatenToday(id); })[0] || null;
      var nextR = G.nextRegion(), tk = G.teamKraft();
      // team power: just the number
      var bar = G.el('div', 'team-bar team-num panel', '<span class="tb-ico">' + G.icon('bolt') + '</span><b class="num">' + tk + '</b>');
      bar.setAttribute('aria-label', G.t('map.team') + ' ' + tk);
      root.appendChild(bar);
      // today's friend: the same mark as at camp, in the same place (play notes 4)
      var today = G.el('div', 'today-slot map-today');
      today.setAttribute('aria-hidden', 'true');
      G.todayMark(today, G.todayState());
      root.appendChild(today);

      // camp
      var cp = spot(G.CAMP_SPOT.x, G.CAMP_SPOT.y);
      var camp = G.el('button', 'mk mk-camp', '<span class="mk-ico">' + G.icon('camp') + '</span><span class="mk-name">' + G.t('map.camp') + '</span>');
      camp.style.left = cp.x + 'px'; camp.style.top = cp.y + 'px';
      camp.dataset.act = 'go-camp';
      G.tap(camp, function () { G.go('camp'); });
      layer.appendChild(camp);

      Object.keys(G.regions).forEach(function (rid) {
        var r = G.regions[rid], p = spot(r.x, r.y), locked = !G.unlocked(rid), isNext = rid === nextR;
        var mine = wild.filter(function (id) { return G.creatures[id].region === rid; });
        var canTrain = G.wildIds().some(function (id) { return G.creatures[id].region === rid && G.isCaught(id) && !G.onTeam(id); });
        var mk = G.el('button', 'mk mk-region' + (locked ? ' locked' + (isNext ? ' next' : ' far') : mine.length ? ' has-sight' : ' quiet') + (highlight === rid ? ' highlight' : ''));
        mk.style.left = p.x + 'px'; mk.style.top = p.y + 'px';
        mk.dataset.act = 'region-' + rid;
        // a locked region shows only a lock; the next one also says what it takes, as a number
        mk.innerHTML = '<span class="mk-ico">' + G.icon(locked ? 'lock' : rid) + '</span>' +
          (locked && isNext ? '<span class="mk-lock">' + G.icon('bolt') + '<b class="num">' + r.need + '</b></span>' : '') +
          (!locked || isNext ? '<span class="mk-name">' + G.tx(r.name) + (!locked && !mine.length && canTrain ? '<small>' + G.t('map.train') + '</small>' : '') + '</span>' : '');
        G.tap(mk, function () {
          if (locked) { G.sfx('locked'); mk.classList.remove('wobble'); void mk.offsetWidth; mk.classList.add('wobble'); return; }
          if (mine.length) { meet(hero && mine.indexOf(hero) >= 0 ? hero : mine[0]); return; }
          train(rid, mk);
        }, locked ? 'none' : undefined);
        layer.appendChild(mk);
        // one bubble per wild one, with its power: he can judge a battle before he starts it
        mine.forEach(function (id, k) {
          var c = G.creatures[id], seen = !!G.stageOf(id), isHero = id === hero, beat = G.beatenToday(id);
          var b = G.el('button', 'sight-bubble' + (isHero ? ' hero' : ' second') + (beat ? ' beaten' : '') + (c && c.power ? ' pow-' + c.power : ''));
          var at = (BUBBLES[rid] || [])[k] || [p.x + 150 * (k + 1), p.y];
          b.style.left = at[0] + 'px'; b.style.top = at[1] + 'px';
          var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          ln.setAttribute('x1', p.x); ln.setAttribute('y1', p.y); ln.setAttribute('x2', at[0]); ln.setAttribute('y2', at[1]);
          links.appendChild(ln);
          if (isHero) {
            // a glowing dotted trail from camp to today's next adventure
            var mx = (cp.x + at[0]) / 2, my = (cp.y + at[1]) / 2 - 70;
            var d = 'M' + cp.x + ' ' + cp.y + ' Q' + mx + ' ' + my + ' ' + at[0] + ' ' + at[1];
            ['trail-glow', 'trail-ink', 'trail'].forEach(function (cls) {
              var pth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pth.setAttribute('d', d); pth.setAttribute('class', cls); links.appendChild(pth);
            });
          }
          b.style.animationDelay = (-k * 0.7) + 's';
          b.dataset.act = 'sighting-' + id;
          var inner = G.el('span', 'sb-in'); b.appendChild(inner);
          inner.appendChild(G.picture(id, seen ? '' : 'shadow'));
          if (c && c.power) inner.appendChild(G.el('span', 'sb-pow', G.powers[c.power].icon));
          if (beat) inner.appendChild(G.el('span', 'sb-beat', G.icon('check')));
          b.insertAdjacentHTML('beforeend', G.kraftPill(G.wildKraft(id), 'sb-kraft'));
          G.tap(b, function () { meet(id); });
          layer.appendChild(b);
        });
      });
      G.homeButton(root, function () { G.go('camp'); });
      if (highlight && G.regions[highlight]) G.say(G.tx(G.regions[highlight].name));
      else if (hero) G.say(G.t('map.hint'));
    },
    exit: function () { if (S && S.weather) S.weather.destroy(); S = null; }
  };
})();
