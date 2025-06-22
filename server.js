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
app.use('/addons', express.static('addons'));

const games = {};
const players = {};
const playerReadiness = {};

function emitUpdateGameState(gameId, state) {
  console.log('[DEBUG] emitUpdateGameState - Envoi:', {
    gameId,
    player1HandLength: state.player1?.hand?.length || 0,
    player2HandLength: state.player2?.hand?.length || 0,
    player1OpponentHandLength: state.player1?.opponentHand?.length || 0,
    player2OpponentHandLength: state.player2?.opponentHand?.length || 0,
    phase: state.phase,
    turn: state.turn,
  });
  io.to(gameId).emit('updateGameState', state);
}

function loadCards() {
  let deckLists = {};
  let allCards = [];
  try {
    deckLists = JSON.parse(fs.readFileSync('public/deckLists.json', 'utf8'));
    allCards = JSON.parse(fs.readFileSync('public/cards.json', 'utf8')).map(
      (card) => ({
        ...card,
        exhausted: false,
      }),
    );
  } catch (error) {}
  return { deckLists, allCards };
}

function getRandomDecks() {
  const allDecks = [
    'assassin',
    'celestial',
    'dragon',
    'wizard',
    'vampire',
    'viking',
    'engine',
    'samurai',
  ];
  const shuffledDecks = [...allDecks].sort(() => 0.5 - Math.random());
  return shuffledDecks.slice(0, 4);
}

function drawCardServer(game, playerKey) {
  if (game.state[playerKey].deck.length > 0) {
    const [drawnCard] = game.state[playerKey].deck.splice(0, 1);
    game.state[playerKey].hand.push(drawnCard);
  }
}

