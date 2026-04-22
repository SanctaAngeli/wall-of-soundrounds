import type {
  GamePhase, RoundType, Song, WallMusician, PlayerInfo, PlayerId,
  WallState, PlayerState, HostState,
  AuctionOffer, SongPart, GameConfig,
} from '../shared/types.js';
import { ROW_COLORS, WALL_INSTRUMENTS, ROUND_NAMES, formatMoney } from '../shared/types.js';
import { getSongsForRound, getSongById, getPartsQuestion, getPartsColumnSongs, roundPrizes, roundSongSets, partsQuestions, partsColumnQuestions, anotherLevelBoard, anotherLevelSongs, AL_COL_INSTRUMENTS, WTW_SNAKE, WTW_WALKAWAY_OFFERS_DEFAULT } from './data/songs.js';
import type { AnotherLevelSongConfig } from './data/songs.js';
import { INSTRUMENT_ICONS, INSTRUMENT_COLORS } from '../shared/types.js';

export interface GameState {
  phase: GamePhase;
  roundType: RoundType | null;

  // Songs for current round
  roundSongs: Song[];
  currentSongIndex: number;

  // Current song audio state
  currentSong: Song | null;
  activeStems: number[];
  isAudioPlaying: boolean;

  // Players
  players: { 1: PlayerInfo; 2: PlayerInfo; 3: PlayerInfo };
  buzzedPlayer: PlayerId | null;

  // Prize
  currentPrize: number;

  // Visual
  visualEffect: 'none' | 'correct' | 'wrong' | 'reveal' | 'gold' | 'buzz';
  message: string;
  songTitle: string;
  revealText: string;

  // Connections
  connections: { wall: number; player1: boolean; player2: boolean; player3: boolean; host: number };

  // Another Level: playable song configs
  anotherLevelSongConfigs: AnotherLevelSongConfig[];
  anotherLevelCurrentGroup: string; // group name of the currently playing song (empty while on board)
  anotherLevelCompletedGroups: string[]; // groups that have been played (darkened permanently)

  // Music Auction
  auctionOffers: AuctionOffer[];
  auctionCurrentOffer: number; // index into auctionOffers, -1 = not started
  auctionHighlight: { cellId: number; offerText: string } | null;
  auctionBids: { player1: number | null; player2: number | null };
  auctionWinner: 1 | 2 | 'tied' | null;
  auctionTimerValue: number | null; // seconds remaining (null = no timer)
  auctionTimerInterval: ReturnType<typeof setInterval> | null; // not serialized

  // Song in 5 Parts
  songParts: SongPart[];
  currentPartIndex: number;
  partsTargetRow: number; // 1-3, which row has the target song
  partsTargetSong: Song | null;
  partsHerring1: Song | null;
  partsHerring2: Song | null;
  partsSongsByRow: { row: number; song: Song }[]; // legacy display; no longer drives gameplay
  // R4 scatter: each of the 15 cells plays a specific song's stem for that column's instrument.
  // Per column: 3 rows are assigned [target, decoy1, decoy2] shuffled — AND the target row
  // of column N is guaranteed not to equal the target row of column N-1 (no adjacent cols stacked).
  partsScatter: { row: number; col: number; songIndex: 0 | 1 | 2 }[];
  // NEW: each column has its OWN target + 2 decoys. songIndex 0 = this col's target,
  // 1/2 = this col's decoys. Populated at loadSong from partsColumnQuestions.
  partsColumnSongs: { col: number; target: Song; decoys: [Song, Song] }[];
  // R4 column-hunt mechanic (boss's design):
  // - play one cell at a time for 5s, advance row 1→2→3, loop at most twice per column
  // - buzz claims whichever cell is currently playing; correct = win col + $1k; wrong = player locked for col
  // - after 2 full passes with no correct answer, reveal target cell + advance (forfeit)
  partsCurrentCol: number;                                                   // 0-4 (-1 before start)
  partsCurrentRow: number;                                                   // 1-3 (0 before start)
  partsPassCount: number;                                                    // 0 = first pass, 1 = second pass
  partsColumnWinners: ({ player: 1 | 2; songIndex: 0 | 1 | 2 } | null)[];    // 5 slots, filled as cols resolve
  partsColumnForfeits: boolean[];                                            // 5 slots, true for forfeited cols
  partsLockedPlayers: (1 | 2)[];                                             // players locked out for the CURRENT col
  partsRevealing: boolean;                                                   // true while showing target after forfeit
  partsTimerInterval: ReturnType<typeof setInterval> | null;

  // ============================================
  // SONG SHOWDOWN (R1 opener, 3 players)
  // ============================================
  // 3 song IDs currently on the wall (one per row). yearsReserve are queued replacements;
  // yearsPlayed logs what's been used so we never re-pick. After 6 plays → round-complete.
  showdownYearsVisible: string[];            // length 3 during play
  showdownYearsReserve: string[];            // drawn from when a visible year is consumed
  showdownYearsPlayed: string[];
  showdownSongsPlayed: number;               // 0-6; triggers prize-ladder doubling at ≥3 and elimination at 6
  showdownControllerPlayer: PlayerId | null; // picks the next year (random on round start, winner of last buzz after)
  showdownSelectedRow: number;               // 1-3 = which wall row is currently playing (0 = none)
  showdownStemJoinOrder: number[];           // 5 stem IDs in join order (from stemOrderBySong or song default)
  showdownTier: number;                      // 0-4 index into the ladder; tier 0 = 1 stem playing, tier 4 = all 5
  showdownLockedPlayers: PlayerId[];         // wrong-buzz lockout for the CURRENT showdown song; cleared on next song
  showdownTimerInterval: ReturnType<typeof setInterval> | null;
  // Toss Up (opening question, fixed $1k, free-for-all). Becomes true as soon as the toss-up
  // is resolved (won or skipped) — drives showdownNextSong to transition to year-pick rather
  // than advancing the main 6-song counter.
  showdownTossUpResolved: boolean;

  // ============================================
  // WIN THE WALL (endgame, 1 survivor)
  // ============================================
  // Snake-advance through 15 musicians; correct buzz → song counts, burn no more musicians.
  // Goal: 6 songs before musician 15 sings. Gates at 3 ($50k), 5 ($100k), 6 ($1m).
  wtwLineup: Song[];                         // resolved 6-8 songs for this game
  wtwMusicianIndex: number;                  // 0-14 snake position; -1 = not started
  wtwSongIndex: number;                      // index into wtwLineup for the currently-playing song (advances on correct or skip)
  wtwSongsWon: number;                       // 0-6; milestone for walkaway offers and jackpot
  wtwMusiciansThisSong: number;              // 0-5; forced skip at 5 (song is wasted, musicians are spent)
  wtwSurvivor: PlayerId | null;              // which player is doing the endgame
  wtwTimerInterval: ReturnType<typeof setInterval> | null;
  wtwWalkawayOffered: number | null;         // cash offer being displayed (at gates 3 and 5)
  // Snapshot the survivor's banked total at round start. Used by the bust message so the wall
  // shows "Walk away with $X" (their series earnings) instead of "nothing" — bust doesn't wipe
  // the money they brought into the final.
  wtwStartingScore: number;

  // Snake index where the CURRENT song started. Cells in [wtwSongStartIndex, wtwMusicianIndex]
  // are "currently playing this song" (lit full gold); cells before it are "spent on a prior
  // song" (semi-opacity gold); cells after are upcoming. Reset on every song change.
  wtwSongStartIndex: number;

  // Host-triggered scoreboard overlay. Orthogonal to game phase — setting this true at any time
  // displays a big "Player 1: $X, Player 2: $X, Player 3: $X" overlay on the wall. Audio and
  // round state continue underneath. Dismissed with another host click.
  showScoresOverlay: boolean;

  // Demo mode: current round is a dry-run. Uses the demo lineup (3 songs). Score changes and
  // eliminations during this round get reverted when the host leaves it.
  demoMode: boolean;
  demoSnapshot: {
    players: { 1: PlayerInfo; 2: PlayerInfo; 3: PlayerInfo };
  } | null;

  // Editable setup config — host mutates via /setup; overrides the hard-coded roundSongSets etc.
  config: GameConfig;
}

export function createInitialState(): GameState {
  return {
    phase: 'lobby',
    roundType: null,
    roundSongs: [],
    currentSongIndex: 0,
    currentSong: null,
    activeStems: [],
    isAudioPlaying: false,
    players: {
      1: { name: 'Player 1', score: 0, connected: false, eliminated: false },
      2: { name: 'Player 2', score: 0, connected: false, eliminated: false },
      3: { name: 'Player 3', score: 0, connected: false, eliminated: false },
    },
    buzzedPlayer: null,
    currentPrize: 0,
    visualEffect: 'none',
    message: '',
    songTitle: '',
    revealText: '',
    connections: { wall: 0, player1: false, player2: false, player3: false, host: 0 },
    anotherLevelSongConfigs: [],
    anotherLevelCurrentGroup: '',
    anotherLevelCompletedGroups: [],
    auctionOffers: [],
    auctionCurrentOffer: -1,
    auctionHighlight: null,
    auctionBids: { player1: null, player2: null },
    auctionWinner: null,
    auctionTimerValue: null,
    auctionTimerInterval: null,
    songParts: [],
    currentPartIndex: -1,
    partsTargetRow: 0,
    partsTargetSong: null,
    partsHerring1: null,
    partsHerring2: null,
    partsSongsByRow: [],
    partsScatter: [],
    partsColumnSongs: [],
    partsCurrentCol: -1,
    partsCurrentRow: 0,
    partsPassCount: 0,
    partsColumnWinners: [null, null, null, null, null],
    partsColumnForfeits: [false, false, false, false, false],
    partsLockedPlayers: [],
    partsRevealing: false,
    partsTimerInterval: null,
    // Song Showdown initial state
    showdownYearsVisible: [],
    showdownYearsReserve: [],
    showdownYearsPlayed: [],
    showdownSongsPlayed: 0,
    showdownControllerPlayer: null,
    showdownSelectedRow: 0,
    showdownStemJoinOrder: [],
    showdownTier: 0,
    showdownLockedPlayers: [],
    showdownTimerInterval: null,
    showdownTossUpResolved: false,
    // Win the Wall initial state
    wtwLineup: [],
    wtwMusicianIndex: -1,
    wtwSongIndex: 0,
    wtwSongsWon: 0,
    wtwMusiciansThisSong: 0,
    wtwSurvivor: null,
    wtwTimerInterval: null,
    wtwWalkawayOffered: null,
    wtwStartingScore: 0,
    wtwSongStartIndex: 0,
    showScoresOverlay: false,
    demoMode: false,
    demoSnapshot: null,
    config: {
      roundLineups: {},
      anotherLevelGroupSongs: {},
      partsColumnOverrides: {},
      stemOrderBySong: {},
      musicAuctionOverrides: {},
      songYearOverrides: {},
      // Song Showdown toss-up defaults to a broadly-known song not in any other round's pool.
      // Host can swap via /setup → Song Showdown tab → Toss Up picker.
      songShowdownTossUp: 'murder-on-the-dance-floor',
    },
  };
}

// ============================================
// Config-aware lookups — honour the host's setup edits, fall back to hard-coded defaults
// ============================================

// Get the ordered song list for a round, using config override if set.
export function resolveRoundLineup(state: GameState, round: RoundType): string[] {
  const override = state.config.roundLineups[round];
  if (override && override.length > 0) return override;
  // Default from hard-coded config (roundSongSets is imported where called)
  return [];
}

// Resolve the songId for an R2 group, using config override if set.
export function resolveAnotherLevelGroupSong(state: GameState, group: string, defaultSongId: string): string {
  return state.config.anotherLevelGroupSongs?.[group] ?? defaultSongId;
}

// Resolve the target + decoys for an R4 column, using config override if set.
export function resolvePartsColumn(
  state: GameState,
  col: number,
  defaults: { targetSongId: string; decoy1SongId: string; decoy2SongId: string }
): { targetSongId: string; decoy1SongId: string; decoy2SongId: string } {
  return state.config.partsColumnOverrides?.[col] ?? defaults;
}

// Config mutators — called by socket handlers
export function setRoundLineup(state: GameState, round: RoundType, songIds: string[]): void {
  state.config.roundLineups[round] = songIds;
}

export function setAnotherLevelGroupSong(state: GameState, group: string, songId: string): void {
  if (!state.config.anotherLevelGroupSongs) state.config.anotherLevelGroupSongs = {};
  state.config.anotherLevelGroupSongs[group] = songId;
}

export function setPartsColumnOverride(
  state: GameState,
  col: number,
  targetSongId: string,
  decoy1SongId: string,
  decoy2SongId: string
): void {
  if (!state.config.partsColumnOverrides) state.config.partsColumnOverrides = {};
  state.config.partsColumnOverrides[col] = { targetSongId, decoy1SongId, decoy2SongId };
}

export function setStemOrderForSong(state: GameState, songId: string, stemIds: number[]): void {
  if (!state.config.stemOrderBySong) state.config.stemOrderBySong = {};
  state.config.stemOrderBySong[songId] = stemIds;
}

export function setAuctionOverride(state: GameState, songId: string, title?: string, genre?: string): void {
  if (!state.config.musicAuctionOverrides) state.config.musicAuctionOverrides = {};
  const curr = state.config.musicAuctionOverrides[songId] ?? {};
  state.config.musicAuctionOverrides[songId] = {
    title: title !== undefined ? title : curr.title,
    genre: genre !== undefined ? genre : curr.genre,
  };
}

// Set (or clear, with null) a per-song year override. Drives Song Showdown row labels.
export function setSongYearOverride(state: GameState, songId: string, year: number | null): void {
  if (!state.config.songYearOverrides) state.config.songYearOverrides = {};
  if (year === null) delete state.config.songYearOverrides[songId];
  else state.config.songYearOverrides[songId] = year;
}

export function setShowdownLineup(state: GameState, songIds: string[]): void {
  state.config.songShowdownLineup = songIds;
}

// Set the Song Showdown toss-up song (or clear by passing '' / null).
export function setShowdownTossUp(state: GameState, songId: string | null): void {
  if (!songId) {
    state.config.songShowdownTossUp = '';
  } else {
    state.config.songShowdownTossUp = songId;
  }
}

export function setWtwLineup(state: GameState, songIds: string[]): void {
  state.config.winTheWallLineup = songIds;
}

// Set one or more WTW gate prizes. `null` clears a gate back to the default. Missing keys
// leave the existing override untouched.
export function setWtwPrizes(state: GameState, updates: { gate3?: number | null; gate5?: number | null; gate6?: number | null }): void {
  if (!state.config.winTheWallPrizes) state.config.winTheWallPrizes = {};
  const prizes = state.config.winTheWallPrizes as Record<number, number | undefined>;
  const apply = (milestone: 3 | 5 | 6, v: number | null | undefined) => {
    if (v === undefined) return;
    if (v === null) { delete prizes[milestone]; return; }
    if (!Number.isFinite(v)) return;
    prizes[milestone] = Math.max(0, Math.round(v));
  };
  apply(3, updates.gate3);
  apply(5, updates.gate5);
  apply(6, updates.gate6);
}

