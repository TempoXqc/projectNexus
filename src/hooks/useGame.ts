import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { socketService } from '@/services/socketService.ts';
import { clientConfig } from '@/config/clientConfig.ts';
import { GameState, Card } from '@tempoxqc/project-nexus-types';

const shuffleDeck = <T>(deck: T[]): T[] => [...deck].sort(() => Math.random() - 0.5);
const getRandomHand = <T>(deck: T[], count: number): T[] => [...deck].sort(() => 0.5 - Math.random()).slice(0, count);
let tokenIdCounter = 0;
const generateTokenId = () => `token_assassin_${Date.now()}_${tokenIdCounter++}_${Math.random().toString(36).slice(2, 11)}`;

const initialGameState: GameState = {
  player: {
    id: 'player',
    nexus: { health: 30 },
    hand: [],
    deck: [],
    graveyard: [],
    field: Array(8).fill(null),
    opponentField: Array(8).fill(null),
    opponentHand: [],
    tokenPool: [],
    mustDiscard: false,
    hasPlayedCard: false,
    lifePoints: 30,
    actionPoints: 1,
    tokenCount: 0,
    tokenType: null,
    mulliganDone: false,
    playmat: { id: '', name: '', image: '' },
  },
  opponent: {
    id: 'opponent',
    nexus: { health: 30 },
    hand: [],
    deck: [],
    graveyard: [],
    field: Array(8).fill(null),
    opponentField: Array(8).fill(null),
    opponentHand: [],
    tokenPool: [],
    mustDiscard: false,
    hasPlayedCard: false,
    lifePoints: 30,
    actionPoints: 1,
    tokenCount: 0,
    tokenType: null,
    mulliganDone: false,
    playmat: { id: '', name: '', image: '' },
  },
  revealedCards: [],
  lastCardPlayed: undefined,
  lastDestroyedUnit: undefined,
  targetType: undefined,
  detected: false,
  currentCard: undefined,
  turnState: {
    unitsDeployed: [],
    discardedCardsCount: 0,
    temporaryKeywords: [],
    preventDestructionCards: [],
    battlePhaseDisabled: false,
  },
  game: {
    turn: 1,
    currentPhase: 'Standby',
    isMyTurn: false,
    activePlayerId: null,
    gameOver: false,
    winner: null,
    updateTimestamp: Date.now(),
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
    isRevealedCardsOpen: false,
    isReorderCardsOpen: false,
    isSelectCardOpen: false,
    isChoiceOpen: false,
  },
  chat: {
    messages: [],
    input: '',
  },
  deckSelection: {
    selectedDecks: [],
    player1DeckId: null,
    player1Deck: [],
    player2Deck: [],
    hasChosenDeck: false,
    deckSelectionDone: false,
    initialDraw: [],
    selectedForMulligan: [],
    mulliganDone: false,
    isReady: false,
    bothReady: false,
    opponentReady: false,
    deckSelectionData: {
      player1DeckId: null,
      player2DeckIds: [],
      selectedDecks: [],
    },
    randomizers: [],
    waitingForPlayer1: true,
  },
  connection: {
    playerId: null,
    isConnected: false,
    canInitializeDraw: false,
    gameId: null,
  },
};

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

