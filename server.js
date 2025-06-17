import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://projectnexus-nynw.onrender.com',
      'https://projectnexus-staging.up.railway.app',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(cors());
app.use(express.static('public'));

const games = {};
const players = {};

io.on('connection', (socket) => {
  console.log('Nouveau joueur connecté:', socket.id);

  socket.on('joinGame', (gameId) => {
    console.log(`Joueur ${socket.id} rejoint la partie ${gameId}`);
    socket.join(gameId);

    if (!games[gameId]) {
      games[gameId] = {
        players: [socket.id],
        chatHistory: [], // Assuré d'être un tableau vide
        state: {
          player1: { hand: [], field: Array(8).fill(null), deck: [], graveyard: [], mustDiscard: false },
          player2: { hand: [], field: Array(8).fill(null), deck: [], graveyard: [], mustDiscard: false },
          turn: 1,
          activePlayer: socket.id,
        },
      };
      players[socket.id] = { gameId, playerId: 1 };
      socket.emit('gameStart', { playerId: 1, chatHistory: games[gameId].chatHistory || [] });
    } else if (games[gameId].players.length < 2) {
      games[gameId].players.push(socket.id);
      players[socket.id] = { gameId, playerId: 2 };
      socket.emit('gameStart', { playerId: 2, chatHistory: games[gameId].chatHistory || [] });
      io.to(gameId).emit('playerJoined', { playerId: 2 });
    } else {
      socket.emit('error', 'La partie est pleine');
      return;
    }
    console.log(`Joueurs dans la partie ${gameId}: ${games[gameId].players}`);
  });

  socket.on('playCard', ({ gameId, card, fieldIndex }) => {
    const game = games[gameId];
    if (!game || game.state.activePlayer !== socket.id) return;
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    game.state[playerKey].field[fieldIndex] = card;
    game.state[playerKey].hand = game.state[playerKey].hand.filter((c) => c.id !== card.id);
    game.state.activePlayer = game.players.find((id) => id !== socket.id);
    game.state.turn += 1;
    io.to(gameId).emit('updateGameState', game.state);
    io.to(game.state.activePlayer).emit('yourTurn');
  });

  socket.on('sendMessage', ({ gameId, message }) => {
    console.log(`Message reçu pour la partie ${gameId}:`, { playerId: players[socket.id].playerId, message });
    const playerId = players[socket.id].playerId;
    const chatMessage = { playerId, message };
    if (games[gameId]) {
      games[gameId].chatHistory.push(chatMessage);
      io.to(gameId).emit('chatMessage', chatMessage);
    } else {
      console.log(`Partie ${gameId} non trouvée pour le message`);
    }
  });

  socket.on('updateGameState', ({ gameId, state }) => {
    const game = games[gameId];
    if (!game) return;
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    Object.assign(game.state[playerKey], state);
    io.to(gameId).emit('updateGameState', game.state);
  });

  socket.on('passTurn', ({ gameId }) => {
    const game = games[gameId];
    if (!game) return;
    game.state.activePlayer = game.players.find((id) => id !== socket.id);
    game.state.turn += 1;
    io.to(gameId).emit('updateGameState', game.state);
    io.to(game.state.activePlayer).emit('yourTurn');
  });

  socket.on('disconnect', () => {
    const gameId = players[socket.id]?.gameId;
    if (gameId && games[gameId]) {
      const opponentId = games[gameId].players.find((id) => id !== socket.id);
      if (opponentId) {
        io.to(gameId).emit('opponentDisconnected');
      }
      delete games[gameId];
      delete players[socket.id];
    }
    console.log('Joueur déconnecté:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});