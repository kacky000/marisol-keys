// "The Tide Book" — nine story missions. Tessa Vane comes home to Marisol Keys to find her late
// brother's ledger of harbor payoffs wanted by a crane-yard boss and a crooked police captain.

const B = 64;
export const CONTACTS = {
  ozzie: { x: 182, z: 13 * B + 40, label: "Ozzie's Bait & Tackle" },
  safehouse: { x: 7 * B + 32, z: 8 * B + 9.5, label: 'Safehouse · Old Keys' },
  lulu: { x: 11 * B - 9.5, z: 4 * B + 30, label: 'The Coral Room' },
  priya: { x: 3 * B + 9.5, z: 7 * B + 20, label: 'Static 88 FM' },
};

export const STORY = [
  {
    id: 'homecoming', title: 'Low Tide Homecoming', giver: 'ozzie', at: 'ozzie', reward: 500,
    blurb: 'Drive Ozzie from the harbor to your late brother\'s place.',
    steps: [
      { type: 'talk', lines: [
        ['ozzie', 'Six years, Tess. You left on the last ferry and came back on the first.'],
        ['tessa', 'Island\'s still sunburnt, Oz. So\'s your boat.'],
        ['ozzie', 'Truck\'s round the side. Drive me to the old place in Old Keys — and try not to flatten any tourists. Yet.'],
      ] },
      { type: 'enterVehicle', vehicle: { type: 'pickup', x: 3 * B + 3.5, z: 13 * B + 20, heading: 0, paint: '#c0392b' }, text: 'Get in Ozzie\'s <b>pickup</b>' },
      { type: 'goto', x: 7 * B + 32, z: 8 * B + 3.5, radius: 9, inVehicle: true, text: 'Drive to the <b>safehouse</b> in Old Keys' },
      { type: 'talk', lines: [
        ['ozzie', 'Marco left you this place. And something else — a ledger he called the Tide Book.'],
        ['tessa', 'Marco kept books? He couldn\'t keep a goldfish.'],
        ['ozzie', 'He kept this one. Half the harbor wants it found. The other half wants it at the bottom of the bay.'],
      ] },
    ],
  },
  {
    id: 'tower3', title: 'Lifeguard Tower 3', giver: 'ozzie', at: 'safehouse', reward: 800,
    blurb: 'Collect Marco\'s cooler from under a lifeguard tower on Sunwake Beach.',
    steps: [
      { type: 'talk', lines: [
        ['ozzie', 'Marco stashed a cooler under Lifeguard Tower 3. Coral stripes, can\'t miss it.'],
        ['tessa', 'A cooler. Very covert.'],
        ['ozzie', 'Beach patrol loves a cooler. Be quick.'],
      ] },
      { type: 'goto', x: 12 * B + 36, z: 9 * B + 30, radius: 4, onFoot: true, text: 'Walk to <b>Lifeguard Tower 3</b> on Sunwake Beach' },
      { type: 'talk', lines: [
        ['tessa', 'Got it. Sand, sunscreen… and a waterproof notebook. Hello, Tide Book.'],
        ['dispatch', 'All units, theft reported at Lifeguard Tower 3, Sunwake Beach. Suspect in teal.'],
      ] },
      { type: 'wanted', stars: 1 },
      { type: 'loseWanted', text: 'Lose the <b>beach patrol</b>' },
    ],
  },
  {
    id: 'neon', title: 'Neon Sprint', giver: 'lulu', at: 'lulu', reward: 1500,
    blurb: 'Beat Lulu\'s lap record down Coral Parade and back up Marisol Boulevard.',
    steps: [
      { type: 'talk', lines: [
        ['lulu', 'So you\'re Marco\'s sister. He owed me a race, honey. You\'re paying.'],
        ['tessa', 'And if I win?'],
        ['lulu', 'Then I tell you who\'s been asking about his notebook. Strata GT\'s out front. Seventy-five seconds.'],
      ] },
      { type: 'enterVehicle', vehicle: { type: 'sports', x: 11 * B - 3.5, z: 4 * B + 20, heading: Math.PI, paint: '#ff3f8e' }, text: 'Get in Lulu\'s <b>Strata GT</b>' },
      { type: 'checkpoints', timer: 80, text: 'Race through the <b>checkpoints</b>', points: [
        [12 * B, 5 * B + 20], [12 * B, 8 * B], [12 * B, 11 * B], [11 * B + 20, 12 * B], [10 * B, 11 * B], [10 * B, 8 * B], [10 * B, 5 * B], [11 * B - 3.5, 4 * B + 30],
      ] },
      { type: 'talk', lines: [
        ['lulu', 'Not bad. Fine. Gideon Moreau — Gull — he runs Crane Yard 7. He\'s been in my club every night asking about Marco.'],
        ['tessa', 'Then I guess I\'m going to the harbor.'],
      ] },
    ],
  },
  {
    id: 'deadair', title: 'Dead Air', giver: 'priya', at: 'priya', reward: 1200,
    blurb: 'Plant Priya\'s relays so Static 88 can listen in on the harbor police band.',
    steps: [
      { type: 'talk', lines: [
        ['priya', 'You\'re on Static 88, the only honest station on the Keys. Marco was my best source.'],
        ['priya', 'Hale\'s harbor division talks on a private band. Clip three relays into the city junction boxes and we hear everything.'],
        ['tessa', 'Three relays, one afternoon. Sure.'],
      ] },
      { type: 'checkpoints', timer: 150, text: 'Plant relays in the <b>three junction boxes</b>', relay: true, points: [
        [5 * B + 3.5, 7 * B + 32], [8 * B, 3 * B + 3.5], [11 * B - 3.5, 8 * B + 32],
      ] },
      { type: 'talk', lines: [
        ['priya', 'Signal\'s clean. Oh — Hale just ordered "the Moreau shipment" moved tonight. Crane Yard 7.'],
      ] },
    ],
  },
  {
    id: 'craneyard', title: 'Crane Yard Seven', giver: 'ozzie', at: 'ozzie', reward: 2500,
    blurb: 'Hit Gull\'s crew among the containers before the shipment leaves.',
    steps: [
      { type: 'talk', lines: [
        ['ozzie', 'Gull\'s boys are loading the night boat at Crane Yard 7. Marco\'s name is on those manifests.'],
        ['ozzie', 'Take the Breaker. And Tess — keep your head below the containers.'],
      ], give: { weapon: 'shotgun', ammo: 24 } },
      { type: 'goto', x: 4 * B + 30, z: 12 * B + 50, radius: 12, text: 'Go to <b>Crane Yard 7</b>' },
      { type: 'kill', text: 'Take out <b>Gull\'s crew</b>', suppressCrime: true, enemies: [
        [4 * B + 18, 13 * B + 22], [4 * B + 40, 13 * B + 34], [5 * B + 16, 13 * B + 22], [3 * B + 40, 13 * B + 46], [5 * B + 30, 13 * B + 40], [4 * B + 26, 13 * B + 50], [5 * B + 44, 13 * B + 18],
      ] },
      { type: 'talk', lines: [
        ['gull', 'That was my crew, Vane. Your brother made the same mistake.'],
        ['tessa', 'Then you know how this ends.'],
      ] },
    ],
  },
  {
    id: 'hotcargo', title: 'Hot Cargo', giver: 'priya', at: 'priya', reward: 3000,
    blurb: 'Steal the MKPD evidence van holding Marco\'s seized files.',
    steps: [
      { type: 'talk', lines: [
        ['priya', 'Hale impounded everything from Marco\'s boat. It\'s in an evidence van at the harbor depot.'],
        ['tessa', 'Stealing from the police. Classic.'],
        ['priya', 'Lose them before you bring it home. I like my studio un-raided.'],
      ] },
      { type: 'enterVehicle', vehicle: { type: 'van', x: 6 * B + 3.5, z: 12 * B + 30, heading: 0, paint: '#ffffff' }, text: 'Steal the <b>evidence van</b>', onEnterStars: 3 },
      { type: 'loseWanted', text: 'Lose the <b>MKPD</b>' },
      { type: 'goto', x: 3 * B + 3.5, z: 7 * B + 20, radius: 8, inVehicle: true, text: 'Bring the van to <b>Static 88</b>' },
      { type: 'talk', lines: [['priya', 'Boxes of manifests… and a photo. Hale and Gull, shaking hands on a crane.']] },
    ],
  },
  {
    id: 'glass', title: 'Glass Ceiling', giver: 'lulu', at: 'lulu', reward: 3500,
    blurb: 'Run Gull off the road before he reaches Hale downtown.',
    steps: [
      { type: 'talk', lines: [
        ['lulu', 'Gull just left my club in a hurry. Heading for Lumen Tower — that\'s Hale\'s office.'],
        ['tessa', 'Then he doesn\'t get there.'],
      ] },
      { type: 'goto', x: 7 * B, z: 4 * B + 30, radius: 14, text: 'Take a car and get to <b>Glasswater</b> downtown' },
      { type: 'destroy', vehicle: { type: 'sports', paint: '#111111' }, text: 'Wreck Gull\'s black <b>Strata GT</b>' },
      { type: 'talk', lines: [['gull', 'You… idiot. Hale\'s been waiting for this. Now he\'s got nothing left to lose.']] },
    ],
  },
  {
    id: 'halestorm', title: 'Hale Storm', giver: 'priya', at: 'priya', reward: 4000,
    blurb: 'Break into Hale\'s estate in Mirador Hills and take the second ledger.',
    steps: [
      { type: 'talk', lines: [
        ['priya', 'Hale kept his own copy of the Tide Book. Estate gate, Mirador Hills. Private security, not cops.'],
        ['tessa', 'Private security. Good. I\'m out of patience for paperwork.'],
      ], give: { weapon: 'smg', ammo: 160 } },
      { type: 'goto', x: 4 * B + 32, z: 2 * B - 3, radius: 12, text: 'Go to the <b>Hale estate</b> gate' },
      { type: 'kill', text: 'Clear the <b>estate guards</b>', suppressCrime: true, enemies: [
        [4 * B + 20, 2 * B + 18], [4 * B + 44, 2 * B + 16], [3 * B + 30, 2 * B + 24], [5 * B + 20, 2 * B + 26], [4 * B + 32, 2 * B + 36], [3 * B + 44, 1 * B + 46],
      ] },
      { type: 'wanted', stars: 2 },
      { type: 'loseWanted', text: 'Lose the <b>MKPD</b>' },
    ],
  },
  {
    id: 'causeway', title: 'Causeway Run', giver: 'ozzie', at: 'safehouse', reward: 10000,
    blurb: 'Every cop on the island is after you. Get both ledgers to the mainland press.',
    steps: [
      { type: 'talk', lines: [
        ['ozzie', 'Both books, Tess. The mainland papers will print every page — if you get across the causeway.'],
        ['hale', 'Tessa Vane. You\'re under arrest. All units: shoot the tyres, then the driver.'],
        ['tessa', 'Catch me first, Captain.'],
      ] },
      { type: 'enterVehicle', vehicle: { type: 'sports', x: 7 * B + 32, z: 8 * B + 3.5, heading: -Math.PI / 2, paint: '#19c3b4' }, text: 'Get in the <b>getaway car</b>', onEnterStars: 4, holdStars: 4 },
      { type: 'goto', x: -776, z: 5 * B, radius: 16, inVehicle: true, text: 'Cross <b>Pelican Causeway</b> to the mainland ferry ramp' },
      { type: 'clearWanted' },
      { type: 'talk', lines: [
        ['priya', 'The press has it. Hale\'s been suspended — they\'re reading the Tide Book on every station.'],
        ['ozzie', 'Marco would\'ve laughed himself sick. Welcome home, Tess.'],
      ] },
    ],
  },
];