// Resolve the year to show for a song — config override beats the baked-in year.
export function resolveSongYear(state: GameState, song: Song): number {
  return state.config.songYearOverrides?.[song.id] ?? song.year;
}

export function resetConfig(state: GameState): void {
  state.config = {
    roundLineups: {},
    anotherLevelGroupSongs: {},
    partsColumnOverrides: {},
    stemOrderBySong: {},
    musicAuctionOverrides: {},
    songYearOverrides: {},
    songShowdownLineup: [],
    songShowdownTossUp: 'murder-on-the-dance-floor',
    winTheWallLineup: [],
    winTheWallPrizes: {},
    demoLineup: {},
  };
}

export function importConfig(state: GameState, config: GameConfig): void {
  // Preserve every field the import carries. Previously this silently dropped
  // stemOrderBySong / musicAuctionOverrides on every import, which meant a JSON
  // export+import round-trip lost data.
  state.config = {
    roundLineups: config.roundLineups ?? {},
    anotherLevelGroupSongs: config.anotherLevelGroupSongs ?? {},
    partsColumnOverrides: config.partsColumnOverrides ?? {},
    stemOrderBySong: config.stemOrderBySong ?? {},
    musicAuctionOverrides: config.musicAuctionOverrides ?? {},
    songYearOverrides: config.songYearOverrides ?? {},
    songShowdownLineup: config.songShowdownLineup ?? [],
    songShowdownTossUp: config.songShowdownTossUp ?? '',
    winTheWallLineup: config.winTheWallLineup ?? [],
    winTheWallPrizes: config.winTheWallPrizes ?? {},
    demoLineup: config.demoLineup ?? {},
  };
}

// ============================================
// WALL GRID GENERATION
// ============================================

function generateWallMusicians(state: GameState): WallMusician[] {
  // Another Level uses a prize board
  if (state.roundType === 'another-level') {
    return generateAnotherLevelWallMusicians(state);
  }

  // Song in 5 Parts uses a different grid where each row is a different song
  if (state.roundType === 'song-in-5-parts' && state.partsSongsByRow.length > 0) {
    return generatePartsWallMusicians(state);
  }

  // Music auction has its own dedicated rendering: only offer cells show instruments,
  // everything else stays empty so the wall doesn't look like a copy-paste mess.
  if (state.roundType === 'music-auction') {
    return generateAuctionWallMusicians(state);
  }

  // Song Showdown: each row is a year. Only the selected row's musicians light up.
  if (state.roundType === 'song-showdown') {
    return generateShowdownWallMusicians(state);
  }

  // Win the Wall: 15 musicians in snake order. Current cell pulses; spent cells dim.
  if (state.roundType === 'win-the-wall') {
    return generateWtwWallMusicians(state);
  }

  const musicians: WallMusician[] = [];
  const stems = state.currentSong?.stems || [];

  // Map: each column = one stem (instrument), each row = same instrument (3 "musicians" per instrument)
  const numCols = 5;
  let id = 1;

  // R1 "5 to 1": each song is assigned a single wall row. Songs 1→5 cycle rows 1→2→3→1→2.
  // Only cells in the designated row light up; the other two rows stay dim silhouettes.
  const fiveToOneRow = state.roundType === '5to1' ? (state.currentSongIndex % 3) + 1 : null;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < numCols; col++) {
      const stem = stems[col];
      // R1: stem is active only if it's in activeStems AND this cell belongs to the song's row.
      const rowMatches = fiveToOneRow == null || (row + 1) === fiveToOneRow;
      const defaultActive = stem ? (state.activeStems.includes(stem.id) && rowMatches) : false;

      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: stem?.instrument ?? '',
        icon: stem?.icon ?? '',
        color: ROW_COLORS[row][col],
        isActive: defaultActive,
        isPlaying: defaultActive && state.isAudioPlaying && !!stem,
      });
      id++;
    }
  }

  return musicians;
}

// Song Showdown: 3 rows × 5 cols. Each row represents one year; big year text overlays the row
// (WallScreen draws the label). Musician icons only light up in the selected (currently-playing)
// row as stems join — other rows stay dim but still show the musician silhouettes for depth.
function generateShowdownWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  let id = 1;
  const selectedRow = state.showdownSelectedRow;        // 1-3 or 0 if no row picked yet
  // Union of primary + extras — the host may have arranged an LV or Horns into a slot and the
  // wall cell needs to render that stem's icon/instrument, not fall back to "nothing shown".
  const allStems = state.currentSong ? [...state.currentSong.stems, ...(state.currentSong.extraStems ?? [])] : [];
  const joinOrder = state.showdownStemJoinOrder;

  for (let row = 0; row < 3; row++) {
    const rowSongId = state.showdownYearsVisible[row];
    const rowSong = rowSongId ? getSongById(rowSongId) : undefined;
    const rowIsPlaying = row + 1 === selectedRow;
    // For the selected row, map each col to the join-order stem. For unselected rows, show the
    // row song's default stems as dim silhouettes (just for visual density).
    for (let col = 0; col < 5; col++) {
      let stem = undefined as (typeof allStems)[number] | undefined;
      let isActive = false;
      if (rowIsPlaying) {
        // Light cells L→R as stems join. Col 0 = slot 1 (first to join, highest cash).
        const stemId = joinOrder[col];
        stem = stemId != null ? allStems.find(s => s.id === stemId) : undefined;
        isActive = stem ? state.activeStems.includes(stem.id) : false;
      } else if (rowSong) {
        // Unselected row: show the row's own stems dim. These never light up.
        stem = rowSong.stems[col];
      }
      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: stem?.instrument ?? '',
        icon: stem?.icon ?? '',
        // Prefer the stem's own colour when available (so extras show their bespoke
        // colour — e.g. Gav LV pink, Rose LV peach). Fall back to the row colour default.
        color: (rowIsPlaying && stem?.color) ? stem.color : ROW_COLORS[row][col],
        isActive,
        isPlaying: isActive && state.isAudioPlaying,
      });
      id++;
    }
  }
  return musicians;
}

// Win the Wall: 15 cells. Current musician (per wtwMusicianIndex) pulses; spent cells (anything
// before the current index) render faded. Upcoming cells show a dim silhouette.
function generateWtwWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  let id = 1;
  const current = state.wtwMusicianIndex;
  const songStart = state.wtwSongStartIndex;
  const song = state.currentSong;
  // Walk by [row, col] grid order; look up each cell's snake index (position in WTW_SNAKE).
  const snakeIndexOf = (r: number, c: number): number => {
    for (let i = 0; i < WTW_SNAKE.length; i++) {
      if (WTW_SNAKE[i][0] === r && WTW_SNAKE[i][1] === c) return i;
    }
    return -1;
  };

  const isGoldPhase = state.phase === 'wtw-gold';
  const isPlayingPhase = state.phase === 'wtw-playing';

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const snakeIdx = snakeIndexOf(row, col);
      const isCurrentCell = snakeIdx === current && isPlayingPhase;
      // "Lit this song" = every cell between song-start and current (inclusive) that's been
      // played during this song. Stays lit full-gold even after the current cell has moved on.
      const isInCurrentSong = snakeIdx >= songStart && snakeIdx <= current && isPlayingPhase;
      // "Spent prior songs" = cells played on an earlier song in the same round. Rendered at
      // semi-opacity so producer + audience can see which musicians are already used up.
      const isSpentPrior = snakeIdx < songStart && snakeIdx >= 0;

      // WTW is the gold round — every lit cell paints gold. Alpha hex encodes the state:
      //   full #ffd700       → currently playing this song
      //   #ffd70066 (~40%)   → spent on a prior song ("burned in")
      //   ROW_COLORS[r][c]   → upcoming (dim default)
      let color: string;
      let isActive: boolean;
      if (isGoldPhase) {
        // Jackpot: every cell full gold
        color = '#ffd700';
        isActive = true;
      } else if (isInCurrentSong) {
        color = '#ffd700';
        isActive = true;
      } else if (isSpentPrior) {
        color = '#ffd70066';    // semi-opacity gold via 8-digit hex (alpha 0x66)
        isActive = true;
      } else {
        color = ROW_COLORS[row][col];
        isActive = false;
      }

      // Cell's instrument for rendering: use the current song's primary stems, col-indexed for
      // visual continuity (so each cell always has the same instrument glyph across songs).
      const stem = song?.stems[col];

      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: stem?.instrument ?? '',
        icon: stem?.icon ?? '',
        color,
        isActive,
        // Only the CURRENT cell pulses — the other lit cells stay static gold.
        isPlaying: isCurrentCell && state.isAudioPlaying,
      });
      id++;
    }
  }
  return musicians;
}

// R3 "Music Auction": wall stays mostly empty — only the 5 offer cells (randomised across the 15
// wall positions) show an instrument + speech bubble. After bidding resolves, losing offers go
// dark and only the winning N cells stay lit & playing.
function generateAuctionWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  const offerByCell = new Map<number, typeof state.auctionOffers[number]>();
  for (const offer of state.auctionOffers) offerByCell.set(offer.cellId, offer);

  const postBidPhases: GamePhase[] = ['playing', 'buzzed', 'judging', 'result', 'wrong-other-player'];
  const isPostBid = postBidPhases.includes(state.phase);

  let id = 1;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const offer = offerByCell.get(id);
      const isCurrentOffer = state.auctionHighlight?.cellId === id;
      const offerInWinning = offer ? state.activeStems.includes(offer.stemId) : false;
      const offerVisible = !!(offer && offer.revealed && (!isPostBid || offerInWinning));
      const offerPlaying = (offer && offerInWinning && state.isAudioPlaying) || isCurrentOffer;
      const shouldShow = offerVisible || isCurrentOffer;

      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: shouldShow ? (offer?.instrument ?? '') : '',
        icon: shouldShow ? (offer?.icon ?? '') : '',
        color: shouldShow ? (offer?.color ?? ROW_COLORS[row][col]) : ROW_COLORS[row][col],
        isActive: shouldShow,
        isPlaying: !!offerPlaying,
        speechText: shouldShow && offer ? `${offer.instrument}: ${formatMoney(offer.prize)}` : undefined,
      });
      id++;
    }
  }
  return musicians;
}

function generatePartsWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  let id = 1;

  const currentCol = state.partsCurrentCol;
  const winners = state.partsColumnWinners;
  const forfeits = state.partsColumnForfeits;
  const revealing = state.partsRevealing;

  const playerColors: Record<1 | 2, string> = { 1: '#00d4ff', 2: '#ff00aa' };

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const slot = state.partsScatter.find(s => s.row === row + 1 && s.col === col);
      const song = slot ? partsCellSong(state, col, row + 1) : null;

      // This cell's instrument is dictated by its column (Vocals=0 … Drums=4).
      const instrumentName = PARTS_COL_INSTRUMENTS[col];
      const stem = song?.stems.find(s => getPartsCol(s.instrument) === col);
      const nsId = stem && slot ? partsCellStemId(col, row + 1) : -1;

      // Cell state flags
      const isCurrentlyPlaying = nsId > 0 && state.activeStems.includes(nsId);
      const colWon = winners[col] !== null;
      const colForfeited = forfeits[col];
      const isTargetRow = slot?.songIndex === 0;
      const isCurrentCol = col === currentCol;
      const winner = winners[col];

      // Light-up rules:
      //   currently-playing cell → fully lit (brightest)
      //   won column, target row → lit with winner's color
      //   forfeited column, target row → lit (revealed)
      //   everything else → dark
      let isActive: boolean;
      let color: string = ROW_COLORS[row][col];

      if (isCurrentlyPlaying) {
        isActive = true;
      } else if (colWon && isTargetRow && winner) {
        isActive = true;
        color = playerColors[winner.player];
      } else if ((colForfeited || (revealing && isCurrentCol)) && isTargetRow) {
        isActive = true; // target revealed after forfeit (current or previously forfeited cols)
      } else {
        isActive = false;
      }

      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: instrumentName,
        icon: stem ? stem.icon : (INSTRUMENT_ICONS[instrumentName.toLowerCase()] ?? ''),
        color,
        isActive: isActive && !!stem,
        isPlaying: isCurrentlyPlaying && state.isAudioPlaying && !!stem,
      });
      id++;
    }
  }

  return musicians;
}

function generateAnotherLevelWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  let id = 1;

  const onBoard = state.phase === 'another-level-board' || state.phase === 'round-intro';
  const completed = state.anotherLevelCompletedGroups;

  for (const cell of anotherLevelBoard) {
    const prizeLabel = cell.prize >= 1000 ? `$${cell.prize / 1000}k` : `$${cell.prize}`;

    // Board phase: every non-completed cell is lit so players can see their options.
    // Play/result phase: only the currently-selected group is lit.
    const isActive = onBoard
      ? !completed.includes(cell.group)
      : cell.group === state.anotherLevelCurrentGroup;

    // Wall stays as a pure prize board (money-only, no instrument icons) — that's the
    // producer-approved look from the old version. Host UI shows instruments separately.
    musicians.push({
      id,
      row: cell.row,
      col: cell.col,
      instrument: '',
      icon: '',
      color: cell.color,
      isActive,
      isPlaying: isActive && state.isAudioPlaying && !onBoard,
      label: prizeLabel,
    });
    id++;
  }

  return musicians;
}

// ============================================
// DERIVE SCREEN STATES
// ============================================

