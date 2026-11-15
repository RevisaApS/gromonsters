/* Recorded Danish voice. SPEC-2.md section 8. Replaces G.say when clips exist.
   Each Danish sentence is one clip in assets/voice/da/ (recorded ahead of time by tools/make_voice.py, voice Marin).
   A line is split into sentences the same way as the recorder (tools/voice-lines.mjs). When every sentence has a clip,
   the clips play back to back; otherwise the whole line goes to the device voice (CORE's G.say).
   Without assets/voice/da/index.json the game speaks exactly as before.

   English words in a Danish game (slice 3): a sentence that starts with "[en] " is English ("[en] Cat."). Its clip is
   recorded in an English voice under that whole sentence, tag and all, so the Danish "Hat." and the English "[en] Hat."
   are two clips. tools/voice-lines.mjs and tools/make_voice.py read the same tag. The device voice never hears the tag.

   One voice at a time, and it always finishes (Steve, 2026-11-15: "the speaker doesn't finish its sentences before a
   new voice takes over"). A new line never stops the one being spoken:
   - G.say(text)               waits its turn: it starts when the line being spoken has ended. Only one line waits; a
                               newer one takes the place of an older one that has not started.
   - G.say(text, {skip: true}) is said only if the voice is free right now (praise, small notes): no queue, no cut.
   - G.say(text, {cut: true})  stops the voice and speaks at once. Only for a child's own "hear it again" tap.
   G.voice.idle(maxMs) resolves when nothing is spoken or waiting, so a flow can hold its next step until then.

   Playback uses the Web Audio context that G.audio.unlock() opens on the first tap: that context is already allowed to
   sound on Chrome for Android, clips can be scheduled back to back on its clock without gaps, and it starts no media
   session (HTMLAudio on Android can show a media notification and take audio focus). */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  var DIR = 'assets/voice/da/';
  var GAP = 0.14;          // seconds of breath between two sentences of one line
  var SLOW = 4000;         // a clip that has not loaded by then gives up, and the line falls back to the device voice
  var KEEP = 80;           // decoded clips kept in memory
  var STALL = 1200;        // a line that cannot start sounding within this time (the sound is still locked) is dropped
  var deviceSay = G.say || function () {};
  var index = null;        // sentence -> file name
  var buffers = new Map(); // file -> Promise<AudioBuffer>
  var playing = [], turn = 0;
  var cur = null;          // the line being spoken: {text, done}
  var waiting = null;      // the one line that waits for its turn: {text}
  var missing = [];
  var stats = { said: 0, waited: 0, skipped: 0, replaced: 0, replays: 0, cuts: 0, dropped: 0, unsaid: 0 };
  // the last lines with when each started and how it ended ('ended', 'replay', 'cut', 'dropped'): the tests read this
  // to prove that no line starts before the one before it has ended, and that none is cut
  var log = [];
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  window.voiceMissing = missing;

  try {
    fetch(DIR + 'index.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && typeof j === 'object') index = j; })
      .catch(function () { /* no recorded voice: the device voice speaks */ });
  } catch (e) { /* no fetch: device voice */ }

  // The same split as tools/voice-lines.mjs and tools/make_voice.py: after . ! ? or … followed by a space,
  // when the next word does not start with a small letter (so "2. klasse" stays one sentence).
  function split(text) {
    var s = String(text == null ? '' : text).normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!s) return [];
    return s.split(/(?<=[.!?…])\s+(?=[^a-zæøåäö])/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  // the line without its English tags, for the device voice
  function untag(text) { return String(text == null ? '' : text).replace(/\[en\]\s*/g, ''); }
  function own(s) { return index && Object.prototype.hasOwnProperty.call(index, s) ? index[s] : null; }
  // a sentence without an end mark uses its twin with one ("Crabbi" -> "Crabbi."), as tools/voice-lines.mjs lists it
  function clipOf(s) { return own(s) || (/[.!?…]$/.test(s) ? null : own(s + '.') || own(s + '!') || own(s + '?')); }

  function load(ctx, file) {
    if (buffers.has(file)) { var b = buffers.get(file); buffers.delete(file); buffers.set(file, b); return b; }
    var timer, ctl = window.AbortController ? new AbortController() : null;
    var slow = new Promise(function (_, rej) { timer = setTimeout(function () { if (ctl) ctl.abort(); rej(new Error('slow clip')); }, SLOW); });
    var got = fetch(DIR + file, ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error('clip ' + r.status); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); });
    var p = Promise.race([got, slow]);
    p.then(function () { clearTimeout(timer); }, function () { clearTimeout(timer); buffers.delete(file); });
    buffers.set(file, p);
    while (buffers.size > KEEP) buffers.delete(buffers.keys().next().value);
    return p;
  }

  // stop every sound of the voice now. The line that waits is left alone.
  function hush(why) {
    turn++;
    playing.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) { /* already stopped */ } });
    playing = [];
    if (cur) { cur.done = true; if (cur.rec && cur.rec.end == null) { cur.rec.end = now(); cur.rec.how = why || 'cut'; } }
    cur = null;
    if (G.audio && G.audio.duckUntil) G.audio.duckUntil(0);
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* no voice */ }
  }
  // the line being spoken has ended by itself: the one that waits gets its turn
  function finish(c) {
    if (!c || c.done) return;
    c.done = true;
    if (c.rec && c.rec.end == null) { c.rec.end = now(); c.rec.how = c.dropped ? 'dropped' : 'ended'; }
    if (cur === c) cur = null;
    if (!cur && waiting) { var w = waiting; waiting = null; start(w.text); }
  }

  // The device voice has no "ended" we can hook from here (CORE owns the utterance), so we watch it speak.
  function device(text, c) {
    G.voice.last = { path: 'device', text: text };
    deviceSay(untag(text));
    // The line is over when the device voice has stopped speaking. HARD is only a guard against a device that never
    // reports the end: the next line would cancel this one, so it must never be reached by a voice still speaking.
    var syn = window.speechSynthesis, at = 0, mine = turn, HARD = 30000;
    if (!syn) { G.voice.last.ended = true; finish(c); return; }
    var t = setInterval(function () {
      at += 150;
      if (c.done || mine !== turn) { clearInterval(t); return; }
      if ((at >= 450 && !syn.speaking && !syn.pending) || at >= HARD) { clearInterval(t); if (G.voice.last && G.voice.last.text === text) G.voice.last.ended = true; finish(c); }
    }, 150);
  }

  function clips(ctx, text, sentences, files, c) {
    var mine = turn;
    G.voice.last = { path: 'clips', text: text, files: files.slice(), played: 0 };
    var info = G.voice.last;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* the next tap resumes it */ } }
    var out = ctx.createGain(); out.gain.value = 1; out.connect(ctx.destination);
    var loads = files.map(function (f) { return load(ctx, f); });
    var t = 0, i = 0, lastSrc = null, afterLast = null, stalled = 0;
    // Before the first tap the sound is locked and the clock stands still. A line caught there would start late, on top
    // of whatever the game says after the tap: drop it instead. Nothing of it was heard, so it is not a cut.
    // Once the sound has run for this line it is never dropped: a tab put away pauses the line, and it ends on return.
    var watch = setInterval(function () {
      if (c.done || mine !== turn) { clearInterval(watch); return; }
      if (ctx.state === 'running') { clearInterval(watch); return; }
      stalled += 200;
      if (stalled >= STALL) { clearInterval(watch); stats.dropped++; hushLine(); info.ended = true; info.dropped = true; c.dropped = true; finish(c); }
    }, 200);
    function hushLine() {
      playing.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) { /* already stopped */ } });
      playing = [];
      if (G.audio && G.audio.duckUntil) G.audio.duckUntil(0);
      turn++; mine = -1;
    }
    function step() {
      if (mine !== turn) return;
      if (i >= loads.length) return;
      loads[i].then(function (buf) {
        if (mine !== turn) return;
        var src = ctx.createBufferSource(); src.buffer = buf; src.connect(out);
        t = Math.max(t, ctx.currentTime + 0.03);
        src.start(t);
        playing.push(src);
        (function (n) {
          setTimeout(function () { if (mine === turn && G.voice.onSentence) { try { G.voice.onSentence(n, sentences[n], text); } catch (e) { console.error(e); } } }, Math.max(0, (t - ctx.currentTime) * 1000));
        })(i);
        t += buf.duration;
        if (G.audio && G.audio.duckUntil) G.audio.duckUntil(t + 0.25);
        info.played = ++i;
        lastSrc = src;
        src.onended = function () {
          playing = playing.filter(function (x) { return x !== src; });
          if (mine === turn && src === lastSrc && i >= loads.length) { info.ended = true; clearInterval(watch); finish(c); } // only the last clip of the line ends it
          if (src === lastSrc && afterLast) { var f = afterLast; afterLast = null; f(); }
        };
        t += GAP;
        step();
      }, function () {
        if (mine !== turn) return;
        // A clip would not load. Clips are scheduled one at a time, so only the ones before it can still be playing:
        // let them end, then the device voice says the sentences not heard yet.
        var rest = sentences.slice(i).join(' ');
        if (!rest) { clearInterval(watch); finish(c); return; }
        // Wait for the real end of the last clip (its onended), not a wall-clock timer: the context stops its clock while
        // the tab is hidden. The clip stays in `playing` until it has ended, so a new line can still stop it.
        info.failedAt = i;
        var speak = function () { clearInterval(watch); if (mine === turn) device(rest, c); };
        if (lastSrc && playing.indexOf(lastSrc) >= 0) afterLast = speak; else speak();
      });
    }
    step();
  }

  function start(text) {
    var sentences = split(text), da = G.lang === 'da';
    var files = da && index ? sentences.map(clipOf) : null;
    var ctx = G.audio && G.audio.context ? G.audio.context() : null;
    var c = cur = { text: text, done: false, rec: { text: text, at: now(), end: null, how: null } };
    log.push(c.rec); if (log.length > 300) log.shift();
    stats.said++;
    if (files && files.every(Boolean) && ctx) clips(ctx, text, sentences, files, c);
    else device(text, c);
  }

  G.say = function (text, opt) {
    opt = opt || {};
    var sentences = split(text);
    if (!sentences.length) return;
    if (G.lang === 'da') sentences.forEach(function (s) { if (!clipOf(s) && missing.indexOf(s) < 0) missing.push(s); });
    if (!G.settings || !G.settings.voice || G.fast) { G.voice.last = { path: 'silent', text: text }; return; }
    if (opt.cut) {                       // his own "hear it again": the only thing that may stop the voice
      if (cur) stats.replays++;
      waiting = null; hush('replay'); start(text); return;
    }
    if (cur) {
      if (opt.skip) { stats.skipped++; return; }
      if (waiting) stats.replaced++;
      waiting = { text: text }; stats.waited++;
      G.voice.last = { path: 'waiting', text: text };
      return;
    }
    start(text);
  };

  G.voice = {
    has: function (text) { var s = split(text); return !!index && s.length > 0 && s.every(clipOf); },
    missing: missing,
    split: split,
    untag: untag,
    // stop everything, also the line that waits: for leaving the game's sound altogether (voice switched off)
    stop: function () { if (cur) stats.cuts++; waiting = null; hush('cut'); },
    // a line that waits and is no longer needed (he answered the task before its question was read) is not said.
    // A line already being spoken is never touched.
    unsay: function (text) { if (waiting && waiting.text === text) { waiting = null; stats.unsaid++; } },
    // is the voice on at all (a flow that waits for it must not wait when nothing will be said)
    on: function () { return !!(G.settings && G.settings.voice && !G.fast); },
    // resolves when nothing is being spoken and nothing waits, or after maxMs
    idle: function (maxMs) {
      return new Promise(function (res) {
        var at = 0, cap = maxMs == null ? 8000 : maxMs;
        (function poll() {
          if ((!cur && !waiting) || at >= cap) { res(!cur && !waiting); return; }
          at += 80; setTimeout(poll, 80);
        })();
      });
    },
    onSentence: null,   // fn(index, sentence, line), called as each recorded sentence of the current line starts
    last: null,
    stats: stats,
    log: log,
    get busy() { return !!(cur || waiting); },
    get ready() { return !!index; }
  };
})();
