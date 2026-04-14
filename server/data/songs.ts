import type { Song, RoundType } from '../../shared/types.js';

export const songLibrary: Song[] = [
  {
    id: 'hot-in-herre', title: 'Hot in Herre', artist: 'Nelly', year: 2002, difficulty: 'easy', genre: 'R&B',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['In Da Club', 'Dilemma', 'Ride Wit Me'],
  },
  {
    id: 'lady-marmalade', title: 'Lady Marmalade', artist: 'Labelle', year: 1974, difficulty: 'medium', genre: 'Disco',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Voulez-Vous', 'Le Freak', 'September'],
  },
  {
    id: 'magic', title: 'Magic', artist: 'The Cars', year: 1984, difficulty: 'hard', genre: 'New Wave',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYs.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Drive', 'You Might Think', 'Shake It Up'],
  },
  {
    id: 'surfin-usa', title: "Surfin' USA", artist: 'The Beach Boys', year: 1963, difficulty: 'easy', genre: 'Surf Rock',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRs.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Good Vibrations', 'California Girls', 'Kokomo'],
  },
  {
    id: 'lion-sleeps-tonight', title: 'The Lion Sleeps Tonight', artist: 'The Tokens', year: 1961, difficulty: 'easy', genre: 'Doo-Wop',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Stand By Me', 'Twist and Shout', 'Duke of Earl'],
  },
  {
    id: 'we-didnt-start-the-fire', title: "We Didn't Start the Fire", artist: 'Billy Joel', year: 1989, difficulty: 'medium', genre: 'Pop Rock',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Piano Man', 'Uptown Girl', 'Just the Way You Are'],
  },
  {
    id: 'pinball-wizard', title: 'Pinball Wizard', artist: 'The Who', year: 1969, difficulty: 'hard', genre: 'Rock',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 4, file: 'BVs.mp3', instrument: 'Backing Vocals', icon: '\u{1F3A4}', color: '#9d4edd' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ["Baba O'Riley", 'My Generation', 'Behind Blue Eyes'],
  },
  {
    id: 'poker-face', title: 'Poker Face', artist: 'Lady Gaga', year: 2008, difficulty: 'easy', genre: 'Pop',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'BV1.mp3', instrument: 'Backing Vocals', icon: '\u{1F3A4}', color: '#00ff88' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Bad Romance', 'Just Dance', 'Born This Way'],
  },
  {
    id: 'toxic', title: 'Toxic', artist: 'Britney Spears', year: 2004, difficulty: 'easy', genre: 'Pop',
    stems: [
      { id: 1, file: 'drums.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'bass.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'keys.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'guitar.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'vocals.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Oops!... I Did It Again', 'Baby One More Time', 'Stronger'],
  },
  {
    id: 'never-gonna-give-you-up', title: 'Never Gonna Give You Up', artist: 'Rick Astley', year: 1987, difficulty: 'easy', genre: 'Pop',
    stems: [
      { id: 1, file: 'drums.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'bass.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'keys.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'guitar.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'vocals.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Together Forever', 'Take On Me', 'You Spin Me Round'],
  },
  {
    id: 'superstition', title: 'Superstition', artist: 'Stevie Wonder', year: 1972, difficulty: 'medium', genre: 'Funk',
    stems: [
      { id: 1, file: 'drums.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'bass.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'keys.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'guitar.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'vocals.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Sir Duke', 'Higher Ground', "Signed, Sealed, Delivered I'm Yours"],
  },
  {
    id: 'mr-blue-sky', title: 'Mr. Blue Sky', artist: 'Electric Light Orchestra', year: 1977, difficulty: 'medium', genre: 'Pop Rock',
    stems: [
      { id: 1, file: 'drums.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'bass.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'keys.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'guitar.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'vocals.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ["Don't Bring Me Down", "Livin' Thing", 'Evil Woman'],
  },
  {
    id: 'war', title: 'War', artist: 'Edwin Starr', year: 1970, difficulty: 'hard', genre: 'Soul',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'KEYS.mp3', instrument: 'Keys', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 4, file: 'BVs.mp3', instrument: 'Backing Vocals', icon: '\u{1F3A4}', color: '#00ff88' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Signed, Sealed, Delivered', "I Heard It Through the Grapevine", "What's Going On"],
  },
  {
    id: 'semi-charmed-life', title: 'Semi-Charmed Life', artist: 'Third Eye Blind', year: 1997, difficulty: 'medium', genre: 'Alternative',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 4, file: 'BVs.mp3', instrument: 'Backing Vocals', icon: '\u{1F3A4}', color: '#9d4edd' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Closing Time', 'MMMBop', 'Iris'],
  },
  {
    id: 'pennies-from-heaven', title: 'Pennies from Heaven', artist: 'Louis Prima', year: 1936, difficulty: 'hard', genre: 'Jazz',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'PIANO.mp3', instrument: 'Piano', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Fly Me to the Moon', 'Dream a Little Dream', 'Beyond the Sea'],
  },
  {
    id: 'all-shook-up', title: 'All Shook Up', artist: 'Elvis Presley', year: 1957, difficulty: 'medium', genre: 'Rock & Roll',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'PIANO.mp3', instrument: 'Piano', icon: '\u{1F3B9}', color: '#8b5cf6' },
      { id: 4, file: 'GTR.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 5, file: 'VOCAL.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Jailhouse Rock', 'Hound Dog', "Can't Help Falling in Love"],
  },
  {
    id: 'its-tricky', title: "It's Tricky", artist: 'Run-D.M.C.', year: 1986, difficulty: 'hard', genre: 'Hip-Hop',
    stems: [
      { id: 1, file: 'DRUMS.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'BASS.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'GTRS.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 4, file: 'VOCALS.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['Walk This Way', 'Rock Box', 'My Adidas'],
  },
  {
    id: 'no-one-knows', title: 'No One Knows', artist: 'Queens of the Stone Age', year: 2002, difficulty: 'hard', genre: 'Rock',
    stems: [
      { id: 1, file: 'drums.mp3', instrument: 'Drums', icon: '\u{1F941}', color: '#ff4444' },
      { id: 2, file: 'bass.mp3', instrument: 'Bass', icon: '\u{1F3B8}', color: '#00d4ff' },
      { id: 3, file: 'guitar.mp3', instrument: 'Guitar', icon: '\u{1F3B8}', color: '#ffd700' },
      { id: 4, file: 'vocals.mp3', instrument: 'Vocals', icon: '\u{1F3A4}', color: '#ff00aa' },
    ],
    wrongAnswers: ['The Way You Used To Do', 'Little Sister', 'Go With The Flow'],
  },
];

// Pre-configured song sets per round
export const roundSongSets: Record<RoundType, string[]> = {
  '1to5': ['never-gonna-give-you-up', 'toxic', 'hot-in-herre', 'surfin-usa', 'poker-face'],
  'another-level': ['lion-sleeps-tonight', 'hot-in-herre', 'superstition'],
  'music-auction': ['magic', 'lady-marmalade', 'we-didnt-start-the-fire', 'mr-blue-sky'],
  'song-in-5-parts': ['superstition', 'no-one-knows', 'pinball-wizard', 'lady-marmalade', 'never-gonna-give-you-up'],
};

// Prize configurations per round
export const roundPrizes: Record<RoundType, number[]> = {
  '1to5': [1000, 2000, 3000, 4000, 5000],
  'another-level': [1000, 2000, 6000],
  'music-auction': [15000, 6000, 3000, 2000, 1000], // Based on musician count chosen
  'song-in-5-parts': [2000, 2000, 2000, 2000, 2000],
};

// Song in 5 Parts: 5 questions, each with a target song + 2 herring songs
export interface PartsQuestion {
  targetSongId: string;
  herringSongIds: [string, string];
}

export const partsQuestions: PartsQuestion[] = [
  { targetSongId: 'superstition', herringSongIds: ['hot-in-herre', 'toxic'] },
  { targetSongId: 'no-one-knows', herringSongIds: ['surfin-usa', 'war'] },
  { targetSongId: 'pinball-wizard', herringSongIds: ['poker-face', 'mr-blue-sky'] },
  { targetSongId: 'lady-marmalade', herringSongIds: ['all-shook-up', 'semi-charmed-life'] },
  { targetSongId: 'never-gonna-give-you-up', herringSongIds: ['we-didnt-start-the-fire', 'pennies-from-heaven'] },
];

export function getPartsQuestion(index: number): PartsQuestion | undefined {
  return partsQuestions[index];
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
  // Row 3 (bottom): Lion Sleeps Tonight(2 yellow) + decorative(2 blue) + decorative(1 peach)
  { row: 3, col: 1, prize: 1000, color: '#ffd700', group: 'yellow' },
  { row: 3, col: 2, prize: 1000, color: '#ffd700', group: 'yellow' },
  { row: 3, col: 3, prize: 2000, color: '#4fc3f7', group: 'blue' },
  { row: 3, col: 4, prize: 2000, color: '#4fc3f7', group: 'blue' },
  { row: 3, col: 5, prize: 1000, color: '#ffab91', group: 'peach' },
];

// 3 playable songs (played in order: song 1 → 2 → 3)
export const anotherLevelSongs: AnotherLevelSongConfig[] = [
  { songId: 'lion-sleeps-tonight', group: 'yellow', stemInstruments: ['Keys', 'Guitar'], prize: 1000 },
  { songId: 'hot-in-herre', group: 'pink', stemInstruments: ['Drums', 'Keys'], prize: 2000 },
  { songId: 'superstition', group: 'purple', stemInstruments: ['Bass'], prize: 6000 },
];

export function getSongById(id: string): Song | undefined {
  return songLibrary.find(s => s.id === id);
}

export function getSongsForRound(round: RoundType): Song[] {
  const ids = roundSongSets[round];
  return ids.map(id => getSongById(id)).filter((s): s is Song => !!s);
}
