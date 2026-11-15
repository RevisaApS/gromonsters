/* Living picture, version 2: one cut-out picture of a creature, made to feel alive.

   The picture is stretched over a fine net. Soft "bones" pull areas of the net
   (tail, ears, head, legs, chest). Every pixel still comes from the picture.

   What makes it feel alive (new in version 2):
   - Bones are springs with weight: when the body jumps or lunges, ears and tail
     lag behind and then swing past, like real ones.
   - It blinks, and its eyelids can smile (happy, ^ ^), squeeze (hit) or stay shut (sleep).
   - Its head and face turn a little towards a finger or mouse.
   - It does small things on its own: looks around, twitches an ear, wags, shuffles.
   - Actions have a wind-up, a strike with a short freeze on impact, and a springy settle.
   - Tap it and it squishes like jelly and is happy about it. Stroke it sideways and it smiles.
   - Floating creatures (config.hover) bob and tilt in the air above their shadow.
   - Element sparks (embers, leaves, drops), a ground shadow, dust, hearts, stars, Zzz.
   - It stops drawing while its host is off screen.

   Living(host, imageUrl, config) builds three stacked canvases inside `host`
   (make the host square) and returns
   { attack, hit, hop, happy, grow, sleep, wake, poke, lookAt, on, debug, state, stop }.
   on(name, fn) events: 'impact', 'land', 'grown', 'poke'.

   config (all positions are 0..1 in the picture, x right, y down; creatures face right):
     element: 'fire' | 'leaf' | 'water'
     size:    how much of the host the picture fills (default 0.74)
     offset:  [x, y] shift of the picture in the host (default [0, 0.03])
     ground:  [x, y] where the feet meet the floor (the shadow sits here)
     pivot:   [x, y] point that squash, stretch and lean turn about (default: ground)
     hover:   { h, amp, sp, tilt }  floats h above the ground, bobs by amp at speed sp,
              tilts by tilt radians (leave out for creatures that stand)
     shadow:  shadow half width (default 0.27)
     jump:    how high hops go, 1 = normal (use less for creatures that fill their picture)
     eyes:    [{ c:[x,y], rx, ry, tilt, skin:[x,y], skin2:[x,y] }]   the ellipse must hide the whole eye;
              tilt turns it (radians, for slanted eyes); skin = a spot of plain fur next to the eye for the
              upper lid, skin2 for the lower lid (default: same as skin); lid / lid2:'#rrggbb' set colours directly
     lash:    '#rrggbb' colour of the closed-eye line
     bones:   [{ tag:'tail'|'ear'|'head'|'leg'|'part', type:'rot'|'breath'|'shift',
                 c:[x,y] centre, r (and ry) reach, p:[x,y] pivot, amp, sp, ph, swing, k, d, lag }]
              rot: turns its area about p; breath: stretches its area up and down from p;
              shift: moves its area towards where the creature looks (amp = how far)
     emit:    [{ at:[x,y], rate }] spots that give off element sparks
     strike:  [x, y] where an attack lands (follows the body)
     glow:    0..1 how much bright, saturated parts pulse (lava, glowing eyes) */