export function deriveWallState(state: GameState): WallState {
  // Current part label for Song in 5 Parts
  let currentPartLabel: string | undefined;
  if (state.roundType === 'song-in-5-parts' && state.currentPartIndex >= 0 && state.songParts[state.currentPartIndex]) {
    currentPartLabel = state.songParts[state.currentPartIndex].label;
  }

  const isAuction = state.roundType === 'music-auction';
  const auctionRevealed = state.phase !== 'auction-offers' && state.phase !== 'auction-bidding';

  return {
    phase: state.phase,
    roundType: state.roundType,
    roundName: state.roundType ? ROUND_NAMES[state.roundType] : 'WALL OF SOUND',
    songNumber: state.currentSongIndex + 1,
    totalSongs: state.roundSongs.length,
    musicians: generateWallMusicians(state),
    currentPrize: state.currentPrize,
    players: state.players,
    buzzedPlayer: state.buzzedPlayer,
    visualEffect: state.visualEffect,
    songTitle: state.songTitle,
    revealText: state.revealText || undefined,
    message: state.message,
    auctionHighlight: state.auctionHighlight,
    auctionBids: isAuction && auctionRevealed ? state.auctionBids : undefined,
    auctionWinner: isAuction && auctionRevealed ? state.auctionWinner : undefined,
    auctionTimer: isAuction ? state.auctionTimerValue : undefined,
    genre: isAuction
      ? (state.currentSong ? (state.config.musicAuctionOverrides?.[state.currentSong.id]?.genre ?? state.currentSong.genre) : undefined)
      : undefined,
    currentPartLabel,
    anotherLevelCurrentGroup: state.roundType === 'another-level' ? state.anotherLevelCurrentGroup : undefined,
    anotherLevelCompletedGroups: state.roundType === 'another-level' ? state.anotherLevelCompletedGroups : undefined,
    partsCurrentCol: state.roundType === 'song-in-5-parts' ? state.partsCurrentCol : undefined,
    partsCurrentRow: state.roundType === 'song-in-5-parts' ? state.partsCurrentRow : undefined,
    partsPassCount: state.roundType === 'song-in-5-parts' ? state.partsPassCount : undefined,
    partsColumnWinners: state.roundType === 'song-in-5-parts' ? state.partsColumnWinners : undefined,
    partsColumnForfeits: state.roundType === 'song-in-5-parts' ? state.partsColumnForfeits : undefined,
    partsLockedPlayers: state.roundType === 'song-in-5-parts' ? state.partsLockedPlayers : undefined,
    partsRevealing: state.roundType === 'song-in-5-parts' ? state.partsRevealing : undefined,
    // Song Showdown wall fields
    showdownRows: state.roundType === 'song-showdown' ? buildShowdownRows(state) : undefined,
    showdownController: state.roundType === 'song-showdown' ? state.showdownControllerPlayer : undefined,
    showdownTier: state.roundType === 'song-showdown' ? state.showdownTier : undefined,
    showdownLadder: state.roundType === 'song-showdown' ? showdownLadder(state) : undefined,
    showdownSongsPlayed: state.roundType === 'song-showdown' ? state.showdownSongsPlayed : undefined,
    showdownLockedPlayers: state.roundType === 'song-showdown' ? state.showdownLockedPlayers : undefined,
    showdownSelectedRow: state.roundType === 'song-showdown' ? state.showdownSelectedRow : undefined,
    // Win the Wall wall fields
    wtwMusicianIndex: state.roundType === 'win-the-wall' ? state.wtwMusicianIndex : undefined,
    wtwSpentMusicians: state.roundType === 'win-the-wall' ? buildWtwSpent(state) : undefined,
    wtwSongsWon: state.roundType === 'win-the-wall' ? state.wtwSongsWon : undefined,
    wtwMusiciansThisSong: state.roundType === 'win-the-wall' ? state.wtwMusiciansThisSong : undefined,
    wtwSurvivor: state.roundType === 'win-the-wall' ? state.wtwSurvivor : undefined,
    wtwCurrentOffer: state.roundType === 'win-the-wall' ? state.wtwWalkawayOffered : undefined,
    wtwStartingScore: state.roundType === 'win-the-wall' ? state.wtwStartingScore : undefined,
    wtwPrizes: state.roundType === 'win-the-wall' ? {
      gate3: resolveWtwPrize(state, 3),
      gate5: resolveWtwPrize(state, 5),
      gate6: resolveWtwPrize(state, 6),
    } : undefined,
    showScoresOverlay: state.showScoresOverlay,
    demoMode: state.demoMode,
  };
}

// Build the 3-row year label array the wall shows for Song Showdown. row index is 1-3 visually;
// yearsVisible[0] is row 1, [1] is row 2, [2] is row 3.
function buildShowdownRows(state: GameState): { row: number; year: number; songId: string; selected: boolean; done: boolean }[] {
  return state.showdownYearsVisible.map((songId, i) => {
    if (!songId) {
      return { row: i + 1, year: 0, songId: '', selected: false, done: true };
    }
    const song = getSongById(songId);
    const year = song ? (state.config.songYearOverrides?.[song.id] ?? song.year) : 0;
    return {
      row: i + 1,
      year,
      songId,
      selected: state.showdownSelectedRow === i + 1,
      done: false,
    };
  });
}

// Win the Wall: list of cell indices (0-14 snake positions) already spent. wtwMusicianIndex is the
// current one — everything before it is spent.
function buildWtwSpent(state: GameState): number[] {
  const out: number[] = [];
  for (let i = 0; i < state.wtwMusicianIndex; i++) out.push(i);
  return out;
}

export function derivePlayerState(state: GameState, playerId: PlayerId): PlayerState {
  const player = state.players[playerId];

  // Players can buzz during playing, parts-playing, wrong-other-player, and wtw-playing.
  // Eliminated players can't — keeps stale phones from disrupting the endgame.
  // Win the Wall also restricts buzz to the designated survivor.
  // Song Showdown wrong-buzz lockout is honoured via per-song locked list.
  let canBuzz =
    !player.eliminated
    && (state.phase === 'playing' || state.phase === 'parts-playing' || state.phase === 'wrong-other-player' || state.phase === 'wtw-playing' || state.phase === 'showdown-toss-up')
    && state.buzzedPlayer === null;
  // Toss-up is free-for-all — lockout list doesn't apply there.
  if (canBuzz && state.roundType === 'song-showdown' && state.phase !== 'showdown-toss-up' && state.showdownLockedPlayers.includes(playerId)) canBuzz = false;
  if (canBuzz && state.roundType === 'win-the-wall' && state.wtwSurvivor !== playerId) canBuzz = false;

  let resultMessage = '';
  if (state.phase === 'result') {
    if (state.visualEffect === 'correct' && state.buzzedPlayer === playerId) {
      resultMessage = `CORRECT! +${formatMoney(state.currentPrize)}`;
    } else if (state.visualEffect === 'wrong' && state.buzzedPlayer === playerId) {
      resultMessage = 'WRONG!';
    }
  }

  // Auction bid info — R3 is 2-player only. For player 3 (eliminated before R3),
  // all auction fields stay undefined regardless of roundType.
  const isAuction = state.roundType === 'music-auction' && (playerId === 1 || playerId === 2);
  const myKey = playerId === 1 ? 'player1' : 'player2';
  const otherKey = playerId === 1 ? 'player2' : 'player1';
  const auctionRevealed = state.phase !== 'auction-offers' && state.phase !== 'auction-bidding';

  // Build auction offers list for player display.
  // During bidding+, show ALL options so players can choose any musician count.
  // Instruments are cumulative: bid N = hear first N musicians (offers[0..N-1]).
  const showAllOffers = state.phase !== 'auction-offers';
  const filteredOffers = isAuction ? state.auctionOffers.filter(o => showAllOffers || o.revealed) : [];
  const auctionOffers = isAuction ? filteredOffers.map((o, i) => ({
    musicians: o.musicianCount,
    prize: o.prize,
    instruments: state.auctionOffers.slice(0, i + 1).map(off => off.instrument),
  })) : undefined;

  return {
    playerId,
    name: player.name,
    score: player.score,
    canBuzz,
    hasBuzzed: state.buzzedPlayer === playerId,
    otherBuzzed: state.buzzedPlayer !== null && state.buzzedPlayer !== playerId,
    phase: state.phase,
    roundName: state.roundType ? ROUND_NAMES[state.roundType] : 'WALL OF SOUND',
    songNumber: state.currentSongIndex + 1,
    totalSongs: state.roundSongs.length,
    resultMessage,
    currentPrize: state.currentPrize,
    // Auction fields
    auctionOffers,
    auctionCanBid: isAuction && state.phase === 'auction-bidding' && state.auctionBids[myKey] === null,
    auctionMyBid: isAuction ? state.auctionBids[myKey] : undefined,
    auctionOtherBid: isAuction && auctionRevealed ? state.auctionBids[otherKey] : undefined,
    auctionWinner: isAuction && auctionRevealed ? state.auctionWinner : undefined,
    auctionTimer: isAuction ? state.auctionTimerValue : undefined,
    genre: isAuction ? state.currentSong?.genre : undefined,
  };
}

export function deriveHostState(state: GameState): HostState {
  const isAuction = state.roundType === 'music-auction';
  return {
    phase: state.phase,
    roundType: state.roundType,
    roundName: state.roundType ? ROUND_NAMES[state.roundType] : 'WALL OF SOUND',
    songNumber: state.currentSongIndex + 1,
    totalSongs: state.roundSongs.length,
    currentSong: state.currentSong,
    activeStems: state.activeStems,
    totalStems: state.currentSong?.stems.length || 0,
    isAudioPlaying: state.isAudioPlaying,
    currentPrize: state.currentPrize,
    buzzedPlayer: state.buzzedPlayer,
    players: state.players,
    connections: state.connections,
    songList: state.roundSongs.map(s => ({ id: s.id, title: s.title, artist: s.artist })),
    auctionOffers: state.auctionOffers,
    auctionCurrentOffer: state.auctionCurrentOffer,
    auctionBids: isAuction ? state.auctionBids : undefined,
    auctionWinner: isAuction ? state.auctionWinner : undefined,
    auctionBothSubmitted: isAuction ? (state.auctionBids.player1 !== null && state.auctionBids.player2 !== null) : undefined,
    auctionTimer: isAuction ? state.auctionTimerValue : undefined,
    genre: isAuction ? state.currentSong?.genre : undefined,
    songParts: state.songParts,
    currentPartIndex: state.currentPartIndex,
    anotherLevelConfig: state.anotherLevelSongConfigs,
    anotherLevelCurrentGroup: state.roundType === 'another-level' ? state.anotherLevelCurrentGroup : undefined,
    anotherLevelCompletedGroups: state.roundType === 'another-level' ? state.anotherLevelCompletedGroups : undefined,
    anotherLevelPlayableGroups: state.roundType === 'another-level'
      ? state.anotherLevelSongConfigs.map(c => {
          const song = getSongById(c.songId);
          return {
            group: c.group,
            songTitle: song?.title ?? c.songId,
            songArtist: song?.artist ?? '',
            prize: c.prize,
            instruments: c.stemInstruments,
          };
        })
      : undefined,
    anotherLevelCells: state.roundType === 'another-level'
      ? anotherLevelBoard.map(cell => {
          // Derive this cell's displayed instrument from its group's stemInstruments.
          // Sort the group's cells by column (they're all on one row) and index accordingly —
          // so a 2-cell group like yellow (Drums+Bass) shows Drums then Bass left-to-right,
          // while a single-cell override like purple (Keys) shows Keys even though it's col 1.
          const cfg = state.anotherLevelSongConfigs.find(c => c.group === cell.group);
          const groupCells = anotherLevelBoard
            .filter(c => c.group === cell.group)
            .sort((a, b) => a.row - b.row || a.col - b.col);
          const idx = groupCells.findIndex(c => c.row === cell.row && c.col === cell.col);
          const instrument = (cfg?.stemInstruments[idx]) ?? AL_COL_INSTRUMENTS[cell.col] ?? '';
          return {
            row: cell.row,
            col: cell.col,
            prize: cell.prize,
            color: cell.color,
            group: cell.group,
            instrument,
            icon: INSTRUMENT_ICONS[instrument.toLowerCase()] ?? '',
          };
        })
      : undefined,
    partsTargetRow: state.partsTargetRow || undefined,
    partsTargetSongTitle: state.partsTargetSong?.title || undefined,
    partsSongs: state.partsSongsByRow.map(e => ({ title: e.song.title, artist: e.song.artist, row: e.row })),
    partsCurrentCol: state.roundType === 'song-in-5-parts' ? state.partsCurrentCol : undefined,
    partsCurrentRow: state.roundType === 'song-in-5-parts' ? state.partsCurrentRow : undefined,
    partsPassCount: state.roundType === 'song-in-5-parts' ? state.partsPassCount : undefined,
    partsColumnWinners: state.roundType === 'song-in-5-parts' ? state.partsColumnWinners : undefined,
    partsColumnForfeits: state.roundType === 'song-in-5-parts' ? state.partsColumnForfeits : undefined,
    partsLockedPlayers: state.roundType === 'song-in-5-parts' ? state.partsLockedPlayers : undefined,
    partsRevealing: state.roundType === 'song-in-5-parts' ? state.partsRevealing : undefined,
    partsScatter: state.roundType === 'song-in-5-parts' ? state.partsScatter : undefined,
    config: state.config,
    partsColumnSongs: state.roundType === 'song-in-5-parts'
      ? state.partsColumnSongs.map(c => ({
          col: c.col,
          targetTitle: c.target.title,
          targetArtist: c.target.artist,
          decoyTitles: [c.decoys[0].title, c.decoys[1].title] as [string, string],
        }))
      : undefined,
    // Song Showdown host-side summary
    showdownYearsVisible: state.roundType === 'song-showdown'
      ? state.showdownYearsVisible.map((id, i) => {
          const s = id ? getSongById(id) : undefined;
          const year = s ? (state.config.songYearOverrides?.[s.id] ?? s.year) : 0;
          return {
            songId: id,
            title: s?.title ?? '',
            artist: s?.artist ?? '',
            year,
            row: i + 1,
          };
        })
      : undefined,
    showdownYearsReserveCount: state.roundType === 'song-showdown' ? state.showdownYearsReserve.length : undefined,
    showdownController: state.roundType === 'song-showdown' ? state.showdownControllerPlayer : undefined,
    showdownSongsPlayed: state.roundType === 'song-showdown' ? state.showdownSongsPlayed : undefined,
    showdownTier: state.roundType === 'song-showdown' ? state.showdownTier : undefined,
    showdownLadder: state.roundType === 'song-showdown' ? showdownLadder(state) : undefined,
    showdownLockedPlayers: state.roundType === 'song-showdown' ? state.showdownLockedPlayers : undefined,
    showdownCurrentSongId: state.roundType === 'song-showdown' ? (state.currentSong?.id ?? null) : undefined,
    showdownSelectedRow: state.roundType === 'song-showdown' ? (state.showdownSelectedRow || null) : undefined,
    // Win the Wall host-side summary
    wtwMusicianIndex: state.roundType === 'win-the-wall' ? state.wtwMusicianIndex : undefined,
    wtwSongsWon: state.roundType === 'win-the-wall' ? state.wtwSongsWon : undefined,
    wtwMusiciansThisSong: state.roundType === 'win-the-wall' ? state.wtwMusiciansThisSong : undefined,
    wtwSurvivor: state.roundType === 'win-the-wall' ? state.wtwSurvivor : undefined,
    wtwCurrentSongId: state.roundType === 'win-the-wall' ? (state.currentSong?.id ?? null) : undefined,
    wtwJackpotIfWon: state.roundType === 'win-the-wall' ? resolveWtwPrize(state, state.wtwSongsWon + 1) : undefined,
    wtwLineupSize: state.roundType === 'win-the-wall' ? state.wtwLineup.length : undefined,
    wtwStartingScore: state.roundType === 'win-the-wall' ? state.wtwStartingScore : undefined,
    wtwPrizes: state.roundType === 'win-the-wall' ? {
      gate3: resolveWtwPrize(state, 3),
      gate5: resolveWtwPrize(state, 5),
      gate6: resolveWtwPrize(state, 6),
    } : undefined,
    showScoresOverlay: state.showScoresOverlay,
    demoMode: state.demoMode,
  };
}

// ============================================
// STATE MUTATIONS - GENERIC
// ============================================

