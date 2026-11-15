/* The cast, the regions and the four powers. SPEC.md sections 1 and 5. */
window.G = window.G || {};
(function () {
  'use strict';
  var G = window.G;
  function C(id, name, region, element, power, extra) {
    var c = { id: id, name: name, region: region, element: element, power: power || null, rig: null, img: 'assets/creatures/' + id + '.webp', starter: false, evolvesTo: null, baseOf: null };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    return c;
  }
  var list = [
    // starters, then their stage 2 (baseOf = the stage 1 id)
    C('mosli', 'Mosli', 'forest', 'leaf', null, { rig: 'pup', starter: true, evolvesTo: 'mosli2' }),
    C('kulli', 'Kulli', 'volcano', 'fire', null, { rig: 'lamb', starter: true, evolvesTo: 'kulli2' }),
    C('narli', 'Narli', 'bay', 'water', null, { rig: 'narwhal', starter: true, evolvesTo: 'narli2' }),
    C('mosli2', 'Mosgar', 'forest', 'leaf', null, { rig: 'wolf', baseOf: 'mosli' }),
    C('kulli2', 'Ramolt', 'volcano', 'fire', null, { rig: 'ram', baseOf: 'kulli' }),
    C('narli2', 'Narval', 'bay', 'water', null, { baseOf: 'narli', fallbackImg: 'assets/creatures/narli.webp', fallbackRig: 'narwhal' }),
    // the 16 wild ones
    C('crabbi', 'Crabbi', 'bay', 'water', 'tal', { kraft: 1 }),
    C('boblo', 'Boblo', 'bay', 'water', 'ord', { kraft: 2 }),
    C('ondi', 'Ondi', 'bay', 'water', 'logik', { rig: 'manta', kraft: 3 }),
    C('lovi', 'Løvi', 'forest', 'leaf', 'logik', { kraft: 6 }),
    C('elko', 'Elko', 'forest', 'leaf', 'ord', { kraft: 8 }),
    C('kvisti', 'Kvisti', 'forest', 'leaf', 'tal', { kraft: 10 }),
    C('glodi', 'Glødi', 'volcano', 'fire', 'tal', { kraft: 13 }),
    C('gnisti', 'Gnisti', 'volcano', 'fire', 'logik', { kraft: 16 }),
    C('rimo', 'Rimo', 'snow', 'water', 'ord', { kraft: 20 }),
    C('kobbi', 'Kobbi', 'snow', 'water', 'tal', { kraft: 24 }),
    C('lunni', 'Lunni', 'sky', 'plain', 'ord', { kraft: 48 }),
    C('tordi', 'Tordi', 'sky', 'plain', 'logik', { kraft: 55 }),
    C('glimra', 'Glimra', 'cave', 'plain', 'logik', { hover: true, kraft: 37 }),
    C('krysto', 'Krysto', 'cave', 'plain', 'tal', { kraft: 42 }),
    C('paddo', 'Paddo', 'swamp', 'leaf', 'ord', { kraft: 28 }),
    C('lygti', 'Lygti', 'swamp', 'water', 'tal', { kraft: 32 })
  ];
  G.creatures = {};
  list.forEach(function (c) { G.creatures[c.id] = c; });
  // the 19 lines of the Gromodex, in book order
  G.DEX_ORDER = ['mosli', 'kulli', 'narli', 'crabbi', 'boblo', 'ondi', 'lovi', 'elko', 'kvisti', 'glodi', 'gnisti', 'rimo', 'kobbi', 'lunni', 'tordi', 'glimra', 'krysto', 'paddo', 'lygti'];

  // need: the team power that opens the region (the team's power added up). Opened regions stay open.
  // Power is 1 for a new friend and one more per battle won, so a region opens after about that many wins.
  function R(id, da, sv, no, en, weather, need, x, y) {
    return { id: id, name: { da: da, sv: sv, no: no, en: en }, bg: 'arena-' + id, weather: weather, need: need, x: x, y: y };
  }
  G.regions = {
    bay: R('bay', 'Koralbugten', 'Korallviken', 'Korallbukta', 'Coral Bay', 'bubbles', 0, 0.33, 0.77),
    forest: R('forest', 'Gammelskoven', 'Gammelskogen', 'Gammelskogen', 'The Old Forest', 'leaves', 10, 0.16, 0.42),
    volcano: R('volcano', 'Glødebjerget', 'Glödberget', 'Glødeberget', 'Ember Mountain', 'embers', 24, 0.26, 0.20),
    snow: R('snow', 'Sneryggen', 'Snöryggen', 'Snøryggen', 'Snowridge', 'snow', 36, 0.52, 0.14),
    swamp: R('swamp', 'Lysmosen', 'Lysmyren', 'Lysmyra', 'Glowmoss Marsh', 'fireflies', 50, 0.69, 0.71),
    cave: R('cave', 'Krystalgrotten', 'Kristallgrottan', 'Krystallgrotten', 'The Crystal Cave', 'crystals', 66, 0.83, 0.46),
    sky: R('sky', 'Skybuerne', 'Molnbågarna', 'Skybuene', 'The Cloud Arches', 'clouds', 84, 0.80, 0.20)
  };
  G.CAMP_SPOT = { x: 0.52, y: 0.44 };

  G.powers = {
    tal: { id: 'tal', name: { da: 'Tal', sv: 'Tal', no: 'Tall', en: 'Numbers' },
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 3.5v9M3 8h9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M14 14l6 6M20 14l-6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' },
    ord: { id: 'ord', name: { da: 'Ord', sv: 'Ord', no: 'Ord', en: 'Words' },
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 20.5 12 3.5l7.5 17M7.6 14h8.8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    logik: { id: 'logik', name: { da: 'Mønstre', sv: 'Mönster', no: 'Mønstre', en: 'Patterns' },
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2.5l4.5 8h-9z" fill="currentColor"/><circle cx="17" cy="7" r="4.2" fill="currentColor"/><rect x="8" y="13.5" width="8" height="8" rx="1.5" fill="currentColor"/></svg>' },
    hjerte: { id: 'hjerte', name: { da: 'Hjerte', sv: 'Hjärta', no: 'Hjerte', en: 'Heart' },
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 16 2 12.4 2 8.6A5 5 0 0 1 12 6a5 5 0 0 1 10 2.6C22 12.4 19 16 12 21z" fill="currentColor"/></svg>' }
  };
})();
