/* The offline copy for the installed game. Every file is asked from the network first, so a new build always wins;
   what comes back is kept, and when there is no network the kept copy is used instead. When the worker is first
   installed it also fetches what the game needs to start (the page, its scripts and styles, and what the styles
   point at: fonts and backgrounds), so the game opens without a network right after it is installed. Pictures and
   voice clips are kept as they are played with. Started by src/install.js on the published page only. */
var CACHE = 'gromonsters-v1';
function abs(u, base) { return new URL(u, base || self.location.href).href; }
function keep(cache, url) {
  return fetch(url, { cache: 'no-cache' }).then(function (res) {
    if (!res || !res.ok) return null;
    return cache.put(url, res.clone()).then(function () { return res; });
  }).catch(function () { return null; });
}
function precache() {
  return caches.open(CACHE).then(function (cache) {
    var page = abs('index.html');
    return keep(cache, page).then(function (res) {
      if (!res) return null;
      return res.text().then(function (html) {
        var urls = [abs('./'), abs('manifest.webmanifest'), abs('assets/voice/da/index.json')], styles = [];
        html.replace(/(?:src|href)="([^"#?:]+\.(js|css|woff2|png|webmanifest))"/g, function (m, u, ext) {
          var full = abs(u);
          if (ext === 'css') styles.push(full); else if (urls.indexOf(full) < 0) urls.push(full);
          return m;
        });
        var plain = Promise.all(urls.map(function (u) { return keep(cache, u); }));
        // a stylesheet names its fonts and backgrounds: keep those too
        var styled = Promise.all(styles.map(function (css) {
          return keep(cache, css).then(function (r) {
            if (!r) return null;
            return r.text().then(function (text) {
              var refs = [];
              text.replace(/url\(\s*["']?([^"')]+?)["']?\s*\)/g, function (m, u) {
                if (/^data:/.test(u)) return m;
                var f = abs(u, css);
                if (refs.indexOf(f) < 0) refs.push(f);
                return m;
              });
              return Promise.all(refs.map(function (u) { return keep(cache, u); }));
            });
          });
        }));
        return Promise.all([plain, styled]);
      });
    });
  });
}
self.addEventListener('install', function (e) {
  // a start-up file that can not be kept never stops the worker: the game then simply needs a network to open
  e.waitUntil(precache().catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (k) { return k.indexOf('gromonsters-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  // only this site's own GETs are kept. The play data rows (src/playlog.js) are POSTs to the database, on another
  // address: the worker leaves them to the browser, never answers them from the copy and never keeps them.
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var url;
  try { url = new URL(req.url); } catch (er) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic') {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { return c.put(req, copy); }).catch(function () { /* storage full: play on */ });
    }
    return res;
  }, function () {
    return caches.open(CACHE).then(function (c) { return c.match(req, { ignoreSearch: true }); }).then(function (hit) { return hit || Response.error(); });
  }));
});