export function selectRound(state: GameState, round: RoundType, opts: { demo?: boolean } = {}): void {
  // If we were in a demo and are leaving that round (picking a new round, not re-entering
  // the same one in demo mode), restore the pre-demo snapshot first so scores go back.
  if (state.demoMode && !opts.demo) {
    restoreDemoSnapshot(state);
  }

  // Board reset: clear all playback/visual state from previous round
  state.activeStems = [];
  state.isAudioPlaying = false;
  state.currentSong = null;
  state.visualEffect = 'none';
  state.songTitle = '';

  state.roundType = round;

  // Demo mode: capture a snapshot we can revert to at round end, and use the demo lineup
  // (shorter, optionally curated) instead of the real one. All other round mechanics are
  // unchanged — the producer experiences the full round exactly as contestants would.
  if (opts.demo) {
    // Only capture if not already in a demo (re-entering demo shouldn't re-snapshot stale state)
    if (!state.demoMode) state.demoSnapshot = captureDemoSnapshot(state);
    state.demoMode = true;
  }

  // Honour config override for the round lineup (R1 / R3); fall back to hard-coded default.
  // R1 "5 to 1" specifically plays exactly 5 songs, so the lineup is capped at 5 at runtime
  // even if the host has a longer pool saved for variety across shows.
  const demoIds = opts.demo ? resolveDemoLineup(state, round) : null;
  const overrideIds = demoIds ?? state.config.roundLineups[round];
  if (overrideIds && overrideIds.length > 0) {
    const playable = round === '5to1' ? overrideIds.slice(0, 5) : overrideIds;
    state.roundSongs = playable.map(id => getSongById(id)).filter((s): s is Song => !!s);
  } else {
    state.roundSongs = getSongsForRound(round);
  }
  state.currentSongIndex = 0;
  state.phase = 'round-intro';
  state.buzzedPlayer = null;
  state.message = '';
  state.auctionOffers = [];
  state.auctionCurrentOffer = -1;
  state.auctionHighlight = null;
  state.auctionBids = { player1: null, player2: null };
  state.auctionWinner = null;
  auctionClearTimer(state);
  state.songParts = [];
  state.currentPartIndex = -1;
  state.partsTargetRow = 0;
  state.partsTargetSong = null;
  state.partsHerring1 = null;
  state.partsHerring2 = null;
  state.partsSongsByRow = [];
  state.partsScatter = [];
  state.partsColumnSongs = [];
  partsClearTimer(state);
  state.partsCurrentCol = -1;
  state.partsCurrentRow = 0;
  state.partsPassCount = 0;
  state.partsColumnWinners = [null, null, null, null, null];
  state.partsColumnForfeits = [false, false, false, false, false];
  state.partsLockedPlayers = [];
  state.partsRevealing = false;
  state.anotherLevelSongConfigs = [];
  state.anotherLevelCurrentGroup = '';
  state.anotherLevelCompletedGroups = [];
  // Showdown + WTW reset on round change
  showdownClearTimer(state);
  state.showdownYearsVisible = [];
  state.showdownYearsReserve = [];
  state.showdownYearsPlayed = [];
  state.showdownSongsPlayed = 0;
  state.showdownControllerPlayer = null;
  state.showdownSelectedRow = 0;
  state.showdownStemJoinOrder = [];
  state.showdownTier = 0;
  state.showdownLockedPlayers = [];
  state.showdownTossUpResolved = false;
  wtwClearTimer(state);
  state.wtwLineup = [];
  state.wtwMusicianIndex = -1;
  state.wtwSongIndex = 0;
  state.wtwSongsWon = 0;
  state.wtwMusiciansThisSong = 0;
  state.wtwSurvivor = null;
  state.wtwWalkawayOffered = null;
  state.wtwStartingScore = 0;
  state.wtwSongStartIndex = 0;

  // Round-specific setup
  if (round === 'another-level') {
    // Apply config overrides per group (host may have picked different songs via /setup)
    state.anotherLevelSongConfigs = anotherLevelSongs.map(cfg => ({
      ...cfg,
      songId: state.config.anotherLevelGroupSongs?.[cfg.group] ?? cfg.songId,
    }));
    // Start on the board — host picks which group to play next.
    state.phase = 'another-level-board';
  }

  // For song-in-5-parts, roundSongs drives song count (1 entry per question)
  if (round === 'song-in-5-parts') {
    // Use the target songs from partsQuestions as the song list
    state.roundSongs = partsQuestions
      .map(q => getSongById(q.targetSongId))
      .filter((s): s is Song => !!s);
  }

  // Song Showdown: split the lineup into visible (3) + reserve. Pick a random controller from
  // non-eliminated players — producer confirmed the initial year is essentially random, then the
  // game proceeds normally from there.
  if (round === 'song-showdown') {
    // Demo mode uses the short demo lineup (3 songs → 3 visible, 0 reserve), real round
    // uses the full lineup (6+ songs → 3 visible + 3+ reserve).
    const pool = opts.demo ? (demoIds ?? resolveShowdownLineup(state)) : resolveShowdownLineup(state);
    // Demo relaxes the 6-song minimum — 3 is fine for a walkthrough.
    const minSongs = opts.demo ? 3 : 6;
    if (pool.length < minSongs) {
      // Not enough songs — stay on round-intro so host sees the error; the UI disables start.
      state.roundSongs = [];
      state.phase = 'round-intro';
    } else {
      state.roundSongs = pool.map(id => getSongById(id)).filter((s): s is Song => !!s);
      state.showdownYearsVisible = pool.slice(0, 3);
      state.showdownYearsReserve = pool.slice(3);
      state.showdownYearsPlayed = [];
      state.showdownSongsPlayed = 0;
      state.showdownLockedPlayers = [];
      state.showdownControllerPlayer = null;
      state.showdownTossUpResolved = false;

      // If a toss-up song is configured (and we're not in demo mode), start there. Toss-up is
      // a fixed-$1k free-for-all preamble played BEFORE the 6 main songs. Winner banks $1k and
      // becomes controller of the first year pick. Skipping / no-one-buzzes-correctly → random
      // controller at year-pick, no award. Demo rounds skip toss-up entirely (they're short).
      const tossUpId = opts.demo ? null : state.config.songShowdownTossUp;
      const tossUpSong = tossUpId ? getSongById(tossUpId) : null;
      if (tossUpSong) {
        state.currentSong = tossUpSong;
        state.showdownSelectedRow = 2;   // middle row lights during toss-up for visual
        state.showdownStemJoinOrder = resolveShowdownStemOrder(state, tossUpSong);
        state.showdownTier = 0;
        state.activeStems = state.showdownStemJoinOrder.slice(0, 1);
        state.currentPrize = 1000;       // fixed, no ladder
        state.phase = 'showdown-toss-up';
      } else {
        state.showdownTossUpResolved = true;   // no toss-up to play
        state.showdownControllerPlayer = pickRandomActivePlayer(state);
        state.phase = 'showdown-year-pick';
      }
    }
  }

  // Win the Wall: resolve lineup, default survivor to the highest-scoring non-eliminated player.
  // Host can override via host:wtw-set-survivor before starting.
  if (round === 'win-the-wall') {
    // Demo mode uses a shorter lineup; the 6-songs-to-jackpot rule still applies so the
    // producer should curate a demo lineup that actually clears in 3 (or accept it'll bust).
    const pool = opts.demo ? (demoIds ?? resolveWtwLineup(state)) : resolveWtwLineup(state);
    state.wtwLineup = pool.map(id => getSongById(id)).filter((s): s is Song => !!s);
    state.wtwMusicianIndex = -1;
    state.wtwSongIndex = 0;
    state.wtwSongsWon = 0;
    state.wtwMusiciansThisSong = 0;
    state.wtwSurvivor = pickWtwSurvivor(state);
    // Snapshot the survivor's banked total so bust messaging can show "walk with $X".
    state.wtwStartingScore = state.wtwSurvivor ? state.players[state.wtwSurvivor].score : 0;
    state.wtwWalkawayOffered = null;
    state.roundSongs = state.wtwLineup;
    state.phase = 'round-intro';
  }

  if (state.roundSongs.length > 0 && round !== 'another-level' && round !== 'song-showdown' && round !== 'win-the-wall') {
    loadSong(state, 0);
  }
}

// ============================================
// ANOTHER LEVEL — Round specific (new flow)
// ============================================

// Host picks a group from the board — load that song and pre-activate its stems.
// Returns the stem IDs that should be faded in.
export function anotherLevelSelectGroup(state: GameState, group: string): { stemIds: number[] } {
  if (state.roundType !== 'another-level') return { stemIds: [] };
  const cfg = state.anotherLevelSongConfigs.find(c => c.group === group);
  if (!cfg) return { stemIds: [] };
  const song = getSongById(cfg.songId);
  if (!song) return { stemIds: [] };

  state.currentSong = song;
  state.anotherLevelCurrentGroup = group;
  state.currentPrize = cfg.prize;
  state.activeStems = song.stems
    .filter(s => cfg.stemInstruments.includes(s.instrument))
    .map(s => s.id);
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.songTitle = '';
  state.isAudioPlaying = false;
  state.phase = 'playing';

  return { stemIds: state.activeStems };
}

// Host returns to the board — mark the just-played group complete (won or lost),
// clear playback state, and re-show the board with completed groups darkened.
export function anotherLevelBackToBoard(state: GameState): void {
  if (state.roundType !== 'another-level') return;
  const group = state.anotherLevelCurrentGroup;
  if (group && !state.anotherLevelCompletedGroups.includes(group)) {
    state.anotherLevelCompletedGroups.push(group);
  }
  state.anotherLevelCurrentGroup = '';
  state.currentSong = null;
  state.activeStems = [];
  state.currentPrize = 0;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.songTitle = '';
  state.isAudioPlaying = false;

  // If all playable groups are done, end the round. Otherwise back to the board.
  const playableGroups = state.anotherLevelSongConfigs.map(c => c.group);
  const allDone = playableGroups.every(g => state.anotherLevelCompletedGroups.includes(g));
  state.phase = allDone ? 'round-complete' : 'another-level-board';
}

export function loadSong(state: GameState, index: number): void {
  if (index >= state.roundSongs.length) return;

  state.currentSongIndex = index;
  state.currentSong = state.roundSongs[index];
  state.activeStems = [];
  state.isAudioPlaying = false;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.songTitle = '';
  state.revealText = '';
  state.auctionHighlight = null;

  // Round-specific song setup
  switch (state.roundType) {
    case '5to1': {
      // "Less is More" progression: song 1 plays 5 stems simultaneously ($3k), song 5
      // plays just 1 ($10k). Fewer instruments = harder to recognise = more money.
      state.currentPrize = roundPrizes['5to1'][index] || 3000;
      const instrumentCount = Math.max(1, 5 - index);
      if (state.currentSong) {
        // Honour host's per-song stem-order arrangement. Look up stems across primary AND
        // extras so the host can arrange e.g. LV_GAV or HORNS into a slot. Falls back to
        // the song's default 5 primary stems if no arrangement is set.
        const allStems = [...state.currentSong.stems, ...(state.currentSong.extraStems ?? [])];
        const override = state.config.stemOrderBySong?.[state.currentSong.id];
        const orderedStems = override && override.length > 0
          ? override.map(id => allStems.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s)
          : state.currentSong.stems;
        state.activeStems = orderedStems.slice(0, instrumentCount).map(s => s.id);
      }
      state.phase = 'playing';
      break;
    }

    case 'another-level': {
      // In the new R2 flow, songs are chosen via anotherLevelSelectGroup (not by index).
      // If something still calls loadSong here (e.g. a stale host:load-song event),
      // just stay on the board rather than advance indexes.
      state.phase = 'another-level-board';
      break;
    }

    case 'music-auction':
      state.currentPrize = 0;
      setupAuctionOffers(state);
      state.auctionBids = { player1: null, player2: null };
      state.auctionWinner = null;
      auctionClearTimer(state);
      state.phase = 'auction-offers';
      break;

    case 'song-in-5-parts': {
      // NEW model: each of 5 columns is its own mini-game with its own target + 2 decoys.
      // Build partsColumnSongs from the 5-entry partsColumnQuestions config.
      const colSongs = partsColumnQuestions
        .map(q => {
          const override = state.config.partsColumnOverrides?.[q.col];
          const targetId = override?.targetSongId ?? q.targetSongId;
          const d1Id = override?.decoy1SongId ?? q.decoySongIds[0];
          const d2Id = override?.decoy2SongId ?? q.decoySongIds[1];
          const target = getSongById(targetId);
          const d1 = getSongById(d1Id);
          const d2 = getSongById(d2Id);
          if (!target || !d1 || !d2) return null;
          return { col: q.col, target, decoys: [d1, d2] as [Song, Song] };
        })
        .filter((x): x is { col: number; target: Song; decoys: [Song, Song] } => !!x);
      state.partsColumnSongs = colSongs;
      // Legacy: keep partsSongsByRow populated for the HostScreen's "songs in round" list.
      // Use the 5 column targets so producers can see what players are hunting.
      state.partsSongsByRow = colSongs.map((c, i) => ({ row: i + 1, song: c.target }));
      state.partsTargetSong = colSongs[0]?.target ?? null;
      state.partsHerring1 = null;
      state.partsHerring2 = null;
      state.currentSong = colSongs[0]?.target ?? null;
      state.partsTargetRow = 0; // unused in new model (each col has its own target row)
      state.songTitle = ''; // no single target to announce — each column has its own
      state.currentPrize = 0;
      setupSongParts(state);
      state.phase = 'parts-intro';
      break;
    }

    default:
      state.currentPrize = 1000;
      state.phase = 'playing';
  }
}

export function addMusician(state: GameState): number | null {
  if (!state.currentSong) return null;
  const allStemIds = state.currentSong.stems.map(s => s.id);
  const nextStem = allStemIds.find(id => !state.activeStems.includes(id));
  if (nextStem !== undefined) {
    state.activeStems.push(nextStem);
    return nextStem;
  }
  return null;
}

export function setStem(state: GameState, stemId: number, active: boolean): void {
  if (active && !state.activeStems.includes(stemId)) {
    state.activeStems.push(stemId);
  } else if (!active) {
    state.activeStems = state.activeStems.filter(id => id !== stemId);
  }
}

// One-click "reveal the song" — writes the current song's title + artist to state.revealText
// so the wall overlays it for everyone. No-op if no song is loaded.
// R3: honour per-song title override (host can curate what the audience reads).
export function revealSong(state: GameState): void {
  if (!state.currentSong) return;
  const override = state.config.musicAuctionOverrides?.[state.currentSong.id];
  const title = (state.roundType === 'music-auction' && override?.title) || state.currentSong.title;
  state.revealText = `${title} — ${state.currentSong.artist}`;
}

export function revealAll(state: GameState): number[] {
  if (!state.currentSong) return [];
  const newStems: number[] = [];
  for (const stem of state.currentSong.stems) {
    if (!state.activeStems.includes(stem.id)) {
      state.activeStems.push(stem.id);
      newStems.push(stem.id);
    }
  }
  return newStems;
}

