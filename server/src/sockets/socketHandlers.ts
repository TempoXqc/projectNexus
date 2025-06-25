// server/src/sockets/socketHandlers.ts
import { Server, Socket } from 'socket.io';
import { GameRepository } from '../database/gameRepository';
import { GameCache } from '../cache/gameCache';
import { GameLogic } from '../game/gameLogic';
import { CardManager } from '../game/cardManager';
import { PlayerManager } from '../game/playerManager';
import {
  PlayCardSchema,
  JoinGameSchema,
  ChooseDeckSchema,
} from './socketSchemas';

export function registerSocketHandlers(io: Server) {
  const gameRepository = new GameRepository(/* db instance */);
  const cardManager = new CardManager();
  const gameLogic = new GameLogic(gameRepository, cardManager);
  const playerManager = new PlayerManager();
  const gameCache = new GameCache();

  io.on('connection', (socket: Socket) => {
    gameLogic.emitActiveGames(io);

    socket.on('createGame', async () => {
      const gameId = Math.random().toString(36).substring(2, 10);
      const newGame = {
        gameId,
        players: [socket.id],
        chatHistory: [],
        state: {
          player1: {
            hand: [], field: Array(8).fill(null), opponentField: Array(8).fill(null),
            opponentHand: [], deck: [], graveyard: [], mustDiscard: false,
            hasPlayedCard: false, lifePoints: 30, tokenCount: 0, tokenType: null,
          },
          player2: {
            hand: [], field: Array(8).fill(null), opponentField: Array(8).fill(null),
            opponentHand: [], deck: [], graveyard: [], mustDiscard: false,
            hasPlayedCard: false, lifePoints: 30, tokenCount: 0, tokenType: null,
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

      try {
        await gameRepository.insertGame(newGame);
        gameCache.setGame(gameId, newGame);
        playerManager.addPlayer(socket.id, { gameId, playerId: null });
        socket.join(gameId);
        socket.emit('gameCreated', { gameId, playerId: null, chatHistory: [] });
        await gameLogic.emitActiveGames(io);
      } catch (error) {
        socket.emit('error', 'Erreur lors de la création de la partie');
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

          io.to(player1SocketId).emit('gameStart', {
            playerId: 1, gameId, chatHistory: game.chatHistory, availableDecks: game.availableDecks,
          });
          io.to(player2SocketId).emit('gameStart', {
            playerId: 2, gameId, chatHistory: game.chatHistory, availableDecks: game.availableDecks,
          });
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
        await gameLogic.emitActiveGames(io);
      } catch (error) {
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

        const updatedCard = { ...card, exhausted: false };
        game.state[playerKey].field[fieldIndex] = updatedCard;
        game.state[playerKey].hand = game.state[playerKey].hand.filter((c) => c.id !== card.id);
        game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand.length).fill({});
        game.state[opponentKey].opponentHand = Array(game.state[playerKey].hand.length).fill({});

        await gameRepository.updateGame(gameId, { state: game.state });
        gameCache.setGame(gameId, game);
        io.to(gameId).emit('updateGameState', game.state);
      } catch (error) {
        socket.emit('error', 'Erreur lors de l\'action playCard');
      }
    });

    // Ajouter d'autres gestionnaires (exhaustCard, updateLifePoints, etc.) ici
  });
}