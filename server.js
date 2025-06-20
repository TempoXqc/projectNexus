import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';

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

function loadCards() {
  const deckLists = JSON.parse(fs.readFileSync('deckLists.json', 'utf8'));
  const allCards = JSON.parse(fs.readFileSync('cards.json', 'utf8'));
  return { deckLists, allCards };
}

function getRandomDecks() {
  const allDecks = ['assassin', 'celestial', 'dragon', 'wizard', 'vampire', 'viking', 'engine', 'samurai'];
  const shuffledDecks = [...allDecks].sort(() => 0.5 - Math.random());
  return shuffledDecks.slice(0, 4);
}

io.on('connection', (socket) => {
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
            opponentGraveyard: [],
            mustDiscard: false,
            hasPlayedCard: false
          },
          player2: {
            hand: [],
            field: Array(8).fill(null),
            opponentField: Array(8).fill(null),
            deck: [],
            graveyard: [],
            opponentGraveyard: [],
            mustDiscard: false,
            hasPlayedCard: false
          },
          turn: 1,
          activePlayer: socket.id,
          cardsPlayed: 0
        },
        deckChoices: { 1: null, 2: [] },
        availableDecks: getRandomDecks(), // Liste fixe de 4 decks pour la partie
      };
      players[socket.id] = { gameId, playerId: 1 };
      socket.emit('gameStart', { playerId: 1, chatHistory: [] });
      io.to(gameId).emit('initialDeckList', games[gameId].availableDecks); // Envoi de la liste aux deux joueurs
    } else if (games[gameId].players.length < 2) {
      games[gameId].players.push(socket.id);
      players[socket.id] = { gameId, playerId: 2 };
      socket.emit('gameStart', { playerId: 2, chatHistory: games[gameId].chatHistory });
      io.to(gameId).emit('playerJoined', { playerId: 2 });
      io.to(gameId).emit('initialDeckList', games[gameId].availableDecks); // Envoi de la même liste au joueur 2
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

    if (game.state[playerKey].hasPlayedCard) {
      console.log(`[SERVER] ${playerKey} a déjà joué une carte ce tour`);
      return;
    }

    game.state[playerKey].field[fieldIndex] = card;
    game.state[playerKey].hand = game.state[playerKey].hand.filter((c) => c.id !== card.id);
    game.state[playerKey].hasPlayedCard = true;
    game.state[opponentKey].opponentField = game.state[playerKey].field;

    game.state.cardsPlayed += 1;

    if (game.state.cardsPlayed === 2) {
      game.state.cardsPlayed = 0;
      game.state.player1.hasPlayedCard = false;
      game.state.player2.hasPlayedCard = false;
      game.state.turn += 1;
      game.state.activePlayer = game.players[0];
    } else {
      game.state.activePlayer = game.players.find((id) => id !== socket.id);
    }

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
    const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
    game.state[playerKey] = { ...game.state[playerKey], ...state };
    game.state[opponentKey].opponentGraveyard = game.state[playerKey].graveyard;
    game.state[opponentKey].hand = game.state[opponentKey].hand || [];
    game.state[opponentKey].deck = game.state[opponentKey].deck || [];
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
      const allDeckIds = ['assassin', 'celestial', 'dragon', 'wizard', 'vampire', 'viking', 'engine', 'samurai'];
      const remaining = allDeckIds.find(id => !totalDecks.includes(id) && game.availableDecks.includes(id));
      console.log(`[SERVER] Deck restant: ${remaining}`);

      game.finalDecks = {
        player1DeckId: game.deckChoices[1],
        player2DeckIds: game.deckChoices[2],
        selectedDecks: [...totalDecks, remaining],
      };

      console.log(`[SERVER] Decks finaux:`, game.finalDecks);

      const { deckLists, allCards } = loadCards();
      const player1DeckIds = [game.finalDecks.player1DeckId, remaining];
      const player2DeckIds = game.finalDecks.player2DeckIds;

      const getDeckCards = (deckIds) => {
        const cardIds = deckIds.flatMap(deckId => deckLists[deckId] || []).filter(Boolean);
        return allCards.filter(card => cardIds.includes(card.id)).sort(() => Math.random() - 0.5);
      };

      const player1Cards = getDeckCards(player1DeckIds);
      const player2Cards = getDeckCards(player2DeckIds);

      const initialDraw = (cards) => {
        const drawn = cards.slice(0, 5);
        const rest = cards.slice(5);
        return { hand: drawn, deck: rest };
      };

      const player1Initial = initialDraw(player1Cards);
      const player2Initial = initialDraw(player2Cards);

      game.state.player1.hand = player1Initial.hand;
      game.state.player1.deck = player1Initial.deck;
      game.state.player2.hand = player2Initial.hand;
      game.state.player2.deck = player2Initial.deck;

      const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
      if (isBothReady) {
        console.log(`[SERVER] Émission de deckSelectionDone pour ${gameId}`);
        io.to(gameId).emit('deckSelectionDone', game.finalDecks);
        io.to(gameId).emit('updateGameState', game.state);
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
      io.to(gameId).emit('updateGameState', game.state);
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