export function playerBuzz(state: GameState, playerId: PlayerId): boolean {
  const buzzablePhases: GamePhase[] = ['playing', 'parts-playing', 'wrong-other-player', 'wtw-playing', 'showdown-toss-up'];
  if (!buzzablePhases.includes(state.phase) || state.buzzedPlayer !== null) return false;
  // Eliminated players can't buzz at all.
  if (state.players[playerId]?.eliminated) return false;
  // R3 Music Auction + R4 Song in 5 Parts are strictly 2-player. Player 3 can't buzz regardless
  // of their eliminated flag — belt-and-braces so a forgotten-to-eliminate P3 can't deadlock
  // those rounds' 2-player scoring code (which is typed 1|2 throughout).
  if ((state.roundType === 'music-auction' || state.roundType === 'song-in-5-parts') && playerId === 3) return false;
  // R4: player locked out for the current column can't buzz
  if (state.roundType === 'song-in-5-parts' && (playerId === 1 || playerId === 2) && state.partsLockedPlayers.includes(playerId)) return false;
  // Song Showdown: wrong-buzz lockout applies per song — BUT not during toss-up (free-for-all).
  if (state.roundType === 'song-showdown' && state.phase !== 'showdown-toss-up' && state.showdownLockedPlayers.includes(playerId)) return false;
  // Win the Wall: only the survivor can buzz
  if (state.roundType === 'win-the-wall' && state.wtwSurvivor !== playerId) return false;

  // Stop auto-advance timers for any round that runs one
  if (state.roundType === 'song-in-5-parts') partsClearTimer(state);
  if (state.roundType === 'song-showdown') showdownClearTimer(state);
  if (state.roundType === 'win-the-wall') wtwClearTimer(state);

  state.buzzedPlayer = playerId;
  state.phase = 'buzzed';
  state.visualEffect = 'buzz';
  state.isAudioPlaying = false;
  return true;
}

export function markCorrect(state: GameState): void {
  if (!state.buzzedPlayer) return;
  // R4 has per-column scoring + column-advance logic — partsMarkCorrect handles score + message there
  if (state.roundType === 'song-in-5-parts') {
    partsMarkCorrect(state);
    return;
  }
  // Song Showdown: dedicated handler awards tier prize + sets new controller
  if (state.roundType === 'song-showdown') {
    showdownMarkCorrect(state);
    return;
  }
  // Win the Wall: song counts, may hit gate or jackpot
  if (state.roundType === 'win-the-wall') {
    wtwMarkCorrect(state);
    return;
  }
  state.players[state.buzzedPlayer].score += state.currentPrize;
  state.phase = 'result';
  state.visualEffect = 'correct';
  state.message = `CORRECT! ${formatMoney(state.currentPrize)}`;
  auctionClearTimer(state);
}

export function markWrong(state: GameState): void {
  // R4: lock buzzer for the column, resume playing — handled in partsMarkWrong
  if (state.roundType === 'song-in-5-parts') {
    partsMarkWrong(state);
    return;
  }
  // Song Showdown: lock buzzer out of this song, resume ticker
  if (state.roundType === 'song-showdown') {
    showdownMarkWrong(state);
    return;
  }
  // Win the Wall: resume, no penalty
  if (state.roundType === 'win-the-wall') {
    wtwMarkWrong(state);
    return;
  }
  state.phase = 'result';
  state.visualEffect = 'wrong';
  state.message = 'WRONG!';
  auctionClearTimer(state);
}

export function giveToOtherPlayer(state: GameState): void {
  const originalBuzzer = state.buzzedPlayer;
  const otherPlayer = originalBuzzer === 1 ? 2 : 1;
  state.phase = 'wrong-other-player';
  state.visualEffect = 'none';
  state.message = `${state.players[otherPlayer].name} gets a chance!`;
  // Reset buzz so other player can buzz
  state.buzzedPlayer = null;

  // In auction, other player hears ALL 5 auction stems (now drawn from the randomised offers).
  if (state.roundType === 'music-auction') {
    if (state.auctionOffers.length > 0) {
      state.activeStems = state.auctionOffers.map(o => o.stemId);
    } else if (state.currentSong) {
      state.activeStems = state.currentSong.stems.map(s => s.id);
    }
    auctionClearTimer(state);
  }
}

export function nextSong(state: GameState): boolean {
  const nextIndex = state.currentSongIndex + 1;
  if (nextIndex >= state.roundSongs.length) {
    state.phase = 'round-complete';
    return false;
  }
  loadSong(state, nextIndex);
  return true;
}

export function adjustScore(state: GameState, player: PlayerId, delta: number): void {
  state.players[player].score += delta;
}

// Hard-set a player's score to an exact value. Unlike adjustScore (which is +/- delta),
// this replaces the total — useful for mid-show corrections and loading carry-over scores.
export function setScore(state: GameState, player: PlayerId, amount: number): void {
  if (!Number.isFinite(amount)) return;
  state.players[player].score = Math.round(amount);
}

// Show / hide the scores overlay on the wall. Host-triggered narrative pause.
export function setScoresOverlay(state: GameState, show: boolean): void {
  state.showScoresOverlay = show;
}

// ============================================
// DEMO MODE helpers
// ============================================
// Demo rounds play exactly like the real thing but are reverted at round end — scores,
// eliminated flags, and any timers come back to what they were before the demo started.
// Used by producers to walk contestants through a round's mechanics without committing to
// any real money movement.

// Snapshot the player state we'll restore at demo end.
function captureDemoSnapshot(state: GameState): GameState['demoSnapshot'] {
  return {
    players: {
      1: { ...state.players[1] },
      2: { ...state.players[2] },
      3: { ...state.players[3] },
    },
  };
}

// Roll scores + eliminated flags back to whatever was captured when the demo started.
// No-op if no snapshot exists. Always clears demoMode.
export function restoreDemoSnapshot(state: GameState): void {
  if (state.demoSnapshot) {
    state.players[1] = state.demoSnapshot.players[1];
    state.players[2] = state.demoSnapshot.players[2];
    state.players[3] = state.demoSnapshot.players[3];
  }
  state.demoSnapshot = null;
  state.demoMode = false;
}

// Return a demo lineup for the given round if one is available, else null.
// Priority: config.demoLineup[round] ⇒ first 3 of the real lineup ⇒ null if nothing resolves.
export function resolveDemoLineup(state: GameState, round: RoundType): string[] | null {
  const override = state.config.demoLineup?.[round];
  if (override && override.length > 0) return override;
  // Fallback: slice the first 3 songs off the regular lineup for this round.
  const regular = state.config.roundLineups[round];
  if (regular && regular.length >= 3) return regular.slice(0, 3);
  if (round === 'song-showdown') {
    const p = resolveShowdownLineup(state);
    if (p.length >= 3) return p.slice(0, 3);
  }
  if (round === 'win-the-wall') {
    const p = resolveWtwLineup(state);
    if (p.length >= 3) return p.slice(0, 3);
  }
  const fallback = roundSongSets[round];
  if (fallback && fallback.length >= 3) return fallback.slice(0, 3);
  return null;
}

// Config mutator for per-round demo lineups
export function setDemoLineup(state: GameState, round: RoundType, songIds: string[]): void {
  if (!state.config.demoLineup) state.config.demoLineup = {};
  state.config.demoLineup[round] = songIds;
}

export function setPlayerName(state: GameState, player: PlayerId, name: string): void {
  state.players[player].name = name;
}

// Manual eliminate toggle. Used when:
//  - Song Showdown ends in a tie (auto-eliminate skips ties, host picks the loser)
//  - Host wants to skip Showdown entirely and start mid-show with 2 players
//  - Producer needs to mark someone out between takes
export function setPlayerEliminated(state: GameState, player: PlayerId, eliminated: boolean): void {
  state.players[player].eliminated = eliminated;
  // If a currently-buzzed player gets eliminated, clear their buzz so play can continue.
  if (eliminated && state.buzzedPlayer === player) {
    state.buzzedPlayer = null;
  }
  // If the Win the Wall survivor gets eliminated, unassign them so host must re-pick.
  if (eliminated && state.roundType === 'win-the-wall' && state.wtwSurvivor === player) {
    state.wtwSurvivor = null;
  }
  // If the Song Showdown controller gets eliminated mid-round, punt to another active player
  // so the game doesn't stall.
  if (eliminated && state.roundType === 'song-showdown' && state.showdownControllerPlayer === player) {
    state.showdownControllerPlayer = pickRandomActivePlayer(state);
  }
}

export function endRound(state: GameState): void {
  state.phase = 'round-complete';
  state.isAudioPlaying = false;
}

export function resetGame(state: GameState): void {
  // Kill any running timers FIRST so orphaned intervals don't tick against the fresh state
  auctionClearTimer(state);
  partsClearTimer(state);
  showdownClearTimer(state);
  wtwClearTimer(state);
  const fresh = createInitialState();
  fresh.connections = state.connections;
  fresh.players[1].name = state.players[1].name;
  fresh.players[2].name = state.players[2].name;
  fresh.players[3].name = state.players[3].name;
  fresh.players[1].connected = state.players[1].connected;
  fresh.players[2].connected = state.players[2].connected;
  fresh.players[3].connected = state.players[3].connected;
  // Carry over the mutable setup config — reset is a game reset, not a config wipe
  // (host uses the explicit "Reset Config" button for that).
  fresh.config = state.config;
  Object.assign(state, fresh);
}

export function backToLobby(state: GameState): void {
  auctionClearTimer(state);
  partsClearTimer(state);
  showdownClearTimer(state);
  wtwClearTimer(state);
  // If a demo round was running, revert scores + eliminations before returning to lobby.
  if (state.demoMode) restoreDemoSnapshot(state);
  state.phase = 'lobby';
  state.roundType = null;
  state.roundSongs = [];
  state.currentSong = null;
  state.currentSongIndex = 0;
  state.activeStems = [];
  state.isAudioPlaying = false;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.songTitle = '';
  state.auctionOffers = [];
  state.auctionCurrentOffer = -1;
  state.auctionHighlight = null;
  state.auctionBids = { player1: null, player2: null };
  state.auctionWinner = null;
  state.songParts = [];
  state.currentPartIndex = -1;
  state.partsTargetRow = 0;
  state.partsTargetSong = null;
  state.partsHerring1 = null;
  state.partsHerring2 = null;
  state.partsSongsByRow = [];
  state.partsScatter = [];
  state.partsColumnSongs = [];
  partsClearTimer(state);
  state.partsCurrentCol = -1;
  state.partsCurrentRow = 0;
  state.partsPassCount = 0;
  state.partsColumnWinners = [null, null, null, null, null];
  state.partsColumnForfeits = [false, false, false, false, false];
  state.partsLockedPlayers = [];
  state.partsRevealing = false;
  state.anotherLevelSongConfigs = [];
  state.anotherLevelCurrentGroup = '';
  state.anotherLevelCompletedGroups = [];
}

// ============================================
// MUSIC AUCTION - Round specific
// ============================================

// Fisher–Yates shuffle (pure; caller passes their own array)
function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function setupAuctionOffers(state: GameState): void {
  if (!state.currentSong) return;
  const song = state.currentSong;

  // Musician count -> prize ladder. 1 musician = $15k, 2 = $6k, 3 = $3k, 4 = $2k, 5 = $1k.
  const prizeLadder = [15000, 6000, 3000, 2000, 1000];

  // Full available stem pool (skip "clue" — it's a lyric hint, not a musician).
  const primaryStems = song.stems;
  const extras = (song.extraStems ?? []).filter(s => s.instrument !== 'Clue');
  const allStems = [...primaryStems, ...extras];
  const allById = new Map(allStems.map(s => [s.id, s]));

  let finalStems: Stem[];

  // PRIORITY: if the host has set a stem arrangement for this song via /setup,
  // use it verbatim. Slot 1 → offer #1 ($15k / 1 musician), slot 2 → offer #2, etc.
  const override = state.config.stemOrderBySong?.[song.id];
  if (override && override.length > 0) {
    const orderedStems: Stem[] = [];
    for (const id of override) {
      const stem = allById.get(id);
      if (stem) orderedStems.push(stem);
      if (orderedStems.length === 5) break;
    }
    // Pad from primary stems if arrangement was short
    for (const s of primaryStems) {
      if (orderedStems.length >= 5) break;
      if (!orderedStems.some(p => p.id === s.id)) orderedStems.push(s);
    }
    finalStems = orderedStems.slice(0, 5);
  } else {
    // Fallback: randomised selection with "at most one vocal" rule
    const isVocal = (instrument: string) => instrument.toLowerCase().includes('vocal');
    const vocalPool = allStems.filter(s => isVocal(s.instrument));
    const instrumentalPool = allStems.filter(s => !isVocal(s.instrument));
    const pickedStems: Stem[] = [];
    if (vocalPool.length > 0) pickedStems.push(shuffled(vocalPool)[0]);
    pickedStems.push(...shuffled(instrumentalPool).slice(0, 5 - pickedStems.length));
    let finalPicks = shuffled(pickedStems);
    while (finalPicks.length < 5 && instrumentalPool.length > 0) {
      finalPicks.push(instrumentalPool[finalPicks.length % instrumentalPool.length]);
    }
    finalStems = finalPicks.slice(0, 5);
  }

  // Pick 5 distinct wall cells (1..15) for these offers — spread across the whole grid.
  const cellIds = shuffled(Array.from({ length: 15 }, (_, i) => i + 1)).slice(0, 5);

  state.auctionOffers = finalStems.map((stem, i) => ({
    stemId: stem.id,
    instrument: stem.instrument,
    icon: stem.icon,
    color: stem.color,
    musicianCount: i + 1,
    prize: prizeLadder[i] || 1000,
    revealed: false,
    cellId: cellIds[i],
  }));

  state.auctionCurrentOffer = -1;
  state.auctionHighlight = null;
}

export function auctionNextOffer(state: GameState): void {
  state.auctionCurrentOffer++;
  const offer = state.auctionOffers[state.auctionCurrentOffer];
  if (!offer) return;

  offer.revealed = true;

  state.auctionHighlight = {
    cellId: offer.cellId,
    offerText: `${formatMoney(offer.prize)}`,
  };

  // Running message: 1st offer = "just me"; later = "add me"
  state.message = offer.musicianCount === 1
    ? `${offer.instrument}: "Play it with just me for ${formatMoney(offer.prize)}!"`
    : `${offer.instrument}: "Add me and hear ${offer.musicianCount} musicians for ${formatMoney(offer.prize)}!"`;
}

export function auctionStartBidding(state: GameState): void {
  state.phase = 'auction-bidding';
  state.auctionBids = { player1: null, player2: null };
  state.auctionWinner = null;
  state.auctionHighlight = null;
  state.message = 'Players are bidding...';
}

export function auctionPlayerBid(state: GameState, playerId: 1 | 2, musicianCount: number): boolean {
  const key = playerId === 1 ? 'player1' : 'player2';
  state.auctionBids[key] = musicianCount;
  // Return true if both bids are submitted
  return state.auctionBids.player1 !== null && state.auctionBids.player2 !== null;
}

