// client/src/hooks/useGameSocket.ts
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { GameState } from 'types/GameStateTypes';
import { Card } from 'types/CardTypes';
import {
  ChatMessageSchema,
  EmitSendMessageSchema,
} from 'types/SocketSchemas/Chat';
import {
  GameStartSchema,
  GameStateUpdateSchema,
  EmitUpdateGameStateSchema,
} from 'types/SocketSchemas/Game';
import {
  DeckSelectionUpdateSchema,
  DeckSelectionDoneSchema,
  EmitChooseDeckSchema,
  WaitingForPlayer1ChoiceSchema,
  Player1ChoseDeckSchema,
} from 'types/SocketSchemas/Deck';
import {
  PlayerReadySchema,
  EmitPlayerReadySchema,
} from 'types/SocketSchemas/Player';
import { EmitUpdatePhaseSchema } from 'types/SocketSchemas/Phase';
import {
  EmitJoinGameSchema,
  EmitEndTurnSchema,
  EmitExhaustCardSchema,
  EmitAttackCardSchema,
  EmitUpdateLifePointsSchema,
  EmitUpdateTokenCountSchema,
  EmitAddAssassinTokenToOpponentDeckSchema,
  EmitPlaceAssassinTokenAtOpponentDeckBottomSchema,
  EmitHandleAssassinTokenDrawSchema,
} from 'types/SocketSchemas/Action';
import { PhaseDataSchema } from 'types/PhaseDataTypes';
import { mapDeckImages } from '@/utils/mapDeckImages.ts';
import { socketService } from '@/services/socketService.ts';

