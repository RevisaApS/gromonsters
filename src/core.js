/* CORE: the one global G, language, saving, days, the screen router, the stage and the creature host. SPEC.md section 7. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var KEY = 'gromonsters.v1';
  var qs = new URLSearchParams(location.search);
  var FRESH = qs.get('profile') === 'new';
  var MEM_ONLY = FRESH && qs.get('keep') !== '1';

  G.LANGS = ['da', 'en'];
  G.fast = qs.get('fast') === '1';
  G.robot = G.robot || { screen: null };
  G.screens = G.screens || {};

  // ---------- language ----------
  var dict = { da: {}, en: {} };
  G.i18n = {
    add: function (t) { G.LANGS.forEach(function (l) { if (t[l]) Object.keys(t[l]).forEach(function (k) { dict[l][k] = t[l][k]; }); }); },
    has: function (key) { return dict.en[key] != null || dict[G.lang][key] != null; }
  };
  G.t = function (key, vars) {
    var s = dict[G.lang] && dict[G.lang][key];
    if (s == null) s = dict.en[key];
    if (s == null) s = key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  };
  // a {da, en} object in the current language
  G.tx = function (o) { return o ? (o[G.lang] != null ? o[G.lang] : o.en) : ''; };
  G.LOCALE = { da: 'da-DK', en: 'en-GB' };

  G.i18n.add({
    da: { home: 'Hjem', music: 'Musik', ranger: 'Vogter {n}', grade: '{n}. klasse', sparks: 'Gnister', 'el.leaf': 'Skov', 'el.fire': 'Ild', 'el.water': 'Vand', 'el.plain': 'Lys', ok: 'OK' },
    en: { home: 'Home', music: 'Music', ranger: 'Ranger {n}', grade: 'Grade {n}', sparks: 'Sparks', 'el.leaf': 'Forest', 'el.fire': 'Fire', 'el.water': 'Water', 'el.plain': 'Light', ok: 'OK' }
  });
  // School years by age: Danish classes start at 0 (age 6).
  G.gradeLabel = function (g) {
    if (G.lang === 'en') return { big: String(g), small: 'grade', full: 'Grade ' + g };
    return { big: String(g), small: 'klasse', full: g + '. klasse' };
  };

  // ---------- saved data ----------
  function defaults() { return { lang: 'da', music: 0.6, musicOn: true, sfx: 0.8, voice: true, still: false }; }
  var PLACES = 5; // player places
  function blank() { return { settings: defaults(), last: 0, profiles: [null, null, null, null, null] }; }
  function load() {
    if (FRESH) return blank();
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || typeof d !== 'object') return blank();
      var s = defaults(); Object.keys(s).forEach(function (k) { if (d.settings && d.settings[k] != null) s[k] = d.settings[k]; });
      d.settings = s;
      if (!Array.isArray(d.profiles)) d.profiles = [];
      while (d.profiles.length < PLACES) d.profiles.push(null);
      d.profiles = d.profiles.slice(0, PLACES).map(function (p) { return p && p.starter ? fixProfile(p) : null; });
      d.last = d.last | 0;
      if (d.last >= PLACES || !d.profiles[d.last]) d.last = Math.max(0, d.profiles.findIndex(Boolean));
      return d;
    } catch (e) { return blank(); }
  }
  function fixProfile(p) {
    p.dex = p.dex || {}; p.away = p.away || {}; p.stats = p.stats || { battles: 0, minutes: {} };
    p.stats.minutes = p.stats.minutes || {}; p.sparks = p.sparks | 0; p.dayOffset = p.dayOffset | 0; p.limitMin = p.limitMin | 0;
    // play notes 4: the steps he has watched the wild one think through, by step id (an old save starts with none)
    if (!p.watched || typeof p.watched !== 'object' || Array.isArray(p.watched)) p.watched = {};
    migrateKraft(p);
    migrateForms(p);
    migrateTeam(p);
    migrateWorld(p);
    return p;
  }
  // round 2: a team of three and strength points. An old save keeps what it earned (SPEC-2.md section 4).
  function migrateTeam(p) {
    var caughtIds = Object.keys(p.dex).filter(function (id) { var e = p.dex[id]; return id !== p.starter && e && (e.stage === 'caught' || e.stage === 'grown'); });
    if (!p.xp || typeof p.xp !== 'object') {
      p.xp = {};
      // a save from before power: the wins the old marks gave, and the forms it had are kept (p.keep), not paid for in power
      p.keep = p.keep && typeof p.keep === 'object' ? p.keep : {};
      if (p.starter) { p.xp[p.starter] = p.evolved ? OLD_MARKS.evolved : 0; if (p.evolved) p.keep[p.starter] = 5; }
      caughtIds.forEach(function (id) {
        var grown = p.dex[id].stage === 'grown';
        p.xp[id] = grown ? OLD_MARKS.grown : 0;
        if (grown) p.keep[id] = Math.max(3, p.keep[id] | 0);
      });
    }
    if (!Array.isArray(p.team)) {
      var newest = caughtIds.slice().sort(function (a, b) { return (p.dex[b].caughtDay | 0) - (p.dex[a].caughtDay | 0); });
      p.team = [p.starter].concat(newest.slice(0, 2));
    }
    while (p.team.length < 3) p.team.push(null);
    p.team = p.team.slice(0, 3).map(function (id) { return id && (id === p.starter || caughtIds.indexOf(id) >= 0) ? id : null; });
    // no doubles, and always a fighter in the middle
    p.team = p.team.map(function (id, i) { return id && p.team.indexOf(id) === i ? id : null; });
    if (!p.team[0]) { var k = p.team.findIndex(Boolean); if (k > 0) { p.team[0] = p.team[k]; p.team[k] = null; } else p.team[0] = p.starter; }
    Object.keys(p.xp).forEach(function (id) { p.xp[id] = Math.max(0, p.xp[id] | 0); });
    // the stage follows the Level: Level 3 or more is grown
    [p.starter].concat(caughtIds).forEach(function (id) {
      var e = p.dex[id]; if (!e) return;
      if (levelAt(id, p.xp[id] | 0, p) >= 3 && e.stage === 'caught') { e.stage = 'grown'; if (e.grownDay == null) e.grownDay = e.caughtDay; }
    });
    if (p.starter) p.evolved = levelAt(p.starter, p.xp[p.starter] | 0, p) >= 5;
  }

  // Power was 100 plus 5 for every right answer; now it is 1 plus 1 for every battle won. An old save keeps its
  // forms: what was grown (12 right answers) or in its next form (32) stays so, and the rest shrinks to match.
  // OLD_MARKS are the wins at which the forms came when this was written (grown at 3 wins, the next form at 8).
  var OLD_MARKS = { grown: 3, evolved: 8 };
  function migrateKraft(p) {
    if (p.kv >= 2) return;
    if (p.xp && typeof p.xp === 'object') Object.keys(p.xp).forEach(function (id) {
      var old = Math.max(0, p.xp[id] | 0), g = OLD_MARKS.grown, e = OLD_MARKS.evolved;
      p.xp[id] = old >= 32 ? e + Math.round((old - 32) / 20) : old >= 12 ? Math.min(e - 1, g + Math.floor((old - 12) / 5)) : Math.min(g - 1, Math.floor(old / 4));
    });
    p.kv = 2;
  }
  // Play notes of 2026-11-15: the forms come much later (grown at power 10, the next form at power 100). A Gromonster
  // that had already grown or changed form under the old marks keeps that form (p.keep), whatever its power is now.
  function migrateForms(p) {
    if (p.kv >= 3) return;
    p.keep = p.keep && typeof p.keep === 'object' ? p.keep : {};
    if (p.xp && typeof p.xp === 'object') Object.keys(p.xp).forEach(function (id) {
      var w = Math.max(0, p.xp[id] | 0), had = w >= OLD_MARKS.evolved ? 5 : w >= OLD_MARKS.grown ? 3 : 0;
      if (had) p.keep[id] = Math.max(had, p.keep[id] | 0);
    });
    if (p.evolved && p.starter) p.keep[p.starter] = 5;
    p.kv = 3;
  }

  // milestone 1, slice 2: regions open by team power and stay open; one new friend a day from those beaten today.
  // An old save keeps every region where it already has a friend, and the slipped-away list is gone.
  function migrateWorld(p) {
    var had = Array.isArray(p.opened) ? p.opened : [];
    var keep = ['bay'];
    if (!G.regions) had.forEach(function (r) { if (keep.indexOf(r) < 0) keep.push(r); });
    else Object.keys(G.regions).forEach(function (r) {
      var friend = Object.keys(p.dex).some(function (id) { var c = G.creatures && G.creatures[id]; return c && !c.starter && c.region === r && (p.dex[id].stage === 'caught' || p.dex[id].stage === 'grown'); });
      if (had.indexOf(r) >= 0 || friend) if (keep.indexOf(r) < 0) keep.push(r);
    });
    p.opened = keep;
    p.away = {};
    if (!p.dayLog || typeof p.dayLog !== 'object' || !Array.isArray(p.dayLog.beaten)) p.dayLog = null;
    delete p.daily;
  }

  // ---------- team, Level and strength ----------
  // battles won; the Level itself is never shown. The forms change at Level 3 (grown, power 10), Level 5 (the next form,
  // power 100) and Level 7 (a third form at power 500, for when its pictures exist).
  G.LEVEL_XP = [0, 3, 9, 39, 99, 249, 499];
  function levelNum(xp) { var n = 0; G.LEVEL_XP.forEach(function (t) { if (xp >= t) n++; }); return Math.max(1, n); }
  // the Level of one Gromonster at a given number of wins: never under a form it already had (p.keep)
  function levelAt(id, xp, p) { p = p || G.profile; return Math.max(levelNum(Math.max(0, xp | 0)), (p && p.keep && p.keep[id]) | 0); }
  G.levelAt = levelAt;
  G.levelOf = function (xp) {
    xp = Math.max(0, xp | 0);
    var L = levelNum(xp), T = G.LEVEL_XP;
    if (L >= T.length) return { level: L, into: 0, need: 0, max: true };
    return { level: L, into: xp - T[L - 1], need: T[L] - T[L - 1], max: false };
  };
  // Power, the one number a child sees: 1 to start, plus 1 for every battle that Gromonster wins (xp counts the wins).
  // Life and hits are worked out from power in the battle (G.Battle.lifeOf), so power itself can stay small.
  G.KRAFT0 = 1; G.KRAFT_STEP = 1;
  G.kraftOf = function (id, p) { return G.KRAFT0 + G.KRAFT_STEP * G.xpOf(id, p); };
  G.wildKraft = function (id) { var c = G.creatures[id] || {}; return c.kraft || G.KRAFT0; };
  // the team as the battle wants it: the fighter first, each with its picture id and its power
  G.fighters = function (p) {
    p = p || G.profile;
    var ids = (p.team || []).filter(Boolean);
    if (!ids.length) ids = [p.starter];
    return ids.map(function (id) { return { id: G.formId(p, id), baseId: id, kraft: G.kraftOf(id, p) }; });
  };
  // the two form marks as power: grown at Level 3, the next form at Level 5 (the Level itself is never shown)
  G.GROW_KRAFT = G.KRAFT0 + G.KRAFT_STEP * G.LEVEL_XP[2];
  G.EVOLVE_KRAFT = G.KRAFT0 + G.KRAFT_STEP * G.LEVEL_XP[4];
  G.isGrown = function (id, p) { return G.levelFor(id, p) >= 3; };
  // team power: the power of everyone on the team added up. It opens the next region.
  G.teamKraft = function (p) {
    p = p || G.profile; if (!p) return 0;
    return (p.team || []).filter(Boolean).reduce(function (a, id) { return a + G.kraftOf(id, p); }, 0);
  };
  G.energyFor = function (level) { return level >= 8 ? 6 : level >= 5 ? 5 : level >= 3 ? 4 : 3; };
  G.xpOf = function (id, p) { p = p || G.profile; return (p && p.xp && p.xp[id]) | 0; };
  G.levelFor = function (id, p) { return levelAt(id, G.xpOf(id, p), p); };
  // the picture id to show for a base id: the evolved form at Level 5 or more
  G.formId = function (p, baseId) {
    p = p || G.profile; if (!baseId) return null;
    var c = G.creatures && G.creatures[baseId];
    return c && c.evolvesTo && G.levelFor(baseId, p) >= 5 ? c.evolvesTo : baseId;
  };
  G.onTeam = function (id, p) { p = p || G.profile; return !!p && !!id && (p.team || []).indexOf(id) >= 0; };
  // every Gromonster the child can put on the team: the starter and every caught wild one
  G.friendIds = function (p) {
    p = p || G.profile; if (!p) return [];
    return [p.starter].concat(G.wildIds().filter(function (id) { return G.isCaught(id, p); }));
  };
  G.data = load();
  G.settings = G.data.settings;
  if (G.LANGS.indexOf(G.settings.lang) < 0) G.settings.lang = 'da';
  G.lang = G.settings.lang;
  G.profile = null; G.slot = -1; G.brain = null;

  G.save = function () {
    if (G.profile && G.brain && G.brain.toJSON) { try { G.profile.brain = G.brain.toJSON(); } catch (e) { console.error(e); } }
    if (MEM_ONLY) return;
    try { localStorage.setItem(KEY, JSON.stringify(G.data)); } catch (e) { /* storage full or blocked: play on */ }
  };

  G.setLang = function (l) {
    if (G.LANGS.indexOf(l) < 0) return;
    G.lang = G.settings.lang = l;
    document.documentElement.lang = l;
    if (G.brain && G.brain.setLang) { try { G.brain.setLang(l); } catch (e) { console.error(e); } }
    G.save();
  };
  G.applyStill = function () {
    var sys = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('still', !!(G.settings.still || sys));
  };
  G.isStill = function () { return document.documentElement.classList.contains('still'); };

  // ---------- days ----------
  function calendarDay() {
    var n = new Date(), a = new Date(n.getFullYear(), n.getMonth(), n.getDate()), b = new Date(2026, 0, 1);
    return Math.round((a - b) / 86400000);
  }
  G.today = function () { return calendarDay() + (G.profile ? (G.profile.dayOffset | 0) : 0); };
  // a game day as a short date in the current language (the test offset is taken out)
  G.dayDate = function (day) {
    if (day == null) return '';
    var d = new Date(2026, 0, 1 + day - (G.profile ? G.profile.dayOffset | 0 : 0));
    try { return d.toLocaleDateString(G.LOCALE[G.lang], { day: 'numeric', month: 'long' }); } catch (e) { return d.toDateString(); }
  };

  // ---------- profiles ----------
  G.createBrain = function () {
    G.brain = null;
    if (!G.profile || !G.Brain || !G.Brain.create) return;
    try { G.brain = G.Brain.create(G.profile.brain || null, { grade: G.profile.grade, lang: G.lang, levels: G.profile.levels || null }); }
    catch (e) { console.error('Brain.create failed', e); G.brain = null; }
  };
  G.openProfile = function (slot) {
    var p = G.data.profiles[slot]; if (!p) return false;
    G.slot = slot; G.profile = p; G.data.last = slot;
    migrateWorld(p); G.openRegions(p); // the regions are known by now, also for a save loaded before they were
    G.createBrain(); G.ensureDaily(); G.save();
    return true;
  };
  G.closeProfile = function () { G.save(); G.profile = null; G.slot = -1; G.brain = null; };
  G.freeSlot = function () { return G.data.profiles.indexOf(null); };
  G.newProfile = function (o) {
    var slot = G.freeSlot(); if (slot < 0) slot = 0;
    var day = calendarDay();
    var p = fixProfile({
      name: '', grade: o.grade | 0, levels: o.levels || null, starter: o.starter, evolved: false, created: day, sparks: 0,
      dex: {}, away: {}, daily: null, brain: null, stats: { battles: 0, minutes: {} },
      introDone: false, dayOffset: 0, limitMin: 0, team: [o.starter, null, null], xp: {}, opened: ['bay'], dayLog: null, kv: 3, keep: {}, watched: {}
    });
    p.xp[o.starter] = 0;
    p.dex[o.starter] = { stage: 'caught', metDay: day, caughtDay: day, grownDay: null };
    G.data.profiles[slot] = p;
    G.slot = slot; G.profile = p; G.data.last = slot;
    G.createBrain(); G.save();
    return p;
  };
  G.profileName = function (p, slot) { return (p && p.name) || G.t('ranger', { n: (slot | 0) + 1 }); };
  // the fighter's picture now (team[0], its evolved form at Level 5)
  G.partnerId = function (p) {
    p = p || G.profile; if (!p) return null;
    return G.formId(p, (p.team && p.team[0]) || p.starter);
  };
  G.stageOf = function (id, p) { p = p || G.profile; var e = p && p.dex[id]; return e ? e.stage : null; };
  G.isCaught = function (id, p) { var s = G.stageOf(id, p); return s === 'caught' || s === 'grown'; };
  G.wildIds = function () { return Object.keys(G.creatures || {}).filter(function (id) { var c = G.creatures[id]; return !c.starter && !c.baseOf; }); };
  // ---------- regions: team power opens the next one, and an opened region stays open ----------
  G.regionOrder = function () { return Object.keys(G.regions || {}); };
  G.unlocked = function (regionId, p) { p = p || G.profile; return !!p && !!G.regions[regionId] && (p.opened || []).indexOf(regionId) >= 0; };
  // the first region not open yet, or null when all are open
  G.nextRegion = function (p) {
    p = p || G.profile; if (!p) return null;
    return G.regionOrder().filter(function (r) { return !G.unlocked(r, p); })[0] || null;
  };
  // open every region, in order, that the team's power reaches now; returns the ones that just opened
  G.openRegions = function (p) {
    p = p || G.profile; if (!p) return [];
    var tk = G.teamKraft(p), out = [], r;
    while ((r = G.nextRegion(p)) && G.regions[r].need <= tk) { p.opened.push(r); out.push(r); }
    return out;
  };

  // ---------- today: the wild ones he beat, and the one he picked as a friend ----------
  G.ensureDaily = function () {
    var p = G.profile; if (!p || !G.creatures) return null;
    var d = G.today();
    if (!p.dayLog || p.dayLog.day !== d) { p.dayLog = { day: d, beaten: [], friend: null }; G.save(); }
    return p.dayLog;
  };
  // the wild ones on the map now: every one in an open region that is not a friend yet, the weakest first
  G.wildOnMap = function (regionId, p) {
    p = p || G.profile; if (!p) return [];
    return G.wildIds().filter(function (id) {
      var c = G.creatures[id];
      return (!regionId || c.region === regionId) && G.unlocked(c.region, p) && !G.isCaught(id, p);
    }).sort(function (a, b) { return G.wildKraft(a) - G.wildKraft(b); });
  };
  G.beatenToday = function (id) { var dl = G.ensureDaily(); return !!dl && dl.beaten.indexOf(id) >= 0; };
  // who he can pick as today's friend: those he beat today that are still wild. Empty once he has picked.
  G.friendChoices = function () {
    var dl = G.ensureDaily(); if (!dl || dl.friend) return [];
    return dl.beaten.filter(function (id) { return G.creatures[id] && !G.isCaught(id); });
  };
  G.friendToday = function () { var dl = G.ensureDaily(); return dl ? dl.friend : null; };
  // he picks one: it becomes a friend, takes the first empty place on the team, and its power may open a region
  G.pickFriend = function (id) {
    var p = G.profile, d = G.today();
    if (G.friendChoices().indexOf(id) < 0) return null;
    var e = p.dex[id];
    p.dex[id] = { stage: 'caught', metDay: e && e.metDay != null ? e.metDay : d, caughtDay: d, grownDay: null };
    if (p.xp[id] == null) p.xp[id] = 0;
    var joined = p.team.indexOf(null);
    if (joined >= 0) p.team[joined] = id;
    p.dayLog.friend = id;
    var from = G.teamKraft(p) - (joined >= 0 ? G.kraftOf(id, p) : 0);
    var opened = G.openRegions(p);
    G.save();
    return { id: id, joined: joined, teamFrom: from, teamTo: G.teamKraft(p), opened: opened };
  };
  G.dailyDone = function () { return !!G.friendToday(); };

  // ---------- play time and the daily limit ----------
  var playMs = 0, lastTick = Date.now();
  setInterval(function () {
    var now = Date.now(), dt = now - lastTick; lastTick = now;
    if (!G.profile || document.hidden || dt > 60000) return;
    playMs += dt;
    if (playMs >= 60000) {
      playMs -= 60000;
      var m = G.profile.stats.minutes, d = G.today(); m[d] = (m[d] || 0) + 1; G.save();
    }
  }, 5000);
  G.minutesOn = function (day) { return (G.profile && G.profile.stats.minutes[day]) || 0; };
  G.limitReached = function () {
    var p = G.profile; if (!p || !p.limitMin) return false;
    var d = G.today(), extra = p.extra && p.extra.day === d ? p.extra.min : 0;
    return G.minutesOn(d) >= p.limitMin + extra;
  };

  // ---------- after a battle ----------
  G.applyOutcome = function (o, ctx) {
    var p = G.profile, d = G.today(); ctx = ctx || {};
    o = o || {};
    var w = o.wildId || ctx.wildId, res = o.result || 'quit';
    var dl = G.ensureDaily();
    var teamFrom = G.teamKraft(p);
    p.sparks += Math.max(0, Math.round(+o.sparks || 0)); // kept for the grown-ups' page; the child no longer sees sparks
    var e = p.dex[w];
    if (!e) p.dex[w] = e = { stage: 'met', metDay: d, caughtDay: null, grownDay: null };
    var newFriend = null;
    if (res === 'caught') {
      // only the first battle ends in a friend by itself (won on any try); it is that day's friend
      if (e.stage === 'met') { p.dex[w] = { stage: 'caught', metDay: e.metDay != null ? e.metDay : d, caughtDay: d, grownDay: null }; newFriend = w; }
      if (!dl.friend) dl.friend = w;
    } else if (res === 'won' && ctx.mode !== 'train' && !G.isCaught(w, p)) {
      if (dl.beaten.indexOf(w) < 0) dl.beaten.push(w);
    }
    // the first battle counts as done only once Crabbi is really a friend: a lost first battle is tried again
    if (ctx.mode === 'intro' && res === 'caught') p.introDone = true;
    p.stats.battles = (p.stats.battles | 0) + 1;
    // power: +1 for the one that won the battle. The battle reports who that was (xpBy); without it the fighter gets it.
    var by = o.xpBy && typeof o.xpBy === 'object' ? o.xpBy : null;
    var countXp = res === 'won' || res === 'caught' ? 1 : 0;
    var gainXp = 0;
    var teamGain = [], grown = [], evolvedIds = [];
    (p.team || []).forEach(function (id, i) {
      if (!id) return;
      var add = by ? Math.min(1, Math.max(0, Math.round(+by[id] || 0))) : (i === 0 ? countXp : 0);
      if (!add) return;
      gainXp = Math.max(gainXp, add);
      var from = G.xpOf(id, p), to = from + add, lf = levelAt(id, from, p), lt = levelAt(id, to, p);
      p.xp[id] = to;
      teamGain.push({ id: id, place: i, from: from, to: to, kraftFrom: G.KRAFT0 + G.KRAFT_STEP * from, kraftTo: G.KRAFT0 + G.KRAFT_STEP * to, levelFrom: lf, levelTo: lt });
      var en = p.dex[id];
      if (lf < 3 && lt >= 3 && en) { en.stage = 'grown'; en.grownDay = d; grown.push(id); }
      if (lf < 5 && lt >= 5 && G.creatures[id] && G.creatures[id].evolvesTo) evolvedIds.push(id);
    });
    var evolved = false;
    if (!p.evolved && G.levelFor(p.starter, p) >= 5) { p.evolved = true; evolved = evolvedIds.indexOf(p.starter) >= 0; }
    // the first friend takes the first empty place on the team by itself
    var joined = -1;
    if (newFriend) {
      if (p.xp[w] == null) p.xp[w] = 0;
      if (!G.onTeam(w, p)) { joined = p.team.indexOf(null); if (joined >= 0) p.team[joined] = w; }
    }
    var opened = G.openRegions(p);
    G.save(); // everything is saved before any celebration plays
    return {
      teamFrom: teamFrom, teamTo: G.teamKraft(p), opened: opened, unlocked: opened,
      grown: grown, evolved: evolved, evolvedIds: evolvedIds, strength: gainXp, team: teamGain,
      result: res, wildId: w, newFriend: newFriend, joined: joined, mode: ctx.mode || null,
      canPick: G.friendChoices().length > 0
    };
  };

  // ---------- small helpers ----------
  G.el = function (tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html != null) e.innerHTML = html;
    return e;
  };
  G.wait = function (ms) { return new Promise(function (r) { setTimeout(r, G.fast ? ms / 12 : ms); }); };
  G.rand = function (n) { return Math.floor(Math.random() * n); };
  G.pick = function (a) { return a[G.rand(a.length)]; };
  G.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = G.rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  G.scale = 1;
  G.stageXY = function (el) {
    var st = document.getElementById('stage'), r = el.getBoundingClientRect(), s = st.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - s.left) / G.scale, y: (r.top + r.height / 2 - s.top) / G.scale };
  };
  // safe calls into the other parts: a missing or broken part never stops a screen
  G.sfx = function (n) { try { if (G.audio && G.audio.sfx) G.audio.sfx(n); } catch (e) { console.error(e); } };
  G.music = function (n) { try { if (G.audio && G.audio.music) G.audio.music(n); } catch (e) { console.error(e); } };
  G.aurora = function (canvas, level) {
    try { if (G.fx && G.fx.Aurora) return G.fx.Aurora(canvas, { level: level }) || null; } catch (e) { console.error(e); }
    return null;
  };
  G.weather = function (canvas, kind) {
    try { if (G.fx && G.fx.Weather) return G.fx.Weather(canvas, kind) || null; } catch (e) { console.error(e); }
    return null;
  };
  G.fxCall = function (name) {
    var args = [].slice.call(arguments, 1);
    try { if (G.fx && G.fx[name]) return G.fx[name].apply(G.fx, args); } catch (e) { console.error(e); }
    return name === 'trail' ? G.wait(400) : null;
  };
  // tap handler with a sound; data-sfx="none" keeps it quiet
  G.tap = function (el, fn, sound) {
    el.addEventListener('click', function (ev) {
      if (el.classList.contains('is-off') && !el.dataset.offOk) { G.sfx('locked'); return; }
      fn(ev);
    });
    if (sound !== undefined) el.dataset.sfx = sound;
    return el;
  };

  // ---------- voice ----------
  var voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  G.say = function (text) {
    if (!text || !G.settings.voice || !window.speechSynthesis || G.fast) return;
    var code = G.LOCALE[G.lang], pre = code.slice(0, 2);
    var v = voices.filter(function (x) { return x.lang && x.lang.replace('_', '-') === code; })[0] ||
      voices.filter(function (x) { return x.lang && (x.lang.slice(0, 2) === pre || (pre === 'nb' && x.lang.slice(0, 2) === 'no')); })[0];
    if (!v) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text).replace(/\[en\]\s*/g, '')); u.voice = v; u.lang = v.lang; u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice: silent */ }
  };

  // ---------- icons (24 x 24, currentColor) ----------
  var I = {
    home: '<path d="M3.5 11.2 12 4l8.5 7.2V20a1 1 0 0 1-1 1H15v-6.2H9V21H4.5a1 1 0 0 1-1-1z" fill="currentColor"/>',
    map: '<path d="M2.5 6.2 8.5 4l7 2.4 6-2.2v13.6l-6 2.2-7-2.4-6 2.2z" fill="currentColor"/><path d="M8.5 4v13.6M15.5 6.4V20" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/>',
    book: '<path d="M3 5.2C5.8 4 8.8 4 12 5.6 15.2 4 18.2 4 21 5.2V19c-2.8-1.1-5.8-1.1-9 .6-3.2-1.7-6.2-1.7-9-.6z" fill="currentColor"/><path d="M12 5.6v14" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="12" cy="15.6" r="1.7" fill="rgba(0,0,0,.4)"/>',
    spark: '<path d="M12 1.5l2.5 7.6 7.6 2.9-7.6 2.9L12 22.5l-2.5-7.6L1.9 12l7.6-2.9z" fill="currentColor"/>',
    check: '<path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor"/>',
    plus: '<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>',
    aurora: '<path d="M2 15c3-6 6-8 10-5s7 1 10-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M2 20c3-5 6-6 10-3.5S19 18 22 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="currentColor"/>',
    star: '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor"/>',
    speaker: '<path d="M3.5 9.5h4l5-4.5v14l-5-4.5h-4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>',
    eye: '<path d="M1.5 12C4 7 7.8 4.5 12 4.5S20 7 22.5 12C20 17 16.2 19.5 12 19.5S4 17 1.5 12z" fill="currentColor"/><circle cx="12" cy="12" r="4.2" fill="rgba(0,0,0,.55)"/><circle cx="13.4" cy="10.6" r="1.4" fill="#fff"/>',
    paw: '<ellipse cx="12" cy="15.5" rx="5" ry="4.2" fill="currentColor"/><circle cx="6" cy="10" r="2.2" fill="currentColor"/><circle cx="9.5" cy="6.5" r="2.2" fill="currentColor"/><circle cx="14.5" cy="6.5" r="2.2" fill="currentColor"/><circle cx="18" cy="10" r="2.2" fill="currentColor"/>',
    bolt: '<path d="M13.6 2.5L4.8 13.4h6.1l-1.5 8.1 8.8-11h-6.1z" fill="currentColor" stroke="#0b1430" stroke-width="1.7" stroke-linejoin="round"/>',
    note: '<path d="M9 17.4V5.4l10-2.2v11.2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6.2" cy="17.6" rx="3.1" ry="2.6" fill="currentColor"/><ellipse cx="16.2" cy="14.6" rx="3.1" ry="2.6" fill="currentColor"/>',
    noteOff: '<g opacity=".55"><path d="M9 17.4V5.4l10-2.2v11.2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6.2" cy="17.6" rx="3.1" ry="2.6" fill="currentColor"/><ellipse cx="16.2" cy="14.6" rx="3.1" ry="2.6" fill="currentColor"/></g><path d="M4 4l16 16" stroke="#ff7a7a" stroke-width="3.2" stroke-linecap="round"/>',
    download: '<path d="M12 3.5v10.5M7 9.8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 19.8h15" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    del: '<path d="M8.5 5.5H20a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 18.5H8.5L2.5 12z" fill="currentColor"/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5" stroke="rgba(0,0,0,.45)" stroke-width="2.2" stroke-linecap="round"/>',
    // regions
    volcano: '<path d="M2 21l6.5-10h7L22 21z" fill="currentColor"/><path d="M10 8c0-2 2-2 2-4M14 8c0-1.6 1.6-1.8 1.6-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9 4.5l3 2.5 3-2.5M9 19.5l3-2.5 3 2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    sky: '<path d="M6.5 19a4.5 4.5 0 0 1-.6-9 6.5 6.5 0 0 1 12.4 1.6A3.8 3.8 0 0 1 18 19z" fill="currentColor"/>',
    cave: '<path d="M12 2l4 6-4 14-4-14z" fill="currentColor"/><path d="M5 9l2.4 3.5L5 20l-2.4-7.5zM19 9l2.4 3.5L19 20l-2.4-7.5z" fill="currentColor" opacity=".7"/>',
    swamp: '<path d="M3 12a9 7 0 0 1 18 0z" fill="currentColor"/><path d="M10 12v7a2 2 0 0 0 4 0v-7" fill="currentColor" opacity=".75"/><circle cx="8" cy="8.5" r="1.4" fill="rgba(0,0,0,.3)"/><circle cx="15" cy="7.5" r="1.8" fill="rgba(0,0,0,.3)"/>',
    bay: '<path d="M2 10c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-2 5-1M2 16c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-2 5-1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    forest: '<path d="M12 2l6 8h-3l4 6h-5v5h-4v-5H5l4-6H6z" fill="currentColor"/>',
    camp: '<path d="M12 3L2.5 20h19z" fill="currentColor"/><path d="M12 10l-3.5 10h7z" fill="rgba(0,0,0,.35)"/>'
  };
  // the painted kind icons: leaf, fire, water, plain
  G.elIcon = function (element) {
    var el = ['leaf', 'fire', 'water', 'plain'].indexOf(element) >= 0 ? element : 'plain';
    return '<img class="el-ico" src="assets/ui/el-' + el + '.webp" alt="" draggable="false">';
  };
  // power, the same gold pill everywhere: the battle, the map, the camp and the cards
  G.kraftPill = function (n, cls) { return '<span class="kraft-pill num ' + (cls || '') + '">' + G.icon('bolt') + '<b>' + n + '</b></span>'; };
  G.icon = function (name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || '') + '</svg>';
  };
  // round flags, 36 x 36
  var FLAGS = {
    da: '<rect width="36" height="36" fill="#c8102e"/><rect x="10" width="5" height="36" fill="#fff"/><rect y="15.5" width="36" height="5" fill="#fff"/>',
    en: '<rect width="36" height="36" fill="#012169"/><path d="M0 0l36 36M36 0L0 36" stroke="#fff" stroke-width="7"/><path d="M0 0l36 36M36 0L0 36" stroke="#c8102e" stroke-width="2.4"/><path d="M18 0v36M0 18h36" stroke="#fff" stroke-width="10"/><path d="M18 0v36M0 18h36" stroke="#c8102e" stroke-width="6"/>'
  };
  G.flag = function (l) {
    return '<svg class="flag" viewBox="0 0 36 36" aria-hidden="true"><defs><clipPath id="fc-' + l + '"><circle cx="18" cy="18" r="18"/></clipPath></defs><g clip-path="url(#fc-' + l + ')">' + FLAGS[l] + '</g></svg>';
  };
  G.LANG_NAMES = { da: 'Dansk', en: 'English' };

  // a round home button, same place and look on every screen that has one
  G.homeButton = function (root, fn) {
    var b = G.el('button', 'btn btn-round home-btn', G.icon('home'));
    b.dataset.act = 'home'; b.setAttribute('aria-label', G.t('home'));
    G.tap(b, fn || function () { G.go('camp'); });
    root.appendChild(b); return b;
  };

  // music on or off, one tap, on every screen (how loud it is stays on the grown-ups' page)
  function paintMusic(b) {
    var on = G.settings.musicOn !== false;
    b.classList.toggle('is-muted', !on);
    b.innerHTML = G.icon(on ? 'note' : 'noteOff');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  G.setMusicOn = function (on) {
    G.settings.musicOn = !!on;
    try { if (G.audio && G.audio.setMusicOn) G.audio.setMusicOn(!!on); } catch (e) { console.error(e); }
    [].forEach.call(document.querySelectorAll('.music-btn'), paintMusic);
    G.save();
  };
  G.musicButton = function (root, where) {
    var b = G.el('button', 'btn btn-round music-btn mb-' + where);
    b.type = 'button'; b.dataset.act = 'music'; b.setAttribute('aria-label', G.t('music'));
    paintMusic(b);
    G.tap(b, function () { G.setMusicOn(G.settings.musicOn === false); });
    root.appendChild(b); return b;
  };

  // ---------- creature host ----------
  var live = [];                 // every mounted handle
  var MAX_LIVING = 6;
  function livingCount() { return live.filter(function (h) { return h._gl; }).length; }
  // a picture request cut off by a quick screen change or a flaky network gets one more try
  function loadImg(url) {
    function once() { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = url; }); }
    return once().catch(function () { return new Promise(function (r) { setTimeout(r, 350); }).then(once); });
  }
  G.loadImg = loadImg;
  // after the title is up: fetch every creature and background quietly, a few at a time, so later screens never wait
  var preloaded = null;
  G.preload = function () {
    if (preloaded) return;
    preloaded = [];
    var urls = [], seen = {};
    function add(u) { if (u && !seen[u]) { seen[u] = 1; urls.push(u); } }
    ['camp', 'map', 'title'].concat(Object.keys(G.regions || {}).map(function (r) { return G.regions[r].bg; })).forEach(function (b) { add('assets/bg/' + b + '.webp'); });
    Object.keys(G.creatures || {}).forEach(function (id) { add(G.creatures[id].img); add(G.creatures[id].fallbackImg); });
    // task pictures, when the table exists: values may be a file name, a path, or {src}
    if (G.PICS && typeof G.PICS === 'object') Object.keys(G.PICS).forEach(function (k) {
      var v = G.PICS[k]; v = v && typeof v === 'object' ? (v.src || v.img || v.file) : v;
      if (typeof v !== 'string' || !v) return;
      add(v.indexOf('/') >= 0 ? v : 'assets/pics/' + v + (/\.(webp|png|jpg)$/.test(v) ? '' : '.webp'));
    });
    var i = 0;
    function next() {
      if (i >= urls.length) return;
      var u = urls[i++];
      loadImg(u).then(function (im) { preloaded.push(im); }, function () { /* missing art: the silhouette covers it */ }).then(next);
    }
    for (var k = 0; k < 3; k++) next();
  };
  // the automatic rig: read the cut-out's shape and give it a chest that breathes, a head that sways and feet on the floor
  function autoRig(im, c) {
    var S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0, S, S);
    var a = cx.getImageData(0, 0, S, S).data, top = S, bot = -1, lft = S, rgt = -1, x, y;
    var colSum = 0, colN = 0;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      if (a[(y * S + x) * 4 + 3] > 60) { if (y < top) top = y; if (y > bot) bot = y; if (x < lft) lft = x; if (x > rgt) rgt = x; }
    }
    if (bot < 0) { top = 8; bot = 56; lft = 8; rgt = 56; }
    var t = top / S, b = (bot + 1) / S, l = lft / S, r = (rgt + 1) / S, bw = r - l, bh = b - t;
    // where the head is: the middle of the solid part in the upper 45%
    for (y = top; y < top + (bot - top) * 0.45; y++) for (x = lft; x <= rgt; x++) if (a[(y * S + x) * 4 + 3] > 60) { colSum += x; colN++; }
    var hx = colN ? (colSum / colN + 0.5) / S : (l + r) / 2;
    // feet: the middle of the lowest rows
    var fs = 0, fn = 0;
    for (y = Math.max(top, bot - 3); y <= bot; y++) for (x = lft; x <= rgt; x++) if (a[(y * S + x) * 4 + 3] > 60) { fs += x; fn++; }
    var fx = fn ? (fs / fn + 0.5) / S : (l + r) / 2;
    // something sticking out on the left (a tail) at body height
    var tailN = 0, ty0 = Math.round(top + (bot - top) * 0.25), ty1 = Math.round(top + (bot - top) * 0.6), tx1 = Math.round(lft + (rgt - lft) * 0.18);
    for (y = ty0; y <= ty1; y++) for (x = lft; x <= tx1; x++) if (a[(y * S + x) * 4 + 3] > 60) tailN++;
    var hasTail = tailN > (ty1 - ty0 + 1) * (tx1 - lft + 1) * 0.3;
    // the body fills about 60% of the host, so hops and lunges stay inside the canvas
    var size = Math.max(0.6, Math.min(0.86, 0.6 / Math.max(bw, bh)));
    var off = [(0.5 - (l + r) / 2) * size, 0.32 - (b - 0.5) * size];
    var cy = (t + b) / 2;
    var bones = [
      { tag: 'head', c: [hx, t + bh * 0.3], r: bw * 0.36, ry: bh * 0.34, p: [hx, t + bh * 0.66], amp: 0.03, sp: 0.9 },
      { tag: 'part', c: [hx, t + bh * 0.06], r: bw * 0.3, ry: bh * 0.14, p: [hx, t + bh * 0.24], amp: 0.035, sp: 1.4 },
      { tag: 'chest', type: 'breath', c: [(l + r) / 2, t + bh * 0.66], r: bw * 0.38, ry: bh * 0.26, p: [fx, b], amp: 0.022, sp: 1.9 },
      { type: 'shift', c: [hx, t + bh * 0.3], r: bw * 0.3, ry: bh * 0.28, amp: 0.012 }
    ];
    if (hasTail) bones.push({ tag: 'tail', c: [l + bw * 0.1, t + bh * 0.45], r: bw * 0.18, ry: bh * 0.22, p: [l + bw * 0.28, t + bh * 0.55], amp: 0.045, sp: 2, swing: -0.15 });
    var cfg = {
      element: c.element || 'plain', size: size, offset: off, ground: [fx, b - 0.01], pivot: [fx, b - 0.01],
      shadow: Math.min(0.34, bw * 0.34), jump: 0.85, strike: [Math.min(0.95, r - 0.04), cy - bh * 0.05], glow: 0.08, bones: bones
    };
    if (c.hover) { cfg.hover = { h: 0.05, amp: 0.025, sp: 1.6, tilt: 0.04 }; cfg.ground = [fx, Math.min(0.95, b + 0.04)]; }
    return cfg;
  }
  function rigFor(c, id) {
    if (c.rig && window.STARTER_RIGS && STARTER_RIGS[c.rig]) return STARTER_RIGS[c.rig];
    if (window.EXTRA_RIGS && EXTRA_RIGS[id]) return EXTRA_RIGS[id];
    return null;
  }
  function loseGL(box) {
    [].forEach.call(box.querySelectorAll('canvas'), function (cv) {
      try {
        var gl = cv.getContext('webgl');
        var ext = gl && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (e) { /* not a GL canvas */ }
      cv.width = cv.height = 0;
    });
  }

  G.Creature = {
    mount: function (host, id, opts) {
      opts = opts || {};
      var c = (G.creatures && G.creatures[id]) || { id: id, img: 'assets/creatures/' + id + '.webp', element: 'plain' };
      host.classList.add('cr-host');
      host.innerHTML = '';
      var box = G.el('div', 'cr-box' + (opts.flip ? ' flip' : ''));
      if (opts.interactive === false) box.style.pointerEvents = 'none';
      host.appendChild(box);
      var handlers = {}, living = null, mode = 'loading', queue = [], timers = [];
      var h = {
        el: host, id: id, _gl: false,
        on: function (n, f) { (handlers[n] = handlers[n] || []).push(f); if (living) living.on(n, f); return h; },
        destroy: function () {
          if (mode === 'dead') return; mode = 'dead';
          timers.forEach(clearTimeout); timers = [];
          if (living) { try { living.stop(); } catch (e) { /* already stopped */ } }
          loseGL(box); living = null; h._gl = false;
          if (box.parentNode) box.parentNode.removeChild(box);
          var i = live.indexOf(h); if (i >= 0) live.splice(i, 1);
        },
        state: function () { return { mode: mode, living: !!living }; },
        living: function () { return living; }
      };
      function fire(n) { (handlers[n] || []).forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
      // fallback motion: a CSS class plus the events a battle waits for
      var FB = {
        attack: { cls: 'fb-attack', ms: 700, ev: ['impact', 330] }, hit: { cls: 'fb-hit', ms: 600 },
        hop: { cls: 'fb-hop', ms: 650, ev: ['land', 520] }, happy: { cls: 'fb-happy', ms: 1300 },
        grow: { cls: 'fb-grow', ms: 1500, ev: ['grown', 900] }, wake: { cls: 'fb-hop', ms: 500 }
      };
      function fallbackAct(name) {
        var f = FB[name], el = box.firstChild;
        if (name === 'sleep') { box.classList.add('fb-sleep'); return; }
        if (name === 'wake') box.classList.remove('fb-sleep');
        if (!f) return;
        if (el) { el.classList.remove(f.cls); void el.offsetWidth; el.classList.add(f.cls); timers.push(setTimeout(function () { el.classList.remove(f.cls); }, f.ms)); }
        if (f.ev) timers.push(setTimeout(function () { fire(f.ev[0]); }, G.fast ? 30 : f.ev[1]));
      }
      function act(name) {
        return function () {
          if (mode === 'dead') return;
          if (mode === 'loading') { queue.push(name); return; }
          if (living) { try { living[name](); } catch (e) { console.error(e); } }
          else fallbackAct(name);
        };
      }
      ['attack', 'hit', 'hop', 'happy', 'grow', 'sleep', 'wake'].forEach(function (n) { h[n] = act(n); });
      function flush() { var q = queue; queue = []; q.forEach(function (n) { h[n](); }); }
      function fallback(url, cfg) {
        box.innerHTML = '';
        var size = (cfg && cfg.size) || 0.78, off = (cfg && cfg.offset) || [0, 0.03];
        var wrap = G.el('div', 'cr-fb');
        wrap.style.cssText = 'width:' + size * 100 + '%;height:' + size * 100 + '%;left:' + (50 - size * 50 + off[0] * 100) + '%;top:' + (50 - size * 50 + off[1] * 100) + '%';
        if (url) { var im = new Image(); im.src = url; im.alt = ''; im.draggable = false; wrap.appendChild(im); }
        else wrap.appendChild(G.el('div', 'cr-blob'));
        box.appendChild(wrap);
        mode = 'fallback'; flush();
        if (opts.interactive !== false) G.tap(box, function () { fallbackAct('hop'); fire('poke'); }, 'none');
      }
      function start(im, url) {
        if (mode === 'dead') return;
        var cfg = url === c.fallbackImg && c.fallbackRig && window.STARTER_RIGS ? STARTER_RIGS[c.fallbackRig] : rigFor(c, id);
        if (!cfg) { try { cfg = autoRig(im, c); } catch (e) { cfg = { element: c.element, bones: [] }; } }
        if (livingCount() >= MAX_LIVING || typeof window.Living !== 'function') { fallback(url, cfg); return; }
        try { living = window.Living(box, url, cfg); } catch (e) { console.error(e); living = null; }
        if (!living) { loseGL(box); fallback(url, cfg); return; }
        h._gl = true; mode = 'living';
        Object.keys(handlers).forEach(function (n) { handlers[n].forEach(function (f) { living.on(n, f); }); });
        flush();
      }
      live.push(h);
      var urls = [c.img || 'assets/creatures/' + id + '.webp'];
      if (c.fallbackImg) urls.push(c.fallbackImg);
      (function next(i) {
        if (i >= urls.length) { if (mode !== 'dead') fallback(null, null); return; }
        loadImg(urls[i]).then(function (im) { start(im, urls[i]); }, function () { next(i + 1); });
      })(0);
      return h;
    },
    destroyAll: function () { live.slice().forEach(function (h) { h.destroy(); }); },
    count: function () { return live.length; },
    livingCount: livingCount
  };
  // a still picture for lists (dex, map, cards): no WebGL. Missing picture = silhouette blob.
  /* Today's friend (Steve's play notes 4: "make it clear that you can maximum get 1 new gromonster a day"). One round
     mark, the same picture language in three places: the map (where he picks a wild one), the card after a win, and camp
     (where the day's friend is picked). No words: a child who can not read sees the state.
       open    no friend today yet and nobody to pick: an empty dashed ring with a faint paw, a pale heart
       ready   no friend today yet, and one he beat can be picked: a gold ring that pulses, a gold paw (or that one's face)
       filled  today's friend is chosen: its face in a green ring, a pink heart, and a moon with a star: a new one tomorrow
     G.todayMark(host, {state, id}) fills host (any element) and returns it. G.todayState() is today's state now. */
  G.todayState = function () {
    var f = G.friendToday ? G.friendToday() : null;
    if (f) return { state: 'filled', id: f };
    // one he beat today can be picked: the newest of them shows faintly in the gold ring, as on the card after the win
    var can = G.friendChoices ? G.friendChoices() : [];
    return can.length ? { state: 'ready', id: can[can.length - 1] } : { state: 'open', id: null };
  };
  var TM_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.2 15 3.2 8.9A4.6 4.6 0 0112 6.6a4.6 4.6 0 018.8 2.3c0 6.1-8.8 11.6-8.8 11.6z" fill="currentColor" stroke="#0b1430" stroke-width="1.9" stroke-linejoin="round"/></svg>';
  var TM_MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.2 15.6A7.4 7.4 0 0 1 8.2 5.2a7.4 7.4 0 1 0 9 10.4z" fill="#ffd34d" stroke="#0b1430" stroke-width="1.6" stroke-linejoin="round"/><path d="M17.6 4.2l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" fill="#fff6c9"/></svg>';
  G.todayMark = function (host, o) {
    o = o || {};
    var state = o.state === 'filled' || o.state === 'ready' ? o.state : 'open';
    host.classList.remove('tm-open', 'tm-ready', 'tm-filled');
    host.classList.add('tm', 'tm-' + state);
    host.innerHTML = '';
    var face = G.el('span', 'tm-face');
    if (o.id && G.creatures && G.creatures[o.id]) face.appendChild(G.picture(G.formId ? G.formId(G.profile, o.id) || o.id : o.id));
    else face.innerHTML = G.icon('paw');
    if (o.id && state === 'ready') face.classList.add('is-maybe');
    host.appendChild(face);
    host.appendChild(G.el('span', 'tm-heart', TM_HEART));
    if (state === 'filled') host.appendChild(G.el('span', 'tm-moon', TM_MOON));
    host.dataset.today = state;
    return host;
  };

  G.picture = function (id, cls) {
    var c = (G.creatures && G.creatures[id]) || {}, w = G.el('div', 'pic ' + (cls || ''));
    var im = new Image(); im.alt = ''; im.draggable = false;
    var tried = 0, urls = [c.img || 'assets/creatures/' + id + '.webp'];
    if (c.fallbackImg) urls.push(c.fallbackImg);
    var retried = false;
    im.onerror = function () {
      if (!retried) { retried = true; setTimeout(function () { im.src = urls[tried] + (urls[tried].indexOf('?') < 0 ? '?r=1' : ''); }, 350); return; }
      tried++; retried = false;
      if (tried < urls.length) im.src = urls[tried];
      else { im.remove(); w.appendChild(G.el('div', 'cr-blob')); }
    };
    im.src = urls[0]; w.appendChild(im);
    return w;
  };

  // ---------- stage and router ----------
  var stage, screensEl, cur = null, curName = null;
  G.screenId = 0;
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
    G.scale = s;
    stage.style.transform = 'scale(' + s + ') translate(-640px,-400px)';
  }
  G.go = function (name, params) {
    if (!G.screens[name]) { console.error('No screen', name); return; }
    if (cur) { try { cur.exit(); } catch (e) { console.error(e); } }
    G.Creature.destroyAll();
    screensEl.innerHTML = '';
    G.screenId++;
    var root = G.el('div', 'screen screen-' + name);
    screensEl.appendChild(root);
    cur = G.screens[name]; curName = name; G.robot.screen = name;
    try { sessionStorage.setItem('gromonsters.screen', name === 'camp' || name === 'map' || name === 'dex' ? name : name === 'battle' ? 'camp' : 'title'); } catch (e) { /* private mode */ }
    try { cur.enter(root, params || {}); } catch (e) { console.error(e); }
    // the battle places its own, under its overlays; the grown-ups' page has the switch among its settings
    if (curName === name && name !== 'battle' && name !== 'parent' && root.parentNode && !root.querySelector('.music-btn')) G.musicButton(root, name);
  };
  G.current = function () { return curName; };

  G.boot = function () {
    stage = document.getElementById('stage');
    if (!stage) { stage = G.el('div'); stage.id = 'stage'; document.body.appendChild(stage); }
    screensEl = G.el('div', 'screens'); screensEl.id = 'screens';
    stage.appendChild(screensEl);
    try { if (G.fx && G.fx.init) G.fx.init(stage); } catch (e) { console.error(e); }
    fit(); window.addEventListener('resize', fit);
    G.applyStill(); G.setLang(G.settings.lang);
    try { if (G.audio && G.audio.setVolume) G.audio.setVolume({ music: G.settings.music, sfx: G.settings.sfx }); } catch (e) { console.error(e); }
    try { if (G.audio && G.audio.setMusicOn) G.audio.setMusicOn(G.settings.musicOn !== false); } catch (e) { console.error(e); }
    // every tap: unlock audio and answer at once with a sound
    document.addEventListener('pointerdown', function (ev) {
      try { if (G.audio && G.audio.unlock) G.audio.unlock(); } catch (e) { /* ignore */ }
      var t = ev.target.closest && ev.target.closest('[data-act],.btn');
      if (t && !t.closest('.screen-battle') && t.dataset.sfx !== 'none' && !t.classList.contains('is-off')) G.sfx(t.dataset.sfx || 'tap');
    }, true);
    document.addEventListener('visibilitychange', function () { if (document.hidden) G.save(); });
    window.addEventListener('pagehide', function () { G.save(); });
    // resume where the child was after a reload
    var resume = null; try { resume = sessionStorage.getItem('gromonsters.screen'); } catch (e) { /* private mode */ }
    setTimeout(function () { G.preload(); }, G.fast ? 0 : 1500); // also when a reload resumes past the title
    var last = G.data.profiles[G.data.last];
    if (!FRESH && resume && resume !== 'title' && last && last.introDone && G.openProfile(G.data.last)) { G.go(resume); return; }
    G.go('title');
  };
})();