io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    if (event === 'yourTurn') {
      console.log('[DEBUG] yourTurn émis de manière inattendue:', {
        event,
        args,
        socketId: socket.id,
      });
    }
  });

  socket.on('joinGame', (gameId) => {
    console.log(`[SERVER] Joueur ${socket.id} rejoint la partie ${gameId}`);
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
            opponentHand: [],
            deck: [],
            graveyard: [],
            opponentGraveyard: [],
            mustDiscard: false,
            hasPlayedCard: false,
          },
          player2: {
            hand: [],
            field: Array(8).fill(null),
            opponentField: Array(8).fill(null),
            opponentHand: [],
            deck: [],
            graveyard: [],
            opponentGraveyard: [],
            mustDiscard: false,
            hasPlayedCard: false,
          },
          turn: 1,
          activePlayer: socket.id,
          phase: 'Main', // Démarrer en Main pour le Joueur 1
        },
        deckChoices: { 1: null, 2: [] },
        availableDecks: getRandomDecks(),
      };
      players[socket.id] = { gameId, playerId: 1 };
      socket.emit('gameStart', { playerId: 1, chatHistory: [] });
      emitUpdateGameState(gameId, games[gameId].state); // Propager l'état initial
      io.to(gameId).emit('initialDeckList', games[gameId].availableDecks);
    } else if (games[gameId].players.length < 2) {
      games[gameId].players.push(socket.id);
      players[socket.id] = { gameId, playerId: 2 };
      socket.emit('gameStart', {
        playerId: 2,
        chatHistory: games[gameId].chatHistory,
      });
      emitUpdateGameState(gameId, games[gameId].state); // Propager l'état pour le Joueur 2
      io.to(gameId).emit('playerJoined', { playerId: 2 });
      io.to(gameId).emit('initialDeckList', games[gameId].availableDecks);
    } else {
      socket.emit('error', 'La partie est pleine');
      return;
    }

    io.to(gameId).emit('deckSelectionUpdate', games[gameId].deckChoices);
    console.log(
      `[SERVER] Joueurs dans la partie ${gameId}: ${games[gameId].players}`,
    );
  });

  socket.on('playCard', ({ gameId, card, fieldIndex }) => {
    const game = games[gameId];
    if (!game || game.state.activePlayer !== socket.id) {
      console.log(
        `[SERVER] Tentative de jouer une carte par un joueur non actif. Socket ID: ${socket.id}, Active Player: ${game?.state.activePlayer}`,
      );
      return;
    }
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';

    if (game.state.phase !== 'Main') {
      console.log(
        `[SERVER] Tentative de jouer une carte en dehors de la phase Main. Phase actuelle: ${game.state.phase}`,
      );
      return;
    }

    const updatedCard = { ...card, exhausted: false };
    game.state[playerKey].field[fieldIndex] = updatedCard;
    game.state[playerKey].hand = game.state[playerKey].hand.filter(
      (c) => c.id !== card.id,
    );

    // Synchroniser opponentHand pour refléter la main de l'adversaire
    game.state[playerKey].opponentHand = Array(
      game.state[opponentKey].hand.length,
    ).fill({});
    game.state[opponentKey].opponentHand = Array(
      game.state[playerKey].hand.length,
    ).fill({});

    console.log('[DEBUG] playCard - Avant émission:', {
      playerKey,
      field: game.state[playerKey].field.map((c) =>
        c ? { id: c.id, exhausted: c.exhausted } : null,
      ),
      handLength: game.state[playerKey].hand.length,
      opponentField: game.state[opponentKey].opponentField.map((c) =>
        c ? { id: c.id, exhausted: c.exhausted } : null,
      ),
      playerOpponentHandLength: game.state[playerKey].opponentHand.length,
      opponentHandLength: game.state[opponentKey].opponentHand.length,
      activePlayer: game.state.activePlayer,
      phase: game.state.phase,
    });
    emitUpdateGameState(gameId, game.state);
    console.log('[DEBUG] playCard - Après émission:', {
      playerKey,
      field: game.state[playerKey].field.map((c) =>
        c ? { id: c.id, exhausted: c.exhausted } : null,
      ),
      handLength: game.state[playerKey].hand.length,
      opponentField: game.state[opponentKey].opponentField.map((c) =>
        c ? { id: c.id, exhausted: c.exhausted } : null,
      ),
      playerOpponentHandLength: game.state[playerKey].opponentHand.length,
      opponentHandLength: game.state[opponentKey].opponentHand.length,
      activePlayer: game.state.activePlayer,
      phase: game.state.phase,
    });
  });

  socket.on('exhaustCard', ({ gameId, cardId, fieldIndex }) => {
    const game = games[gameId];
    if (!game) {
      return;
    }
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';

    const card = game.state[playerKey].field[fieldIndex];
    if (!card || card.id !== cardId) {
      return;
    }

    const updatedCard = { ...card, exhausted: !card.exhausted };
    game.state[playerKey].field[fieldIndex] = updatedCard;
    game.state[opponentKey].opponentField = [
      ...game.state[opponentKey].opponentField,
    ];
    if (fieldIndex < game.state[opponentKey].opponentField.length) {
      game.state[opponentKey].opponentField[fieldIndex] = { ...updatedCard };
    }
    emitUpdateGameState(gameId, game.state);
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
    // Synchroniser opponentHand
    game.state[playerKey].opponentHand = Array(
      game.state[opponentKey].hand.length,
    ).fill({});
    game.state[opponentKey].opponentHand = Array(
      game.state[playerKey].hand.length,
    ).fill({});
    emitUpdateGameState(gameId, game.state);
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
      const remaining = game.availableDecks.find(id => !totalDecks.includes(id));
      console.log(`[SERVER] Deck restant: ${remaining}`);

      game.finalDecks = {
        player1DeckId: game.deckChoices[1],
        player2DeckIds: game.deckChoices[2],
        selectedDecks: [...totalDecks, remaining],
      };

      console.log(`[SERVER] Decks finaux:`, game.finalDecks);

      const { deckLists, allCards } = loadCards();
      if (!deckLists || !allCards || allCards.length === 0) {
        console.error('[ERROR] Échec du chargement des cartes ou des listes de decks');
        return;
      }

      const getDeckCards = (deckId) => {
        const cardIds = deckLists[deckId] || [];
        return allCards.filter(card => cardIds.includes(card.id)).sort(() => Math.random() - 0.5);
      };

      const player1DeckIds = [game.finalDecks.player1DeckId, remaining];
      const player2DeckIds = game.finalDecks.player2DeckIds;

      const player1Cards = player1DeckIds.flatMap(deckId => getDeckCards(deckId)).slice(0, 30);
      const player2Cards = player2DeckIds.flatMap(deckId => getDeckCards(deckId)).slice(0, 30);

      if (player1Cards.length === 0 || player2Cards.length === 0) {
        console.error('[ERROR] Aucune carte trouvée pour les decks sélectionnés');
        return;
      }

      const initialDraw = (cards) => {
        const drawn = cards.slice(0, 5);
        const rest = cards.slice(5);
        return { hand: drawn, deck: rest };
      };

      if (game.state.player1 && game.state.player2) {
        const player1Initial = initialDraw(player1Cards);
        const player2Initial = initialDraw(player2Cards);

        game.state.player1.hand = player1Initial.hand;
        game.state.player1.deck = player1Initial.deck;
        game.state.player2.hand = player2Initial.hand;
        game.state.player2.deck = player2Initial.deck;

        // Initialiser opponentHand avec la taille correcte
        game.state.player1.opponentHand = Array(player2Initial.hand.length).fill({});
        game.state.player2.opponentHand = Array(player1Initial.hand.length).fill({});

        console.log('[DEBUG] chooseDeck - Initialisation opponentHand:', {
          player1OpponentHandLength: game.state.player1.opponentHand.length,
          player2OpponentHandLength: game.state.player2.opponentHand.length,
        });

        // Propager l'état immédiatement
        emitUpdateGameState(gameId, game.state);

        const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
        if (isBothReady) {
          console.log(`[SERVER] Émission de deckSelectionDone pour ${gameId}`);
          io.to(gameId).emit('deckSelectionDone', game.finalDecks);
          emitUpdateGameState(gameId, game.state);
          io.to(gameId).emit('bothPlayersReady');
        }
      } else {
        console.error('[ERROR] game.state.player1 ou game.state.player2 non défini');
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

    const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
    const finalDecks = games[gameId]?.finalDecks;

    if (isBothReady && finalDecks && games[gameId]) {
      io.to(gameId).emit('deckSelectionDone', finalDecks);
      emitUpdateGameState(gameId, games[gameId].state);
      io.to(gameId).emit('bothPlayersReady');
    }
  });

  socket.on('updatePhase', ({ gameId, phase, turn }) => {
    const game = games[gameId];
    if (!game) {
      console.log('[DEBUG] updatePhase - Jeu non trouvé:', { gameId });
      return;
    }
    if (game.state.activePlayer !== socket.id) {
      console.log(
        `[SERVER] Tentative de mise à jour de phase par un joueur non actif. Socket ID: ${socket.id}, Active Player: ${game.state.activePlayer}`,
      );
      return;
    }
    game.state.phase = phase;
    game.state.turn = turn;
    console.log('[DEBUG] updatePhase - Phase mise à jour:', {
      gameId,
      phase,
      turn,
      activePlayer: game.state.activePlayer,
    });
    emitUpdateGameState(gameId, game.state);
    io.to(gameId).emit('updatePhase', { phase, turn });
  });

  socket.on('drawCard', ({ gameId, playerId }) => {
    const game = games[gameId];
    if (!game) {
      console.log('[DEBUG] drawCard - Jeu non trouvé:', { gameId });
      return;
    }
    if (game.state.activePlayer !== socket.id) {
      console.log(
        `[SERVER] Tentative de pioche par un joueur non actif. Socket ID: ${socket.id}, Active Player: ${game.state.activePlayer}`,
      );
      return;
    }
    const playerKey = playerId === 1 ? 'player1' : 'player2';
    drawCardServer(game, playerKey);
    console.log('[DEBUG] drawCard - Carte piochée pour', playerKey);
    // Synchroniser opponentHand
    const opponentKey = playerId === 1 ? 'player2' : 'player1';
    game.state[playerKey].opponentHand = Array(
      game.state[opponentKey].hand.length,
    ).fill({});
    game.state[opponentKey].opponentHand = Array(
      game.state[playerKey].hand.length,
    ).fill({});
    emitUpdateGameState(gameId, game.state);
  });

  socket.on('endTurn', ({ gameId, nextPlayerId }) => {
    const game = games[gameId];
    if (game) {
      const currentPlayerId = players[socket.id].playerId;
      const nextPlayerSocketId = game.players.find(
        (id) => players[id].playerId === nextPlayerId,
      );
      if (nextPlayerSocketId) {
        console.log('[DEBUG] endTurn - Avant changement de activePlayer:', {
          currentPlayerId,
          currentSocketId: socket.id,
          nextPlayerId,
          nextPlayerSocketId,
        });
        game.state.activePlayer = nextPlayerSocketId;
        game.state.turn += 1;
        game.state.phase = 'Standby';
        console.log('[DEBUG] endTurn - Après changement de activePlayer:', {
          activePlayer: game.state.activePlayer,
          turn: game.state.turn,
          phase: game.state.phase,
        });
      } else {
        console.log(
          '[DEBUG] endTurn - Erreur: nextPlayerSocketId non trouvé pour playerId:',
          nextPlayerId,
        );
        return;
      }
      game.state.player1.hasPlayedCard = false;
      game.state.player2.hasPlayedCard = false;
      game.state.player1.field = game.state.player1.field.map((card) =>
        card ? { ...card, exhausted: false } : null,
      );
      game.state.player2.field = game.state.player2.field.map((card) =>
        card ? { ...card, exhausted: false } : null,
      );
      game.state.player1.opponentField = [...game.state.player2.field];
      game.state.player2.opponentField = [...game.state.player1.field];

      const nextPlayerKey = nextPlayerId === 1 ? 'player1' : 'player2';
      const opponentKey = nextPlayerId === 1 ? 'player2' : 'player1';
      if (game.state.turn > 1 && game.state[nextPlayerKey].deck.length > 0 && game.state[nextPlayerKey].hand.length < 10) {
        drawCardServer(game, nextPlayerKey);
        console.log('[DEBUG] endTurn - Pioche automatique pour', nextPlayerKey);
      }

      game.state.player1.opponentHand = Array(game.state.player2.hand.length).fill({});
      game.state.player2.opponentHand = Array(game.state.player1.hand.length).fill({});

      console.log('[DEBUG] endTurn - Avant émission:', {
        gameId,
        activePlayer: game.state.activePlayer,
        phase: game.state.phase,
        turn: game.state.turn,
        player1Field: game.state.player1.field.map((c) =>
          c ? { id: c.id, exhausted: c.exhausted } : null,
        ),
        player2Field: game.state.player2.field.map((c) =>
          c ? { id: c.id, exhausted: c.exhausted } : null,
        ),
        player1OpponentHandLength: game.state.player1.opponentHand.length,
        player2OpponentHandLength: game.state.player2.opponentHand.length,
      });
      emitUpdateGameState(gameId, game.state);
      io.to(gameId).emit('endTurn');
      io.to(nextPlayerSocketId).emit('yourTurn');
      console.log('[DEBUG] endTurn - Après émission de yourTurn:', {
        gameId,
        activePlayer: game.state.activePlayer,
        nextPlayerSocketId,
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});