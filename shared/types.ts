// ============================================
// SHARED TYPES - Used by both server and client
// ============================================

export interface Stem {
  id: number;
  file: string;
  instrument: string;
  icon: string;
  color: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  difficulty: 'easy' | 'medium' | 'hard';
  genre?: string;
  // Primary 5 stems used by R1 "5 to 1" and R2 "Another Level": D/B/K/G/V
  stems: Stem[];
  // Optional richer stems (horns, perc, BVs, 4 named LVs, clue) for R3/R4.
  // Only present for songs from the new WOS library.
  extraStems?: Stem[];
  wrongAnswers: string[];
}

export type RoundType = '5to1' | 'another-level' | 'music-auction' | 'song-in-5-parts';

export type GamePhase =
  | 'lobby'
  | 'round-intro'
  | 'playing'
  | 'buzzed'
  | 'judging'
  | 'wrong-other-player'
  | 'result'
  | 'round-complete'
  | 'game-over'
  // Another Level specific: board-view between song picks
  | 'another-level-board'
  // Music Auction specific
  | 'auction-offers'
  | 'auction-bidding'
  | 'auction-reveal'
  // Song in 5 Parts specific
  | 'parts-intro'
  | 'parts-playing';

export type ScreenRole = 'wall' | 'player' | 'host';

export interface PlayerInfo {
  name: string;
  score: number;
  connected: boolean;
}

export interface WallMusician {
  id: number;
  row: number;
  col: number;
  instrument: string;
  icon: string;
  color: string;
  isActive: boolean;
  isPlaying: boolean;
  label?: string; // Short bottom-of-cell label (e.g. prize board "$1k")
  speechText?: string; // Speech-bubble text floating above the cell (R3 auction offers)
}

// ============================================
// SERVER -> CLIENT STATE VIEWS
// ============================================

export interface WallState {
  phase: GamePhase;
  roundType: RoundType | null;
  roundName: string;
  songNumber: number;
  totalSongs: number;
  musicians: WallMusician[];
  currentPrize: number;
  players: { 1: PlayerInfo; 2: PlayerInfo };
  buzzedPlayer: 1 | 2 | null;
  visualEffect: 'none' | 'correct' | 'wrong' | 'reveal' | 'gold' | 'buzz';
  songTitle?: string;
  // Host pressed "Reveal Song" — wall shows the full title + artist as an overlay
  revealText?: string;
  message?: string;
  // Auction: which musician is making the current offer
  auctionHighlight?: { cellId: number; offerText: string } | null;
  // Auction: bid reveal
  auctionBids?: { player1: number | null; player2: number | null };
  auctionWinner?: 1 | 2 | 'tied' | null;
  auctionTimer?: number | null;
  genre?: string;
  // Song in 5 Parts: which part is currently playing
  currentPartLabel?: string;
  // Another Level: picked-group persistence (drives cell lit/dark rendering)
  anotherLevelCurrentGroup?: string;
  anotherLevelCompletedGroups?: string[];
  // Song in 5 Parts v2 column-hunt
  partsCurrentCol?: number;
  partsCurrentRow?: number;
  partsPassCount?: number;
  partsColumnWinners?: ({ player: 1 | 2; songIndex: 0 | 1 | 2 } | null)[];
  partsColumnForfeits?: boolean[];
  partsLockedPlayers?: (1 | 2)[];
  partsRevealing?: boolean;
}

export interface PlayerState {
  playerId: 1 | 2;
  name: string;
  score: number;
  canBuzz: boolean;
  hasBuzzed: boolean;
  otherBuzzed: boolean;
  phase: GamePhase;
  roundName: string;
  songNumber: number;
  totalSongs: number;
  resultMessage: string;
  currentPrize: number;
  // Auction — each option's cumulative instrument list (bid N = hear first N musicians' stems)
  auctionOffers?: { musicians: number; prize: number; instruments: string[] }[];
  auctionCanBid?: boolean;
  auctionMyBid?: number | null;
  auctionOtherBid?: number | null;
  auctionWinner?: 1 | 2 | 'tied' | null;
  auctionTimer?: number | null;
  genre?: string;
}

export interface AuctionOffer {
  stemId: number;
  instrument: string;
  icon: string;
  color: string;
  musicianCount: number;
  prize: number;
  revealed: boolean;
  cellId: number; // Which wall cell (1-15) hosts this offer. Randomised per song.
}

export interface SongPart {
  partIndex: number;
  label: string;
  stemIds: number[];
  row: number;
  col?: number;
  isPlayed: boolean;
  isCurrent: boolean;
}

