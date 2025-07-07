import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { GameState } from '@tempoxqc/project-nexus-types';
import { socketService } from '@/services/socketService.ts';
import { EmitSendMessageSchema } from '@tempoxqc/project-nexus-types';
import { GameStartSchema } from '@tempoxqc/project-nexus-types';
import { EmitJoinGameSchema } from '@tempoxqc/project-nexus-types';
import { Card } from '@tempoxqc/project-nexus-types';

interface ServerToClientEvents {
  connect: () => void;
  connect_error: (error: Error) => void;
  disconnect: () => void;
  gameStart: (data: { playerId: number; gameId: string; chatHistory: { playerId: number; message: string }[]; availableDecks: { id: string; name: string; image: string }[] }) => void;
  player1ChoseDeck: (data: { player1DeckId: string }) => void;
  deckSelectionUpdate: (data: { '1': string[] | null; '2': string[] }) => void;
  waitingForPlayer1Choice: (data: { waiting: boolean }) => void;
  deckSelectionDone: (data: { player1DeckId: string[] | string; player2DeckIds: string[]; selectedDecks: string[] }) => void;
  bothPlayersReady: (data: { bothReady: boolean }) => void;
  playerJoined: (data: { playerId: number }) => void;
  error: (message: string) => void;
  gameNotFound: () => void;
  initializeDeck: (data: { deck: Card[]; initialDraw: Card[]; tokenType: string | null; tokenCount: number }) => void;
  initialDeckList: (availableDecks: { id: string; name: string; image: string }[]) => void;
  endTurn: () => void;
  yourTurn: () => void;
  phaseChangeMessage: (data: { phase: 'Standby' | 'Main' | 'Battle' | 'End'; turn: number; nextPlayerId: number }) => void;
  handleAssassinTokenDraw: (data: { playerLifePoints: number; opponentTokenCount: number }) => void;
}

export interface ClientToServerEvents {
  joinGame: (gameId: string) => void;
  sendMessage: (data: { gameId: string; message: string }) => void;
  chooseDeck: (data: { gameId: string; playerId: number; deckId: string }) => void;
  playerReady: (data: { gameId: string; playerId: number }) => void;
  updatePhase: (data: { gameId: string; phase: 'Standby' | 'Main' | 'Battle' | 'End'; turn: number }) => void;
  updateGameState: (data: { gameId: string; state: any }) => void;
  playCard: (data: { gameId: string; card: Card; fieldIndex: number }) => void;
  exhaustCard: (data: { gameId: string; cardId: string; fieldIndex: number }) => void;
  attackCard: (data: { gameId: string; cardId: string }) => void;
  drawCard: (data: { gameId: string; playerId: number }) => void;
  updateLifePoints: (data: { gameId: string; lifePoints: number }) => void;
  updateTokenCount: (data: { gameId: string; tokenCount: number }) => void;
  leaveGame: (data: { gameId: string; playerId: number }) => void;
  checkPlayerGame: (data: { playerId: string }, callback: (response: { exists: boolean; gameId?: string; availableDecks?: string[] }) => void) => void;
  checkGameExists: (gameId: string, callback: (exists: boolean) => void) => void;
}

