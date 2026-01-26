// Centralized list of abusive or toxic terms for rule-based filtering.
// Keep lowercase; middleware will lowercase user text before matching.
module.exports = [
  // --- English ---
  'abuse', 'abusive', 'asshole', 'bastard', 'bitch', 'bloody', 'bullshit', 'boobs', 'busty', 'buttplug',
  'cock', 'crap', 'cunt', 'damn', 'dick', 'dildo', 'douche', 'dumb', 'dyke', 'erection', 'fag', 'faggot', 'fool', 'freesex',
  'fuck', 'fucker', 'fucking', 'gangbang', 'gay', 'goddamn', 'harass', 'hate', 'hell', 'homo', 'horny', 'idiot', 'incest',
  'jerk', 'jizz', 'kill', 'kinky', 'loser', 'masturbate', 'moron', 'motherfucker', 'nazi', 'nigger', 'nigga', 'nipple', 'nonsense', 'nude',
  'orgasm', 'piss', 'porn', 'prick', 'psycho', 'pussy', 'queer', 'racist', 'rape', 'retard', 'sadist', 'scum', 'semen',
  'sex', 'sexy', 'shut up', 'shit', 'slut', 'spastic', 'stupid', 'suck', 'suicide', 'testicle', 'tits', 'threat', 'twat',
  'ugly', 'vagina', 'vibrator', 'virgin', 'vulva', 'wank', 'waste', 'whore', 'worthless', 'xxx',

  // --- Hindi (Transliterated) ---
  'bhosdike', 'bsdk', 'bhosda', 'behenchod', 'bc', 'bakchodi', 'bhadwe', 'bhadva', 'bhadwa', 'bhosdi',
  'chutiya', 'chod', 'choot', 'chuth', 'chipkali', 'chinal', 'gand', 'gandu', 'gaand', 'gandfat', 'ghanta', 'harami', 'haramkhor', 'hijra',
  'kamina', 'kaminay', 'kutte', 'kutti', 'kanjar', 'lauda', 'lawda', 'loda', 'lund', 'lavde', 'maa ki',
  'madarchod', 'mc', 'maderchod', 'mut', 'mutth', 'randi', 'raand', 'randwa', 'saala', 'saale', 'suwar', 'tatty', 'tatti', 'terimaaki',

  // --- Telugu (Transliterated) ---
  'bachala', 'bokku', 'boku', 'denga', 'dengu', 'dengey', 'dommari', 'donga na kodaka', 'edava', 'erripuka', 'erripuku',
  'gudda', 'howle', 'koyya', 'kujja', 'kukka', 'lanja', 'lanjakodaka', 'lanja kodaka', 'lathkor', 'lavada', 'loude',
  'modda', 'modda guduvu', 'mundaa', 'mundamopi', 'na kodaka', 'ne ayya', 'ne yabba', 'nee amma', 'nee abba',
  'pacha', 'pooku', 'puku', 'pukulo', 'puku lo', 'puliharia', 'ranku', 'sully', 'sulli', 'thokkalodi', 'verri',
  'waste na kodaka', 'yedava', 'yerra'
];

