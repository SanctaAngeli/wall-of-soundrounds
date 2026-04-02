import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { createInitialState } from './gameState.js';
import { setupSocketHandlers } from './socketHandlers.js';

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

// Serve the built client (SPA) if dist folder exists
import { existsSync } from 'fs';
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
  console.log(`  Host:      ${base}/host`);
  console.log('');
  console.log('===========================================');
  console.log('');
});