export const useGameSocket = (
  gameId: string | undefined,
  setState: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void,
  playerId: number | null,
  isConnected: boolean,
  chatMessages: { playerId: number; message: string }[],
) => {
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef<Socket>(socketService.getSocket());

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    const socket = socketRef.current;

    const persistentListeners = () => {
      socket.on('connect', () => {
        console.log('WebSocket connected, socket ID:', socket.id);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: true },
        }));
        toast.success('Connecté au serveur !', { toastId: 'connect' });
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.error('Erreur de connexion au serveur. Veuillez vérifier votre réseau.', {
          toastId: 'connect_error',
        });
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.warn('Déconnexion du serveur. Tentative de reconnexion...', {
          toastId: 'disconnect',
        });
      });

      socket.on('error', (message) => {
        console.error('Server error:', message);
        toast.error(message, { toastId: 'server_error' });
      });
    };

    const gameListeners = () => {
      socket.on('gameCreated', (data) => {
        console.log('Received gameCreated:', data);
        try {
          const parsedData = z
            .object({
              gameId: z.string(),
              playerId: z.number().nullable(),
              chatHistory: z.array(ChatMessageSchema),
            })
            .parse(data);
          setState((prev) => ({
            ...prev,
            connection: { ...prev.connection, playerId: parsedData.playerId },
            chat: { ...prev.chat, messages: parsedData.chatHistory },
            game: { ...prev.game, isMyTurn: parsedData.playerId === 1 },
          }));
        } catch (error) {
          toast.error('Données de création de partie invalides.', { toastId: 'gameCreated_error' });
          console.error('[ERROR] gameCreated validation failed:', error);
        }
      });

      socket.on('gameStart', (data) => {
        try {
          const parsedData = GameStartSchema.parse(data);
          setState((prev) => ({
            ...prev,
            connection: { ...prev.connection, playerId: parsedData.playerId },
            chat: { ...prev.chat, messages: parsedData.chatHistory },
            game: { ...prev.game, isMyTurn: parsedData.playerId === 1 },
          }));
        } catch (error) {
          toast.error('Données de démarrage de jeu invalides.', { toastId: 'gameStart_error' });
          console.error('[ERROR] gameStart validation failed:', error);
        }
      });

      socket.on('deckSelectionUpdate', (deckChoices) => {
        try {
          const parsedChoices = DeckSelectionUpdateSchema.parse(deckChoices);
          const allSelected = [parsedChoices[1], ...(parsedChoices[2] || [])].filter(
            Boolean,
          ) as string[];
          setState((prev) => ({
            ...prev,
            deckSelection: {
              ...prev.deckSelection,
              selectedDecks: allSelected,
              player1DeckId: parsedChoices[1],
            },
          }));
          console.log('Updated deckSelection with selectedDecks:', allSelected, 'player1DeckId:', parsedChoices[1]);
        } catch (error) {
          toast.error('Données de sélection de deck invalides.', {
            toastId: 'deckSelectionUpdate_error',
          });
          console.error('[ERROR] deckSelectionUpdate validation failed:', error);
        }
      });

      socket.on('deckSelectionDone', (data) => {
        try {
          const parsedData = DeckSelectionDoneSchema.parse(data);
          setState((prev) => ({
            ...prev,
            deckSelection: { ...prev.deckSelection, deckSelectionData: parsedData },
          }));
        } catch (error) {
          toast.error('Données de fin de sélection de deck invalides.', {
            toastId: 'deckSelectionDone_error',
          });
          console.error('[ERROR] deckSelectionDone validation failed:', error);
        }
      });

      socket.on('playerReady', (data) => {
        try {
          const parsedData = PlayerReadySchema.parse(data);
          if (playerId !== parsedData.playerId) {
            setState((prev) => ({
              ...prev,
              deckSelection: { ...prev.deckSelection, opponentReady: true },
            }));
          }
        } catch (error) {
          toast.error('Données de joueur prêt invalides.', { toastId: 'playerReady_error' });
          console.error('[ERROR] playerReady validation failed:', error);
        }
      });

      socket.on('bothPlayersReady', () => {
        setState((prev) => ({
          ...prev,
          deckSelection: { ...prev.deckSelection, bothReady: true },
        }));
      });

      socket.on('waitingForPlayer1Choice', () => {
        try {
          WaitingForPlayer1ChoiceSchema.parse({});
          setState((prev) => ({
            ...prev,
            deckSelection: { ...prev.deckSelection, waitingForPlayer1: true },
          }));
        } catch (error) {
          toast.error('Données d’attente du joueur 1 invalides.', {
            toastId: 'waitingForPlayer1Choice_error',
          });
          console.error('[ERROR] waitingForPlayer1Choice validation failed:', error);
        }
      });

      socket.on('player1ChoseDeck', () => {
        try {
          Player1ChoseDeckSchema.parse({});
          setState((prev) => ({
            ...prev,
            deckSelection: { ...prev.deckSelection, waitingForPlayer1: false },
          }));
        } catch (error) {
          toast.error('Données de choix du joueur 1 invalides.', {
            toastId: 'player1ChoseDeck_error',
          });
          console.error('[ERROR] player1ChoseDeck validation failed:', error);
        }
      });

      socket.on('chatMessage', (msg) => {
        try {
          const parsedMsg = ChatMessageSchema.parse(msg);
          setState((prev) => ({
            ...prev,
            chat: { ...prev.chat, messages: [...chatMessages, parsedMsg] },
          }));
        } catch (error) {
          toast.error('Message de chat invalide.', { toastId: 'chatMessage_error' });
          console.error('[ERROR] chatMessage validation failed:', error);
        }
      });

      socket.on('opponentDisconnected', () => {
        toast.error("Votre adversaire s'est déconnecté. Retour à l'accueil.", {
          toastId: 'opponent_disconnected',
        });
        navigate('/');
      });

      socket.on('updateGameState', (gameState) => {
        try {
          const parsedGameState = GameStateUpdateSchema.parse(gameState);
          const playerKey = playerId === 1 ? 'player1' : 'player2';
          const opponentKey = playerId === 1 ? 'player2' : 'player1';
          const opponentHandLength =
            parsedGameState[opponentKey]?.hand?.length ||
            parsedGameState[opponentKey]?.opponentHand?.length ||
            0;

          setState((prev: GameState) => {
            const newState: Partial<GameState> = {
              player: {
                ...prev.player, // Use prev instead of state
                field: (parsedGameState[playerKey]?.field || []).map((c: Card | null) =>
                  c ? { ...c, exhausted: c.exhausted !== undefined ? c.exhausted : false } : null,
                ),
                hand: parsedGameState[playerKey]?.hand || [],
                graveyard: parsedGameState[playerKey]?.graveyard || [],
                mustDiscard: parsedGameState[playerKey]?.mustDiscard || false,
                hasPlayedCard: parsedGameState[playerKey]?.hasPlayedCard || false,
                deck: parsedGameState[playerKey]?.deck || [],
                lifePoints: parsedGameState[playerKey]?.lifePoints || 30,
                tokenCount: parsedGameState[playerKey]?.tokenCount || 0,
                tokenType: parsedGameState[playerKey]?.tokenType || null,
              },
              opponent: {
                ...prev.opponent, // Use prev instead of state
                graveyard: parsedGameState[opponentKey]?.graveyard || [],
                field: (parsedGameState[opponentKey]?.field || []).map((c: Card | null) =>
                  c ? { ...c, exhausted: c.exhausted !== undefined ? c.exhausted : false } : null,
                ),
                hand: Array(opponentHandLength).fill({} as Card),
                deck: parsedGameState[opponentKey]?.deck || [],
                mustDiscard: parsedGameState[opponentKey]?.mustDiscard || false,
                hasPlayedCard: parsedGameState[opponentKey]?.hasPlayedCard || false,
                lifePoints: parsedGameState[opponentKey]?.lifePoints || 30,
                tokenCount: parsedGameState[opponentKey]?.tokenCount || 0,
                tokenType: parsedGameState[opponentKey]?.tokenType || null,
              },
              game: {
                ...prev.game, // Use prev instead of state
                turn: parsedGameState.turn || 1,
                currentPhase: parsedGameState.phase || 'Standby',
                isMyTurn: parsedGameState.activePlayer === socket.id,
                gameOver: parsedGameState.gameOver || false,
                winner: parsedGameState.winner || null,
              },
            };
            console.log(`[DEBUG] updateGameState received for player ${playerId}:`, {
              opponentDeckLength: newState.opponent?.deck?.length ?? 0,
              opponentDeck: newState.opponent?.deck?.map((c) => ({ id: c.id, name: c.name })) ?? [],
            });
            return newState;
          });
        } catch (error) {
          toast.error('Données de mise à jour du jeu invalides.', {
            toastId: 'updateGameState_error',
          });
          console.error('[ERROR] updateGameState validation failed:', error);
        }
      });

      socket.on('handleAssassinTokenDraw', (data) => {
        try {
          const parsedData = EmitHandleAssassinTokenDrawSchema.parse(data);
          setState((prev) => ({
            ...prev,
            player: { ...prev.player, lifePoints: parsedData.playerLifePoints },
            opponent: { ...prev.opponent, tokenCount: parsedData.opponentTokenCount },
          }));
          if (parsedData.playerLifePoints <= 0) {
            setState((prev) => ({
              ...prev,
              game: { ...prev.game, gameOver: true, winner: playerId === 1 ? 'player2' : 'player1' },
            }));
          }
        } catch (error) {
          toast.error('Données de pioche de token assassin invalides.', { toastId: 'assassin_token_draw_error' });
          console.error('[ERROR] handleAssassinTokenDraw validation failed:', error);
        }
      });

      socket.on('gameOver', ({ winner }) => {
        const playerKey = playerId === 1 ? 'player1' : 'player2';
        const message = winner === playerKey ? 'Vous avez gagné !' : 'Vous avez perdu !';
        toast.info(message, { toastId: 'gameOver' });
        setState((prev) => ({
          ...prev,
          game: { ...prev.game, gameOver: true, winner },
        }));
      });

      socket.on('yourTurn', () => {
        setState((prev) => ({
          ...prev,
          game: { ...prev.game, isMyTurn: true },
          player: { ...prev.player, hasPlayedCard: false, mustDiscard: false },
        }));
      });

      socket.on('endTurn', () => {
        try {
          setState((prev) => ({
            ...prev,
            game: { ...prev.game, isMyTurn: false },
            player: { ...prev.player, hasPlayedCard: false, mustDiscard: false },
          }));
          if (gameId && isConnected) {
            const payload = EmitUpdateGameStateSchema.parse({
              gameId,
              state: { hasPlayedCard: false, mustDiscard: false },
            });
            socket.emit('updateGameState', payload);
          }
        } catch (error) {
          toast.error('Erreur lors de la fin du tour.', { toastId: 'endTurn_error' });
          console.error('[ERROR] endTurn emit validation failed:', error);
        }
      });

      socket.on('initialDeckList', (availableDecks) => {
        try {
          const parsedDecks = z.array(z.string()).parse(availableDecks);
          const randomDeckList = mapDeckImages(parsedDecks);
          setState((prev) => ({
            ...prev,
            deckSelection: {
              ...prev.deckSelection,
              randomizers: randomDeckList,
            },
          }));
        } catch (error) {
          toast.error('Données de liste de decks invalides.', { toastId: 'initialDeckList_error' });
          console.error('[ERROR] initialDeckList validation failed:', error);
        }
      });

      socket.on('updatePhase', (phaseData) => {
        try {
          const parsedPhaseData = PhaseDataSchema.parse(phaseData);
          setState((prev) => ({
            ...prev,
            game: {
              ...prev.game,
              currentPhase: parsedPhaseData.phase,
              turn: parsedPhaseData.turn,
            },
          }));
        } catch (error) {
          toast.error('Données de mise à jour de phase invalides.', {
            toastId: 'updatePhase_error',
          });
          console.error('[ERROR] updatePhase validation failed:', error);
        }
      });

      socket.on('drawCard', () => {
        // Handled in useGameState
      });
    };

    const tryJoin = () => {
      if (!gameId || hasJoinedRef.current) return;
      try {
        const parsedGameId = EmitJoinGameSchema.parse(gameId);
        hasJoinedRef.current = true;
        socket.emit('joinGame', parsedGameId);
      } catch (error) {
        toast.error('ID de jeu invalide.', { toastId: 'joinGame_error' });
        console.error('[ERROR] joinGame validation failed:', error);
      }
    };

    persistentListeners();

    if (socket.connected) {
      tryJoin();
      gameListeners();
    } else {
      socketService.connect();
      socket.once('connect', () => {
        tryJoin();
        gameListeners();
      });
    }

    return () => {
      socket.off('gameCreated');
      socket.off('gameStart');
      socket.off('deckSelectionUpdate');
      socket.off('deckSelectionDone');
      socket.off('playerReady');
      socket.off('bothPlayersReady');
      socket.off('waitingForPlayer1Choice');
      socket.off('player1ChoseDeck');
      socket.off('chatMessage');
      socket.off('opponentDisconnected');
      socket.off('updateGameState');
      socket.off('handleAssassinTokenDraw');
      socket.off('gameOver');
      socket.off('yourTurn');
      socket.off('endTurn');
      socket.off('initialDeckList');
      socket.off('updatePhase');
      socket.off('drawCard');
      socket.off('error');
    };
  }, [gameId, navigate, playerId, chatMessages, isConnected, setState]);

  const emit = (event: string, data: any) => {
    if (!isConnected) return;

    try {
      let parsedData: any;
      switch (event) {
        case 'sendMessage':
          parsedData = EmitSendMessageSchema.parse(data);
          break;
        case 'chooseDeck':
          parsedData = EmitChooseDeckSchema.parse(data);
          break;
        case 'playerReady':
          parsedData = EmitPlayerReadySchema.parse(data);
          break;
        case 'updateGameState':
          parsedData = EmitUpdateGameStateSchema.parse(data);
          break;
        case 'exhaustCard':
          parsedData = EmitExhaustCardSchema.parse(data);
          break;
        case 'attackCard':
          parsedData = EmitAttackCardSchema.parse(data);
          break;
        case 'endTurn':
          parsedData = EmitEndTurnSchema.parse(data);
          break;
        case 'updatePhase':
          parsedData = EmitUpdatePhaseSchema.parse(data);
          break;
        case 'joinGame':
          parsedData = EmitJoinGameSchema.parse(data);
          break;
        case 'updateLifePoints':
          parsedData = EmitUpdateLifePointsSchema.parse(data);
          break;
        case 'updateTokenCount':
          parsedData = EmitUpdateTokenCountSchema.parse(data);
          break;
        case 'addAssassinTokenToOpponentDeck':
          parsedData = EmitAddAssassinTokenToOpponentDeckSchema.parse(data);
          break;
        case 'placeAssassinTokenAtOpponentDeckBottom':
          parsedData = EmitPlaceAssassinTokenAtOpponentDeckBottomSchema.parse(data);
          break;
        case 'handleAssassinTokenDraw':
          parsedData = EmitHandleAssassinTokenDrawSchema.parse(data);
          break;
        default:
          parsedData = data;
      }
      socketRef.current.emit(event, parsedData);
    } catch (error) {
      toast.error(`Erreur lors de l'envoi de l'événement ${event}.`, {
        toastId: `${event}_emit_error`,
      });
      console.error(`[ERROR] Emit validation failed for ${event}:`, error);
    }
  };

  return { socket: socketRef.current, emit };
};