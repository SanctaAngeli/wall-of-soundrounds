import type { Server, Socket } from 'socket.io';
import type { AudioCommand, RoundType, Stem } from '../shared/types.js';
import { namespaceStemId } from './gameState.js';
import {
  GameState,
  deriveWallState,
  derivePlayerState,
  deriveHostState,
  selectRound,
  loadSong,
  addMusician,
  setStem,
  revealAll,
  revealSong,
  playerBuzz,
  markCorrect,
  markWrong,
  giveToOtherPlayer,
  nextSong,
  adjustScore,
  setPlayerName,
  endRound,
  resetGame,
  backToLobby,
  auctionNextOffer,
  auctionStartBidding,
  auctionPlayerBid,
  auctionRevealBids,
  auctionStartMusic,
  auctionClearTimer,
  partsNext,
  partsPlayCurrent,
  anotherLevelSelectGroup,
  anotherLevelBackToBoard,
  partsStartColumn,
  partsTickCell,
  partsRevealForfeit,
  partsClearTimer,
  setRoundLineup,
  setAnotherLevelGroupSong,
  setPartsColumnOverride,
  setStemOrderForSong,
  setAuctionOverride,
  resetConfig,
  importConfig,
} from './gameState.js';

// Track which sockets belong to which role
interface SocketMeta {
  role: 'wall' | 'player' | 'host';
  playerId?: 1 | 2;
}

const socketMeta = new Map<string, SocketMeta>();

// Broadcast state to all connected screens
function broadcastState(io: Server, state: GameState) {
  const wallState = deriveWallState(state);
  const player1State = derivePlayerState(state, 1);
  const player2State = derivePlayerState(state, 2);
  const hostState = deriveHostState(state);

  // Send to each room
  io.to('wall').emit('wall:state', wallState);
  io.to('player-1').emit('player:state', player1State);
  io.to('player-2').emit('player:state', player2State);
  io.to('host').emit('host:state', hostState);
}

// Send audio command to ALL screens
function sendAudioCommand(io: Server, command: AudioCommand) {
  io.emit('wall:audio', command);
}

// Send load-multi command for Song in 5 Parts — NEW per-column-target model.
// Emits 15 cell-stems (5 cols × 3 rows), each with a unique ID = (col+1)*100 + row.
// Each cell is its own one-stem "song" entry so load-multi can download per-cell audio.
function sendPartsLoadCommand(io: Server, state: GameState) {
  if (state.partsColumnSongs.length === 0 || state.partsScatter.length === 0) return;

  type LoadEntry = { songId: string; stems: any[]; row: number };
  const entries: LoadEntry[] = [];

  for (const slot of state.partsScatter) {
    // Look up this cell's song from the column's target/decoy bundle
    const colBundle = state.partsColumnSongs.find(c => c.col === slot.col);
    if (!colBundle) continue;
    const song = slot.songIndex === 0 ? colBundle.target
               : slot.songIndex === 1 ? colBundle.decoys[0]
               : colBundle.decoys[1];
    // The cell plays its column's instrument (Vocals=col0 … Drums=col4)
    const stem = song.stems.find(s => {
      const i = s.instrument.toLowerCase();
      if (slot.col === 0) return i.includes('vocal');
      if (slot.col === 1) return i.includes('guitar');
      if (slot.col === 2) return i.includes('key') || i.includes('piano');
      if (slot.col === 3) return i.includes('bass') && !i.includes('vocal');
      if (slot.col === 4) return i.includes('drum');
      return false;
    });
    if (!stem) continue;
    entries.push({
      songId: song.id,
      stems: [{ ...stem, id: namespaceStemId(slot.col + 1, slot.row) }],
      row: slot.col + 1,
    });
  }

  sendAudioCommand(io, { action: 'load-multi', songs: entries });
}

