import 'dotenv/config';
/* global process */
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import GameState from './gameState.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const game = new GameState();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinMatch', (data) => {
    if (game.lobbyState !== 'waiting') {
      socket.emit('error', { message: 'Battle already in progress.' });
      return;
    }
    const player = game.addPlayer(socket.id, data.name);
    if (player) {
      socket.emit('assignedCountry', player.country);
      io.emit('gameState', game.getSnapshot());
    } else {
      socket.emit('lobbyFull');
    }
  });

  socket.on('toggleReady', () => {
    if (game.toggleReady(socket.id)) {
      io.emit('gameState', game.getSnapshot());

      // Try auto-start if everyone's ready
      if (game.startMatch()) {
        io.emit('gameState', game.getSnapshot());
        io.emit('gameStarted');
      }
    }
  });

  socket.on('submitQuiz', (data) => {
    game.handleQuiz(socket.id, data.correct, data.timeTaken);
  });

  socket.on('buyItem', (data) => {
    const success = game.buyFromMarket(socket.id, data.itemId);
    if (success) io.emit('gameState', game.getSnapshot());
  });

  socket.on('researchItem', (data) => {
    const success = game.startResearch(socket.id, data.itemId);
    if (success) socket.emit('notification', { message: 'Research Started...' });
  });

  socket.on('spy', (options) => {
    const result = game.deploySpy(socket.id, options.targetId, options);
    if (result !== null) {
      socket.emit('spyResult', { target: options.targetId, ...result });
    }
  });

  socket.on('activateDeflect', () => {
    const success = game.activateDeflect(socket.id);
    if (success) {
      socket.emit('notification', { message: 'Cyber Shield Active! (10s)' });
      io.emit('gameState', game.getSnapshot());
    }
  });

  socket.on('attack', (data) => {
    const elapsed = Date.now() - game.startTime;
    if (game.getPhase(elapsed) === 2) {
      const result = game.attack(socket.id, data.targetId, data.itemId);
      io.emit('attackEvent', {
        attacker: socket.id,
        target: data.targetId,
        itemId: data.itemId,
        ...result
      });
      io.emit('gameState', game.getSnapshot());
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    game.removePlayer(socket.id);

    if (Object.keys(game.players).length === 0) {
      game.resetGame();
    } else {
      if (game.lobbyState === 'active') {
        const alive = Object.values(game.players).filter((p) => p.hp > 0);
        if (alive.length <= 1) {
          game.lobbyState = 'ended';
        }
      }
    }
    io.emit('gameState', game.getSnapshot());
  });
});

// Game Loop: 500ms sync ticks
setInterval(() => {
  game.tick(io);
  io.emit('gameState', game.getSnapshot());
}, 500);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
