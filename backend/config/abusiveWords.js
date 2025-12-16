// Centralized list of abusive or toxic terms for rule-based filtering.
// Keep lowercase; middleware will lowercase user text before matching.
module.exports = [
  'abuse', 'abusive', 'asshole', 'bastard', 'bitch', 'bloody', 'bullshit',
  'chutiya', 'crap', 'cunt', 'damn', 'dick', 'dumb', 'fool', 'fuck', 'fucker',
  'fucking', 'harass', 'hate', 'hell', 'idiot', 'kill', 'loser', 'moron',
  'motherfucker', 'nonsense', 'psycho', 'racist', 'retard', 'shut up', 'shit',
  'stupid', 'suicide', 'threat', 'ugly', 'waste', 'worthless'
];

