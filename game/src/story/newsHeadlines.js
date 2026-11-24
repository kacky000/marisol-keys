// The Keys Herald: island headlines that react to how far the story has gone and what the
// player has been up to, shown as a ticker on Tessa's phone.

// BY_CHAPTER[k]: what the paper prints once k story missions are done.
const BY_CHAPTER = [
  ['Harbor fees up again, fishermen furious', 'Sunwake Beach named cleanest on the coast', 'Ferry pilot Marco Vane mourned at the marina'],
  ['Marco Vane\'s sister back on the Keys', 'Old Keys house reopened after six years'],
  ['Mystery cooler theft at Lifeguard Tower 3', 'Beach patrol "baffled", says spokesperson'],
  ['Late-night street race lights up Coral Parade', 'Coral Room owner denies any knowledge'],
  ['Static 88 FM pirate signal back on air', 'MKPD radio "experiencing interference"'],
  ['Shoot-out at Crane Yard 7 — seven arrests', 'Moreau shipping licence under review'],
  ['MKPD evidence van stolen from harbor depot', 'Captain Hale: "a minor clerical matter"'],
  ['Speedboat seen racing round the south point', 'Press boat anchors off Sunwake pier'],
  ['Black Strata GT wrecked outside Lumen Tower', 'Gideon Moreau taken into custody'],
  ['Gunfire at Mirador Hills estate', 'Hale estate security "overwhelmed"'],
  ['THE TIDE BOOK: every payoff, every name', 'Hale suspended after causeway chase', 'Island council orders harbor inquiry', 'Tessa Vane "just a ferry pilot", say friends'],
];

export function headlines(state) {
  const chapter = Math.min(state.story, BY_CHAPTER.length - 1);
  const out = [...BY_CHAPTER[chapter]];
  if (state.stats?.fares > 0) out.push(`Keys Cab ratings soar: ${state.stats.fares} fares this week`);
  if ((state.pages || []).length) out.push(`Loose ledger pages found around the island: ${(state.pages || []).length} so far`);
  if (state.properties?.length) out.push('Mystery buyer snaps up waterfront property');
  if (state.stats?.patients > 0) out.push(`Sunwake Medical thanks volunteer driver: ${state.stats.patients} patients rushed in`);
  if (state.stats?.vigilante > 0) out.push(`"Vigilante in a stolen cruiser" — MKPD neither confirms nor denies`);
  if (state.stats?.jumps > 0) out.push(`Daredevil clears ${state.stats.jumps} park ramps; council promises fences`);
  if (state.stats?.kills > 10) out.push('Las Linternas and Gull\'s crew blame each other for a violent week');
  out.push('Calloway Belle ferry runs to timetable, mostly', 'Weather: hot, sunny, chance of afternoon storms', 'Mango Bay Cola — taste the sunset');
  return out;
}
