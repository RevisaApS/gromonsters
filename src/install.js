/* Install as app. On the published page the game can be put on the tablet's home screen: Chrome and Samsung Internet
   on Android send `beforeinstallprompt` once the page has a manifest, and this keeps that offer so one tap on the
   title's green button shows the browser's own install dialog. Where no offer comes (an iPad, an older browser), the
   button shows the two written steps instead. Once the game runs as an app the button is gone.
     G.install.offered()   true on the published page (or with ?install=1) when not already running as an app
     G.install.ready()     true when the browser's own install dialog can be shown now
     G.install.prompt()    shows it -> Promise of 'accepted' | 'dismissed' | 'none'
     G.install.platform()  'ios' | 'android' | 'other'
     G.install.onChange(fn) -> a function that stops the calls
   It also starts sw.js there, which keeps a copy of what the tablet has loaded so the game still opens without a network. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G, offer = null, installed = false, subs = [];
  var qs = new URLSearchParams(location.search);
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  var onSite = !local || qs.get('install') === '1';
  function tell() { subs.slice().forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); offer = e; tell(); });
  window.addEventListener('appinstalled', function () { offer = null; installed = true; tell(); });
  function standalone() {
    try { return matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true; }
    catch (e) { return false; }
  }
  G.install = {
    offered: function () { return onSite && !installed && !standalone(); },
    ready: function () { return !!offer; },
    platform: function () {
      var ua = navigator.userAgent || '';
      if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
      return /Android/.test(ua) ? 'android' : 'other';
    },
    prompt: function () {
      if (!offer) return Promise.resolve('none');
      var e = offer; offer = null; // the browser lets an offer be shown once
      try {
        return Promise.resolve(e.prompt()).then(function () { return e.userChoice; })
          .then(function (c) { tell(); return (c && c.outcome) || 'dismissed'; }, function () { tell(); return 'none'; });
      } catch (er) { tell(); return Promise.resolve('none'); }
    },
    onChange: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }
  };
  if (onSite && 'serviceWorker' in navigator && (location.protocol === 'https:' || local)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* the game runs fine without it */ }); });
  }
})();
