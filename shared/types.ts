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

export type RoundType = '5to1' | 'another-level' | 'music-auction' | 'song-in-5-parts' | 'song-showdown' | 'win-the-wall';

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
  | 'parts-playing'
  // Song Showdown: dedicated "Toss Up" opener. One song worth $1k, free-for-all (no lockout),
  // winner banks $1k and picks the first year of the main game.
  | 'showdown-toss-up'
  // Song Showdown specific: controller picks a year from the 3 visible rows
  | 'showdown-year-pick'
  // Win the Wall specific
  | 'wtw-playing'                 // musician snake is ticking, buzz open
  | 'wtw-walkaway-offer'          // at 3 or 5 songs: offer walkaway vs keep-going
  | 'wtw-song-won'                // between-gate correct (songs 1, 2, 4): celebration; host taps Next Song
  | 'wtw-gold'                    // all 6 — wall turns gold, jackpot won (default $250k, host-configurable)
  | 'wtw-bust';                   // burned all 15 musicians without 3 — walks with nothing

export type ScreenRole = 'wall' | 'player' | 'host';

// Player IDs. Rounds played with all 3 (Song Showdown) broaden to 1|2|3;
// rounds played after the first elimination (R3 Music Auction, R4 Song in 5 Parts,
// Win the Wall) still type-annotate 1|2 where that's all they handle.
export type PlayerId = 1 | 2 | 3;

export interface PlayerInfo {
  name: string;
  score: number;
  connected: boolean;
  // True once the player has been eliminated (bottom of Song Showdown, or Win the Wall runner-up).
  // Eliminated players can't buzz/bid; R3/R4 ignore their input.
  eliminated?: boolean;
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
  players: { 1: PlayerInfo; 2: PlayerInfo; 3: PlayerInfo };
  buzzedPlayer: PlayerId | null;
  visualEffect: 'none' | 'correct' | 'wrong' | 'reveal' | 'gold' | 'buzz';
  songTitle?: string;
  // Host pressed "Reveal Song" — wall shows the full title + artist as an overlay
  revealText?: string;
  message?: string;
  // Auction: which musician is making the current offer
  auctionHighlight?: { cellId: number; offerText: string } | null;
  // Auction: the 5 tiers (1-musician through 5-musicians) shown as a side pyramid
  // on the wall during the offers/bidding phases. Index 0 = 1 musician, index 4 = 5 musicians.
  auctionOffersLadder?: { musicianCount: number; prize: number; instrument: string; icon: string; color: string }[];
  // Auction: index into auctionOffersLadder for the currently-being-revealed offer. -1 = none yet.
  auctionCurrentOffer?: number;
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
  // Less is More: resolved 5-entry prize ladder (default [3k,4k,5k,6k,10k]; host-configurable
  // via /setup). Used by the right-side ladder display on the wall.
  fiveToOneLadder?: number[];
  // Song Showdown — 3 rows, one year label per row. selected row = currently playing.
  showdownRows?: { row: number; year: number; songId: string; selected: boolean; done: boolean }[];
  showdownController?: PlayerId | null;     // whose turn to pick a year
  showdownTier?: number;                     // 0-4 into current ladder (fewer stems = earlier tier = more cash)
  showdownLadder?: number[];                 // 5-entry ladder, already doubled if songsPlayed >= 3
  showdownSongsPlayed?: number;              // 0-6
  showdownLockedPlayers?: PlayerId[];        // wrong-buzz lockout for current showdown song only
  showdownSelectedRow?: number;              // 1-3 of the wall row currently playing; 2 during toss-up
  // Win the Wall
  wtwMusicianIndex?: number;                 // 0-14 (snake position, current musician playing)
  wtwSpentMusicians?: number[];              // indices already used, rendered faded
  wtwSongsWon?: number;                      // 0-6
  wtwMusiciansThisSong?: number;             // 0-5 — 5 forces skip
  wtwSurvivor?: PlayerId | null;             // who's playing
  wtwCurrentOffer?: number | null;           // walkaway tier displayed at a gate (50k / 100k / 250k)
  wtwStartingScore?: number;                 // survivor's banked total at round start — shown on bust
  wtwPrizes?: { gate3: number; gate5: number; gate6: number };  // resolved cash for the 3 gates
  // Host-triggered narrative pause: shows a big "here's where everyone is" scoreboard overlay
  // on the wall. Can be toggled at any phase without affecting the underlying round state.
  showScoresOverlay?: boolean;
  // True while the current round is running as a demo (dry-run / tutorial). Wall shows a
  // persistent "DEMO" badge; scores and eliminations will be reverted when the host leaves
  // the round.
  demoMode?: boolean;
}

