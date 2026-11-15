window.G = window.G || {};
/* AV: generated music and sound effects (SPEC section 10). Web Audio only, no files.
   Every call is safe before unlock(), without Web Audio, while hidden, and repeated. */
(function () {
  'use strict';
  var G = window.G;
  var AC = window.AudioContext || window.webkitAudioContext;

  var MUSIC_NAMES = ['title', 'camp', 'map', 'battle', 'heart'];
  var SFX_NAMES = ['tap', 'pick', 'unpick', 'right', 'super', 'miss', 'hit', 'shield', 'charge', 'ready', 'special',
    'wildhit', 'breatheIn', 'breatheOut', 'catch', 'slip', 'spark', 'aurora', 'grow', 'evolve', 'open', 'locked', 'step', 'win'];

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp01(v) { v = +v; return isFinite(v) ? Math.max(0, Math.min(1, v)) : null; }
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Perceptual volume taper: 0.5 on the slider is about -7 dB.
  var MUSIC_GAIN = 0.2, SFX_GAIN = 0.3;
  function taper(v) { return v <= 0 ? 0 : Math.pow(v, 1.2); }

  /* ---------- shared buffers (per context) ---------- */

  function noiseBuffer(ctx) {
    if (ctx._avNoise) return ctx._avNoise;
    var len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    var r = mulberry(7);
    for (var i = 0; i < len; i++) d[i] = r() * 2 - 1;
    ctx._avNoise = b;
    return b;
  }

  function reverbBuffer(ctx, seconds) {
    var sr = ctx.sampleRate, len = Math.floor(sr * seconds), b = ctx.createBuffer(2, len, sr);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), r = mulberry(11 + c), lp = 0;
      for (var i = 0; i < len; i++) {
        var x = i / len;
        // Exponential tail with a softer top end (one-pole lowpass) and a short pre-delay.
        lp += ((r() * 2 - 1) - lp) * (0.55 - 0.35 * x);
        d[i] = i < sr * 0.012 ? 0 : lp * Math.pow(1 - x, 2.2) * Math.exp(-x * 2.5);
      }
    }
    return b;
  }

  // Karplus-Strong pluck, generated once per pitch: a kantele-like string.
  function pluckBuffer(ctx, midi, bright) {
    var key = midi + ':' + bright;
    ctx._avPluck = ctx._avPluck || {};
    if (ctx._avPluck[key]) return ctx._avPluck[key];
    var sr = ctx.sampleRate, f = mtof(midi), N = Math.max(2, Math.round(sr / f));
    var len = Math.floor(sr * 1.8), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    var r = mulberry(midi * 31 + 5), i, prev = 0;
    for (i = 0; i < N && i < len; i++) { var n = r() * 2 - 1; prev = prev + (n - prev) * bright; d[i] = prev; }
    var rho = 0.996 - Math.max(0, midi - 72) * 0.0004;
    for (i = N; i < len; i++) d[i] = rho * 0.5 * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : 0));
    var peak = 0;
    for (i = 0; i < len; i++) { var a = Math.abs(d[i]); if (a > peak) peak = a; }
    if (peak > 0) for (i = 0; i < len; i++) d[i] = d[i] * 0.8 / peak;
    var out = { buf: b, rate: f * N / sr };
    ctx._avPluck[key] = out;
    return out;
  }

  /* ---------- engine: master chain and buses ---------- */

  function Engine(ctx) {
    var e = { ctx: ctx };
    e.master = ctx.createGain(); e.master.gain.value = 0.9;
    var glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 12; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.25;
    var lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    // Soft clipper after the limiter: linear below 0.6, eases into 0.98. Nothing can pass 1.0.
    var pre = ctx.createGain(); pre.gain.value = 0.5;
    var shaper = ctx.createWaveShaper(), n = 2049, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = (i / (n - 1) * 2 - 1) * 2, a = Math.abs(s);
      curve[i] = (a < 0.6 ? a : 0.6 + 0.38 * Math.tanh((a - 0.6) / 0.38)) * (s < 0 ? -1 : 1);
    }
    shaper.curve = curve;
    e.master.connect(glue); glue.connect(lim); lim.connect(pre); pre.connect(shaper); shaper.connect(ctx.destination);

    var ir = reverbBuffer(ctx, 2.6);
    e.musicVol = ctx.createGain(); e.duck = ctx.createGain();
    e.musicDry = ctx.createGain(); e.musicWet = ctx.createGain();
    var convM = ctx.createConvolver(); convM.buffer = ir;
    e.musicDry.connect(e.duck); e.musicWet.connect(convM); convM.connect(e.duck);
    e.duck.connect(e.musicVol); e.musicVol.connect(e.master);

    e.sfxVol = ctx.createGain(); e.sfxDry = ctx.createGain(); e.sfxWet = ctx.createGain();
    var convS = ctx.createConvolver(); convS.buffer = ir;
    e.sfxDry.connect(e.sfxVol); e.sfxWet.connect(convS); convS.connect(e.sfxVol); e.sfxVol.connect(e.master);
    e.noise = noiseBuffer(ctx);
    return e;
  }

  // A channel: one gain feeding a dry bus and a reverb send.
  function channel(ctx, dry, wet, level, send, lp) {
    var g = ctx.createGain(), out = g; g.gain.value = level;
    if (lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.5; g.connect(f); out = f; }
    out.connect(dry);
    if (send > 0) { var s = ctx.createGain(); s.gain.value = send; out.connect(s); s.connect(wet); }
    return g;
  }

  /* ---------- voices ---------- */

  function envAR(p, t, a, peak, hold, rel) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (hold > a) p.setValueAtTime(peak, t + hold);
    p.setTargetAtTime(0.0001, t + Math.max(a, hold), rel / 4);
  }

  function osc(ctx, type, f, t, stop) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    o.start(t); o.stop(stop); return o;
  }

  var V = {};

  V.pad = function (ctx, dest, t, midis, dur, vel, o) {
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(o.cut * 0.7, t); lp.frequency.linearRampToValueAtTime(o.cut, t + dur * 0.6);
    var g = ctx.createGain(); lp.connect(g); g.connect(dest);
    var att = Math.min(o.att, dur * 0.5), stop = t + dur + o.rel * 1.3;
    envAR(g.gain, t, att, vel, dur, o.rel);
    for (var i = 0; i < midis.length; i++) {
      var f = mtof(midis[i]);
      for (var k = -1; k <= 1; k += 2) {
        var x = osc(ctx, o.wave || 'sawtooth', f, t, stop); x.detune.value = k * (6 + i * 1.5);
        var vg = ctx.createGain(); vg.gain.value = 0.5; x.connect(vg); vg.connect(lp);
      }
    }
  };

  V.bell = function (ctx, dest, t, midi, dur, vel, o) {
    var f = mtof(midi), decay = o.decay || 0.9, stop = t + decay * 5 + 0.05;
    var car = osc(ctx, 'sine', f, t, stop), mod = osc(ctx, 'sine', f * (o.ratio || 3.5), t, stop);
    var mg = ctx.createGain(); mod.connect(mg); mg.connect(car.frequency);
    mg.gain.setValueAtTime(f * (o.index || 1.6), t); mg.gain.setTargetAtTime(f * 0.05, t, decay * 0.35);
    var g = ctx.createGain(); car.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.004, decay);
    if (o.partial) {
      var p = osc(ctx, 'sine', f * 2.0, t, t + decay * 2), pg = ctx.createGain(); p.connect(pg); pg.connect(dest);
      pg.gain.setValueAtTime(vel * o.partial, t); pg.gain.setTargetAtTime(0.0001, t, decay * 0.3);
    }
  };

  V.pluck = function (ctx, dest, t, midi, dur, vel, o) {
    var pb = pluckBuffer(ctx, midi, o.bright || 0.5);
    var s = ctx.createBufferSource(); s.buffer = pb.buf; s.playbackRate.value = pb.rate;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut || 3200;
    var g = ctx.createGain(); g.gain.value = vel;
    s.connect(lp); lp.connect(g); g.connect(dest);
    if (o.damp) { g.gain.setValueAtTime(vel, t + dur); g.gain.setTargetAtTime(0.0001, t + dur, o.damp); }
    s.start(t); s.stop(t + Math.min(1.8 / pb.rate, (o.damp ? dur + o.damp * 6 : 1.8)));
  };

  V.bass = function (ctx, dest, t, midi, dur, vel, o) {
    var f = mtof(midi), stop = t + dur + 0.6;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut || 520; lp.Q.value = 0.7;
    var g = ctx.createGain(); lp.connect(g); g.connect(dest);
    envAR(g.gain, t, 0.015, vel, dur * 0.85, o.rel || 0.25);
    osc(ctx, 'sine', f, t, stop).connect(lp);
    var tri = osc(ctx, 'triangle', f, t, stop), tg = ctx.createGain(); tg.gain.value = o.tri != null ? o.tri : 0.45; tri.connect(tg); tg.connect(lp);
  };

  V.flute = function (ctx, dest, t, midi, dur, vel, o) {
    var f = mtof(midi), stop = t + dur + 0.5;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut || 2600;
    var g = ctx.createGain(); lp.connect(g); g.connect(dest);
    envAR(g.gain, t, 0.07, vel, dur, 0.22);
    var a = osc(ctx, 'triangle', f, t, stop), b = osc(ctx, 'sine', f * 2, t, stop), bg = ctx.createGain();
    bg.gain.value = 0.12; a.connect(lp); b.connect(bg); bg.connect(lp);
    if (dur > 0.35) {
      var lfo = osc(ctx, 'sine', 5.2, t, stop), lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.005, t + Math.min(0.6, dur));
      lfo.connect(lg); lg.connect(a.frequency); lg.connect(b.frequency);
    }
    var n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 1.2;
    var ng = ctx.createGain(); n.connect(bp); bp.connect(ng); ng.connect(dest);
    envAR(ng.gain, t, 0.03, vel * 0.35, 0.05, 0.12);
    n.start(t, Math.random()); n.stop(t + 0.4);
  };

  function noiseHit(ctx, dest, t, type, f, q, a, decay, vel, f2) {
    var n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx);
    var bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.setValueAtTime(f, t); bf.Q.value = q;
    if (f2) bf.frequency.exponentialRampToValueAtTime(f2, t + a + decay);
    var g = ctx.createGain(); n.connect(bf); bf.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + a);
    g.gain.setTargetAtTime(0.0001, t + a, decay);
    n.start(t, Math.random() * 1.5); n.stop(t + a + decay * 6 + 0.05);
  }

  V.kick = function (ctx, dest, t, vel) {
    var o = osc(ctx, 'sine', 120, t, t + 0.5), g = ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    o.connect(g); g.connect(dest);
    g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0.0001, t + 0.01, 0.09);
  };
  V.tom = function (ctx, dest, t, vel, f) {
    var o = osc(ctx, 'sine', f * 1.5, t, t + 0.6), g = ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    o.connect(g); g.connect(dest);
    g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0.0001, t + 0.01, 0.14);
    noiseHit(ctx, dest, t, 'bandpass', 400, 0.8, 0.002, 0.03, vel * 0.3);
  };
  V.clap = function (ctx, dest, t, vel) { noiseHit(ctx, dest, t, 'bandpass', 1700, 0.9, 0.003, 0.06, vel); };
  V.hat = function (ctx, dest, t, vel) { noiseHit(ctx, dest, t, 'bandpass', 6200, 0.9, 0.001, 0.02, vel * 0.8); };
  V.shaker = function (ctx, dest, t, vel) { noiseHit(ctx, dest, t, 'bandpass', 4600, 1.4, 0.012, 0.032, vel * 0.85); };

  /* ---------- music: tracks and the look-ahead player ---------- */

  var MODES = {
    ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
    mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11]
  };
  function degMidi(root, mode, idx) {
    var s = MODES[mode], o = Math.floor(idx / 7), i = ((idx % 7) + 7) % 7;
    return root + 12 * o + s[i];
  }

  // Melody: one string per bar, one token per step. A number is a scale degree (1 = tonic of the melody octave,
  // 8 = an octave up, 0 = the step below the tonic); '_' holds; '.' rests.
  var TRACKS = {
    title: {
      mode: 'lydian', root: 50, step: 0.42, bar: 8, melBase: 74, mel: 'bell', melOpt: { ratio: 3.5, index: 1.1, decay: 1.4, partial: 0.1 },
      melVel: 0.21, melSend: 0.55,
      chords: '1 1 2 2 6 6 3 2 1 1 2 2 6 3 2s 1s',
      melody: ['5 _ _ _ 6 _ 5 _', '3 _ _ _ _ _ . .', '2 _ _ _ 4 _ 6 _', '6 _ _ _ _ _ . .',
        '8 _ _ _ 10 _ 8 _', '6 _ _ _ _ _ 5 _', '7 _ _ _ 5 _ 3 _', '4 _ _ _ _ _ . .',
        '5 _ _ _ 6 _ 5 _', '8 _ _ _ _ _ 9 _', '11 _ _ _ 9 _ 6 _', '9 _ _ _ _ _ . .',
        '10 _ _ _ 8 _ 6 _', '7 _ _ _ 5 _ _ _', '6 _ _ _ 9 _ _ _', '8 _ _ _ _ _ . .'],
      pad: { cut: 1500, att: 1.4, rel: 2.2, wave: 'sawtooth' }, padVel: 0.06, padSend: 0.7,
      arp: [0, 1, 2, 3, 4, 3, 2, 1], arpOct: 0, arpVel: 0.09, arpOpt: { bright: 0.35, cut: 2600 }, arpSend: 0.6,
      bass: [0, null, null, null, null, null, null, null], bassDur: 8, bassVel: 0.29, bassOpt: { cut: 380, rel: 1.2 },
      spark: 0.07, sparkOct: 24
    },
    camp: {
      mode: 'dorian', root: 45, step: 0.27, bar: 6, melBase: 69, mel: 'flute', melOpt: { cut: 2400 },
      melVel: 0.12, melSend: 0.35,
      chords: '1 4 1 7 1 4 7 1s 3 7 4 1 3 7 4s 1s',
      melody: ['5 _ 3 1 _ 3', '4 _ 6 8 _ 6', '5 _ _ 3 _ 2', '2 _ _ _ . .',
        '5 _ 3 1 _ 3', '4 _ 6 8 _ 9', '7 _ _ 6 _ 4', '5 _ _ _ . .',
        '7 _ 5 3 _ 5', '7 _ _ 4 _ 2', '4 _ 6 8 _ 6', '5 _ _ _ . 3',
        '3 _ 5 7 _ 8', '9 _ 7 4 _ 7', '8 _ _ 5 _ 4', '1 _ _ _ . .'],
      pad: { cut: 950, att: 0.6, rel: 1.4, wave: 'triangle' }, padVel: 0.09, padSend: 0.45,
      arp: [0, 1, 2, 3, 2, 1], arpOct: 12, arpVel: 0.16, arpOpt: { bright: 0.45, cut: 3000 }, arpSend: 0.35,
      bass: [0, null, null, 1, null, null], bassDur: 3, bassVel: 0.26, bassOpt: { cut: 420, rel: 0.4 },
      spark: 0.02, sparkOct: 24
    },
    map: {
      mode: 'mixo', root: 50, step: 0.3, bar: 8, melBase: 74, mel: 'bell', melOpt: { ratio: 2, index: 1.1, decay: 0.7 },
      melVel: 0.2, melSend: 0.35,
      chords: '1 7 4 1 1 7 4 4 2 4 1 7 2 4 7s 1s',
      melody: ['1 _ 3 _ 5 _ 6 5', '4 _ _ _ 2 _ _ _', '3 _ 4 _ 6 _ 5 4', '5 _ _ _ _ _ . .',
        '1 _ 3 _ 5 _ 8 _', '7 _ _ 6 5 _ 4 _', '6 _ _ _ 4 _ 3 _', '4 _ _ _ _ _ . .',
        '9 _ 8 _ 6 _ 5 _', '6 _ _ _ 4 _ _ _', '5 _ 6 _ 8 _ 9 _', '7 _ _ _ _ _ . .',
        '6 _ 5 _ 4 _ 2 _', '4 _ _ 6 _ 5 4 _', '2 _ _ _ 4 _ _ _', '1 _ _ _ _ _ . .'],
      pad: { cut: 1100, att: 0.9, rel: 1.4, wave: 'sawtooth' }, padVel: 0.058, padSend: 0.5,
      arp: [0, 1, 2, 1, 3, 1, 2, 1], arpOct: 0, arpVel: 0.14, arpOpt: { bright: 0.5, cut: 2800 }, arpSend: 0.3,
      bass: [0, null, 0, null, 1, null, 0, null], bassDur: 1.6, bassVel: 0.27, bassOpt: { cut: 420, rel: 0.25 },
      drums: { shaker: '.x.x.x.x' }, drumVel: 0.05, spark: 0.03, sparkOct: 24
    },
    battle: {
      mode: 'aeolian', root: 40, step: 0.25, bar: 8, melBase: 76, mel: 'bell', melOpt: { ratio: 2, index: 1.05, decay: 0.45, partial: 0.12 },
      melVel: 0.2, melSend: 0.3,
      chords: '1 1 6 7 1 1 6 7 4 4 6 7 4 6 7 7s',
      melody: ['1 _ _ 2 3 _ 5 _', '4 _ 3 _ 2 _ . .', '3 _ _ _ 5 _ 6 _', '7 _ _ _ 4 _ . .',
        '1 _ _ 2 3 _ 5 _', '8 _ 7 _ 5 _ . .', '6 _ _ 5 3 _ 5 _', '4 _ _ _ _ _ . .',
        '8 _ _ _ 6 _ 4 _', '6 _ 5 _ 4 _ 3 _', '3 _ _ _ 5 _ 6 _', '7 _ _ _ 9 _ . .',
        '8 _ _ 6 4 _ 6 _', '10 _ _ 8 6 _ 5 _', '7 _ 9 _ 11 _ 9 _', '8 _ _ _ _ _ . .'],
      pad: { cut: 900, att: 0.4, rel: 0.9, wave: 'sawtooth' }, padVel: 0.045, padSend: 0.35,
      arp: [0, 1, 2, 1, 0, 1, 2, 3], arpOct: 12, arpVel: 0.13, arpOpt: { bright: 0.55, cut: 2600, damp: 0.08 }, arpSend: 0.2,
      bass: [0, 0, 2, 0, 0, 0, 1, 0], bassDur: 0.8, bassVel: 0.24, bassOpt: { cut: 430, rel: 0.12, tri: 0.25 },
      drums: { kick: 'x...x...', clap: '..x...x.', hat: '.x.x.x.x', tom: '.......x' }, drumVel: 0.3,
      spark: 0.02, sparkOct: 24
    },
    heart: {
      mode: 'ionian', root: 41, step: 0.42, bar: 6, melBase: 77, mel: 'bell', melOpt: { ratio: 3, index: 0.85, decay: 1.1 },
      melVel: 0.18, melSend: 0.5,
      chords: '1 6 4 5 1 6 2 5 4 3 6 2 4 5 1s 1',
      melody: ['5 _ _ _ 6 5', '6 _ 5 3 _ _', '4 _ _ _ 6 _', '5 _ _ _ . .',
        '5 _ _ _ 6 5', '8 _ _ 6 _ 5', '4 _ _ 2 _ 6', '5 _ _ _ . .',
        '4 _ 6 8 _ _', '7 _ _ 5 _ 3', '6 _ 8 10 _ _', '9 _ _ 8 _ 6',
        '8 _ _ _ 6 _', '7 _ 5 _ 2 _', '3 _ _ _ 2 _', '1 _ _ _ . .'],
      pad: { cut: 900, att: 1.0, rel: 1.8, wave: 'triangle' }, padVel: 0.125, padSend: 0.6,
      arp: [null, null, 1, 2, 1, 2], arpOct: 12, arpVel: 0.1, arpOpt: { bright: 0.3, cut: 2200 }, arpSend: 0.5,
      bass: [0, null, null, null, null, null], bassDur: 5.5, bassVel: 0.3, bassOpt: { cut: 360, rel: 0.8 },
      spark: 0.04, sparkOct: 12
    }
  };

  function parseTrack(d) {
    if (d.parsed) return d;
    d.chordList = d.chords.split(' ').map(function (c) { return { deg: parseInt(c, 10) - 1, sus: c.indexOf('s') > 0 }; });
    d.mel = d.mel || 'bell';
    d.melBars = d.melody.map(function (b) { return b.split(' '); });
    d.drumPats = {};
    if (d.drums) for (var k in d.drums) d.drumPats[k] = d.drums[k].split('');
    d.parsed = true;
    return d;
  }

  function Player(eng, name, seed) {
    var ctx = eng.ctx, d = parseTrack(TRACKS[name]);
    this.name = name; this.d = d; this.eng = eng; this.ctx = ctx;
    this.dry = ctx.createGain(); this.wet = ctx.createGain();
    this.dry.gain.value = 0; this.wet.gain.value = 0;
    this.dry.connect(eng.musicDry); this.wet.connect(eng.musicWet);
    this.ch = {
      pad: channel(ctx, this.dry, this.wet, 1, d.padSend),
      mel: channel(ctx, this.dry, this.wet, 1, d.melSend, 3400),
      arp: channel(ctx, this.dry, this.wet, 1, d.arpSend, 5200),
      bass: channel(ctx, this.dry, this.wet, 1, 0.08),
      drum: channel(ctx, this.dry, this.wet, 1, 0.12, 7000),
      spark: channel(ctx, this.dry, this.wet, 1, 0.8, 4200)
    };
    this.rand = mulberry(seed || (Date.now() & 0xffff));
    this.i = 0; this.next = 0; this.stopped = false;
  }
  Player.prototype.start = function (t, fade) {
    this.next = t;
    [this.dry, this.wet].forEach(function (g) {
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + fade);
    });
  };
  Player.prototype.stop = function (t, fade) {
    this.stopped = true;
    [this.dry, this.wet].forEach(function (g) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + fade);
    });
    var self = this;
    setTimeout(function () { try { self.dry.disconnect(); self.wet.disconnect(); } catch (e) { /* already gone */ } }, (fade + 0.4) * 1000);
  };
  Player.prototype.scheduleUntil = function (tEnd, now) {
    if (this.stopped) return;
    // After a stall (suspended context, slow device) skip ahead instead of firing a backlog of notes.
    if (now != null && this.next < now - 0.05) {
      var skip = Math.ceil((now - this.next) / this.d.step);
      this.i += skip; this.next += skip * this.d.step;
    }
    while (this.next < tEnd) { this.step(this.i, this.next); this.i++; this.next += this.d.step; }
  };
  Player.prototype.chordMidis = function (c) {
    var idx = c.deg;
    return { root: idx, tones: c.sus ? [idx, idx + 4, idx + 8] : [idx, idx + 4, idx + 9], ext: c.sus ? [idx, idx + 4, idx + 7, idx + 8, idx + 11, idx + 14] : [idx, idx + 4, idx + 7, idx + 9, idx + 11, idx + 14] };
  };
  Player.prototype.step = function (i, t) {
    var d = this.d, ctx = this.ctx, r = this.rand, spb = d.bar, nb = d.chordList.length;
    var bar = Math.floor(i / spb) % nb, s = i % spb, pass = Math.floor(i / (spb * nb));
    var c = this.chordMidis(d.chordList[bar]), barDur = spb * d.step;
    var hum = function () { return (r() - 0.5) * 0.012; };
    var dm = function (base, idx) { return degMidi(base, d.mode, idx); };
    var shift = c.root > 3 ? -7 : 0; // keep chords on high degrees in the same register

    if (s === 0) {
      var pv = c.tones.map(function (x) { return dm(d.root + 12, x + shift); });
      var po = { cut: d.pad.cut * (0.8 + 0.4 * (0.5 + 0.5 * Math.sin(i / spb * 0.37))), att: d.pad.att, rel: d.pad.rel, wave: d.pad.wave };
      V.pad(ctx, this.ch.pad, t, pv, barDur, d.padVel * (0.9 + r() * 0.2), po);
      // Low-mid warmth: a soft root and fifth an octave under the pad, felt more than heard.
      var wv = [dm(d.root + 12, c.root + shift - 7), dm(d.root + 12, c.root + shift - 3)];
      V.pad(ctx, this.ch.pad, t, wv, barDur, d.warm || 0.07, { cut: 520, att: po.att, rel: po.rel, wave: 'triangle' });
    }
    var bi = d.bass[s];
    if (bi != null) {
      var bIdx = c.root + (bi === 1 ? 4 : bi === 2 ? 7 : 0);
      bIdx += shift;
      V.bass(ctx, this.ch.bass, t, dm(d.root, bIdx), d.bassDur * d.step, d.bassVel * (s === 0 ? 1 : 0.8), d.bassOpt);
    }
    // Odd passes run the arpeggio backwards; the pad filter drifts per pass.
    var ai = (pass % 2 === 1) ? d.arp[(spb - s) % spb] : d.arp[s];
    // Quiet passes thin the arpeggio a little so the loop breathes.
    if (ai != null && !(pass % 4 === 2 && s % 2 === 1 && r() < 0.5)) {
      var aIdx = c.ext[ai] + shift;
      V.pluck(ctx, this.ch.arp, t + hum(), dm(d.root + 12 + d.arpOct, aIdx), d.step * 2, d.arpVel * (s === 0 ? 1 : 0.72 + r() * 0.16), d.arpOpt);
    }
    // Melody, with a four-pass form: as written, varied, sparse, then a half-pass rest.
    var tok = d.melBars[bar][s], form = pass % 4;
    var silent = form === 3 && bar < nb / 2;
    if (!silent && tok !== '_' && tok !== '.' && tok != null) {
      var deg = parseInt(tok, 10) - 1, len = 1;
      while (s + len < spb && d.melBars[bar][s + len] === '_') len++;
      var play = true, octave = 0;
      if (form === 1 && s !== 0 && r() < 0.14) deg += r() < 0.5 ? 1 : -1;
      if (form === 2 && s !== 0 && r() < 0.35) play = false;
      if (form === 2 && bar >= 8 && bar < 12 && d.mel !== 'flute') octave = 7;
      if (play) {
        var vel = d.melVel * (0.86 + r() * 0.2) * (s === 0 ? 1 : 0.9);
        var mm = dm(d.melBase, deg + octave);
        if (form >= 1 && len >= 2 && r() < 0.1) {
          V[d.mel](ctx, this.ch.mel, t - 0.07, dm(d.melBase, deg + octave + 1), 0.08, vel * 0.45, d.melOpt);
        }
        V[d.mel](ctx, this.ch.mel, t + hum(), mm, len * d.step * 0.95, vel, d.melOpt);
      }
    }
    if (d.spark && r() < d.spark) {
      var sIdx = c.tones[Math.floor(r() * 3)] + (r() < 0.5 ? 7 : 0);
      V.bell(ctx, this.ch.spark, t + hum(), dm(d.root + d.sparkOct + 12, sIdx), 0.2, 0.05 + r() * 0.03, { ratio: 3.5, index: 1, decay: 0.9 });
    }
    if (d.drums) {
      var dv = d.drumVel, P = d.drumPats, fill = bar === nb - 1;
      if (P.kick && P.kick[s] === 'x') V.kick(ctx, this.ch.drum, t, dv * 1.6);
      if (P.clap && P.clap[s] === 'x') V.clap(ctx, this.ch.drum, t + hum(), dv * 0.5);
      if (P.hat && P.hat[s] === 'x') V.hat(ctx, this.ch.drum, t + hum(), dv * (0.22 + r() * 0.1));
      if (P.tom && (P.tom[s] === 'x' || (fill && s >= 4))) V.tom(ctx, this.ch.drum, t, dv * (fill ? 0.6 + s * 0.05 : 0.6), fill ? 90 + s * 12 : 110);
      if (P.shaker && P.shaker[s] === 'x') V.shaker(ctx, this.ch.drum, t + hum(), dv * (0.8 + r() * 0.4));
    }
  };

  /* ---------- sound effects ---------- */

  function tone(ctx, dest, t, o) {
    var stop = t + (o.a || 0.005) + (o.hold || 0) + o.d * 6 + 0.05;
    var x = osc(ctx, o.type || 'sine', o.f, t, stop);
    if (o.f2) x.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || 0.1));
    var g = ctx.createGain(), node = x;
    if (o.lp) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; x.connect(lp); node = lp; }
    node.connect(g); g.connect(dest);
    if (o.vib) {
      var l = osc(ctx, 'sine', o.vib, t, stop), lg = ctx.createGain(); lg.gain.value = o.f * 0.012; l.connect(lg); lg.connect(x.frequency);
    }
    var a = o.a || 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.v, t + a);
    if (o.hold) g.gain.setValueAtTime(o.v, t + a + o.hold);
    g.gain.setTargetAtTime(0.0001, t + a + (o.hold || 0), o.d);
  }
  function bells(ctx, dest, t, notes, gap, vel, opt) {
    for (var i = 0; i < notes.length; i++) V.bell(ctx, dest, t + i * gap, notes[i], 0.2, vel, opt);
  }
  function brass(ctx, dest, t, midi, dur, vel) {
    var f = mtof(midi), stop = t + dur + 0.6;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1;
    lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.linearRampToValueAtTime(f * 5, t + 0.05);
    lp.frequency.setTargetAtTime(f * 2.6, t + 0.06, 0.2);
    var g = ctx.createGain(); lp.connect(g); g.connect(dest);
    envAR(g.gain, t, 0.025, vel, dur, 0.25);
    for (var k = -1; k <= 1; k += 2) { var x = osc(ctx, 'sawtooth', f, t, stop); x.detune.value = k * 5; x.connect(lp); }
  }

  // Each sound gets (ctx, dry, wet, t, rand). Levels trimmed by ear-free measurement so peaks sit together.
  var SFX = {
    tap: function (c, o, w, t) {
      tone(c, o, t, { f: 1046, f2: 760, glide: 0.04, d: 0.03, v: 0.55 });
      tone(c, o, t, { type: 'triangle', f: 523, d: 0.035, v: 0.3 });
      tone(c, o, t, { f: 330, f2: 262, glide: 0.05, d: 0.04, v: 0.3 }); // a little body under the click
    },
    pick: function (c, o, w, t) {
      tone(c, o, t, { f: 620, f2: 990, glide: 0.07, d: 0.06, v: 0.55 });
      V.bell(c, w, t + 0.03, 88, 0.1, 0.18, { ratio: 3, decay: 0.12 });
    },
    unpick: function (c, o, w, t) {
      tone(c, o, t, { f: 990, f2: 600, glide: 0.08, d: 0.06, v: 0.5 });
    },
    right: function (c, o, w, t) {
      bells(c, o, t, [76, 79, 84], 0.075, 0.42, { ratio: 2, index: 1.2, decay: 0.35 });
      V.bell(c, w, t + 0.15, 96, 0.3, 0.16, { ratio: 3.5, decay: 0.6 });
      tone(c, o, t, { type: 'triangle', f: 392, f2: 784, glide: 0.18, d: 0.08, v: 0.12 });
    },
    super: function (c, o, w, t, r) {
      noiseHit(c, w, t, 'bandpass', 700, 1.2, 0.3, 0.06, 0.25, 5200);
      bells(c, o, t + 0.02, [72, 76, 79, 84, 88], 0.055, 0.34, { ratio: 2, index: 1.3, decay: 0.3 });
      [84, 88, 91].forEach(function (m) { V.bell(c, o, t + 0.3, m, 0.5, 0.24, { ratio: 2, decay: 0.9, partial: 0.2 }); });
      for (var i = 0; i < 5; i++) V.bell(c, w, t + 0.32 + r() * 0.45, 96 + [0, 4, 7, 12][Math.floor(r() * 4)], 0.1, 0.09, { ratio: 3.5, decay: 0.25 });
    },
    miss: function (c, o, w, t) {
      tone(c, o, t, { f: 392, f2: 311, glide: 0.14, a: 0.012, d: 0.12, v: 0.42, lp: 1000 });
      tone(c, o, t, { f: 196, f2: 165, glide: 0.14, a: 0.012, d: 0.12, v: 0.24 });
    },
    hit: function (c, o, w, t) {
      tone(c, o, t, { f: 190, f2: 52, glide: 0.12, d: 0.1, v: 0.9 });
      noiseHit(c, o, t, 'bandpass', 1300, 0.7, 0.002, 0.045, 0.5);
      tone(c, o, t, { type: 'triangle', f: 340, f2: 160, glide: 0.06, d: 0.05, v: 0.22 });
      noiseHit(c, w, t, 'lowpass', 2000, 0.5, 0.002, 0.08, 0.2);
    },
    shield: function (c, o, w, t, r) {
      for (var i = 0; i < 8; i++) {
        var m = 93 + Math.floor(r() * 16);
        V.bell(c, i % 2 ? w : o, t + r() * 0.07, m, 0.1, 0.17 + r() * 0.08, { ratio: [1.41, 2.76, 3.5][i % 3], index: 1.8, decay: 0.12 + r() * 0.25 });
      }
      V.bell(c, o, t, 84, 0.3, 0.26, { ratio: 2.76, index: 1, decay: 0.3 });
      noiseHit(c, o, t, 'highpass', 5000, 0.7, 0.002, 0.08, 0.22);
    },
    charge: function (c, o, w, t) {
      var x = osc(c, 'sawtooth', 220, t, t + 0.6), lp = c.createBiquadFilter(), g = c.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
      x.frequency.exponentialRampToValueAtTime(660, t + 0.3);
      x.connect(lp); lp.connect(g); g.connect(w);
      envAR(g.gain, t, 0.05, 0.22, 0.28, 0.3);
      V.bell(c, o, t + 0.28, 88, 0.2, 0.38, { ratio: 2, decay: 0.6 });
    },
    ready: function (c, o, w, t) {
      [67, 74, 79, 83].forEach(function (m, i) { tone(c, w, t + i * 0.02, { type: 'triangle', f: mtof(m), a: 0.08, hold: 0.35, d: 0.18, v: 0.14 }); });
      bells(c, o, t + 0.04, [91, 95, 98], 0.07, 0.26, { ratio: 3.5, decay: 0.45 });
      noiseHit(c, w, t, 'highpass', 6000, 0.7, 0.15, 0.15, 0.06);
    },
    special: function (c, o, w, t) {
      noiseHit(c, o, t, 'bandpass', 300, 1.3, 0.36, 0.03, 0.5, 2400);
      noiseHit(c, w, t, 'bandpass', 500, 1.1, 0.36, 0.05, 0.25, 2800);
      var hit = t + 0.4;
      tone(c, o, hit, { f: 120, f2: 34, glide: 0.3, d: 0.25, v: 0.95 });
      noiseHit(c, o, hit, 'lowpass', 1800, 0.6, 0.002, 0.12, 0.5);
      [72, 79, 84, 88].forEach(function (m) { V.bell(c, w, hit, m, 0.5, 0.2, { ratio: 2, index: 1, decay: 0.9 }); });
    },
    wildhit: function (c, o, w, t) {
      tone(c, o, t, { f: 240, f2: 115, glide: 0.1, d: 0.09, v: 0.7 });
      tone(c, o, t + 0.01, { type: 'triangle', f: 300, f2: 200, glide: 0.08, d: 0.06, v: 0.25 });
      noiseHit(c, o, t, 'lowpass', 900, 0.6, 0.002, 0.04, 0.24);
    },
    breatheIn: function (c, o, w, t) {
      noiseHit(c, w, t, 'bandpass', 500, 0.8, 1.3, 0.45, 0.4, 1500);
      tone(c, o, t, { f: 220, f2: 330, glide: 1.4, a: 1.1, hold: 0.3, d: 0.3, v: 0.16 });
      tone(c, w, t, { f: 440, f2: 660, glide: 1.4, a: 1.1, hold: 0.3, d: 0.3, v: 0.06 });
    },
    breatheOut: function (c, o, w, t) {
      noiseHit(c, w, t, 'bandpass', 1500, 0.8, 0.2, 0.7, 0.36, 380);
      tone(c, o, t, { f: 330, f2: 220, glide: 1.6, a: 0.25, hold: 0.6, d: 0.45, v: 0.15 });
    },
    catch: function (c, o, w, t, r) {
      var line = [[67, 0, 0.1], [72, 0.12, 0.1], [76, 0.24, 0.1], [79, 0.36, 0.3], [76, 0.7, 0.1], [79, 0.82, 0.9]];
      line.forEach(function (n) { brass(c, o, t + n[1], n[0], n[2], 0.2); V.bell(c, w, t + n[1], n[0] + 12, 0.2, 0.12, { ratio: 2, decay: 0.4 }); });
      [64, 72, 76].forEach(function (m) { brass(c, w, t + 0.82, m, 0.9, 0.1); });
      tone(c, o, t + 0.82, { f: 98, f2: 60, glide: 0.2, d: 0.2, v: 0.5 });
      bells(c, w, t + 0.9, [84, 88, 91, 96, 100], 0.06, 0.16, { ratio: 3.5, decay: 0.6 });
      for (var i = 0; i < 6; i++) V.bell(c, w, t + 1.1 + r() * 0.7, 96 + [0, 4, 7, 12][Math.floor(r() * 4)], 0.1, 0.07, { ratio: 3.5, decay: 0.3 });
    },
    slip: function (c, o, w, t) {
      tone(c, w, t, { f: 1170, f2: 700, glide: 0.55, a: 0.04, hold: 0.35, d: 0.12, v: 0.13, vib: 6 });
      [79, 76, 74, 72].forEach(function (m, i) { V.pluck(c, o, t + 0.12 + i * 0.15, m, 0.3, 0.42, { bright: 0.4, cut: 3000 }); });
    },
    spark: function (c, o, w, t, r) {
      var pool = [96, 98, 100, 103, 105];
      V.bell(c, o, t, pool[Math.floor(r() * 5)], 0.1, 0.3, { ratio: 3.5, decay: 0.1 });
      V.bell(c, w, t + 0.045, pool[Math.floor(r() * 5)] + 2, 0.1, 0.2, { ratio: 3.5, decay: 0.14 });
      V.bell(c, o, t, 84, 0.1, 0.12, { ratio: 2, index: 0.6, decay: 0.15 }); // softer body an octave or two down
    },
    aurora: function (c, o, w, t, r) {
      var notes = [84, 86, 88, 91, 93, 96, 98, 100, 103, 105, 108];
      notes.forEach(function (m, i) { V.bell(c, i % 2 ? w : o, t + i * 0.09 + r() * 0.02, m, 0.3, 0.22 - i * 0.01, { ratio: i % 2 ? 2 : 3.5, decay: 1.1 }); });
      [60, 67, 74, 76].forEach(function (m) { tone(c, w, t, { type: 'triangle', f: mtof(m), a: 0.6, hold: 0.6, d: 0.5, v: 0.07 }); });
      noiseHit(c, w, t + 0.2, 'highpass', 7000, 0.6, 0.6, 0.4, 0.04);
    },
    grow: function (c, o, w, t) {
      tone(c, o, t, { type: 'triangle', f: 262, f2: 784, glide: 0.6, a: 0.05, hold: 0.5, d: 0.15, v: 0.26, vib: 7 });
      bells(c, w, t + 0.15, [79, 84, 88, 91], 0.13, 0.26, { ratio: 2, decay: 0.6 });
      [72, 79, 88].forEach(function (m) { V.bell(c, o, t + 0.7, m, 0.3, 0.16, { ratio: 3, decay: 1 }); });
    },
    evolve: function (c, o, w, t, r) {
      noiseHit(c, w, t, 'bandpass', 200, 1, 1.4, 0.05, 0.4, 4200);
      var x = osc(c, 'sawtooth', 110, t, t + 1.6), lp = c.createBiquadFilter(), g = c.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(3000, t + 1.4);
      x.frequency.exponentialRampToValueAtTime(440, t + 1.4); x.connect(lp); lp.connect(g); g.connect(o);
      envAR(g.gain, t, 1.2, 0.12, 1.4, 0.05);
      var hit = t + 1.45;
      tone(c, o, hit, { f: 100, f2: 34, glide: 0.35, d: 0.3, v: 0.85 });
      [72, 76, 79, 84, 88, 91].forEach(function (m) { V.bell(c, w, hit, m, 0.5, 0.15, { ratio: 3.5, decay: 1.2 }); });
      [60, 67, 72, 76].forEach(function (m) { brass(c, o, hit, m, 1.1, 0.09); });
      for (var i = 0; i < 12; i++) V.bell(c, w, hit + 0.1 + r() * 1.1, 96 + [0, 4, 7, 12, 16][Math.floor(r() * 5)], 0.1, 0.07, { ratio: 3.5, decay: 0.3 });
    },
    open: function (c, o, w, t) {
      noiseHit(c, o, t, 'bandpass', 600, 1, 0.05, 0.06, 0.24, 2600);
      tone(c, o, t + 0.03, { f: 523, f2: 659, glide: 0.06, d: 0.07, v: 0.3 });
      V.bell(c, w, t + 0.06, 84, 0.2, 0.22, { ratio: 2, decay: 0.25 });
    },
    locked: function (c, o, w, t) {
      tone(c, o, t, { type: 'triangle', f: 262, f2: 240, glide: 0.05, d: 0.05, v: 0.5, lp: 1400 });
      tone(c, o, t + 0.14, { type: 'triangle', f: 233, f2: 215, glide: 0.05, d: 0.06, v: 0.45, lp: 1400 });
      V.bell(c, w, t + 0.14, 55, 0.2, 0.18, { ratio: 1.41, index: 0.5, decay: 0.22 }); // a short wooden resonance
    },
    step: function (c, o, w, t, r) {
      var m = [76, 79][Math.floor(r() * 2)], f = mtof(m);
      tone(c, o, t, { f: f, d: 0.09, v: 0.42 });
      tone(c, o, t, { f: f * 4, d: 0.012, v: 0.12 });
      V.bell(c, w, t, m + 12, 0.1, 0.06, { ratio: 2, decay: 0.2 });
    },
    win: function (c, o, w, t) {
      [[72, 0], [76, 0.1], [79, 0.2]].forEach(function (n) { brass(c, o, t + n[1], n[0], 0.08, 0.17); });
      brass(c, o, t + 0.3, 84, 0.5, 0.2);
      [76, 79].forEach(function (m) { brass(c, w, t + 0.3, m, 0.5, 0.09); });
      bells(c, w, t + 0.3, [88, 91, 96], 0.06, 0.16, { ratio: 3.5, decay: 0.5 });
    }
  };
  // Per-sound trims so peaks sit level (set from offline measurement, see dev/av-sound.html).
  var TRIM = {
    tap: 3.1, pick: 3, unpick: 5, right: 0.73, super: 0.68, miss: 2.6, hit: 1.9, shield: 0.8, charge: 1.25, ready: 0.75,
    special: 0.42, wildhit: 2.3, breatheIn: 2.4, breatheOut: 2.2, catch: 0.65, slip: 1.7, spark: 1.8, aurora: 0.72,
    grow: 0.88, evolve: 0.38, open: 2.3, locked: 1.25, step: 5, win: 0.86
  };

  function playSfx(eng, name, t, r, offline) {
    var ctx = eng.ctx, dry = ctx.createGain(), wet = ctx.createGain();
    dry.gain.value = SFX_GAIN * TRIM[name]; wet.gain.value = SFX_GAIN * TRIM[name] * 0.35;
    dry.connect(eng.sfxDry); wet.connect(eng.sfxWet);
    // Most voices go dry; the wet node is the "air" layer with reverb.
    var wetMix = ctx.createGain(); wetMix.gain.value = 1; wetMix.connect(dry); wetMix.connect(wet);
    SFX[name](ctx, dry, wetMix, t, r);
    var w2 = ctx.createGain(); w2.gain.value = 0.3; dry.connect(w2); w2.connect(wet);
    if (!offline) setTimeout(function () { try { dry.disconnect(); wet.disconnect(); wetMix.disconnect(); w2.disconnect(); } catch (e) { /* gone */ } }, 6000);
  }

  /* ---------- the live controller ---------- */

  var ctx = null, eng = null, current = null, wanted = null, timer = null, unlocked = false;
  var voiceUntil = 0;   // context time until which a recorded voice clip plays (src/voice.js); music ducks till then
  var vol = { music: 0.5, sfx: 0.8 }, volSet = false;
  var musicOn = true;   // the music switch on every screen (G.setMusicOn): off stops the player, the wanted track is remembered
  var lastSfx = {}, activeEnds = [];
  var srand = mulberry(Date.now() & 0xffff);

  function now() { return ctx ? ctx.currentTime : 0; }
  function applyVolume() {
    if (!eng) return;
    var t = now();
    eng.musicVol.gain.setTargetAtTime(taper(vol.music) * MUSIC_GAIN, t, 0.05);
    eng.sfxVol.gain.setTargetAtTime(taper(vol.sfx), t, 0.03);
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    var t = ctx.currentTime;
    if (current) current.scheduleUntil(t + 0.3, t);
    var speaking = false;
    try { speaking = !!(window.speechSynthesis && window.speechSynthesis.speaking); } catch (e) { speaking = false; }
    if (t < voiceUntil) speaking = true;
    eng.duck.gain.setTargetAtTime(speaking ? 0.5 : 1, t, speaking ? 0.08 : 0.4);
  }
  function startTimer() { if (!timer) timer = setInterval(tick, 50); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function startMusic(name) {
    var t = now();
    if (current) { current.stop(t, 1.4); current = null; }
    if (!name) return;
    current = new Player(eng, name);
    current.start(t + 0.12, 2.0);
    current.scheduleUntil(t + 0.4, t);
  }

  function unlock() {
    if (!AC) return;
    try {
      if (!ctx) {
        ctx = new AC({ latencyHint: 'interactive' });
        eng = Engine(ctx);
        if (!volSet && G.settings) {
          if (clamp01(G.settings.music) != null) vol.music = clamp01(G.settings.music);
          if (clamp01(G.settings.sfx) != null) vol.sfx = clamp01(G.settings.sfx);
        }
        eng.musicVol.gain.value = taper(vol.music) * MUSIC_GAIN;
        eng.sfxVol.gain.value = taper(vol.sfx);
        // A silent blip completes the unlock on browsers that need a sound started inside the gesture.
        var b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
      }
      unlocked = true;
      if (!document.hidden && ctx.state !== 'running') ctx.resume().catch(function () {});
      if (musicOn && wanted !== undefined && wanted !== (current && current.name)) { startMusic(wanted); }
      startTimer();
    } catch (e) { ctx = null; eng = null; }
  }

  function music(name) {
    if (name !== null && name !== undefined && !TRACKS[name]) return;
    if (name === undefined) name = null;
    wanted = name;
    if (!eng) return;
    if (!musicOn) { if (current) { try { startMusic(null); } catch (e) { /* never break the game for music */ } } return; }
    if ((current && current.name) === name || (!current && name === null)) return;
    try { startMusic(name); } catch (e) { /* never break the game for music */ }
  }

  function setMusicOn(on) {
    musicOn = !!on;
    if (!eng) return;
    try {
      if (!musicOn) { if (current) startMusic(null); }
      else if (wanted && (!current || current.name !== wanted)) startMusic(wanted);
    } catch (e) { /* never break the game for music */ }
  }

  function sfx(name) {
    if (!eng || !SFX.hasOwnProperty(name) || !ctx || ctx.state === 'closed' || document.hidden) return;
    var t = ctx.currentTime;
    if (lastSfx[name] && t - lastSfx[name] < 0.035) return;
    activeEnds = activeEnds.filter(function (e) { return e > t; });
    if (activeEnds.length >= 14) return;
    lastSfx[name] = t; activeEnds.push(t + 1.5);
    try { playSfx(eng, name, t + 0.005, srand); } catch (e) { /* ignore */ }
  }

  function setVolume(v) {
    if (!v || typeof v !== 'object') return;
    var m = clamp01(v.music), s = clamp01(v.sfx);
    if (v.music != null && m != null) { vol.music = m; volSet = true; }
    if (v.sfx != null && s != null) { vol.sfx = s; volSet = true; }
    applyVolume();
  }

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) { stopTimer(); ctx.suspend().catch(function () {}); }
    else if (unlocked) { ctx.resume().catch(function () {}); startTimer(); }
  });

  // Test hook: render a track or a sound offline and hand back the AudioBuffer (dev/av-sound.html).
  function render(kind, name, seconds, opt) {
    opt = opt || {};
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    var sr = opt.sampleRate || 44100, oc = new OAC(2, Math.ceil(sr * seconds), sr), e = Engine(oc);
    e.musicVol.gain.value = taper(opt.music != null ? opt.music : 1) * MUSIC_GAIN;
    e.sfxVol.gain.value = taper(opt.sfx != null ? opt.sfx : 1);
    if (kind === 'music') {
      var p = new Player(e, name, opt.seed || 1); p.start(0.02, 0.01); p.i = opt.startStep || 0; p.scheduleUntil(seconds);
    } else {
      playSfx(e, name, 0.02, mulberry(opt.seed || 3), true);
    }
    return oc.startRendering();
  }

  // For the recorded voice: the shared context (null before the first tap) and how long music should stay ducked.
  function context() { return ctx && ctx.state !== 'closed' ? ctx : null; }
  function duckUntil(t) { voiceUntil = +t || 0; if (eng && ctx && voiceUntil > ctx.currentTime) eng.duck.gain.setTargetAtTime(0.5, ctx.currentTime, 0.08); }

  G.audio = {
    unlock: unlock,
    context: context,
    duckUntil: duckUntil,
    music: music,
    sfx: sfx,
    setVolume: setVolume,
    setMusicOn: setMusicOn,
    _render: render,
    _names: { music: MUSIC_NAMES.slice(), sfx: SFX_NAMES.slice() },
    _state: function () { return { ctx: ctx ? ctx.state : 'none', music: current ? current.name : null, wanted: wanted, musicOn: musicOn, duck: eng ? +eng.duck.gain.value.toFixed(2) : 1, vol: { music: vol.music, sfx: vol.sfx } }; },
    _trim: TRIM
  };
})();
