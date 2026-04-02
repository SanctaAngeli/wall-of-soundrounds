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
  auctionClearTimer,
  partsNext,
  partsPlayCurrent,
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

// Send load-multi command for Song in 5 Parts (3 songs, one per row)
function sendPartsLoadCommand(io: Server, state: GameState) {
  if (state.partsSongsByRow.length === 0) return;

  const songs = state.partsSongsByRow.map(entry => ({
    songId: entry.song.id,
    stems: entry.song.stems.map(s => ({
      ...s,
      id: namespaceStemId(entry.row, s.id), // namespace the IDs
    })),
    row: entry.row,
  }));

  sendAudioCommand(io, { action: 'load-multi', songs });
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
          stems: state.currentSong.stems,
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
          stems: state.currentSong.stems,
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
      // For Another Level, make sure pre-set stems are audible
      if (state.roundType === 'another-level') {
        for (const stemId of state.activeStems) {
          sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 100 });
        }
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

    socket.on('host:reveal-all', () => {
      const newStems = revealAll(state);
      if (newStems.length > 0) {
        sendAudioCommand(io, { action: 'fade-all-in', duration: 400 });
      }
      broadcastState(io, state);
    });

    socket.on('host:mark-correct', () => {
      markCorrect(state);
      broadcastState(io, state);
    });

    socket.on('host:mark-wrong', () => {
      markWrong(state);
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
      const { winner, musicianCount } = auctionRevealBids(state);

      // Load audio with the right stems
      if (state.currentSong) {
        sendAudioCommand(io, {
          action: 'load',
          songId: state.currentSong.id,
          stems: state.currentSong.stems,
        });
        // After loading, fade in the active stems and start playing
        setTimeout(() => {
          for (const stemId of state.activeStems) {
            sendAudioCommand(io, { action: 'fade-in-stem', stemId, duration: 100 });
          }
          state.isAudioPlaying = true;
          sendAudioCommand(io, { action: 'play' });

          // Start 30-second timer for solo winner (not tied)
          if (winner !== 'tied') {
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
        }, 500);
      }
      broadcastState(io, state);
    });

    // ============================================
    // SONG IN 5 PARTS EVENTS
    // ============================================

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