export function auctionRevealBids(state: GameState): { winner: 1 | 2 | 'tied'; musicianCount: number } {
  const bid1 = state.auctionBids.player1!;
  const bid2 = state.auctionBids.player2!;

  let winner: 1 | 2 | 'tied';
  let winnerBid: number;

  if (bid1 < bid2) {
    winner = 1;
    winnerBid = bid1;
  } else if (bid2 < bid1) {
    winner = 2;
    winnerBid = bid2;
  } else {
    winner = 'tied';
    winnerBid = bid1; // same
  }

  state.auctionWinner = winner;
  // Stay on auction-reveal phase — wall shows both bids + winner. Host presses "PLAY MUSIC"
  // to transition into 'playing'. This gives a clear beat between bid reveal and audio.
  state.phase = 'auction-reveal';
  state.auctionHighlight = null;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.isAudioPlaying = false;

  // Set prize based on winner's bid: fewer musicians = higher prize
  const prizes = roundPrizes['music-auction'];
  // prizes[0] = 1 musician prize ($15k), prizes[4] = 5 musicians ($1k)
  state.currentPrize = prizes[winnerBid - 1] || 1000;

  // Activate the winning stems from the randomised offers (cumulative: winnerBid = 2 -> offers[0..1]).
  // Falls back to song.stems slice if offers weren't set up (shouldn't happen).
  if (state.auctionOffers.length > 0) {
    state.activeStems = state.auctionOffers.slice(0, winnerBid).map(o => o.stemId);
  } else if (state.currentSong) {
    state.activeStems = state.currentSong.stems.slice(0, winnerBid).map(s => s.id);
  }

  if (winner === 'tied') {
    state.message = `TIE! Both chose ${winnerBid} musician${winnerBid > 1 ? 's' : ''} — BUZZ RACE!`;
  } else {
    state.message = `${state.players[winner].name} wins with ${winnerBid} musician${winnerBid > 1 ? 's' : ''}!`;
  }

  return { winner, musicianCount: winnerBid };
}

// Host-driven transition from 'auction-reveal' into actual music playback.
// Returns the stem IDs that should be faded in by the caller.
export function auctionStartMusic(state: GameState): number[] {
  if (state.roundType !== 'music-auction') return [];
  state.phase = 'playing';
  state.isAudioPlaying = true;
  state.buzzedPlayer = null;
  return [...state.activeStems];
}

export function auctionClearTimer(state: GameState): void {
  if (state.auctionTimerInterval) {
    clearInterval(state.auctionTimerInterval);
    state.auctionTimerInterval = null;
  }
  state.auctionTimerValue = null;
}

// ============================================
// SONG IN 5 PARTS - Round specific
// ============================================

// R4 "Song in 5 Parts" column order — Vocals on the FAR LEFT so they're revealed first (producer note).
// Columns L→R: Vocals / Guitar / Keys / Bass / Drums.
const PARTS_COL_INSTRUMENTS = ['Vocals', 'Guitar', 'Keys', 'Bass', 'Drums'] as const;

// Map instrument name → R4 column index (0-4). Uses 'includes' so "Backing Vocals" still maps to Vocals.
function getPartsCol(instrument: string): number {
  const lower = instrument.toLowerCase();
  if (lower.includes('vocal')) return 0;
  if (lower.includes('guitar')) return 1;
  if (lower.includes('key') || lower.includes('piano')) return 2;
  if (lower.includes('bass')) return 3;
  if (lower.includes('drum')) return 4;
  return -1;
}

// Old name kept for generatePartsWallMusicians callers — delegates to the new map.
function getInstrumentCol(instrument: string): number {
  return getPartsCol(instrument);
}

// Namespace stem IDs per row: row 1 = 101+, row 2 = 201+, row 3 = 301+
export function namespaceStemId(row: number, stemId: number): number {
  return row * 100 + stemId;
}

// Build the scattered wall for R4 under the new per-column-target model.
// songIndex 0 = this column's target, 1/2 = this column's decoys.
// Constraint: no two adjacent columns can have the target on the same row (keeps the
// wall from showing the target "middle-middle-middle" runs the producer complained about).
function buildPartsScatter(): { row: number; col: number; songIndex: 0 | 1 | 2 }[] {
  // Pick target row per column with no-adjacent-match rule
  const targetRows: number[] = [];
  for (let col = 0; col < 5; col++) {
    const banned = col === 0 ? new Set<number>() : new Set([targetRows[col - 1]]);
    const options = [1, 2, 3].filter(r => !banned.has(r));
    targetRows.push(options[Math.floor(Math.random() * options.length)]);
  }
  const entries: { row: number; col: number; songIndex: 0 | 1 | 2 }[] = [];
  for (let col = 0; col < 5; col++) {
    const targetRow = targetRows[col];
    const decoyRows = shuffled([1, 2, 3].filter(r => r !== targetRow));
    entries.push({ row: targetRow, col, songIndex: 0 }); // target
    entries.push({ row: decoyRows[0], col, songIndex: 1 }); // decoy 1
    entries.push({ row: decoyRows[1], col, songIndex: 2 }); // decoy 2
  }
  return entries;
}

function setupSongParts(state: GameState): void {
  if (state.partsSongsByRow.length === 0) return;

  state.partsScatter = buildPartsScatter();

  const parts: SongPart[] = [];
  // Play order: col 0 first (Vocals) → col 4 last (Drums). Within a column, walk rows 1→3.
  for (let col = 0; col < 5; col++) {
    for (let row = 1; row <= 3; row++) {
      const slot = state.partsScatter.find(s => s.row === row && s.col === col);
      if (!slot) continue;

      const songEntry = state.partsSongsByRow[slot.songIndex];
      if (!songEntry) continue;
      const song = songEntry.song;

      // Find the stem on this song whose instrument matches this R4 column
      const stem = song.stems.find(s => getPartsCol(s.instrument) === col);
      if (!stem) continue;

      // Namespace by songIndex+1 so 3 songs × 5 stems = 15 uniquely-ID'd audio tracks.
      // Same wire format as the existing per-row namespacing.
      const nsId = namespaceStemId(slot.songIndex + 1, stem.id);
      parts.push({
        partIndex: parts.length,
        label: `${PARTS_COL_INSTRUMENTS[col]} — ${song.title}`,
        stemIds: [nsId],
        row,
        col,
        isPlayed: false,
        isCurrent: false,
      });
    }
  }

  state.songParts = parts;
  state.currentPartIndex = -1;
  state.activeStems = [];
}

export function partsNext(state: GameState): { fadeOut: number[]; fadeIn: number[] } {
  const prevPart = state.currentPartIndex >= 0 ? state.songParts[state.currentPartIndex] : null;

  // Mark current as played
  if (prevPart) {
    prevPart.isCurrent = false;
    prevPart.isPlayed = true;
  }

  state.currentPartIndex++;

  if (state.currentPartIndex >= state.songParts.length) {
    state.message = 'All parts played!';
    return { fadeOut: [], fadeIn: [] };
  }

  const part = state.songParts[state.currentPartIndex];
  part.isCurrent = true;

  const fadeOut: number[] = [];

  // When moving to a different COLUMN (new instrument), fade out all stems from the previous column.
  // Within a column, stems layer up so players hear all 3 songs' vocals (or guitars, etc.) mixed.
  if (prevPart && prevPart.col !== part.col) {
    const oldColStems = state.songParts
      .filter(p => p.col === prevPart.col && p.isPlayed)
      .flatMap(p => p.stemIds);
    for (const stemId of oldColStems) {
      state.activeStems = state.activeStems.filter(id => id !== stemId);
      fadeOut.push(stemId);
    }
  }

  // Add new stem(s) for this cell
  const fadeIn: number[] = [];
  for (const stemId of part.stemIds) {
    if (!state.activeStems.includes(stemId)) {
      state.activeStems.push(stemId);
      fadeIn.push(stemId);
    }
  }

  state.phase = 'parts-playing';
  state.buzzedPlayer = null;
  state.message = part.label;
  return { fadeOut, fadeIn };
}

export function partsPlayCurrent(state: GameState): void {
  // Start audio for the current part
  state.isAudioPlaying = true;
  state.phase = 'parts-playing';
}

// ============================================
// R4 "Song in 5 Parts" — column-hunt mechanic (boss's design)
// ============================================

export function partsClearTimer(state: GameState): void {
  if (state.partsTimerInterval) {
    clearInterval(state.partsTimerInterval);
    state.partsTimerInterval = null;
  }
}

// Look up the song object a given cell represents, based on its column's target/decoys.
export function partsCellSong(state: GameState, col: number, row: number): Song | null {
  const slot = state.partsScatter.find(s => s.col === col && s.row === row);
  if (!slot) return null;
  const colBundle = state.partsColumnSongs.find(c => c.col === col);
  if (!colBundle) return null;
  if (slot.songIndex === 0) return colBundle.target;
  if (slot.songIndex === 1) return colBundle.decoys[0];
  if (slot.songIndex === 2) return colBundle.decoys[1];
  return null;
}

// Each cell gets a unique audio stem ID: (col+1)*100 + row gives 101..503 with no collisions.
// Used by the audio engine's Map<id, StemAudio> so each of the 15 cells plays its own track.
export function partsCellStemId(col: number, row: number): number {
  return namespaceStemId(col + 1, row);
}

// Given a (col, row), find the stem ID — returns null if the cell has no song/stem.
function partsCellStemIdIfReady(state: GameState, col: number, row: number): number | null {
  const song = partsCellSong(state, col, row);
  if (!song) return null;
  const stem = song.stems.find(s => getPartsCol(s.instrument) === col);
  if (!stem) return null;
  return partsCellStemId(col, row);
}

// Returns the row containing the target (songIndex 0) for a given column.
export function partsTargetRowForCol(state: GameState, col: number): number {
  const slot = state.partsScatter.find(s => s.col === col && s.songIndex === 0);
  return slot?.row ?? 0;
}

// Begin a new column (invoked by host at round start and between columns).
// Returns the stem ID to fade in for the first cell.
export function partsStartColumn(state: GameState, col: number): number | null {
  if (state.roundType !== 'song-in-5-parts') return null;
  if (col < 0 || col > 4) return null;

  partsClearTimer(state);
  state.partsCurrentCol = col;
  state.partsCurrentRow = 1;
  state.partsPassCount = 0;
  state.partsLockedPlayers = [];
  state.partsRevealing = false;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.activeStems = [];
  state.phase = 'parts-playing';
  state.isAudioPlaying = true;

  const stemId = partsCellStemIdIfReady(state, col, 1);
  if (stemId != null) state.activeStems = [stemId];
  return stemId;
}

// Advance to the next cell within the current column. Returns {fadeOut, fadeIn, forfeit}.
// forfeit=true means 2-pass limit hit: caller should reveal target + advance column.
export function partsTickCell(state: GameState): { fadeOut: number[]; fadeIn: number[]; forfeit: boolean } {
  if (state.roundType !== 'song-in-5-parts' || state.partsCurrentCol < 0) {
    return { fadeOut: [], fadeIn: [], forfeit: false };
  }

  const fadeOut: number[] = [...state.activeStems];
  let nextRow = state.partsCurrentRow + 1;
  let passCount = state.partsPassCount;

  if (nextRow > 3) {
    // Wrap to top; bump pass counter
    nextRow = 1;
    passCount += 1;
    if (passCount >= 2) {
      // 2 full passes exhausted → forfeit
      state.activeStems = [];
      state.isAudioPlaying = false;
      return { fadeOut, fadeIn: [], forfeit: true };
    }
  }

  state.partsCurrentRow = nextRow;
  state.partsPassCount = passCount;

  const nextStemId = partsCellStemIdIfReady(state, state.partsCurrentCol, nextRow);
  state.activeStems = nextStemId != null ? [nextStemId] : [];
  return { fadeOut, fadeIn: nextStemId != null ? [nextStemId] : [], forfeit: false };
}

// Player buzzes in R4 — claims the musician currently playing.
export function partsBuzz(state: GameState, playerId: 1 | 2): boolean {
  if (state.roundType !== 'song-in-5-parts') return false;
  if (state.phase !== 'parts-playing') return false;
  if (state.partsLockedPlayers.includes(playerId)) return false;
  if (state.buzzedPlayer !== null) return false;

  partsClearTimer(state);
  state.buzzedPlayer = playerId;
  state.phase = 'buzzed';
  state.visualEffect = 'buzz';
  state.isAudioPlaying = false;
  return true;
}

// Host judges the buzz correct: award column to buzzer, advance.
// Returns {columnWon, nextCol, allDone}.
export function partsMarkCorrect(state: GameState): { columnWon: number; nextCol: number; allDone: boolean } {
  const buzzer = state.buzzedPlayer;
  const col = state.partsCurrentCol;
  const row = state.partsCurrentRow;
  // R4 is 2-player only — player 3 is eliminated before R4 ever starts. Guard for the type narrowing.
  if (!buzzer || buzzer === 3 || col < 0) return { columnWon: -1, nextCol: -1, allDone: true };

  const slot = state.partsScatter.find(s => s.col === col && s.row === row);
  const songIndex = slot?.songIndex ?? 0;
  state.partsColumnWinners[col] = { player: buzzer, songIndex };
  state.players[buzzer].score += roundPrizes['song-in-5-parts'][col] ?? 1000;
  state.currentPrize = roundPrizes['song-in-5-parts'][col] ?? 1000;
  state.visualEffect = 'correct';
  state.message = `CORRECT! +${formatMoney(state.currentPrize)}`;
  state.buzzedPlayer = null;

  const nextCol = col + 1;
  const allDone = nextCol >= 5;
  return { columnWon: col, nextCol, allDone };
}

// Host judges the buzz wrong: lock buzzer for this column, resume playing.
// Returns the stem ID to fade back in (the cell they just buzzed on).
export function partsMarkWrong(state: GameState): number | null {
  const buzzer = state.buzzedPlayer;
  // R4 is 2-player only — same narrowing as partsMarkCorrect.
  if (!buzzer || buzzer === 3 || state.roundType !== 'song-in-5-parts') return null;

  if (!state.partsLockedPlayers.includes(buzzer)) {
    state.partsLockedPlayers.push(buzzer);
  }
  state.visualEffect = 'wrong';
  state.message = 'WRONG!';
  state.buzzedPlayer = null;
  state.phase = 'parts-playing';
  state.isAudioPlaying = true;
  // Resume the cell they buzzed on — same stem still active
  return state.activeStems[0] ?? null;
}

// Host reveals target cell after forfeit (no correct buzz in 2 passes).
// Sets partsRevealing=true so UI lights up target row; mark column as forfeited.
export function partsRevealForfeit(state: GameState): number | null {
  const col = state.partsCurrentCol;
  if (col < 0 || state.roundType !== 'song-in-5-parts') return null;
  state.partsColumnForfeits[col] = true;
  state.partsRevealing = true;
  state.phase = 'result';
  state.isAudioPlaying = true;
  // Play the target stem so players hear what the correct answer was
  const targetRow = partsTargetRowForCol(state, col);
  const targetStemId = partsCellStemIdIfReady(state, col, targetRow);
  state.activeStems = targetStemId != null ? [targetStemId] : [];
  state.buzzedPlayer = null;
  state.visualEffect = 'reveal';
  state.message = `Target was row ${targetRow}`;
  return targetStemId;
}

