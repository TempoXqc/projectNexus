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

function getGamesList() {
  return Object.keys(games).map((gameId) => ({
    gameId,
    status: games[gameId].players.length < 2 ? 'waiting' : 'in-progress',
    players: games[gameId].players.length,
  }));
}

io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    if (event === 'yourTurn') {
    }
  });

  socket.on('getGamesList', () => {
    socket.emit('gamesList', getGamesList());
  });

  socket.on('createGame', (gameId) => {
    console.log('[DEBUG] createGame reçu pour gameId:', gameId);
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
          phase: 'Main',
        },
        deckChoices: { 1: null, 2: [] },
        availableDecks: getRandomDecks(),
      };
      players[socket.id] = { gameId, playerId: 1 };
      socket.join(gameId);
      io.emit('gamesList', getGamesList());
    } else {
      socket.emit('error', 'ID de partie déjà utilisé');
    }
  });

  socket.on('joinGame', (gameId) => {
    console.log('[DEBUG] joinGame reçu pour gameId:', gameId, 'socketId:', socket.id);
    if (!games[gameId]) {
      console.log('[DEBUG] Partie inexistante pour gameId:', gameId);
      socket.emit('error', 'La partie n’existe pas');
      return;
    }

    games[gameId].players = games[gameId].players.filter((id) => io.sockets.sockets.get(id));
    console.log('[DEBUG] Joueurs après nettoyage:', games[gameId].players);

    if (games[gameId].players.includes(socket.id)) {
      console.log('[DEBUG] Socket déjà dans la partie:', socket.id);
      return;
    }

    if (games[gameId].players.length < 2) {
      socket.join(gameId);
      games[gameId].players.push(socket.id);
      players[socket.id] = { gameId, playerId: 2 };
      io.to(gameId).emit('opponentJoined', { gameId });
      io.emit('gamesList', getGamesList());
      console.log('[DEBUG] Joueur ajouté à la partie:', { gameId, playerId: 2, socketId: socket.id, rooms: Array.from(socket.rooms) });
    } else {
      console.log('[DEBUG] Partie pleine pour gameId:', gameId);
      socket.emit('error', 'La partie est pleine');
      return;
    }
  });

  socket.on('creatorReady', (gameId) => {
    console.log('[DEBUG] creatorReady reçu pour gameId:', gameId);
    const game = games[gameId];
    if (game && game.players.length === 2) {
      const [player1SocketId, player2SocketId] = game.players;
      console.log('[DEBUG] Vérification des joueurs pour gameId:', gameId, { player1SocketId, player2SocketId });

      const player1Socket = io.sockets.sockets.get(player1SocketId);
      const player2Socket = io.sockets.sockets.get(player2SocketId);
      if (!player1Socket || !player2Socket) {
        console.log('[DEBUG] Un ou plusieurs sockets non actifs:', { player1Active: !!player1Socket, player2Active: !!player2Socket });
        socket.emit('error', 'Un joueur est déconnecté');
        return;
      }

      player1Socket.join(gameId);
      player2Socket.join(gameId);

      const sendEvents = () => {
        console.log('[DEBUG] Envoi des événements aux joueurs:', { player1SocketId, player2SocketId });
        io.to(player1SocketId).emit('gameStart', { playerId: 1, chatHistory: game.chatHistory });
        io.to(player2SocketId).emit('gameStart', { playerId: 2, chatHistory: game.chatHistory });
        io.to(player1SocketId).emit('initialDeckList', game.availableDecks);
        io.to(player2SocketId).emit('initialDeckList', game.availableDecks);
        io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);
        io.to(gameId).emit('startGame', { gameId });
        emitUpdateGameState(gameId, game.state);
        console.log('[DEBUG] Événements envoyés pour gameId:', gameId);
      };

      // Envoyer immédiatement
      sendEvents();

      // Réessayer après 2000 ms si nécessaire
      setTimeout(() => {
        if (game.players.length === 2) {
          console.log('[DEBUG] Réessai d’envoi des événements pour gameId:', gameId);
          sendEvents();
        }
      }, 2000);
    } else {
      console.log('[DEBUG] creatorReady échoué:', { gameExists: !!game, players: game?.players.length });
      socket.emit('error', 'Partie invalide ou incomplète');
    }
  });

  socket.on('playCard', ({ gameId, card, fieldIndex }) => {
    console.log('[DEBUG] playCard reçu:', { gameId, card: card.id, fieldIndex, socketId: socket.id });
    const game = games[gameId];
    if (!game || game.state.activePlayer !== socket.id) {
      console.log('[DEBUG] playCard bloqué:', { gameExists: !!game, isActivePlayer: game?.state.activePlayer === socket.id });
      return;
    }
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';

    if (game.state.phase !== 'Main') {
      console.log('[DEBUG] playCard bloqué: mauvaise phase:', game.state.phase);
      return;
    }

    const updatedCard = { ...card, exhausted: false };
    game.state[playerKey].field[fieldIndex] = updatedCard;
    const newPlayerHand = game.state[playerKey].hand.filter(
      (c) => c.id !== card.id,
    );
    game.state[playerKey].hand = newPlayerHand;
    game.state[playerKey].hasPlayedCard = true;
    game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand?.length || 0).fill({});
    game.state[opponentKey].opponentHand = Array(newPlayerHand.length).fill({});

    console.log('[DEBUG] Émission de updateGameState après playCard:', {
      playerKey,
      opponentKey,
      playerField: game.state[playerKey].field.filter(Boolean).length,
      opponentField: game.state[opponentKey].field.filter(Boolean).length,
      playerHand: game.state[playerKey].hand.length,
      opponentHand: game.state[opponentKey].hand.length,
      playerDeck: game.state[playerKey].deck?.length,
      opponentDeck: game.state[opponentKey].deck?.length,
      playerGraveyard: game.state[playerKey].graveyard?.length,
      opponentGraveyard: game.state[opponentKey].graveyard?.length,
    });
    emitUpdateGameState(gameId, game.state);
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
    console.log('[DEBUG] updateGameState reçu:', {
      gameId,
      state: {
        hand: state.hand?.map(card => card.id),
        deck: state.deck?.length,
        field: state.field?.filter(Boolean).length,
        graveyard: state.graveyard?.length,
      },
    });
    const game = games[gameId];
    if (!game) {
      console.log('[DEBUG] Partie non trouvée pour updateGameState:', gameId);
      return;
    }
    const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
    const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
    game.state[playerKey] = { ...game.state[playerKey], ...state };
    game.state[opponentKey].opponentGraveyard = game.state[playerKey].graveyard || [];
    game.state[opponentKey].opponentHand = Array(game.state[playerKey].hand?.length || 0).fill({});
    game.state[opponentKey].opponentDeck = Array(game.state[playerKey].deck?.length || 0).fill({});
    game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand?.length || 0).fill({});
    game.state[playerKey].opponentDeck = Array(game.state[opponentKey].deck?.length || 0).fill({});

    console.log('[DEBUG] Émission de updateGameState:', {
      playerKey,
      opponentKey,
      playerField: game.state[playerKey].field?.filter(Boolean).length,
      opponentField: game.state[opponentKey].field?.filter(Boolean).length,
      playerHand: game.state[playerKey].hand?.map(card => card.id),
      opponentHand: game.state[opponentKey].hand?.length,
      playerDeck: game.state[playerKey].deck?.length,
      opponentDeck: game.state[opponentKey].deck?.length,
      playerGraveyard: game.state[playerKey].graveyard?.length,
      opponentGraveyard: game.state[opponentKey].graveyard?.length,
    });
    emitUpdateGameState(gameId, game.state);
  });

  socket.on('chooseDeck', ({ gameId, playerId, deckId }) => {
    console.log('[DEBUG] chooseDeck reçu:', { gameId, playerId, deckId });
    const game = games[gameId];
    if (!game) {
      console.log('[DEBUG] Partie non trouvée pour chooseDeck:', gameId);
      return;
    }

    if (!game.deckChoices) game.deckChoices = { 1: null, 2: [] };

    if (playerId === 1 && !game.deckChoices[1]) {
      game.deckChoices[1] = deckId;
      console.log('[DEBUG] Deck choisi pour joueur 1:', deckId);
    } else if (playerId === 2 && game.deckChoices[2].length < 2) {
      if (!game.deckChoices[2].includes(deckId) && deckId !== game.deckChoices[1]) {
        game.deckChoices[2].push(deckId);
        console.log('[DEBUG] Deck choisi pour joueur 2:', deckId);
      } else {
        console.log('[DEBUG] Deck invalide pour joueur 2:', { deckId, existingDecks: game.deckChoices[2], player1Deck: game.deckChoices[1] });
        return;
      }
    } else {
      console.log('[DEBUG] Choix de deck bloqué:', { playerId, hasChosen: playerId === 1 ? !!game.deckChoices[1] : game.deckChoices[2].length });
      return;
    }

    console.log('[DEBUG] Émission de deckSelectionUpdate:', game.deckChoices);
    io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);

    const totalDecks = [game.deckChoices[1], ...game.deckChoices[2]].filter(Boolean);

    if (totalDecks.length === 3) {
      const remaining = game.availableDecks.find(id => !totalDecks.includes(id));
      console.log('[DEBUG] Tous les decks choisis, deck restant:', remaining);

      game.finalDecks = {
        player1DeckId: game.deckChoices[1],
        player2DeckIds: game.deckChoices[2],
        selectedDecks: [...totalDecks, remaining],
      };

      const { deckLists, allCards } = loadCards();
      if (!deckLists || !allCards || allCards.length === 0) {
        console.log('[DEBUG] Erreur chargement des cartes:', { deckLists, allCards });
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
        console.log('[DEBUG] Erreur: Aucune carte pour les decks:', { player1Cards, player2Cards });
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

        game.state.player1.opponentHand = Array(player2Initial.hand.length).fill({});
        game.state.player2.opponentHand = Array(player1Initial.hand.length).fill({});

        console.log('[DEBUG] État initialisé pour les deux joueurs:', {
          player1Hand: player1Initial.hand.map(card => card.id),
          player2Hand: player2Initial.hand.map(card => card.id),
          player1Deck: player1Initial.deck.length,
          player2Deck: player2Initial.deck.length,
        });
        emitUpdateGameState(gameId, game.state);

        const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
        if (isBothReady) {
          console.log('[DEBUG] Émission de deckSelectionDone et bothPlayersReady');
          io.to(gameId).emit('deckSelectionDone', game.finalDecks);
          io.to(gameId).emit('bothPlayersReady');
        }
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
      io.emit('gamesList', getGamesList());
    }
    delete players[socket.id];
  });

  socket.on('playerReady', ({ gameId }) => {
    console.log('[DEBUG] playerReady reçu pour gameId:', gameId, 'socketId:', socket.id);
    const playerInfo = players[socket.id];
    if (!playerInfo || playerInfo.gameId !== gameId) {
      console.log('[DEBUG] playerReady invalide:', { playerInfo, gameId });
      return;
    }

    const playerId = playerInfo.playerId;
    console.log('[DEBUG] Joueur prêt:', { playerId, gameId });

    if (!playerReadiness[gameId]) {
      playerReadiness[gameId] = { 1: false, 2: false };
    }

    playerReadiness[gameId][playerId] = true;
    io.to(gameId).emit('playerReady', { playerId });
    console.log('[DEBUG] Émission de playerReady:', { playerId, gameId });

    const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
    const finalDecks = games[gameId]?.finalDecks;

    if (isBothReady && finalDecks && games[gameId]) {
      console.log('[DEBUG] Les deux joueurs sont prêts, émission de deckSelectionDone et bothPlayersReady');
      io.to(gameId).emit('deckSelectionDone', finalDecks);
      emitUpdateGameState(gameId, games[gameId].state);
      io.to(gameId).emit('bothPlayersReady');
    }
  });

  socket.on('updatePhase', ({ gameId, phase, turn }) => {
    const game = games[gameId];
    if (!game) {
      console.log('[DEBUG] updatePhase - Jeu non trouvé:', gameId);
      return;
    }
    if (game.state.activePlayer !== socket.id) {
      console.log('[DEBUG] updatePhase - Tentative par joueur non actif:', socket.id);
      return;
    }
    game.state.phase = phase;
    game.state.turn = turn;
    console.log('[DEBUG] updatePhase - Phase mise à jour:', { gameId, phase, turn, activePlayer: game.state.activePlayer });

    emitUpdateGameState(gameId, game.state);
    io.to(gameId).emit('updatePhase', { phase, turn });
    if (phase === 'Main' || phase === 'Battle') {
      io.to(gameId).emit('phaseChangeMessage', { phase, turn });
    }
  });

  socket.on('drawCard', ({ gameId, playerId }) => {
    const game = games[gameId];
    if (!game) {
      return;
    }
    if (game.state.activePlayer !== socket.id) {
      return;
    }
    const playerKey = playerId === 1 ? 'player1' : 'player2';
    drawCardServer(game, playerKey);
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
        console.log('[DEBUG] endTurn - Après changement de phase et activePlayer:', {
          activePlayer: game.state.activePlayer,
          turn: game.state.turn,
          phase: game.state.phase,
        });
      } else {
        console.log('[DEBUG] endTurn - Erreur: nextPlayerSocketId non trouvé pour playerId:', nextPlayerId);
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
      }

      game.state.player1.opponentHand = Array(game.state.player2.hand.length).fill({});
      game.state.player2.opponentHand = Array(game.state.player1.hand.length).fill({});

      console.log('[DEBUG] endTurn - Avant émission:', {
        gameId,
        activePlayer: game.state.activePlayer,
        phase: game.state.phase,
        turn: game.state.turn,
      });
      emitUpdateGameState(gameId, game.state);
      io.to(gameId).emit('endTurn');
      io.to(nextPlayerSocketId).emit('yourTurn');
      io.to(gameId).emit('phaseChangeMessage', { phase: 'Standby', turn: game.state.turn, nextPlayerId });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});