/* Content: ord (letters, spelling, words; in an English game also opposites and sound-alike words). Word lists in Danish, Swedish, Norwegian bokmål and British English.
   Rule for every list: common, unambiguous, spelled exactly right; a picture must name one word only. When in doubt, left out (null).
   L9: `say` never reads a word the child must read; it may name the picture (spelling from a picture, first sound). */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  G.Content = G.Content || {};

  function f(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? String(v[k]) : m; }); }
  function tx(o, L, v) { return f(o[L] || o.en, v); }
  function H(text, visual, say) { return { text: text, say: say || text, visual: visual || null }; }
  function big(t) { return { type: 'big', text: String(t) }; }
  function cap(w) { return w.charAt(0).toLocaleUpperCase() + w.slice(1); }
  function up(w) { return w.toLocaleUpperCase(); }
  function letters(w) { return Array.from(up(w)); }
  var LI = { da: 1, sv: 2, no: 3, en: 4 };
  // English words that look like the local word are left out of English spelling (the voice names the picture).
  function close(a, b) { a = a.toLowerCase(); b = b.toLowerCase(); return a.indexOf(b) >= 0 || b.indexOf(a) >= 0; }

  // [emoji, da, sv, no, en]
  var LEX = [
    ['🐟', 'fisk', 'fisk', 'fisk', 'fish'],
    ['🐱', 'kat', 'katt', 'katt', 'cat'],
    ['🐶', 'hund', 'hund', 'hund', 'dog'],
    ['🐭', 'mus', 'mus', 'mus', 'mouse'],
    ['🐮', 'ko', 'ko', 'ku', 'cow'],
    ['🐷', 'gris', 'gris', 'gris', 'pig'],
    ['🐴', 'hest', 'häst', 'hest', 'horse'],
    ['🐑', 'får', 'får', 'sau', 'sheep'],
    ['🦆', 'and', 'anka', 'and', 'duck'],
    ['🐸', 'frø', 'groda', 'frosk', 'frog'],
    ['🐻', 'bjørn', 'björn', 'bjørn', 'bear'],
    ['🦊', 'ræv', 'räv', 'rev', 'fox'],
    ['🐺', 'ulv', 'varg', 'ulv', 'wolf'],
    ['🦁', 'løve', 'lejon', 'løve', 'lion'],
    ['🐯', 'tiger', 'tiger', 'tiger', 'tiger'],
    ['🐘', 'elefant', 'elefant', 'elefant', 'elephant'],
    ['🐒', 'abe', 'apa', 'ape', 'monkey'],
    ['🦉', 'ugle', 'uggla', 'ugle', 'owl'],
    ['🐝', 'bi', 'bi', 'bie', 'bee'],
    ['🐌', 'snegl', 'snigel', 'snegle', 'snail'],
    ['🐍', 'slange', 'orm', 'slange', 'snake'],
    ['🐢', 'skildpadde', 'sköldpadda', 'skilpadde', null],
    ['🐙', 'blæksprutte', 'bläckfisk', 'blekksprut', 'octopus'],
    ['🦀', 'krabbe', 'krabba', 'krabbe', 'crab'],
    ['🐳', 'hval', 'val', 'hval', 'whale'],
    ['🐬', 'delfin', 'delfin', 'delfin', 'dolphin'],
    ['🦋', 'sommerfugl', 'fjäril', 'sommerfugl', 'butterfly'],
    ['🐞', 'mariehøne', 'nyckelpiga', 'marihøne', 'ladybird'],
    ['🐜', 'myre', 'myra', 'maur', 'ant'],
    ['🐰', 'kanin', 'kanin', 'kanin', 'rabbit'],
    ['🐧', 'pingvin', 'pingvin', 'pingvin', 'penguin'],
    ['🐦', 'fugl', 'fågel', 'fugl', 'bird'],
    ['🦈', 'haj', 'haj', 'hai', 'shark'],
    ['🐊', 'krokodille', 'krokodil', 'krokodille', 'crocodile'],
    ['🦒', 'giraf', 'giraff', null, 'giraffe'],
    ['🦓', 'zebra', 'zebra', 'sebra', 'zebra'],
    ['🐨', 'koala', 'koala', 'koala', 'koala'],
    ['🦔', 'pindsvin', 'igelkott', 'pinnsvin', 'hedgehog'],
    ['🐐', 'ged', 'get', 'geit', 'goat'],
    ['🦅', 'ørn', 'örn', 'ørn', 'eagle'],
    ['🦜', 'papegøje', 'papegoja', 'papegøye', 'parrot'],
    ['🍎', 'æble', 'äpple', 'eple', 'apple'],
    ['🍌', 'banan', 'banan', 'banan', 'banana'],
    ['🍐', 'pære', 'päron', 'pære', 'pear'],
    ['🍓', 'jordbær', 'jordgubbe', 'jordbær', 'strawberry'],
    ['🍋', 'citron', 'citron', 'sitron', 'lemon'],
    ['🍉', 'vandmelon', 'vattenmelon', 'vannmelon', 'watermelon'],
    ['🍍', 'ananas', 'ananas', 'ananas', 'pineapple'],
    ['🥥', 'kokosnød', 'kokosnöt', 'kokosnøtt', 'coconut'],
    ['🥕', 'gulerod', 'morot', 'gulrot', 'carrot'],
    ['🥔', 'kartoffel', 'potatis', 'potet', 'potato'],
    ['🥒', 'agurk', 'gurka', 'agurk', 'cucumber'],
    ['🍅', 'tomat', 'tomat', 'tomat', 'tomato'],
    ['🍞', 'brød', 'bröd', 'brød', 'bread'],
    ['🧀', 'ost', 'ost', 'ost', 'cheese'],
    ['🥚', 'æg', 'ägg', 'egg', 'egg'],
    ['🍕', 'pizza', 'pizza', 'pizza', 'pizza'],
    ['🥛', 'mælk', 'mjölk', 'melk', 'milk'],
    ['🍯', 'honning', 'honung', 'honning', 'honey'],
    ['🌞', 'sol', 'sol', 'sol', 'sun'],
    ['🌙', 'måne', 'måne', 'måne', 'moon'],
    ['⭐', 'stjerne', 'stjärna', 'stjerne', 'star'],
    ['☁️', 'sky', 'moln', 'sky', 'cloud'],
    ['🌈', 'regnbue', 'regnbåge', 'regnbue', 'rainbow'],
    ['🌳', 'træ', 'träd', 'tre', 'tree'],
    ['🍄', 'svamp', 'svamp', 'sopp', 'mushroom'],
    ['🌋', 'vulkan', 'vulkan', 'vulkan', 'volcano'],
    ['🏠', 'hus', 'hus', 'hus', 'house'],
    ['🏰', 'slot', 'slott', 'slott', 'castle'],
    ['🚗', 'bil', 'bil', 'bil', 'car'],
    ['🚌', 'bus', 'buss', 'buss', 'bus'],
    ['🚲', 'cykel', 'cykel', 'sykkel', null],
    ['⛵', 'båd', 'båt', 'båt', 'boat'],
    ['🚂', 'tog', 'tåg', 'tog', 'train'],
    ['🚀', 'raket', 'raket', 'rakett', 'rocket'],
    ['🎈', 'ballon', 'ballong', 'ballong', 'balloon'],
    ['🔑', 'nøgle', 'nyckel', 'nøkkel', 'key'],
    ['📖', 'bog', 'bok', 'bok', 'book'],
    ['✏️', 'blyant', null, 'blyant', 'pencil'],
    ['🚪', 'dør', 'dörr', 'dør', 'door'],
    ['👑', 'krone', 'krona', 'krone', 'crown'],
    ['🎩', 'hat', 'hatt', 'hatt', 'hat'],
    ['👓', 'briller', 'glasögon', 'briller', 'glasses'],
    ['🥄', 'ske', 'sked', 'skje', 'spoon'],
    ['👂', 'øre', 'öra', 'øre', 'ear'],
    ['👃', 'næse', 'näsa', 'nese', 'nose'],
    ['✋', 'hånd', 'hand', null, 'hand'],
    ['🦷', 'tand', 'tand', 'tann', 'tooth'],
    ['🦶', 'fod', 'fot', 'fot', 'foot'],
    ['❤️', 'hjerte', 'hjärta', 'hjerte', 'heart'],
    ['⚓', 'anker', 'ankare', 'anker', 'anchor'],
    ['🥁', 'tromme', 'trumma', 'tromme', 'drum'],
    ['🎸', 'guitar', 'gitarr', 'gitar', 'guitar'],
    ['🦄', 'enhjørning', 'enhörning', 'enhjørning', 'unicorn'],
    ['🐉', 'drage', 'drake', 'drage', 'dragon'],
    ['🤖', 'robot', 'robot', 'robot', 'robot'],
    ['👻', 'spøgelse', 'spöke', 'spøkelse', 'ghost'],
    ['⛄', 'snemand', 'snögubbe', 'snømann', 'snowman'],
    ['🧲', 'magnet', 'magnet', 'magnet', 'magnet'],
    ['🔨', 'hammer', 'hammare', 'hammer', 'hammer'],
    ['☔', 'paraply', 'paraply', 'paraply', 'umbrella'],
    ['🎺', 'trompet', 'trumpet', 'trompet', 'trumpet'],
    ['🧸', 'bamse', 'nalle', 'bamse', null]
  ];
  function words(L) {
    var i = LI[L];
    return LEX.filter(function (r) { return r[i]; }).map(function (r) { return { e: r[0], w: r[i] }; });
  }
  function wordOf(e, L) { for (var i = 0; i < LEX.length; i++) if (LEX[i][0] === e) return LEX[i][LI[L]]; return null; }

  // Words whose first letter does not give their first sound are left out of the first-letter task.
  var BAD_START = {
    da: /^(hj|hv|c|ch|z)/,
    sv: /^(hj|lj|dj|gj|sj|skj|stj|tj|ch|c|z|k[eiyäö]|g[eiyäö]|sk[eiyäö])/,
    no: /^(hj|hv|gj|kj|skj|sj|g[eiy]|k[iy]|sk[iy]|c|z)/,
    en: /^(kn|wr|ph|c[eiy]|g[eiy]|ch|sh|th|wh|e|u)/
  };
  var ALPHA = {
    da: 'ABCDEFGHIJKLMNOPRSTUVYÆØÅ', sv: 'ABCDEFGHIJKLMNOPRSTUVYÅÄÖ', no: 'ABCDEFGHIJKLMNOPRSTUVYÆØÅ', en: 'ABCDEFGHIJKLMNOPRSTUVWY'
  };
  // First-letter distractors: clear consonants and vowels, minus letters that sound like the right one.
  var SOUNDALIKE = { K: 'CQ', C: 'KS', S: 'CZ', V: 'W', W: 'V', I: 'Y', Y: 'I' };
  var FILLER = { da: 'EINRSTDALGKMOBFHPVUØÆÅ', sv: 'EARNTSILDOMKGVHFUPBÄÖÅ', no: 'ERNTSILAKOGDMVFUPBHØÆÅ', en: 'ETAOINSRHDLUCMFYWGPB' };

  var CONFUSE = {
    a: 'eod', b: 'dph', c: 'eo', d: 'bpa', e: 'aoc', f: 'tk', g: 'jy', h: 'nb', i: 'jt', j: 'ig', k: 'hx', l: 'it', m: 'nw', n: 'mu', o: 'aec',
    p: 'bdq', r: 'nt', s: 'zc', t: 'fl', u: 'nv', v: 'yu', w: 'mv', y: 'vg', 'æ': 'aeø', 'ø': 'oæå', 'å': 'aø', 'ä': 'aö', 'ö': 'oäå'
  };

  var RHYMES = {
    da: [['kat', 'hat', 'rat', 'nat'], ['hus', 'mus', 'krus', 'lus'], ['sol', 'stol'], ['bil', 'pil', 'smil'], ['ko', 'sko', 'bro', 'to'],
      ['is', 'gris', 'ris', 'pris'], ['hest', 'fest', 'vest'], ['mand', 'sand', 'vand', 'land'], ['post', 'frost', 'kost'], ['rød', 'brød', 'grød'], ['ben', 'sten']],
    sv: [['katt', 'hatt', 'natt', 'skatt'], ['hus', 'mus', 'ljus', 'krus'], ['sol', 'stol', 'kjol'], ['bil', 'pil', 'fil'], ['ko', 'sko', 'bro'],
      ['hand', 'sand', 'land', 'band'], ['boll', 'troll', 'noll'], ['bok', 'krok', 'klok'], ['mål', 'skål', 'hål'], ['fisk', 'disk'], ['sten', 'ben']],
    no: [['katt', 'hatt', 'natt', 'skatt'], ['hus', 'mus', 'krus'], ['sol', 'stol'], ['bil', 'pil', 'smil'], ['sko', 'bro', 'ro'],
      ['sand', 'land', 'vann', 'tann', 'mann'], ['ball', 'hall', 'fall'], ['bok', 'krok', 'klok'], ['hest', 'fest', 'vest', 'gjest'], ['is', 'gris', 'pris', 'ris'], ['fisk', 'disk']],
    en: [['cat', 'hat', 'bat', 'mat', 'rat'], ['dog', 'frog', 'log', 'fog'], ['sun', 'run', 'bun', 'fun'], ['bee', 'tree', 'key', 'three'], ['car', 'star', 'jar'],
      ['cake', 'lake', 'snake', 'rake'], ['bed', 'red', 'head', 'bread'], ['boat', 'coat', 'goat'], ['ball', 'wall', 'tall', 'fall'], ['fish', 'dish', 'wish'],
      ['moon', 'spoon', 'balloon'], ['king', 'ring', 'sing', 'swing'], ['bear', 'chair', 'pear', 'hair']]
  };

  // [first, second, wrong, wrong]: first+second is a real word; first+wrong is not.
  var COMPOUNDS = {
    da: [['regn', 'bue', 'mus', 'bil'], ['sne', 'mand', 'ko', 'dør'], ['fod', 'bold', 'hus', 'kat'], ['is', 'bjørn', 'hat', 'dør'], ['jord', 'bær', 'sko', 'kat'],
      ['tand', 'børste', 'bil', 'hus'], ['sol', 'briller', 'mus', 'ko'], ['brand', 'bil', 'ko', 'sol'], ['sommer', 'fugl', 'tand', 'dør'], ['blå', 'bær', 'hus', 'ko'],
      ['køle', 'skab', 'hat', 'bold'], ['skole', 'taske', 'fugl', 'is'], ['mad', 'pakke', 'sko', 'træ'], ['lege', 'plads', 'bær', 'sol']],
    sv: [['regn', 'båge', 'mus', 'bil'], ['snö', 'gubbe', 'ko', 'dörr'], ['fot', 'boll', 'hus', 'katt'], ['is', 'björn', 'hatt', 'dörr'], ['jord', 'gubbe', 'sko', 'katt'],
      ['tand', 'borste', 'bil', 'hus'], ['sol', 'glasögon', 'mus', 'ko'], ['brand', 'bil', 'ko', 'sol'], ['blå', 'bär', 'hus', 'katt'], ['kyl', 'skåp', 'hatt', 'boll'],
      ['mjölk', 'tand', 'sko', 'boll'], ['lek', 'plats', 'bär', 'sol'], ['mat', 'säck', 'sko', 'katt']],
    no: [['regn', 'bue', 'mus', 'bil'], ['snø', 'mann', 'ku', 'dør'], ['fot', 'ball', 'hus', 'katt'], ['is', 'bjørn', 'hatt', 'dør'], ['jord', 'bær', 'sko', 'katt'],
      ['tann', 'børste', 'bil', 'hus'], ['sol', 'briller', 'mus', 'ku'], ['brann', 'bil', 'ku', 'sol'], ['blå', 'bær', 'hus', 'katt'], ['kjøle', 'skap', 'hatt', 'ball'],
      ['skole', 'sekk', 'fugl', 'is'], ['leke', 'plass', 'bær', 'sol'], ['mat', 'pakke', 'sko', 'katt']],
    en: [['rain', 'bow', 'cat', 'shoe'], ['snow', 'man', 'cup', 'door'], ['foot', 'ball', 'tree', 'pen'], ['sun', 'flower', 'cat', 'book'], ['tooth', 'brush', 'car', 'bell'],
      ['star', 'fish', 'hat', 'cup'], ['butter', 'fly', 'pen', 'door'], ['bed', 'room', 'cat', 'pen'], ['play', 'ground', 'fish', 'hat'], ['lady', 'bird', 'cup', 'tree'],
      ['pan', 'cake', 'tree', 'dog'], ['tea', 'pot', 'bird', 'shoe'], ['rain', 'coat', 'fish', 'book']]
  };

  // [word, its opposite, family]. Only directions with one clear opposite are listed. Wrong options come from other families.
  var OPP = {
    da: [['stor', 'lille', 'size'], ['lille', 'stor', 'size'], ['varm', 'kold', 'temp'], ['kold', 'varm', 'temp'], ['lys', 'mørk', 'light'], ['mørk', 'lys', 'light'],
      ['hurtig', 'langsom', 'speed'], ['langsom', 'hurtig', 'speed'], ['op', 'ned', 'dir'], ['ned', 'op', 'dir'], ['ind', 'ud', 'dir'], ['ud', 'ind', 'dir'],
      ['våd', 'tør', 'wet'], ['tør', 'våd', 'wet'], ['tung', 'let', 'size'], ['lang', 'kort', 'size'], ['fuld', 'tom', 'fill'], ['tom', 'fuld', 'fill'],
      ['åben', 'lukket', 'open'], ['lukket', 'åben', 'open'], ['hård', 'blød', 'soft'], ['blød', 'hård', 'soft'], ['tyk', 'tynd', 'size'], ['tynd', 'tyk', 'size'],
      ['ren', 'beskidt', 'clean'], ['beskidt', 'ren', 'clean'], ['dag', 'nat', 'time'], ['nat', 'dag', 'time'], ['først', 'sidst', 'order'], ['sidst', 'først', 'order'],
      ['ja', 'nej', 'ans'], ['nej', 'ja', 'ans'], ['ny', 'gammel', 'age'], ['ung', 'gammel', 'age'], ['sommer', 'vinter', 'season'], ['vinter', 'sommer', 'season']],
    sv: [['stor', 'liten', 'size'], ['liten', 'stor', 'size'], ['varm', 'kall', 'temp'], ['kall', 'varm', 'temp'], ['ljus', 'mörk', 'light'], ['mörk', 'ljus', 'light'],
      ['snabb', 'långsam', 'speed'], ['långsam', 'snabb', 'speed'], ['upp', 'ner', 'dir'], ['ner', 'upp', 'dir'], ['in', 'ut', 'dir'], ['ut', 'in', 'dir'],
      ['våt', 'torr', 'wet'], ['torr', 'våt', 'wet'], ['tung', 'lätt', 'size'], ['lång', 'kort', 'size'], ['full', 'tom', 'fill'], ['tom', 'full', 'fill'],
      ['öppen', 'stängd', 'open'], ['stängd', 'öppen', 'open'], ['hård', 'mjuk', 'soft'], ['mjuk', 'hård', 'soft'], ['tjock', 'tunn', 'size'], ['tunn', 'tjock', 'size'],
      ['ren', 'smutsig', 'clean'], ['smutsig', 'ren', 'clean'], ['dag', 'natt', 'time'], ['natt', 'dag', 'time'], ['först', 'sist', 'order'], ['sist', 'först', 'order'],
      ['ja', 'nej', 'ans'], ['nej', 'ja', 'ans'], ['ny', 'gammal', 'age'], ['ung', 'gammal', 'age'], ['sommar', 'vinter', 'season'], ['vinter', 'sommar', 'season']],
    no: [['stor', 'liten', 'size'], ['liten', 'stor', 'size'], ['varm', 'kald', 'temp'], ['kald', 'varm', 'temp'], ['lys', 'mørk', 'light'], ['mørk', 'lys', 'light'],
      ['fort', 'sakte', 'speed'], ['sakte', 'fort', 'speed'], ['opp', 'ned', 'dir'], ['ned', 'opp', 'dir'], ['inn', 'ut', 'dir'], ['ut', 'inn', 'dir'],
      ['våt', 'tørr', 'wet'], ['tørr', 'våt', 'wet'], ['tung', 'lett', 'size'], ['lang', 'kort', 'size'], ['full', 'tom', 'fill'], ['tom', 'full', 'fill'],
      ['åpen', 'lukket', 'open'], ['lukket', 'åpen', 'open'], ['hard', 'myk', 'soft'], ['myk', 'hard', 'soft'], ['tykk', 'tynn', 'size'], ['tynn', 'tykk', 'size'],
      ['ren', 'skitten', 'clean'], ['skitten', 'ren', 'clean'], ['dag', 'natt', 'time'], ['natt', 'dag', 'time'], ['først', 'sist', 'order'], ['sist', 'først', 'order'],
      ['ja', 'nei', 'ans'], ['nei', 'ja', 'ans'], ['ny', 'gammel', 'age'], ['ung', 'gammel', 'age'], ['sommer', 'vinter', 'season'], ['vinter', 'sommer', 'season']],
    en: [['big', 'small', 'size'], ['small', 'big', 'size'], ['hot', 'cold', 'temp'], ['cold', 'hot', 'temp'], ['up', 'down', 'dir'], ['down', 'up', 'dir'],
      ['in', 'out', 'dir'], ['out', 'in', 'dir'], ['wet', 'dry', 'wet'], ['dry', 'wet', 'wet'], ['open', 'closed', 'open'], ['closed', 'open', 'open'],
      ['full', 'empty', 'fill'], ['empty', 'full', 'fill'], ['day', 'night', 'time'], ['night', 'day', 'time'], ['yes', 'no', 'ans'], ['no', 'yes', 'ans'],
      ['happy', 'sad', 'mood'], ['sad', 'happy', 'mood'], ['fast', 'slow', 'speed'], ['slow', 'fast', 'speed'], ['long', 'short', 'size']]
  };
  var OPP_HARD_EN = [['heavy', 'light', 'size'], ['hard', 'soft', 'soft'], ['soft', 'hard', 'soft'], ['thick', 'thin', 'size'], ['thin', 'thick', 'size'],
    ['clean', 'dirty', 'clean'], ['dirty', 'clean', 'clean'], ['first', 'last', 'order'], ['last', 'first', 'order'], ['new', 'old', 'age'], ['young', 'old', 'age'],
    ['summer', 'winter', 'season'], ['winter', 'summer', 'season'], ['early', 'late', 'time'], ['late', 'early', 'time'], ['dark', 'light', 'light'],
    ['loud', 'quiet', 'sound'], ['push', 'pull', 'push'], ['pull', 'push', 'push'], ['always', 'never', 'freq'], ['never', 'always', 'freq'],
    ['before', 'after', 'order'], ['after', 'before', 'order'], ['tall', 'short', 'size']];

  // Word classes, each word clearly in one class (infinitive verbs).
  var CLASSES = {
    da: { noun: ['hus', 'bil', 'bord', 'hund', 'bog', 'æble', 'lampe', 'vindue', 'taske', 'stol', 'blomst', 'gulv'],
      verb: ['spise', 'synge', 'svømme', 'skrive', 'læse', 'tegne', 'løbe', 'sove', 'grine', 'råbe'],
      adj: ['rød', 'glad', 'stor', 'blød', 'varm', 'kold', 'sur', 'sød', 'stærk', 'tung'] },
    sv: { noun: ['hus', 'bil', 'bord', 'hund', 'bok', 'äpple', 'lampa', 'fönster', 'väska', 'stol', 'blomma', 'golv'],
      verb: ['springa', 'äta', 'sjunga', 'simma', 'skriva', 'läsa', 'rita', 'dansa', 'sova', 'skratta'],
      adj: ['röd', 'glad', 'stor', 'mjuk', 'rolig', 'varm', 'kall', 'sur', 'söt', 'stark'] },
    no: { noun: ['hus', 'bil', 'bord', 'hund', 'bok', 'eple', 'lampe', 'vindu', 'veske', 'stol', 'blomst', 'gulv'],
      verb: ['løpe', 'spise', 'synge', 'svømme', 'skrive', 'lese', 'tegne', 'danse', 'sove', 'leke'],
      adj: ['rød', 'glad', 'stor', 'myk', 'morsom', 'varm', 'kald', 'sur', 'søt', 'sterk'] },
    en: { noun: ['apple', 'teacher', 'window', 'banana', 'kitchen', 'sister', 'river', 'mountain', 'island', 'elephant'],
      verb: ['eat', 'sing', 'write', 'bring', 'give', 'forget', 'choose', 'arrive'],
      adj: ['happy', 'big', 'tall', 'hungry', 'small', 'sad', 'angry', 'heavy', 'noisy', 'tiny'] }
  };
  var CLS_NAME = {
    da: { noun: 'navneord', verb: 'udsagnsord', adj: 'tillægsord' }, sv: { noun: 'substantiv', verb: 'verb', adj: 'adjektiv' },
    no: { noun: 'substantiv', verb: 'verb', adj: 'adjektiv' }, en: { noun: 'noun', verb: 'verb', adj: 'adjective' }
  };

  // [sentence with ▢, right, wrong, wrong]
  var SENTENCES = {
    gap: [['I ▢ a dog.', 'have', 'has', 'am'], ['She ▢ a cat.', 'has', 'have', 'are'], ['We ▢ friends.', 'are', 'is', 'am'],
      ['He ▢ ten years old.', 'is', 'are', 'am'], ['I ▢ happy today.', 'am', 'is', 'are'], ['They ▢ football.', 'play', 'plays', 'playing'],
      ['My mum ▢ tea.', 'likes', 'like', 'liking'], ['The dog ▢ fast.', 'runs', 'run', 'running'], ['I can ▢ a bike.', 'ride', 'rides', 'riding'],
      ['There ▢ two cats.', 'are', 'is', 'am'], ['I eat ▢ apple.', 'an', 'a', 'on'], ['This is ▢ book.', 'my', 'me', 'I'],
      ['Yesterday I ▢ to school.', 'went', 'go', 'goes'], ['Two ▢ sing.', 'birds', 'bird', 'a bird'], ['Where ▢ you live?', 'do', 'does', 'is'],
      ['She ▢ not like fish.', 'does', 'do', 'is']],
    homo: [['I can ▢ a ship.', 'see', 'sea'], ['We swam in the ▢.', 'sea', 'see'], ['The ▢ is hot today.', 'sun', 'son'], ['I have ▢ hands.', 'two', 'too', 'to'],
      ['Come over ▢!', 'here', 'hear'], ['I ▢ a noise.', 'hear', 'here'], ['The wind ▢ hard.', 'blew', 'blue'], ['The sky is ▢.', 'blue', 'blew'],
      ['I ▢ the answer.', 'know', 'no'], ['There is a ▢ in my sock.', 'hole', 'whole'], ['She ate the ▢ pizza.', 'whole', 'hole'], ['The apple is ▢.', 'red', 'read'],
      ['Can I have a ▢ of cake?', 'piece', 'peace'], ['I like ▢ house.', 'their', 'there'], ['Put it over ▢.', 'there', 'their'], ['I ▢ an apple.', 'ate', 'eight'],
      ['She is ▢ years old.', 'eight', 'ate'], ['We ▢ the game!', 'won', 'one'], ['I have ▢ sister.', 'one', 'won'], ['I have ▢ much homework.', 'too', 'two', 'to'],
      ['The ▢ ate the honey.', 'bear', 'bare']]
  };

  var T = {
    first: { da: 'Hvilket bogstav starter ordet med?', sv: 'Vilken bokstav börjar ordet på?', no: 'Hvilken bokstav begynner ordet med?', en: 'Which letter does it start with?' },
    firstSay: { da: 'Hvilket bogstav starter ordet {w} med?', sv: 'Vilken bokstav börjar {w} på?', no: 'Hvilken bokstav begynner {w} med?', en: 'Which letter does {w} start with?' },
    firstH1: { da: 'Sig {w} langsomt. Lyt efter den første lyd.', sv: 'Säg {w} långsamt. Lyssna på det första ljudet.', no: 'Si {w} sakte. Lytt etter den første lyden.', en: 'Say {w} slowly. Listen for the first sound.' },
    firstH2: { da: '{W} starter med {L}.', sv: '{W} börjar på {L}.', no: '{W} begynner med {L}.', en: '{W} starts with {L}.' },
    firstP: { da: 'Godt lyttet!', sv: 'Rätt: det första ljudet ger {L}.', no: 'Riktig: den første lyden gir {L}.', en: 'Right: the first sound gives {L}.' },
    caseP: { da: 'Find det lille bogstav', sv: 'Hitta den lilla bokstaven', no: 'Finn den lille bokstaven', en: 'Find the small letter' },
    caseS: { da: 'Find det lille bogstav, der passer til det store.', sv: 'Hitta den lilla bokstaven som hör ihop med den stora.', no: 'Finn den lille bokstaven som hører til den store.', en: 'Find the small letter that goes with the big one.' },
    caseH1: { da: 'Store og små bogstaver ser tit forskellige ud.', sv: 'Stora och små bokstäver ser ofta olika ut.', no: 'Store og små bokstaver ser ofte ulike ut.', en: 'Big and small letters often look different.' },
    caseH2: { da: 'Store {C} og lille {c} er det samme bogstav.', sv: 'Stora {C} och lilla {c} är samma bokstav.', no: 'Store {C} og lille {c} er samme bokstav.', en: 'Big {C} and small {c} are the same letter.' },
    caseOk: { da: 'Ja, de to hører sammen!', sv: 'Rätt: {C} och {c} hör ihop.', no: 'Riktig: {C} og {c} hører sammen.', en: 'Right: {C} and {c} go together.' },
    spellP: { da: 'Stav ordet', sv: 'Stava ordet', no: 'Stav ordet', en: 'Spell the word' },
    spellS: { da: 'Stav ordet {w}.', sv: 'Stava {w}.', no: 'Stav {w}.', en: 'Spell {w}.' },
    spellH1: { da: 'Sig {w} langsomt, lyd for lyd.', sv: 'Säg {w} långsamt, ljud för ljud.', no: 'Si {w} sakte, lyd for lyd.', en: 'Say {w} slowly, sound by sound.' },
    spellH2: { da: '{W} staves {s}.', sv: '{W} stavas {s}.', no: '{W} staves {s}.', en: '{W} is spelled {s}.' },
    spellOk: { da: 'Flot. Du tog en lyd ad gangen.', sv: 'Rätt: ljud för ljud.', no: 'Riktig: lyd for lyd.', en: 'Right: sound by sound.' },
    rhymeP: { da: 'Hvilket ord rimer?', sv: 'Vilket ord rimmar?', no: 'Hvilket ord rimer?', en: 'Which word rhymes?' },
    rhymeS: { da: 'Hvilket ord rimer på {w}?', sv: 'Vilket ord rimmar på {w}?', no: 'Hvilket ord rimer på {w}?', en: 'Which word rhymes with {w}?' },
    rhymeH: { da: '{w} og {r} ender på samme lyd.', sv: '{w} och {r} låter lika på slutet.', no: '{w} og {r} høres like ut på slutten.', en: '{w} and {r} sound the same at the end.' },
    rhymeH0: { da: 'Sig ordene højt. Lyt efter, hvordan de ender.', sv: 'Säg orden högt och lyssna på slutet.', no: 'Si ordene høyt og lytt til slutten.', en: 'Say the words out loud and listen to the end.' },
    rhymeOk: { da: 'Godt hørt. De ender på samme lyd.', sv: 'Rätt: samma ljud på slutet.', no: 'Riktig: samme lyd på slutten.', en: 'Right: the same sound at the end.' },
    compP: { da: 'Hvilket ord passer?', sv: 'Vilket ord passar?', no: 'Hvilket ord passer?', en: 'Which word fits?' },
    compS: { da: 'Hvilket ord kan du sætte efter {w}, så du får et nyt ord?', sv: 'Vilket ord kan sättas ihop med {w} så att det blir ett riktigt ord?', no: 'Hvilket ord kan settes sammen med {w} så det blir et ekte ord?', en: 'Which word joins {w} to make a real word?' },
    compH: { da: '{a} + {b} = {ab}.', sv: '{a} + {b} = {ab}.', no: '{a} + {b} = {ab}.', en: '{a} + {b} = {ab}.' },
    compHS: { da: 'Sammen bliver de to ord til et nyt ord.', sv: '{a} + {b} = {ab}.', no: '{a} + {b} = {ab}.', en: '{a} + {b} = {ab}.' },
    compH0: { da: 'Sig hvert ord efter {w}. Kun ét af dem giver et rigtigt ord.', sv: 'Prova varje ord efter {w}. Bara ett blir ett riktigt ord.', no: 'Prøv hvert ord etter {w}. Bare ett blir et ekte ord.', en: 'Try each word after {w}. Only one makes a real word.' },
    compOk: { da: 'Flot. To ord blev til ét.', sv: 'Rätt: två ord blev ett.', no: 'Riktig: to ord ble til ett.', en: 'Right: two words became one.' },
    oppP: { da: 'Hvad er det modsatte?', sv: 'Vad är motsatsen?', no: 'Hva er det motsatte?', en: 'What is the opposite?' },
    oppS: { da: 'Hvilket ord betyder det modsatte?', sv: 'Vad är motsatsen till ordet?', no: 'Hva er det motsatte av ordet?', en: 'What is the opposite of the word?' },
    oppH: { da: 'Det modsatte af {t} er {o}.', sv: 'Motsatsen till {t} är {o}.', no: 'Det motsatte av {t} er {o}.', en: 'The opposite of {t} is {o}.' },
    oppOk: { da: 'Ja, de to ord betyder det modsatte!', sv: 'Rätt: {t} och {o} är motsatser.', no: 'Riktig: {t} og {o} er motsatte.', en: 'Right: {t} and {o} are opposites.' },
    clsP: { da: 'Find {c}et', sv: 'Hitta {c}et', no: 'Finn {c}et', en: 'Find the {c}' },
    clsS: { da: 'Hvilket ord er et {c}?', sv: 'Vilket ord är ett {c}?', no: 'Hvilket ord er et {c}?', en: 'Which word is {a} {c}?' },
    clsH2: { da: '{W} er et {c}.', sv: '{W} är ett {c}.', no: '{W} er et {c}.', en: '{W} is {a} {c}.' },
    clsOk: { da: 'Ja, det er et {c}!', sv: 'Rätt: {w} är ett {c}.', no: 'Riktig: {w} er et {c}.', en: 'Right: {w} is {a} {c}.' },
    gapP: { da: 'Hvilket ord passer?', sv: 'Vilket ord passar?', no: 'Hvilket ord passer?', en: 'Which word fits?' },
    gapS: { da: 'Hvilket engelsk ord passer i sætningen?', sv: 'Vilket engelskt ord passar i meningen?', no: 'Hvilket engelsk ord passer i setningen?', en: 'Which word fits? They sound the same.' },
    gapH: { da: 'Sådan lyder hele sætningen: {s}', sv: 'Hela meningen: {s}', no: 'Hele setningen: {s}', en: 'The whole sentence: {s}' },
    gapOk: { da: 'Flot. Nu giver sætningen mening.', sv: 'Rätt: meningen blir rätt.', no: 'Riktig: setningen blir riktig.', en: 'Right: the meaning picks the spelling.' },
    homoH2: { da: '', sv: '', no: '', en: '{a} and {b} sound the same but mean different things.' }
  };
  // Danish spoken lines: a small fixed set per step, recorded once. A picture's name and a letter are sentences of their own
  // ("Fisk." "F."), shared by every step. Other languages read the text lines with the device voice.
  var SAY_DA = {
    firstSay: '{W}. Hvilket bogstav starter ordet med?', firstH1: 'Sig ordet langsomt. Lyt efter den første lyd.', firstH2: 'Her er det første bogstav. {L}.',
    caseH2: 'De ser forskellige ud, men det er det samme bogstav.',
    spellS: '{W}. Stav ordet.', spellH1: 'Sig ordet langsomt, lyd for lyd.', spellH2: 'Sådan staves det. {s}',
    rhymeS: '{W}. Hvilket ord rimer på det?', rhymeH: '{W}. {R}. De ender på samme lyd.',
    compS: 'Hvilket ord kan du sætte efter det første ord, så du får et nyt ord?', compH0: 'Sig hvert ord efter det første ord. Kun ét af dem giver et rigtigt ord.',
    oppH: 'Se her. Det er det modsatte ord.', clsH2: 'Det her ord er et {c}.', gapH: 'Læs hele sætningen med det rigtige ord.'
  };
  // the spoken line: the Danish one when there is one, otherwise the text template
  function sp(key, L, v) { return L === 'da' && SAY_DA[key] ? f(SAY_DA[key], v) : tx(T[key], L, v); }
  function spLetters(ls, L) { return L === 'da' ? ls.join('. ') + '.' : ls.join(', '); }

  var CLS_HINT = {
    da: { noun: 'Navneord er ting, dyr og mennesker. Man kan sige en eller et foran.', verb: 'Udsagnsord er noget, man gør. Man kan sige at foran, som i at hoppe.',
      adj: 'Tillægsord fortæller, hvordan noget er, som i en grøn bold.' },
    sv: { noun: 'Substantiv är saker, djur och personer.', verb: 'Verb är något man gör.', adj: 'Adjektiv berättar hur något är.' },
    no: { noun: 'Substantiv er ting, dyr og personer.', verb: 'Verb er noe man gjør.', adj: 'Adjektiv forteller hvordan noe er.' },
    en: { noun: 'Nouns are things, animals and people.', verb: 'Verbs are things you do.', adj: 'Adjectives tell you what something is like.' }
  };

  // Words a first or second grader cannot spell by sound (silent or changed letters): left out of the early spelling steps.
  var EARLY_SKIP = { da: ['and', 'bog', 'tog', 'fugl', 'hånd', 'tand', 'ræv', 'snegl', 'nøgle', 'drage', 'ugle'] };
  // Too hard to spell in any list a grade 3 child meets.
  var NEVER_SPELL = { da: ['papegøje', 'guitar'] };

  var steps = [];
  function step(o) { steps.push(o); }

  function spellTask(e, w, L, U, extra, o) {
    o = o || {};
    var W1 = up(w), ls = letters(w), pool = [];
    var fill = FILLER[o.alphaLang || L].split('').filter(function (c) { return ls.indexOf(c) < 0; });
    var ex = U.sample(fill, extra);
    pool = U.shuffle(ls.concat(ex));
    var spaced = ls.join('-');
    var picName = o.picName || w;
    return {
      ui: 'spell',
      prompt: tx(o.prompt || T.spellP, L),
      say: o.sayText || sp(o.say || 'spellS', L, { w: picName, W: cap(picName) }),
      visual: { type: 'emoji', emoji: e },
      spell: { word: W1, tiles: pool },
      how: o.how || [
        H(tx(T.spellH1, L, { w: w }), { type: 'emoji', emoji: e }, sp('spellH1', L, { w: w })),
        H(tx(T.spellH2, L, { W: cap(w), s: spaced }), big(W1), sp('spellH2', L, { W: cap(w), s: spLetters(ls, L) }))
      ],
      praise: tx(T.spellOk, L),
      key: { type: 'spell', lang: o.wordLang || L }
    };
  }
  function spellStep(id, grade, lo, hi, extraLo, extraHi, name, opts) {
    opts = opts || {};
    step({
      id: id, grade: grade, name: name,
      pick: function (U, L) {
        if (opts.onlyLang && opts.onlyLang.indexOf(L) < 0) return null;
        var list = words(L).filter(function (x) { var n = Array.from(x.w).length; return n >= lo && n <= hi && /^[a-zæøåäö]+$/.test(x.w) && !(grade <= 2 && (EARLY_SKIP[L] || []).indexOf(x.w) >= 0) && (NEVER_SPELL[L] || []).indexOf(x.w) < 0; });
        return { e: U.pick(list).e };
      },
      key: function (p) { return p.e; },
      make: function (p, L, U) {
        var w = wordOf(p.e, L);
        if (!w) return null;
        var n = Array.from(w).length;
        if (n < lo || n > hi) return null;
        return spellTask(p.e, w, L, U, U.int(extraLo, extraHi));
      }
    });
  }

  /* ---------------- grade 0 ---------------- */
  step({
    id: 'o01', grade: 0, name: { da: 'Første bogstav', sv: 'Första bokstaven', no: 'Første bokstav', en: 'First letter' },
    pick: function (U, L) {
      var list = words(L).filter(function (x) { return !BAD_START[L].test(x.w); });
      return { e: U.pick(list).e };
    },
    key: function (p) { return p.e; },
    make: function (p, L, U) {
      var w = wordOf(p.e, L);
      if (!w || BAD_START[L].test(w)) return null;
      var Lt = up(w.charAt(0)), bad = Lt + (SOUNDALIKE[Lt] || '');
      var pool = FILLER[L].split('').filter(function (c) { return bad.indexOf(c) < 0; });
      var wr = U.sample(pool, 2).map(function (c) { return { label: c }; });
      return {
        ui: 'choice', prompt: tx(T.first, L), say: sp('firstSay', L, { w: w, W: cap(w) }),
        visual: { type: 'emoji', emoji: p.e },
        choice: U.choice({ label: Lt }, wr, 3),
        how: [H(tx(T.firstH1, L, { w: w }), { type: 'emoji', emoji: p.e }, sp('firstH1', L, { w: w })), H(tx(T.firstH2, L, { W: cap(w), L: Lt }), big(Lt), sp('firstH2', L, { W: cap(w), L: Lt }))],
        praise: tx(T.firstP, L, { L: Lt }),
        key: { type: 'firstletter', lang: L }
      };
    }
  });

  step({
    id: 'o02', grade: 0, name: { da: 'Store og små bogstaver', sv: 'Stora och små bokstäver', no: 'Store og små bokstaver', en: 'Big and small letters' },
    pick: function (U, L) { return { c: U.pick(ALPHA[L].split('').filter(function (c) { return CONFUSE[c.toLocaleLowerCase()]; })) }; },
    key: function (p) { return p.c; },
    make: function (p, L, U) {
      if (ALPHA[L].indexOf(p.c) < 0) return null;
      var lo = p.c.toLocaleLowerCase(), alpha = ALPHA[L].toLocaleLowerCase();
      var conf = CONFUSE[lo].split('').filter(function (c) { return c !== lo && alpha.indexOf(c) >= 0 && !(p.c === 'I' && c === 'l'); });
      var wr = U.sample(conf, 2);
      if (wr.length < 2) return null;
      return {
        ui: 'choice', prompt: tx(T.caseP, L), say: tx(T.caseS, L),
        visual: big(p.c),
        choice: U.choice({ label: lo }, wr.map(function (c) { return { label: c }; }), 3),
        how: [H(tx(T.caseH1, L), big(p.c)), H(tx(T.caseH2, L, { C: p.c, c: lo }), big(p.c + ' ' + lo), sp('caseH2', L, { C: p.c, c: lo }))],
        praise: tx(T.caseOk, L, { C: p.c, c: lo }),
        key: { type: 'case' }
      };
    }
  });

  /* ---------------- grades 1 and 2: spelling ---------------- */
  spellStep('o03', 1, 2, 3, 0, 0, { da: 'Stav korte ord', sv: 'Stava korta ord', no: 'Stav korte ord', en: 'Spell short words' });
  spellStep('o04', 1, 3, 4, 1, 2, { da: 'Stav ord med 3 og 4 bogstaver', sv: 'Stava ord med 3 och 4 bokstäver', no: 'Stav ord med 3 og 4 bokstaver', en: 'Spell 3 and 4 letter words' });
  spellStep('o05', 2, 4, 5, 2, 2, { da: 'Stav ord med 4 og 5 bogstaver', sv: 'Stava ord med 4 och 5 bokstäver', no: 'Stav ord med 4 og 5 bokstaver', en: 'Spell 4 and 5 letter words' });

  step({
    id: 'o06', grade: 1, name: { da: 'Rim', sv: 'Rim', no: 'Rim', en: 'Rhymes' },
    pick: function (U, L) {
      var groups = RHYMES[L], gi = U.int(0, groups.length - 1), g = groups[gi];
      var pair = U.sample(g, 2);
      return { g: gi, t: pair[0], r: pair[1] };
    },
    key: function (p) { return p.t + '~' + p.r; },
    make: function (p, L, U) {
      var groups = RHYMES[L];
      if (!groups[p.g] || groups[p.g].indexOf(p.t) < 0 || groups[p.g].indexOf(p.r) < 0) return null;
      var others = [];
      groups.forEach(function (g, i) { if (i !== p.g) others = others.concat(g); });
      // one decoy that starts like the target, so the child must listen to the end
      var same = others.filter(function (w) { return w.charAt(0) === p.t.charAt(0); });
      var wr = [];
      if (same.length) wr.push(U.pick(same));
      U.shuffle(others).forEach(function (w) { if (wr.length < 2 && wr.indexOf(w) < 0) wr.push(w); });
      return {
        ui: 'choice', prompt: tx(T.rhymeP, L), say: sp('rhymeS', L, { w: p.t, W: cap(p.t) }),
        visual: big(p.t),
        choice: U.choice({ label: p.r }, wr.map(function (w) { return { label: w }; }), 3),
        how: [H(tx(T.rhymeH0, L), big(p.t)), H(tx(T.rhymeH, L, { w: cap(p.t), r: p.r }), big(p.t + '  ' + p.r), sp('rhymeH', L, { w: cap(p.t), r: p.r, W: cap(p.t), R: cap(p.r) }))],
        praise: tx(T.rhymeOk, L),
        key: { type: 'rhyme', lang: L, target: p.t }
      };
    }
  });

  /* ---------------- grade 3 ---------------- */
  step({
    id: 'o07', grade: 2, name: { da: 'Sammensatte ord', sv: 'Sammansatta ord', no: 'Sammensatte ord', en: 'Compound words' },
    pick: function (U, L) { return { i: U.int(0, COMPOUNDS[L].length - 1) }; },
    key: function (p) { return String(p.i); },
    make: function (p, L, U) {
      var c = COMPOUNDS[L][p.i];
      if (!c) return null;
      return {
        ui: 'choice', prompt: tx(T.compP, L), say: sp('compS', L, { w: c[0] }),
        visual: big(c[0] + ' + ▢'),
        choice: U.choice({ label: c[1] }, [{ label: c[2] }, { label: c[3] }], 3),
        how: [H(tx(T.compH0, L, { w: c[0] }), big(c[0] + ' + ▢'), sp('compH0', L, { w: c[0] })), H(tx(T.compH, L, { a: c[0], b: c[1], ab: c[0] + c[1] }), big(c[0] + c[1]), tx(T.compHS, L, { a: cap(c[0]), b: c[1], ab: c[0] + c[1] }))],
        praise: tx(T.compOk, L),
        key: { type: 'compound', lang: L, first: c[0] }
      };
    }
  });

  spellStep('o08', 3, 6, 8, 2, 2, { da: 'Stav lange ord', sv: 'Stava långa ord', no: 'Stav lange ord', en: 'Spell long words' });

  /* ---------------- grade 4 ---------------- */
  function oppTask(list, t, L, U) {
    var item = list.filter(function (o) { return o[0] === t; })[0];
    if (!item) return null;
    var pool = [];
    list.forEach(function (o) { if (o[2] !== item[2] && o[1] !== item[1] && pool.indexOf(o[1]) < 0 && o[1] !== t) pool.push(o[1]); });
    var wr = U.sample(pool, 2);
    return {
      ui: 'choice', prompt: tx(T.oppP, L), say: tx(T.oppS, L),
      visual: big(t),
      choice: U.choice({ label: item[1] }, wr.map(function (w) { return { label: w }; }), 3),
      how: [H(tx(T.oppH, L, { t: t, o: item[1] }), big(item[1]), sp('oppH', L, { t: t, o: item[1] }))],
      praise: tx(T.oppOk, L, { t: t, o: item[1] }),
      key: { type: 'opposite', lang: L }
    };
  }
  // o09, o10 and o13 belong to an English game only (opposites, longer words, sound-alike words). In a Danish game the
  // English steps that sat here are their own topic, src/content/engelsk.js (slice 3). The ids stay: saves store them.
  step({
    id: 'o09', grade: 4, langs: ['en'], name: { da: 'Modsatte ord', sv: 'Motsatser', no: 'Motsatte ord', en: 'Opposites' },
    pick: function (U, L) { return L === 'en' ? { t: U.pick(OPP.en)[0] } : null; },
    key: function (p) { return p.t; },
    make: function (p, L, U) { return L === 'en' && p.t ? oppTask(OPP.en, p.t, L, U) : null; }
  });

  step({
    id: 'o10', grade: 4, langs: ['en'], name: { da: 'Stav lange ord', sv: 'Stava långa ord', no: 'Stav lange ord', en: 'Spell longer words' },
    pick: function (U, L) {
      if (L !== 'en') return null;
      return { e: U.pick(words('en').filter(function (x) { return x.w.length >= 7 && x.w.length <= 9; })).e };
    },
    key: function (p) { return p.e; },
    make: function (p, L, U) {
      var en = wordOf(p.e, 'en');
      if (L !== 'en' || !en || en.length < 7 || en.length > 9) return null;
      return spellTask(p.e, en, L, U, 2);
    }
  });

  step({
    id: 'o11', grade: 2, name: { da: 'Modsatte ord', sv: 'Motsatser', no: 'Motsatte ord', en: 'More opposites' },
    pick: function (U, L) { return { t: U.pick(L === 'en' ? OPP_HARD_EN : OPP[L])[0] }; },
    key: function (p) { return p.t; },
    make: function (p, L, U) { return oppTask(L === 'en' ? OPP_HARD_EN : OPP[L], p.t, L, U); }
  });

  /* ---------------- grade 5 ---------------- */
  step({
    id: 'o12', grade: 3, name: { da: 'Ordklasser', sv: 'Ordklasser', no: 'Ordklasser', en: 'Word classes' },
    pick: function (U, L) {
      var cls = U.pick(['noun', 'verb', 'adj']), C = CLASSES[L];
      var others = ['noun', 'verb', 'adj'].filter(function (c) { return c !== cls; });
      return { c: cls, w: U.pick(C[cls]), x: U.pick(C[others[0]]), y: U.pick(C[others[1]]) };
    },
    key: function (p) { return p.c + ':' + p.w + ',' + p.x + ',' + p.y; },
    make: function (p, L, U) {
      var C = CLASSES[L];
      if (C[p.c].indexOf(p.w) < 0) return null;
      var cn = CLS_NAME[L][p.c], art = p.c === 'adj' ? 'an' : 'a';
      return {
        ui: 'choice', prompt: tx(T.clsP, L, { c: cn }), say: tx(T.clsS, L, { c: cn, a: art }),
        visual: null,
        choice: U.choice({ label: p.w }, [{ label: p.x }, { label: p.y }], 3),
        how: [H(CLS_HINT[L][p.c], big(cn)), H(tx(T.clsH2, L, { W: cap(p.w), c: cn, a: art }), big(p.w), sp('clsH2', L, { W: cap(p.w), c: cn, a: art }))],
        praise: tx(T.clsOk, L, { w: p.w, c: cn, a: art }),
        key: { type: 'wordclass', lang: L, cls: p.c }
      };
    }
  });

  step({
    id: 'o13', grade: 5, langs: ['en'], name: { da: 'Ord der lyder ens', sv: 'Ord som låter lika', no: 'Ord som høres like', en: 'Sound-alike words' },
    pick: function (U, L) { return L === 'en' ? { s: 'homo', i: U.int(0, SENTENCES.homo.length - 1) } : null; },
    key: function (p) { return p.s + p.i; },
    make: function (p, L, U) {
      if (L !== 'en' || p.s !== 'homo') return null;
      var it = SENTENCES.homo[p.i];
      if (!it) return null;
      var full = it[0].replace('▢', it[1]);
      return {
        ui: 'choice', prompt: tx(T.gapP, L), say: tx(T.gapS, L),
        visual: big(it[0]),
        choice: U.choice({ label: it[1] }, it.slice(2).map(function (w) { return { label: w }; }), it.length - 1),
        how: [H(tx(T.gapH, L, { s: full }), big(full)), H(tx(T.homoH2, L, { a: cap(it[1]), b: it[2] }), big(it[1] + '  ' + it[2]))],
        praise: tx(T.gapOk, L),
        key: { type: 'sentence', set: 'homo' }
      };
    }
  });

  /* ---------------- grade 0, the class 0 pack (slice 4, 2026-11-15) ----------------
     Three games for a child who cannot read yet, Danish only (they are about Danish sounds): clap the beats of a word,
     drag the rhyming piece, and find a secret word letter by letter. Every word below has a painted picture and a
     recorded clip of its name, and every list was checked by hand against how the word is said. */
  // Syllables as the word is said (Den Danske Ordbog), one entry per picture. test/brain.mjs checks each against
  // the word in LEX, and the brain's verify counts the vowels as a second route.
  var BEATS = [
    ['🐱', 'kat'], ['🐮', 'ko'], ['🐭', 'mus'], ['🏠', 'hus'], ['🌞', 'sol'], ['🚗', 'bil'], ['🐟', 'fisk'], ['🐴', 'hest'],
    ['🐷', 'gris'], ['🐐', 'ged'], ['🧀', 'ost'], ['🥚', 'æg'], ['🐸', 'frø'], ['🥄', 'ske'], ['🌳', 'træ'], ['🎩', 'hat'],
    ['🦈', 'haj'], ['🏰', 'slot'], ['🦅', 'ørn'], ['🐺', 'ulv'], ['🚌', 'bus'],
    ['🐒', 'a-be'], ['🦉', 'u-gle'], ['🦁', 'lø-ve'], ['🐜', 'my-re'], ['🌙', 'må-ne'], ['👑', 'kro-ne'], ['👃', 'næ-se'],
    ['🍐', 'pæ-re'], ['🍎', 'æb-le'], ['🥁', 'trom-me'], ['🧸', 'bam-se'], ['🐯', 'ti-ger'], ['🚀', 'ra-ket'], ['🤖', 'ro-bot'],
    ['🍌', 'ba-nan'], ['🐰', 'ka-nin'], ['🐬', 'del-fin'], ['🔨', 'ham-mer'], ['🐉', 'dra-ge'], ['🐍', 'slan-ge'], ['🍅', 'to-mat'],
    ['🐧', 'ping-vin'], ['🌋', 'vul-kan'], ['🧲', 'mag-net'], ['🎺', 'trom-pet'], ['🦀', 'krab-be'], ['⭐', 'stjer-ne'], ['🔑', 'nøg-le'],
    ['👂', 'ø-re'], ['🎈', 'bal-lon'],
    ['🐘', 'e-le-fant'], ['🍍', 'a-na-nas'], ['☔', 'pa-ra-ply'], ['🌈', 'regn-bu-e'], ['🐨', 'ko-a-la'], ['🦋', 'som-mer-fugl'],
    ['🥥', 'ko-kos-nød'], ['🍉', 'vand-me-lon'], ['🥕', 'gu-le-rod'], ['🥔', 'kar-tof-fel'], ['🦄', 'en-hjør-ning'], ['👻', 'spø-gel-se'],
    ['🐙', 'blæk-sprut-te'],
    ['🐊', 'kro-ko-dil-le'], ['🦜', 'pa-pe-gøj-e']
  ];
  // True Danish rhymes by sound, between pictures the game has (kat/hat, and/tand, bog/tog: same vowel, same end).
  // Two groups never rhyme with each other, so any piece from another group is a safe wrong one.
  var RHYME_PICS = [['🐱', '🎩'], ['🏠', '🐭'], ['🦆', '🦷'], ['📖', '🚂'], ['🍌', '🌋'], ['🐧', '🐬', '🐰'], ['🧲', '🎺'], ['☔', '☁️']];
  // Pictures whose name starts with the plain, expected sound of its first letter (no hj-, hv-, c-, no vowel that
  // sounds like another letter). Only the letters the secret words need are listed; none of them is q, w, x or z.
  var LETTER_PICS = {
    A: ['🐒', '🍍', '⚓'], B: ['🚗', '🚌', '🍌', '🧸', '🎈'], D: ['🐬', '🐉', '🚪'], E: ['🐘'], F: ['🐟', '🐸', '🐑'],
    G: ['🐷', '🐐'], H: ['🏠', '🐶', '🐴', '🎩', '🦈', '🔨'], K: ['🐱', '🐮', '🐰', '👑', '🦀'], L: ['🦁'],
    M: ['🐭', '🌙', '🐜', '🥛'], N: ['👃', '🔑'], O: ['🧀'], R: ['🚀', '🤖'], S: ['🌞', '🐍', '🥄', '☁️'],
    T: ['🍅', '🐯', '🥁', '🚂'], U: ['🦉', '🐺'], V: ['🌋'], 'Æ': ['🍎', '🥚'], 'Ø': ['👂', '🦅']
  };
  // Secret words: real short words with a picture, spelled only with letters above (never q, w, x or z), and with
  // no silent letter (so not "and" or "hund").
  var SECRET = [['🐱', 'kat'], ['🐮', 'ko'], ['🐭', 'mus'], ['🌞', 'sol'], ['🏠', 'hus'], ['🚌', 'bus'], ['🎩', 'hat'],
    ['🐐', 'ged'], ['🐒', 'abe'], ['🥄', 'ske'], ['🐺', 'ulv'], ['🐴', 'hest'], ['🐸', 'frø'], ['🌳', 'træ'], ['🏰', 'slot'],
    ['🦅', 'ørn'], ['🥚', 'æg'], ['👃', 'næse']];
  var PRAISE0 = ['Flot!', 'Ja!', 'Super!'];
  var T0 = {
    beatP: { da: 'Klap ordet', en: 'Clap the word' },
    beatS: { da: 'Klap ordet på trommen.', en: 'Clap the word on the drum.' },
    beatI: { da: 'Ét slag for hver del af ordet.', en: 'One beat for each part of the word.' },
    beatH1: { da: 'Sig ordet langsomt, og klap med.', en: 'Say the word slowly and clap along.' },
    rpP: { da: 'Hvilken brik rimer?', en: 'Which piece rhymes?' },
    rpI: { da: 'Træk den brik, der rimer, hen til billedet.', en: 'Drag the piece that rhymes to the picture.' },
    swP: { da: 'Find det hemmelige ord', en: 'Find the secret word' },
    swI: { da: 'Vælg det første bogstav i hvert billede.', en: 'Pick the first letter of each picture.' },
    swH1: { da: 'Lyt efter den første lyd.', en: 'Listen for the first sound.' },
    swH2: { da: 'Her er det hemmelige ord.', en: 'Here is the secret word.' }
  };
  function t0(k, L) { return T0[k][L] || T0[k].en; }
  function picName(e, L) { var w = wordOf(e, L); return w ? cap(w) + '.' : ''; }
  function vowels(w) { return (String(w).match(/[aeiouyæøå]/g) || []).length; }

  step({
    id: 'o14', grade: 0, langs: ['da'], name: { da: 'Klap ordet', sv: 'Klappa ordet', no: 'Klapp ordet', en: 'Clap the word' },
    pick: function (U, L, E) {
      var n = U.int(1, E ? 2 : 4), list = BEATS.filter(function (b) { return b[1].split('-').length === n; });
      return { e: U.pick(list)[0] };
    },
    key: function (p) { return p.e; },
    make: function (p, L, U) {
      var b = BEATS.filter(function (x) { return x[0] === p.e; })[0], w = wordOf(p.e, L);
      if (L !== 'da' || !b || !w || b[1].replace(/-/g, '') !== w) return null;
      var parts = b[1].split('-'), n = parts.length, name = picName(p.e, L);
      return {
        ui: 'beats', prompt: t0('beatP', L), say: t0('beatS', L) + ' ' + name, intro: t0('beatI', L),
        visual: null,
        beats: { emoji: p.e, n: n, max: 6, says: [name] },
        how: [H(parts.join(' – '), big(parts.join(' – ')), t0('beatH1', L)), H(String(n), { type: 'dots', n: n, emoji: '🥁' }, 'Det er ' + n + '.')],
        praise: U.pick(PRAISE0),
        key: { type: 'beats', lang: L }
      };
    }
  });

  step({
    id: 'o15', grade: 0, langs: ['da'], name: { da: 'Rim-brikker', sv: 'Rimbitar', no: 'Rimbrikker', en: 'Rhyme pieces' },
    pick: function (U) {
      var gi = U.int(0, RHYME_PICS.length - 1), pair = U.sample(RHYME_PICS[gi], 2);
      var others = [];
      RHYME_PICS.forEach(function (g, i) { if (i !== gi) others = others.concat(g); });
      return { t: pair[0], r: pair[1], x: U.sample(others, 2) };
    },
    key: function (p) { return p.t + '~' + p.r + '~' + p.x.join(''); },
    make: function (p, L, U) {
      if (L !== 'da' || !wordOf(p.t, L) || !wordOf(p.r, L) || p.x.some(function (e) { return !wordOf(e, L); })) return null;
      var ch = U.choice({ emoji: p.r }, p.x.map(function (e) { return { emoji: e }; }), 3);
      var tn = picName(p.t, L), rn = picName(p.r, L);
      return {
        ui: 'match', prompt: t0('rpP', L), say: tn + ' ' + t0('rpP', L), intro: t0('rpI', L),
        visual: null,
        match: { target: p.t, pieces: ch.options.map(function (o) { return { emoji: o.emoji, say: picName(o.emoji, L) }; }), correct: ch.correct, says: [tn].concat(ch.options.map(function (o) { return picName(o.emoji, L); })) },
        how: [H(tx(T.rhymeH0, L), { type: 'emoji', emoji: p.t }), H(tx(T.rhymeH, L, { w: cap(wordOf(p.t, L)), r: wordOf(p.r, L) }), { type: 'seq', items: [p.t, p.r] }, tn + ' ' + rn + ' De ender på samme lyd.')],
        praise: U.pick(PRAISE0),
        key: { type: 'rhymepiece', lang: L }
      };
    }
  });

  step({
    id: 'o16', grade: 0, langs: ['da'], name: { da: 'Hemmeligt ord', sv: 'Hemligt ord', no: 'Hemmelig ord', en: 'Secret word' },
    pick: function (U) {
      var s = U.pick(SECRET), ls = letters(s[1]);
      // one picture per letter, never the secret word's own picture, never the same picture twice
      var used = [s[0]], pics = [];
      for (var i = 0; i < ls.length; i++) {
        var pool = (LETTER_PICS[ls[i]] || []).filter(function (e) { return used.indexOf(e) < 0; });
        if (!pool.length) return null;
        var e = U.pick(pool); used.push(e); pics.push(e);
      }
      var fill = 'ABDEFGHKLMNORSTUVÆØ'.split('').filter(function (c) { return ls.indexOf(c) < 0; });
      return { e: s[0], pics: pics, x: U.sample(fill, ls.length <= 2 ? 2 : 3) };
    },
    key: function (p) { return p.e + ':' + p.pics.join(''); },
    make: function (p, L, U) {
      var w = wordOf(p.e, L);
      if (L !== 'da' || !w) return null;
      var ls = letters(w);
      if (ls.length !== p.pics.length || ls.length < 2 || ls.length > 4) return null;
      for (var i = 0; i < ls.length; i++) { var pw = wordOf(p.pics[i], L); if (!pw || up(pw.charAt(0)) !== ls[i]) return null; }
      var names = p.pics.map(function (e) { return picName(e, L); });
      return {
        ui: 'secret', prompt: t0('swP', L), say: t0('swP', L) + '. ' + names[0], intro: t0('swI', L),
        visual: null,
        secret: { pics: p.pics, word: up(w), target: p.e, tiles: U.shuffle(ls.concat(p.x)), says: names.concat(picName(p.e, L)) },
        how: [H(t0('swH1', L), { type: 'seq', items: p.pics }), H(ls.join(' ') + ' = ' + cap(w), { type: 'emoji', emoji: p.e }, t0('swH2', L) + ' ' + picName(p.e, L))],
        praise: U.pick(PRAISE0),
        key: { type: 'secret', lang: L }
      };
    }
  });

  // The ladder in class order (ids stay as they are: saves store them). Slice 4 put the class 0 pack in among the class 0
  // steps, easiest first; a save finds its step by id, so nobody moves (and src/brain.js shows a class 0 child the
  // new games he has passed, see migrate4).
  var ORDER = ['o14', 'o15', 'o01', 'o16', 'o02', 'o03', 'o04', 'o06', 'o05', 'o07', 'o11', 'o08', 'o12', 'o09', 'o10', 'o13'];
  steps.sort(function (a, b) { return ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });

  // shared with src/content/engelsk.js: the spelling task and the English sentences with a gap
  var kit = { spellTask: spellTask, H: H, big: big, cap: cap, up: up, letters: letters, close: close, spLetters: spLetters, wordOf: wordOf, LI: LI };
  var api = { steps: steps, lex: LEX, kit: kit, rhymes: RHYMES, compounds: COMPOUNDS, opposites: { da: OPP.da, sv: OPP.sv, no: OPP.no, en: OPP.en.concat(OPP_HARD_EN) },
    classes: CLASSES, sentences: SENTENCES, words: words,
    beats: BEATS, rhymePics: RHYME_PICS, letterPics: LETTER_PICS, secret: SECRET, vowels: vowels };
  G.Content.ord = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