// ============================================
// SONG SHOWDOWN (new R1 opener, 3 players)
// ============================================
// Mechanics:
//   1. Wall shows 3 rows, one year per row (years drawn from lineup).
//   2. Controller (random on start; winner of last buzz after) picks a year → that song plays.
//   3. Musicians join one-by-one every 5s, tier drops each join: $2,500 → $500 (or doubled
//      for songs 4-6: $5,000 → $1,000).
//   4. Any non-locked player can buzz. Correct → bank current tier + become controller.
//      Wrong → locked out of this song only, others keep racing.
//   5. After 6 songs → lowest score eliminated, round complete.

const SHOWDOWN_TICK_MS = 5000;                   // 5s per musician join

export function resolveShowdownLineup(state: GameState): string[] {
  // Prefer the dedicated field, then the generic roundLineups, then the hard-coded default.
  // This lets the existing /setup drop-zone editor (which writes to roundLineups) work for
  // Song Showdown with no special-casing on the client.
  const dedicated = state.config.songShowdownLineup;
  if (dedicated && dedicated.length >= 6) return dedicated;
  const generic = state.config.roundLineups['song-showdown'];
  if (generic && generic.length >= 6) return generic;
  return roundSongSets['song-showdown'] ?? [];
}

function pickRandomActivePlayer(state: GameState): PlayerId {
  const active: PlayerId[] = ([1, 2, 3] as const).filter(pid => !state.players[pid].eliminated);
  if (active.length === 0) return 1;
  return active[Math.floor(Math.random() * active.length)];
}

// 5-entry base ladder doubled for the back half (songs 4-6)
export function showdownLadder(state: GameState): number[] {
  const base = roundPrizes['song-showdown'];
  const multiplier = state.showdownSongsPlayed >= 3 ? 2 : 1;
  return base.map(v => v * multiplier);
}

export function showdownClearTimer(state: GameState): void {
  if (state.showdownTimerInterval) {
    clearInterval(state.showdownTimerInterval);
    state.showdownTimerInterval = null;
  }
}

// Build the stem join order for a showdown song — honours stemOrderBySong override and
// accepts ANY stem the song has (primary D/B/K/G/V or extras: horns, BVs, 4 named LVs, clue).
// This matters for producer-curated arrangements — e.g. for "The Joker" the host wants slot 1
// to be Gav's lead vocal line (LV_GAV) specifically, not the mixed VOCAL.mp3 (which blends
// BVs + 4 LVs together and can end up sounding wrong for songs the BVs weren't recorded for).
function resolveShowdownStemOrder(state: GameState, song: Song): number[] {
  const allStems = [...song.stems, ...(song.extraStems ?? [])];
  const override = state.config.stemOrderBySong?.[song.id];
  if (override && override.length > 0) {
    // Accept any stem ID the song knows about — primary OR extra.
    const valid = override
      .map(id => allStems.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => s.id);
    if (valid.length >= 5) return valid.slice(0, 5);
    // Host filled fewer than 5 slots — pad with remaining primary stems (they at least exist
    // and we know they're in the song). Clue (id 9) stays excluded from padding since it's a
    // lyric hint, not a musician.
    const remaining = song.stems.filter(s => !valid.includes(s.id)).map(s => s.id);
    return [...valid, ...remaining].slice(0, 5);
  }
  return song.stems.slice(0, 5).map(s => s.id);
}

// Host picks a year → load the chosen song, row lights up, first stem plays. The interval timer
// fires every 5s to add the next stem + drop the tier.
export function showdownPickYear(state: GameState, songId: string): { loaded: Song | null; firstStem: number | null } {
  if (state.roundType !== 'song-showdown') return { loaded: null, firstStem: null };
  const rowIdx = state.showdownYearsVisible.indexOf(songId);
  if (rowIdx < 0) return { loaded: null, firstStem: null };
  const song = getSongById(songId);
  if (!song) return { loaded: null, firstStem: null };

  showdownClearTimer(state);
  state.currentSong = song;
  state.showdownSelectedRow = rowIdx + 1;       // 1-3 for display
  state.showdownStemJoinOrder = resolveShowdownStemOrder(state, song);
  state.showdownTier = 0;                       // starts at the highest cash
  state.showdownLockedPlayers = [];
  state.activeStems = state.showdownStemJoinOrder.slice(0, 1);
  state.currentPrize = showdownLadder(state)[0];
  state.phase = 'playing';
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.songTitle = '';
  state.revealText = '';
  state.isAudioPlaying = true;
  return { loaded: song, firstStem: state.activeStems[0] ?? null };
}

// Advance one tier: add next stem, drop prize value. Returns the stem to fade in (or null if at cap).
export function showdownAdvanceTier(state: GameState): number | null {
  if (state.roundType !== 'song-showdown') return null;
  // Ticker runs during the main-song 'playing' phase AND the 'showdown-toss-up' phase.
  if (state.phase !== 'playing' && state.phase !== 'showdown-toss-up') return null;

  const nextTier = state.showdownTier + 1;

  // Toss-up: fixed $1k, no ladder. Just add the next stem on each tick until all 5 are in,
  // then hold. Audio keeps playing at full mix until a correct buzz or skip.
  if (state.phase === 'showdown-toss-up') {
    if (nextTier >= state.showdownStemJoinOrder.length) return null;  // all stems already in
    state.showdownTier = nextTier;
    const nextStemId = state.showdownStemJoinOrder[nextTier];
    if (nextStemId != null && !state.activeStems.includes(nextStemId)) {
      state.activeStems = [...state.activeStems, nextStemId];
    }
    // currentPrize stays at 1000 throughout toss-up
    return nextStemId ?? null;
  }

  const ladder = showdownLadder(state);
  if (nextTier >= ladder.length) {
    // Already at the floor ($500 or $1000 doubled). Stay put — song keeps playing, buzz still open.
    state.currentPrize = ladder[ladder.length - 1];
    return null;
  }
  state.showdownTier = nextTier;
  const nextStemId = state.showdownStemJoinOrder[nextTier];
  if (nextStemId != null && !state.activeStems.includes(nextStemId)) {
    state.activeStems = [...state.activeStems, nextStemId];
  }
  state.currentPrize = ladder[nextTier];
  return nextStemId ?? null;
}

// Correct buzz: buzzer banks the current tier's cash and becomes the next controller.
// During toss-up, banks the fixed $1k + becomes controller of the FIRST main-round year pick.
export function showdownMarkCorrect(state: GameState): void {
  if (state.roundType !== 'song-showdown') return;
  const buzzer = state.buzzedPlayer;
  if (!buzzer) return;
  showdownClearTimer(state);

  // Toss-up correct: fixed +$1k into banked score, winner picks first year, mark toss-up done.
  // NB: can't rely on state.phase here — playerBuzz flipped it to 'buzzed'. The stable signal
  // for "currently in toss-up" is resolved=false AND no main songs played yet.
  const inTossUp = !state.showdownTossUpResolved && state.showdownSongsPlayed === 0;
  if (inTossUp) {
    state.players[buzzer].score += 1000;
    state.showdownControllerPlayer = buzzer;
    state.showdownTossUpResolved = true;
    state.phase = 'result';
    state.visualEffect = 'correct';
    state.message = `TOSS UP! ${state.players[buzzer].name} banks ${formatMoney(1000)}`;
    state.isAudioPlaying = false;
    return;
  }

  // Normal main-round correct: buzzer gets current tier, becomes next year-pick controller.
  state.players[buzzer].score += state.currentPrize;
  state.showdownControllerPlayer = buzzer;
  state.phase = 'result';
  state.visualEffect = 'correct';
  state.message = `CORRECT! +${formatMoney(state.currentPrize)}`;
  state.isAudioPlaying = false;
}

// Wrong buzz: lock the buzzer out of this song (main round) OR free-for-all (toss-up).
export function showdownMarkWrong(state: GameState): void {
  if (state.roundType !== 'song-showdown') return;
  const buzzer = state.buzzedPlayer;
  if (!buzzer) return;

  // Toss-up: free-for-all. Same "phase is 'buzzed' right now" caveat as mark-correct — detect
  // toss-up via the stable resolved/songsPlayed signal.
  const inTossUp = !state.showdownTossUpResolved && state.showdownSongsPlayed === 0;
  if (inTossUp) {
    state.buzzedPlayer = null;
    state.phase = 'showdown-toss-up';   // resume ticker + keep buzz open
    state.visualEffect = 'wrong';
    state.message = `${state.players[buzzer].name} — wrong! (free-for-all)`;
    state.isAudioPlaying = true;
    return;
  }

  // Main round: per-song lockout
  if (!state.showdownLockedPlayers.includes(buzzer)) {
    state.showdownLockedPlayers.push(buzzer);
  }
  state.buzzedPlayer = null;
  state.phase = 'playing';             // ticker resumes
  state.visualEffect = 'wrong';
  state.message = `${state.players[buzzer].name} LOCKED OUT — others race on`;
  state.isAudioPlaying = true;
}

// Move to the next song. If we're still resolving the toss-up (just won / just skipped), this
// transitions to the year-pick phase WITHOUT consuming a main-song slot. Otherwise it's the
// normal main-round advance: rotate the year out, count the song, check elimination.
export function showdownNextSong(state: GameState): { complete: boolean } {
  if (state.roundType !== 'song-showdown') return { complete: false };
  showdownClearTimer(state);

  // Toss-up branch: we just finished the opener. Transition to year-pick without counting
  // it as one of the 6 main songs. Controller is already set (winner in mark-correct, or
  // random on skip via showdownSkipTossUp).
  if (state.showdownTossUpResolved && state.showdownSongsPlayed === 0 && state.showdownSelectedRow === 2) {
    state.currentSong = null;
    state.showdownSelectedRow = 0;
    state.showdownStemJoinOrder = [];
    state.showdownTier = 0;
    state.showdownLockedPlayers = [];
    state.activeStems = [];
    state.currentPrize = 0;
    state.buzzedPlayer = null;
    state.visualEffect = 'none';
    state.message = '';
    // If controller wasn't set (toss-up was skipped without a win), pick randomly now.
    if (!state.showdownControllerPlayer) {
      state.showdownControllerPlayer = pickRandomActivePlayer(state);
    }
    state.phase = 'showdown-year-pick';
    return { complete: false };
  }

  // Main-round branch (unchanged): stash the played song, rotate year from reserve, increment.
  const playedRow = state.showdownSelectedRow - 1;
  const playedId = playedRow >= 0 ? state.showdownYearsVisible[playedRow] : null;
  if (playedId) state.showdownYearsPlayed.push(playedId);

  if (playedRow >= 0) {
    const replacement = state.showdownYearsReserve.shift();
    if (replacement) {
      state.showdownYearsVisible[playedRow] = replacement;
    } else {
      state.showdownYearsVisible[playedRow] = '';    // empty slot marker
    }
  }

  state.showdownSongsPlayed += 1;
  state.showdownSelectedRow = 0;
  state.showdownTier = 0;
  state.showdownStemJoinOrder = [];
  state.showdownLockedPlayers = [];
  state.activeStems = [];
  state.currentSong = null;
  state.currentPrize = 0;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';

  if (state.showdownSongsPlayed >= 6) {
    showdownEliminateLowest(state);
    state.phase = 'round-complete';
    return { complete: true };
  }

  state.phase = 'showdown-year-pick';
  return { complete: false };
}

// Skip the toss-up without awarding. Marks resolved; host still clicks "next song" to
// transition to year-pick (handled by showdownNextSong's toss-up branch above).
export function showdownSkipTossUp(state: GameState): void {
  if (state.roundType !== 'song-showdown' || state.phase !== 'showdown-toss-up') return;
  showdownClearTimer(state);
  state.showdownTossUpResolved = true;
  state.phase = 'result';
  state.visualEffect = 'none';
  state.message = 'Toss Up skipped';
  state.isAudioPlaying = false;
  state.buzzedPlayer = null;
}

// End-of-round elimination: mark the single lowest-scorer as eliminated. If there's a tie for
// lowest, producer will break it manually — we just flag all tied lowest as eliminated only if
// it's a clean singleton. (Producer can use host:adjust-score to tip a tie before pressing end.)
export function showdownEliminateLowest(state: GameState): void {
  const active: PlayerId[] = ([1, 2, 3] as const).filter(pid => !state.players[pid].eliminated);
  if (active.length < 2) return;
  const scores = active.map(pid => state.players[pid].score);
  const min = Math.min(...scores);
  const losers = active.filter(pid => state.players[pid].score === min);
  if (losers.length === 1) {
    state.players[losers[0]].eliminated = true;
  }
  // Ties: left for host to resolve manually before proceeding. Round still completes.
}

// ============================================
// WIN THE WALL (endgame, 1 survivor, $1m jackpot)
// ============================================
// Snake through 15 musicians at 5s each. Survivor buzzes → pause music + clock. Correct → full
// wall mix celebration, song counts, next song starts at the next unused musician. Wrong (or
// forced skip after 5 musicians) → song wastes 5 musicians, move on. 6 songs = $1m.

const WTW_TICK_MS = 5000;

export function resolveWtwLineup(state: GameState): string[] {
  const dedicated = state.config.winTheWallLineup;
  if (dedicated && dedicated.length >= 6) return dedicated;
  const generic = state.config.roundLineups['win-the-wall'];
  if (generic && generic.length >= 6) return generic;
  return roundSongSets['win-the-wall'] ?? [];
}

// Resolve the cash value awarded at a given songs-won milestone. Host can override the 3
// default gate values ($50k / $100k / $250k) per-show via GameConfig.winTheWallPrizes.
// Non-gate milestones (1, 2, 4) return 0 — they're blank on the pyramid and don't offer a
// walkaway. All three milestones (3, 5, 6) are pure additions on top of banked earnings.
export function resolveWtwPrize(state: GameState, milestone: number): number {
  // Only milestones 3, 5, 6 ever have a value. Narrow through the paying-gate union so TS
  // accepts indexing into Partial<Record<3 | 5 | 6, number>>.
  if (milestone !== 3 && milestone !== 5 && milestone !== 6) return 0;
  const gate = milestone as 3 | 5 | 6;
  const override = state.config.winTheWallPrizes?.[gate];
  if (typeof override === 'number') return override;
  return WTW_WALKAWAY_OFFERS_DEFAULT[gate] ?? 0;
}

function pickWtwSurvivor(state: GameState): PlayerId {
  // Default: non-eliminated player with the highest score. Falls back to player 1.
  const active: PlayerId[] = ([1, 2, 3] as const).filter(pid => !state.players[pid].eliminated);
  if (active.length === 0) return 1;
  let best = active[0];
  for (const pid of active) {
    if (state.players[pid].score > state.players[best].score) best = pid;
  }
  return best;
}

export function wtwClearTimer(state: GameState): void {
  if (state.wtwTimerInterval) {
    clearInterval(state.wtwTimerInterval);
    state.wtwTimerInterval = null;
  }
}