export interface PlayerState {
  playerId: PlayerId;
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
  buzzedPlayer: PlayerId | null;
  players: { 1: PlayerInfo; 2: PlayerInfo; 3: PlayerInfo };
  connections: { wall: number; player1: boolean; player2: boolean; player3: boolean; host: number };
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
  // Song Showdown host-side info
  showdownYearsVisible?: { songId: string; title: string; artist: string; year: number; row: number }[];
  showdownYearsReserveCount?: number;
  showdownController?: PlayerId | null;
  showdownSongsPlayed?: number;
  showdownTier?: number;
  showdownLadder?: number[];
  showdownLockedPlayers?: PlayerId[];
  showdownCurrentSongId?: string | null;
  showdownSelectedRow?: number | null;
  // Win the Wall host-side info
  wtwMusicianIndex?: number;
  wtwSongsWon?: number;
  wtwMusiciansThisSong?: number;
  wtwSurvivor?: PlayerId | null;
  wtwCurrentSongId?: string | null;
  wtwJackpotIfWon?: number;
  wtwLineupSize?: number;
  wtwStartingScore?: number;
  wtwPrizes?: { gate3: number; gate5: number; gate6: number };
  showScoresOverlay?: boolean;
  demoMode?: boolean;
  // Current editable config — shown in /setup and used to drive round lineups at selection time
  config?: GameConfig;
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
  'register': { role: ScreenRole; playerId?: PlayerId };
  'player:buzz': { playerId: PlayerId; timestamp: number };
  'player:set-name': { playerId: PlayerId; name: string };
  // round: which round to run. demo (optional, default false): run the round as a dry-run,
  // using the demo lineup if configured. Score and eliminated-flag changes during a demo
  // round are reverted when the host leaves the round (back-to-lobby / picks another round).
  'host:select-round': { round: RoundType; demo?: boolean };
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
  'host:adjust-score': { player: PlayerId; delta: number };
  // Manually set a player's score to an exact value. Used for mid-show corrections,
  // producer overrides, or loading a carry-over total from a previous episode.
  // Any integer allowed (incl. negative). The host UI no-ops when the input is empty.
  'host:set-score': { player: PlayerId; amount: number };
  // Manually flip a player's eliminated flag. Used to resolve showdown ties or to skip the
  // opener and go straight to 2-player rounds with a pre-chosen elimination.
  'host:set-eliminated': { player: PlayerId; eliminated: boolean };
  // Toggle the "show me the money" overlay on the wall — a narrative pause where the host
  // reads out each player's running total. Orthogonal to game phase; audio/round continues
  // underneath. Pass { show: true } to reveal, { show: false } to dismiss.
  'host:toggle-scores-overlay': { show: boolean };
  // "Prove out" the current song — fade all stems in so the audience hears the full mix.
  // Typically used after a correct guess so people hear the real song, but host can trigger
  // any time the round has a loaded song. No effect on score/phase — purely audio.
  'host:prove-out': {};
  'host:end-round': {};
  'host:reset': {};
  'host:set-stem': { stemId: number; active: boolean };
  // Reveal the current song's title + artist on the wall (all rounds)
  'host:reveal-song': {};
  // Dismiss the reveal overlay on the wall (all rounds)
  'host:clear-reveal': {};
  // Setup / library editor
  'host:config-set-round-lineup': { round: RoundType; songIds: string[] };
  'host:config-set-al-group-song': { group: string; songId: string };
  'host:config-set-parts-column': { col: number; targetSongId: string; decoy1SongId: string; decoy2SongId: string };
  'host:config-set-stem-order': { songId: string; stemIds: number[] };
  'host:config-set-auction-override': { songId: string; title?: string; genre?: string };
  // Per-song year override. Pass null to clear and fall back to the song's default year.
  'host:config-set-song-year': { songId: string; year: number | null };
  'host:config-reset': {};
  'host:config-import': { json: string };
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
  // Song Showdown
  'host:showdown-pick-year': { songId: string };
  'host:showdown-next-song': {};              // after a resolution — replaces year, hands to controller
  'host:showdown-eliminate-lowest': {};       // after 6 songs: mark lowest-score player eliminated
  'host:showdown-set-controller': { playerId: PlayerId };  // manual override (e.g. to rerun random pick)
  // Win the Wall
  'host:wtw-set-survivor': { playerId: PlayerId };  // host marks who's playing the endgame
  'host:wtw-start-song': {};                         // begin the snake ticker for next song
  'host:wtw-correct': {};                            // buzz was right → full wall mix celebration, song counts
  'host:wtw-skip': {};                               // manual next-song (no musician burn)
  'host:wtw-jump-to-song': { lineupIndex: number };  // jump directly to any song in the lineup
  'host:wtw-reorder-lineup': { songIds: string[] };  // reorder the WTW lineup mid-round
  'host:wtw-walkaway-accept': {};                    // survivor banked the offered jackpot
  'host:wtw-walkaway-decline': {};                   // survivor continues for more
  'host:wtw-reset': {};                              // reset round state, keep lineup
  'host:config-set-showdown-lineup': { songIds: string[] };
  'host:config-set-wtw-lineup': { songIds: string[] };
  // Replace the list of songs tagged for a given starting instrument. Pass [] to clear.
  'host:config-set-wtw-by-instrument': { instrument: 'Drums' | 'Bass' | 'Keys' | 'Guitar' | 'Vocals'; songIds: string[] };
  // Set a round's prize ladder (5 values). Pass null to clear back to default.
  'host:config-set-round-prizes': { round: '5to1' | 'music-auction' | 'song-in-5-parts' | 'song-showdown'; values: number[] | null };
  // Set the Song Showdown toss-up fixed prize. Pass null to clear back to $1,000.
  'host:config-set-tossup-prize': { value: number | null };
  // Edit one or more of the 3 Win-the-Wall cash gates. Only the keys included get updated.
  // Pass `null` for a value to reset that gate to the hard-coded default ($50k/$100k/$250k).
  'host:config-set-wtw-prizes': { gate3?: number | null; gate5?: number | null; gate6?: number | null };
  'host:config-set-demo-lineup': { round: RoundType; songIds: string[] };
  // Song Showdown toss-up song. Pass empty string to remove / skip toss-up.
  'host:config-set-showdown-tossup': { songId: string };
  // Host skips the currently-playing toss-up without awarding anyone (nobody guessed, or
  // producer wants to move on). Transitions to the normal year-pick phase with a random controller.
  'host:showdown-skip-toss-up': {};
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
  '5to1': 'LESS IS MORE',
  'another-level': 'ANOTHER LEVEL',
  'music-auction': 'MUSIC AUCTION',
  'song-in-5-parts': 'SONG IN 5 PARTS',
  'song-showdown': 'SONG SHOWDOWN',
  'win-the-wall': 'WIN THE WALL',
};