// Hook principal merged
export const useGame = (initialGameId?: string) => {
  // État principal (de useGameState.ts)
  const [state, setState] = useState<GameState>(() => {
    if (!initialGameState || !initialGameState.game) {
      console.warn('initialGameState is incomplete or missing game property, using defaultInitialGameState');
      return {
        ...initialGameState, // Utilise la version intégrée
        connection: {
          ...initialGameState.connection,
          gameId: initialGameId || '',
        },
      };
    }
    console.log('Using initialGameState:', {
      isMyTurn: initialGameState.game.isMyTurn,
      currentPhase: initialGameState.game.currentPhase,
      gameId: initialGameId,
    });
    return {
      ...initialGameState,
      connection: {
        ...initialGameState.connection,
        gameId: initialGameId || initialGameState.connection.gameId || '',
      },
    };
  });

  const set = (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => {
    setState((prev) => {
      const newState = typeof updates === 'function' ? updates(prev) : updates;
      console.log('[useGame] Updating state:', {
        gameId: newState.connection?.gameId || prev.connection.gameId,
        isMyTurn: newState.game?.isMyTurn ?? prev.game.isMyTurn,
        currentPhase: newState.game?.currentPhase ?? prev.game.currentPhase,
      });
      return { ...prev, ...newState };
    });
  };

  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);
  const socketRef = useRef(socketService.getSocket());
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);
  const [effectiveUsername, setEffectiveUsername] = useState<string>('');
  const [effectivePlayerId, setEffectivePlayerId] = useState<number | null>(null);

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
              console.log('[useGame] Username récupéré via /api/verify:', data.username);
            } else {
              localStorage.removeItem('authToken');
              toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
              navigate('/');
            }
          })
          .catch((error) => {
            console.error('[useGame] Erreur lors de la vérification du token:', error);
            localStorage.removeItem('authToken');
            toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
            navigate('/');
          });
      } else {
        console.log('[useGame] Aucun token trouvé');
        toast.error('Utilisateur non connecté.', { toastId: 'auth_required' });
        navigate('/');
      }
    }
  }, [effectiveUsername, navigate]);

  const tryJoin = () => {
    if (!state.connection.gameId || !socketRef.current.connected) {
      console.log('[useGame] Échec tryJoin: gameId ou connexion manquant', { gameId: state.connection.gameId, isConnected: socketRef.current.connected });
      toast.error('Connexion perdue ou ID de partie manquant.', { toastId: 'join_game_error' });
      navigate('/');
      return;
    }

    if (!effectiveUsername) {
      console.log('[useGame] Échec tryJoin: username manquant');
      return;
    }

    console.log('[useGame] tryJoin - Username:', effectiveUsername, 'PlayerId:', effectivePlayerId);
    socketRef.current.emit('checkGameExists', state.connection.gameId, (exists: boolean) => {
      if (!exists) {
        hasJoinedRef.current = false;
        console.log('[useGame] Échec tryJoin: partie inexistante', { gameId: state.connection.gameId });
        toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
        navigate('/');
        return;
      }

      socketRef.current.emit('checkPlayerGame', { username: effectiveUsername }, (response: any) => {
        if (response.exists && response.gameId === state.connection.gameId) {
          setEffectivePlayerId(response.playerId || null);
          console.log('[useGame] PlayerId récupéré via checkPlayerGame:', response.playerId);
        }
        socketRef.current.emit('joinGame', { gameId: state.connection.gameId, username: effectiveUsername }, (response: any) => {
          if (response && response.error === 'La partie est pleine' && effectivePlayerId) {
            console.log('[useGame] Tentative de reconnexion:', { gameId: state.connection.gameId, playerId: effectivePlayerId });
            socketRef.current.emit('reconnectPlayer', { gameId: state.connection.gameId, playerId: effectivePlayerId });
          } else if (response && response.error) {
            hasJoinedRef.current = false;
            console.log('[useGame] Erreur joinGame:', response.error);
            toast.error(response.error, { toastId: 'join_game_error' });
            navigate('/');
          } else {
            setEffectivePlayerId(response.playerId || effectivePlayerId);
            hasJoinedRef.current = true;
            console.log('[useGame] Jointure réussie:', { gameId: state.connection.gameId, playerId: response.playerId });
            navigate(`/waiting/${state.connection.gameId}`, {
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
    if (!state.connection.gameId) {
      return; // Ne pas naviguer vers '/' si gameId est absent
    }

    const socket = socketRef.current;

    const persistentListeners = () => {
      socket.on('connect', () => {
        console.log('[useGame] Connecté:', socket.id);
        set({ connection: { ...state.connection, isConnected: true } });
        toast.success('Connecté au serveur !', { toastId: 'connect' });
        if (!hasJoinedRef.current && effectiveUsername) {
          tryJoin();
        }
      });

      socket.on('connect_error', (error: any) => {
        console.error('[useGame] Erreur de connexion WebSocket:', error);
        set({ connection: { ...state.connection, isConnected: false } });
        toast.error('Erreur de connexion au serveur. Reconnexion en cours...', { toastId: 'connect_error' });
        hasJoinedRef.current = false;
        setTimeout(() => {
          if (!socket.connected) socket.connect();
        }, 1000);
      });

      socket.on('disconnect', () => {
        console.log('[useGame] Déconnexion:', socket.id);
        set({ connection: { ...state.connection, isConnected: false } });
        toast.warn('Déconnexion du serveur. Reconnexion en cours...', { toastId: 'disconnect' });
        hasJoinedRef.current = false;
      });

      socket.on('gameNotFound', () => {
        navigate('/');
        toast.error("La partie n'existe plus.", { toastId: 'game_not_found' });
      });

      socket.on('error', (message: string) => {
        console.error('[useGame] Erreur serveur reçue:', message);
        if (message === 'Erreur lors de la confirmation de préparation') {
          toast.warn('Erreur lors de la confirmation, veuillez réessayer.', { toastId: 'ready_error' });
        } else if (message === 'La partie est pleine' && hasJoinedRef.current && effectivePlayerId) {
          console.log('[useGame] Tentative de reconnexion:', { gameId: state.connection.gameId, playerId: effectivePlayerId });
          socket.emit('reconnectPlayer', { gameId: state.connection.gameId, playerId: effectivePlayerId });
        } else if (message.includes('Non autorisé')) {
          toast.warn("Action non autorisée : ce n'est pas votre tour.", { toastId: 'not_authorized' });
        } else if (message === "Pas assez de points d'action pour jouer cette carte") {
          toast.error("Pas assez de points d'action pour jouer cette carte.", { toastId: 'action_points_error' });
          socket.emit('updateGameState', { gameId: state.connection.gameId, state: {} });
        } else {
          toast.error(message, { toastId: 'server_error' });
        }
      });

      socket.on('opponentDisconnected', (data: any) => {
        console.log('[useGame] Opposant déconnecté:', data);
        set({
          connection: { ...state.connection, isConnected: true },
          game: {
            ...state.game,
            gameOver: true,
            winner: effectivePlayerId === data.disconnectedPlayerId ? null : `player${effectivePlayerId}`,
          },
        });
        toast.warn("L'opposant s'est déconnecté. Partie terminée.", { toastId: 'opponent_disconnected' });
      });

      socket.on('playerJoined', (data: any) => {
        console.log('[useGame] playerJoined reçu:', data);
        setEffectivePlayerId(data.playerId);
        navigate(`/waiting/${state.connection.gameId}`, {
          state: {
            playerId: data.playerId,
            availableDecks: data.availableDecks,
            playmats: data.playmats,
            lifeToken: data.lifeToken,
            username: effectiveUsername,
          },
        });
      });

      socket.on('gameStart', (data: any) => {
        if (window.location.pathname.startsWith('/waiting')) {
          console.log('[useGame] gameStart reçu:', data);
          setEffectivePlayerId(data.playerId);
          navigate(`/game/${data.gameId}`, {
            state: {
              playerId: data.playerId,
              availableDecks: data.availableDecks,
              playmats: data.playmats,
              lifeToken: data.lifeToken,
            },
          });
          set({
            connection: {
              ...state.connection,
              playerId: data.playerId,
              isConnected: true,
            },
            chat: {
              ...state.chat,
              messages: data.chatHistory,
            },
            deckSelection: {
              ...state.deckSelection,
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
          });
        } else {
          console.log('[useGame] gameStart ignoré: joueur pas encore dans waiting', { pathname: window.location.pathname });
        }
      });

      socket.on('player1ChoseDeck', (data: any) => {
        set({
          deckSelection: {
            ...state.deckSelection,
            player1DeckId: [data.player1DeckId],
            deckSelectionData: {
              ...state.deckSelection.deckSelectionData,
              player1DeckId: [data.player1DeckId],
              player2DeckIds: state.deckSelection.deckSelectionData?.player2DeckIds || [],
              selectedDecks: [...new Set([...(state.deckSelection.deckSelectionData?.selectedDecks || []), data.player1DeckId])],
            },
            waitingForPlayer1: false,
            hasChosenDeck: state.connection.playerId === 1 ? true : state.deckSelection.hasChosenDeck,
            selectedDecks: [...new Set([...state.deckSelection.selectedDecks, data.player1DeckId])],
          },
        });
      });

      socket.on('deckSelectionUpdate', (data: any) => {
        set({
          deckSelection: {
            ...state.deckSelection,
            player1DeckId: data['1'] || [],
            deckSelectionData: {
              ...state.deckSelection.deckSelectionData,
              player1DeckId: data['1'] || [],
              player2DeckIds: data['2'] || [],
              selectedDecks: [...(data['1'] || []), ...(data['2'] || [])].filter((id) => id !== null),
            },
            selectedDecks: [...(data['1'] || []), ...(data['2'] || [])].filter((id) => id !== null),
            hasChosenDeck: state.connection.playerId === 1 ? !!data['1']?.length : state.deckSelection.hasChosenDeck || !!data['2']?.length,
          },
        });
      });

      socket.on('waitingForPlayer1Choice', (data: any) => {
        set({
          deckSelection: {
            ...state.deckSelection,
            waitingForPlayer1: data.waiting,
          },
        });
      });

      socket.on('deckSelectionDone', (data: any) => {
        set({
          deckSelection: {
            ...state.deckSelection,
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
        });
      });

      socket.on('bothPlayersReady', (data: any) => {
        set({
          deckSelection: {
            ...state.deckSelection,
            bothReady: data.bothReady,
            opponentReady: data.bothReady,
          },
        });
      });

      socket.on('initializeDeck', (data: any) => {
        console.log('[useGame] initializeDeck received:', data);
        set({
          player: {
            ...state.player,
            deck: data.deck,
            hand: data.initialDraw,
            tokenType: data.tokenType,
            tokenCount: data.tokenCount,
            field: Array(8).fill(null),
            nexus: { health: 30 },
          },
          deckSelection: {
            ...state.deckSelection,
            initialDraw: data.initialDraw,
          },
        });
      });

      socket.on('updateGameState', (data: Partial<GameState>) => {
        console.log('[useGame] updateGameState received:', {
          playerId: data.connection?.playerId,
          isMyTurn: data.game?.isMyTurn,
          phase: data.game?.currentPhase,
          turn: data.game?.turn,
          field: data.player?.field,
          nexus: data.player?.nexus,
        });
        set({
          player: {
            ...state.player,
            ...data.player,
            field: data.player?.field?.length === 8 ? data.player.field : Array(8).fill(null),
            nexus: data.player?.nexus || { health: 30 },
          },
          opponent: {
            ...state.opponent,
            ...data.opponent,
            nexus: data.opponent?.nexus || { health: 30 },
          },
          game: { ...state.game, ...data.game },
          ui: { ...state.ui, ...data.ui },
          chat: { ...state.chat, ...data.chat },
          deckSelection: { ...state.deckSelection, ...data.deckSelection },
          connection: { ...state.connection, ...data.connection },
          revealedCards: data.revealedCards,
          lastCardPlayed: data.lastCardPlayed,
          lastDestroyedUnit: data.lastDestroyedUnit,
          turnState: data.turnState,
        });
      });

      socket.on('endTurn', () => {
        console.log('[useGame] endTurn received');
        set({
          game: { ...state.game, isMyTurn: false },
        });
      });

      socket.on('yourTurn', () => {
        console.log('[useGame] yourTurn received for player:', effectivePlayerId);
        set({
          game: { ...state.game, isMyTurn: true },
        });
      });

      socket.on('handleAssassinTokenDraw', (data: any) => {
        console.log('[useGame] handleAssassinTokenDraw received:', data);
        set({
          player: { ...state.player, nexus: { ...state.player.nexus, health: data.playerLifePoints } },
          opponent: { ...state.opponent, tokenCount: data.opponentTokenCount },
        });
      });

      socket.on('requestChoice', (data: any) => {
        console.log('[useGame] requestChoice received:', data);
      });

      socket.on('revealCards', (cards: Card[]) => {
        console.log('[useGame] revealCards received:', cards);
        setRevealedCards(cards);
        set({
          revealedCards: cards,
          ui: { ...state.ui, isRevealedCardsOpen: true },
        });
      });

      socket.on('reorderRevealedCards', (data: any, callback: any) => {
        console.log('[useGame] reorderRevealedCards received:', data);
        callback(data.cards.map((card: Card) => card.id));
      });

      socket.on('selectSplitDamageTargets', (data: any, callback: any) => {
        console.log('[useGame] selectSplitDamageTargets received:', data);
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
      socket.off('initializeDeck');
      socket.off('updateGameState');
      socket.off('endTurn');
      socket.off('yourTurn');
      socket.off('handleAssassinTokenDraw');
      socket.off('requestChoice');
      socket.off('revealCards');
      socket.off('reorderRevealedCards');
      socket.off('selectSplitDamageTargets');
    };
  }, [state, set, navigate, effectivePlayerId, effectiveUsername]);

  const emit = (event: keyof ClientToServerEvents, data: any, callback?: (response: any) => void) => {
    if (!state.connection.isConnected || !socketRef.current.connected) {
      toast.error(`Impossible d'envoyer l'événement ${event}: non connecté.`, { toastId: `${event}_emit_error` });
      return;
    }
    socketRef.current.emit(event, data, callback);
  };

  // --- Section : Card actions (intégré de useCardActions.ts) ---
  const handleAssassinTokenDraw = useCallback((emitFn = emit) => {
    if (!state.opponent || !state.player.nexus || state.opponent.tokenType !== 'assassin') {
      console.error('handleAssassinTokenDraw: opponent ou player.nexus non défini');
      return null;
    }
    const newLifePoints = Math.max(0, state.player.nexus.health - 2);
    const newOpponentTokenCount = Math.min(state.opponent.tokenCount! + 1, 8);
    set({
      player: { ...state.player, nexus: { ...state.player.nexus, health: newLifePoints } },
      opponent: { ...state.opponent, tokenCount: newOpponentTokenCount },
    });
    toast.info('Vous avez pioché un token assassin ! -2 points de vie.', { toastId: 'assassin_token_draw' });

    emitFn('updateGameState', {
      gameId: state.connection.gameId,
      state: {
        player: { ...state.player, nexus: { ...state.player.nexus, health: newLifePoints } },
        opponent: { ...state.opponent, tokenCount: newOpponentTokenCount },
      },
    });

    return { lifePoints: newLifePoints, opponentTokenCount: newOpponentTokenCount };
  }, [state, set, emit]);

  const drawCard = useCallback((emitFn = emit) => {
    if (
      state.player.deck.length === 0 ||
      !state.game.isMyTurn ||
      state.player.hand.length >= 10
    ) {
      toast.error('Impossible de piocher : deck vide, tour non actif ou main pleine.', { toastId: 'draw_card_error' });
      return null;
    }

    let [drawnCard] = state.player.deck.slice(0, 1);
    let newDeck = state.player.deck.slice(1);
    let newHand = [...state.player.hand];

    if (drawnCard.types.some(t => t.type === 'token' && t.subTypes === 'token') && state.opponent?.tokenType === 'assassin') {
      const assassinResult = handleAssassinTokenDraw();
      if (!assassinResult) {
        console.error('[ERROR] handleAssassinTokenDraw returned null');
        return null;
      }
      if (newDeck.length > 0) {
        [drawnCard] = newDeck.slice(0, 1);
        newDeck = newDeck.slice(1);
        newHand = [...state.player.hand, { ...drawnCard, exhausted: false }];
      } else {
        newHand = [...state.player.hand];
        toast.warn('Aucune carte restante pour repiocher.', { toastId: 'no_cards_to_draw' });
      }
    } else {
      newHand = [...state.player.hand, { ...drawnCard, exhausted: false }];
    }

    set({ player: { ...state.player, hand: newHand, deck: newDeck } });

    emitFn('drawCard', { gameId: state.connection.gameId, playerId: state.connection.playerId });

    return { hand: newHand, deck: newDeck };
  }, [state, set, handleAssassinTokenDraw, emit]);

  const playCardToField = useCallback((card: Card, emitFn = emit) => {
    if (!state.connection.gameId) {
      console.error('gameId is undefined in playCardToField', {
        stateConnection: state.connection,
      });
      toast.error('ID de partie manquant.', { toastId: 'game_id_missing' });
      return null;
    }

    const fieldIndex = state.player.field.findIndex((slot) => slot === null);
    if (fieldIndex === -1) {
      console.error('Aucun emplacement disponible. Terrain :', state.player.field);
      toast.error('Aucun emplacement disponible sur le terrain.', { toastId: 'play_card_no_space' });
      return null;
    }

    console.log('Attempting to play card:', {
      cardId: card.id,
      isMyTurn: state.game.isMyTurn,
      currentPhase: state.game.currentPhase,
      mustDiscard: state.player.mustDiscard,
      actionPoints: state.player.actionPoints,
      cardCost: card.cost,
      field: state.player.field,
      gameId: state.connection.gameId,
    });

    if (
      !state.game.isMyTurn ||
      state.player.mustDiscard ||
      state.game.currentPhase !== 'Main' ||
      (state.player.actionPoints || 0) < card.cost
    ) {
      console.warn('Cannot play card: conditions not met', {
        isMyTurn: state.game.isMyTurn,
        mustDiscard: state.player.mustDiscard,
        currentPhase: state.game.currentPhase,
        actionPoints: state.player.actionPoints,
        cardCost: card.cost,
        gameId: state.connection.gameId,
      });
      toast.error(
        (state.player.actionPoints || 0) < card.cost
          ? "Pas assez de points d'action pour jouer cette carte."
          : 'Impossible de jouer une carte : conditions non remplies.',
        { toastId: 'play_card_error' },
      );
      return null;
    }

    // Envoyer l'action au serveur
    emitFn('playCard', { gameId: state.connection.gameId, card, fieldIndex });

    return { card, fieldIndex, hand: state.player.hand, field: state.player.field };
  }, [state, set, emit]);

  const discardCardFromHand = useCallback((card: Card) => {
    const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
    const newGraveyard = [...state.player.graveyard, card];
    set({
      player: { ...state.player, hand: newHand, graveyard: newGraveyard },
      turnState: { ...state.turnState, discardedCardsCount: state.turnState.discardedCardsCount + 1 },
    });

    return { hand: newHand, graveyard: newGraveyard };
  }, [state, set]);

  const removeCardFromField = useCallback((index: number) => {
    const newField: (Card | null)[] = [...state.player.field];
    const removedCard = newField[index];
    newField[index] = null;

    if (!removedCard) {
      toast.error('Aucune carte à cet emplacement.', { toastId: 'remove_card_error' });
      return null;
    }

    const newGraveyard = [...state.player.graveyard, removedCard];
    set({
      player: { ...state.player, field: newField, graveyard: newGraveyard },
      lastDestroyedUnit: removedCard,
    });

    return { field: newField, graveyard: newGraveyard };
  }, [state, set]);

  const exhaustCard = useCallback((index: number, emitFn = emit) => {
    if (!state.game.isMyTurn || state.game.currentPhase !== 'Main') {
      toast.error('Impossible d’épuiser une carte : conditions non remplies.', { toastId: 'exhaust_card_error' });
      return null;
    }

    const card = state.player.field[index];
    if (!card) {
      toast.error('Aucune carte à cet emplacement.', { toastId: 'exhaust_card_no_card' });
      return null;
    }

    const newField: (Card | null)[] = [...state.player.field];
    newField[index] = { ...card, exhausted: !card.exhausted };
    set({ player: { ...state.player, field: newField } });

    emitFn('exhaustCard', { gameId: state.connection.gameId, cardId: card.id, fieldIndex: index });

    return { cardId: card.id, fieldIndex: index, field: newField };
  }, [state, set, emit]);

  const attackCard = useCallback((index: number, emitFn = emit) => {
    if (!state.game.isMyTurn || state.game.currentPhase !== 'Battle') {
      toast.error('Impossible d’attaquer : conditions non remplies.', { toastId: 'attack_card_error' });
      return null;
    }

    const card = state.player.field[index];
    if (!card) {
      toast.error('Aucune carte à cet emplacement.', { toastId: 'attack_card_no_card' });
      return null;
    }

    const newField: (Card | null)[] = [...state.player.field];
    const removedCard = newField[index];
    newField[index] = null;

    const newGraveyard = [...state.player.graveyard, removedCard];
    set({
      player: { ...state.player, field: newField, graveyard: newGraveyard },
      lastDestroyedUnit: removedCard,
    });

    emitFn('attackCard', { gameId: state.connection.gameId, cardId: card.id });

    return { cardId: card.id, field: newField, graveyard: newGraveyard };
  }, [state, set, emit]);

  const addToDeck = useCallback((card: Card) => {
    const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
    const newDeck = [...state.player.deck, card];
    set({ player: { ...state.player, hand: newHand, deck: newDeck } });

    return { hand: newHand, deck: newDeck };
  }, [state, set]);

  // --- Section : Player state (intégré de usePlayerState.ts) ---
  const updateLifePoints = useCallback((newValue: number) => {
    if (newValue < 0 || newValue > 30) {
      toast.error('Points de vie invalides (doit être entre 0 et 30).', { toastId: 'update_life_points_error' });
      return null;
    }
    set({ player: { ...state.player, lifePoints: newValue, nexus: { ...state.player.nexus, health: newValue } } });
    return { lifePoints: newValue };
  }, [state, set]);

  const updateTokenCount = useCallback((newValue: number) => {
    let max = 30;
    if (state.player.tokenType === 'assassin') {
      max = 8;
    }
    if (newValue < 0 || newValue > max) {
      toast.error(`Nombre de tokens invalide (doit être entre 0 et ${max}).`, { toastId: 'update_token_count_error' });
      return null;
    }
    set({
      player: {
        ...state.player,
        tokenCount: newValue,
        tokenPool: Array(newValue).fill({ id: generateTokenId(), type: [state.player.tokenType || ''] }),
      },
    });
    return { tokenCount: newValue };
  }, [state, set]);

  const addAssassinTokenToOpponentDeck = useCallback((emitFn = emit) => {
    if (state.player.tokenCount! < 1) {
      toast.error('Pas assez de tokens pour ajouter un token assassin.', { toastId: 'add_assassin_token_error' });
      return null;
    }
    const tokenCard: Card = {
      id: generateTokenId(),
      name: { fr: 'Assassin Token', en: 'Assassin Token', es: 'Assassin Token' },
      image: { fr: '/addons/tokens/token_assassin.jpg', en: '/addons/tokens/token_assassin.jpg', es: '/addons/tokens/token_assassin.jpg' },
      faction: 'assassin',
      label: [],
      cost: 0,
      effects: {},
      types: [{ type: 'token', subTypes: 'token', target: [], value: 0 }],
      exhausted: false,
      stealthed: true,
    };
    const newOpponentDeck = [...state.opponent.deck, tokenCard].sort(() => Math.random() - 0.5);
    const newTokenCount = state.player.tokenCount! - 1;
    set({
      player: {
        ...state.player,
        tokenCount: newTokenCount,
        tokenPool: Array(newTokenCount).fill({ id: generateTokenId(), type: ['assassin'] }),
      },
      opponent: { ...state.opponent, deck: newOpponentDeck },
    });
    toast.success('Token assassin ajouté au deck adverse et mélangé !', { toastId: 'add_assassin_token' });

    emitFn('updateGameState', {
      gameId: state.connection.gameId,
      state: {
        player: {
          ...state.player,
          tokenCount: newTokenCount,
          tokenPool: Array(newTokenCount).fill({ id: generateTokenId(), type: ['assassin'] }),
        },
        opponent: { ...state.opponent, deck: newOpponentDeck },
      },
    });
    return { tokenCount: newTokenCount, opponentDeck: newOpponentDeck };
  }, [state, set, emit]);

  const placeAssassinTokenAtOpponentDeckBottom = useCallback((emitFn = emit) => {
    if (state.player.tokenCount! < 1) {
      toast.error('Pas assez de tokens pour placer un token assassin.', { toastId: 'place_assassin_token_error' });
      return null;
    }
    const tokenCard: Card = {
      id: generateTokenId(),
      name: { fr: 'Assassin Token', en: 'Assassin Token', es: 'Assassin Token' },
      image: { fr: '/addons/tokens/token_assassin.jpg', en: '/addons/tokens/token_assassin.jpg', es: '/addons/tokens/token_assassin.jpg' },
      faction: 'assassin',
      label: [],
      cost: 0,
      effects: {},
      types: [{ type: 'token', subTypes: 'token', target: [], value: 0 }],
      exhausted: false,
      stealthed: true,
    };
    const newOpponentDeck = [...state.opponent.deck, tokenCard];
    const newTokenCount = state.player.tokenCount! - 1;
    set({
      player: {
        ...state.player,
        tokenCount: newTokenCount,
        tokenPool: Array(newTokenCount).fill({ id: generateTokenId(), type: ['assassin'] }),
      },
      opponent: { ...state.opponent, deck: newOpponentDeck },
    });
    toast.success('Token assassin placé en bas du deck adverse !', { toastId: 'place_assassin_token' });

    emitFn('updateGameState', {
      gameId: state.connection.gameId,
      state: {
        player: {
          ...state.player,
          tokenCount: newTokenCount,
          tokenPool: Array(newTokenCount).fill({ id: generateTokenId(), type: ['assassin'] }),
        },
        opponent: { ...state.opponent, deck: newOpponentDeck },
      },
    });

    return { opponentDeck: newOpponentDeck, tokenCount: newTokenCount };
  }, [state, set, emit]);

  const setHoveredTokenId = useCallback((id: string | null) => {
    set({ ui: { ...state.ui, hoveredTokenId: id } });
  }, [state, set]);

  const toggleCardMulligan = useCallback((cardId: string) => {
    set({
      deckSelection: {
        ...state.deckSelection,
        selectedForMulligan: state.deckSelection.selectedForMulligan.includes(cardId)
          ? state.deckSelection.selectedForMulligan.filter((id: string) => id !== cardId)
          : [...state.deckSelection.selectedForMulligan, cardId],
      },
    });
  }, [state, set]);

  const doMulligan = useCallback(() => {
    const toMulligan: Card[] = state.deckSelection.initialDraw.filter((card: Card) =>
      state.deckSelection.selectedForMulligan.includes(card.id),
    );
    const toKeep: Card[] = state.deckSelection.initialDraw.filter(
      (card: Card) => !state.deckSelection.selectedForMulligan.includes(card.id),
    );
    const reshuffledDeck: Card[] = shuffleDeck([...state.player.deck, ...toMulligan]);
    const newDraw: Card[] = getRandomHand(reshuffledDeck, 5 - toKeep.length);
    const finalHand: Card[] = [...toKeep, ...newDraw];
    const newDeck: Card[] = reshuffledDeck.filter(
      (c: Card) => !newDraw.some((d: Card) => d.id === c.id),
    );
    set({
      player: { ...state.player, hand: finalHand, deck: newDeck },
      deckSelection: {
        ...state.deckSelection,
        initialDraw: [],
        selectedForMulligan: [],
        mulliganDone: true,
      },
    });

    return { hand: finalHand, deck: newDeck };
  }, [state, set]);

  const keepInitialHand = useCallback(() => {
    set({
      player: { ...state.player, hand: state.deckSelection.initialDraw },
      deckSelection: {
        ...state.deckSelection,
        initialDraw: [],
        selectedForMulligan: [],
        mulliganDone: true,
      },
    });

    return { hand: state.deckSelection.initialDraw };
  }, [state, set]);

  const handleDeckChoice = useCallback((deckId: string, gameId?: string, emitFn = emit) => {
    if (state.connection.playerId === 1 && state.deckSelection.hasChosenDeck) {
      return null;
    }
    if (
      state.connection.playerId === 2 &&
      (!state.deckSelection.player1DeckId ||
        state.deckSelection.waitingForPlayer1 ||
        state.deckSelection.selectedDecks.filter((d: string) =>
          Array.isArray(state.deckSelection.player1DeckId)
            ? !state.deckSelection.player1DeckId.includes(d)
            : !state.deckSelection.player1DeckId?.split(',').includes(d)
        ).length >= 2)
    ) {
      return null;
    }

    let tokenType: 'assassin' | 'engine' | 'viking' | null = null;
    let tokenCount = 0;
    if (deckId === 'assassin') {
      tokenType = 'assassin';
      tokenCount = 8;
    } else if (deckId === 'engine') {
      tokenType = 'engine';
      tokenCount = 0;
    } else if (deckId === 'viking') {
      tokenType = 'viking';
      tokenCount = 1;
    }

    set({
      deckSelection: {
        ...state.deckSelection,
        hasChosenDeck: true,
        selectedDecks: [...new Set([...state.deckSelection.selectedDecks, deckId])],
        player1DeckId: state.connection.playerId === 1 ? [deckId] : state.deckSelection.player1DeckId,
      },
      player: { ...state.player, tokenType, tokenCount },
    });

    emitFn('chooseDeck', { gameId: gameId || state.connection.gameId, playerId: state.connection.playerId, deckId });

    return { deckId };
  }, [state, set, emit]);

  const handleReadyClick = useCallback((gameId: string, emitFn = emit) => {
    if (!gameId || !state.connection.playerId || state.deckSelection.isReady) {
      return null;
    }
    set({
      deckSelection: { ...state.deckSelection, isReady: true },
    });

    emitFn('playerReady', { gameId, playerId: state.connection.playerId });

    return { playerId: state.connection.playerId };
  }, [state, set, emit]);

  return {
    state,
    set,
    emit,
    tryJoin,
    revealedCards,
    drawCard,
    playCardToField,
    discardCardFromHand,
    removeCardFromField,
    exhaustCard,
    attackCard,
    addToDeck,
    updateLifePoints,
    updateTokenCount,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
    setHoveredTokenId,
    toggleCardMulligan,
    doMulligan,
    keepInitialHand,
    handleDeckChoice,
    handleReadyClick,
    socket: socketRef.current,
    shuffleDeck,
  };
};