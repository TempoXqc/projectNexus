import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Card, GameState } from '@tempoxqc/project-nexus-types';
import { socketService } from '@/services/socketService.ts';

interface ServerToClientEvents {
  connect: () => void;
  connect_error: (error: Error) => void;
  disconnect: () => void;
  gameStart: (data: {
    playerId: number | null;
    gameId: string;
    chatHistory: { playerId: number; message: string }[];
    availableDecks: { id: string; name: string; image: string; infoImage: string }[];
    playmats: { id: string; name: string; image: string }[];
    lifeToken: { id: string; name: string; image: string };
  }) => void;
  player1ChoseDeck: (data: { player1DeckId: string }) => void;
  deckSelectionUpdate: (data: { '1': string[] | null; '2': string[] }) => void;
  waitingForPlayer1Choice: (data: { waiting: boolean }) => void;
  deckSelectionDone: (data: {
    player1DeckId: string[] | string;
    player2DeckIds: string[];
    selectedDecks: string[];
  }) => void;
  bothPlayersReady: (data: { bothReady: boolean }) => void;
  playerJoined: (data: { playerId: number }) => void;
  error: (message: string) => void;
  gameNotFound: () => void;
  initializeDeck: (data: {
    deck: Card[];
    initialDraw: Card[];
    tokenType: string | null;
    tokenCount: number;
  }) => void;
  initialDeckList: (
    availableDecks: { id: string; name: string; image: string; infoImage: string }[],
  ) => void;
  updatePhase: (data: {
    phase: 'Standby' | 'Main' | 'Battle' | 'End';
    turn: number;
    nextPlayerId?: number;
  }) => void;
  endTurn: () => void;
  yourTurn: () => void;
  phaseChangeMessage: (data: {
    phase: 'Standby' | 'Main' | 'Battle' | 'End';
    turn: number;
    nextPlayerId: number;
  }) => void;
  handleAssassinTokenDraw: (data: {
    playerLifePoints: number;
    opponentTokenCount: number;
  }) => void;
  requestChoice: (data: { cardId: string; options: { title: string; actions: any[] }[] }, callback: (response: string) => void) => void;
  revealCards: (cards: Card[]) => void;
  reorderRevealedCards: (data: { cards: Card[] }, callback: (response: string[]) => void) => void;
  selectSplitDamageTargets: (data: { amount: number; targets: any[] }, callback: (response: any[]) => void) => void;
  opponentDisconnected: (data: { disconnectedPlayerId: number }) => void;
}

export interface ClientToServerEvents {
  checkGameExists: (gameId: string, callback: (exists: boolean) => void) => void;
  joinGame: (gameId: string, callback?: (response: any) => void) => void;
  reconnectPlayer: (data: { gameId: string; playerId: number | null }) => void;
  chooseDeck: (data: { gameId: string; playerId: number | null; deckId: string }) => void;
  playerReady: (data: { gameId: string; playerId: number | null }) => void;
  sendMessage: (data: { gameId: string; message: string }) => void;
  updatePhase: (data: { gameId: string; phase: 'Standby' | 'Main' | 'Battle' | 'End'; turn: number }) => void;
  drawCard: (data: { gameId: string; playerId: number | null }) => void;
  playCard: (data: { gameId: string; card: Card; fieldIndex: number }) => void;
  exhaustCard: (data: { gameId: string; cardId: string; fieldIndex: number }) => void;
  attackCard: (data: { gameId: string; cardId: string }) => void;
  updateLifePoints: (data: { gameId: string; lifePoints: number }) => void;
  updateTokenCount: (data: { gameId: string; tokenCount: number }) => void;
  updateGameState: (data: { gameId: string; state: Partial<GameState> }) => void;
  selectChoice: (data: { cardId: string; choice: string }) => void;
  reorderRevealedCardsResponse: (data: { cardIds: string[] }) => void;
  selectSplitDamageTargetsResponse: (data: { targets: any[] }) => void;
  leaveGame: (data: { gameId: string; playerId: number | null }, callback?: () => void) => void;
  checkPlayerGame: (
    data: { playerId: string },
    callback: (response: {
      exists: boolean;
      gameId?: string;
      availableDecks?: { id: string; name: string; image: string; infoImage: string }[];
    }) => void,
  ) => void;
}

