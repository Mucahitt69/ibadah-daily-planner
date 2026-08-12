/* ═══════════════════════════════════════════════════════════
   Ibadah Daily Planner — la bibliothèque de dhikr
   ───────────────────────────────────────────────────────────

   ⚠️  À LIRE AVANT DE TOUCHER À CE FICHIER  ⚠️

   Ces textes sont un PREMIER JET. Ils n'ont pas été relus par une
   personne de science. Tant qu'une entrée porte « verifie: false »,
   l'application affiche un bandeau d'avertissement.

   ───────────────────────────────────────────────────────────
   COMMENT CORRIGER UN TEXTE (sans savoir coder)

   Chaque dhikr est un bloc entre accolades { }. À l'intérieur,
   chaque ligne est de la forme :

       nom_du_champ: 'le texte',

   Pour corriger, change UNIQUEMENT ce qui est entre les
   apostrophes '  '. Ne touche ni au nom du champ, ni à la virgule
   au bout de la ligne, ni aux accolades.

   Quand un texte a été relu et validé, remplace
       verifie: false
   par
       verifie: true
   et l'avertissement disparaîtra de lui-même.

   ⚠️ Si le texte contient une apostrophe (comme dans « l'Ami »),
   il faut écrire \' à la place de ' — sinon la ligne se coupe en
   deux et la bibliothèque ne s'affiche plus.

   Les champs :
     id           un nom court, unique, sans accent ni espace. NE PAS CHANGER.
     categories   où le dhikr apparaît. Choix possibles :
                  'matin', 'soir', 'apres-priere', 'avant-dormir', 'general'
     nom          le titre affiché dans la liste
     arabe        le texte en arabe
     phonetique   la prononciation en lettres latines
     traduction   le sens en français
     source       d'où vient le texte
     repetitions  combien de fois le réciter
     verifie      false tant qu'une personne de science ne l'a pas relu
   ═══════════════════════════════════════════════════════════ */

const ADHKAR_CATEGORIES = [
  { id: 'matin',        nom: 'Matin' },
  { id: 'soir',         nom: 'Soir' },
  { id: 'apres-priere', nom: 'Après la prière' },
  { id: 'avant-dormir', nom: 'Avant de dormir' },
  { id: 'general',      nom: 'À tout moment' }
];

