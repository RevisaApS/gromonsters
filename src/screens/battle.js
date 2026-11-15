/* Battle screen: a thin wrapper around G.Battle.start. It applies the outcome, saves, then goes to camp to celebrate. SPEC.md 7, screen 7. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var ctl = null;
  G.screens.battle = {
    enter: function (root, params) {
      if (!G.profile) { G.go('title'); return; }
      var mode = params.mode || 'catch', wildId = params.wildId, regionId = params.regionId || (G.creatures[wildId] || {}).region || 'bay';
      if (!G.Battle || !G.Battle.start || !G.creatures[wildId]) { console.error('Battle missing'); G.go('camp'); return; }
      // the one gate every battle passes: after the daily limit, camp shows the kind stop
      if (mode !== 'intro' && G.limitReached()) { G.go('camp'); return; }
      var done = false, my = G.screenId, pr = G.profile, fighters = G.fighters(pr);
      // training with a friend is an even match: the friend fights at its own power or the fighter's, whichever is more,
      // so training never turns into free wins as the team grows
      var wk = G.wildKraft(wildId);
      if (mode === 'train' && fighters.length) wk = Math.max(wk, fighters[0].kraft);
      try {
        ctl = G.Battle.start(root, {
          wildId: wildId, partnerId: G.partnerId(), fighters: fighters, wildKraft: wk, regionId: regionId, mode: mode, brain: G.brain, today: G.today(),
          // the steps of the ladder he has watched the wild one think through (play notes 4): the next watch is faster
          watched: pr.watched, onWatched: function () { G.save(); },
          // today's friend before this battle (play notes 4): the card after a win shows whether today's friend is still to come
          friendToday: G.friendToday(),
          onDone: function (o) {
            if (done || my !== G.screenId) return;
            done = true;
            var cel = G.applyOutcome(o, { mode: mode, wildId: wildId });
            // a lost battle's "try again": the same wild one, at once (the first battle has nothing else on its card)
            if (o && o.again && o.result === 'slipped') G.go('battle', { wildId: wildId, regionId: regionId, mode: mode });
            // an intro left before the catch: back to the title; opening the player starts the intro again
            else if (mode === 'intro' && !G.profile.introDone) G.go('title');
            else G.go('camp', { celebrate: cel });
          }
        });
      } catch (e) { console.error('Battle.start failed', e); G.go('camp'); }
    },
    exit: function () {
      if (ctl && typeof ctl.destroy === 'function') { try { ctl.destroy(); } catch (e) { console.error(e); } }
      ctl = null;
    }
  };
})();
