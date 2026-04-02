import type {
  GamePhase, RoundType, Song, WallMusician, PlayerInfo,
  WallState, PlayerState, HostState,
  AuctionOffer, SongPart,
} from '../shared/types.js';
import { ROW_COLORS, WALL_INSTRUMENTS, ROUND_NAMES, formatMoney } from '../shared/types.js';
import { getSongsForRound, getSongById, getPartsQuestion, roundPrizes, partsQuestions, anotherLevelBoard, anotherLevelSongs } from './data/songs.js';
import type { AnotherLevelSongConfig } from './data/songs.js';

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

  // Connections
  connections: { wall: number; player1: boolean; player2: boolean; host: number };

  // Another Level: playable song configs
  anotherLevelSongConfigs: AnotherLevelSongConfig[];
  anotherLevelCurrentGroup: string; // group name of the currently playing song

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
  partsSongsByRow: { row: number; song: Song }[]; // 3 entries
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
    connections: { wall: 0, player1: false, player2: false, host: 0 },
    anotherLevelSongConfigs: [],
    anotherLevelCurrentGroup: '',
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

  const musicians: WallMusician[] = [];
  const stems = state.currentSong?.stems || [];

  // Map: each column = one stem (instrument), each row = same instrument (3 "musicians" per instrument)
  const numCols = 5;
  let id = 1;

  // Build map of revealed auction offer labels (row 2, cells 6-10)
  const auctionLabels = new Map<number, string>();
  if (state.roundType === 'music-auction') {
    for (let i = 0; i < state.auctionOffers.length; i++) {
      const offer = state.auctionOffers[i];
      if (offer.revealed) {
        const cellId = 6 + i; // row 2 cells
        auctionLabels.set(cellId, formatMoney(offer.prize));
      }
    }
  }

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < numCols; col++) {
      const stem = stems[col];
      const isActive = stem ? state.activeStems.includes(stem.id) : false;
      const auctionLabel = auctionLabels.get(id);
      const isAuctionHighlight = !!auctionLabel;
      const isCurrentOffer = state.auctionHighlight?.cellId === id;

      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: stem ? stem.instrument : '',
        icon: stem ? stem.icon : '',
        color: ROW_COLORS[row][col],
        isActive: (isActive || isAuctionHighlight) && !!stem,
        isPlaying: (isActive && state.isAudioPlaying && !!stem) || (isCurrentOffer && !!stem),
        label: auctionLabel,
      });
      id++;
    }
  }

  return musicians;
}

function generatePartsWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  let id = 1;

  for (let row = 0; row < 3; row++) {
    const entry = state.partsSongsByRow.find(e => e.row === row + 1);
    const song = entry?.song;

    for (let col = 0; col < 5; col++) {
      // Find the stem that maps to this column
      const stem = song?.stems.find(s => getInstrumentCol(s.instrument) === col);
      const nsId = stem ? namespaceStemId(row + 1, stem.id) : -1;
      const isActive = nsId > 0 && state.activeStems.includes(nsId);

      musicians.push({
        id,
        row: row + 1,
        col: col + 1,
        instrument: stem ? stem.instrument : '',
        icon: stem ? stem.icon : '',
        color: ROW_COLORS[row][col],
        isActive: isActive && !!stem,
        isPlaying: isActive && state.isAudioPlaying && !!stem,
      });
      id++;
    }
  }

  return musicians;
}

