/* Recorded Danish voice. SPEC-2.md section 8. Replaces G.say when clips exist.
   Each Danish sentence is one clip in assets/voice/da/ (recorded ahead of time by tools/make_voice.py, voice Marin).
   A line is split into sentences the same way as the recorder (tools/voice-lines.mjs). When every sentence has a clip,
   the clips play back to back; otherwise the whole line goes to the device voice (CORE's G.say). A new line stops the
   one before, clip or device voice. Without assets/voice/da/index.json the game speaks exactly as before.
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
  var deviceSay = G.say || function () {};
  var index = null;        // sentence -> file name
  var buffers = new Map(); // file -> Promise<AudioBuffer>
  var playing = [], turn = 0;
  var missing = [];
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

  function hush() {
    turn++;
    playing.forEach(function (s) { try { s.onended = null; s.stop(); } catch (e) { /* already stopped */ } });
    playing = [];
    if (G.audio && G.audio.duckUntil) G.audio.duckUntil(0);
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* no voice */ }
  }

  function device(text) { G.voice.last = { path: 'device', text: text }; deviceSay(text); }

  function clips(ctx, text, sentences, files, mine) {
    G.voice.last = { path: 'clips', text: text, files: files.slice(), played: 0 };
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* the next tap resumes it */ } }
    var out = ctx.createGain(); out.gain.value = 1; out.connect(ctx.destination);
    var loads = files.map(function (f) { return load(ctx, f); });
    var t = 0, i = 0, lastSrc = null, afterLast = null;
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
          setTimeout(function () { if (mine === turn && G.voice.onSentence) { try { G.voice.onSentence(n, sentences[n]); } catch (e) { console.error(e); } } }, Math.max(0, (t - ctx.currentTime) * 1000));
        })(i);
        t += buf.duration;
        if (G.audio && G.audio.duckUntil) G.audio.duckUntil(t + 0.25);
        G.voice.last.played = ++i;
        lastSrc = src;
        src.onended = function () {
          playing = playing.filter(function (x) { return x !== src; });
          if (mine === turn && src === lastSrc && i >= loads.length) G.voice.last.ended = true; // only the last clip of the line ends it
          if (src === lastSrc && afterLast) { var f = afterLast; afterLast = null; f(); }
        };
        t += GAP;
        step();
      }, function () {
        if (mine !== turn) return;
        // A clip would not load. Clips are scheduled one at a time, so only the ones before it can still be playing:
        // let them end, then the device voice says the sentences not heard yet.
        var rest = sentences.slice(i).join(' ');
        if (!rest) return;
        // Wait for the real end of the last clip (its onended), not a wall-clock timer: the context stops its clock while
        // the tab is hidden. The clip stays in `playing` until it has ended, so a new line can still stop it.
        G.voice.last.failedAt = i;
        var speak = function () { if (mine === turn) device(rest); };
        if (lastSrc && playing.indexOf(lastSrc) >= 0) afterLast = speak; else speak();
      });
    }
    step();
  }

  G.say = function (text) {
    hush();
    var sentences = split(text);
    if (!sentences.length) return;
    var da = G.lang === 'da';
    if (da) sentences.forEach(function (s) { if (!clipOf(s) && missing.indexOf(s) < 0) missing.push(s); });
    if (!G.settings || !G.settings.voice || G.fast) { G.voice.last = { path: 'silent', text: text }; return; }
    var files = da && index ? sentences.map(clipOf) : null;
    var ctx = G.audio && G.audio.context ? G.audio.context() : null;
    if (files && files.every(Boolean) && ctx) clips(ctx, text, sentences, files, turn);
    else device(text);
  };

  G.voice = {
    has: function (text) { var s = split(text); return !!index && s.length > 0 && s.every(clipOf); },
    missing: missing,
    split: split,
    stop: hush,
    onSentence: null,   // fn(index, sentence), called as each recorded sentence of the current line starts
    last: null,
    get ready() { return !!index; }
  };
})();
