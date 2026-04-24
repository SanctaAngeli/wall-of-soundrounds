import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { existsSync } from 'fs';
import { createInitialState } from './gameState.js';
import { setupSocketHandlers } from './socketHandlers.js';
import { songLibrary, roundSongSets, anotherLevelSongs, partsColumnQuestions } from './data/songs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Serve audio files from the symlinked/public directory
const publicDir = path.join(__dirname, '..', 'public');
app.use('/audio', express.static(path.join(publicDir, 'audio')));

// Scrub the library at startup: drop any stem whose audio file doesn't actually exist on disk.
// This prevents the UI from showing ghost "Horns" toggles for songs without horns etc., and
// stops R3 auction offers / R4 scatter from pulling stems that would play silence.
{
  let dropped = 0;
  const songFolders = path.join(publicDir, 'audio', 'songs');
  for (const song of songLibrary) {
    const folder = path.join(songFolders, song.id);
    const exists = (file: string) => existsSync(path.join(folder, file));
    const beforePrimary = song.stems.length;
    const beforeExtras = song.extraStems?.length ?? 0;
    song.stems = song.stems.filter(s => exists(s.file));
    if (song.extraStems) song.extraStems = song.extraStems.filter(s => exists(s.file));
    // Detect pre-rendered prove-out file. If present, the prove-out host button will load and
    // play this single MP3 instead of fading all stems in — matches producer expectation of
    // hearing the actual full mix the band recorded. PROVE_OUT.mp3 beats FULL.mp3 if both
    // exist (future-proofs a dedicated prove-out file alongside the import-script FULL mix).
    if (exists('PROVE_OUT.mp3')) song.proveOutFile = 'PROVE_OUT.mp3';
    else if (exists('FULL.mp3')) song.proveOutFile = 'FULL.mp3';
    dropped += (beforePrimary - song.stems.length) + (beforeExtras - (song.extraStems?.length ?? 0));
  }
  if (dropped > 0) console.log(`[library] filtered out ${dropped} declared-but-missing stem file(s)`);
  const withProveOut = songLibrary.filter(s => s.proveOutFile).length;
  if (withProveOut > 0) console.log(`[library] ${withProveOut} song(s) have a prove-out full mix`);
}

// Full song library for /setup — returns every song with its full stem list.
app.get('/api/library', (_req, res) => {
  res.json({
    songs: songLibrary,
    defaults: {
      roundLineups: roundSongSets,
      anotherLevelGroups: anotherLevelSongs.map(cfg => ({ group: cfg.group, songId: cfg.songId, instruments: cfg.stemInstruments, prize: cfg.prize })),
      partsColumns: partsColumnQuestions,
    },
  });
});

// Serve the built client (SPA) if dist folder exists
const clientDist = path.join(__dirname, '..', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // All routes serve the SPA (must be after other routes)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Initialize game state and socket handlers
const gameState = createInitialState();
setupSocketHandlers(io, gameState);

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  // Get local network IP
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }

  const hasDist = existsSync(clientDist);
  const base = hasDist
    ? `http://${localIP}:${PORT}`
    : `http://localhost:5173`;

  console.log('');
  console.log('===========================================');
  console.log('  WALL OF SOUND - Multi-Screen Server');
  console.log('===========================================');
  console.log('');
  console.log(`  Server:    http://localhost:${PORT}`);
  console.log(`  Network:   http://${localIP}:${PORT}`);
  console.log('');
  console.log('  Open these URLs:');
  console.log(`  Wall:      ${base}/wall`);
  console.log(`  Player 1:  ${base}/player/1`);
  console.log(`  Player 2:  ${base}/player/2`);
  console.log(`  Player 3:  ${base}/player/3`);
  console.log(`  Host:      ${base}/host`);
  console.log(`  Setup:     ${base}/setup`);
  console.log('');
  console.log('===========================================');
  console.log('');
});