export function setupSocketHandlers(io: Server, state: GameState) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Registration
    socket.on('register', (data: { role: string; playerId?: number }) => {
      const meta: SocketMeta = { role: data.role as 'wall' | 'player' | 'host' };

      if (data.role === 'player' && data.playerId) {
        meta.playerId = data.playerId as 1 | 2;
        socket.join(`player-${data.playerId}`);
        state.players[meta.playerId].connected = true;
        if (meta.playerId === 1) state.connections.player1 = true;
        if (meta.playerId === 2) state.connections.player2 = true;
        console.log(`  -> Registered as Player ${data.playerId}`);
      } else if (data.role === 'wall') {
        socket.join('wall');
        state.connections.wall++;
        console.log('  -> Registered as Wall display');
      } else if (data.role === 'host') {
        socket.join('host');
        state.connections.host++;
        console.log('  -> Registered as Host');
      }

      socketMeta.set(socket.id, meta);
      socket.emit('connected', { role: data.role, clientCount: io.engine.clientsCount });
      broadcastState(io, state);
    });

    // ============================================
    // PLAYER EVENTS
    // ============================================

    socket.on('player:buzz', (data: { playerId: 1 | 2 }) => {
      const success = playerBuzz(state, data.playerId);
      if (success) {
        // Stop audio on buzz
        state.isAudioPlaying = false;
        sendAudioCommand(io, { action: 'pause' });
        auctionClearTimer(state);
        broadcastState(io, state);
      }
    });

    socket.on('player:set-name', (data: { playerId: 1 | 2; name: string }) => {
      setPlayerName(state, data.playerId, data.name);
      broadcastState(io, state);
    });

    // ============================================
    // HOST EVENTS
    // ============================================

    // Helper: for R3 (music-auction) load BOTH primary + extra stems so horns/BVs/LVs actually
    // produce audio when they appear in auction offers. Other rounds use primary stems only.
    const stemsForRound = () => {
      if (!state.currentSong) return [];
      return state.roundType === 'music-auction'
        ? [...state.currentSong.stems, ...(state.currentSong.extraStems ?? [])]
        : state.currentSong.stems;
    };

    socket.on('host:select-round', (data: { round: RoundType }) => {
      // Stop any audio from the previous round
      sendAudioCommand(io, { action: 'stop' });
      selectRound(state, data.round);
      // Send audio load command
      if (data.round === 'song-in-5-parts') {
        sendPartsLoadCommand(io, state);
      } else if (state.currentSong) {
        sendAudioCommand(io, {
          action: 'load',
          songId: state.currentSong.id,
          stems: stemsForRound(),
        });
      }
      broadcastState(io, state);
    });

    socket.on('host:load-song', (data: { songIndex: number }) => {
      loadSong(state, data.songIndex);
      if (state.roundType === 'song-in-5-parts') {
        sendPartsLoadCommand(io, state);
      } else if (state.currentSong) {
        sendAudioCommand(io, {
          action: 'load',
          songId: state.currentSong.id,
          stems: stemsForRound(),
        });
      }
      broadcastState(io, state);
    });

    socket.on('host:play', () => {
      state.isAudioPlaying = true;
      // Don't override auction/parts phases
      if (state.phase === 'round-intro' || state.phase === 'result' || state.phase === 'parts-intro') {
        state.phase = state.roundType === 'song-in-5-parts' ? 'parts-playing' : 'playing';
      } else if (state.phase !== 'auction-offers' && state.phase !== 'auction-bidding' && state.phase !== 'auction-reveal' && state.phase !== 'parts-playing') {
        state.phase = 'playing';
      }
      // Reset buzz state when resuming play so both players can buzz again
      state.buzzedPlayer = null;
      state.visualEffect = 'none';
      sendAudioCommand(io, { action: 'play' });
      // Stems load at gain=0 (muted). Any round that pre-activates stems at loadSong/select
      // time (R1 5to1, R2 another-level) must fade them in explicitly on play, else silence.
      for (const stemId of state.activeStems) {
        sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 100 });
      }
      broadcastState(io, state);
    });

    socket.on('host:pause', () => {
      state.isAudioPlaying = false;
      sendAudioCommand(io, { action: 'pause' });
      broadcastState(io, state);
    });

    socket.on('host:stop', () => {
      state.isAudioPlaying = false;
      sendAudioCommand(io, { action: 'stop' });
      broadcastState(io, state);
    });

    socket.on('host:add-musician', () => {
      const newStemId = addMusician(state);
      if (newStemId !== null) {
        // If adding a musician after a result, resume playing state
        if (state.phase === 'result' || state.phase === 'buzzed' || state.phase === 'judging') {
          state.phase = 'playing';
          state.buzzedPlayer = null;
          state.visualEffect = 'none';
        }
        sendAudioCommand(io, { action: 'fade-in-stem', stemId: newStemId, duration: 400 });
        broadcastState(io, state);
      }
    });

    socket.on('host:set-stem', (data: { stemId: number; active: boolean }) => {
      setStem(state, data.stemId, data.active);
      if (data.active) {
        sendAudioCommand(io, { action: 'fade-in-stem', stemId: data.stemId, duration: 400 });
      } else {
        sendAudioCommand(io, { action: 'fade-out-stem', stemId: data.stemId, duration: 400 });
      }
      broadcastState(io, state);
    });

    socket.on('host:reveal-song', () => {
      revealSong(state);
      broadcastState(io, state);
    });

    // ============================================
    // SETUP / CONFIG EVENTS
    // ============================================

    socket.on('host:config-set-round-lineup', (data: { round: RoundType; songIds: string[] }) => {
      setRoundLineup(state, data.round, data.songIds);
      broadcastState(io, state);
    });

    socket.on('host:config-set-al-group-song', (data: { group: string; songId: string }) => {
      setAnotherLevelGroupSong(state, data.group, data.songId);
      broadcastState(io, state);
    });

    socket.on('host:config-set-parts-column', (data: { col: number; targetSongId: string; decoy1SongId: string; decoy2SongId: string }) => {
      setPartsColumnOverride(state, data.col, data.targetSongId, data.decoy1SongId, data.decoy2SongId);
      broadcastState(io, state);
    });

    socket.on('host:config-set-stem-order', (data: { songId: string; stemIds: number[] }) => {
      setStemOrderForSong(state, data.songId, data.stemIds);
      broadcastState(io, state);
    });

    socket.on('host:config-set-auction-override', (data: { songId: string; title?: string; genre?: string }) => {
      setAuctionOverride(state, data.songId, data.title, data.genre);
      broadcastState(io, state);
    });

    socket.on('host:config-reset', () => {
      resetConfig(state);
      broadcastState(io, state);
    });

    socket.on('host:config-import', (data: { json: string }) => {
      try {
        const parsed = JSON.parse(data.json);
        importConfig(state, parsed);
        broadcastState(io, state);
      } catch (err) {
        console.error('[config-import] invalid JSON:', err);
      }
    });

    socket.on('host:reveal-all', () => {
      const newStems = revealAll(state);
      if (newStems.length > 0) {
        sendAudioCommand(io, { action: 'fade-all-in', duration: 400 });
      }
      broadcastState(io, state);
    });

    socket.on('host:mark-correct', () => {
      markCorrect(state);
      // R4: column won — audio stays paused. Host presses "Next Column" to advance.
      if (state.roundType === 'song-in-5-parts') {
        sendAudioCommand(io, { action: 'pause' });
      }
      broadcastState(io, state);
    });

    socket.on('host:mark-wrong', () => {
      markWrong(state);
      // R4: buzzer was locked; resume the same cell at full gain (host advances manually)
      if (state.roundType === 'song-in-5-parts' && state.phase === 'parts-playing') {
        sendAudioCommand(io, { action: 'play' });
        const stemId = state.activeStems[0];
        if (stemId != null) {
          sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 200 });
        }
      }
      broadcastState(io, state);
    });

    socket.on('host:give-to-other', () => {
      giveToOtherPlayer(state);
      // In auction, giveToOtherPlayer already sets all 5 stems
      // For other rounds, reveal all stems
      if (state.roundType !== 'music-auction') {
        const newStems = revealAll(state);
        if (newStems.length > 0) {
          sendAudioCommand(io, { action: 'fade-all-in', duration: 400 });
        }
      } else {
        // Fade in all stems for auction
        sendAudioCommand(io, { action: 'fade-all-in', duration: 400 });
      }
      // Resume audio
      state.isAudioPlaying = true;
      sendAudioCommand(io, { action: 'play' });
      broadcastState(io, state);
    });

    socket.on('host:next-song', () => {
      sendAudioCommand(io, { action: 'stop' });
      auctionClearTimer(state);
      const hasMore = nextSong(state);
      if (hasMore) {
        if (state.roundType === 'song-in-5-parts') {
          sendPartsLoadCommand(io, state);
        } else if (state.currentSong) {
          sendAudioCommand(io, {
            action: 'load',
            songId: state.currentSong.id,
            stems: state.currentSong.stems,
          });
        }
      }
      broadcastState(io, state);
    });

    socket.on('host:adjust-score', (data: { player: 1 | 2; delta: number }) => {
      adjustScore(state, data.player, data.delta);
      broadcastState(io, state);
    });

    socket.on('host:end-round', () => {
      state.isAudioPlaying = false;
      sendAudioCommand(io, { action: 'stop' });
      endRound(state);
      broadcastState(io, state);
    });

    socket.on('host:back-to-lobby', () => {
      state.isAudioPlaying = false;
      sendAudioCommand(io, { action: 'stop' });
      backToLobby(state);
      broadcastState(io, state);
    });

    socket.on('host:reset', () => {
      sendAudioCommand(io, { action: 'stop' });
      resetGame(state);
      broadcastState(io, state);
    });

    socket.on('host:test-tone', () => {
      sendAudioCommand(io, { action: 'test-tone' });
    });

    // ============================================
    // ANOTHER LEVEL EVENTS
    // ============================================

    socket.on('host:al-select-group', (data: { group: string }) => {
      const { stemIds } = anotherLevelSelectGroup(state, data.group);
      if (state.currentSong) {
        // Load the song's audio, then fade in just the picked group's stems.
        sendAudioCommand(io, {
          action: 'load',
          songId: state.currentSong.id,
          stems: state.currentSong.stems,
        });
        setTimeout(() => {
          for (const stemId of stemIds) {
            sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 100 });
          }
          broadcastState(io, state);
        }, 300);
      }
      broadcastState(io, state);
    });

    socket.on('host:al-back-to-board', () => {
      sendAudioCommand(io, { action: 'stop' });
      anotherLevelBackToBoard(state);
      broadcastState(io, state);
    });

    // ============================================
    // MUSIC AUCTION EVENTS
    // ============================================

    socket.on('host:auction-next-offer', () => {
      auctionNextOffer(state);
      broadcastState(io, state);
    });

    socket.on('host:auction-start-bidding', () => {
      auctionStartBidding(state);
      broadcastState(io, state);
    });

    socket.on('player:auction-bid', (data: { playerId: 1 | 2; musicianCount: number }) => {
      auctionPlayerBid(state, data.playerId, data.musicianCount);
      broadcastState(io, state);
    });

    socket.on('host:auction-reveal-bids', () => {
      auctionRevealBids(state);
      // Preload audio so the next step (host:auction-start-music) can play immediately,
      // but DON'T start playback yet. Host gets a clear beat to present the bids + winner
      // before pressing PLAY MUSIC.
      if (state.currentSong) {
        sendAudioCommand(io, {
          action: 'load',
          songId: state.currentSong.id,
          stems: stemsForRound(),
        });
      }
      broadcastState(io, state);
    });

    socket.on('host:auction-start-music', () => {
      const stems = auctionStartMusic(state);
      for (const stemId of stems) {
        sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 200 });
      }
      sendAudioCommand(io, { action: 'play' });

      // Start 30-second buzz timer for solo winners (tied pairs race without a timer cap)
      if (state.auctionWinner !== 'tied') {
        state.auctionTimerValue = 30;
        state.auctionTimerInterval = setInterval(() => {
          if (state.auctionTimerValue !== null && state.auctionTimerValue > 0) {
            state.auctionTimerValue--;
            broadcastState(io, state);
          } else {
            auctionClearTimer(state);
            broadcastState(io, state);
          }
        }, 1000);
      }
      broadcastState(io, state);
    });

    // ============================================
    // SONG IN 5 PARTS EVENTS
    // ============================================

    // ============================================
    // SONG IN 5 PARTS v2 — column-hunt mechanic
    // ============================================

    // R4 uses manual cell advancement — host presses "NEXT STEM" to move on.
    // No server-side auto-timer; host controls pacing to handle dead-air stems etc.
    const PARTS_FADE_MS = 150;

    socket.on('host:parts-start-column', (data: { col: number }) => {
      // Silence everything first so no stem from a previous column bleeds into this one.
      sendAudioCommand(io, { action: 'fade-all-out', duration: PARTS_FADE_MS });
      const stemId = partsStartColumn(state, data.col);
      if (stemId != null) sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 300 });
      sendAudioCommand(io, { action: 'play' });
      broadcastState(io, state);
    });

    socket.on('host:parts-next-stem', () => {
      const { fadeOut, fadeIn, forfeit } = partsTickCell(state);
      for (const id of fadeOut) sendAudioCommand(io, { action: 'fade-out-stem', stemId: id, duration: PARTS_FADE_MS });
      for (const id of fadeIn) sendAudioCommand(io, { action: 'fade-in-stem', stemId: id, duration: PARTS_FADE_MS });
      if (forfeit) {
        // After 2 manual passes, force a reveal if host keeps advancing without judgment
        sendAudioCommand(io, { action: 'fade-all-out', duration: 200 });
        const targetStemId = partsRevealForfeit(state);
        if (targetStemId != null) sendAudioCommand(io, { action: 'fade-in-stem', stemId: targetStemId, duration: 400 });
      }
      broadcastState(io, state);
    });

    socket.on('host:parts-next-column', () => {
      const current = state.partsCurrentCol;
      const nextCol = current + 1;
      partsClearTimer(state);
      // Hard-mute all stems before moving on — otherwise stems from the column we just left
      // keep sounding (their gain was never reset) and overlap the next column's cell.
      sendAudioCommand(io, { action: 'fade-all-out', duration: 200 });
      if (nextCol >= 5) {
        sendAudioCommand(io, { action: 'pause' });
        state.phase = 'round-complete';
        state.activeStems = [];
        state.isAudioPlaying = false;
      } else {
        const stemId = partsStartColumn(state, nextCol);
        if (stemId != null) sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 300 });
        sendAudioCommand(io, { action: 'play' });
      }
      broadcastState(io, state);
    });

    socket.on('host:parts-reveal', () => {
      // Manually reveal the target cell (host calls this to end a column early, e.g. give up)
      partsClearTimer(state);
      // Drop everything that's ringing, then solo the target stem
      sendAudioCommand(io, { action: 'fade-all-out', duration: 200 });
      const targetStemId = partsRevealForfeit(state);
      if (targetStemId != null) sendAudioCommand(io, { action: 'fade-in-stem', stemId: targetStemId, duration: 400 });
      broadcastState(io, state);
    });

    socket.on('host:parts-next', () => {
      const { fadeOut, fadeIn } = partsNext(state);
      // Fade out old row's stems when switching rows
      for (const stemId of fadeOut) {
        sendAudioCommand(io, { action: 'fade-out-stem', stemId, duration: 300 });
      }
      // Fade in the new cell's stem
      for (const stemId of fadeIn) {
        sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 400 });
      }
      broadcastState(io, state);
    });

    socket.on('host:parts-play-current', () => {
      partsPlayCurrent(state);
      sendAudioCommand(io, { action: 'play' });
      broadcastState(io, state);
    });

    // ============================================
    // DISCONNECT
    // ============================================

    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta) {
        if (meta.role === 'wall') state.connections.wall--;
        if (meta.role === 'host') state.connections.host--;
        if (meta.role === 'player' && meta.playerId) {
          state.players[meta.playerId].connected = false;
          if (meta.playerId === 1) state.connections.player1 = false;
          if (meta.playerId === 2) state.connections.player2 = false;
        }
        socketMeta.delete(socket.id);
      }
      console.log(`Client disconnected: ${socket.id}`);
      broadcastState(io, state);
    });
  });
}
