import type {
  GamePhase, RoundType, Song, WallMusician, PlayerInfo,
  WallState, PlayerState, HostState,
  AuctionOffer, SongPart, GameConfig,
} from '../shared/types.js';
import { ROW_COLORS, WALL_INSTRUMENTS, ROUND_NAMES, formatMoney } from '../shared/types.js';
import { getSongsForRound, getSongById, getPartsQuestion, getPartsColumnSongs, roundPrizes, partsQuestions, partsColumnQuestions, anotherLevelBoard, anotherLevelSongs, AL_COL_INSTRUMENTS } from './data/songs.js';
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
  players: { 1: PlayerInfo; 2: PlayerInfo };
  buzzedPlayer: 1 | 2 | null;

  // Prize
  currentPrize: number;

  // Visual
  visualEffect: 'none' | 'correct' | 'wrong' | 'reveal' | 'gold' | 'buzz';
  message: string;
  songTitle: string;
  revealText: string;

  // Connections
  connections: { wall: number; player1: boolean; player2: boolean; host: number };

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
      1: { name: 'Player 1', score: 0, connected: false },
      2: { name: 'Player 2', score: 0, connected: false },
    },
    buzzedPlayer: null,
    currentPrize: 0,
    visualEffect: 'none',
    message: '',
    songTitle: '',
    revealText: '',
    connections: { wall: 0, player1: false, player2: false, host: 0 },
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
    config: {
      roundLineups: {},
      anotherLevelGroupSongs: {},
      partsColumnOverrides: {},
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

export function resetConfig(state: GameState): void {
  state.config = { roundLineups: {}, anotherLevelGroupSongs: {}, partsColumnOverrides: {}, stemOrderBySong: {}, musicAuctionOverrides: {} };
}

export function importConfig(state: GameState, config: GameConfig): void {
  state.config = {
    roundLineups: config.roundLineups ?? {},
    anotherLevelGroupSongs: config.anotherLevelGroupSongs ?? {},
    partsColumnOverrides: config.partsColumnOverrides ?? {},
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
  };
}

export function derivePlayerState(state: GameState, playerId: 1 | 2): PlayerState {
  const player = state.players[playerId];
  const otherPlayer = playerId === 1 ? 2 : 1;

  // Players can buzz during playing, parts-playing, and wrong-other-player
  const canBuzz =
    (state.phase === 'playing' || state.phase === 'parts-playing' || state.phase === 'wrong-other-player')
    && state.buzzedPlayer === null;

  let resultMessage = '';
  if (state.phase === 'result') {
    if (state.visualEffect === 'correct' && state.buzzedPlayer === playerId) {
      resultMessage = `CORRECT! +${formatMoney(state.currentPrize)}`;
    } else if (state.visualEffect === 'wrong' && state.buzzedPlayer === playerId) {
      resultMessage = 'WRONG!';
    }
  }

  // Auction bid info
  const myKey = playerId === 1 ? 'player1' : 'player2';
  const otherKey = playerId === 1 ? 'player2' : 'player1';
  const isAuction = state.roundType === 'music-auction';
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
    otherBuzzed: state.buzzedPlayer === otherPlayer,
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
  };
}

// ============================================
// STATE MUTATIONS - GENERIC
// ============================================

export function selectRound(state: GameState, round: RoundType): void {
  // Board reset: clear all playback/visual state from previous round
  state.activeStems = [];
  state.isAudioPlaying = false;
  state.currentSong = null;
  state.visualEffect = 'none';
  state.songTitle = '';

  state.roundType = round;
  // Honour config override for the round lineup (R1 / R3); fall back to hard-coded default.
  // R1 "5 to 1" specifically plays exactly 5 songs, so the lineup is capped at 5 at runtime
  // even if the host has a longer pool saved for variety across shows.
  const overrideIds = state.config.roundLineups[round];
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

  if (state.roundSongs.length > 0 && round !== 'another-level') {
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
      state.currentPrize = roundPrizes['5to1'][index] || 1000;
      // "5 to 1" progression: song 1 plays 5 stems simultaneously, song 5 plays just 1.
      // Fewer instruments = harder to recognise = higher prize.
      const instrumentCount = Math.max(1, 5 - index);
      if (state.currentSong) {
        // Honour host's per-song stem-order arrangement (set via drag-drop on /setup).
        // Falls back to the song's default stem order.
        const override = state.config.stemOrderBySong?.[state.currentSong.id];
        const orderedStems = override && override.length > 0
          ? override.map(id => state.currentSong!.stems.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s)
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

export function playerBuzz(state: GameState, playerId: 1 | 2): boolean {
  const buzzablePhases: GamePhase[] = ['playing', 'parts-playing', 'wrong-other-player'];
  if (!buzzablePhases.includes(state.phase) || state.buzzedPlayer !== null) return false;
  // R4: player locked out for the current column can't buzz
  if (state.roundType === 'song-in-5-parts' && state.partsLockedPlayers.includes(playerId)) return false;

  // R4: stop the 5s auto-advance timer when a buzz comes in
  if (state.roundType === 'song-in-5-parts') partsClearTimer(state);

  state.buzzedPlayer = playerId;
  state.phase = 'buzzed';
  state.visualEffect = 'buzz';
  return true;
}

export function markCorrect(state: GameState): void {
  if (!state.buzzedPlayer) return;
  // R4 has per-column scoring + column-advance logic — partsMarkCorrect handles score + message there
  if (state.roundType === 'song-in-5-parts') {
    partsMarkCorrect(state);
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

export function adjustScore(state: GameState, player: 1 | 2, delta: number): void {
  state.players[player].score += delta;
}

export function setPlayerName(state: GameState, player: 1 | 2, name: string): void {
  state.players[player].name = name;
}

export function endRound(state: GameState): void {
  state.phase = 'round-complete';
  state.isAudioPlaying = false;
}

export function resetGame(state: GameState): void {
  const fresh = createInitialState();
  fresh.connections = state.connections;
  fresh.players[1].name = state.players[1].name;
  fresh.players[2].name = state.players[2].name;
  fresh.players[1].connected = state.players[1].connected;
  fresh.players[2].connected = state.players[2].connected;
  Object.assign(state, fresh);
}

export function backToLobby(state: GameState): void {
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
  if (!buzzer || col < 0) return { columnWon: -1, nextCol: -1, allDone: true };

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
  if (!buzzer || state.roundType !== 'song-in-5-parts') return null;

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
