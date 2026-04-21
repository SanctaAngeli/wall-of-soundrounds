import type { Song, RoundType, Stem } from '../../shared/types.js';

// ============================================
// STEM HELPERS (for songs from new WOS library)
// ============================================

const ICON = {
  drums: '\u{1F941}',
  bass: '\u{1F3B8}',
  keys: '\u{1F3B9}',
  guitar: '\u{1F3B8}',
  vocals: '\u{1F3A4}',
  horns: '\u{1F3BA}',
  perc: '\u{1F941}',
  bvs: '\u{1F3A4}',
  clue: '\u{1F4A1}',
  lv: '\u{1F3A4}',
};

const COLOR = {
  drums: '#ff4444',
  bass: '#00d4ff',
  keys: '#8b5cf6',
  guitar: '#ffd700',
  vocals: '#ff00aa',
  horns: '#00ff88',
  perc: '#ff8c00',
  bvs: '#9d4edd',
  clue: '#ffeb3b',
  lv_gav: '#ff6b6b',
  lv_cairo: '#4fc3f7',
  lv_rose: '#f48fb1',
  lv_sara: '#ce93d8',
};

// 5 primary stems (Drums / Bass / Keys / Guitar / Vocals) used by R1 and R2
function baseStems(): Stem[] {
  return [
    { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
    { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
    { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
    { id: 4, file: 'GUITAR.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
    { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
  ];
}

// 8 richer stems (horns, percussion, backing vocals, clue, 4 named lead vocals) — used by R3 and R4
// Pass `{bvsFile}` for songs that use a non-default backing vocal file, or `{excludeIds}` to omit
// stems the source library didn't provide (e.g. Heart Like a Truck has no horns or Rose LV).
function fullExtras(opts: { bvsFile?: string; excludeIds?: number[] } = {}): Stem[] {
  const { bvsFile = 'BVS.mp3', excludeIds = [] } = opts;
  const all: Stem[] = [
    { id: 6, file: 'HORNS.mp3', instrument: 'Horns', icon: ICON.horns, color: COLOR.horns },
    { id: 7, file: 'PERC.mp3', instrument: 'Percussion', icon: ICON.perc, color: COLOR.perc },
    { id: 8, file: bvsFile, instrument: 'Backing Vocals', icon: ICON.bvs, color: COLOR.bvs },
    { id: 9, file: 'CLUE.mp3', instrument: 'Clue', icon: ICON.clue, color: COLOR.clue },
    { id: 10, file: 'LV_GAV.mp3', instrument: 'Lead Vocal (Gav)', icon: ICON.lv, color: COLOR.lv_gav },
    { id: 11, file: 'LV_CAIRO.mp3', instrument: 'Lead Vocal (Cairo)', icon: ICON.lv, color: COLOR.lv_cairo },
    { id: 12, file: 'LV_ROSE.mp3', instrument: 'Lead Vocal (Rose)', icon: ICON.lv, color: COLOR.lv_rose },
    { id: 13, file: 'LV_SARA.mp3', instrument: 'Lead Vocal (Sara)', icon: ICON.lv, color: COLOR.lv_sara },
  ];
  return all.filter(s => !excludeIds.includes(s.id));
}

// ============================================
// SONG LIBRARY — WOS new-library songs (63)
// Full 5 primary + 8 extra stems each.
// ============================================

const wosLibrary: Song[] = [
  { id: '2001', title: 'Also Sprach Zarathustra', artist: 'Richard Strauss', year: 1896, difficulty: 'medium', genre: 'Classical',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Ride of the Valkyries', 'O Fortuna', 'The Blue Danube'] },
  { id: 'all-out-of-love', title: 'All Out of Love', artist: 'Air Supply', year: 1980, difficulty: 'medium', genre: 'Soft Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Making Love Out of Nothing at All', 'Lost in Love', 'Even the Nights Are Better'] },
  { id: 'break-my-heart', title: 'Break My Heart', artist: 'Dua Lipa', year: 2020, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Levitating', 'Physical', 'New Rules'] },
  { id: 'california-dreamin', title: "California Dreamin'", artist: 'The Mamas & the Papas', year: 1965, difficulty: 'easy', genre: 'Folk Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Monday, Monday', 'Dedicated to the One I Love', 'Go Where You Wanna Go'] },
  { id: 'changes', title: 'Changes', artist: 'David Bowie', year: 1971, difficulty: 'medium', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Space Oddity', 'Heroes', 'Life on Mars?'] },
  { id: 'coal-miners-daughter', title: "Coal Miner's Daughter", artist: 'Loretta Lynn', year: 1970, difficulty: 'hard', genre: 'Country',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['You Ain\u2019t Woman Enough', 'Fist City', 'Blue Kentucky Girl'] },
  { id: 'cowboy-take-me-home', title: 'Cowboy Take Me Home', artist: 'Dixie Chicks', year: 1999, difficulty: 'medium', genre: 'Country',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Wide Open Spaces', 'Goodbye Earl', 'Landslide'] },
  { id: 'cruise', title: 'Cruise', artist: 'Florida Georgia Line', year: 2012, difficulty: 'medium', genre: 'Country',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['This Is How We Roll', 'H.O.L.Y.', 'Dirt'] },
  { id: 'espresso', title: 'Espresso', artist: 'Sabrina Carpenter', year: 2024, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Please Please Please', 'Nonsense', 'Feather'] },
  { id: 'everything-is-awesome', title: 'Everything Is Awesome', artist: 'Tegan and Sara', year: 2014, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Happy', 'Can\u2019t Stop the Feeling', 'Walking on Sunshine'] },
  { id: 'heart-like-a-truck', title: 'Heart Like a Truck', artist: 'Lainey Wilson', year: 2022, difficulty: 'hard', genre: 'Country',
    stems: baseStems(), extraStems: fullExtras({ excludeIds: [6, 12] }), // no Horns, no Rose LV in source
    wrongAnswers: ['Things a Man Oughta Know', 'Watermelon Moonshine', 'Wildflowers and Wild Horses'] },
  { id: 'house-of-the-rising-sun', title: 'House of the Rising Sun', artist: 'The Animals', year: 1964, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['We Gotta Get Out of This Place', 'Don\u2019t Let Me Be Misunderstood', 'It\u2019s My Life'] },
  { id: 'humble', title: 'HUMBLE.', artist: 'Kendrick Lamar', year: 2017, difficulty: 'easy', genre: 'Hip-Hop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['DNA.', 'Money Trees', 'Alright'] },
  { id: 'i-cant-help-myself', title: "I Can't Help Myself (Sugar Pie, Honey Bunch)", artist: 'Four Tops', year: 1965, difficulty: 'medium', genre: 'Motown',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Reach Out I\u2019ll Be There', 'Baby I Need Your Loving', 'Ain\u2019t No Woman'] },
  { id: 'i-fought-the-law', title: 'I Fought the Law', artist: 'The Clash', year: 1979, difficulty: 'medium', genre: 'Punk',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['London Calling', 'Rock the Casbah', 'Train in Vain'] },
  { id: 'i-dont-want-to-miss-a-thing', title: "I Don't Want to Miss a Thing", artist: 'Aerosmith', year: 1998, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Dream On', 'Walk This Way', 'Crazy'] },
  { id: 'i-want-your-love', title: 'I Want Your Love', artist: 'Chic', year: 1978, difficulty: 'medium', genre: 'Disco',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Le Freak', 'Good Times', 'Everybody Dance'] },
  { id: 'im-just-ken', title: "I'm Just Ken", artist: 'Ryan Gosling', year: 2023, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['What Was I Made For?', 'Dance the Night', 'Pink'] },
  { id: 'im-just-a-kid', title: "I'm Just a Kid", artist: 'Simple Plan', year: 2002, difficulty: 'medium', genre: 'Pop Punk',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Welcome to My Life', 'Perfect', 'Addicted'] },
  { id: 'its-all-coming-back-to-me-now', title: "It's All Coming Back to Me Now", artist: 'Celine Dion', year: 1996, difficulty: 'medium', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['My Heart Will Go On', 'The Power of Love', 'Because You Loved Me'] },
  { id: 'jesus-take-the-wheel', title: 'Jesus, Take the Wheel', artist: 'Carrie Underwood', year: 2005, difficulty: 'medium', genre: 'Country',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Before He Cheats', 'Blown Away', 'Cry Pretty'] },
  { id: 'johnny-b-goode', title: 'Johnny B. Goode', artist: 'Chuck Berry', year: 1958, difficulty: 'easy', genre: 'Rock & Roll',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Maybellene', 'Roll Over Beethoven', 'Sweet Little Sixteen'] },
  { id: 'just-cant-get-enough', title: "Just Can't Get Enough", artist: 'Depeche Mode', year: 1981, difficulty: 'medium', genre: 'Synth-Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Enjoy the Silence', 'Personal Jesus', 'People Are People'] },
  { id: 'kiss-froma-rose', title: 'Kiss from a Rose', artist: 'Seal', year: 1994, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Crazy', 'Killer', 'Prayer for the Dying'] },
  { id: 'last-friday-night', title: 'Last Friday Night (T.G.I.F.)', artist: 'Katy Perry', year: 2010, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Teenage Dream', 'California Gurls', 'Firework'] },
  { id: 'let-it-go', title: 'Let It Go', artist: 'Idina Menzel', year: 2013, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras({ bvsFile: 'OVERHEADS.mp3' }),
    wrongAnswers: ['Into the Unknown', 'Do You Want to Build a Snowman?', 'For the First Time in Forever'] },
  { id: 'lion-king', title: 'The Lion Sleeps Tonight', artist: 'The Tokens', year: 1961, difficulty: 'easy', genre: 'Doo-Wop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Stand By Me', 'Twist and Shout', 'Duke of Earl'] },
  { id: 'livin-la-vida-loca', title: "Livin' la Vida Loca", artist: 'Ricky Martin', year: 1999, difficulty: 'easy', genre: 'Latin Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['She Bangs', 'Shake Your Bon-Bon', 'Maria'] },
  { id: 'love-story', title: 'Love Story', artist: 'Taylor Swift', year: 2008, difficulty: 'easy', genre: 'Country Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['You Belong with Me', 'Teardrops on My Guitar', 'Our Song'] },
  { id: 'mad-world', title: 'Mad World', artist: 'Gary Jules', year: 2001, difficulty: 'medium', genre: 'Alternative',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Hurt', 'Creep', 'Everybody\u2019s Changing'] },
  { id: 'maniac', title: 'Maniac', artist: 'Michael Sembello', year: 1983, difficulty: 'medium', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Flashdance... What a Feeling', 'Footloose', 'Eye of the Tiger'] },
  { id: 'mr-blue-sky', title: 'Mr. Blue Sky', artist: 'Electric Light Orchestra', year: 1977, difficulty: 'medium', genre: 'Pop Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ["Don't Bring Me Down", "Livin' Thing", 'Evil Woman'] },
  { id: 'murder-on-the-dance-floor', title: 'Murder on the Dancefloor', artist: 'Sophie Ellis-Bextor', year: 2001, difficulty: 'medium', genre: 'Dance Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Groovejet', 'Take Me Home', 'Get Over You'] },
  { id: 'never-gonna-give-you-up', title: 'Never Gonna Give You Up', artist: 'Rick Astley', year: 1987, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Together Forever', 'Take On Me', 'You Spin Me Round'] },
  { id: 'oops-i-did-it-again', title: 'Oops!... I Did It Again', artist: 'Britney Spears', year: 2000, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['...Baby One More Time', 'Toxic', 'Stronger'] },
  { id: 'paint-the-town-red', title: 'Paint the Town Red', artist: 'Doja Cat', year: 2023, difficulty: 'easy', genre: 'Hip-Hop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Say So', 'Woman', 'Kiss Me More'] },
  { id: 'radio-gaga', title: 'Radio Ga Ga', artist: 'Queen', year: 1984, difficulty: 'medium', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Bohemian Rhapsody', 'Somebody to Love', 'I Want to Break Free'] },
  { id: 'rocket-man', title: 'Rocket Man', artist: 'Elton John', year: 1972, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Tiny Dancer', 'Your Song', 'Goodbye Yellow Brick Road'] },
  { id: 'say-it-aint-so', title: "Say It Ain't So", artist: 'Weezer', year: 1994, difficulty: 'medium', genre: 'Alternative',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Buddy Holly', 'Undone (The Sweater Song)', 'Island in the Sun'] },
  { id: 'semi-charmed-life', title: 'Semi-Charmed Life', artist: 'Third Eye Blind', year: 1997, difficulty: 'medium', genre: 'Alternative',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Closing Time', 'MMMBop', 'Iris'] },
  { id: 'should-i-stay-or-should-i-go-now', title: 'Should I Stay or Should I Go', artist: 'The Clash', year: 1982, difficulty: 'easy', genre: 'Punk',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['London Calling', 'Train in Vain', 'Rock the Casbah'] },
  { id: 'stillhaventfound', title: "I Still Haven't Found What I'm Looking For", artist: 'U2', year: 1987, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['With or Without You', 'One', 'Where the Streets Have No Name'] },
  { id: 'superbass', title: 'Super Bass', artist: 'Nicki Minaj', year: 2010, difficulty: 'easy', genre: 'Hip-Hop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Starships', 'Anaconda', 'Moment 4 Life'] },
  { id: 'superstition', title: 'Superstition', artist: 'Stevie Wonder', year: 1972, difficulty: 'medium', genre: 'Funk',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Sir Duke', 'Higher Ground', "Signed, Sealed, Delivered I'm Yours"] },
  { id: 'tainted-love', title: 'Tainted Love', artist: 'Soft Cell', year: 1981, difficulty: 'easy', genre: 'Synth-Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Say Hello Wave Goodbye', 'Bedsitter', 'Memorabilia'] },
  { id: 'thank-you-next', title: 'thank u, next', artist: 'Ariana Grande', year: 2018, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['7 rings', 'Side to Side', 'Problem'] },
  { id: 'the-joker', title: 'The Joker', artist: 'Steve Miller Band', year: 1973, difficulty: 'medium', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Fly Like an Eagle', 'Take the Money and Run', 'Rock\u2019n Me'] },
  { id: 'thescientist', title: 'The Scientist', artist: 'Coldplay', year: 2002, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Yellow', 'Fix You', 'Clocks'] },
  { id: 'tik-tok', title: 'TiK ToK', artist: 'Kesha', year: 2009, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Your Love Is My Drug', 'We R Who We R', 'Die Young'] },
  { id: 'time-of-the-season', title: 'Time of the Season', artist: 'The Zombies', year: 1968, difficulty: 'medium', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ["She's Not There", 'Tell Her No', 'Care of Cell 44'] },
  { id: 'toxic', title: 'Toxic', artist: 'Britney Spears', year: 2003, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Oops!... I Did It Again', '...Baby One More Time', 'Stronger'] },
  { id: 'tubular-bells', title: 'Tubular Bells', artist: 'Mike Oldfield', year: 1973, difficulty: 'medium', genre: 'Progressive',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['In the Hall of the Mountain King', 'Toccata and Fugue', 'Funeral March'] },
  { id: 'under-the-bridge', title: 'Under the Bridge', artist: 'Red Hot Chili Peppers', year: 1991, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Californication', 'Otherside', 'Scar Tissue'] },
  { id: 'virtual-insanity', title: 'Virtual Insanity', artist: 'Jamiroquai', year: 1996, difficulty: 'medium', genre: 'Acid Jazz',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Canned Heat', 'Cosmic Girl', 'Love Foolosophy'] },
  { id: 'what-would-you-do', title: 'What Would You Do?', artist: 'City High', year: 2001, difficulty: 'medium', genre: 'R&B',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Caramel', 'Hello', 'Sitting in Limbo'] },
  { id: 'where-are-you-now', title: 'Where Are You Now', artist: 'Lost Frequencies & Calum Scott', year: 2021, difficulty: 'medium', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Reality', 'Are You with Me', 'You & I'] },
  { id: 'where-you-will-lead-i-will-follow', title: 'Where You Lead', artist: 'Carole King', year: 1971, difficulty: 'hard', genre: 'Folk Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['It\u2019s Too Late', 'You\u2019ve Got a Friend', 'I Feel the Earth Move'] },
  { id: 'whip-my-hair', title: 'Whip My Hair', artist: 'Willow', year: 2010, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['21st Century Girl', 'Meet Me at Our Spot', 'Transparent Soul'] },
  { id: 'white-wedding', title: 'White Wedding', artist: 'Billy Idol', year: 1982, difficulty: 'easy', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Rebel Yell', 'Dancing with Myself', 'Eyes Without a Face'] },
  { id: 'wild-horses', title: 'Wild Horses', artist: 'The Rolling Stones', year: 1971, difficulty: 'medium', genre: 'Rock',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Angie', 'Gimme Shelter', 'Ruby Tuesday'] },
  { id: 'womanizer', title: 'Womanizer', artist: 'Britney Spears', year: 2008, difficulty: 'easy', genre: 'Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Circus', 'Piece of Me', 'Gimme More'] },
  { id: 'you-spin-me-round', title: 'You Spin Me Round (Like a Record)', artist: 'Dead or Alive', year: 1984, difficulty: 'easy', genre: 'Synth-Pop',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Something in My House', 'Brand New Lover', 'Lover Come Back to Me'] },
  { id: 'zombie', title: 'Zombie', artist: 'The Cranberries', year: 1994, difficulty: 'easy', genre: 'Alternative',
    stems: baseStems(), extraStems: fullExtras(),
    wrongAnswers: ['Linger', 'Dreams', 'Salvation'] },
];

// ============================================
// SONG LIBRARY — Legacy pre-existing songs (13)
// Original stem files, not overwritten by the new conversion.
// ============================================

const legacyLibrary: Song[] = [
  { id: 'hot-in-herre', title: 'Hot in Herre', artist: 'Nelly', year: 2002, difficulty: 'easy', genre: 'R&B',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['In Da Club', 'Dilemma', 'Ride Wit Me'] },
  { id: 'lady-marmalade', title: 'Lady Marmalade', artist: 'Labelle', year: 1974, difficulty: 'medium', genre: 'Disco',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Voulez-Vous', 'Le Freak', 'September'] },
  { id: 'magic', title: 'Magic', artist: 'The Cars', year: 1984, difficulty: 'hard', genre: 'New Wave',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYs.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Drive', 'You Might Think', 'Shake It Up'] },
  { id: 'surfin-usa', title: "Surfin' USA", artist: 'The Beach Boys', year: 1963, difficulty: 'easy', genre: 'Surf Rock',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRs.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Good Vibrations', 'California Girls', 'Kokomo'] },
  { id: 'lion-sleeps-tonight', title: 'The Lion Sleeps Tonight', artist: 'The Tokens', year: 1961, difficulty: 'easy', genre: 'Doo-Wop',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Stand By Me', 'Twist and Shout', 'Duke of Earl'] },
  { id: 'we-didnt-start-the-fire', title: "We Didn't Start the Fire", artist: 'Billy Joel', year: 1989, difficulty: 'medium', genre: 'Pop Rock',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Piano Man', 'Uptown Girl', 'Just the Way You Are'] },
  { id: 'pinball-wizard', title: 'Pinball Wizard', artist: 'The Who', year: 1969, difficulty: 'hard', genre: 'Rock',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 4, file: 'BVs.mp3', instrument: 'Backing Vocals', icon: ICON.bvs, color: '#9d4edd' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ["Baba O'Riley", 'My Generation', 'Behind Blue Eyes'] },
  { id: 'poker-face', title: 'Poker Face', artist: 'Lady Gaga', year: 2008, difficulty: 'easy', genre: 'Pop',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'BV1.mp3', instrument: 'Backing Vocals', icon: ICON.bvs, color: '#00ff88' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Bad Romance', 'Just Dance', 'Born This Way'] },
  { id: 'war', title: 'War', artist: 'Edwin Starr', year: 1970, difficulty: 'hard', genre: 'Soul',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'KEYS.mp3', instrument: 'Keys', icon: ICON.keys, color: COLOR.keys },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 4, file: 'BVs.mp3', instrument: 'Backing Vocals', icon: ICON.bvs, color: '#00ff88' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Signed, Sealed, Delivered', 'I Heard It Through the Grapevine', "What's Going On"] },
  { id: 'pennies-from-heaven', title: 'Pennies from Heaven', artist: 'Louis Prima', year: 1936, difficulty: 'hard', genre: 'Jazz',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'PIANO.mp3', instrument: 'Piano', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Fly Me to the Moon', 'Dream a Little Dream', 'Beyond the Sea'] },
  { id: 'all-shook-up', title: 'All Shook Up', artist: 'Elvis Presley', year: 1957, difficulty: 'medium', genre: 'Rock & Roll',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'PIANO.mp3', instrument: 'Piano', icon: ICON.keys, color: COLOR.keys },
      { id: 4, file: 'GTR.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Jailhouse Rock', 'Hound Dog', "Can't Help Falling in Love"] },
  { id: 'its-tricky', title: "It's Tricky", artist: 'Run-D.M.C.', year: 1986, difficulty: 'hard', genre: 'Hip-Hop',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 4, file: 'VOCALS.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['Walk This Way', 'Rock Box', 'My Adidas'] },
  { id: 'no-one-knows', title: 'No One Knows', artist: 'Queens of the Stone Age', year: 2002, difficulty: 'hard', genre: 'Rock',
    stems: [
      { id: 1, file: 'drums.mp3', instrument: 'Drums', icon: ICON.drums, color: COLOR.drums },
      { id: 2, file: 'bass.mp3', instrument: 'Bass', icon: ICON.bass, color: COLOR.bass },
      { id: 3, file: 'guitar.mp3', instrument: 'Guitar', icon: ICON.guitar, color: COLOR.guitar },
      { id: 4, file: 'vocals.mp3', instrument: 'Vocals', icon: ICON.vocals, color: COLOR.vocals },
    ],
    wrongAnswers: ['The Way You Used To Do', 'Little Sister', 'Go With The Flow'] },
];

export const songLibrary: Song[] = [...wosLibrary, ...legacyLibrary];

// Pre-configured song sets per round
export const roundSongSets: Record<RoundType, string[]> = {
  // 5 to 1: song 1 plays 5 stems ($1k), song 5 plays 1 stem ($5k). Final position needs an iconic drum pattern.
  '5to1': ['let-it-go', 'i-dont-want-to-miss-a-thing', 'tik-tok', 'mr-blue-sky', 'superstition'],
  // another-level: roundSongs tracks the 9 songs assigned to the 9 groups (anotherLevelSongs below is authoritative)
  'another-level': ['tainted-love', 'womanizer', 'should-i-stay-or-should-i-go-now', 'just-cant-get-enough',
                    'rocket-man', 'kiss-froma-rose', 'i-cant-help-myself', 'the-joker', 'lion-king'],
  'music-auction': ['humble', 'livin-la-vida-loca', 'johnny-b-goode', 'virtual-insanity'],
  // song-in-5-parts: overridden at runtime from partsQuestions targets; listed here for completeness
  'song-in-5-parts': ['thescientist', 'break-my-heart', 'zombie', 'love-story', 'we-didnt-start-the-fire'],
  // Song Showdown: 6 curated songs with distinct years. 3 visible at once + 3 replacements as they're played.
  // Picked to span ≥60 years of music so every contestant has a recognisable decade.
  'song-showdown': [
    'johnny-b-goode',         // 1958 — rock & roll
    'the-joker',              // 1973 — rock
    'radio-gaga',             // 1984 — rock
    'oops-i-did-it-again',    // 2000 — pop
    'thank-you-next',         // 2018 — pop
    'paint-the-town-red',     // 2023 — hip-hop
  ],
  // Win the Wall: endgame solo round. Need 6 correct to hit the $1m jackpot; lineup carries 8 for
  // alternates. Ordered easiest → hardest so early songs can be cleared fast (saving musicians).
  'win-the-wall': [
    'tik-tok',                // 2009
    'never-gonna-give-you-up',// 1987
    'let-it-go',              // 2013
    'mr-blue-sky',            // 1977
    'humble',                 // 2017
    'superstition',           // 1972
    'radio-gaga',             // 1984 — alternate
    'virtual-insanity',       // 1996 — alternate
  ],
};

// Prize configurations per round
export const roundPrizes: Record<RoundType, number[]> = {
  '5to1': [1000, 2000, 3000, 4000, 5000],
  'another-level': [1000, 2000, 6000],
  'music-auction': [15000, 6000, 3000, 2000, 1000], // Based on musician count chosen
  'song-in-5-parts': [1000, 2000, 3000, 4000, 5000], // col 1 → col 5; total possible $15k
  // Song Showdown: base ladder. Runtime doubles every entry for songs 4-6 (so the late-game values are
  // actually 5k / 4k / 3k / 2k / 1k). Ladder walks down as each musician joins: more musicians = lower cash.
  'song-showdown': [2500, 2000, 1500, 1000, 500],
  // Win the Wall: walkaway values at songs 3 and 5 plus the $1m jackpot at 6. Indices 0-5 = songs 1-6.
  // Before song 3 → bust = $0. At song 3 → $50k offer. At 5 → $100k. At 6 → $1m.
  'win-the-wall': [0, 0, 0, 50000, 50000, 100000], // walkaway values keyed by (songsWon after the song)
};

// Win the Wall ladder milestones (songsWon count → cash offer).
// Gates (3, 5, 6) trigger an explicit walkaway decision phase on the host + wall.
// Between-gate tiers (1, 2, 4) are display-only milestones so the pyramid shows progress;
// the survivor keeps playing through them without a walkaway choice.
export const WTW_WALKAWAY_OFFERS: Record<number, number> = {
  3: 50000,
  5: 100000,
  6: 1_000_000,
};

// Full 6-tier cash ladder for the pyramid display. Gate values (3/5/6) must match
// WTW_WALKAWAY_OFFERS above so the wall doesn't show a different number from what the host
// offers. Between-tier values are nominal milestones only.
export const WTW_TIER_VALUES: Record<number, number> = {
  1: 1_000,
  2: 10_000,
  3: 50_000,    // walkaway gate
  4: 75_000,
  5: 100_000,   // walkaway gate
  6: 1_000_000, // jackpot
};

// Win the Wall snake path through the 15 cells: bottom row L→R → middle row R→L → top row L→R.
// Each entry is [row, col] zero-indexed where row 0 = top, row 2 = bottom. Index 14 = top-right
// Vocals cell = "the last note" referenced in the round spec.
export const WTW_SNAKE: ReadonlyArray<readonly [number, number]> = [
  [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],  // bottom L→R
  [1, 4], [1, 3], [1, 2], [1, 1], [1, 0],  // middle R→L
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],  // top L→R (ends top-right)
];

// Song in 5 Parts: 5 questions, each with a target song + 2 herring songs
export interface PartsQuestion {
  targetSongId: string;
  herringSongIds: [string, string];
}

// Every song referenced below MUST have all 5 primary stems (D/B/K/G/V).
// NEW R4 model: each COLUMN is its own mini-game with its own target song + 2 decoys.
// 5 columns × (1 target + 2 decoys) = 15 cells. Each column tests a single instrument:
//   col 0 = Vocals, col 1 = Guitar, col 2 = Keys, col 3 = Bass, col 4 = Drums.
export interface PartsColumnQuestion {
  col: 0 | 1 | 2 | 3 | 4;
  targetSongId: string;
  decoySongIds: [string, string];
}

export const partsColumnQuestions: PartsColumnQuestion[] = [
  { col: 0, targetSongId: 'thescientist',           decoySongIds: ['mad-world', 'house-of-the-rising-sun'] },             // Vocals
  { col: 1, targetSongId: 'zombie',                 decoySongIds: ['white-wedding', 'wild-horses'] },                     // Guitar
  { col: 2, targetSongId: 'break-my-heart',         decoySongIds: ['oops-i-did-it-again', 'last-friday-night'] },         // Keys
  { col: 3, targetSongId: 'love-story',             decoySongIds: ['cruise', 'cowboy-take-me-home'] },                    // Bass
  { col: 4, targetSongId: 'we-didnt-start-the-fire', decoySongIds: ['maniac', 'magic'] },                                  // Drums
];

// Legacy question list kept for any old code paths that still reference it.
// Mirror the new model: one question per column, target = column target.
export const partsQuestions: PartsQuestion[] = partsColumnQuestions.map(q => ({
  targetSongId: q.targetSongId,
  herringSongIds: q.decoySongIds,
}));

export function getPartsQuestion(index: number): PartsQuestion | undefined {
  return partsQuestions[index];
}

// Resolve a column's target + decoys as Song objects.
export function getPartsColumnSongs(col: number): { target: Song; decoys: [Song, Song] } | null {
  const q = partsColumnQuestions.find(x => x.col === col);
  if (!q) return null;
  const target = getSongById(q.targetSongId);
  const d1 = getSongById(q.decoySongIds[0]);
  const d2 = getSongById(q.decoySongIds[1]);
  if (!target || !d1 || !d2) return null;
  return { target, decoys: [d1, d2] };
}

// ============================================
// ANOTHER LEVEL: Static prize board
// ============================================

export interface AnotherLevelCell {
  row: number;  // 1-3
  col: number;  // 1-5
  prize: number;
  color: string;
  group: string; // links cells belonging to same song
}

export interface AnotherLevelSongConfig {
  songId: string;
  group: string;
  stemInstruments: string[]; // e.g. ['Keys', 'Guitar']
  prize: number;
}

// 15-cell prize board (5 cols x 3 rows)
// Each row has 3 song groups in a 2+2+1 split
export const anotherLevelBoard: AnotherLevelCell[] = [
  // Row 1 (top): Superstition(1 purple) + decorative(2 white) + decorative(2 gold)
  { row: 1, col: 1, prize: 6000, color: '#9d4edd', group: 'purple' },
  { row: 1, col: 2, prize: 3000, color: '#e8e8e8', group: 'white' },
  { row: 1, col: 3, prize: 3000, color: '#e8e8e8', group: 'white' },
  { row: 1, col: 4, prize: 3000, color: '#daa520', group: 'gold' },
  { row: 1, col: 5, prize: 3000, color: '#daa520', group: 'gold' },
  // Row 2 (middle): decorative(2 teal) + Hot in Herre(2 pink) + decorative(1 green)
  { row: 2, col: 1, prize: 2000, color: '#00bcd4', group: 'teal' },
  { row: 2, col: 2, prize: 2000, color: '#00bcd4', group: 'teal' },
  { row: 2, col: 3, prize: 2000, color: '#ff69b4', group: 'pink' },
  { row: 2, col: 4, prize: 2000, color: '#ff69b4', group: 'pink' },
  { row: 2, col: 5, prize: 4000, color: '#00c853', group: 'green' },
  // Row 3 (bottom — easiest, all $1k to start from)
  { row: 3, col: 1, prize: 1000, color: '#ffd700', group: 'yellow' },
  { row: 3, col: 2, prize: 1000, color: '#ffd700', group: 'yellow' },
  { row: 3, col: 3, prize: 1000, color: '#4fc3f7', group: 'blue' },
  { row: 3, col: 4, prize: 1000, color: '#4fc3f7', group: 'blue' },
  { row: 3, col: 5, prize: 1000, color: '#ffab91', group: 'peach' },
];

// Column index (1-5) → instrument name. Fixed layout for Another Level.
export const AL_COL_INSTRUMENTS: Record<number, string> = {
  1: 'Drums',
  2: 'Bass',
  3: 'Keys',
  4: 'Guitar',
  5: 'Vocals',
};

// Given a group name, return the list of column instruments occupied by that group's cells.
export function getGroupInstruments(group: string): string[] {
  const cells = anotherLevelBoard.filter(c => c.group === group);
  const cols = [...new Set(cells.map(c => c.col))].sort((a, b) => a - b);
  return cols.map(c => AL_COL_INSTRUMENTS[c]).filter(Boolean);
}

// Given a group, return the prize (same for all cells in the group — and matches any single cell's value).
export function getGroupPrize(group: string): number {
  const cell = anotherLevelBoard.find(c => c.group === group);
  return cell?.prize ?? 1000;
}

// 9 playable songs — one per group on the board. stemInstruments derives from each group's
// column cells, so what players see is what plays.
//   purple (1 cell, row 1 col 1):      Drums               — $6k
//   white  (2 cells, row 1 cols 2-3):  Bass + Keys         — $3k
//   gold   (2 cells, row 1 cols 4-5):  Guitar + Vocals     — $3k
//   teal   (2 cells, row 2 cols 1-2):  Drums + Bass        — $2k
//   pink   (2 cells, row 2 cols 3-4):  Keys + Guitar       — $2k
//   green  (1 cell, row 2 col 5):      Vocals              — $4k
//   yellow (2 cells, row 3 cols 1-2):  Drums + Bass        — $1k
//   blue   (2 cells, row 3 cols 3-4):  Keys + Guitar       — $2k
//   peach  (1 cell, row 3 col 5):      Vocals              — $1k
export const anotherLevelSongs: AnotherLevelSongConfig[] = [
  // Purple is a single cell at row-1/col-1 (Drums by column default), but the producer wants
  // it to play Keys instead for Tainted Love — so we override stemInstruments here.
  { songId: 'tainted-love',                    group: 'purple', stemInstruments: ['Keys'], prize: getGroupPrize('purple') },
  { songId: 'womanizer',                       group: 'white',  stemInstruments: getGroupInstruments('white'),  prize: getGroupPrize('white') },
  { songId: 'should-i-stay-or-should-i-go-now', group: 'gold',   stemInstruments: getGroupInstruments('gold'),   prize: getGroupPrize('gold') },
  { songId: 'just-cant-get-enough',            group: 'teal',   stemInstruments: getGroupInstruments('teal'),   prize: getGroupPrize('teal') },
  { songId: 'rocket-man',                      group: 'pink',   stemInstruments: getGroupInstruments('pink'),   prize: getGroupPrize('pink') },
  { songId: 'kiss-froma-rose',                 group: 'green',  stemInstruments: getGroupInstruments('green'),  prize: getGroupPrize('green') },
  { songId: 'i-cant-help-myself',              group: 'yellow', stemInstruments: getGroupInstruments('yellow'), prize: getGroupPrize('yellow') },
  { songId: 'the-joker',                       group: 'blue',   stemInstruments: getGroupInstruments('blue'),   prize: getGroupPrize('blue') },
  { songId: 'lion-king',                       group: 'peach',  stemInstruments: getGroupInstruments('peach'),  prize: getGroupPrize('peach') },
];

export function getSongById(id: string): Song | undefined {
  return songLibrary.find(s => s.id === id);
}

export function getSongsForRound(round: RoundType): Song[] {
  const ids = roundSongSets[round];
  return ids.map(id => getSongById(id)).filter((s): s is Song => !!s);
}
