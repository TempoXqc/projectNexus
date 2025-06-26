import { Server, Socket } from 'socket.io';
import { GameRepository } from '../database/gameRepository.js';
import { GameCache } from '../cache/gameCache.js';
import { GameLogic } from '../game/gameLogic.js';
import { CardManager } from '../game/cardManager.js';
import { PlayerManager } from '../game/playerManager.js';
import { JoinGameSchema, PlayCardSchema } from './socketSchemas.js';
import { Db } from 'mongodb';
import { GameState, ServerGameState } from '../../../types/GameStateTypes.js';
import { Card } from '../../../types/CardTypes.js';
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
      selectedDecks: serverGame.availableDecks,
      player1DeckId: serverGame.deckChoices['1'],
      player1Deck: [],
      player2Deck: [],
      hasChosenDeck: playerId === 1 ? !!serverGame.deckChoices['1'] : serverGame.deckChoices['2'].length > 0,
      deckSelectionDone: serverGame.deckChoices['1'] !== null && serverGame.deckChoices['2'].length > 0,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: false,
      isReady: false,
      bothReady: false,
      opponentReady: false,
      deckSelectionData: {
        player1DeckId: serverGame.deckChoices['1'] || '',
        player2DeckIds: serverGame.deckChoices['2'],
        selectedDecks: serverGame.availableDecks,
      },
      randomizers: [],
      waitingForPlayer1: !serverGame.deckChoices['1'],
    },
    connection: {
      playerId,
      isConnected: true,
      canInitializeDraw: false,
    },
  };
}

