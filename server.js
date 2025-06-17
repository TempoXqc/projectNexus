import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static('public')); // Servir les fichiers statiques (cards.json, images)

const games = {}; // Stocke l'état des parties (par ID de partie)
const players = {}; // Associe les sockets aux joueurs

io.on('connection', (socket) => {
  console.log('Nouveau joueur connecté:', socket.id);

  // Rejoindre une partie
  socket.on('joinGame', (gameId) => {
    if (!games[gameId]) {
      games[gameId] = {
        players: [socket.id],
        chatHistory: [], // Ajouter l'historique du chat
        state: {
          player1: { hand: [], field: Array(8).fill(null), deck: [], graveyard: [] },
          player2: { hand: [], field: Array(8).fill(null), deck: [], graveyard: [] },
          turn: 1,
          activePlayer: socket.id
        }
      };
    } else if (games[gameId].players.length < 2) {
      games[gameId].players.push(socket.id);
      // Envoyer l'état initial et l'historique du chat aux deux joueurs
      io.to(socket.id).emit('gameStart', { opponentId: games[gameId].players[0], chatHistory: games[gameId].chatHistory });
      io.to(games[gameId].players[0]).emit('gameStart', { opponentId: socket.id, chatHistory: games[gameId].chatHistory });
    } else {
      socket.emit('error', 'La partie est pleine');
      return;
    }
    players[socket.id] = { gameId, playerId: games[gameId].players.length };
  });

  // Jouer une carte
  socket.on('playCard', ({ gameId, card, fieldIndex }) => {
    const game = games[gameId];
    if (!game || game.state.activePlayer !== socket.id) return;
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    game.state[playerKey].field[fieldIndex] = card;
    game.state[playerKey].hand = game.state[playerKey].hand.filter(c => c.id !== card.id);
    io.to(game.players[0]).emit('updateGameState', game.state);
    io.to(game.players[1]).emit('updateGameState', game.state);
    game.state.activePlayer = game.players.find(id => id !== socket.id);
    game.state.turn += 1;
    io.to(game.state.activePlayer).emit('yourTurn');
  });

  // Envoyer un message de chat
  socket.on('sendMessage', ({ gameId, message }) => {
    const playerId = players[socket.id].playerId;
    const chatMessage = { playerId, message };
    games[gameId].chatHistory.push(chatMessage); // Ajouter à l'historique
    io.to(games[gameId].players[0]).emit('chatMessage', chatMessage);
    io.to(games[gameId].players[1]).emit('chatMessage', chatMessage);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    const gameId = players[socket.id]?.gameId;
    if (gameId && games[gameId]) {
      const opponentId = games[gameId].players.find(id => id !== socket.id);
      if (opponentId) {
        io.to(opponentId).emit('opponentDisconnected');
      }
      delete games[gameId];
      delete players[socket.id];
    }
    console.log('Joueur déconnecté:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});