function generateAnotherLevelWallMusicians(state: GameState): WallMusician[] {
  const musicians: WallMusician[] = [];
  let id = 1;

  for (const cell of anotherLevelBoard) {
    const isActive = cell.group === state.anotherLevelCurrentGroup;
    const prizeLabel = cell.prize >= 1000 ? `$${cell.prize / 1000}k` : `$${cell.prize}`;

    musicians.push({
      id,
      row: cell.row,
      col: cell.col,
      instrument: '', // no instrument name for prize board
      icon: '', // no emoji for prize board
      color: cell.color,
      isActive,
      isPlaying: isActive && state.isAudioPlaying,
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
    message: state.message,
    auctionHighlight: state.auctionHighlight,
    auctionBids: isAuction && auctionRevealed ? state.auctionBids : undefined,
    auctionWinner: isAuction && auctionRevealed ? state.auctionWinner : undefined,
    auctionTimer: isAuction ? state.auctionTimerValue : undefined,
    genre: isAuction ? state.currentSong?.genre : undefined,
    currentPartLabel,
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

  // Build auction offers list for player display
  // During bidding+, show ALL options so players can choose any musician count
  const showAllOffers = state.phase !== 'auction-offers';
  const auctionOffers = isAuction ? state.auctionOffers
    .filter(o => showAllOffers || o.revealed)
    .map(o => ({ musicians: o.musicianCount, prize: o.prize })) : undefined;

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
    partsTargetRow: state.partsTargetRow || undefined,
    partsTargetSongTitle: state.partsTargetSong?.title || undefined,
    partsSongs: state.partsSongsByRow.map(e => ({ title: e.song.title, artist: e.song.artist, row: e.row })),
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
  state.roundSongs = getSongsForRound(round);
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
  state.anotherLevelSongConfigs = [];
  state.anotherLevelCurrentGroup = '';

  // Round-specific setup
  if (round === 'another-level') {
    state.anotherLevelSongConfigs = [...anotherLevelSongs];
  }

  // For song-in-5-parts, roundSongs drives song count (1 entry per question)
  if (round === 'song-in-5-parts') {
    // Use the target songs from partsQuestions as the song list
    state.roundSongs = partsQuestions
      .map(q => getSongById(q.targetSongId))
      .filter((s): s is Song => !!s);
  }

  if (state.roundSongs.length > 0) {
    loadSong(state, 0);
  }
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
  state.auctionHighlight = null;

  // Round-specific song setup
  switch (state.roundType) {
    case '1to5':
      state.currentPrize = roundPrizes['1to5'][index] || 1000;
      state.phase = 'playing';
      break;

    case 'another-level': {
      const alConfig = state.anotherLevelSongConfigs[index];
      state.currentPrize = alConfig?.prize || roundPrizes['another-level'][index] || 1000;
      state.anotherLevelCurrentGroup = alConfig?.group || '';
      // Activate specific stems by instrument name
      if (alConfig && state.currentSong) {
        state.activeStems = state.currentSong.stems
          .filter(s => alConfig.stemInstruments.includes(s.instrument))
          .map(s => s.id);
      }
      state.phase = 'playing';
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
      state.currentPrize = roundPrizes['song-in-5-parts'][index] || 2000;
      const question = getPartsQuestion(index);
      if (question) {
        const target = getSongById(question.targetSongId);
        const herring1 = getSongById(question.herringSongIds[0]);
        const herring2 = getSongById(question.herringSongIds[1]);
        if (target && herring1 && herring2) {
          state.partsTargetSong = target;
          state.partsHerring1 = herring1;
          state.partsHerring2 = herring2;
          state.currentSong = target; // for display purposes
          // Randomize which row gets the target (1-3)
          state.partsTargetRow = Math.floor(Math.random() * 3) + 1;
          // Assign songs to rows
          const songs = [target, herring1, herring2];
          // Put target in the target row, fill others
          const rowAssignments: { row: number; song: Song }[] = [];
          let herringIdx = 0;
          for (let r = 1; r <= 3; r++) {
            if (r === state.partsTargetRow) {
              rowAssignments.push({ row: r, song: target });
            } else {
              rowAssignments.push({ row: r, song: [herring1, herring2][herringIdx++] });
            }
          }
          state.partsSongsByRow = rowAssignments;
          state.songTitle = target.title;
        }
      }
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

  state.buzzedPlayer = playerId;
  state.phase = 'buzzed';
  state.visualEffect = 'buzz';
  return true;
}

export function markCorrect(state: GameState): void {
  if (!state.buzzedPlayer) return;
  state.players[state.buzzedPlayer].score += state.currentPrize;
  state.phase = 'result';
  state.visualEffect = 'correct';
  state.message = `CORRECT! ${formatMoney(state.currentPrize)}`;
  auctionClearTimer(state);
}

export function markWrong(state: GameState): void {
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

  // In auction, other player hears ALL 5 stems for same prize
  if (state.roundType === 'music-auction' && state.currentSong) {
    state.activeStems = state.currentSong.stems.map(s => s.id);
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
  state.anotherLevelSongConfigs = [];
  state.anotherLevelCurrentGroup = '';
}

// ============================================
// MUSIC AUCTION - Round specific
// ============================================

function setupAuctionOffers(state: GameState): void {
  if (!state.currentSong) return;

  // Create offers from each musician (up to 5)
  // 1 musician = $15k, 2 = $6k, 3 = $3k, 4 = $2k, 5 = $1k
  const prizeLadder = [15000, 6000, 3000, 2000, 1000];
  const stems = state.currentSong.stems;

  state.auctionOffers = stems.slice(0, 5).map((stem, i) => ({
    stemId: stem.id,
    instrument: stem.instrument,
    icon: stem.icon,
    color: stem.color,
    musicianCount: i + 1,
    prize: prizeLadder[i] || 1000,
    revealed: false,
  }));

  state.auctionCurrentOffer = -1;
  state.auctionHighlight = null;
}

export function auctionNextOffer(state: GameState): void {
  state.auctionCurrentOffer++;
  const offer = state.auctionOffers[state.auctionCurrentOffer];
  if (!offer) return;

  offer.revealed = true;

  // Highlight the corresponding cell on the wall
  // Map stem to a wall cell (use row 2 center for visual impact)
  const stemIndex = state.auctionCurrentOffer;
  // Place offers across row 2 (cells 6-10)
  const cellId = 6 + stemIndex;

  state.auctionHighlight = {
    cellId,
    offerText: `${formatMoney(offer.prize)}`,
  };

  state.message = `${offer.instrument}: "Just me for ${formatMoney(offer.prize)}!"`;
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
  state.phase = 'playing';
  state.auctionHighlight = null;
  state.buzzedPlayer = null;
  state.visualEffect = 'none';

  // Set prize based on winner's bid: fewer musicians = higher prize
  const prizes = roundPrizes['music-auction'];
  // prizes[0] = 1 musician prize ($15k), prizes[4] = 5 musicians ($1k)
  state.currentPrize = prizes[winnerBid - 1] || 1000;

  // Activate the winning number of stems
  if (state.currentSong) {
    if (winner === 'tied') {
      // Both hear same stems (bid count)
      state.activeStems = state.currentSong.stems.slice(0, winnerBid).map(s => s.id);
    } else {
      state.activeStems = state.currentSong.stems.slice(0, winnerBid).map(s => s.id);
    }
  }

  if (winner === 'tied') {
    state.message = `TIE! Both chose ${winnerBid} musician${winnerBid > 1 ? 's' : ''} — BUZZ RACE!`;
  } else {
    state.message = `${state.players[winner].name} wins with ${winnerBid} musician${winnerBid > 1 ? 's' : ''}!`;
  }

  return { winner, musicianCount: winnerBid };
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

// Map instrument name to a column index (0-4): drums, bass, keys, guitar, vocals
const INSTRUMENT_COL_MAP: Record<string, number> = {
  drums: 0,
  bass: 1,
  keys: 2, piano: 2,
  guitar: 3,
  vocals: 4, 'backing vocals': 4,
};

function getInstrumentCol(instrument: string): number {
  const lower = instrument.toLowerCase();
  for (const [key, col] of Object.entries(INSTRUMENT_COL_MAP)) {
    if (lower.includes(key)) return col;
  }
  return -1; // unknown instrument
}

// Namespace stem IDs per row: row 1 = 101+, row 2 = 201+, row 3 = 301+
export function namespaceStemId(row: number, stemId: number): number {
  return row * 100 + stemId;
}

function setupSongParts(state: GameState): void {
  if (state.partsSongsByRow.length === 0) return;

  const parts: SongPart[] = [];
  // Column order: drums(0), bass(1), keys(2), guitar(3), vocals(4)
  // For each column, iterate rows 1-3 top to bottom
  // This gives: R1-drums, R2-drums, R3-drums, R1-bass, R2-bass, R3-bass, ...
  const colNames = ['Drums', 'Bass', 'Keys', 'Guitar', 'Vocals'];

  for (let col = 0; col < 5; col++) {
    for (let row = 1; row <= 3; row++) {
      const entry = state.partsSongsByRow.find(e => e.row === row);
      if (!entry) continue;

      // Find the stem in this song that maps to this column
      const stem = entry.song.stems.find(s => getInstrumentCol(s.instrument) === col);
      if (!stem) continue; // song doesn't have this instrument

      const nsId = namespaceStemId(row, stem.id);
      parts.push({
        partIndex: parts.length,
        label: `${colNames[col]} - Row ${row}`,
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

  // When moving to a different row, fade out all stems from the previous row
  if (prevPart && prevPart.row !== part.row) {
    const oldRowStems = state.songParts
      .filter(p => p.row === prevPart.row && p.isPlayed)
      .flatMap(p => p.stemIds);
    for (const stemId of oldRowStems) {
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
