/* Content: hjerte (feelings, kindness, calm, not giving up, fairness). Heart moments by age band:
   A grades 0 to 1, B grades 2 to 3, C grades 4 to 5. The first option is always the kindest or wisest; make() shuffles.
   {Wild} / {wild} is the wild Gromonster in front of the child (its name when the battle passes one). */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : globalThis;
  var G = W.G = W.G || {};
  G.Content = G.Content || {};

  var WILD = { da: 'det vilde Gromonster', sv: 'den vilda', no: 'den ville', en: 'the wild one' };
  var OR = { da: 'eller', sv: 'eller', no: 'eller', en: 'or' };

  // m(id, band, topic, sceneEmoji, scene, prompt, why, options[[emoji, {da,sv,no,en}]...]) ; breathe moments have b instead of options
  var M = [];
  function m(id, topic, e, s, p, w, o) { M.push({ id: id, band: id.charAt(0), topic: topic, ui: 'choice', e: e, s: s, p: p, w: w, o: o }); }
  function br(id, e, s, p, w, b) { M.push({ id: id, band: id.charAt(0), topic: 'breathe', ui: 'breathe', e: e, s: s, p: p, w: w, b: b }); }
  function L4(da, sv, no, en) { return { da: da, sv: sv, no: no, en: en }; }

  /* ---------------- band A: grades 0 to 1 ---------------- */
  m('A01', 'feel', '😢',
    L4('{Wild} kan ikke finde sin ven og hænger med hovedet.', '{Wild} hittar inte sin vän. Den tittar ner i marken.', '{Wild} finner ikke vennen sin. Den ser ned i bakken.', "{Wild} can't find its friend. It is looking at the ground."),
    L4('Hvordan har Gromonsteret det?', 'Hur känner den sig?', 'Hvordan har den det?', 'How does it feel?'),
    L4('Når man savner en ven, bliver man ked af det.', 'När man saknar en vän blir man ledsen.', 'Når man savner en venn, blir man lei seg.', 'When you miss a friend, you feel sad.'),
    [['😢', L4('Ked af det', 'Ledsen', 'Lei seg', 'Sad')], ['😄', L4('Glad', 'Glad', 'Glad', 'Happy')], ['😠', L4('Vred', 'Arg', 'Sint', 'Angry')]]);
  m('A02', 'feel', '🚲',
    L4('Mia har fået en ny cykel. Hun smiler hele vejen hjem.', 'Mia har fått en ny cykel. Hon ler hela vägen hem.', 'Mia har fått ny sykkel. Hun smiler hele veien hjem.', 'Mia has a new bike. She smiles all the way home.'),
    L4('Hvordan har Mia det?', 'Hur känner sig Mia?', 'Hvordan har Mia det?', 'How does Mia feel?'),
    L4('Når man smiler hele vejen hjem, er man glad.', 'Ett stort leende visar att Mia är glad.', 'Et stort smil viser at Mia er glad.', 'A big smile shows that Mia is happy.'),
    [['😄', L4('Glad', 'Glad', 'Glad', 'Happy')], ['😨', L4('Bange', 'Rädd', 'Redd', 'Scared')], ['😢', L4('Ked af det', 'Ledsen', 'Lei seg', 'Sad')]]);
  m('A03', 'feel', '💥',
    L4('Pludselig lyder der et stort brag. {Wild} gemmer sig bag en sten.', 'Det hörs en hög smäll. {Wild} gömmer sig bakom en sten.', 'Det kommer et høyt smell. {Wild} gjemmer seg bak en stein.', 'There is a loud bang. {Wild} hides behind a rock.'),
    L4('Hvordan har Gromonsteret det?', 'Hur känner den sig?', 'Hvordan har den det?', 'How does it feel?'),
    L4('Man gemmer sig tit, når man bliver bange.', 'När man gömmer sig för en smäll är man ofta rädd.', 'Når man gjemmer seg for et smell, er man ofte redd.', 'When you hide from a loud bang, you often feel scared.'),
    [['😨', L4('Bange', 'Rädd', 'Redd', 'Scared')], ['😄', L4('Glad', 'Glad', 'Glad', 'Happy')], ['😴', L4('Træt', 'Trött', 'Trøtt', 'Sleepy')]]);
  m('A04', 'help', '🤕',
    L4('En dreng falder i skolegården og slår knæet.', 'En pojke ramlar på skolgården och slår i knät.', 'En gutt faller i skolegården og slår kneet.', 'A boy falls over in the playground and hurts his knee.'),
    L4('Hvad kan du gøre?', 'Vad kan du göra?', 'Hva kan du gjøre?', 'What can you do?'),
    L4('Når du spørger, ved han, at du har set det. Så kan I hente hjælp sammen.', 'När du frågar ser han att du bryr dig. Sedan kan ni hitta hjälp.', 'Når du spør, ser han at du bryr deg. Så kan dere finne hjelp.', 'Asking shows you care. Then you can get help together.'),
    [['🤝', L4('Spørge om han er okay', 'Fråga om han är okej', 'Spørre om han er ok', 'Ask if he is okay')], ['⚽', L4('Lege videre', 'Leka vidare', 'Leke videre', 'Keep playing')],
      ['🙈', L4('Lade som ingenting', 'Låtsas som ingenting', 'Late som ingenting', 'Pretend you did not see')]]);
  m('A05', 'help', '🍓',
    L4('{Wild} vil gerne have et bær, men det hænger for højt.', '{Wild} vill ha ett bär, men det sitter för högt.', '{Wild} vil ha et bær, men det henger for høyt.', '{Wild} wants a berry, but it hangs too high.'),
    L4('Hvad kan du gøre?', 'Vad kan du göra?', 'Hva kan du gjøre?', 'What can you do?'),
    L4('Med lidt hjælp kan Gromonsteret selv nå bærret.', 'Med din hjälp når den bäret själv.', 'Med din hjelp når den bæret selv.', 'With your help, it can reach the berry itself.'),
    [['🙌', L4('Løfte Gromonsteret op', 'Lyfta upp den', 'Løfte den opp', 'Lift it up')], ['😋', L4('Spise bærret selv', 'Äta bäret själv', 'Spise bæret selv', 'Eat the berry yourself')],
      ['🚶', L4('Gå videre', 'Gå vidare', 'Gå videre', 'Walk on')]]);
  br('A06', '😌',
    L4('{Wild} er stadig lidt bange. Lad os trække vejret roligt sammen.', '{Wild} är fortfarande lite orolig. Andas lugnt tillsammans med den.', '{Wild} er fortsatt litt urolig. Pust rolig sammen med den.', '{Wild} is still a little restless. Breathe slowly with it.'),
    L4('Træk vejret sammen', 'Andas tillsammans', 'Pust sammen', 'Breathe together'),
    L4('Når du trækker vejret langsomt, falder kroppen til ro.', 'Långsamma andetag gör kroppen lugn.', 'Langsomme pust gjør kroppen rolig.', 'Slow breaths help your body calm down.'),
    { breaths: 3, inMs: 3000, outMs: 4000 });
  br('A07', '💓',
    L4('Puha, dit hjerte banker hurtigt efter kampen. Lad os trække vejret helt roligt.', 'Ditt hjärta slår snabbt efter striden. Vi andas lugnt.', 'Hjertet ditt slår fort etter kampen. Vi puster rolig.', "Your heart is beating fast after the battle. Let's breathe slowly."),
    L4('Træk vejret roligt', 'Andas lugnt', 'Pust rolig', 'Breathe slowly'),
    L4('Når du puster langsomt ud, falder hjertet til ro.', 'När du andas ut långsamt lugnar hjärtat sig.', 'Når du puster sakte ut, roer hjertet seg.', 'When you breathe out slowly, your heart calms down.'),
    { breaths: 3, inMs: 3000, outMs: 4000 });
  m('A08', 'grit', '👟',
    L4('Du kan ikke binde dine snørebånd endnu. Det driller.', 'Du kan inte knyta skorna än. Det är knepigt.', 'Du klarer ikke å knyte skoene ennå. Det er vanskelig.', "You can't tie your shoes yet. It is tricky."),
    L4('Hvad kan du sige til dig selv?', 'Vad kan du säga till dig själv?', 'Hva kan du si til deg selv?', 'What can you tell yourself?'),
    L4('Du kan det bare ikke endnu. Hver gang du øver, bliver du lidt bedre.', 'Du kan det bara inte än. Varje gång du övar kommer du närmare.', 'Du kan det bare ikke ennå. Hver gang du øver, kommer du nærmere.', 'You just cannot do it yet. Every time you practise, you get closer.'),
    [['💪', L4('Jeg øver, så lærer jeg det', 'Jag övar, så lär jag mig', 'Jeg øver, så lærer jeg det', 'I will practise and learn it')],
      ['😞', L4('Jeg kan aldrig lære det', 'Jag lär mig aldrig', 'Jeg lærer det aldri', 'I will never learn it')], ['😑', L4('Jeg gider ikke', 'Jag orkar inte', 'Jeg gidder ikke', "I can't be bothered")]]);
  m('A09', 'grit', '🧱',
    L4('Dit klodstårn vælter for tredje gang.', 'Ditt klosstorn rasar för tredje gången.', 'Klosstårnet ditt faller for tredje gang.', 'Your tower of blocks falls down for the third time.'),
    L4('Hvad gør du nu?', 'Vad gör du nu?', 'Hva gjør du nå?', 'What do you do now?'),
    L4('Hver gang tårnet vælter, lærer du noget nyt om at bygge.', 'Varje gång tornet rasar lär du dig något om hur det kan stå stadigt.', 'Hver gang tårnet faller, lærer du noe om hvordan det kan stå støtt.', 'Each time it falls, you learn something about how to make it stand.'),
    [['🔁', L4('Prøve igen på en ny måde', 'Försöka igen på ett nytt sätt', 'Prøve igjen på en ny måte', 'Try again a new way')],
      ['😤', L4('Smide med klodserne', 'Kasta klossarna', 'Kaste klossene', 'Throw the blocks')], ['🛑', L4('Give op', 'Ge upp', 'Gi opp', 'Give up')]]);
  m('A10', 'team', '🚗',
    L4('Du og Ali vil begge lege med den røde bil.', 'Du och Ali vill båda leka med den röda bilen.', 'Du og Ali vil begge leke med den røde bilen.', 'You and Ali both want to play with the red car.'),
    L4('Hvad er fair?', 'Vad är rättvist?', 'Hva er rettferdig?', 'What is fair?'),
    L4('Når I skiftes, får I begge en tur. Og så kan I blive ved med at lege.', 'När ni turas om får båda en tur, och leken kan fortsätta.', 'Når dere bytter på, får begge en tur, og leken kan fortsette.', 'When you take turns, you both get a go and the game goes on.'),
    [['🔄', L4('Skiftes til at lege med den', 'Turas om med den', 'Bytte på med den', 'Take turns with it')], ['✊', L4('Snuppe den først', 'Ta den först', 'Ta den først', 'Grab it first')],
      ['😭', L4('Græde til du får den', 'Gråta tills du får den', 'Gråte til du får den', 'Cry until you get it')]]);
  m('A11', 'team', '👧',
    L4('En pige står helt alene og kigger på, mens I leger.', 'En flicka står ensam och tittar på er lek.', 'En jente står alene og ser på leken deres.', 'A girl stands alone, watching your game.'),
    L4('Hvad kan du gøre?', 'Vad kan du göra?', 'Hva kan du gjøre?', 'What can you do?'),
    L4('Det er rart at blive spurgt. Måske får du en ny ven.', 'Det känns fint att bli tillfrågad. Kanske får du en ny lekkamrat.', 'Det er fint å bli spurt. Kanskje får du en ny lekekamerat.', 'It feels good to be asked. You might make a new friend.'),
    [['👋', L4('Spørge om hun vil være med', 'Fråga om hon vill vara med', 'Spørre om hun vil være med', 'Ask if she wants to join')], ['🏃', L4('Lege videre', 'Leka vidare', 'Leke videre', 'Keep playing')],
      ['🙈', L4('Kigge væk', 'Titta bort', 'Se bort', 'Look away')]]);
  m('A12', 'team', '🏰',
    L4('Du løber forbi og kommer til at vælte Saras tårn.', 'Du råkar välta Saras torn när du springer förbi.', 'Du kommer borti tårnet til Sara når du løper forbi, og det faller.', "You knock over Sara's tower by accident as you run past."),
    L4('Hvad gør du?', 'Vad gör du?', 'Hva gjør du?', 'What do you do?'),
    L4('Når du siger undskyld og hjælper med at bygge, bliver det godt igen.', 'Ett förlåt och lite hjälp gör det bra igen.', 'Et unnskyld og litt hjelp gjør det godt igjen.', 'Saying sorry and helping makes it right again.'),
    [['🙏', L4('Sige undskyld og hjælpe', 'Säga förlåt och hjälpa till', 'Si unnskyld og hjelpe', 'Say sorry and help')], ['🏃', L4('Løbe videre', 'Springa vidare', 'Løpe videre', 'Keep running')],
      ['🤷', L4('Lade som om det ikke var dig', 'Låtsas att det inte var du', 'Late som det ikke var deg', 'Pretend it was not you')]]);

  /* ---------------- band B: grades 2 to 3 ---------------- */
  m('B01', 'feel', '🎂',
    L4('Jonas har glædet sig til en fødselsdag. Nu er den blevet aflyst.', 'Jonas längtade till ett kalas, men det blev inställt.', 'Jonas gledet seg til et bursdagsselskap, men det ble avlyst.', 'Jonas was looking forward to a party, but it was cancelled.'),
    L4('Hvordan har Jonas det?', 'Hur känner sig Jonas?', 'Hvordan har Jonas det?', 'How does Jonas feel?'),
    L4('Når noget dejligt bliver aflyst, bliver man skuffet.', 'När något man längtat efter inte blir av, blir man besviken.', 'Når noe man gledet seg til ikke blir noe av, blir man skuffet.', 'When something you looked forward to does not happen, you feel disappointed.'),
    [['😞', L4('Skuffet', 'Besviken', 'Skuffet', 'Disappointed')], ['😊', L4('Stolt', 'Stolt', 'Stolt', 'Proud')], ['😨', L4('Bange', 'Rädd', 'Redd', 'Scared')]]);
  m('B02', 'feel', '🏊',
    L4('{Wild} har øvet længe og svømmer nu over hele søen.', '{Wild} har övat länge och simmar nu över hela sjön.', '{Wild} har øvd lenge og svømmer nå over hele vannet.', '{Wild} practised for ages and can now swim across the whole lake.'),
    L4('Hvordan har Gromonsteret det?', 'Hur känner den sig?', 'Hvordan har den det?', 'How does it feel?'),
    L4('Når man har øvet længe og endelig kan det, bliver man stolt.', 'När man har övat och äntligen kan, blir man stolt.', 'Når man har øvd og endelig får det til, blir man stolt.', 'When you practise and finally can do it, you feel proud.'),
    [['😊', L4('Stolt', 'Stolt', 'Stolt', 'Proud')], ['😠', L4('Vred', 'Arg', 'Sint', 'Angry')], ['😞', L4('Skuffet', 'Besviken', 'Skuffet', 'Disappointed')]]);
  m('B03', 'feel', '🎤',
    L4('Emma skal synge alene foran klassen i morgen.', 'Emma ska sjunga ensam inför klassen i morgon.', 'Emma skal synge alene foran klassen i morgen.', 'Emma has to sing on her own in front of the class tomorrow.'),
    L4('Hvordan har Emma det?', 'Hur känner sig Emma?', 'Hvordan har Emma det?', 'How does Emma feel?'),
    L4('Det er helt normalt at være nervøs, før man skal noget nyt og svært.', 'Inför något nytt och svårt är det helt vanligt att vara nervös.', 'Før noe nytt og vanskelig er det helt vanlig å være nervøs.', 'Before something new and hard, it is normal to feel nervous.'),
    [['😬', L4('Nervøs', 'Nervös', 'Nervøs', 'Nervous')], ['😠', L4('Vred', 'Arg', 'Sint', 'Angry')], ['😑', L4('Ligeglad', 'Uttråkad', 'Kjeder seg', 'Bored')]]);
  m('B04', 'help', '🍱',
    L4('En ny pige i klassen står med sin madpakke. Hun ved ikke, hvor hun skal sidde.', 'En ny elev står med sin matlåda och vet inte var hon ska sitta.', 'En ny elev står med matpakken sin og vet ikke hvor hun skal sitte.', "A new pupil is holding her lunch and doesn't know where to sit."),
    L4('Hvad kan du gøre?', 'Vad kan du göra?', 'Hva kan du gjøre?', 'What can you do?'),
    L4('Når du spørger, føler hun sig velkommen allerede på første dag.', 'När du bjuder in henne känner hon sig välkommen redan första dagen.', 'Når du inviterer henne, føler hun seg velkommen fra første dag.', 'When you invite her, she feels welcome from day one.'),
    [['😊', L4('Spørge om hun vil sidde hos jer', 'Säga: Du kan sitta hos oss', 'Si: Du kan sitte hos oss', 'Say: You can sit with us')], ['🍎', L4('Spise videre', 'Äta vidare', 'Spise videre', 'Keep eating')],
      ['👀', L4('Vente og se om en anden hjælper', 'Vänta och se om någon annan hjälper', 'Vente og se om noen andre hjelper', 'Wait and see if someone else helps')]]);
  m('B05', 'help', '🐾',
    L4('{Wild} har ondt i poten efter kampen.', '{Wild} har ont i tassen efter striden.', '{Wild} har vondt i labben etter kampen.', '{Wild} has a sore paw after the battle.'),
    L4('Hvad er det bedste at gøre?', 'Vad är bäst att göra?', 'Hva er det beste å gjøre?', 'What is the best thing to do?'),
    L4('Når man har ondt, har man brug for at hvile. Og det er rart, at nogen passer på en.', 'När något gör ont behöver man vila och någon som tar hand om en.', 'Når noe gjør vondt, trenger man ro og noen som passer på en.', 'When something hurts, you need rest and someone to look after you.'),
    [['💚', L4('Lade det hvile og passe på det', 'Låta den vila och ta hand om den', 'La den hvile og passe på den', 'Let it rest and look after it')],
      ['🏃', L4('Lege fangeleg med det', 'Leka kull med den', 'Leke sisten med den', 'Play tag with it')], ['🚶', L4('Lade det være alene', 'Lämna den ensam', 'La den være alene', 'Leave it on its own')]]);
  br('B06', '😤',
    L4('Du er sur, fordi du tabte spillet. Lad os trække vejret dybt 3 gange.', 'Du är arg för att spelet gick dåligt. Ta tre lugna andetag.', 'Du er sint fordi spillet gikk dårlig. Ta tre rolige pust.', 'You are cross because the game went badly. Take three calm breaths.'),
    L4('Træk vejret roligt', 'Andas lugnt', 'Pust rolig', 'Breathe calmly'),
    L4('Når du trækker vejret roligt, får du tid til at tænke, før du gør noget.', 'Lugna andetag ger dig tid att tänka innan du gör något.', 'Rolige pust gir deg tid til å tenke før du gjør noe.', 'Calm breaths give you time to think before you act.'),
    { breaths: 3, inMs: 4000, outMs: 5000 });
  br('B07', '😌',
    L4('{Wild} ryster stadig efter kampen. Lad os trække vejret langsomt sammen.', '{Wild} darrar fortfarande efter striden. Andas långsamt tillsammans med den.', '{Wild} skjelver fortsatt etter kampen. Pust sakte sammen med den.', '{Wild} is still shaking after the battle. Breathe slowly with it.'),
    L4('Træk vejret sammen', 'Andas tillsammans', 'Pust sammen', 'Breathe together'),
    L4('Når du er rolig, falder Gromonsteret også til ro.', 'När du är lugn blir den också lugn.', 'Når du er rolig, blir den også rolig.', 'When you are calm, it calms down too.'),
    { breaths: 3, inMs: 4000, outMs: 5000 });
  m('B08', 'grit', '📝',
    L4('Gangestykkerne er svære i dag. Du har allerede lavet 3 fejl.', 'Gångertabellerna är svåra i dag, och du har gjort tre fel.', 'Gangestykkene er vanskelige i dag, og du har gjort tre feil.', 'The times tables are hard today, and you made three mistakes.'),
    L4('Hvad kan du sige til dig selv?', 'Vad kan du säga till dig själv?', 'Hva kan du si til deg selv?', 'What can you tell yourself?'),
    L4('Fejl viser, hvad du skal øve. Du kan det bare ikke endnu.', 'Fel visar vad du ska öva på. Inte än är inte samma sak som aldrig.', 'Feil viser hva du skal øve på. Ikke ennå er ikke det samme som aldri.', 'Mistakes show what to practise. Not yet is not the same as never.'),
    [['🌱', L4('Jeg kan det ikke endnu, men jeg øver', 'Jag kan det inte än, men jag övar', 'Jeg kan det ikke ennå, men jeg øver', "I can't do it yet, but I'm practising")],
      ['😞', L4('Jeg er bare dårlig til matte', 'Jag är bara dålig på matte', 'Jeg er bare dårlig i matte', "I'm just bad at maths")], ['🙅', L4('Jeg springer dem over', 'Jag hoppar över dem', 'Jeg hopper over dem', "I'll skip them")]]);
  m('B09', 'grit', '⚽',
    L4('Du har skudt forbi målet 3 gange i træk.', 'Du har skjutit bredvid målet tre gånger i rad.', 'Du har skutt utenfor målet tre ganger på rad.', 'You have missed the goal three times in a row.'),
    L4('Hvad gør du?', 'Vad gör du?', 'Hva gjør du?', 'What do you do?'),
    L4('Når du prøver på en ny måde, har du en ny chance for at score.', 'Ett nytt sätt att försöka ger en ny chans att träffa.', 'En ny måte å prøve på gir en ny sjanse til å treffe.', 'Trying a new way gives you a new chance to score.'),
    [['🎯', L4('Prøve at sigte på en ny måde', 'Försöka sikta på ett nytt sätt', 'Prøve å sikte på en ny måte', 'Try aiming a new way')], ['🛑', L4('Holde op med at spille', 'Sluta spela', 'Slutte å spille', 'Stop playing')],
      ['😠', L4('Sige at det er boldens skyld', 'Säga att det är bollens fel', 'Si at det er ballens skyld', "Say it is the ball's fault")]]);
  m('B10', 'team', '🍪',
    L4('Du og 2 venner skal dele 6 småkager.', 'Du och två kompisar har sex kakor att dela på.', 'Du og to venner har seks kjeks å dele.', 'You and two friends have six biscuits to share.'),
    L4('Hvad er fair?', 'Vad är rättvist?', 'Hva er rettferdig?', 'What is fair?'),
    L4('6 delt med 3 er 2. Så får I lige mange hver.', 'Sex delat på tre blir två var. Då blir det lika.', 'Seks delt på tre blir to til hver. Da blir det likt.', 'Six shared between three is two each. That is fair.'),
    [['🍪', L4('2 til hver', 'Två var', 'To til hver', 'Two each')], ['😋', L4('Flest til mig, jeg fandt dem', 'Flest till mig, jag hittade dem', 'Flest til meg, jeg fant dem', 'Most for me, I found them')],
      ['🏃', L4('Den hurtigste får flest', 'Den snabbaste får flest', 'Den raskeste får flest', 'The fastest gets the most')]]);
  m('B11', 'team', '🥅',
    L4('Du og Noah er uenige om reglerne. Nu går legen i stå.', 'Du och Noah är oense om reglerna, och leken stannar av.', 'Du og Noah er uenige om reglene, og leken stopper opp.', 'You and Noah disagree about the rules, and the game stops.'),
    L4('Hvad kan I gøre?', 'Vad kan ni göra?', 'Hva kan dere gjøre?', 'What can you do?'),
    L4('Når I bliver enige om en regel, kan I begge lege videre.', 'När ni hittar en regel tillsammans kan ni båda leka vidare.', 'Når dere finner en regel sammen, kan dere begge leke videre.', 'When you agree on a rule together, you can both keep playing.'),
    [['🤝', L4('Blive enige om en regel', 'Hitta en regel ni båda gillar', 'Finne en regel dere begge liker', 'Find a rule you both like')], ['🏠', L4('Tage bolden med hjem', 'Ta med bollen hem', 'Ta med ballen hjem', 'Take the ball home')],
      ['📢', L4('Råbe højere end Noah', 'Skrika högre än Noah', 'Rope høyere enn Noah', 'Shout louder than Noah')]]);
  m('B12', 'team', '😔',
    L4('En dreng i klassen bliver drillet hver dag i frikvarteret.', 'En pojke i klassen blir retad varje dag på rasten.', 'En gutt i klassen blir ertet hver dag i friminuttet.', 'A boy in your class gets teased every day at break time.'),
    L4('Hvad er det bedste at gøre?', 'Vad är bäst att göra?', 'Hva er det beste å gjøre?', 'What is the best thing to do?'),
    L4('En voksen kan hjælpe med at få det stoppet. Det er ikke at sladre.', 'En vuxen kan hjälpa till att stoppa retandet. Det är inte att skvallra.', 'En voksen kan hjelpe med å stoppe ertingen. Det er ikke å sladre.', 'A grown-up can help stop the teasing. That is not telling tales.'),
    [['🙋', L4('Sige det til en voksen', 'Berätta för en vuxen', 'Si fra til en voksen', 'Tell a grown-up')], ['🙈', L4('Kigge væk', 'Titta bort', 'Se bort', 'Look away')],
      ['🤐', L4('Tænke at det ikke er din sag', 'Tänka att det inte är din sak', 'Tenke at det ikke er din sak', 'Think it is none of your business')]]);

  /* ---------------- band C: grades 4 to 5 ---------------- */
  m('C01', 'feel', '📄',
    L4('Lars har øvet hele ugen. Alligevel fik han mange fejl i prøven.', 'Lars övade hela veckan men fick ändå många fel på provet.', 'Lars øvde hele uka, men fikk likevel mange feil på prøven.', 'Lars practised all week but still got lots wrong in the test.'),
    L4('Hvordan har Lars det?', 'Hur känner sig Lars?', 'Hvordan har Lars det?', 'How does Lars feel?'),
    L4('Det er frustrerende, når man har kæmpet, og det alligevel ikke lykkes.', 'När man har kämpat och det ändå inte går känns det frustrerande.', 'Når man har jobbet hardt og det ikke går, føles det frustrerende.', 'When you have worked hard and it still goes wrong, it feels frustrating.'),
    [['😣', L4('Frustreret', 'Frustrerad', 'Frustrert', 'Frustrated')], ['😌', L4('Lettet', 'Lättad', 'Lettet', 'Relieved')], ['😊', L4('Stolt', 'Stolt', 'Stolt', 'Proud')]]);
  m('C02', 'feel', '🎒',
    L4('Din ven skal på en sjov tur. Du ville også så gerne med.', 'Din kompis får följa med på en resa som du också ville åka på.', 'Vennen din får bli med på en tur som du også hadde lyst til å være med på.', 'Your friend gets to go on a trip that you wanted to go on too.'),
    L4('Hvordan tror du, du har det?', 'Hur känner du dig kanske?', 'Hvordan har du det kanskje?', 'How might you feel?'),
    L4('Det er helt normalt at blive misundelig. Du kan godt være glad på din vens vegne.', 'Det är vanligt att bli avundsjuk. Du kan ändå bli glad för din kompis skull.', 'Det er vanlig å bli misunnelig. Du kan likevel være glad på vennens vegne.', 'Feeling jealous is normal. You can still be happy for your friend.'),
    [['😒', L4('Misundelig', 'Avundsjuk', 'Misunnelig', 'Jealous')], ['😌', L4('Rolig', 'Lugn', 'Rolig', 'Calm')], ['😊', L4('Stolt', 'Stolt', 'Stolt', 'Proud')]]);
  m('C03', 'feel', '😳',
    L4('Du snubler foran hele klassen. Alle kigger på dig.', 'Du snubblar inför hela klassen, och alla tittar.', 'Du snubler foran hele klassen, og alle ser på deg.', 'You trip over in front of the whole class, and everyone looks.'),
    L4('Hvordan tror du, du har det?', 'Hur känner du dig kanske?', 'Hvordan har du det kanskje?', 'How might you feel?'),
    L4('Det er flovt, når alle kigger. Men det går over, og det sker for alle.', 'Det känns pinsamt när alla tittar. Det går över, och det händer alla.', 'Det er flaut når alle ser. Det går over, og det skjer med alle.', 'It feels awkward when everyone looks. It passes, and it happens to everyone.'),
    [['😳', L4('Flov', 'Generad', 'Flau', 'Embarrassed')], ['😊', L4('Stolt', 'Stolt', 'Stolt', 'Proud')], ['😒', L4('Misundelig', 'Avundsjuk', 'Misunnelig', 'Jealous')]]);
  m('C04', 'help', '💬',
    L4('Din ven siger, at han ikke har nogen at være sammen med i frikvarteret.', 'Din kompis säger att han inte har någon att vara med på rasterna.', 'Vennen din sier at han ikke har noen å være sammen med i friminuttene.', 'Your friend says he has no one to be with at break time.'),
    L4('Hvad er det bedste at gøre?', 'Vad är bäst att göra?', 'Hva er det beste å gjøre?', 'What is the best thing to do?'),
    L4('Når du lytter, ved han, at du tager ham alvorligt. Og nu har han dig.', 'När du lyssnar visar du att du tar honom på allvar. Och nu har han dig.', 'Når du lytter, viser du at du tar ham på alvor. Og nå har han deg.', 'Listening shows you take him seriously. And now he has you.'),
    [['👂', L4('Lytte og spørge om I skal finde på noget sammen', 'Lyssna och fråga om ni ska hitta på något', 'Lytte og spørre om dere skal finne på noe', 'Listen, then ask if you can do something together')],
      ['🤷', L4('Sige at det nok går over', 'Säga: Det går nog över', 'Si: Det går nok over', 'Say: It will pass')], ['🔀', L4('Snakke om noget andet', 'Byta ämne', 'Bytte tema', 'Change the subject')]]);
  m('C05', 'help', '🥪',
    L4('En klassekammerat har glemt sin madpakke og er sulten.', 'En klasskompis har glömt sin matlåda och är hungrig.', 'En klassekamerat har glemt matpakken sin og er sulten.', 'A classmate forgot his lunch and is hungry.'),
    L4('Hvad kan du gøre?', 'Vad kan du göra?', 'Hva kan du gjøre?', 'What can you do?'),
    L4('Når man er sulten, betyder lidt mad rigtig meget.', 'Lite av din mat gör stor skillnad för någon som är hungrig.', 'Litt av maten din gjør stor forskjell for en som er sulten.', 'A little of your food makes a big difference to someone hungry.'),
    [['🥪', L4('Dele din madpakke med ham', 'Dela med dig av din mat', 'Dele litt av maten din', 'Share some of your food')],
      ['🤷', L4('Sige at han må huske den næste gang', 'Säga att han får komma ihåg den nästa gång', 'Si at han må huske den neste gang', 'Tell him to remember it next time')],
      ['🙈', L4('Lade som om du ikke ser det', 'Låtsas att du inte ser det', 'Late som du ikke ser det', 'Pretend you did not notice')]]);
  br('C06', '📝',
    L4('I morgen skal du til prøve, og du har sommerfugle i maven. Træk vejret langsomt.', 'I morgon är det prov, och det pirrar i magen. Andas långsamt.', 'I morgen er det prøve, og det kribler i magen. Pust sakte.', 'There is a test tomorrow, and your tummy feels fizzy. Breathe slowly.'),
    L4('Træk vejret langsomt', 'Andas långsamt', 'Pust sakte', 'Breathe slowly'),
    L4('Når du puster længere ud end ind, falder kroppen til ro.', 'När du andas ut längre än du andas in, lugnar kroppen sig.', 'Når du puster lenger ut enn inn, roer kroppen seg.', 'Breathing out for longer than you breathe in helps your body calm down.'),
    { breaths: 4, inMs: 4000, outMs: 6000 });
  br('C07', '😠',
    L4('{Wild} brummer stadig af vrede. Vis, hvordan man trækker vejret roligt.', '{Wild} är fortfarande arg. Visa den hur man andas lugnt.', '{Wild} er fortsatt sint. Vis den hvordan man puster rolig.', '{Wild} is still angry. Show it how to breathe calmly.'),
    L4('Vis hvordan man gør', 'Visa den lugnet', 'Vis den roen', 'Show it how'),
    L4('Når du selv er rolig, hjælper du andre med at falde til ro.', 'Du kan hjälpa andra att lugna sig genom att själv vara lugn.', 'Du kan hjelpe andre å roe seg ved selv å være rolig.', 'You can help others calm down by staying calm yourself.'),
    { breaths: 4, inMs: 4000, outMs: 6000 });
  m('C08', 'grit', '🧠',
    L4('Du har prøvet en svær opgave 3 gange. Det er ikke lykkedes endnu.', 'Du har försökt med en svår uppgift tre gånger utan att lyckas.', 'Du har prøvd en vanskelig oppgave tre ganger uten å få det til.', 'You have tried a hard task three times without getting it.'),
    L4('Hvad er det klogeste at gøre?', 'Vad är klokast?', 'Hva er lurest?', 'What is the wisest thing to do?'),
    L4('Et hint kan vise dig en ny vej. Hjernen bliver stærkere af svære ting.', 'Ett tips kan visa en ny väg. Hjärnan blir starkare när den jobbar med svåra saker.', 'Et tips kan vise en ny vei. Hjernen blir sterkere når den jobber med vanskelige ting.', 'A tip can show a new way. Your brain gets stronger when it works on hard things.'),
    [['💡', L4('Bede om et hint og prøve igen', 'Be om ett tips och försöka igen', 'Be om et tips og prøve igjen', 'Ask for a tip and try again')],
      ['😞', L4('Tænke at du bare ikke er klog nok', 'Säga: Jag är bara inte smart nog', 'Si: Jeg er bare ikke smart nok', "Say: I'm just not clever enough")],
      ['👀', L4('Skrive af efter sidemanden', 'Skriva av någon annans svar', 'Skrive av noen andres svar', "Copy someone else's answer")]]);
  m('C09', 'grit', '🎨',
    L4('Din tegning ligner slet ikke det, du havde i hovedet.', 'Din teckning liknar inte alls det du hade i huvudet.', 'Tegningen din ligner ikke i det hele tatt på det du hadde i hodet.', 'Your drawing looks nothing like the picture in your head.'),
    L4('Hvad kan du sige til dig selv?', 'Vad kan du säga till dig själv?', 'Hva kan du si til deg selv?', 'What can you tell yourself?'),
    L4('Alle, der tegner godt, har øvet sig meget. Hver tegning lærer dig noget til den næste.', 'Alla som ritar övar. Varje teckning lär dig något inför nästa.', 'Alle som tegner, øver. Hver tegning lærer deg noe til den neste.', 'Everyone who draws practises. Each drawing teaches you something for the next.'),
    [['🎨', L4('Den her var til øvelse. Den næste bliver bedre', 'Det är en övningsteckning, nästa blir bättre', 'Det er en øvetegning, neste blir bedre', 'It is a practice drawing, the next will be better')],
      ['😤', L4('Jeg kan ikke tegne, så jeg stopper', 'Jag kan inte rita, så jag slutar', 'Jeg kan ikke tegne, så jeg slutter', "I can't draw, so I'll stop")], ['🙄', L4('Det er dumt at tegne', 'Att rita är dumt', 'Tegning er dumt', 'Drawing is silly')]]);
  m('C10', 'team', '📱',
    L4('I klassens chat skriver nogen grimme ting om en pige i klassen.', 'I klassens chatt skriver någon elaka saker om en tjej i klassen.', 'I klassechatten skriver noen stygge ting om en jente i klassen.', 'In the class chat, someone is writing mean things about a girl in your class.'),
    L4('Hvad er det bedste at gøre?', 'Vad är bäst att göra?', 'Hva er det beste å gjøre?', 'What is the best thing to do?'),
    L4('Grimme ord på nettet gør lige så ondt. En voksen kan hjælpe med at stoppe det.', 'Elaka ord på nätet gör lika ont. En vuxen kan hjälpa till att stoppa det.', 'Stygge ord på nett gjør like vondt. En voksen kan hjelpe med å stoppe det.', 'Mean words online hurt just as much. A grown-up can help stop it.'),
    [['🙋', L4('Ikke skrive med, men sige det til en voksen', 'Inte skriva med och berätta för en vuxen', 'Ikke skrive med og si fra til en voksen', "Don't join in, and tell a grown-up")],
      ['👀', L4('Læse med uden at sige noget', 'Läsa utan att säga något', 'Lese uten å si noe', 'Read along and say nothing')], ['😠', L4('Skrive noget grimt tilbage', 'Skriva något elakt tillbaka', 'Skrive noe stygt tilbake', 'Write something mean back')]]);
  m('C11', 'team', '🎒',
    L4('Nogle fra klassen vil gemme en drengs taske for sjov. De vil have dig med.', 'Några kompisar vill att du ska hjälpa till att gömma en elevs väska på skoj.', 'Noen venner vil at du skal være med på å gjemme sekken til en elev for moro skyld.', "Some friends want you to help hide a pupil's bag for a laugh."),
    L4('Hvad gør du?', 'Vad gör du?', 'Hva gjør du?', 'What do you do?'),
    L4('Det kræver mod at sige nej. Og den, der leder efter sin taske, synes ikke, det er sjovt.', 'Det är modigt att säga nej. Den som blir av med sin väska tycker inte att det är roligt.', 'Det er modig å si nei. Den som mister sekken sin, synes ikke det er morsomt.', 'Saying no takes courage. The one who loses the bag does not find it funny.'),
    [['🙅', L4('Sige nej tak og lade være', 'Säga nej tack och låta bli', 'Si nei takk og la være', 'Say no thanks and stay out of it')],
      ['😬', L4('Gøre det, så de ikke bliver sure', 'Göra det så att de inte blir sura', 'Gjøre det så de ikke blir sure', "Do it so they don't get annoyed")], ['🤷', L4('Bare kigge på og grine med', 'Göra det, men bara lite', 'Gjøre det, men bare litt', 'Do it, but only a bit')]]);
  m('C12', 'team', '🎮',
    L4('Nogen, du ikke kender, skriver til dig i et spil. De spørger, hvor du bor.', 'Någon du inte känner skriver till dig i ett spel och vill veta var du bor.', 'En du ikke kjenner, skriver til deg i et spill og vil vite hvor du bor.', "Someone you don't know messages you in a game and asks where you live."),
    L4('Hvad gør du?', 'Vad gör du?', 'Hva gjør du?', 'What do you do?'),
    L4('Fremmede på nettet skal aldrig vide, hvor du bor. En voksen kan hjælpe dig med at blokere.', 'Främlingar på nätet ska aldrig få veta var du bor. En vuxen kan hjälpa dig att blockera.', 'Fremmede på nett skal aldri få vite hvor du bor. En voksen kan hjelpe deg å blokkere.', 'Strangers online should never know where you live. A grown-up can help you block them.'),
    [['🙋', L4('Ikke svare, men sige det til en voksen', 'Inte svara och berätta för en vuxen', 'Ikke svare og si fra til en voksen', "Don't answer, and tell a grown-up")],
      ['🏠', L4('Skrive din adresse', 'Skriva din adress', 'Skrive adressen din', 'Type your address')], ['🎮', L4('Svare lidt og spille videre', 'Svara lite och spela vidare', 'Svare litt og spille videre', 'Answer a bit and keep playing')]]);
  m('C13', 'team', '🎬',
    L4('Du og din bror skændes om, hvem der skal vælge film i aften.', 'Du och din bror bråkar om vem som ska välja film i kväll.', 'Du og broren din krangler om hvem som skal velge film i kveld.', 'You and your brother are arguing about who picks the film tonight.'),
    L4('Hvad er en god løsning?', 'Vad är en bra lösning?', 'Hva er en god løsning?', 'What is a good way to solve it?'),
    L4('Når I skiftes, får I begge lov at vælge. Og så bliver aftenen meget hyggeligere.', 'När ni turas om får båda välja, och kvällen blir mysigare.', 'Når dere bytter på, får begge velge, og kvelden blir koseligere.', 'Taking turns means you both get to choose, and the evening is nicer.'),
    [['🔄', L4('Skiftes: han vælger i dag, du i morgen', 'Turas om: han väljer i dag, du i morgon', 'Bytte på: han velger i dag, du i morgen', 'Take turns: he picks today, you tomorrow')],
      ['📺', L4('Snuppe fjernbetjeningen', 'Ta fjärrkontrollen', 'Ta fjernkontrollen', 'Grab the remote')],
      ['🚪', L4('Gå ind på dit værelse og smække med døren', 'Gå in på ditt rum och smälla igen dörren', 'Gå på rommet ditt og smelle igjen døra', 'Go to your room and slam the door')]]);

  function fill(s, L, wild) {
    var lower = wild || WILD[L], upper = wild || (WILD[L].charAt(0).toUpperCase() + WILD[L].slice(1));
    return s.replace(/\{Wild\}/g, upper).replace(/\{wild\}/g, lower);
  }
  function low(s, L) {
    if (L === 'en' && /^I[ ']/.test(s)) return s;
    return s.charAt(0).toLocaleLowerCase() + s.slice(1);
  }

  function make(mo, L, U, opts) {
    opts = opts || {};
    var lang = mo.s[L] ? L : 'en';
    var scene = fill(mo.s[lang], lang, opts.name), prompt = mo.p[lang], why = fill(mo.w[lang], lang, opts.name);
    var t = { id: 'hjerte.' + mo.id, power: 'hjerte', step: 'h' + mo.band, grade: opts.grade != null ? opts.grade : 0, ui: mo.ui, prompt: prompt,
      visual: { type: 'scene', emoji: mo.e, text: scene }, how: [{ text: why, say: why, visual: null }], key: { type: 'heart', topic: mo.topic } };
    if (mo.ui === 'breathe') {
      t.say = scene;
      t.breathe = { breaths: mo.b.breaths, inMs: mo.b.inMs, outMs: mo.b.outMs };
      return t;
    }
    var opt = function (o) { return { label: o[1][lang], emoji: o[0] }; };
    var ch = U.choice(opt(mo.o[0]), mo.o.slice(1).map(opt), 1);
    t.choice = ch;
    var short = ch.options.every(function (o) { return o.label.length <= 12; });
    if (short) ch.cols = ch.options.length;
    // Not a reading task: the younger bands hear the choices too, in the order they are shown.
    if (mo.band !== 'C') {
      var labs = ch.options.map(function (o) { return o.label; }), last = labs.length - 1;
      var orW = OR[lang].charAt(0).toUpperCase() + OR[lang].slice(1);
      t.say = scene + ' ' + prompt + ' ' + labs.slice(0, last).join('? ') + '? ' + orW + ' ' + low(labs[last], lang) + '?';
    } else {
      t.say = scene + ' ' + prompt;
    }
    return t;
  }

  var api = { moments: M, make: make };
  G.Content.hjerte = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