export const useGameSocket = (
  gameId: string | undefined,
  setState: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void,
  playerId: number | null,
  isConnected: boolean,
) => {
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>(socketService.getSocket());

  const tryJoin = () => {
    if (!gameId || hasJoinedRef.current || !isConnected) {
      console.log('tryJoin ignoré:', { gameId, hasJoined: hasJoinedRef.current, playerId, isConnected }, 'timestamp:', new Date().toISOString());
      return;
    }
    hasJoinedRef.current = true;
    socketRef.current.emit('checkGameExists', gameId, (exists: boolean) => {
      if (!exists) {
        console.log(`Partie ${gameId} n'existe pas, redirection vers /`, 'timestamp:', new Date().toISOString());
        hasJoinedRef.current = false;
        navigate('/');
        toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
        return;
      }
      try {
        const parsedGameId = EmitJoinGameSchema.parse(gameId);
        socketRef.current.emit('joinGame', parsedGameId);
        console.log(`Émission de joinGame pour gameId: ${parsedGameId}, playerId: ${playerId}`, 'timestamp:', new Date().toISOString());
      } catch (error) {
        console.error('[ERROR] joinGame validation failed:', error, 'timestamp:', new Date().toISOString());
        hasJoinedRef.current = false;
        navigate('/');
        toast.error('ID de jeu invalide.', { toastId: 'joinGame_error' });
      }
    });
  };

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    const socket = socketRef.current;

    const persistentListeners = () => {
      socket.on('connect', () => {
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: true },
        }));
        toast.success('Connecté au serveur !', { toastId: 'connect' });
        if (!hasJoinedRef.current) {
          tryJoin();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error, 'timestamp:', new Date().toISOString());
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.error('Erreur de connexion au serveur.', { toastId: 'connect_error' });
        hasJoinedRef.current = false;
      });

      socket.on('disconnect', () => {
        console.log(`Socket déconnecté dans useGameSocket, ID: ${socket.id}, timestamp: ${new Date().toISOString()}`);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.warn('Déconnexion du serveur.', { toastId: 'disconnect' });
        hasJoinedRef.current = false;
      });

      socket.on('gameNotFound', () => {
        console.log('Partie non trouvée, redirection vers Home', 'timestamp:', new Date().toISOString());
        navigate('/');
        toast.error('La partie n\'existe plus.', { toastId: 'game_not_found' });
      });

      socket.on('error', (message) => {
        console.error('Erreur serveur reçue:', message, 'timestamp:', new Date().toISOString());
        if (message === 'Erreur lors de la confirmation de préparation') {
          console.log('Ignorer l\'erreur de confirmation de préparation, maintien de la connexion', 'timestamp:', new Date().toISOString());
          toast.warn('Erreur lors de la confirmation, veuillez réessayer.', { toastId: 'ready_error' });
          return;
        }
        if (message === 'La partie est pleine' && hasJoinedRef.current) {
          console.log('Ignorer l\'erreur "La partie est pleine" car le joueur est déjà dans la partie', 'timestamp:', new Date().toISOString());
          return;
        }
        if (message.includes('Non autorisé')) {
          console.log('Ignorer l\'erreur "Non autorisé", maintien de la connexion', 'timestamp:', new Date().toISOString());
          toast.warn('Action non autorisée : ce n\'est pas votre tour.', { toastId: 'not_authorized' });
          return;
        }
        toast.error(message, { toastId: 'server_error' });
        navigate('/');
      });
    };

    const gameListeners = () => {
      socket.on('gameStart', (data) => {
        try {
          const parsedData = GameStartSchema.parse(data);
          hasJoinedRef.current = true;
          setState((prev: GameState): Partial<GameState> => ({
            connection: {
              ...prev.connection,
              playerId: parsedData.playerId,
              isConnected: true,
            },
            chat: {
              ...prev.chat,
              messages: parsedData.chatHistory,
            },
            deckSelection: {
              ...prev.deckSelection,
              randomizers: parsedData.availableDecks,
              selectedDecks: [],
              player1DeckId: null,
              waitingForPlayer1: parsedData.playerId === 2,
            },
          }));
        } catch (error) {
          toast.error('Erreur lors du démarrage de la partie.', { toastId: 'game_start_error' });
        }
      });

      socket.on('player1ChoseDeck', (data) => {
        setState((prev: GameState): Partial<GameState> => {
          const player1DeckIds = [data.player1DeckId];
          const newState = {
            deckSelection: {
              ...prev.deckSelection,
              player1DeckId: player1DeckIds,
              deckSelectionData: {
                ...prev.deckSelection.deckSelectionData,
                player1DeckId: player1DeckIds,
                player2DeckIds: prev.deckSelection.deckSelectionData?.player2DeckIds || [],
                selectedDecks: [...new Set([...(prev.deckSelection.deckSelectionData?.selectedDecks || []), ...player1DeckIds])],
              },
              waitingForPlayer1: false,
              hasChosenDeck: prev.connection.playerId === 1 ? true : prev.deckSelection.hasChosenDeck,
              selectedDecks: [...new Set([...prev.deckSelection.selectedDecks, ...player1DeckIds])],
            },
          };
          return newState;
        });
      });

      socket.on('deckSelectionUpdate', (data) => {
        setState((prev: GameState): Partial<GameState> => {
          const player1DeckIds = data['1'] || [];
          const player2DeckIds = data['2'] || [];
          const newSelectedDecks = [...player1DeckIds, ...player2DeckIds].filter((id): id is string => id !== null);
          const newState = {
            deckSelection: {
              ...prev.deckSelection,
              player1DeckId: player1DeckIds,
              deckSelectionData: {
                ...prev.deckSelection.deckSelectionData,
                player1DeckId: player1DeckIds,
                player2DeckIds: player2DeckIds,
                selectedDecks: newSelectedDecks,
              },
              selectedDecks: newSelectedDecks,
              hasChosenDeck: prev.connection.playerId === 1
                ? !!player1DeckIds.length
                : prev.deckSelection.hasChosenDeck || player2DeckIds.length > 0,
            },
          };
          return newState;
        });
      });

      socket.on('waitingForPlayer1Choice', (data) => {
        setState((prev: GameState): Partial<GameState> => {
          const newState = {
            deckSelection: {
              ...prev.deckSelection,
              waitingForPlayer1: data.waiting,
            },
          };
          return newState;
        });
      });

      socket.on('deckSelectionDone', (data) => {
        setState((prev: GameState): Partial<GameState> => {
          const player1DeckIds = typeof data.player1DeckId === 'string' ? data.player1DeckId.split(',') : data.player1DeckId;
          const newState = {
            deckSelection: {
              ...prev.deckSelection,
              player1DeckId: player1DeckIds,
              deckSelectionData: {
                player1DeckId: player1DeckIds,
                player2DeckIds: data.player2DeckIds,
                selectedDecks: data.selectedDecks,
              },
              waitingForPlayer1: false,
              selectedDecks: data.selectedDecks,
              hasChosenDeck: true,
              deckSelectionDone: true,
            },
          };
          return newState;
        });
      });

      socket.on('bothPlayersReady', (data) => {
        setState((prev: GameState): Partial<GameState> => {
          const newState = {
            deckSelection: {
              ...prev.deckSelection,
              bothReady: data.bothReady,
              opponentReady: data.bothReady,
            },
          };
          return newState;
        });
      });

      socket.on('initializeDeck', (data) => {
        setState((prev: GameState): Partial<GameState> => {
          const newState = {
            player: {
              ...prev.player,
              deck: data.deck,
              hand: data.initialDraw,
              tokenType: data.tokenType,
              tokenCount: data.tokenCount,
            },
            deckSelection: {
              ...prev.deckSelection,
              initialDraw: data.initialDraw,
            },
          };
          return newState;
        });
      });

      socket.on('playerJoined', (data) => {
        console.log('playerJoined reçu dans useGameSocket:', data, 'timestamp:', new Date().toISOString());
      });

      socket.on('updateGameState', (data: GameState) => {
        setState((prev: GameState) => ({
          ...prev,
          player: { ...prev.player, ...data.player },
          opponent: { ...prev.opponent, ...data.opponent },
          game: { ...prev.game, ...data.game },
          ui: { ...prev.ui, ...data.ui },
          chat: { ...prev.chat, ...data.chat },
          deckSelection: { ...prev.deckSelection, ...data.deckSelection },
          connection: { ...prev.connection, ...data.connection },
        }));
      });

      socket.on('endTurn', () => {
        console.log('[WebSocket] endTurn reçu dans useGameSocket', 'timestamp:', new Date().toISOString());
      });

      socket.on('yourTurn', () => {
        console.log('[WebSocket] yourTurn reçu dans useGameSocket', 'timestamp:', new Date().toISOString());
        setState((prev: GameState) => ({
          ...prev,
          game: { ...prev.game, isMyTurn: true },
        }));
      });

      socket.on('handleAssassinTokenDraw', (data) => {
        console.log('[WebSocket] handleAssassinTokenDraw reçu dans useGameSocket:', data, 'timestamp:', new Date().toISOString());
        setState((prev: GameState) => ({
          ...prev,
          player: { ...prev.player, lifePoints: data.playerLifePoints },
          opponent: { ...prev.opponent, tokenCount: data.opponentTokenCount },
        }));
      });
    };

    persistentListeners();
    gameListeners();
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('updateGameState');
      socket.off('gameStart');
      socket.off('player1ChoseDeck');
      socket.off('deckSelectionUpdate');
      socket.off('waitingForPlayer1Choice');
      socket.off('deckSelectionDone');
      socket.off('bothPlayersReady');
      socket.off('initializeDeck');
      socket.off('playerJoined');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('error');
      socket.off('gameNotFound');
      socket.off('endTurn');
      socket.off('yourTurn');
      socket.off('phaseChangeMessage');
      socket.off('handleAssassinTokenDraw');
    };
  }, [gameId, navigate, setState, playerId, isConnected]);

  const emit = (event: keyof ClientToServerEvents, data: any, callback?: (response: any) => void) => {
    if (!isConnected) return;
    try {
      let parsedData: any;
      switch (event) {
        case 'joinGame':
          parsedData = EmitJoinGameSchema.parse(data);
          break;
        case 'sendMessage':
          parsedData = EmitSendMessageSchema.parse(data);
          break;
        case 'checkPlayerGame':
        case 'checkGameExists':
        case 'leaveGame':
        case 'updatePhase':
        case 'updateGameState':
        case 'playCard':
        case 'exhaustCard':
        case 'attackCard':
        case 'drawCard':
        case 'updateLifePoints':
        case 'updateTokenCount':
          parsedData = data;
          break;
        default:
          parsedData = data;
      }
      socketRef.current.emit(event, parsedData, callback);
      console.log(`Émission de ${event}:`, parsedData, 'timestamp:', new Date().toISOString());
    } catch (error) {
      toast.error(`Erreur lors de l'envoi de l'événement ${event}.`, { toastId: `${event}_emit_error` });
      console.error(`[ERROR] Emit validation failed for ${event}:`, error, 'timestamp:', new Date().toISOString());
    }
  };

  return { socket: socketRef.current, emit, tryJoin };
};