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
const playerReadiness = {};

io.on('connection', (socket) => {
  console.log('Nouveau joueur connecté:', socket.id);

  socket.on('joinGame', (gameId) => {
    console.log(`Joueur ${socket.id} rejoint la partie ${gameId}`);
    socket.join(gameId);

    if (!games[gameId]) {
      games[gameId] = {
        players: [socket.id],
        chatHistory: [],
        state: {
          player1: {
            hand: [],
            field: Array(8).fill(null),
            opponentField: Array(8).fill(null),
            deck: [],
            graveyard: [],
            mustDiscard: false,
            hasPlayedCard: false // Ajout pour suivre si le joueur a joué
          },
          player2: {
            hand: [],
            field: Array(8).fill(null),
            opponentField: Array(8).fill(null),
            deck: [],
            graveyard: [],
            mustDiscard: false,
            hasPlayedCard: false // Ajout pour suivre si le joueur a joué
          },
          turn: 1,
          activePlayer: socket.id,
          cardsPlayed: 0 // Compteur pour suivre les cartes jouées dans un tour
        },
        deckChoices: { 1: null, 2: [] },
      };
      players[socket.id] = { gameId, playerId: 1 };
      socket.emit('gameStart', { playerId: 1, chatHistory: [] });
    } else if (games[gameId].players.length < 2) {
      games[gameId].players.push(socket.id);
      players[socket.id] = { gameId, playerId: 2 };
      socket.emit('gameStart', { playerId: 2, chatHistory: games[gameId].chatHistory });
      io.to(gameId).emit('playerJoined', { playerId: 2 });
    } else {
      socket.emit('error', 'La partie est pleine');
      return;
    }

    io.to(gameId).emit('deckSelectionUpdate', games[gameId].deckChoices);
    console.log(`Joueurs dans la partie ${gameId}: ${games[gameId].players}`);
  });

  socket.on('playCard', ({ gameId, card, fieldIndex }) => {
    const game = games[gameId];
    if (!game || game.state.activePlayer !== socket.id) return;
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';

    // Vérifier si le joueur a déjà joué une carte
    if (game.state[playerKey].hasPlayedCard) {
      console.log(`[SERVER] ${playerKey} a déjà joué une carte ce tour`);
      return;
    }

    // Mettre à jour le terrain et la main du joueur
    game.state[playerKey].field[fieldIndex] = card;
    game.state[playerKey].hand = game.state[playerKey].hand.filter((c) => c.id !== card.id);
    game.state[playerKey].hasPlayedCard = true;

    // Mettre à jour le terrain de l'adversaire
    game.state[opponentKey].opponentField = game.state[playerKey].field;

    // Incrémenter le compteur de cartes jouées
    game.state.cardsPlayed += 1;

    // Vérifier si les deux joueurs ont joué
    if (game.state.cardsPlayed === 2) {
      // Réinitialiser pour le prochain tour
      game.state.cardsPlayed = 0;
      game.state.player1.hasPlayedCard = false;
      game.state.player2.hasPlayedCard = false;
      game.state.turn += 1;
      // Le joueur 1 commence le prochain tour
      game.state.activePlayer = game.players[0]; // Joueur 1
    } else {
      // Passer au joueur suivant
      game.state.activePlayer = game.players.find((id) => id !== socket.id);
    }

    console.log(`[SERVER] Carte jouée par ${playerKey} à l'index ${fieldIndex}:`, card);
    console.log(`[SERVER] Main de ${playerKey} après jeu:`, game.state[playerKey].hand);
    console.log(`[SERVER] État du jeu mis à jour:`, game.state);

    io.to(gameId).emit('updateGameState', game.state);
    io.to(game.state.activePlayer).emit('yourTurn');
  });

  socket.on('sendMessage', ({ gameId, message }) => {
    const playerId = players[socket.id]?.playerId;
    const chatMessage = { playerId, message };
    if (games[gameId]) {
      games[gameId].chatHistory.push(chatMessage);
      io.to(gameId).emit('chatMessage', chatMessage);
    }
  });

  socket.on('updateGameState', ({ gameId, state }) => {
    const game = games[gameId];
    if (!game) return;
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    game.state[playerKey] = { ...game.state[playerKey], ...state };
    console.log(`[SERVER] État mis à jour pour ${playerKey}:`, game.state[playerKey]);
    io.to(gameId).emit('updateGameState', game.state);
  });

  socket.on('chooseDeck', ({ gameId, playerId, deckId }) => {
    const game = games[gameId];
    if (!game) {
      console.log(`[ERROR] Partie ${gameId} non trouvée`);
      return;
    }

    if (!game.deckChoices) game.deckChoices = { 1: null, 2: [] };

    if (playerId === 1 && !game.deckChoices[1]) {
      game.deckChoices[1] = deckId;
      console.log(`[SERVER] Joueur 1 a choisi le deck ${deckId}`);
    } else if (playerId === 2 && game.deckChoices[2].length < 2) {
      if (!game.deckChoices[2].includes(deckId) && deckId !== game.deckChoices[1]) {
        game.deckChoices[2].push(deckId);
        console.log(`[SERVER] Joueur 2 a ajouté le deck ${deckId}`);
      }
    }

    io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);
    console.log(`[SERVER] DeckChoices mis à jour:`, game.deckChoices);

    const totalDecks = [game.deckChoices[1], ...game.deckChoices[2]].filter(Boolean);
    console.log(`[SERVER] Total decks choisis:`, totalDecks);

    if (totalDecks.length === 3) {
      const allDeckIds = ['assassin', 'celestial', 'dragon', 'wizard'];
      const remaining = allDeckIds.find(id => !totalDecks.includes(id));
      console.log(`[SERVER] Deck restant: ${remaining}`);

      game.finalDecks = {
        player1DeckId: game.deckChoices[1],
        player2DeckIds: game.deckChoices[2],
        selectedDecks: [...totalDecks, remaining],
      };

      console.log(`[SERVER] Decks finaux:`, game.finalDecks);

      const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
      if (isBothReady) {
        console.log(`[SERVER] Émission de deckSelectionDone pour ${gameId}`);
        io.to(gameId).emit('deckSelectionDone', game.finalDecks);
        io.to(gameId).emit('bothPlayersReady');
      }
    }
  });

  socket.on('disconnect', () => {
    const gameId = players[socket.id]?.gameId;
    if (gameId && games[gameId]) {
      const opponentId = games[gameId].players.find((id) => id !== socket.id);
      if (opponentId) {
        io.to(opponentId).emit('opponentDisconnected');
      }
      delete games[gameId];
    }
    delete players[socket.id];
    console.log('Joueur déconnecté:', socket.id);
  });

  socket.on('playerReady', ({ gameId }) => {
    const playerInfo = players[socket.id];
    if (!playerInfo || playerInfo.gameId !== gameId) return;

    const playerId = playerInfo.playerId;

    if (!playerReadiness[gameId]) {
      playerReadiness[gameId] = { 1: false, 2: false };
    }

    playerReadiness[gameId][playerId] = true;
    io.to(gameId).emit('playerReady', { playerId });

    const isBothReady = playerReadiness[gameId][1] && playerReadiness[gameId][2];
    const finalDecks = games[gameId]?.finalDecks;

    if (isBothReady && finalDecks) {
      io.to(gameId).emit('deckSelectionDone', finalDecks);
      io.to(gameId).emit('bothPlayersReady');
    } else if (isBothReady) {
      console.log('[SERVER] Les deux joueurs sont prêts mais les decks ne sont pas encore valides.');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});