const ADHKAR = [

  {
    id: 'ayat-kursi',
    categories: ['matin', 'soir', 'apres-priere', 'avant-dormir'],
    nom: 'Ayat al-Kursi',
    arabe: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ، لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ، لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ، مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ، وَلَا يَئُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    phonetique: 'Allâhu lâ ilâha illâ huwa-l-Hayyu-l-Qayyûm. Lâ ta\'khudhuhu sinatun wa lâ nawm. Lahu mâ fî-s-samâwâti wa mâ fî-l-ard. Man dhâ-lladhî yashfa\'u \'indahu illâ bi-idhnih. Ya\'lamu mâ bayna aydîhim wa mâ khalfahum, wa lâ yuhîtûna bi-shay\'in min \'ilmihi illâ bi-mâ shâ\'. Wasi\'a kursiyyuhu-s-samâwâti wa-l-ard, wa lâ ya\'ûduhu hifzuhumâ, wa huwa-l-\'Aliyyu-l-\'Azîm.',
    traduction: 'Allah, point de divinité à part Lui, le Vivant, Celui qui subsiste par Lui-même. Ni somnolence ni sommeil ne Le saisissent. À Lui appartient tout ce qui est dans les cieux et sur la terre. Qui peut intercéder auprès de Lui sans Sa permission ? Il connaît ce qui est devant eux et derrière eux, et ils ne cernent rien de Sa science, sauf ce qu\'Il veut. Son Trône déborde les cieux et la terre, et leur garde ne Lui coûte aucune peine. Et Il est le Très-Haut, l\'Immense.',
    source: 'Coran, sourate Al-Baqara (2), verset 255',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'sourate-ikhlas',
    categories: ['matin', 'soir', 'avant-dormir'],
    nom: 'Sourate Al-Ikhlas',
    arabe: 'قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',
    phonetique: 'Qul huwa Allâhu ahad. Allâhu-s-Samad. Lam yalid wa lam yûlad. Wa lam yakun lahu kufuwan ahad.',
    traduction: 'Dis : Il est Allah, Unique. Allah, Celui vers qui tout se tourne et qui ne dépend de rien. Il n\'a jamais engendré et n\'a pas été engendré. Et nul ne Lui est égal.',
    source: 'Coran, sourate 112',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'sourate-falaq',
    categories: ['matin', 'soir', 'avant-dormir'],
    nom: 'Sourate Al-Falaq',
    arabe: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِنْ شَرِّ مَا خَلَقَ، وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    phonetique: 'Qul a\'ûdhu bi-Rabbi-l-falaq. Min sharri mâ khalaq. Wa min sharri ghâsiqin idhâ waqab. Wa min sharri-n-naffâthâti fî-l-\'uqad. Wa min sharri hâsidin idhâ hasad.',
    traduction: 'Dis : je cherche protection auprès du Seigneur de l\'aube naissante, contre le mal de ce qu\'Il a créé, contre le mal de l\'obscurité quand elle s\'étend, contre le mal de celles qui soufflent sur les nœuds, et contre le mal de l\'envieux quand il envie.',
    source: 'Coran, sourate 113',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'sourate-nas',
    categories: ['matin', 'soir', 'avant-dormir'],
    nom: 'Sourate An-Nas',
    arabe: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَٰهِ النَّاسِ، مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ',
    phonetique: 'Qul a\'ûdhu bi-Rabbi-n-nâs. Maliki-n-nâs. Ilâhi-n-nâs. Min sharri-l-waswâsi-l-khannâs. Alladhî yuwaswisu fî sudûri-n-nâs. Mina-l-jinnati wa-n-nâs.',
    traduction: 'Dis : je cherche protection auprès du Seigneur des hommes, le Souverain des hommes, le Dieu des hommes, contre le mal du mauvais souffleur qui se dérobe, celui qui souffle le mal dans les poitrines des hommes, qu\'il soit des djinns ou des hommes.',
    source: 'Coran, sourate 114',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'sayyid-istighfar',
    categories: ['matin', 'soir'],
    nom: 'Sayyid al-istighfar',
    arabe: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    phonetique: 'Allâhumma anta Rabbî, lâ ilâha illâ anta, khalaqtanî wa anâ \'abduka, wa anâ \'alâ \'ahdika wa wa\'dika mâ-stata\'tu. A\'ûdhu bika min sharri mâ sana\'tu. Abû\'u laka bi-ni\'matika \'alayya, wa abû\'u bi-dhanbî, fa-ghfir lî, fa-innahu lâ yaghfiru-dh-dhunûba illâ anta.',
    traduction: 'Ô Allah, Tu es mon Seigneur, il n\'y a de divinité que Toi. Tu m\'as créé et je suis Ton serviteur. Je tiens Ton engagement et Ta promesse autant que je le peux. Je cherche protection auprès de Toi contre le mal que j\'ai commis. Je reconnais Ton bienfait envers moi et je reconnais mon péché : pardonne-moi, car nul ne pardonne les péchés à part Toi.',
    source: 'Sahih al-Bukhari 6306',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'bika-asbahna',
    categories: ['matin'],
    nom: 'Allahumma bika asbahna',
    arabe: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    phonetique: 'Allâhumma bika asbahnâ, wa bika amsaynâ, wa bika nahyâ, wa bika namûtu, wa ilayka-n-nushûr.',
    traduction: 'Ô Allah, c\'est par Toi que nous entrons dans le matin, par Toi que nous entrons dans le soir, par Toi que nous vivons, par Toi que nous mourons, et c\'est vers Toi que se fera la résurrection.',
    source: 'Sunan Abi Dawud 5068 — Jami\' at-Tirmidhi 3391',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'bika-amsayna',
    categories: ['soir'],
    nom: 'Allahumma bika amsayna',
    arabe: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    phonetique: 'Allâhumma bika amsaynâ, wa bika asbahnâ, wa bika nahyâ, wa bika namûtu, wa ilayka-l-masîr.',
    traduction: 'Ô Allah, c\'est par Toi que nous entrons dans le soir, par Toi que nous entrons dans le matin, par Toi que nous vivons, par Toi que nous mourons, et c\'est vers Toi qu\'est le retour.',
    source: 'Sunan Abi Dawud 5068 — Jami\' at-Tirmidhi 3391',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'asbahna-mulk',
    categories: ['matin'],
    nom: 'Asbahna wa asbaha al-mulku lillah',
    arabe: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    phonetique: 'Asbahnâ wa asbaha-l-mulku li-Llâh, wa-l-hamdu li-Llâh, lâ ilâha illâ-Llâhu wahdahu lâ sharîka lah, lahu-l-mulku wa lahu-l-hamdu wa huwa \'alâ kulli shay\'in qadîr.',
    traduction: 'Nous voici au matin, et la royauté appartient à Allah. Louange à Allah. Il n\'y a de divinité qu\'Allah, seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.',
    source: 'Sahih Muslim 2723',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'amsayna-mulk',
    categories: ['soir'],
    nom: 'Amsayna wa amsa al-mulku lillah',
    arabe: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    phonetique: 'Amsaynâ wa amsâ-l-mulku li-Llâh, wa-l-hamdu li-Llâh, lâ ilâha illâ-Llâhu wahdahu lâ sharîka lah, lahu-l-mulku wa lahu-l-hamdu wa huwa \'alâ kulli shay\'in qadîr.',
    traduction: 'Nous voici au soir, et la royauté appartient à Allah. Louange à Allah. Il n\'y a de divinité qu\'Allah, seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.',
    source: 'Sahih Muslim 2723',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'raditu-billah',
    categories: ['matin', 'soir'],
    nom: 'Raditu billahi rabban',
    arabe: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    phonetique: 'Radîtu bi-Llâhi Rabban, wa bi-l-islâmi dînan, wa bi-Muhammadin sallâ-Llâhu \'alayhi wa sallama nabiyyan.',
    traduction: 'J\'agrée Allah comme Seigneur, l\'islam comme religion, et Muhammad — que la prière et le salut d\'Allah soient sur lui — comme Prophète.',
    source: 'Sunan Abi Dawud 5072 — Jami\' at-Tirmidhi 3389',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'hasbiya-allah',
    categories: ['matin', 'soir'],
    nom: 'Hasbiya Allahu la ilaha illa huwa',
    arabe: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    phonetique: 'Hasbiya-Llâhu lâ ilâha illâ huwa, \'alayhi tawakkaltu wa huwa Rabbu-l-\'arshi-l-\'azîm.',
    traduction: 'Allah me suffit. Il n\'y a de divinité que Lui. C\'est en Lui que je place ma confiance, et Il est le Seigneur du Trône immense.',
    source: 'Sunan Abi Dawud 5081',
    repetitions: 7,
    verifie: false
  },

  {
    id: 'bismillah-la-yadurr',
    categories: ['matin', 'soir'],
    nom: 'Bismillahi lladhi la yadurru',
    arabe: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ',
    phonetique: 'Bismi-Llâhi-lladhî lâ yadurru ma\'a-smihi shay\'un fî-l-ardi wa lâ fî-s-samâ\', wa huwa-s-Samî\'u-l-\'Alîm.',
    traduction: 'Au nom d\'Allah, avec le nom duquel rien ne peut nuire, ni sur la terre ni dans le ciel. Et Il est Celui qui entend tout, Celui qui sait tout.',
    source: 'Sunan Abi Dawud 5088 — Jami\' at-Tirmidhi 3388',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'subhanallah-bihamdih-100',
    categories: ['matin', 'soir', 'general'],
    nom: 'Subhan Allah wa bi hamdih',
    arabe: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    phonetique: 'Subhâna-Llâhi wa bi-hamdih.',
    traduction: 'Gloire et pureté à Allah, et à Lui la louange.',
    source: 'Sahih Muslim 2691 — Sahih al-Bukhari 6405',
    repetitions: 100,
    verifie: false
  },

  {
    id: 'tahlil-10',
    categories: ['matin', 'soir'],
    nom: 'La ilaha illa Allah wahdahu la sharika lah',
    arabe: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    phonetique: 'Lâ ilâha illâ-Llâhu wahdahu lâ sharîka lah, lahu-l-mulku wa lahu-l-hamdu wa huwa \'alâ kulli shay\'in qadîr.',
    traduction: 'Il n\'y a de divinité qu\'Allah, seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.',
    source: 'Sahih al-Bukhari 6403 — Sahih Muslim 2691',
    repetitions: 10,
    verifie: false
  },

  {
    id: 'salat-nabi-10',
    categories: ['matin', 'soir', 'general'],
    nom: 'Salat sur le Prophète ﷺ',
    arabe: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    phonetique: 'Allâhumma salli wa sallim \'alâ nabiyyinâ Muhammad.',
    traduction: 'Ô Allah, accorde Ta prière et Ton salut à notre Prophète Muhammad.',
    source: 'Coran 33:56 — Sahih Muslim 408',
    repetitions: 10,
    verifie: false
  },

  {
    id: 'kalimat-tammat',
    categories: ['soir', 'general'],
    nom: 'A\'udhu bi kalimati llahi t-tammat',
    arabe: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    phonetique: 'A\'ûdhu bi-kalimâti-Llâhi-t-tâmmâti min sharri mâ khalaq.',
    traduction: 'Je cherche protection dans les paroles parfaites d\'Allah contre le mal de ce qu\'Il a créé.',
    source: 'Sahih Muslim 2709',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'apres-astaghfir',
    categories: ['apres-priere'],
    nom: 'Astaghfirullah',
    arabe: 'أَسْتَغْفِرُ اللَّهَ',
    phonetique: 'Astaghfiru-Llâh.',
    traduction: 'Je demande pardon à Allah.',
    source: 'Sahih Muslim 591',
    repetitions: 3,
    verifie: false
  },

  {
    id: 'apres-salam',
    categories: ['apres-priere'],
    nom: 'Allahumma anta as-Salam',
    arabe: 'اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    phonetique: 'Allâhumma anta-s-Salâm, wa minka-s-salâm, tabârakta yâ Dhâ-l-jalâli wa-l-ikrâm.',
    traduction: 'Ô Allah, Tu es la Paix et de Toi vient la paix. Béni sois-Tu, ô Détenteur de la majesté et de la générosité.',
    source: 'Sahih Muslim 591',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'apres-tasbih-33',
    categories: ['apres-priere'],
    nom: 'Subhan Allah, Alhamdulillah, Allahu akbar',
    arabe: 'سُبْحَانَ اللَّهِ — الْحَمْدُ لِلَّهِ — اللَّهُ أَكْبَرُ',
    phonetique: 'Subhâna-Llâh (33 fois) — Al-hamdu li-Llâh (33 fois) — Allâhu akbar (33 fois).',
    traduction: 'Gloire et pureté à Allah — Louange à Allah — Allah est plus grand. Chacune de ces trois formules se dit trente-trois fois après la prière.',
    source: 'Sahih Muslim 597',
    repetitions: 33,
    verifie: false
  },

  {
    id: 'apres-tahlil-100',
    categories: ['apres-priere'],
    nom: 'La centième : la ilaha illa Allah',
    arabe: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    phonetique: 'Lâ ilâha illâ-Llâhu wahdahu lâ sharîka lah, lahu-l-mulku wa lahu-l-hamdu wa huwa \'alâ kulli shay\'in qadîr.',
    traduction: 'Il n\'y a de divinité qu\'Allah, seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose. Cette formule complète les cent après la prière.',
    source: 'Sahih Muslim 597',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'dormir-bismika',
    categories: ['avant-dormir'],
    nom: 'Bismika Allahumma amutu wa ahya',
    arabe: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    phonetique: 'Bismika-Llâhumma amûtu wa ahyâ.',
    traduction: 'C\'est en Ton nom, ô Allah, que je meurs et que je vis.',
    source: 'Sahih al-Bukhari 6324',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'dormir-aslamtu',
    categories: ['avant-dormir'],
    nom: 'Allahumma aslamtu nafsi ilayk',
    arabe: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ',
    phonetique: 'Allâhumma aslamtu nafsî ilayk, wa fawwadtu amrî ilayk, wa alja\'tu zahrî ilayk, raghbatan wa rahbatan ilayk. Lâ malja\'a wa lâ manjâ minka illâ ilayk. Âmantu bi-kitâbika-lladhî anzalta, wa bi-nabiyyika-lladhî arsalta.',
    traduction: 'Ô Allah, je me remets à Toi, je Te confie mon affaire, je m\'appuie sur Toi, par désir de Toi et par crainte de Toi. Il n\'y a ni refuge ni salut contre Toi qu\'auprès de Toi. Je crois en Ton Livre que Tu as fait descendre et en Ton Prophète que Tu as envoyé.',
    source: 'Sahih al-Bukhari 247 — Sahih Muslim 2710',
    repetitions: 1,
    verifie: false
  },

  {
    id: 'dormir-tasbih',
    categories: ['avant-dormir'],
    nom: 'Le tasbih du coucher',
    arabe: 'سُبْحَانَ اللَّهِ — الْحَمْدُ لِلَّهِ — اللَّهُ أَكْبَرُ',
    phonetique: 'Subhâna-Llâh (33 fois) — Al-hamdu li-Llâh (33 fois) — Allâhu akbar (34 fois).',
    traduction: 'Gloire et pureté à Allah — Louange à Allah — Allah est plus grand. Au coucher, la dernière formule se dit trente-quatre fois.',
    source: 'Sahih al-Bukhari 3705 — Sahih Muslim 2727',
    repetitions: 33,
    verifie: false
  },

  {
    id: 'astaghfirullah-100',
    categories: ['general'],
    nom: 'Astaghfirullah wa atubu ilayh',
    arabe: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    phonetique: 'Astaghfiru-Llâha wa atûbu ilayh.',
    traduction: 'Je demande pardon à Allah et je reviens à Lui repentant.',
    source: 'Sahih al-Bukhari 6307 — Sahih Muslim 2702',
    repetitions: 100,
    verifie: false
  },

  {
    id: 'la-hawla',
    categories: ['general'],
    nom: 'La hawla wa la quwwata illa billah',
    arabe: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    phonetique: 'Lâ hawla wa lâ quwwata illâ bi-Llâh.',
    traduction: 'Il n\'y a de force ni de puissance qu\'en Allah.',
    source: 'Sahih al-Bukhari 6384 — Sahih Muslim 2704',
    repetitions: 10,
    verifie: false
  },

  {
    id: 'subhanallah-azim',
    categories: ['general'],
    nom: 'Subhan Allah wa bi hamdih, subhan Allah al-Azim',
    arabe: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    phonetique: 'Subhâna-Llâhi wa bi-hamdih, subhâna-Llâhi-l-\'Azîm.',
    traduction: 'Gloire et pureté à Allah, et à Lui la louange. Gloire et pureté à Allah l\'Immense.',
    source: 'Sahih al-Bukhari 6406 — Sahih Muslim 2694',
    repetitions: 10,
    verifie: false
  }

];