// Start the next song's snake run. Resets per-song counters and loads the song audio.
// Called on round start and after every correct/skip.
export function wtwStartSong(state: GameState): { song: Song | null; firstCellIndex: number; firstStemId: number | null } {
  if (state.roundType !== 'win-the-wall') return { song: null, firstCellIndex: -1, firstStemId: null };
  wtwClearTimer(state);

  const songIdx = state.wtwSongIndex;
  const song = state.wtwLineup[songIdx] ?? null;
  state.currentSong = song;
  state.wtwMusiciansThisSong = 1;   // first musician is immediately "playing" at song start

  // First musician = next in the snake past the spent ones. musicianIndex is global (0-14).
  if (state.wtwMusicianIndex < 0) state.wtwMusicianIndex = 0;
  // Mark where this song starts in the snake — cells before this are "prior-song spent".
  state.wtwSongStartIndex = state.wtwMusicianIndex;

  // If we've burned all 15 before hitting 6 songs → bust. Bust DOESN'T wipe banked earnings;
  // the survivor still walks with everything they brought into the final (wtwStartingScore).
  if (state.wtwMusicianIndex >= WTW_SNAKE.length) {
    state.phase = 'wtw-bust';
    state.currentSong = null;
    state.activeStems = [];
    state.isAudioPlaying = false;
    state.visualEffect = 'wrong';
    state.message = `Musicians spent — walk with ${formatMoney(state.wtwStartingScore)}`;
    return { song: null, firstCellIndex: -1, firstStemId: null };
  }

  // Cumulative-reveal pattern (matches R1): first musician plays the first stem only.
  // Subsequent musicians add their stem on top (wtwAdvanceMusician appends).
  const firstStemId = song && song.stems.length > 0 ? song.stems[0].id : null;
  state.activeStems = firstStemId != null ? [firstStemId] : [];
  state.isAudioPlaying = true;
  state.phase = 'wtw-playing';
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.currentPrize = resolveWtwPrize(state, state.wtwSongsWon + 1);
  return { song, firstCellIndex: state.wtwMusicianIndex, firstStemId };
}

// Stem-at-position lookup. Each song uses stems 0..4 (D/B/K/G/V). The survivor hears the same
// song build up from one instrument to five as musicians join — same cumulative reveal pattern
// as R1, just paced by the snake clock instead of a host button.
// `musiciansThisSong` is the 1-based index of the musician currently being added (1..5).
// Returns the stem ID to fade in on this tick (or null if already at full mix / no song).
function wtwNextStemToAdd(state: GameState): number | null {
  const song = state.currentSong;
  if (!song) return null;
  // Musician 1 of the song = stem[0], musician 2 = stem[1], etc. Cap at song.stems.length.
  const stemIdx = state.wtwMusiciansThisSong - 1;
  if (stemIdx < 0 || stemIdx >= song.stems.length) return null;
  return song.stems[stemIdx]?.id ?? null;
}

// Snake tick: advance to the next musician. Cumulative reveal — the new stem joins the ones
// already playing (doesn't replace them). Returns the stem ID to fade IN on this tick (caller
// leaves existing stems untouched).
export function wtwAdvanceMusician(state: GameState): { stemId: number | null; autoSkipped: boolean; bust: boolean } {
  if (state.roundType !== 'win-the-wall' || state.phase !== 'wtw-playing') {
    return { stemId: null, autoSkipped: false, bust: false };
  }
  state.wtwMusicianIndex += 1;
  state.wtwMusiciansThisSong += 1;

  // 5-musician cap — song dies, auto-skip (caller will fade out all stems + load next song)
  if (state.wtwMusiciansThisSong > 5) {
    return wtwSkipSongInternal(state, 'auto');
  }

  // Snake exhausted? Bust preserves banked earnings — they walk with wtwStartingScore, not zero.
  if (state.wtwMusicianIndex >= WTW_SNAKE.length) {
    state.phase = 'wtw-bust';
    state.isAudioPlaying = false;
    state.visualEffect = 'wrong';
    state.message = `Musicians spent — walk with ${formatMoney(state.wtwStartingScore)}`;
    wtwClearTimer(state);
    return { stemId: null, autoSkipped: false, bust: true };
  }

  // Append the next stem to activeStems (cumulative reveal — prior stems keep playing).
  const nextStemId = wtwNextStemToAdd(state);
  if (nextStemId != null && !state.activeStems.includes(nextStemId)) {
    state.activeStems = [...state.activeStems, nextStemId];
  }
  return { stemId: nextStemId, autoSkipped: false, bust: false };
}

// Correct buzz: full wall mix celebration, song counts. If we hit a gate (3 or 5) → offer walkaway.
// If hit 6 → wall goes gold, jackpot.
export function wtwMarkCorrect(state: GameState): { newSongsWon: number; atGate: boolean; jackpot: boolean } {
  if (state.roundType !== 'win-the-wall') return { newSongsWon: 0, atGate: false, jackpot: false };
  wtwClearTimer(state);
  state.wtwSongsWon += 1;
  state.buzzedPlayer = null;
  state.visualEffect = 'correct';

  if (state.wtwSongsWon >= 6) {
    // Jackpot! Full wall mix, gold state. Top prize (defaults to $250k, host-configurable).
    const jackpot = resolveWtwPrize(state, 6);
    if (state.wtwSurvivor) state.players[state.wtwSurvivor].score += jackpot;
    state.phase = 'wtw-gold';
    state.message = `JACKPOT! ${formatMoney(jackpot)}`;
    state.visualEffect = 'gold';
    state.isAudioPlaying = true;
    // Celebrate with all stems of the current song
    if (state.currentSong) state.activeStems = state.currentSong.stems.map(s => s.id);
    return { newSongsWon: state.wtwSongsWon, atGate: false, jackpot: true };
  }

  const walkaway = resolveWtwPrize(state, state.wtwSongsWon);
  if (walkaway) {
    state.wtwWalkawayOffered = walkaway;
    state.phase = 'wtw-walkaway-offer';
    state.message = `${formatMoney(walkaway)} — walk away or keep going?`;
    state.isAudioPlaying = true;
    if (state.currentSong) state.activeStems = state.currentSong.stems.map(s => s.id);
    return { newSongsWon: state.wtwSongsWon, atGate: true, jackpot: false };
  }

  // Between-gate song (songs 1, 2, 4) — brief celebration then immediately advance
  state.message = `Song ${state.wtwSongsWon}/6 correct`;
  state.isAudioPlaying = true;
  if (state.currentSong) state.activeStems = state.currentSong.stems.map(s => s.id);
  return { newSongsWon: state.wtwSongsWon, atGate: false, jackpot: false };
}

// Wrong buzz: no penalty. Music + clock resume at the same cell.
export function wtwMarkWrong(state: GameState): void {
  if (state.roundType !== 'win-the-wall') return;
  state.buzzedPlayer = null;
  state.phase = 'wtw-playing';
  state.visualEffect = 'wrong';
  state.message = `WRONG — music resumes`;
  state.isAudioPlaying = true;
}

// Host-driven manual skip (button). UPDATED BEHAVIOUR: no longer burns musicians. Just
// advances to the next song in the lineup, taking over from the current snake position. The
// 5-per-song auto-skip (called via _cause='auto' from wtwAdvanceMusician) still burns the cap.
export function wtwSkipSong(state: GameState): { bust: boolean } {
  const r = wtwSkipSongInternal(state, 'manual');
  return { bust: r.bust };
}

// Host clicks a specific song in the "Songs in Round" list to jump to it right now. Same as
// manual skip but lets the host pick any song from the lineup (not just the next one). Current
// cell becomes this song's cell 1; prior cells become spent-prior on the wall.
export function wtwJumpToSong(state: GameState, lineupIndex: number): { song: Song | null; bust: boolean } {
  if (state.roundType !== 'win-the-wall') return { song: null, bust: false };
  if (lineupIndex < 0 || lineupIndex >= state.wtwLineup.length) return { song: null, bust: false };
  wtwClearTimer(state);

  // Snake exhausted check
  if (state.wtwMusicianIndex < 0) state.wtwMusicianIndex = 0;
  if (state.wtwMusicianIndex >= WTW_SNAKE.length) {
    state.phase = 'wtw-bust';
    state.currentSong = null;
    state.activeStems = [];
    state.isAudioPlaying = false;
    state.message = `Musicians spent — walk with ${formatMoney(state.wtwStartingScore)}`;
    return { song: null, bust: true };
  }

  state.wtwSongIndex = lineupIndex;
  const song = state.wtwLineup[lineupIndex] ?? null;
  state.currentSong = song;
  state.phase = 'wtw-playing';
  // New song takes over at the CURRENT cell — this becomes its stem 0. Prior cells (before
  // wtwSongStartIndex) are already marked spent. Cells between the previous song's start and
  // this jump point become "prior-song spent" once songStartIndex moves.
  state.wtwSongStartIndex = state.wtwMusicianIndex;
  state.wtwMusiciansThisSong = 1;
  state.activeStems = song && song.stems.length > 0 ? [song.stems[0].id] : [];
  state.isAudioPlaying = true;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.currentPrize = resolveWtwPrize(state, state.wtwSongsWon + 1);
  return { song, bust: false };
}

// Reorder the lineup mid-round. newOrder is the full list of song IDs in the desired order.
// Keeps wtwLineup in sync with wtwSongIndex so the "current" song stays current even if its
// position in the list moved.
export function wtwReorderLineup(state: GameState, newOrder: string[]): void {
  if (state.roundType !== 'win-the-wall') return;
  const newLineup = newOrder.map(id => getSongById(id)).filter((s): s is Song => !!s);
  if (newLineup.length === 0) return;

  // Preserve which song is "current" by finding it in the new order
  const currentId = state.wtwLineup[state.wtwSongIndex]?.id ?? null;
  state.wtwLineup = newLineup;
  state.roundSongs = newLineup;
  if (currentId) {
    const newIdx = newLineup.findIndex(s => s.id === currentId);
    if (newIdx >= 0) state.wtwSongIndex = newIdx;
  }
  // Also persist into config so the ordering sticks across round restarts / JSON export.
  state.config.winTheWallLineup = newLineup.map(s => s.id);
}

// Internal skip. 'auto' is called when a song burns its 5-musician cap — the cap cells are
// spent (advance musicianIndex past them). 'manual' is the host button — does NOT burn extras;
// new song takes over at the current cell.
function wtwSkipSongInternal(state: GameState, cause: 'auto' | 'manual'): { stemId: null; autoSkipped: true; bust: boolean } {
  wtwClearTimer(state);
  state.wtwSongIndex += 1;
  state.activeStems = [];
  state.isAudioPlaying = false;
  state.buzzedPlayer = null;
  state.visualEffect = cause === 'auto' ? 'wrong' : 'none';
  state.message = cause === 'auto'
    ? `5 musicians used — moving on`
    : `Moving to next song`;

  // Bust check — no songs left in the lineup?
  if (state.wtwSongIndex >= state.wtwLineup.length) {
    state.phase = 'wtw-bust';
    state.currentSong = null;
    state.message = `Out of songs — walk with ${formatMoney(state.wtwStartingScore)}`;
    return { stemId: null, autoSkipped: true, bust: true };
  }

  // Auto-skip already consumed the cap's final cell in wtwAdvanceMusician (it bumped index).
  // Manual skip leaves musicianIndex where it is — the new song takes over AT the current cell
  // as its stem 0.
  if (cause === 'auto') {
    // No extra advance — wtwAdvanceMusician already moved us to the cell where we'd continue.
    // Nothing to do here.
  }

  // Bust check — snake exhausted?
  if (state.wtwMusicianIndex >= WTW_SNAKE.length) {
    state.phase = 'wtw-bust';
    state.currentSong = null;
    state.message = `Out of musicians — walk with ${formatMoney(state.wtwStartingScore)}`;
    return { stemId: null, autoSkipped: true, bust: true };
  }

  const nextSong = state.wtwLineup[state.wtwSongIndex] ?? null;
  state.currentSong = nextSong;
  state.phase = 'wtw-playing';
  state.wtwSongStartIndex = state.wtwMusicianIndex;   // new song starts "here"
  state.wtwMusiciansThisSong = 1;
  state.activeStems = nextSong && nextSong.stems.length > 0 ? [nextSong.stems[0].id] : [];
  state.isAudioPlaying = true;
  return { stemId: null, autoSkipped: true, bust: false };
}

// Walkaway accept: survivor takes the currently offered cash. Round ends there.
export function wtwAcceptWalkaway(state: GameState): void {
  if (state.roundType !== 'win-the-wall' || state.phase !== 'wtw-walkaway-offer') return;
  wtwClearTimer(state);
  const cash = state.wtwWalkawayOffered ?? 0;
  if (state.wtwSurvivor && cash > 0) state.players[state.wtwSurvivor].score += cash;
  state.message = `Walked away with ${formatMoney(cash)}`;
  state.phase = 'round-complete';
  state.visualEffect = 'correct';
  state.isAudioPlaying = false;
  state.wtwWalkawayOffered = null;
}

// Walkaway decline: keep going — advance to next song (same snake position, no payout yet).
export function wtwDeclineWalkaway(state: GameState): void {
  if (state.roundType !== 'win-the-wall' || state.phase !== 'wtw-walkaway-offer') return;
  state.wtwWalkawayOffered = null;
  state.wtwSongIndex += 1;
  state.wtwMusicianIndex += 1;           // next musician = next snake position
  state.wtwMusiciansThisSong = 0;

  if (state.wtwSongIndex >= state.wtwLineup.length || state.wtwMusicianIndex >= WTW_SNAKE.length) {
    state.phase = 'wtw-bust';
    state.currentSong = null;
    state.activeStems = [];
    state.isAudioPlaying = false;
    state.message = `Out of songs — walk with ${formatMoney(state.wtwStartingScore)}`;
    return;
  }

  const song = state.wtwLineup[state.wtwSongIndex] ?? null;
  state.currentSong = song;
  state.phase = 'wtw-playing';
  state.wtwSongStartIndex = state.wtwMusicianIndex;   // new song starts here
  state.wtwMusiciansThisSong = 1;
  state.activeStems = song && song.stems.length > 0 ? [song.stems[0].id] : [];
  state.isAudioPlaying = true;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';
  state.message = '';
  state.currentPrize = resolveWtwPrize(state, state.wtwSongsWon + 1);
}

// Host override: manually set which player is the survivor. Snapshots their current banked
// total so a bust later still pays out their pre-final earnings.
export function wtwSetSurvivor(state: GameState, playerId: PlayerId): void {
  if (state.roundType !== 'win-the-wall') return;
  state.wtwSurvivor = playerId;
  state.wtwStartingScore = state.players[playerId]?.score ?? 0;
}

// Get the current playing cell's wall coordinates (row 1-3, col 1-5) — for the wall renderer.
export function wtwCurrentCell(state: GameState): { row: number; col: number } | null {
  if (state.wtwMusicianIndex < 0 || state.wtwMusicianIndex >= WTW_SNAKE.length) return null;
  const [r0, c0] = WTW_SNAKE[state.wtwMusicianIndex];
  return { row: r0 + 1, col: c0 + 1 };
}