export interface HostState {
  phase: GamePhase;
  roundType: RoundType | null;
  roundName: string;
  songNumber: number;
  totalSongs: number;
  currentSong: Song | null;
  activeStems: number[];
  totalStems: number;
  isAudioPlaying: boolean;
  currentPrize: number;
  buzzedPlayer: 1 | 2 | null;
  players: { 1: PlayerInfo; 2: PlayerInfo };
  connections: { wall: number; player1: boolean; player2: boolean; host: number };
  songList: { id: string; title: string; artist: string }[];
  // Round-specific
  auctionOffers: AuctionOffer[];
  auctionCurrentOffer: number;
  auctionBids?: { player1: number | null; player2: number | null };
  auctionWinner?: 1 | 2 | 'tied' | null;
  auctionBothSubmitted?: boolean;
  auctionTimer?: number | null;
  genre?: string;
  songParts: SongPart[];
  currentPartIndex: number;
  anotherLevelConfig: { songId: string; group: string; stemInstruments: string[]; prize: number }[];
  // Another Level: lifecycle across picks
  anotherLevelCurrentGroup?: string;
  anotherLevelCompletedGroups?: string[];
  anotherLevelPlayableGroups?: { group: string; songTitle: string; songArtist: string; prize: number; instruments: string[] }[];
  // 15 cells for the host-side click grid: row, col, prize, group color, group name, column instrument + icon
  anotherLevelCells?: { row: number; col: number; prize: number; color: string; group: string; instrument: string; icon: string }[];
  // Song in 5 Parts: multi-song info
  partsTargetRow?: number;
  partsTargetSongTitle?: string;
  partsSongs?: { title: string; artist: string; row: number }[];
  // Song in 5 Parts v2 column-hunt (host-facing controls need these)
  partsCurrentCol?: number;
  partsCurrentRow?: number;
  partsPassCount?: number;
  partsColumnWinners?: ({ player: 1 | 2; songIndex: 0 | 1 | 2 } | null)[];
  partsColumnForfeits?: boolean[];
  partsLockedPlayers?: (1 | 2)[];
  partsRevealing?: boolean;
  // Full scatter for host display — which song (0=target, 1-2=decoys) is on each cell
  partsScatter?: { row: number; col: number; songIndex: 0 | 1 | 2 }[];
  // Per-column target + decoys (host-only info; shown in column picker)
  partsColumnSongs?: { col: number; targetTitle: string; targetArtist: string; decoyTitles: [string, string] }[];
}

// ============================================
// AUDIO COMMANDS (server -> wall)
// ============================================

export type AudioCommand =
  | { action: 'load'; songId: string; stems: Stem[] }
  | { action: 'load-multi'; songs: { songId: string; stems: Stem[]; row: number }[] }
  | { action: 'play' }
  | { action: 'pause' }
  | { action: 'stop' }
  | { action: 'set-stem-volume'; stemId: number; volume: number }
  | { action: 'fade-in-stem'; stemId: number; duration: number }
  | { action: 'fade-out-stem'; stemId: number; duration: number }
  | { action: 'fade-all-in'; duration: number }
  | { action: 'fade-all-out'; duration: number }
  | { action: 'test-tone' };

// ============================================
// SOCKET EVENT TYPES
// ============================================

// Client -> Server
export interface ClientEvents {
  'register': { role: ScreenRole; playerId?: 1 | 2 };
  'player:buzz': { playerId: 1 | 2; timestamp: number };
  'player:set-name': { playerId: 1 | 2; name: string };
  'host:select-round': { round: RoundType };
  'host:load-song': { songIndex: number };
  'host:play': {};
  'host:pause': {};
  'host:stop': {};
  'host:add-musician': {};
  'host:remove-musician': { stemId: number };
  'host:reveal-all': {};
  'host:mark-correct': {};
  'host:mark-wrong': {};
  'host:give-to-other': {};
  'host:next-song': {};
  'host:adjust-score': { player: 1 | 2; delta: number };
  'host:end-round': {};
  'host:reset': {};
  'host:set-stem': { stemId: number; active: boolean };
  // Reveal the current song's title + artist on the wall (all rounds)
  'host:reveal-song': {};
  // Another Level
  'host:al-select-group': { group: string };
  'host:al-back-to-board': {};
  // Auction
  'host:auction-next-offer': {};
  'host:auction-start-bidding': {};
  'host:auction-reveal-bids': {};
  'host:auction-start-music': {};
  'player:auction-bid': { playerId: 1 | 2; musicianCount: number };
  // Song in 5 Parts
  'host:parts-next': {};
  'host:parts-play-current': {};
  // Song in 5 Parts v2 (column-hunt): start a column (0-4), step to next stem manually, advance col, reveal
  'host:parts-start-column': { col: number };
  'host:parts-next-stem': {};
  'host:parts-next-column': {};
  'host:parts-reveal': {};
}

// Server -> Client
export interface ServerEvents {
  'wall:state': WallState;
  'wall:audio': AudioCommand;
  'player:state': PlayerState;
  'host:state': HostState;
  'connected': { role: ScreenRole; clientCount: number };
}

// ============================================
// CONSTANTS
// ============================================

export const WALL_INSTRUMENTS = ['drums', 'bass', 'keys', 'guitar', 'vocals'] as const;

export const INSTRUMENT_ICONS: Record<string, string> = {
  drums: '\u{1F941}',
  bass: '\u{1F3B8}',
  guitar: '\u{1F3B8}',
  keys: '\u{1F3B9}',
  piano: '\u{1F3B9}',
  vocals: '\u{1F3A4}',
  horns: '\u{1F3BA}',
  strings: '\u{1F3BB}',
  bvs: '\u{1F3A4}',
};

export const INSTRUMENT_COLORS: Record<string, string> = {
  drums: '#ff4444',
  bass: '#00d4ff',
  keys: '#8b5cf6',
  piano: '#8b5cf6',
  guitar: '#ffd700',
  vocals: '#ff00aa',
  horns: '#00ff88',
  strings: '#ff8c00',
  bvs: '#9d4edd',
};

export const ROW_COLORS = [
  ['#ff4444', '#00d4ff', '#8b5cf6', '#ffd700', '#ff00aa'],
  ['#ff6b6b', '#00ffff', '#9d4edd', '#ffb700', '#ff69b4'],
  ['#ff3333', '#00e5ff', '#7c3aed', '#ffe500', '#ff1493'],
];

export const ROUND_NAMES: Record<RoundType, string> = {
  '5to1': '5 TO 1',
  'another-level': 'ANOTHER LEVEL',
  'music-auction': 'MUSIC AUCTION',
  'song-in-5-parts': 'SONG IN 5 PARTS',
};

export function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString();
}
