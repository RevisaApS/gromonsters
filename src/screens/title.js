/* Title: the island at night under a full aurora, the logo, play, languages and the players. SPEC.md 7, screen 1; SPEC-2.md 6. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  // names are plain text typed by a child: escape them wherever they go into HTML
  G.esc = G.esc || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  G.i18n.add({
    da: { 'title.sub': 'Nordlysøen', 'title.play': 'Spil', 'title.new': 'Ny spiller', 'title.hi': 'Tryk på den gule knap og kom i gang!',
      'title.who': 'Hvem spiller?', 'title.playAs': 'Spil som {name}', 'title.manage': 'Ret spillere', 'title.aurora': 'Nordlys {n}' },
    en: { 'title.sub': 'Aurora Island', 'title.play': 'Play', 'title.new': 'New player', 'title.hi': 'Tap the yellow button to play.',
      'title.who': 'Who is playing?', 'title.playAs': 'Play as {name}', 'title.manage': 'Edit players', 'title.aurora': 'Aurora {n}' }
  });

  // for the grown-up who opens the link: put the game on the home screen like an app. Gone once it runs as one.
  G.i18n.add({
    da: { 'install.btn': 'Installer som app', 'install.title': 'Få Gromonsters som app',
      'install.android': 'Tryk på de tre prikker øverst til højre i Chrome. Vælg "Føj til startskærm" eller "Installer app".',
      'install.ios': 'Tryk på Del-knappen i Safari. Vælg "Føj til hjemmeskærm".',
      'install.other': 'Åbn siden i Chrome på tabletten. Så kan spillet installeres som app.', 'install.close': 'Luk' },
    en: { 'install.btn': 'Install as app', 'install.title': 'Get Gromonsters as an app',
      'install.android': 'Tap the three dots at the top right of Chrome. Choose "Add to Home screen" or "Install app".',
      'install.ios': 'Tap the Share button in Safari. Choose "Add to Home Screen".',
      'install.other': 'Open the page in Chrome on the tablet. Then the game can be installed as an app.', 'install.close': 'Close' }
  });
  function installSteps(root) {
    var old = root.querySelector('.install-over'); if (old) old.remove();
    var over = G.el('div', 'install-over'), card = G.el('div', 'install-card panel pop-in');
    card.appendChild(G.el('div', 'install-title h', G.icon('download') + '<span>' + G.t('install.title') + '</span>'));
    card.appendChild(G.el('div', 'install-text', G.esc(G.t('install.' + G.install.platform()))));
    var ok = G.el('button', 'btn btn-green install-close', G.t('install.close')); ok.type = 'button'; ok.dataset.act = 'install-close';
    G.tap(ok, function () { over.remove(); });
    card.appendChild(ok); over.appendChild(card); root.appendChild(over);
  }
  function installButton(root) {
    if (!G.install || !G.install.offered()) return;
    var b = G.el('button', 'btn btn-green install-btn', G.icon('download') + '<span>' + G.t('install.btn') + '</span>');
    b.type = 'button'; b.dataset.act = 'install';
    G.tap(b, function () {
      if (!G.install.ready()) { installSteps(root); return; }
      G.install.prompt().then(function (r) { if (r === 'accepted') b.remove(); else if (r === 'none') installSteps(root); });
    });
    root.appendChild(b);
  }

  var aur = null, stopInstall = null;
  function startProfile(slot) {
    if (!G.openProfile(slot)) return;
    if (!G.profile.introDone) G.go('battle', { wildId: 'crabbi', regionId: 'bay', mode: 'intro' });
    else G.go('camp');
  }

  function render(root) {
    if (aur) { aur.destroy(); aur = null; }
    root.innerHTML = '';
    root.appendChild(G.el('div', 'bg bg-title'));
    var cv = G.el('canvas', 'title-aurora'); root.appendChild(cv);
    aur = G.aurora(cv, 7);

    var langs = G.el('div', 'lang-row');
    G.LANGS.forEach(function (l) {
      var b = G.el('button', 'lang-btn' + (l === G.lang ? ' on' : ''), G.flag(l));
      b.dataset.act = 'lang-' + l; b.setAttribute('aria-label', G.LANG_NAMES[l]);
      G.tap(b, function () { G.setLang(l); render(root); G.say(G.t('title.hi')); });
      langs.appendChild(b);
    });
    root.appendChild(langs);
    installButton(root);
    G.musicButton(root, 'title'); // drawn here, since a language change draws the whole title again

    var profiles = G.data.profiles, any = profiles.some(Boolean);
    root.classList.toggle('has-players', any);

    var logo = G.el('div', 'logo pop-in');
    var word = new Image(); word.className = 'logo-img'; word.alt = 'GROMONSTERS'; word.draggable = false;
    word.onerror = function () { word.replaceWith(G.el('div', 'title logo-word', 'GROMONSTERS')); };
    word.src = 'assets/ui/logo.webp';
    logo.appendChild(word);
    logo.appendChild(G.el('div', 'title logo-sub', G.t('title.sub')));
    root.appendChild(logo);

    var lastSlot = profiles[G.data.last] ? G.data.last : profiles.findIndex(Boolean);
    var label = any ? G.t('title.playAs', { name: G.esc(G.profileName(profiles[lastSlot], lastSlot)) }) : G.t('title.play');
    var play = G.el('button', 'btn btn-gold btn-big play-btn' + (any ? ' play-as' : ''), G.icon('play') + '<span>' + label + '</span>');
    play.dataset.act = 'play';
    G.tap(play, function () {
      if (!any) { G.go('setup'); return; }
      startProfile(lastSlot);
    });
    root.appendChild(play);

    if (any) {
      var who = G.el('div', 'who-wrap rise-in');
      var head = G.el('div', 'who-head');
      head.appendChild(G.el('div', 'who-title h', G.t('title.who')));
      var manage = G.el('button', 'btn manage-btn', G.icon('lock') + '<span>' + G.t('title.manage') + '</span>');
      manage.dataset.act = 'manage-players';
      G.tap(manage, function () { G.go('parent', { manage: true }); });
      head.appendChild(manage);
      who.appendChild(head);

      var row = G.el('div', 'profile-row');
      profiles.forEach(function (p, i) {
        if (!p) return;
        var card = G.el('button', 'profile-card' + (i === lastSlot ? ' last' : ''));
        card.dataset.act = 'profile-' + i;
        var name = G.profileName(p, i);
        card.setAttribute('aria-label', name);
        card.appendChild(G.picture(G.partnerId(p), 'profile-pic'));
        var info = G.el('div', 'profile-info');
        info.appendChild(G.el('div', 'profile-name', G.esc(name)));
        info.appendChild(G.el('div', 'profile-grade', G.esc(G.gradeLabel(p.grade | 0).full)));
        var lv = Math.max(0, (p.opened || ['bay']).length - 1), bands = G.el('div', 'mini-bands');
        for (var k = 0; k < 7; k++) bands.appendChild(G.el('i', k < lv ? 'lit b' + (k + 1) : ''));
        var aw = G.el('div', 'profile-aurora');
        aw.appendChild(G.el('span', 'pa-lv', G.t('title.aurora', { n: lv })));
        aw.appendChild(bands);
        info.appendChild(aw);
        card.appendChild(info);
        G.tap(card, function () { startProfile(i); });
        row.appendChild(card);
      });
      if (G.freeSlot() >= 0) {
        var nw = G.el('button', 'profile-card new', '<span class="new-plus">' + G.icon('plus') + '</span><span class="profile-name">' + G.t('title.new') + '</span>');
        nw.dataset.act = 'new-player';
        G.tap(nw, function () { G.go('setup'); });
        row.appendChild(nw);
      }
      who.appendChild(row);
      root.appendChild(who);
    }
    return any;
  }

  G.screens.title = {
    enter: function (root) {
      if (G.profile) G.closeProfile();
      G.music('title');
      if (render(root)) G.say(G.t('title.who'));
      // the app was installed while the title is up: the button has done its job
      if (G.install) stopInstall = G.install.onChange(function () { if (!G.install.offered()) { var b = root.querySelector('.install-btn'); if (b) b.remove(); } });
      setTimeout(G.preload, G.fast ? 0 : 900);
    },
    exit: function () { if (aur) { aur.destroy(); aur = null; } if (stopInstall) { stopInstall(); stopInstall = null; } }
  };
})();
