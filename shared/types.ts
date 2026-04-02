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
  stems: Stem[];
  wrongAnswers: string[];
}

export type RoundType = '1to5' | 'another-level' | 'music-auction' | 'song-in-5-parts';

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
  label?: string; // For auction offers like "$15,000"
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
  // Auction
  auctionOffers?: { musicians: number; prize: number }[];
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
  // Song in 5 Parts: multi-song info
  partsTargetRow?: number;
  partsTargetSongTitle?: string;
  partsSongs?: { title: string; artist: string; row: number }[];
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
  // Auction
  'host:auction-next-offer': {};
  'host:auction-start-bidding': {};
  'host:auction-reveal-bids': {};
  'player:auction-bid': { playerId: 1 | 2; musicianCount: number };
  // Song in 5 Parts
  'host:parts-next': {};
  'host:parts-play-current': {};
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
  '1to5': '1 TO 5',
  'another-level': 'ANOTHER LEVEL',
  'music-auction': 'MUSIC AUCTION',
  'song-in-5-parts': 'SONG IN 5 PARTS',
};

export function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString();
}
