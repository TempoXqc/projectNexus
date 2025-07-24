import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Card, GameState } from '@tempoxqc/project-nexus-types';
import { socketService } from '@/services/socketService.ts';
import { clientConfig } from '@/config/clientConfig.ts';

export interface ClientToServerEvents {
  checkGameExists: (gameId: string, callback: (exists: boolean) => void) => void;
  joinGame: (data: { gameId: string; username?: string }, callback?: (response: any) => void) => void;
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
  gameId,
  setState,
  playerId,
  isConnected,
  username,
  setPlayerId,
) => {
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef(socketService.getSocket());
  const [revealedCards, setRevealedCards] = useState([]);
  const [effectiveUsername, setEffectiveUsername] = useState(username);
  const [effectivePlayerId, setEffectivePlayerId] = useState(playerId);

  useEffect(() => {
    if (!effectiveUsername) {
      const token = localStorage.getItem('authToken');
      if (token) {
        fetch(`${clientConfig.apiUrl}/api/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.username) {
              setEffectiveUsername(data.username);
              console.log('[useGameSocket] Username récupéré via /api/verify:', data.username);
            } else {
              localStorage.removeItem('authToken');
              toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
              navigate('/');
            }
          })
          .catch((error) => {
            console.error('[useGameSocket] Erreur lors de la vérification du token:', error);
            localStorage.removeItem('authToken');
            toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
            navigate('/');
          });
      } else {
        console.log('[useGameSocket] Aucun token trouvé');
        toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
        navigate('/');
      }
    }
  }, [effectiveUsername, navigate]);

  const tryJoin = () => {
    if (!gameId || !socketRef.current.connected) {
      console.log('[useGameSocket] Échec tryJoin: gameId ou connexion manquant', { gameId, isConnected: socketRef.current.connected });
      toast.error('Connexion perdue ou ID de partie manquant.', { toastId: 'join_game_error' });
      navigate('/');
      return;
    }

    if (!effectiveUsername) {
      console.log('[useGameSocket] Échec tryJoin: username manquant');
      return;
    }

    console.log('[useGameSocket] tryJoin - Username:', effectiveUsername, 'PlayerId:', effectivePlayerId);
    socketRef.current.emit('checkGameExists', gameId, (exists) => {
      if (!exists) {
        hasJoinedRef.current = false;
        console.log('[useGameSocket] Échec tryJoin: partie inexistante', { gameId });
        toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
        navigate('/');
        return;
      }

      socketRef.current.emit('checkPlayerGame', { playerId: effectiveUsername }, (response) => {
        if (response.exists && response.gameId === gameId) {
          setEffectivePlayerId(response.playerId || null);
          setPlayerId(response.playerId || null);
          console.log('[useGameSocket] PlayerId récupéré via checkPlayerGame:', response.playerId);
        }
        socketRef.current.emit('joinGame', { gameId, username: effectiveUsername }, (response) => {
          if (response && response.error === 'La partie est pleine' && effectivePlayerId) {
            console.log('[useGameSocket] Tentative de reconnexion:', { gameId, playerId: effectivePlayerId });
            socketRef.current.emit('reconnectPlayer', { gameId, playerId: effectivePlayerId });
          } else if (response && response.error) {
            hasJoinedRef.current = false;
            console.log('[useGameSocket] Erreur joinGame:', response.error);
            toast.error(response.error, { toastId: 'join_game_error' });
            navigate('/');
          } else {
            setEffectivePlayerId(response.playerId || effectivePlayerId);
            setPlayerId(response.playerId || effectivePlayerId);
            hasJoinedRef.current = true;
            console.log('[useGameSocket] Jointure réussie:', { gameId, playerId: response.playerId });
            navigate(`/waiting/${gameId}`, {
              state: {
                playerId: response.playerId,
                availableDecks: response.availableDecks,
                playmats: response.playmats,
                lifeToken: response.lifeToken,
                username: effectiveUsername,
              },
            });
          }
        });
      });
    });
  };

  useEffect(() => {
    if (!gameId) {
      return; // Ne pas naviguer vers '/' si gameId est absent (évite les redirections inutiles sur la page d'accueil)
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
        if (!hasJoinedRef.current && effectiveUsername) {
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
        } else if (message === 'La partie est pleine' && hasJoinedRef.current && effectivePlayerId) {
          console.log('[useGameSocket] Tentative de reconnexion:', { gameId, playerId: effectivePlayerId });
          socket.emit('reconnectPlayer', { gameId, playerId: effectivePlayerId });
        } else if (message.includes('Non autorisé')) {
          toast.warn("Action non autorisée : ce n'est pas votre tour.", {
            toastId: 'not_authorized',
          });
        } else if (message === "Pas assez de points d'action pour jouer cette carte") {
          toast.error("Pas assez de points d'action pour jouer cette carte.", {
            toastId: 'action_points_error',
          });
          socket.emit('updateGameState', { gameId, state: {} });
        } else {
          toast.error(message, { toastId: 'server_error' });
        }
      });

      socket.on('opponentDisconnected', (data) => {
        console.log('[useGameSocket] Opposant déconnecté:', data);
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, isConnected: true },
          game: {
            ...prev.game,
            gameOver: true,
            winner: effectivePlayerId === data.disconnectedPlayerId ? null : `player${effectivePlayerId}`,
          },
        }));
        toast.warn("L'opposant s'est déconnecté. Partie terminée.", {
          toastId: 'opponent_disconnected',
        });
      });

      socket.on('playerJoined', (data) => {
        console.log('[useGameSocket] playerJoined reçu:', data);
        setEffectivePlayerId(data.playerId);
        setPlayerId(data.playerId);
        navigate(`/waiting/${gameId}`, {
          state: {
            playerId: data.playerId,
            availableDecks: data.availableDecks,
            playmats: data.playmats,
            lifeToken: data.lifeToken,
            username: effectiveUsername,
          },
        });
      });

      socket.on('gameStart', (data) => {
        if (window.location.pathname.startsWith('/waiting')) {
          console.log('[useGameSocket] gameStart reçu:', data);
          setEffectivePlayerId(data.playerId);
          setPlayerId(data.playerId);
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
        } else {
          console.log('[useGameSocket] gameStart ignoré: joueur pas encore dans waiting', { pathname: window.location.pathname });
        }
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
              selectedDecks: [...(data['1'] || []), ...(data['2'] || [])].filter((id) => id !== null),
            },
            selectedDecks: [...(data['1'] || []), ...(data['2'] || [])].filter((id) => id !== null),
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
        console.log('[useGameSocket] yourTurn received for player:', effectivePlayerId);
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
        callback(data.cards.map((card) => card.id));
      });

      socket.on('selectSplitDamageTargets', (data, callback) => {
        console.log('[useGameSocket] selectSplitDamageTargets received:', data);
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
      socket.off('playerJoined');
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
  }, [gameId, navigate, setState, effectivePlayerId, isConnected, effectiveUsername]);

  const emit = (event, data, callback) => {
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