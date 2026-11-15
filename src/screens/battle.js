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
      var done = false, my = G.screenId, pr = G.profile;
      try {
        ctl = G.Battle.start(root, {
          wildId: wildId, partnerId: G.partnerId(), fighters: G.fighters(pr), wildKraft: G.wildKraft(wildId), regionId: regionId, mode: mode, brain: G.brain, today: G.today(),
          onDone: function (o) {
            if (done || my !== G.screenId) return;
            done = true;
            var cel = G.applyOutcome(o, { mode: mode, wildId: wildId });
            // an intro left before the catch: back to the title; opening the player starts the intro again
            if (mode === 'intro' && !G.profile.introDone) G.go('title');
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
