import { Server, Socket } from 'socket.io';
import { GameRepository } from '../database/gameRepository.js';
import { GameCache } from '../cache/gameCache.js';
import { GameLogic } from '../game/gameLogic.js';
import { CardManager } from '../game/cardManager.js';
import { PlayerManager } from '../game/playerManager.js';
import { JoinGameSchema, PlayCardSchema } from './socketSchemas.js';
import { Db, ObjectId } from 'mongodb';
import { GameState, ServerGameState } from '../../../types/GameStateTypes.js';
import { Card } from '../../../types/CardTypes.js'
import { z } from 'zod';

function generateGameId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  return (
    getRandom(letters) +
    getRandom(digits) +
    getRandom(letters) +
    getRandom(digits) +
    getRandom(letters) +
    getRandom(digits)
  );
}

function mapServerToClientGameState(serverGame: ServerGameState, playerSocketId: string): GameState {
  const playerId = serverGame.players.indexOf(playerSocketId) + 1;
  const isPlayer1 = playerId === 1;
  const playerKey = isPlayer1 ? 'player1' : 'player2';
  const opponentKey = isPlayer1 ? 'player2' : 'player1';

  const opponentHand: Card[] = Array(serverGame.state[opponentKey].hand.length).fill({
    id: 'hidden',
    name: 'Hidden Card',
    image: 'unknown',
    exhausted: false,
  } as Card);

  return {
    player: {
      hand: serverGame.state[playerKey].hand,
      deck: serverGame.state[playerKey].deck,
      graveyard: serverGame.state[playerKey].graveyard,
      field: serverGame.state[playerKey].field,
      mustDiscard: serverGame.state[playerKey].mustDiscard,
      hasPlayedCard: serverGame.state[playerKey].hasPlayedCard,
      lifePoints: serverGame.state[playerKey].lifePoints,
      tokenCount: serverGame.state[playerKey].tokenCount,
      tokenType: serverGame.state[playerKey].tokenType,
    },
    opponent: {
      hand: opponentHand,
      deck: serverGame.state[opponentKey].deck,
      graveyard: serverGame.state[opponentKey].graveyard,
      field: serverGame.state[opponentKey].field,
      mustDiscard: serverGame.state[opponentKey].mustDiscard,
      hasPlayedCard: serverGame.state[opponentKey].hasPlayedCard,
      lifePoints: serverGame.state[opponentKey].lifePoints,
      tokenCount: serverGame.state[opponentKey].tokenCount,
      tokenType: serverGame.state[opponentKey].tokenType,
    },
    game: {
      turn: serverGame.state.turn,
      currentPhase: serverGame.state.phase,
      isMyTurn: serverGame.state.activePlayer === playerSocketId,
      activePlayerId: serverGame.state.activePlayer,
      gameOver: serverGame.state.gameOver,
      winner: serverGame.state.winner,
    },
    ui: {
      hoveredCardId: null,
      hoveredTokenId: null,
      isCardHovered: false,
      isGraveyardOpen: false,
      isOpponentGraveyardOpen: false,
      isRightPanelOpen: false,
      isRightPanelHovered: false,
      isTokenZoneOpen: false,
      isOpponentTokenZoneOpen: false,
    },
    chat: {
      messages: serverGame.chatHistory,
      input: '',
    },
    deckSelection: {
      selectedDecks: [...serverGame.deckChoices['1'], ...serverGame.deckChoices['2']],
      player1DeckId: serverGame.deckChoices['1'],
      player1Deck: serverGame.state['player1'].deck,
      player2Deck: serverGame.state['player2'].deck,
      hasChosenDeck: playerId === 1 ? !!serverGame.deckChoices['1'].length : serverGame.deckChoices['2'].length > 0,
      deckSelectionDone: serverGame.deckChoices['1'].length >= 2 && serverGame.deckChoices['2'].length >= 2,
      initialDraw: serverGame.state[playerKey].hand,
      selectedForMulligan: [],
      mulliganDone: false,
      isReady: serverGame.playersReady.has(playerId),
      bothReady: serverGame.playersReady.size === 2,
      opponentReady: serverGame.playersReady.has(playerId === 1 ? 2 : 1),
      deckSelectionData: {
        player1DeckId: serverGame.deckChoices['1'],
        player2DeckIds: serverGame.deckChoices['2'],
        selectedDecks: [...serverGame.deckChoices['1'], ...serverGame.deckChoices['2']],
      },
      randomizers: [],
      waitingForPlayer1: !serverGame.deckChoices['1'].length,
    },
    connection: {
      playerId,
      isConnected: true,
      canInitializeDraw: false,
    },
  };
}