export function registerSocketHandlers(io: Server, db: Db) {
  const gameRepository = new GameRepository(db);
  const cardManager = new CardManager();
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
    console.log(`Envoi de activeGamesUpdate au socket ${socket.id}:`, activeGames, 'timestamp:', new Date().toISOString());
    socket.emit('activeGamesUpdate', activeGames);
  };

  io.on('connection', (socket: Socket) => {
    console.log(`Nouveau socket connecté, ID: ${socket.id}, timestamp: ${new Date().toISOString()}`);

    if (connectedSockets.has(socket.id)) {
      console.log(`Socket ${socket.id} déjà connecté, déconnexion, timestamp: ${new Date().toISOString()}`);
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
      console.log(`Socket ${socket.id} a rejoint le lobby, timestamp: ${new Date().toISOString()}`);
      sendActiveGamesToSocket(socket);
    }

    socket.on('refreshLobby', async () => {
      console.log(`Socket ${socket.id} a demandé un rafraîchissement du lobby, timestamp: ${new Date().toISOString()}`);
      if (!socket.rooms.has('lobby')) {
        socket.join('lobby');
        console.log(`Socket ${socket.id} a rejoint le lobby, timestamp: ${new Date().toISOString()}`);
      }
      // Vider le cache pour les parties actives
      const games = await gameRepository.findActiveGames();
      games.forEach((game) => gameCache.deleteGame(game.gameId));
      console.log(`Cache vidé pour socket ${socket.id}, timestamp: ${new Date().toISOString()}`);
      await sendActiveGamesToSocket(socket);
    });

    socket.on('joinLobby', () => {
      if (socket.rooms.has('lobby')) {
        console.log(`Socket ${socket.id} déjà dans le lobby, ignoré, timestamp: ${new Date().toISOString()}`);
        return;
      }
      socket.join('lobby');
      console.log(`Socket ${socket.id} a rejoint le lobby, timestamp: ${new Date().toISOString()}`);
      sendActiveGamesToSocket(socket);
    });

    socket.on('leaveLobby', () => {
      if (socket.rooms.has('lobby')) {
        socket.leave('lobby');
        console.log(`Socket ${socket.id} a quitté la salle lobby, timestamp: ${new Date().toISOString()}`);
        scheduleActiveGamesUpdate();
      }
    });

    socket.once('disconnect', () => {
      console.log(`Socket ${socket.id} déconnecté, timestamp: ${new Date().toISOString()}`);
      connectedSockets.delete(socket.id);
      playerManager.removePlayer(socket.id);
      if (socket.rooms.has('lobby')) {
        socket.leave('lobby');
        console.log(`Socket ${socket.id} a quitté la salle lobby lors de la déconnexion, timestamp: ${new Date().toISOString()}`);
        scheduleActiveGamesUpdate();
      }
    });

    socket.on('createGame', async (data, ack) => {
      console.log('Reçu createGame pour socket ID:', socket.id, { data, timestamp: new Date().toISOString() });
      try {
        const { isRanked, gameFormat } = z
          .object({
            isRanked: z.boolean(),
            gameFormat: z.enum(['BO1', 'BO3']),
          })
          .parse(data);

        const playerInfo = playerManager.getPlayer(socket.id);
        if (playerInfo && playerInfo.gameId) {
          console.log(`Socket ${socket.id} a déjà une partie en cours: ${playerInfo.gameId}, timestamp: ${new Date().toISOString()}`);
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
              console.log(`Impossible de générer un ID de partie unique pour socket ${socket.id}, timestamp: ${new Date().toISOString()}`);
              ack({ error: 'Impossible de générer un ID de partie unique' });
              return;
            }
          } else {
            break;
          }
        } while (true);

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
          deckChoices: { '1': null, '2': [] },
          availableDecks: cardManager.getRandomDecks(),
          createdAt: new Date(),
          status: 'waiting',
        };

        await gameRepository.insertGame(newGame);
        gameCache.setGame(gameId, newGame);
        playerManager.addPlayer(socket.id, { gameId, playerId: 1 });

        if (socket.rooms.has('lobby')) {
          socket.leave('lobby');
          console.log(`Socket ${socket.id} a quitté la salle lobby après création de partie, timestamp: ${new Date().toISOString()}`);
        }
        scheduleActiveGamesUpdate();

        ack({
          gameId,
          playerId: 1,
          chatHistory: newGame.chatHistory,
          availableDecks: newGame.availableDecks,
        });
      } catch (error) {
        console.error('Erreur lors de la création de la partie:', error);
        ack({ error: 'Erreur lors de la création de la partie' });
      }
    });

    socket.on('joinGame', async (data) => {
      try {
        const gameId = JoinGameSchema.parse(data);
        const game = await gameRepository.findGameById(gameId);
        if (!game) {
          socket.emit('error', 'Partie non trouvée');
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

        game.players.push(socket.id);
        socket.join(gameId);

        if (game.players.length === 2) {
          const [player1SocketId, player2SocketId] = game.players.sort(() => Math.random() - 0.5);
          playerManager.addPlayer(player1SocketId, { gameId, playerId: 1 });
          playerManager.addPlayer(player2SocketId, { gameId, playerId: 2 });
          game.state.activePlayer = player1SocketId;

          await gameRepository.updateGame(gameId, {
            players: [player1SocketId, player2SocketId],
            state: { ...game.state, activePlayer: player1SocketId },
            status: 'started',
          });
          gameCache.setGame(gameId, game);

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
          console.log('Envoi de gameStart à player1:', gameStartDataPlayer1);
          console.log('Envoi de gameStart à player2:', gameStartDataPlayer2);
          io.to(player1SocketId).emit('gameStart', gameStartDataPlayer1);
          io.to(player2SocketId).emit('gameStart', gameStartDataPlayer2);
          io.to(gameId).emit('playerJoined', { playerId: 2 });
          io.to(gameId).emit('initialDeckList', game.availableDecks);
          io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);
          if (!game.deckChoices[1]) {
            io.to(player2SocketId).emit('waitingForPlayer1Choice');
          }
        } else {
          playerManager.addPlayer(socket.id, { gameId, playerId: null });
          socket.emit('waiting', { gameId, message: 'En attente d\'un autre joueur...' });
        }
        if (socket.rooms.has('lobby')) {
          socket.leave('lobby');
          console.log(`Socket ${socket.id} a quitté la salle lobby après joinGame, timestamp: ${new Date().toISOString()}`);
        }
        scheduleActiveGamesUpdate();
      } catch (error) {
        console.error('Erreur lors de la jointure de la partie:', error);
        socket.emit('error', 'Erreur lors de la jointure de la partie');
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
  });
}