(function () {
  'use strict';
  var N = 40, PR = 400, TAU = Math.PI * 2; // net cells per side, size of the colour probe
  var VS = 'attribute vec2 aPos;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(aPos,0.,1.);}';
  // eyelids: the upper lid comes down with an arched edge, the lower one rises with a bowed edge,
  // and both meet on one closed line whose bend is uCurve (+ = ^ happy, - = u sleepy)
  var FS = [
    'precision mediump float;varying vec2 vUV;uniform sampler2D uTex;',
    'uniform float uGlow,uFlash,uAdd,uBlink,uCurve,uEyeN;uniform vec3 uFlashC;uniform vec4 uEye[2];uniform vec2 uRot[2];uniform vec3 uSkin[2],uSkin2[2];uniform vec3 uLash;',
    'void main(){vec4 c=texture2D(uTex,vUV);vec3 rgb=c.a>0.?c.rgb/c.a:vec3(0.);',
    'if(uBlink>.01){for(int i=0;i<2;i++){if(float(i)<uEyeN){',
    ' vec2 q=vUV-uEye[i].xy;q=vec2(q.x*uRot[i].x+q.y*uRot[i].y,q.y*uRot[i].x-q.x*uRot[i].y);vec2 e=q/uEye[i].zw;float d=dot(e,e);',
    ' if(d<1.){float edge=1.-smoothstep(.8,1.,d);float b=uBlink;float x2=e.x*e.x-.4;',
    '  float cu=mix(.9,uCurve,b),cl=mix(-.6,uCurve,b);',
    '  float up=mix(-1.6,.25,b)+cu*x2,lo=mix(1.6,.25,b)+cl*x2;',
    '  if(lo<up)lo=up;',
    '  float cu2=1.-smoothstep(up-.05,up+.05,e.y),cl2=smoothstep(lo-.05,lo+.05,e.y);',
    '  rgb=mix(rgb,uSkin[i],cu2*edge);rgb=mix(rgb,uSkin2[i],cl2*edge);',
    '  float ln=(1.-smoothstep(.06,.15,abs(e.y-up)))*smoothstep(.25,.7,b)*(1.-smoothstep(.6,.88,abs(e.x)));',
    '  rgb=mix(rgb,uLash,ln*edge);}}}}',
    'float mx=max(rgb.r,max(rgb.g,rgb.b));float mn=min(rgb.r,min(rgb.g,rgb.b));',
    'float hot=smoothstep(.55,.95,mx)*smoothstep(.25,.6,mx-mn);',
    'rgb+=rgb*hot*uGlow+uFlashC*uAdd;rgb=mix(rgb,uFlashC,uFlash);gl_FragColor=vec4(rgb*c.a,c.a);}'
  ].join('\n');

  var PAL = {
    fire: ['#ffb02e', '#ff6a1a', '#ffe27a'],
    leaf: ['#7ad63a', '#3fae4a', '#d3f58a'],
    water: ['#49c6f5', '#2f8fe8', '#c9f3ff'],
    plain: ['#ffd166', '#ffffff', '#ffe9a8']
  };
  var AMBIENT = { fire: 'ember', leaf: 'leaf', water: 'drop', plain: 'star' };
  // how each kind of part swings: k = stiffness, d = damping, lag = how much it trails the body
  var KIND = {
    tail: { k: 55, d: 4, lag: 9 }, ear: { k: 140, d: 6, lag: 11 }, head: { k: 90, d: 10, lag: 1.5 },
    leg: { k: 220, d: 20, lag: 0 }, part: { k: 90, d: 5.5, lag: 7 }
  };
  // eyelid bends: plain blink, happy, sleep, squeeze
  var LID = { blink: -0.25, happy: 0.95, sleep: -0.5, squeeze: 0.1 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function layer(stage) {
    var c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none';
    stage.appendChild(c); return c;
  }

  function Living(host, url, cfg) {
    cfg = cfg || {};
    var size = cfg.size || 0.74, off = cfg.offset || [0, 0.03], g = cfg.ground || [0.5, 0.9], pv = cfg.pivot || g;
    var hov = cfg.hover || null, jump = cfg.jump || 1;
    var pal = PAL[cfg.element] || PAL.plain, ambient = AMBIENT[cfg.element] || 'star';
    var WHITE = new Float32Array([1, 1, 1]), HURT = new Float32Array([1, 0.33, 0.36]), LIGHT = new Float32Array(hex(pal[2]));
    var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('still'); // the game's own 'less motion' setting counts too
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:pan-y;cursor:pointer';
    host.appendChild(stage);
    var back = layer(stage), glc = layer(stage), front = layer(stage);
    var bctx = back.getContext('2d'), fctx = front.getContext('2d');
    var gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true });
    if (!gl) return null;

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('Living: shader', gl.getShaderInfoLog(s));
      return s;
    }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error('Living: shader failed', gl.getProgramInfoLog(pr)); return null; }
    gl.useProgram(pr);

    // the net
    var count = (N + 1) * (N + 1), base = new Float32Array(count * 2), pos = new Float32Array(count * 2), idx = [], x, y;
    for (y = 0; y <= N; y++) for (x = 0; x <= N; x++) { var i = (y * (N + 1) + x) * 2; base[i] = x / N; base[i + 1] = y / N; }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { var a = y * (N + 1) + x, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c); }

    // the bones
    var bones = (cfg.bones || []).map(function (o) {
      var kind = KIND[o.tag] || KIND.part, p = o.p || o.c, dx = o.c[0] - p[0], dy = o.c[1] - p[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      return {
        type: o.type || 'rot', tag: o.tag || 'part', c: o.c, r: o.r, ry: o.ry || o.r, p: p,
        amp: o.amp || 0, sp: o.sp || 2, ph: o.ph || 0, swing: o.swing || 0,
        k: o.k || kind.k, d: o.d || kind.d, lag: o.lag === undefined ? kind.lag : o.lag,
        dx: dx / len, dy: dy / len, x: 0, v: 0
      };
    });
    function wgt(bn, u, v) { var ex = (u - bn.c[0]) / bn.r, ey = (v - bn.c[1]) / bn.ry, q = ex * ex + ey * ey; return q >= 1 ? 0 : (1 - q) * (1 - q); }
    var weights = bones.map(function (bn) {
      var w = new Float32Array(count);
      for (var k = 0; k < count; k++) w[k] = wgt(bn, base[k * 2], base[k * 2 + 1]);
      return w;
    });

    var uvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, base, gl.STATIC_DRAW);
    var aUV = gl.getAttribLocation(pr, 'aUV'); gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
    var posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    var aPos = gl.getAttribLocation(pr, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    function U(n) { return gl.getUniformLocation(pr, n); }
    var uGlow = U('uGlow'), uFlash = U('uFlash'), uAdd = U('uAdd'), uFlashC = U('uFlashC'), uBlink = U('uBlink'), uCurve = U('uCurve'), uEyeN = U('uEyeN'), uEye = U('uEye'), uRot = U('uRot'), uSkin = U('uSkin'), uSkin2 = U('uSkin2'), uLash = U('uLash');
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // the picture
    var eyes = (cfg.eyes || []).slice(0, 2), ready = false, tex = gl.createTexture(), img = new Image(), probe = null;
    function sample(u, v) { // colour and alpha of the picture at one spot
      var d = probe.getImageData(clamp(u * PR - 1 | 0, 0, PR - 3), clamp(v * PR - 1 | 0, 0, PR - 3), 3, 3).data, r = 0, gg = 0, bb = 0, al = 0, n = 0;
      for (var k = 0; k < d.length; k += 4) { r += d[k]; gg += d[k + 1]; bb += d[k + 2]; al += d[k + 3]; n++; }
      return [r / n / 255, gg / n / 255, bb / n / 255, al / n / 255];
    }
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var pc = document.createElement('canvas'); pc.width = pc.height = PR;
      probe = pc.getContext('2d', { willReadFrequently: true }); probe.drawImage(img, 0, 0, PR, PR);
      var e4 = [], ro = [], sk = [], sk2 = [];
      eyes.forEach(function (e) {
        e4.push(e.c[0], e.c[1], e.rx, e.ry || e.rx); ro.push(Math.cos(e.tilt || 0), Math.sin(e.tilt || 0));
        var s = e.lid ? hex(e.lid) : sample(e.skin[0], e.skin[1]); sk.push(s[0], s[1], s[2]);
        var s2 = e.lid2 ? hex(e.lid2) : e.skin2 ? sample(e.skin2[0], e.skin2[1]) : s; sk2.push(s2[0], s2[1], s2[2]);
      });
      while (e4.length < 8) { e4.push(-9, -9, 1, 1); ro.push(1, 0); sk.push(0, 0, 0); sk2.push(0, 0, 0); }
      gl.uniform4fv(uEye, new Float32Array(e4)); gl.uniform2fv(uRot, new Float32Array(ro));
      gl.uniform3fv(uSkin, new Float32Array(sk)); gl.uniform3fv(uSkin2, new Float32Array(sk2));
      gl.uniform1f(uEyeN, eyes.length); gl.uniform3fv(uLash, new Float32Array(hex(cfg.lash || '#2a1c1a')));
      ready = true; host.dataset.ready = '1';
    };
    img.src = url;

    // moving state
    function S() { return { x: 0, v: 0 }; }
    var ch = { ox: S(), oy: S(), rot: S(), sq: S(), st: S(), gs: S() };     // body springs (st = stretch along x)
    var tg = { ox: 0, oy: 0, rot: 0, sq: 0, st: 0, gs: 0 };                 // where each wants to go
    var air = 0, flip = 1, strike = 0, flash = 0, add = 0, flashC = WHITE, glowAdd = 0; // set by actions each frame
    var look = { x: 0, y: 0, tx: 0, ty: 0, hold: 0 };
    var dent = { c: [0.5, 0.5], x: 0, v: 0 };
    var mood = { close: 0, curve: LID.blink, tClose: 0, tCurve: LID.blink };
    var blink = { t: -1, next: rnd(1, 3), again: false, gap: 0 };
    var wag = 0, tippy = 0, pet = 0, gesture = rnd(1.5, 3), sleeping = false, zzz = 0, rise = 0;
    var B = { ox: 0, oy: 0, sx: 1, sy: 1, cs: 1, sn: 0 };
    var prev = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
    var act = null, T = 0, last = 0, freeze = 0, shake = 0, raf = 0, dbg = !!cfg.debug, onScreen = true, stopped = false;
    var parts = [], handlers = {}, tmp = [0, 0];

    function fire(name) { (handlers[name] || []).forEach(function (f) { f(); }); }

    // where a picture point ends up after bones, jelly and body. k = net index, or -1 for any point
    function warp(px, py, k, out) {
      var ox = 0, oy = 0, w, bn, s, bi;
      for (bi = 0; bi < bones.length; bi++) {
        bn = bones[bi]; w = k < 0 ? wgt(bn, px, py) : weights[bi][k]; if (!w) continue;
        if (bn.type === 'rot') {
          s = bn.x * w; var rx = px - bn.p[0], ry = py - bn.p[1], cs = Math.cos(s), sn = Math.sin(s);
          ox += rx * cs - ry * sn - rx; oy += rx * sn + ry * cs - ry;
        } else if (bn.type === 'breath') { s = bn.x * w; oy += (py - bn.p[1]) * s; ox -= (px - bn.p[0]) * s * 0.35; }
        else { ox += look.x * bn.amp * w; oy += look.y * bn.amp * w * 0.7; }
      }
      if (dent.x > 0.002 || dent.x < -0.002) {
        var ex = (px - dent.c[0]) / 0.2, ey = (py - dent.c[1]) / 0.2, q = ex * ex + ey * ey;
        if (q < 1) { w = (1 - q) * (1 - q); ox += (px - dent.c[0]) * dent.x * w; oy += (py - dent.c[1]) * dent.x * w; }
      }
      var X = (px + ox - pv[0]) * B.sx, Y = (py + oy - pv[1]) * B.sy;
      out[0] = pv[0] + X * B.cs - Y * B.sn + B.ox; out[1] = pv[1] + X * B.sn + Y * B.cs + B.oy;
    }
    // picture point -> place on the stage (0..1)
    function stg(u, v) { return [0.5 + (u - 0.5) * size + off[0], 0.5 + (v - 0.5) * size + off[1]]; }
    function at(u, v) { warp(u, v, -1, tmp); return stg(tmp[0], tmp[1]); }

    // ---------- small effects ----------
    function emit(type, sx, sy, o) {
      if (parts.length > 160) return;
      o = o || {};
      parts.push({
        type: type, x: sx, y: sy, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, life: 0, max: o.max || 1,
        size: o.size || 0.02, rot: o.rot === undefined ? rnd(0, TAU) : o.rot, vr: o.vr || 0,
        col: o.col || pal[(Math.random() * pal.length) | 0], sway: rnd(0, TAU)
      });
    }
    function spark(sx, sy, power) { // one element spark drifting off
      if (ambient === 'ember') emit('ember', sx, sy, { vx: rnd(-0.03, 0.03), vy: rnd(-0.16, -0.08) * power, max: rnd(0.7, 1.3), size: rnd(0.008, 0.016) });
      else if (ambient === 'leaf') emit('leaf', sx, sy, { vx: rnd(-0.07, 0.03), vy: rnd(-0.03, 0.05), g: 0.05, max: rnd(1.4, 2.2), size: rnd(0.014, 0.022), vr: rnd(-3, 3) });
      else if (ambient === 'drop') emit('drop', sx, sy, { vx: rnd(-0.03, 0.03), vy: rnd(-0.12, -0.05) * power, max: rnd(0.8, 1.4), size: rnd(0.007, 0.014) });
      else emit('star', sx, sy, { vy: -0.05, max: 0.7, size: 0.014 });
    }
    function burst(sx, sy, n, speed) {
      for (var k = 0; k < n; k++) {
        var an = rnd(0, TAU), sp = rnd(0.4, 1) * speed;
        emit(ambient === 'star' ? 'star' : ambient, sx, sy, { vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 0.05, g: ambient === 'ember' ? -0.1 : 0.5, max: rnd(0.4, 0.75), size: rnd(0.012, 0.024), vr: rnd(-6, 6) });
      }
    }
    function dust(n) {
      if (hov) { var b = at(pv[0], pv[1] + 0.15); for (var j = 0; j < n; j++) spark(b[0] + rnd(-0.1, 0.1), b[1], 0.6); return; }
      var p = stg(g[0] + B.ox, g[1]);
      for (var k = 0; k < n; k++) emit('dust', p[0] + rnd(-0.12, 0.12), p[1] + rnd(-0.01, 0.01), { vx: rnd(-0.12, 0.12), vy: rnd(-0.05, -0.01), max: rnd(0.35, 0.6), size: rnd(0.016, 0.03), col: 'rgba(160,150,140,1)' });
    }
    function hearts(n) {
      var e = eyes[0] ? at(eyes[0].c[0], eyes[0].c[1] - 0.12) : at(0.5, 0.25);
      for (var k = 0; k < n; k++) emit('heart', e[0] + rnd(-0.1, 0.1), e[1] + rnd(-0.03, 0.03), { vx: rnd(-0.03, 0.03), vy: rnd(-0.16, -0.09), max: rnd(0.8, 1.2), size: rnd(0.018, 0.028), col: '#ff5d8f', rot: rnd(-0.3, 0.3) });
    }
    function once(a, key, when, fn) { if (when && !a[key]) { a[key] = 1; fn(); } }
    function kickTag(tag, v) { bones.forEach(function (bn, n) { if (bn.tag === tag) bn.v += v * (n % 2 ? -1 : 1) * rnd(0.7, 1.2); }); }
    function happyEyes() { mood.tClose = 1; mood.tCurve = LID.happy; }

    // ---------- actions: each one sets where the body wants to be for this frame ----------
    var ACT = {
      attack: {
        len: 1.05, fn: function (u, a) {
          if (u < 0.3) { // wind-up: lean back, crouch, gather in, narrow the eyes
            var w = ease(u / 0.3); tg.ox = -0.1 * w; tg.sq = -0.13 * w; tg.st = -0.07 * w; tg.rot = -0.1 * w;
            mood.tClose = 0.4; mood.tCurve = LID.squeeze; strike = -0.6 * w;
          } else if (u < 0.52) { tg.ox = 0.16; tg.rot = 0.12; tg.sq = 0.02; tg.st = 0.14; strike = 1; }
          else { var r = 1 - ease((u - 0.52) / 0.38); tg.ox = 0.16 * r; tg.rot = 0.06 * r; tg.st = 0.03 * r; strike = r; }
          once(a, 'go', u >= 0.3, function () { ch.ox.v += 2.4; ch.st.v += 2; });
          once(a, 'hit', u >= 0.42, function () {
            freeze = 0.09; shake = 1; ch.sq.v -= 1.6;
            var s = cfg.strike || [0.95, 0.52], p = at(s[0], s[1]);
            p[0] = clamp(p[0], 0.15, 0.84); p[1] = clamp(p[1], 0.15, 0.85);
            emit('slash', p[0], p[1], { max: 0.24, size: 0.13, rot: -0.5, col: pal[2] });
            emit('ring', p[0], p[1], { max: 0.4, size: 0.12, col: pal[0] });
            burst(p[0], p[1], still ? 4 : 12, 0.32); fire('impact');
          });
        }
      },
      hit: {
        len: 0.8, fn: function (u, a) {
          flash = Math.max(0, 0.7 - u * 2.8); flashC = HURT;
          var r = u < 0.25 ? 1 : 1 - ease((u - 0.25) / 0.55);
          tg.ox = -0.1 * r; tg.rot = -0.14 * r; tg.st = -0.06 * r; mood.tClose = u < 0.6 ? 1 : 0; mood.tCurve = LID.squeeze;
          once(a, 'go', true, function () {
            shake = 0.7; ch.ox.v -= 2.5; ch.sq.v += 1.8; kickTag('ear', 5); kickTag('tail', 4); kickTag('part', 4);
            var p = at(0.5, 0.3);
            for (var k = 0; k < 5; k++) emit('star', p[0] + rnd(-0.08, 0.08), p[1] + rnd(-0.06, 0.06), { vx: rnd(-0.25, 0.1), vy: rnd(-0.3, -0.1), g: 0.6, max: rnd(0.5, 0.8), size: rnd(0.016, 0.026), col: '#ffe066', vr: rnd(-8, 8) });
          });
        }
      },
      hop: {
        len: 0.85, fn: function (u, a) {
          if (u < 0.22) tg.sq = -0.17 * ease(u / 0.22);
          else if (u < 0.78) { var v = (u - 0.22) / 0.56; air = -0.24 * jump * 4 * v * (1 - v); tg.sq = 0.1 * (1 - v); }
          once(a, 'up', u >= 0.22, function () { ch.sq.v += 2.2; });
          once(a, 'land', u >= 0.78, function () { ch.sq.v -= 3; dust(still ? 2 : 6); fire('land'); });
        }
      },
      happy: {
        len: 1.7, fn: function (u, a) {
          mood.tClose = u < 0.88 ? 1 : 0; mood.tCurve = LID.happy; wag = 1; tippy = u > 0.72 && u < 0.95 ? 1 : 0;
          var hopU = function (s, e, h, spin) {
            if (u < s || u >= e) return;
            var v = (u - s) / (e - s);
            if (v < 0.22) tg.sq = -0.14 * ease(v / 0.22);
            else if (v < 0.86) { var w = (v - 0.22) / 0.64; air = -h * jump * 4 * w * (1 - w); tg.sq = 0.07 * (1 - w); if (spin && !still) flip = Math.cos(TAU * ease(w)); }
          };
          hopU(0, 0.4, 0.26, true); hopU(0.4, 0.72, 0.15, false);
          once(a, 'go', true, function () { hearts(still ? 1 : 3); });
          once(a, 'l1', u >= 0.345, function () { ch.sq.v -= 2.4; dust(4); });
          once(a, 'l2', u >= 0.675, function () { ch.sq.v -= 1.8; dust(3); var p = at(0.5, 0.3); burst(p[0], p[1], still ? 2 : 6, 0.3); });
        }
      },
      grow: {
        len: 1.9, fn: function (u, a) {
          if (u < 0.5) {
            var w = u / 0.5; tg.sq = -0.09 * w; tg.gs = -0.06 * w;
            add = w * 0.3 + Math.sin(T * 26) * 0.06 * w; flashC = LIGHT; flash = w > 0.85 ? (w - 0.85) * 4 : 0; glowAdd = w;
            if (!still) tg.ox = Math.sin(T * 70) * 0.006 * w;
            if (!still && Math.random() < 0.5) { // sparks pulled in towards the body
              var an = rnd(0, TAU), c0 = at(0.5, 0.55), rr = rnd(0.3, 0.4);
              emit('star', c0[0] + Math.cos(an) * rr, c0[1] + Math.sin(an) * rr, { vx: -Math.cos(an) * rr * 2.4, vy: -Math.sin(an) * rr * 2.4, max: 0.4, size: rnd(0.01, 0.018), col: pal[2] });
            }
          } else {
            var r = (u - 0.5) / 0.5; flash = Math.max(0, 0.9 - r * 4); add = Math.max(0, 0.4 - r * 1.2); flashC = LIGHT; tg.gs = 0.1 * (1 - ease(r));
            if (r < 0.7) happyEyes(); else mood.tClose = 0;
            wag = 1;
          }
          once(a, 'pop', u >= 0.5, function () {
            ch.gs.v += 4.5; ch.sq.v += 2.2; freeze = 0.06; shake = 0.6;
            var c0 = at(0.5, 0.55);
            emit('ring', c0[0], c0[1], { max: 0.55, size: 0.36, col: pal[2] });
            emit('ring', c0[0], c0[1], { max: 0.75, size: 0.5, col: pal[0] });
            burst(c0[0], c0[1], still ? 6 : 20, 0.55); kickTag('ear', 6); kickTag('tail', 5); kickTag('part', 5); fire('grown');
          });
        }
      },
      poke: {
        len: 0.9, fn: function (u) { if (u < 0.7) happyEyes(); wag = u < 0.8 ? 1 : 0; }
      },
      wake: {
        len: 0.6, fn: function (u, a) {
          if (u < 0.7) { var v = u / 0.7; air = -0.07 * 4 * v * (1 - v); }
          once(a, 'go', true, function () { kickTag('ear', 7); kickTag('part', 4); blink.t = 0; blink.again = true; });
          once(a, 'land', u >= 0.7, function () { ch.sq.v -= 1.4; });
        }
      }
    };
    function go(name) { return function () { if (sleeping && name !== 'wake') { sleeping = false; } act = { name: name, t: 0, len: ACT[name].len, fn: ACT[name].fn }; }; }

    // ---------- what it does on its own ----------
    function idle(dt) {
      if (still || sleeping) return;
      gesture -= dt;
      if (gesture > 0) return;
      gesture = rnd(1.6, 3.8);
      var r = Math.random();
      if (r < 0.3) { if (look.hold <= 0) { look.tx = rnd(-1, 1); look.ty = rnd(-0.5, 0.6); look.hold = -rnd(0.9, 2); } }
      else if (r < 0.5) { kickTag('ear', rnd(4, 7)); kickTag('part', rnd(2, 4)); }
      else if (r < 0.68) wag = 1.3;
      else if (r < 0.84) { ch.sq.v -= 1.1; kickTag('head', 0.8); }
      else if (r < 0.93) tippy = 0.9;
      else { blink.t = 0; blink.again = true; kickTag('ear', 3); }
    }

    function resize(c, W, H) { if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } }
    function step(s, target, k, d, dt) { s.v += (k * (target - s.x) - d * s.v) * dt; s.x += s.v * dt; }

    function frame(ms) {
      if (stopped || !onScreen) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
      if (!ready) return;
      var real = last ? Math.min(0.034, (ms - last) / 1000) : 0.016; last = ms;
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(stage.clientWidth * dpr), H = Math.round(stage.clientHeight * dpr);
      if (!W || !H) return;
      resize(glc, W, H); resize(back, W, H); resize(front, W, H);
      var dt = real; if (freeze > 0) { freeze -= real; dt = 0; }
      T += dt;

      // 1. what the body wants this frame
      tg.ox = tg.oy = tg.rot = tg.sq = tg.st = tg.gs = 0; air = 0; flip = 1; strike = 0; flash = 0; add = 0; flashC = WHITE; glowAdd = 0;
      mood.tClose = sleeping ? 1 : 0; mood.tCurve = sleeping ? LID.sleep : LID.blink;
      if (wag > 0) wag = Math.max(0, wag - dt); if (tippy > 0) tippy = Math.max(0, tippy - dt);
      if (act) { act.t += dt; if (act.t >= act.len) act = null; else act.fn(act.t / act.len, act); }
      else idle(dt);
      if (pet > 0) { pet = Math.max(0, pet - dt); if (!sleeping) { happyEyes(); wag = Math.max(wag, 0.3); } }
      if (sleeping) {
        tg.sq = -0.07; tg.rot = 0.02;
        zzz -= dt; if (zzz <= 0 && !still) { zzz = 1.1; var zp = eyes[0] ? at(eyes[0].c[0] + 0.06, eyes[0].c[1] - 0.14) : at(0.6, 0.2); emit('z', zp[0], zp[1], { vx: 0.04, vy: -0.07, max: 1.8, size: 0.045, col: '#7b8fb8', rot: 0 }); }
      }

      // 2. body springs
      step(ch.ox, tg.ox, 420, 30, dt); step(ch.oy, tg.oy, 420, 30, dt); step(ch.rot, tg.rot, 300, 24, dt);
      step(ch.sq, tg.sq, 260, 11, dt); step(ch.st, tg.st, 300, 16, dt); step(ch.gs, tg.gs, 170, 11, dt);
      ch.sq.x = clamp(ch.sq.x, -0.3, 0.3); ch.st.x = clamp(ch.st.x, -0.25, 0.25);
      var breathe = still ? 0 : Math.sin(T * (sleeping ? 1.0 : 1.9)) * (sleeping ? 0.014 : 0.006);
      var sc = 1 + ch.gs.x, hy = 0, tilt = 0;
      if (hov) { // floating: bob and tilt, sink a little when asleep
        var hs = (hov.sp || 1.6) * (sleeping ? 0.5 : 1), bob = still ? 0 : Math.sin(T * hs);
        rise += ((sleeping ? 0.45 : 1) - rise) * Math.min(1, dt * 1.5);
        hy = -(hov.h || 0.05) * rise - (hov.amp || 0.025) * bob;
        tilt = still ? 0 : (hov.tilt === undefined ? 0.04 : hov.tilt) * Math.sin(T * hs - 1.1);
      }
      B.sx = (1 - ch.sq.x * 0.75 - breathe * 0.5) * (1 + ch.st.x) * sc * flip; B.sy = (1 + ch.sq.x + breathe) * (1 - ch.st.x * 0.4) * sc;
      B.cs = Math.cos(ch.rot.x + tilt); B.sn = Math.sin(ch.rot.x + tilt); B.ox = ch.ox.x; B.oy = ch.oy.x + air + hy;

      // 3. how fast the body moves, so loose parts can trail behind it
      if (dt > 0) {
        var vx = (B.ox - prev.x) / dt, vy = (B.oy - prev.y) / dt;
        prev.ax += ((vx - prev.vx) / dt - prev.ax) * 0.5; prev.ay += ((vy - prev.vy) / dt - prev.ay) * 0.5;
        prev.ax = clamp(prev.ax, -30, 30); prev.ay = clamp(prev.ay, -30, 30);
        prev.vx = vx; prev.vy = vy; prev.x = B.ox; prev.y = B.oy;
      }
      var Fx = -prev.ax * 0.22 - prev.vx * 0.5, Fy = -prev.ay * 0.22 - prev.vy * 0.5;

      // 4. bones
      var calm = sleeping ? 0.3 : 1, bi, bn;
      for (bi = 0; bi < bones.length; bi++) {
        bn = bones[bi];
        if (bn.type === 'breath') { bn.x = still ? 0 : Math.sin(T * bn.sp * (sleeping ? 0.55 : 1) + bn.ph) * bn.amp * (sleeping ? 2.2 : 1); continue; }
        if (bn.type !== 'rot') continue;
        var target = still ? 0 : (Math.sin(T * bn.sp + bn.ph) + 0.4 * Math.sin(T * bn.sp * 1.73 + bn.ph * 2.3)) * bn.amp * calm;
        target += bn.swing * strike;
        if (bn.tag === 'tail' && wag > 0) target += Math.sin(T * 24) * 0.2 * Math.min(1, wag * 3);
        if (bn.tag === 'leg' && tippy > 0) target += Math.sin(T * 26 + bi * Math.PI) * 0.16 * Math.min(1, tippy * 4);
        if (bn.tag === 'head' && sleeping) target += 0.06;
        if (dt > 0) {
          bn.v += (bn.k * (target - bn.x) - bn.d * bn.v + bn.lag * (bn.dx * Fy - bn.dy * Fx)) * dt;
          bn.x = clamp(bn.x + bn.v * dt, -0.7, 0.7);
        }
      }

      // 5. eyes, look, jelly
      blink.next -= dt;
      if (blink.gap > 0) { blink.gap -= dt; if (blink.gap <= 0) blink.t = 0; }
      if (blink.next <= 0 && blink.t < 0 && blink.gap <= 0 && !still) { blink.t = 0; blink.next = rnd(1.6, 4.6); blink.again = Math.random() < 0.2; }
      var bl = 0;
      if (blink.t >= 0) {
        blink.t += dt; var q = blink.t / 0.2;
        bl = q < 0.35 ? ease(q / 0.35) : q < 0.55 ? 1 : 1 - ease((q - 0.55) / 0.45);
        if (q >= 1) { bl = 0; blink.t = -1; if (blink.again) { blink.again = false; blink.gap = 0.09; } }
      }
      mood.close += (mood.tClose - mood.close) * Math.min(1, dt * (mood.tClose > mood.close ? 22 : 10));
      mood.curve += (mood.tCurve - mood.curve) * Math.min(1, dt * 14);
      if (look.hold > 0) { look.hold -= dt; if (look.hold <= 0) { look.tx = 0; look.ty = 0; } }
      else if (look.hold < 0) { look.hold += dt; if (look.hold >= 0) { look.hold = 0; look.tx = 0; look.ty = 0; } }
      if (sleeping) { look.tx = 0.2; look.ty = 0.9; }
      look.x += (look.tx - look.x) * Math.min(1, dt * 7); look.y += (look.ty - look.y) * Math.min(1, dt * 7);
      dent.v += (-190 * dent.x - 9 * dent.v) * dt; dent.x += dent.v * dt;

      // 6. the net
      for (var k = 0; k < count; k++) {
        warp(base[k * 2], base[k * 2 + 1], k, tmp);
        pos[k * 2] = ((tmp[0] - 0.5) * size + off[0]) * 2; pos[k * 2 + 1] = -((tmp[1] - 0.5) * size + off[1]) * 2;
      }
      if (shake > 0.01) { shake *= Math.pow(0.0006, real); stage.style.transform = still ? '' : 'translate(' + (Math.sin(ms * 0.09) * shake * 7).toFixed(1) + 'px,' + (Math.cos(ms * 0.13) * shake * 5).toFixed(1) + 'px)'; }
      else if (shake) { shake = 0; stage.style.transform = ''; }

      gl.viewport(0, 0, W, H);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      var gbase = cfg.glow === undefined ? 0.2 : cfg.glow;
      gl.uniform1f(uGlow, gbase * (still ? 0.7 : 1 + Math.sin(T * 3.1)) + glowAdd * 0.6);
      gl.uniform1f(uFlash, clamp(flash, 0, 1)); gl.uniform1f(uAdd, clamp(add, 0, 1)); gl.uniform3fv(uFlashC, flashC);
      // the plain blink keeps the plain lid bend, so it never shows a happy curve by mistake
      var cl = Math.max(bl, mood.close), cv = mood.close >= bl ? mood.curve : LID.blink;
      gl.uniform1f(uBlink, clamp(cl, 0, 1)); gl.uniform1f(uCurve, cv);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

      // 7. shadow behind, sparks in front
      bctx.clearRect(0, 0, W, H);
      var gp = stg(g[0] + B.ox, g[1] + ch.oy.x);
      var lift = clamp((-air - hy) * 2.2, 0, 0.7), sw = (cfg.shadow || 0.27) * size * (1 - lift) * Math.abs(B.sx);
      bctx.fillStyle = 'rgba(10,20,40,' + (0.2 * (1 - lift * 0.8)).toFixed(3) + ')';
      bctx.beginPath(); bctx.ellipse(gp[0] * W, gp[1] * H, sw * W, sw * W * 0.2, 0, 0, TAU); bctx.fill();

      if (!still && cfg.emit && dt > 0) {
        cfg.emit.forEach(function (e) {
          if (Math.random() < (e.rate || 1.5) * dt * (sleeping ? 0.3 : 1)) { var p = at(e.at[0], e.at[1]); spark(p[0] + rnd(-0.01, 0.01), p[1], 1); }
        });
      }
      fctx.clearRect(0, 0, W, H);
      for (var pi = parts.length - 1; pi >= 0; pi--) {
        var p = parts[pi]; p.life += dt;
        if (p.life >= p.max) { parts.splice(pi, 1); continue; }
        p.vy += p.g * dt; p.x += (p.vx + (p.type === 'leaf' || p.type === 'drop' || p.type === 'ember' ? Math.sin(T * 3 + p.sway) * 0.02 : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        drawPart(fctx, p, W, H);
      }
      fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over';
      if (dbg) drawDebug(W, H);
    }

    function drawPart(c, p, W, H) {
      var u = p.life / p.max, al = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85, s = p.size * W, X = p.x * W, Y = p.y * H;
      c.globalAlpha = clamp(al, 0, 1); c.globalCompositeOperation = 'source-over'; c.fillStyle = p.col; c.strokeStyle = p.col;
      if (p.type === 'ember') {
        c.globalCompositeOperation = 'lighter';
        var gr = c.createRadialGradient(X, Y, 0, X, Y, s * 2.2); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.35, p.col); gr.addColorStop(1, 'rgba(255,90,0,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(X, Y, s * 2.2, 0, TAU); c.fill();
      } else if (p.type === 'leaf') {
        c.save(); c.translate(X, Y); c.rotate(p.rot); c.scale(s, s * (0.55 + 0.45 * Math.cos(p.life * 5 + p.sway)));
        c.beginPath(); c.moveTo(-1, 0); c.quadraticCurveTo(0, -0.75, 1, 0); c.quadraticCurveTo(0, 0.75, -1, 0); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.09; c.beginPath(); c.moveTo(-0.8, 0); c.lineTo(0.8, 0); c.stroke(); c.restore();
      } else if (p.type === 'drop') {
        c.beginPath(); c.arc(X, Y, s, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(X - s * 0.3, Y - s * 0.3, s * 0.32, 0, TAU); c.fill();
      } else if (p.type === 'star') {
        c.save(); c.translate(X, Y); c.rotate(p.rot); c.scale(s, s);
        c.beginPath(); for (var k = 0; k < 4; k++) { var a0 = k * TAU / 4; c.lineTo(Math.cos(a0), Math.sin(a0)); c.lineTo(Math.cos(a0 + TAU / 8) * 0.3, Math.sin(a0 + TAU / 8) * 0.3); }
        c.closePath(); c.fill(); c.restore();
      } else if (p.type === 'heart') {
        c.save(); c.translate(X, Y); c.rotate(p.rot); c.scale(s, s);
        c.beginPath(); c.moveTo(0, 0.9); c.bezierCurveTo(-1.5, -0.2, -0.6, -1.2, 0, -0.4); c.bezierCurveTo(0.6, -1.2, 1.5, -0.2, 0, 0.9); c.fill(); c.restore();
      } else if (p.type === 'dust') {
        c.globalAlpha *= 0.5; c.beginPath(); c.arc(X, Y, s * (0.6 + u), 0, TAU); c.fill();
      } else if (p.type === 'ring') {
        c.lineWidth = Math.max(1, s * 0.16 * (1 - u)); c.beginPath(); c.arc(X, Y, s * (0.25 + u * 0.9), 0, TAU); c.stroke();
      } else if (p.type === 'slash') {
        c.save(); c.translate(X, Y); c.rotate(p.rot); c.scale(s * (0.8 + u * 0.5), s * (0.8 + u * 0.5));
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, 1, -1.1, 1.1); c.arc(-0.45, 0, 1.15, 0.85, -0.85, true); c.closePath(); c.fill();
        c.globalAlpha *= 0.6; c.fillStyle = p.col; c.beginPath(); c.arc(0.06, 0, 1.06, -1.2, 1.2); c.arc(-0.3, 0, 1.2, 0.95, -0.95, true); c.closePath(); c.fill(); c.restore();
      } else if (p.type === 'z') {
        c.font = '700 ' + Math.round(s * (0.7 + u * 0.9)) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('z', X, Y);
      }
    }

    function drawDebug(W, H) {
      var c = fctx; c.lineWidth = 1.5; c.font = '11px monospace';
      function P(u, v) { var s = stg(u, v); return [s[0] * W, s[1] * H]; }
      bones.forEach(function (bn, n) {
        var cc = P(bn.c[0], bn.c[1]), pp = P(bn.p[0], bn.p[1]);
        c.strokeStyle = bn.type === 'rot' ? '#ff3b8d' : bn.type === 'breath' ? '#00b3ff' : '#ffd000';
        c.beginPath(); c.ellipse(cc[0], cc[1], bn.r * size * W, bn.ry * size * H, 0, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(pp[0], pp[1]); c.lineTo(cc[0], cc[1]); c.stroke();
        c.fillStyle = c.strokeStyle; c.fillRect(pp[0] - 3, pp[1] - 3, 6, 6); c.fillText(bn.tag + n, cc[0] + 4, cc[1] - 4);
      });
      eyes.forEach(function (e) {
        var cc = P(e.c[0], e.c[1]); c.strokeStyle = '#00ff66'; c.beginPath(); c.ellipse(cc[0], cc[1], e.rx * size * W, (e.ry || e.rx) * size * H, e.tilt || 0, 0, TAU); c.stroke();
        [e.skin, e.skin2].forEach(function (s, n) { if (!s) return; var q = P(s[0], s[1]); c.fillStyle = n ? '#00c8ff' : '#00ff66'; c.fillRect(q[0] - 3, q[1] - 3, 6, 6); });
      });
      var gp = P(g[0], g[1]); c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(gp[0] - 30, gp[1]); c.lineTo(gp[0] + 30, gp[1]); c.stroke();
      var pq = P(pv[0], pv[1]); c.strokeStyle = '#fff'; c.beginPath(); c.arc(pq[0], pq[1], 5, 0, TAU); c.stroke();
      if (cfg.strike) { var sq = P(cfg.strike[0], cfg.strike[1]); c.strokeStyle = '#ff2222'; c.beginPath(); c.moveTo(sq[0] - 6, sq[1] - 6); c.lineTo(sq[0] + 6, sq[1] + 6); c.moveTo(sq[0] + 6, sq[1] - 6); c.lineTo(sq[0] - 6, sq[1] + 6); c.stroke(); }
      (cfg.emit || []).forEach(function (e) { var q = P(e.at[0], e.at[1]); c.fillStyle = '#ff8800'; c.beginPath(); c.arc(q[0], q[1], 4, 0, TAU); c.fill(); });
    }

    // ---------- touch ----------
    function local(ev) { var r = stage.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; }
    function toPic(s) { return [(s[0] - 0.5 - off[0]) / size + 0.5 - B.ox, (s[1] - 0.5 - off[1]) / size + 0.5 - B.oy]; }
    function onBody(p) { return p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1 && sample(p[0], p[1])[3] > 0.15; }
    function lookAt(s) {
      if (sleeping) return;
      var h = eyes[0] ? at(eyes[0].c[0], eyes[0].c[1]) : [0.5, 0.35];
      look.tx = clamp((s[0] - h[0]) * 3, -1, 1); look.ty = clamp((s[1] - h[1]) * 3, -1, 1); look.hold = 1.6;
    }
    function poke(u, v) {
      if (sleeping) { sleeping = false; go('wake')(); return; }
      dent.c = [u, v]; dent.v = -7; ch.sq.v -= 1.5; kickTag('ear', 5); kickTag('part', 3);
      if (!act || act.name === 'poke') { go('poke')(); }
      hearts(still ? 1 : 2); fire('poke');
    }
    var press = null; // a finger or mouse held down: stroking it sideways makes it smile
    stage.addEventListener('pointermove', function (ev) {
      var s = local(ev); lookAt(s);
      if (!press || !ready || sleeping) return;
      press.d += Math.abs(s[0] - press.x) + Math.abs(s[1] - press.y); press.x = s[0]; press.y = s[1];
      if (press.d > 0.12) {
        press.d = 0; var p = toPic(s);
        if (onBody(p)) { pet = 0.7; dent.c = p; dent.v -= 2.5; kickTag('ear', 2); if (Math.random() < 0.5) hearts(1); }
      }
    });
    stage.addEventListener('pointerleave', function () { look.hold = 0.4; press = null; });
    stage.addEventListener('pointerup', function () { press = null; });
    stage.addEventListener('pointercancel', function () { press = null; });
    stage.addEventListener('pointerdown', function (ev) {
      if (!ready) return;
      var s = local(ev), p = toPic(s); press = { x: s[0], y: s[1], d: 0 };
      if (onBody(p)) poke(p[0], p[1]);
    });

    // draw only while the host is on screen
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        onScreen = es[es.length - 1].isIntersecting;
        if (onScreen && !raf && !stopped) { last = 0; raf = requestAnimationFrame(frame); }
      }, { rootMargin: '120px' }).observe(host);
    }
    raf = requestAnimationFrame(frame);
    return {
      attack: go('attack'), hit: go('hit'), hop: go('hop'), happy: go('happy'), grow: go('grow'),
      sleep: function () { sleeping = true; act = null; }, wake: function () { if (sleeping) { sleeping = false; go('wake')(); } },
      poke: poke, lookAt: lookAt,
      on: function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); },
      debug: function (v) { dbg = v; },
      state: function () { return { act: act && act.name, sleeping: sleeping, onScreen: onScreen, parts: parts.length, bones: bones.map(function (b) { return +b.x.toFixed(3); }), sq: +ch.sq.x.toFixed(3) }; },
      stop: function () { stopped = true; cancelAnimationFrame(raf); raf = 0; }
    };
  }
  window.Living = Living;
})();
