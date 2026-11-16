/* Play data (slice 6, ../../slice-6.md): what happened in a real play, sent to the Supabase table public.play_events
   (../../supabase/001_play_events.sql). The game can only add rows: it cannot read, change or delete.

     one row: { id, player, kind, happened_at, game_version, test, data }
     data always holds: tablet (a random id kept on this tablet), visit (a random id for this page load), ms (since load)

   Who: `player` is the name typed under "Dit navn" in setup (G.profile.name), cleaned so the table always takes it
   (cleanName: no control or invisible characters, one space between words, 1 to 40 characters as Postgres counts them).
   A player who skipped the name is "#" and his place (#1 to #5). Before a player is open (the title, setup) it is "-".

   What is never sent: the question text, the words he spells, anything spoken, any picture or sound, anything typed
   but the name. Rows are built from named fields picked here (fromTask), never by copying a task, and every value in
   `data` must pass slim(): numbers, true/false and short tokens without spaces. Free text never reaches a row.

   On only when the page carries window.GROMONSTERS_SYNC = { url, key, version } (publish.py writes it into the published
   page; a plain local run has none and sends nothing). Off with ?fast=1 (the robot players and first-loss.cjs),
   ?profile=new (every test run's throwaway player, the finger player too), ?nolog=1, and when the grown-ups' switch
   "Send spilledata" is off (G.settings.playData). Off means nothing queues and nothing leaves the tablet.
   Rows from localhost, or with ?test=1, are marked test = true.

   The game never waits for it. Rows wait on the tablet (localStorage, at most 2000, the oldest dropped) and go in
   batches of up to 50, a few seconds after they were made. A batch keeps its exact rows until the server answers, so a
   second try is the same request: a 409 (these ids are there already) can only mean an earlier try landed. A batch is
   kept on the tablet too, so a reload sends it again as it was. No network: nothing is tried until the browser says it
   is back online. 401, 403 or 404: the key or the table is gone, and this key never sends again on this tablet.
   When the page is closed or hidden, one batch goes with keepalive. Every entry point swallows its own faults. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var TABLE = 'play_events';
  var MAX_QUEUE = 2000;
  var BATCH = 50;
  var MAX_ERRORS = 8;
  var STORE = 'gromonsters.playlog';
  var TABLET = 'gromonsters.tablet';
  var DEAD = 'gromonsters.playdead';
  var ADOPT_MS = 30000;   // a visit's copy with no heartbeat for this long belongs to a visit that is gone
  var BEAT_MS = 5000;
  var TOKEN = /^[A-Za-z0-9_.:+-]{1,40}$/;
  var KINDS = ['open', 'close', 'battle_start', 'answer', 'watch', 'battle_end', 'friend', 'growth', 'step', 'setup', 'error', 'stall'];
  var TOPICS = ['tal', 'ord', 'logik', 'engelsk', 'natur', 'hjerte'];
  var HEART = ['feel', 'help', 'breathe', 'grit', 'team'];

  function uuid() {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* fall through */ }
    var b = [], i;
    for (i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256));
    try { var a = new Uint8Array(16); crypto.getRandomValues(a); b = Array.prototype.slice.call(a); } catch (e) { /* Math.random it is */ }
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = b.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // A name the table always takes, or '' for none (the table's check: 1 to 40 characters as Postgres counts them,
  // which is by code point, as Array.from counts).
  function cleanName(v) {
    var s = typeof v === 'string' ? v : (v == null ? '' : String(v));
    try { s = s.normalize('NFC'); } catch (e) { /* keep as is */ }
    s = s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
      .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
      .replace(/\s+/g, ' ').trim();
    return Array.from(s).slice(0, 40).join('').trim();
  }

  // Numbers, true/false and short tokens without spaces; an object or list one level down. Anything else is left out.
  function slim(v, depth) {
    depth = depth || 0;
    if (v == null) return undefined;
    if (typeof v === 'number') return isFinite(v) ? Math.round(v * 100) / 100 : undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return TOKEN.test(v) ? v : undefined;
    if (depth >= 2) return undefined;
    if (Array.isArray(v)) return v.slice(0, 12).map(function (x) { return slim(x, depth + 1); }).filter(function (x) { return x !== undefined; });
    if (typeof v === 'object') {
      var out = {}, n = 0;
      Object.keys(v).forEach(function (k) {
        if (n >= 30 || !/^[a-z_]{1,24}$/.test(k)) return;
        var s = slim(v[k], depth + 1);
        if (s !== undefined) { out[k] = s; n++; }
      });
      return out;
    }
    return undefined;
  }
  function oneOf(v, list) { return list.indexOf(v) >= 0 ? v : undefined; }
  function stepId(v) { return typeof v === 'string' && /^[a-z]{1,2}\d{1,3}$|^h[ABC]$/.test(v) ? v : undefined; }
  function uiKind(v) { return typeof v === 'string' && /^[a-z]{2,12}$/.test(v) ? v : undefined; }

  // The few things a task may tell: its topic, step, kind and class. Never its text, its picture or its answer.
  function fromTask(task) {
    task = task || {};
    var out = { topic: oneOf(task.power, TOPICS), step: stepId(task.step), task_kind: uiKind(task.ui) };
    if (typeof task.grade === 'number') out.grade = task.grade;
    if (task.cb === 'sib' || task.cb === 'same') out.comeback = task.cb;
    if (task.power === 'hjerte') {
      var m = /^hjerte\.([A-C]\d{1,3})$/.exec(String(task.id || ''));
      if (m) out.moment = m[1];
      if (task.key && oneOf(task.key.topic, HEART)) out.heart_topic = task.key.topic;
    }
    return out;
  }

  function hash(s) { var h = 5381; s = String(s || ''); for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }

  var NONE = { on: false, log: function () {}, answer: function () {}, watch: function () {}, flush: function () { return Promise.resolve(); },
    setOn: function () {}, close: function () {}, state: function () { return { on: false }; } };

  /* env: everything this needs from the page, so the test can hand in a fake one.
       cfg, fetch, storage (getItem/setItem/removeItem), search, hostname, online(), allowed() (the grown-ups' switch),
       player() (the name or the place), version, now() (Date ms), perf() (ms since load), setTimeout, clearTimeout,
       auto (true: send by itself a few seconds after a row; false: only when flush() is called) */
  function create(env) {
    env = env || {};
    var cfg = env.cfg || null;
    var okCfg = !!(cfg && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.url || '') && /^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.key || ''));
    var q = new URLSearchParams(env.search || '');
    var testRun = q.get('fast') === '1' || q.get('profile') === 'new' || q.get('nolog') === '1';
    if (!okCfg || testRun || typeof env.fetch !== 'function') { var n = Object.create(NONE); n.why = !okCfg ? 'no-sync' : testRun ? 'test-run' : 'no-fetch'; return n; }

    var store = env.storage, T = env.setTimeout || setTimeout, CT = env.clearTimeout || clearTimeout;
    var now = env.now || Date.now, perf = env.perf || function () { return 0; };
    var online = env.online || function () { return true; };
    var allowed = env.allowed || function () { return true; };
    var who = env.player || function () { return '-'; };
    var test = q.get('test') === '1' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(env.hostname || '');
    var version = typeof cfg.version === 'string' && TOKEN.test(cfg.version) ? cfg.version : null;
    var keyMark = hash(cfg.key);
    function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
    function set(k, v) { try { if (!store) return false; store.setItem(k, v); return true; } catch (e) { return false; } }
    function del(k) { try { if (store) store.removeItem(k); } catch (e) { /* ignore */ } }

    var tablet = get(TABLET);
    if (!tablet || !TOKEN.test(tablet)) { tablet = uuid(); set(TABLET, tablet); }
    var visit = uuid().slice(0, 13), mine = STORE + '.' + visit;
    var dead = get(DEAD) === keyMark;
    // batches: fixed batches waiting to go, the first one on its way. A batch never changes once made, and never mixes
    // rows of two visits, so a second try is the very same request and a 409 can only mean an earlier try landed.
    // queue: this visit's rows not yet in a batch. unsaved: rows made since the last save (see saveNow).
    var batches = [], queue = [], unsaved = [], stored = false, sending = false, timer = null, saveTimer = null, retryMs = 0, errors = 0;

    // Each visit keeps its own copy (gromonsters.playlog.<visit>) with a heartbeat. A copy whose heartbeat is older
    // than ADOPT_MS belongs to a visit that is gone: this visit takes its batches over, as they are, and its loose rows
    // as fixed batches. Two tabs that take the same copy at once make the same batches, so a double is a 409, not a row.
    function storeKeys() {
      var out = [];
      try { for (var i = 0; store && i < store.length; i++) { var k = store.key(i); if (k && k.indexOf(STORE + '.') === 0 && k !== mine) out.push(k); } } catch (e) { /* none */ }
      return out;
    }
    function chunks(rows) { var out = []; for (var i = 0; i < rows.length; i += BATCH) out.push(rows.slice(i, i + BATCH)); return out; }
    function adopt() {
      if (dead) return 0;
      var n = 0;
      storeKeys().forEach(function (k) {
        var kept = null;
        try { kept = JSON.parse(get(k) || 'null'); } catch (e) { kept = null; }
        if (kept && typeof kept.beat === 'number' && now() - kept.beat < ADOPT_MS) return; // its visit is still alive
        del(k);
        if (!kept || typeof kept !== 'object') return;
        var bs = Array.isArray(kept.batches) ? kept.batches.filter(function (b) { return Array.isArray(b) && b.length; }) : [];
        if (Array.isArray(kept.queue)) bs = bs.concat(chunks(kept.queue));
        bs.forEach(function (b) { batches.push(b); n += b.length; });
      });
      if (n) { trim(); saveNow(); later(1500); }
      return n;
    }
    function total() { return batches.reduce(function (a, b) { return a + b.length; }, 0) + queue.length; }
    // at most MAX_QUEUE rows wait: the oldest whole batches go first (a batch is never cut), then the oldest loose rows
    function trim() {
      while (total() > MAX_QUEUE && batches.length > (sending ? 1 : 0)) batches.splice(sending ? 1 : 0, 1);
      var over = total() - MAX_QUEUE;
      if (over > 0) queue.splice(0, over);
    }
    function saveNow() {
      CT(saveTimer); saveTimer = null;
      // this visit's copy is gone: a tab that thought this visit was over has taken what was saved. Keep only the rows
      // made since (wherever they are now, loose or already in a batch), so nothing is sent twice in two batches.
      if (stored && get(mine) === null) {
        var ids = {};
        unsaved.forEach(function (r) { ids[r.id] = 1; });
        queue = batches.reduce(function (a, b) { return a.concat(b); }, []).concat(queue).filter(function (r) { return ids[r.id]; });
        batches = [];
      }
      if (!queue.length && !batches.length) { del(mine); stored = false; unsaved = []; return; }
      var body = function (q, b) { return JSON.stringify({ v: 2, beat: now(), batches: b, queue: q }); };
      // storage full: keep a smaller copy (the newest half of the loose rows), so the game's own save is never squeezed
      // out. What waits in memory is never cut for it. No storage at all: the rows live in memory for this visit only.
      var okw = set(mine, body(queue, batches));
      if (!okw && store) okw = set(mine, body(queue.slice(Math.floor(queue.length / 2)), batches.slice(0, 1)));
      // only a copy really written can be taken over by another tab; until then, a missing copy means nothing
      if (!okw) del(mine); // an older copy left there would be stale: never let another tab take that
      stored = okw;
      if (okw) unsaved = [];
    }
    function save() { if (!saveTimer) saveTimer = T(saveNow, 1000); }
    function later(ms) { if (env.auto === false || timer || dead) return; timer = T(function () { timer = null; flush(); }, ms); }

    function post(rows, keepalive) {
      var body = JSON.stringify(rows), req;
      // started at once, not in a later tick: a page that is closing may not get one
      try {
        req = Promise.resolve(env.fetch(cfg.url + '/rest/v1/' + TABLE, {
          method: 'POST', keepalive: !!keepalive && body.length < 60000,
          headers: { 'Content-Type': 'application/json', apikey: cfg.key, Prefer: 'return=minimal' },
          body: body
        }));
      } catch (e) { req = Promise.reject(e); }
      return req.then(function (r) {
        if (r.ok || r.status === 409) return 'done';
        if (r.status === 401 || r.status === 403 || r.status === 404) return 'dead';
        return r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429 ? 'drop' : 'retry';
      }, function () { return 'retry'; });
    }
    function wipe() { queue = []; batches = []; unsaved = []; CT(timer); timer = null; del(mine); stored = false; storeKeys().forEach(del); }
    function goDead() { dead = true; wipe(); set(DEAD, keyMark); }
    function first() { if (!batches.length && queue.length) { batches.push(queue.splice(0, BATCH)); saveNow(); } return batches[0] || null; }

    // One batch at a time. Resolves with what happened: 'done', 'retry', 'dead', 'drop', or 'idle' / 'off' / 'offline'.
    function flush() {
      try {
        CT(timer); timer = null;
        if (dead) return Promise.resolve('dead');
        if (!allowed()) { wipe(); return Promise.resolve('off'); }
        if (sending) return Promise.resolve('busy');
        if (stored && get(mine) === null) saveNow(); // taken over by another tab: forget what it took
        var batch = first();
        if (!batch) return Promise.resolve('idle');
        if (!online()) return Promise.resolve('offline');
        sending = true;
        return post(batch, false).then(function (res) {
          sending = false;
          if (res === 'dead') { goDead(); return res; }
          if (res === 'retry') { retryMs = Math.min(60000, retryMs ? retryMs * 2 : 15000); later(retryMs); saveNow(); return res; }
          if (batches[0] === batch) batches.shift();
          retryMs = 0; saveNow();
          if (batches.length || queue.length) later(1500);
          return res;
        }).catch(function () { sending = false; return 'retry'; });
      } catch (e) { sending = false; return Promise.resolve('retry'); }
    }

    // `data` goes through slim(): only numbers, true/false and short tokens. `as` names the player of a row about
    // time already played (the close row when one player hands over to another).
    function log(kind, data, as) {
      try {
        if (dead || !allowed() || KINDS.indexOf(kind) < 0) return null;
        var d = slim(data || {}) || {};
        d.tablet = tablet; d.visit = visit; d.ms = Math.round(perf());
        var p = cleanName(as != null ? as : who()) || '-';
        var row = { id: uuid(), player: p, kind: kind, happened_at: new Date(now()).toISOString(), game_version: version, test: test, data: d };
        queue.push(row); unsaved.push(row);
        if (unsaved.length > MAX_QUEUE) unsaved.splice(0, unsaved.length - MAX_QUEUE);
        if (total() > MAX_QUEUE) trim();
        save();
        later(kind === 'error' ? 1000 : 4000);
        return row;
      } catch (e) { return null; }
    }
    function withTask(kind, task, info) {
      try {
        var d = fromTask(task);
        Object.keys(info || {}).forEach(function (k) { if (d[k] === undefined) d[k] = info[k]; });
        return log(kind, d);
      } catch (e) { return null; }
    }
    // The page is going away: what waits is kept, and the batch on its way (or the next one) goes with keepalive.
    // It stays on the tablet, so whichever copy lands second gets a 409 and nothing doubles.
    function close() {
      try {
        if (dead || !allowed()) return;
        var batch = first();
        saveNow();
        // a tab only hidden lives on and hears the answer: the batch is done then. A page really gone never hears it,
        // so a later visit sends the batch again and gets a 409 (one console line, nothing doubled).
        if (batch && online()) post(batch, true).then(function (res) {
          if (batches[0] !== batch || sending) return;
          if (res === 'dead') goDead();
          else if (res === 'done' || res === 'drop') { batches.shift(); saveNow(); if (batches.length || queue.length) later(1500); }
        });
      } catch (e) { /* the log never breaks the game */ }
    }
    function setOn(on) {
      try { if (!on) wipe(); else { adopt(); later(1000); } } catch (e) { /* ignore */ }
    }
    // the heartbeat: a visit that still lives keeps its copy fresh, so no other tab takes it over
    function beat() { try { if (stored && !saveTimer) saveNow(); adopt(); } catch (e) { /* ignore */ } }
    if (dead) wipe();
    else if (allowed()) adopt();
    return {
      on: true, log: log, flush: flush, close: close, setOn: setOn,
      answer: function (task, info) { return withTask('answer', task, info); },
      watch: function (task, info) { return withTask('watch', task, info); },
      beat: beat, adopt: adopt,
      state: function () { return { on: true, dead: dead, test: test, queued: queue.length, pending: batches.length ? batches[0].length : 0, waiting: total(), batches: batches.length, tablet: tablet, visit: visit }; },
      _error: function (d) { if (errors++ >= MAX_ERRORS) return null; return log('error', d); }
    };
  }

  G.Playlog = { create: create, cleanName: cleanName, slim: slim, fromTask: fromTask, KINDS: KINDS, MAX_QUEUE: MAX_QUEUE, BATCH: BATCH };
  if (typeof module !== 'undefined' && module.exports) { module.exports = G.Playlog; return; }

  // ---------------- in the page ----------------
  function playerLabel() {
    if (!G.profile) return '-';
    return cleanName(G.profile.name) || '#' + ((G.slot | 0) + 1);
  }
  var log;
  try {
    log = create({
      cfg: window.GROMONSTERS_SYNC || null,
      fetch: typeof fetch === 'function' ? fetch.bind(window) : null,
      storage: (function () { try { return window.localStorage; } catch (e) { return null; } })(),
      search: location.search, hostname: location.hostname,
      online: function () { return navigator.onLine !== false; },
      allowed: function () { return !G.settings || G.settings.playData !== false; },
      player: playerLabel,
      now: Date.now, perf: function () { return performance.now(); }
    });
  } catch (e) { log = Object.create(NONE); }
  G.playlog = log;
  if (!log.on) return;

  var opened = 0, closedAt = -1e9, hidden = false, at = null; // at: the player whose time runs since `opened`
  function screenNow() { try { return G.current ? G.current() : null; } catch (e) { return null; } }
  function app() { try { return matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true; } catch (e) { return false; } }
  function logOpen(back, handover) {
    opened = Date.now(); at = playerLabel();
    raw('open', { handover: handover, back: back, w: window.innerWidth, h: window.innerHeight, lang: G.lang, app: app(), screen: screenNow(), online: navigator.onLine !== false });
  }
  // after G.boot(), so a reload that resumes at camp carries the player's name
  window.addEventListener('load', function () { setTimeout(function () { try { logOpen(false); } catch (e) { /* ignore */ } }, 0); });
  function closing() {
    try {
      var t = performance.now();
      if (t - closedAt < 2000 || hidden) return; // pagehide right after the tab was hidden: one close row is enough
      closedAt = t; hidden = true;
      raw('close', { secs: opened ? Math.round((Date.now() - opened) / 1000) : null, screen: screenNow() }, at);
      log.close();
    } catch (e) { /* ignore */ }
  }
  window.addEventListener('pagehide', closing);
  // Another player takes over without a reload (the title, "switch player", a new player): the time so far is closed
  // under the one who played it, and a new open row starts the next one's time. Checked before every row and each second.
  var raw = log.log;
  function handover() {
    try {
      if (at === null || hidden) return;
      var w = playerLabel();
      if (w === at) return;
      raw('close', { secs: Math.round((Date.now() - opened) / 1000), screen: screenNow(), handover: true }, at);
      logOpen(false, true);
    } catch (e) { /* ignore */ }
  }
  log.log = function (kind, data, as) { handover(); return raw(kind, data, as); };
  ['answer', 'watch'].forEach(function (k) { var f = log[k]; log[k] = function (task, info) { handover(); return f(task, info); }; });
  setInterval(handover, 1000);
  // the heartbeat that keeps this visit's waiting rows its own, and takes over what a closed visit left
  setInterval(function () { try { if (!document.hidden) log.beat(); } catch (e) { /* ignore */ } }, BEAT_MS);
  document.addEventListener('visibilitychange', function () {
    try {
      if (document.hidden) closing();
      else if (hidden) { hidden = false; logOpen(true); }
    } catch (e) { /* ignore */ }
  });
  window.addEventListener('online', function () { try { log.flush(); } catch (e) { /* ignore */ } });

  // script errors: where, not what the child saw
  function file(f) { return String(f || '').split('/').pop().split('?')[0].replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40); }
  function msgCode(m) { return String(m || '').replace(/[^A-Za-z0-9_.:-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'unknown'; }
  window.addEventListener('error', function (e) {
    try { log._error({ msg: msgCode(e.message), file: file(e.filename), line: e.lineno, col: e.colno, screen: screenNow() }); } catch (er) { /* ignore */ }
  });
  window.addEventListener('unhandledrejection', function (e) {
    try { log._error({ msg: msgCode(e.reason && e.reason.message || e.reason), promise: true, screen: screenNow() }); } catch (er) { /* ignore */ }
  });

  // A stall: nothing on screen changed for 30 s while he tapped buttons at least three times. One row per stall.
  var progressAt = performance.now(), deadTaps = 0, lastTap = 0, stalled = false;
  function progress() { progressAt = performance.now(); deadTaps = 0; stalled = false; }
  window.addEventListener('load', function () {
    try { new MutationObserver(progress).observe(document.getElementById('stage') || document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] }); } catch (e) { /* no watchdog */ }
  });
  window.addEventListener('pointerup', function (e) {
    try { if (e.target && e.target.closest && e.target.closest('button,[data-act]')) { deadTaps++; lastTap = performance.now(); } } catch (er) { /* ignore */ }
  }, true);
  setInterval(function () {
    try {
      if (document.hidden) return;
      var t = performance.now(), idle = t - progressAt;
      if (!stalled && idle > 30000 && deadTaps >= 3 && t - lastTap < 60000) {
        stalled = true;
        log.log('stall', { idle_s: Math.round(idle / 1000), taps: deadTaps, screen: screenNow() });
      }
    } catch (e) { /* ignore */ }
  }, 5000);
})();