export const useGameSocket = (
  gameId: string | undefined,
  setState: Dispatch<SetStateAction<GameState>>,
  playerId: number | null,
  isConnected: boolean,
) => {
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>(
    socketService.getSocket(),
  );
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);

  const tryJoin = () => {
    if (!gameId || !playerId || !socketRef.current.connected) {
      toast.error('Connexion perdue ou paramètres manquants.', { toastId: 'join_game_error' });
      navigate('/');
      return;
    }
    hasJoinedRef.current = true;
    socketRef.current.emit('checkGameExists', gameId, (exists: boolean) => {
      if (!exists) {
        hasJoinedRef.current = false;
        navigate('/');
        toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
        return;
      }
      socketRef.current.emit('joinGame', gameId, (response) => {
        if (response && response.error === 'La partie est pleine') {
          console.log('[useGameSocket] Tentative de reconnexion:', { gameId, playerId });
          socketRef.current.emit('reconnectPlayer', { gameId, playerId });
        } else if (response && response.error) {
          hasJoinedRef.current = false;
          navigate('/');
          toast.error(response.error, { toastId: 'joinGame_error' });
        }
      });
    });
  };

  useEffect(() => {
    if (!gameId || !playerId) {
      navigate('/');
      return;
    }

    const socket = socketRef.current;

    const persistentListeners = () => {
      socket.on('connect', () => {
        console.log('[useGameSocket] Connecté:', socket.id);
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
        console.error('[useGameSocket] Erreur de connexion WebSocket:', error);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.error('Erreur de connexion au serveur. Reconnexion en cours...', { toastId: 'connect_error' });
        hasJoinedRef.current = false;
        setTimeout(() => {
          if (!socket.connected) socket.connect();
        }, 1000);
      });

      socket.on('disconnect', () => {
        console.log('[useGameSocket] Déconnexion:', socket.id);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: false },
        }));
        toast.warn('Déconnexion du serveur. Reconnexion en cours...', { toastId: 'disconnect' });
        hasJoinedRef.current = false;
      });

      socket.on('gameNotFound', () => {
        navigate('/');
        toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
      });

      socket.on('error', (message) => {
        console.error('[useGameSocket] Erreur serveur reçue:', message);
        if (message === 'Erreur lors de la confirmation de préparation') {
          toast.warn('Erreur lors de la confirmation, veuillez réessayer.', {
            toastId: 'ready_error',
          });
          return;
        }
        if (message === 'La partie est pleine' && hasJoinedRef.current) {
          console.log('[useGameSocket] Tentative de reconnexion:', { gameId, playerId });
          socket.emit('reconnectPlayer', { gameId, playerId });
          return;
        }
        if (message.includes('Non autorisé')) {
          toast.warn("Action non autorisée : ce n'est pas votre tour.", {
            toastId: 'not_authorized',
          });
          return;
        }
        toast.error(message, { toastId: 'server_error' });
        navigate('/');
      });

      socket.on('opponentDisconnected', (data: { disconnectedPlayerId: number }) => {
        console.log('[useGameSocket] Opposant déconnecté:', data);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: true },
          game: {
            ...prev.game,
            gameOver: true,
            winner: playerId === data.disconnectedPlayerId ? null : `player${playerId}`,
          },
        }));
        toast.warn("L'opposant s'est déconnecté. Partie terminée.", {
          toastId: 'opponent_disconnected',
        });
      });

      socket.on('gameStart', (data) => {
        console.log('[useGameSocket] gameStart received:', data);
        navigate(`/game/${data.gameId}`, {
          state: {
            playerId: data.playerId,
            availableDecks: data.availableDecks,
            playmats: data.playmats,
            lifeToken: data.lifeToken,
          },
        });
        setState((prev) => ({
          ...prev,
          connection: {
            ...prev.connection,
            playerId: data.playerId,
            isConnected: true,
          },
          chat: {
            ...prev.chat,
            messages: data.chatHistory,
          },
          deckSelection: {
            ...prev.deckSelection,
            randomizers: data.availableDecks,
            selectedDecks: [],
            player1DeckId: null,
            waitingForPlayer1: data.playerId === 2,
            deckSelectionData: {
              player1DeckId: [],
              player2DeckIds: [],
              selectedDecks: [],
            },
          },
        }));
      });

      socket.on('player1ChoseDeck', (data) => {
        setState((prev) => ({
          ...prev,
          deckSelection: {
            ...prev.deckSelection,
            player1DeckId: [data.player1DeckId],
            deckSelectionData: {
              ...prev.deckSelection.deckSelectionData,
              player1DeckId: [data.player1DeckId],
              player2DeckIds: prev.deckSelection.deckSelectionData?.player2DeckIds || [],
              selectedDecks: [...new Set([...(prev.deckSelection.deckSelectionData?.selectedDecks || []), data.player1DeckId])],
            },
            waitingForPlayer1: false,
            hasChosenDeck: prev.connection.playerId === 1 ? true : prev.deckSelection.hasChosenDeck,
            selectedDecks: [...new Set([...prev.deckSelection.selectedDecks, data.player1DeckId])],
          },
        }));
      });

      socket.on('deckSelectionUpdate', (data) => {
        setState((prev) => ({
          ...prev,
          deckSelection: {
            ...prev.deckSelection,
            player1DeckId: data['1'] || [],
            deckSelectionData: {
              ...prev.deckSelection.deckSelectionData,
              player1DeckId: data['1'] || [],
              player2DeckIds: data['2'] || [],
              selectedDecks: [...(data['1'] || []), ...(data['2'] || [])].filter((id): id is string => id !== null),
            },
            selectedDecks: [...(data['1'] || []), ...(data['2'] || [])].filter((id): id is string => id !== null),
            hasChosenDeck: prev.connection.playerId === 1 ? !!data['1']?.length : prev.deckSelection.hasChosenDeck || !!data['2']?.length,
          },
        }));
      });

      socket.on('waitingForPlayer1Choice', (data) => {
        setState((prev) => ({
          ...prev,
          deckSelection: {
            ...prev.deckSelection,
            waitingForPlayer1: data.waiting,
          },
        }));
      });

      socket.on('deckSelectionDone', (data) => {
        setState((prev) => ({
          ...prev,
          deckSelection: {
            ...prev.deckSelection,
            player1DeckId: typeof data.player1DeckId === 'string' ? data.player1DeckId.split(',') : data.player1DeckId,
            deckSelectionData: {
              player1DeckId: typeof data.player1DeckId === 'string' ? data.player1DeckId.split(',') : data.player1DeckId,
              player2DeckIds: data.player2DeckIds,
              selectedDecks: data.selectedDecks,
            },
            waitingForPlayer1: false,
            selectedDecks: data.selectedDecks,
            hasChosenDeck: true,
            deckSelectionDone: true,
          },
        }));
      });

      socket.on('bothPlayersReady', (data) => {
        setState((prev) => ({
          ...prev,
          deckSelection: {
            ...prev.deckSelection,
            bothReady: data.bothReady,
            opponentReady: data.bothReady,
          },
        }));
      });

      socket.on('initializeDeck', (data) => {
        console.log('[useGameSocket] initializeDeck received:', data);
        setState((prev) => ({
          ...prev,
          player: {
            ...prev.player,
            deck: data.deck,
            hand: data.initialDraw,
            tokenType: data.tokenType,
            tokenCount: data.tokenCount,
            field: Array(8).fill(null),
            nexus: { health: 30 },
          },
          deckSelection: {
            ...prev.deckSelection,
            initialDraw: data.initialDraw,
          },
        }));
      });

      socket.on('updateGameState', (data) => {
        console.log('[useGameSocket] updateGameState received:', {
          playerId: data.connection?.playerId,
          isMyTurn: data.game?.isMyTurn,
          phase: data.game?.currentPhase,
          turn: data.game?.turn,
          field: data.player?.field,
          nexus: data.player?.nexus,
        });
        setState((prev) => ({
          ...prev,
          player: {
            ...prev.player,
            ...data.player,
            field: data.player?.field?.length === 8 ? data.player.field : Array(8).fill(null),
            nexus: data.player?.nexus || { health: 30 },
          },
          opponent: {
            ...prev.opponent,
            ...data.opponent,
            nexus: data.opponent?.nexus || { health: 30 },
          },
          game: { ...prev.game, ...data.game },
          ui: { ...prev.ui, ...data.ui },
          chat: { ...prev.chat, ...data.chat },
          deckSelection: { ...prev.deckSelection, ...data.deckSelection },
          connection: { ...prev.connection, ...data.connection },
          revealedCards: data.revealedCards,
          lastCardPlayed: data.lastCardPlayed,
          lastDestroyedUnit: data.lastDestroyedUnit,
          turnState: data.turnState,
        }));
      });

      socket.on('endTurn', () => {
        console.log('[useGameSocket] endTurn received');
        setState((prev) => ({
          ...prev,
          game: { ...prev.game, isMyTurn: false },
        }));
      });

      socket.on('yourTurn', () => {
        console.log('[useGameSocket] yourTurn received for player:', playerId);
        setState((prev) => ({
          ...prev,
          game: { ...prev.game, isMyTurn: true },
        }));
      });

      socket.on('handleAssassinTokenDraw', (data) => {
        console.log('[useGameSocket] handleAssassinTokenDraw received:', data);
        setState((prev) => ({
          ...prev,
          player: { ...prev.player, nexus: { ...prev.player.nexus, health: data.playerLifePoints } },
          opponent: { ...prev.opponent, tokenCount: data.opponentTokenCount },
        }));
      });

      socket.on('requestChoice', (data) => {
        console.log('[useGameSocket] requestChoice received:', data);
        // Logique pour afficher une modale de choix (implémentée dans GameLayout.tsx)
      });

      socket.on('revealCards', (cards) => {
        console.log('[useGameSocket] revealCards received:', cards);
        setRevealedCards(cards);
        setState((prev) => ({
          ...prev,
          revealedCards: cards,
          ui: { ...prev.ui, isRevealedCardsOpen: true },
        }));
      });

      socket.on('reorderRevealedCards', (data, callback) => {
        console.log('[useGameSocket] reorderRevealedCards received:', data);
        // Logique pour réorganiser les cartes (implémentée dans GameLayout.tsx)
        callback(data.cards.map((card: Card) => card.id));
      });

      socket.on('selectSplitDamageTargets', (data, callback) => {
        console.log('[useGameSocket] selectSplitDamageTargets received:', data);
        // Logique pour sélectionner les cibles (implémentée dans GameLayout.tsx)
        callback(data.targets.slice(0, data.amount));
      });
    };

    persistentListeners();
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('gameNotFound');
      socket.off('error');
      socket.off('opponentDisconnected');
      socket.off('gameStart');
      socket.off('player1ChoseDeck');
      socket.off('deckSelectionUpdate');
      socket.off('waitingForPlayer1Choice');
      socket.off('deckSelectionDone');
      socket.off('bothPlayersReady');
      socket.off('playerJoined');
      socket.off('initializeDeck');
      socket.off('initialDeckList');
      socket.off('updatePhase');
      socket.off('endTurn');
      socket.off('yourTurn');
      socket.off('phaseChangeMessage');
      socket.off('handleAssassinTokenDraw');
      socket.off('requestChoice');
      socket.off('revealCards');
      socket.off('reorderRevealedCards');
      socket.off('selectSplitDamageTargets');
    };
  }, [gameId, navigate, setState, playerId, isConnected]);

  const emit = (
    event: keyof ClientToServerEvents,
    data: any,
    callback?: (response: any) => void,
  ) => {
    if (!isConnected || !socketRef.current.connected) {
      toast.error(`Impossible d'envoyer l'événement ${event}: non connecté.`, {
        toastId: `${event}_emit_error`,
      });
      return;
    }
    socketRef.current.emit(event, data, callback);
  };

  return { socket: socketRef.current, emit, tryJoin, revealedCards };
};