export async function registerSocketHandlers(io: Server, db: Db) {
  const gameRepository = new GameRepository(db);
  const cardManager = new CardManager(db);
  await cardManager.initialize();

  const deckLists = cardManager.getDeckLists();
  const allCards = cardManager.getAllCards();
  const gameLogic = new GameLogic(gameRepository, cardManager);
  const playerManager = new PlayerManager();
  const gameCache = new GameCache();
  let lastActiveGamesUpdate: string | null = null;
  let pendingUpdateTimeout: NodeJS.Timeout | null = null;
  const connectedSockets: Set<string> = new Set();

  const scheduleActiveGamesUpdate = () => {
    if (pendingUpdateTimeout) {
      return;
    }
    pendingUpdateTimeout = setTimeout(() => {
      gameLogic.emitActiveGames(io, lastActiveGamesUpdate, (newUpdate) => {
        lastActiveGamesUpdate = newUpdate;
      });
      pendingUpdateTimeout = null;
    }, 100);
  };

  const sendActiveGamesToSocket = async (socket: Socket) => {
    const games = await gameRepository.findActiveGames();
    const activeGames = games.map((game) => ({
      gameId: game.gameId,
      players: game.players,
      createdAt: game.createdAt,
      status: game.status,
    }));
    socket.emit('activeGamesUpdate', activeGames);
  };

  io.on('connection', (socket: Socket) => {
    if (connectedSockets.has(socket.id)) {
      socket.disconnect(true);
      return;
    }
    connectedSockets.add(socket.id);

    socket.removeAllListeners('createGame');
    socket.removeAllListeners('joinLobby');
    socket.removeAllListeners('leaveLobby');
    socket.removeAllListeners('refreshLobby');

    if (!socket.rooms.has('lobby')) {
      socket.join('lobby');
      sendActiveGamesToSocket(socket);
    }

    socket.on('joinLobby', () => {
      if (socket.rooms.has('lobby')) {
        return;
      }
      socket.join('lobby');
      sendActiveGamesToSocket(socket);
    });

    socket.on('leaveLobby', () => {
      if (socket.rooms.has('lobby')) {
        socket.leave('lobby');
        scheduleActiveGamesUpdate();
      }
    });

    socket.on('refreshLobby', async () => {
      if (!socket.rooms.has('lobby')) {
        socket.join('lobby');
        console.log(`Socket ${socket.id} a rejoint le lobby, timestamp: ${new Date().toISOString()}`);
      }
      const games = await gameRepository.findActiveGames();
      games.forEach((game) => gameCache.deleteGame(game.gameId));
      await sendActiveGamesToSocket(socket);
    });

    socket.once('disconnect', () => {
      connectedSockets.delete(socket.id);
      playerManager.removePlayer(socket.id);
      if (socket.rooms.has('lobby')) {
        socket.leave('lobby');
        scheduleActiveGamesUpdate();
      }
    });

    socket.on('createGame', async (data, ack) => {
      try {
        const { isRanked, gameFormat } = z
          .object({
            isRanked: z.boolean(),
            gameFormat: z.enum(['BO1', 'BO3']),
          })
          .parse(data);

        const playerInfo = playerManager.getPlayer(socket.id);
        if (playerInfo && playerInfo.gameId) {
          ack({ error: 'Vous avez déjà une partie en cours' });
          return;
        }

        let gameId: string;
        let attempts = 0;
        const maxAttempts = 5;

        do {
          gameId = generateGameId();
          const existingGame = await gameRepository.findGameById(gameId);
          if (existingGame) {
            attempts++;
            if (attempts >= maxAttempts) {
              ack({ error: 'Impossible de générer un ID de partie unique' });
              return;
            }
          } else {
            break;
          }
        } while (true);

        const availableDecks = await cardManager.getRandomDecks();


        const newGame: ServerGameState = {
          gameId,
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
              mustDiscard: false,
              hasPlayedCard: false,
              lifePoints: 30,
              tokenCount: 0,
              tokenType: null,
            },
            player2: {
              hand: [],
              field: Array(8).fill(null),
              opponentField: Array(8).fill(null),
              opponentHand: [],
              deck: [],
              graveyard: [],
              mustDiscard: false,
              hasPlayedCard: false,
              lifePoints: 30,
              tokenCount: 0,
              tokenType: null,
            },
            turn: 1,
            activePlayer: null,
            phase: 'Main',
            gameOver: false,
            winner: null,
          },
          deckChoices: { '1': [], '2': [] },
          availableDecks,
          createdAt: new Date(),
          status: 'waiting',
          playersReady: new Set<number>(),
        };

        await gameRepository.insertGame(newGame);
        gameCache.setGame(gameId, newGame);
        playerManager.addPlayer(socket.id, { gameId, playerId: 1 });

        socket.join(gameId);
        if (socket.rooms.has('lobby')) {
          socket.leave('lobby');
        }
        scheduleActiveGamesUpdate();

        console.log('Envoi de ACK pour createGame:', {
          gameId,
          playerId: 1,
          chatHistory: newGame.chatHistory,
          availableDecks: newGame.availableDecks,
        }, 'timestamp:', new Date().toISOString());
        ack({
          gameId,
          playerId: 1,
          chatHistory: newGame.chatHistory,
          availableDecks: newGame.availableDecks,
        });
      } catch (error) {
        ack({ error: 'Erreur lors de la création de la partie' });
      }
    });

    socket.on('joinGame', async (data) => {
      try {
        const gameId = JoinGameSchema.parse(data);
        const game = await gameRepository.findGameById(gameId);
        if (!game) {
          socket.emit('gameNotFound');
          return;
        }

        if (game.players.length >= 2) {
          socket.emit('error', 'La partie est pleine');
          return;
        }

        const playerInfo = playerManager.getPlayer(socket.id);
        if (playerInfo && playerInfo.gameId) {
          socket.emit('error', 'Vous êtes déjà dans une partie');
          return;
        }

        if (game.players.includes(socket.id)) {
          socket.emit('error', 'Vous êtes déjà dans cette partie');
          return;
        }

        game.players.push(socket.id);
        socket.join(gameId);

        if (game.players.length === 2) {
          const [player1SocketId, player2SocketId] = game.players.sort(() => Math.random() - 0.5);
          playerManager.addPlayer(player1SocketId, { gameId, playerId: 1 });
          playerManager.addPlayer(player2SocketId, { gameId, playerId: 2 });
          game.state.activePlayer = player1SocketId;

          try {
            await gameRepository.updateGame(gameId, {
              players: [player1SocketId, player2SocketId],
              state: { ...game.state, activePlayer: player1SocketId },
              status: 'started',
            });
            gameCache.setGame(gameId, game);
            console.log(`Partie ${gameId} mise à jour, statut: started, joueurs: ${game.players}, timestamp: ${new Date().toISOString()}`);
          } catch (error) {
            console.error(`Erreur lors de la mise à jour de la partie ${gameId}:`, error);
            socket.emit('error', 'Erreur lors de la mise à jour de la partie');
            return;
          }

          const gameStartDataPlayer1 = {
            playerId: 1,
            gameId,
            chatHistory: game.chatHistory,
            availableDecks: game.availableDecks,
          };
          const gameStartDataPlayer2 = {
            playerId: 2,
            gameId,
            chatHistory: game.chatHistory,
            availableDecks: game.availableDecks,
          };

          io.to(player1SocketId).emit('gameStart', gameStartDataPlayer1);
          io.to(player2SocketId).emit('gameStart', gameStartDataPlayer2);
          io.to(gameId).emit('playerJoined', { playerId: 2 });
          io.to(gameId).emit('initialDeckList', game.availableDecks);
          io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);

          if (!game.deckChoices['1'].length) {
            console.log(`Émission de waitingForPlayer1Choice à player2 (${player2SocketId}):`, { waiting: true }, 'timestamp:', new Date().toISOString());
            io.to(player2SocketId).emit('waitingForPlayer1Choice', { waiting: true });
          }
        } else {
          playerManager.addPlayer(socket.id, { gameId, playerId: null });
          socket.emit('waiting', { gameId, message: 'En attente d\'un autre joueur...' });
          console.log(`Socket ${socket.id} en attente d'un autre joueur pour ${gameId}, timestamp: ${new Date().toISOString()}`);
        }

        if (socket.rooms.has('lobby')) {
          socket.leave('lobby');
        }
        scheduleActiveGamesUpdate();
      } catch (error) {
        console.error('Erreur lors de la jointure de la partie:', error);
        socket.emit('error', 'Erreur lors de la jointure de la partie');
      }
    });

    socket.on('checkPlayerGame', async (data, callback) => {
      try {
        const { playerId } = z.object({ playerId: z.string().transform((val) => parseInt(val, 10)) }).parse(data);
        const games = await gameRepository.findActiveGames();
        const playerGame = games.find((game) => game.players.includes(String(playerId)) || game.players.includes(socket.id));
        if (playerGame) {
          const fullGame = await gameRepository.findGameById(playerGame.gameId);
          if (fullGame) {
            callback({ exists: true, gameId: fullGame.gameId, availableDecks: fullGame.availableDecks });
          } else {
            callback({ exists: false });
          }
        } else {
          callback({ exists: false });
        }
      } catch (error) {
        console.error('Erreur lors de checkPlayerGame:', error);
        callback({ exists: false });
      }
    });

    socket.on('checkGameExists', async (gameId, callback) => {
      try {
        const game = await gameRepository.findGameById(gameId);
        callback(!!game);
      } catch (error) {
        console.error('Erreur lors de checkGameExists:', error);
        callback(false);
      }
    });

    socket.on('leaveGame', async (data) => {
      try {
        const { gameId, playerId } = z.object({ gameId: z.string(), playerId: z.number() }).parse(data);
        const game = await gameRepository.findGameById(gameId);
        if (game && (game.players.includes(String(playerId)) || game.players.includes(socket.id))) {
          await gameRepository.deleteGame(gameId);
          gameCache.deleteGame(gameId);
          io.to(gameId).emit('gameNotFound');
        } else {
          socket.emit('error', 'Vous n\'êtes pas autorisé à quitter cette partie.');
        }
      } catch (error) {
        console.error('Erreur lors de leaveGame:', error);
        socket.emit('error', 'Erreur lors de la suppression de la partie.');
      }
    });

    socket.on('playCard', async (data) => {
      try {
        const { gameId, card, fieldIndex } = PlayCardSchema.parse(data);
        const game = await gameRepository.findGameById(gameId);
        const playerInfo = playerManager.getPlayer(socket.id);
        if (!game || !playerInfo || playerInfo.gameId !== gameId || game.state.activePlayer !== socket.id) {
          socket.emit('error', 'Non autorisé');
          return;
        }

        const playerKey = playerInfo.playerId === 1 ? 'player1' : 'player2';
        const opponentKey = playerInfo.playerId === 1 ? 'player2' : 'player1';
        if (game.state.phase !== 'Main') return;

        game.state[playerKey].field[fieldIndex] = { ...card, exhausted: false } as Card;
        game.state[playerKey].hand = game.state[playerKey].hand.filter((c: Card) => c.id !== card.id);
        game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand.length).fill({});
        game.state[opponentKey].opponentHand = Array(game.state[playerKey].hand.length).fill({});

        await gameRepository.updateGame(gameId, { state: game.state });
        gameCache.setGame(gameId, game);

        game.players.forEach((playerSocketId) => {
          const clientGameState = mapServerToClientGameState(game, playerSocketId);
          io.to(playerSocketId).emit('updateGameState', clientGameState);
        });
      } catch (error) {
        console.error('Erreur lors de l\'action playCard:', error);
        socket.emit('error', 'Erreur lors de l\'action playCard');
      }
    });

    socket.on('chooseDeck', async (data) => {
      try {
        console.log('Reçu chooseDeck:', data, 'timestamp:', new Date().toISOString());
        const game = await gameRepository.findGameById(data.gameId);
        if (!game) {
          console.log(`Erreur : Partie non trouvée pour gameId: ${data.gameId}`);
          socket.emit('error', 'Partie non trouvée');
          return;
        }
        const playerInfo = playerManager.getPlayer(socket.id);
        if (!playerInfo || playerInfo.playerId !== data.playerId) {
          console.log(`Erreur : Joueur non autorisé pour socketId: ${socket.id}, playerId: ${data.playerId}`);
          socket.emit('error', 'Joueur non autorisé');
          return;
        }

        if (data.playerId === 1) {
          if (game.deckChoices['1'].length >= 1) {
            console.log(`Erreur : Joueur 1 a déjà choisi un deck pour gameId: ${data.gameId}`);
            socket.emit('error', 'Le joueur 1 a déjà choisi un deck');
            return;
          }
          if (!game.availableDecks.some((deck) => deck.id === data.deckId)) {
            console.log(`Erreur : Deck invalide ${data.deckId} pour gameId: ${data.gameId}`);
            socket.emit('error', 'Deck invalide');
            return;
          }
          game.deckChoices['1'] = [data.deckId];
          await gameRepository.updateGame(data.gameId, { deckChoices: game.deckChoices });
          gameCache.setGame(data.gameId, game);
          console.log(`Joueur 1 a choisi le deck: ${data.deckId}, gameId: ${data.gameId}, timestamp: ${new Date().toISOString()}`);
          console.log('Émission de player1ChoseDeck:', { player1DeckId: data.deckId }, 'to gameId:', data.gameId, 'timestamp:', new Date().toISOString());
          io.to(data.gameId).emit('player1ChoseDeck', { player1DeckId: data.deckId });
          console.log('Émission de deckSelectionUpdate:', game.deckChoices, 'to gameId:', data.gameId, 'timestamp:', new Date().toISOString());
          io.to(data.gameId).emit('deckSelectionUpdate', game.deckChoices);
          if (game.players[1]) {
            console.log('Émission de waitingForPlayer1Choice:', { waiting: false }, 'to player2:', game.players[1], 'timestamp:', new Date().toISOString());
            io.to(game.players[1]).emit('waitingForPlayer1Choice', { waiting: false });
          } else {
            console.log('Joueur 2 non connecté, waitingForPlayer1Choice non émis, timestamp:', new Date().toISOString());
          }
        } else if (data.playerId === 2) {
          if (!game.deckChoices['1'].length) {
            console.log(`Erreur : Joueur 1 doit choisir un deck en premier pour gameId: ${data.gameId}`);
            socket.emit('error', 'Le joueur 1 doit choisir un deck en premier');
            return;
          }
          if (game.deckChoices['2'].length >= 2) {
            console.log(`Erreur : Joueur 2 a déjà choisi deux decks pour gameId: ${data.gameId}`);
            socket.emit('error', 'Le joueur 2 a déjà choisi deux decks');
            return;
          }
          if (game.deckChoices['2'].includes(data.deckId) || game.deckChoices['1'].includes(data.deckId)) {
            console.log(`Erreur : Deck déjà choisi ${data.deckId} pour gameId: ${data.gameId}`);
            socket.emit('error', 'Deck déjà choisi');
            return;
          }
          if (!game.availableDecks.some((deck) => deck.id === data.deckId)) {
            console.log(`Erreur : Deck invalide ${data.deckId} pour gameId: ${data.gameId}`);
            socket.emit('error', 'Deck invalide');
            return;
          }
          game.deckChoices['2'].push(data.deckId);
          await gameRepository.updateGame(data.gameId, { deckChoices: game.deckChoices });
          gameCache.setGame(data.gameId, game);
          console.log(`Joueur 2 a choisi le deck: ${data.deckId}, gameId: ${data.gameId}, timestamp: ${new Date().toISOString()}`);
          console.log('Émission de deckSelectionUpdate:', game.deckChoices, 'to gameId:', data.gameId, 'timestamp:', new Date().toISOString());
          io.to(data.gameId).emit('deckSelectionUpdate', game.deckChoices);
          if (game.deckChoices['2'].length === 2) {
            const remainingDeck = game.availableDecks.find(
              (deck) => !game.deckChoices['1'].includes(deck.id) && !game.deckChoices['2'].includes(deck.id)
            );
            if (remainingDeck) {
              game.deckChoices['1'].push(remainingDeck.id); // Fix: Use remainingDeck.id
              await gameRepository.updateGame(data.gameId, { deckChoices: game.deckChoices });
              gameCache.setGame(data.gameId, game);
              console.log(`Deck restant ${remainingDeck.id} attribué au joueur 1 pour gameId: ${data.gameId}, timestamp: ${new Date().toISOString()}`);
              console.log('Émission de deckSelectionUpdate:', game.deckChoices, 'to gameId:', data.gameId, 'timestamp:', new Date().toISOString());
              io.to(data.gameId).emit('deckSelectionUpdate', game.deckChoices);
            }
            console.log('Émission de deckSelectionDone:', {
              player1DeckId: game.deckChoices['1'],
              player2DeckIds: game.deckChoices['2'],
              selectedDecks: [...game.deckChoices['1'], ...game.deckChoices['2']],
            }, 'to gameId:', data.gameId, 'timestamp:', new Date().toISOString());
            io.to(data.gameId).emit('deckSelectionDone', {
              player1DeckId: game.deckChoices['1'],
              player2DeckIds: game.deckChoices['2'],
              selectedDecks: [...game.deckChoices['1'], ...game.deckChoices['2']],
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors du choix du deck:', error);
        socket.emit('error', 'Erreur lors du choix du deck');
      }
    });

    socket.on('playerReady', async (data: { gameId: string; playerId: number }) => {
      try {
        console.log('Reçu playerReady:', data, 'timestamp:', new Date().toISOString());
        const game = await gameRepository.findGameById(data.gameId);
        if (!game) {
          console.log(`Erreur : Partie non trouvée pour gameId: ${data.gameId}`);
          socket.emit('error', 'Partie non trouvée');
          return;
        }
        const playerInfo = playerManager.getPlayer(socket.id);
        if (!playerInfo || playerInfo.playerId !== data.playerId) {
          console.log(`Erreur : Joueur non autorisé pour socketId: ${socket.id}, playerId: ${data.playerId}`);
          socket.emit('error', 'Joueur non autorisé');
          return;
        }

        game.playersReady = game.playersReady || new Set<number>();
        game.playersReady.add(data.playerId);
        await gameRepository.updateGame(data.gameId, { playersReady: Array.from(game.playersReady) });
        console.log(`Joueur ${data.playerId} est prêt, gameId: ${data.gameId}, playersReady: ${Array.from(game.playersReady)}`, 'timestamp:', new Date().toISOString());
        io.to(data.gameId).emit('playerReady', { playerId: data.playerId });

        if (game.playersReady.size === 2 && game.deckChoices['1'].length >= 2 && game.deckChoices['2'].length >= 2) {
          console.log(`Conditions remplies pour initializeDeck, gameId: ${data.gameId}, deckChoices:`, game.deckChoices, 'timestamp:', new Date().toISOString());
          io.to(data.gameId).emit('bothPlayersReady', { bothReady: true });

          const deckLists = cardManager.getDeckLists();
          const allCards = cardManager.getAllCards();
          console.log('decklists chargé depuis cardManager, decks disponibles:', Object.keys(deckLists), 'timestamp:', new Date().toISOString());
          console.log('Contenu de decklists:', JSON.stringify(deckLists, null, 2), 'timestamp:', new Date().toISOString());
          console.log('cards chargé depuis cardManager, nombre de cartes:', allCards.length, 'timestamp:', new Date().toISOString());
          console.log('Contenu de allCards:', JSON.stringify(allCards, null, 2), 'timestamp:', new Date().toISOString());

          const allDeckIds = [...game.deckChoices['1'], ...game.deckChoices['2']];
          console.log(`Vérification des decks sélectionnés:`, allDeckIds, 'timestamp:', new Date().toISOString());
          for (const deckId of allDeckIds) {
            if (!deckLists[deckId]) {
              console.error(`Erreur : Deck ${deckId} non trouvé dans decklists`, 'decklists keys:', Object.keys(deckLists), 'timestamp:', new Date().toISOString());
              socket.emit('error', `Deck ${deckId} non trouvé dans decklists`);
              return;
            }
          }

          // Initialiser les decks pour chaque joueur
          for (const playerId of ['1', '2'] as const) {
            const playerSocketId = game.players.find(p => playerManager.getPlayer(p)?.playerId === Number(playerId));
            if (!playerSocketId) {
              console.error(`Erreur : Socket non trouvé pour playerId: ${playerId}`, 'timestamp:', new Date().toISOString());
              continue;
            }
            const selectedDeckIds = game.deckChoices[playerId];
            const deck: Card[] = [];
            selectedDeckIds.forEach((deckId: string) => {
              const cardIds = deckLists[deckId];
              console.log(`Traitement du deck ${deckId}, cardIds:`, cardIds, 'timestamp:', new Date().toISOString());
              const deckCards = cardIds.map((cardId: string) => {
                const card = allCards.find(c => c.id === cardId);
                if (!card) {
                  console.error(`Erreur : Carte ${cardId} non trouvée dans allCards`, 'timestamp:', new Date().toISOString());
                  return null;
                }
                return { ...card, exhausted: false } as Card;
              }).filter((card): card is Card => card !== null);
              console.log(`Cartes ajoutées pour deck ${deckId}:`, deckCards, 'timestamp:', new Date().toISOString());
              deck.push(...deckCards);
            });

            // Mélanger le deck
            const shuffledDeck = deck.sort(() => Math.random() - 0.5);
            // Tirer 5 cartes pour initialDraw
            const initialDraw = shuffledDeck.slice(0, 5);
            const remainingDeck = shuffledDeck.slice(5);

            // Déterminer tokenType et tokenCount
            const primaryDeckId = selectedDeckIds[0];
            const deckList = await db.collection('decklists').findOne({ id: primaryDeckId });
            const tokenType = deckList?.id || null; // ex: "assassin"
            const tokenCount = tokenType === 'assassin' ? 8 : tokenType === 'viking' ? 1 : 0;

            console.log(`Émission de initializeDeck pour playerId: ${playerId}, deckLength: ${remainingDeck.length}, initialDrawLength: ${initialDraw.length}, tokenType: ${tokenType}, tokenCount: ${tokenCount}`, 'timestamp:', new Date().toISOString());
            io.to(playerSocketId).emit('initializeDeck', {
              deck: remainingDeck,
              initialDraw,
              tokenType,
              tokenCount,
            });
          }
        } else {
          console.log(`En attente d'autres joueurs prêts ou de sélection de decks, gameId: ${data.gameId}`, {
            playersReady: Array.from(game.playersReady),
            deckChoices1: game.deckChoices['1'],
            deckChoices2: game.deckChoices['2'],
          }, 'timestamp:', new Date().toISOString());
        }
      } catch (error) {
        console.error('Erreur lors de la confirmation de préparation:', error, 'timestamp:', new Date().toISOString());
        socket.emit('error', 'Erreur lors de la confirmation de préparation');
      }
    });
  });
}