export function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString();
}

// ============================================
// Setup / Song Library config — editable per-session via /setup route
// ============================================
// Each round holds an ordered song-id list that overrides the hard-coded defaults at runtime.
// R2 and R4 have richer schemas (group→song, column→target+decoys) so their editors
// serialise differently.
export interface GameConfig {
  // Simple ordered/unordered lineups (R1, R3)
  roundLineups: Partial<Record<RoundType, string[]>>;
  // R2: group-name → song-id override. Leaves instruments/prize from the default board.
  anotherLevelGroupSongs?: Record<string, string>;
  // R4: column index → {target, decoy1, decoy2}
  partsColumnOverrides?: Record<number, { targetSongId: string; decoy1SongId: string; decoy2SongId: string }>;
  // R1 "5 to 1" reveal order per song — [stemId, stemId, ...] left-to-right.
  // Slot 1 plays alone in the 1-stem song; slots 1-2 play together in the 2-stem song; etc.
  stemOrderBySong?: Record<string, number[]>;
  // R3 "Music Auction" on-wall title/genre overrides per song (lets the host curate what the
  // audience sees, e.g. rename "HUMBLE." to "RAP HIT" and genre "Hip-Hop" to "2010s")
  musicAuctionOverrides?: Record<string, { title?: string; genre?: string }>;
  // Per-song year override. Drives Song Showdown row labels and any future
  // year-based filtering. Omitted entry ⇒ use the song's default year from songs.ts.
  songYearOverrides?: Record<string, number>;
  // Song Showdown: ordered pool of songs (at least 6 required — 3 visible + 3 replacements).
  // Each song's effective year (via songYearOverrides or baked year) is what's shown on the wall.
  songShowdownLineup?: string[];
  // Song Showdown: optional single "Toss Up" song that plays FIRST (before the 6 main songs).
  // Fixed $1k prize, free-for-all buzz (no lockout on wrong), winner's $1k banks toward the
  // 6-song elimination threshold and they pick the first real-round year. Clear this (empty
  // string) to skip toss-up and start the round on the year-picker as before.
  songShowdownTossUp?: string;
  // Win the Wall: ordered song pool for the endgame. Acts as fallback when the starting-
  // instrument pool (winTheWallByInstrument) is empty or exhausted. Up to ~12 songs.
  winTheWallLineup?: string[];
  // Win the Wall: songs tagged by which instrument they START WELL on (matching the snake
  // cell the song opens from). Each snake cell owns an instrument (col 0=Drums … col 4=Vocals);
  // when WTW needs the next song, it first tries songs tagged for the current cell's
  // instrument before falling back to winTheWallLineup. Songs may appear in multiple columns.
  winTheWallByInstrument?: Partial<Record<'Drums' | 'Bass' | 'Keys' | 'Guitar' | 'Vocals', string[]>>;
  // Win the Wall: per-gate cash values (songs 3, 5, 6). Overrides the hard-coded
  // $50k / $100k / $250k defaults. Missing keys fall through to the default.
  // All three are ADDITIVE on top of banked earnings from earlier rounds.
  winTheWallPrizes?: Partial<Record<3 | 5 | 6, number>>;
  // Per-round prize ladders (5 values each, same shape as hardcoded defaults in songs.ts).
  // Song Showdown: runtime still doubles for songs 4-6 on top of this base.
  // Missing round key / wrong length → fall back to default.
  roundPrizes?: Partial<Record<'5to1' | 'music-auction' | 'song-in-5-parts' | 'song-showdown', number[]>>;
  // Song Showdown toss-up fixed prize (default $1,000). Free-for-all opener.
  songShowdownTossUpPrize?: number;
  // Per-round "demo lineup" — a short (recommended 3-song) set used when the host toggles a
  // round into demo mode from /host or /setup. Demo rounds run exactly like the real thing but
  // score changes and eliminations are reverted at round end via a pre-round snapshot.
  // Missing entry for a round ⇒ demo falls back to the first 3 songs of the real lineup.
  demoLineup?: Partial<Record<RoundType, string[]>>;
}
