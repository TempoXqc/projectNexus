import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, GameState } from '@tempoxqc/project-nexus-types';
import { useGameSocket } from '@/hooks/useGameSocket.ts';
import { useGameState } from '@/hooks/useGameState.ts';
import GameLayout from '@/components/GameLayout.tsx';
import { shuffleDeck } from '@/utils/shuffleDeck.ts';
import { clientConfig } from '@/config/clientConfig';

interface LocationState {
  playerId?: number | null;
  availableDecks?: { id: string; name: string; image: string; infoImage: string }[];
  playmats?: { id: string; name: string; image: string }[];
  lifeToken?: { id: string; name: string; image: string };
}

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const [playmats, setPlaymats] = useState<{ id: string; name: string; image: string }[]>(locationState?.playmats || []);
  const [lifeToken, setLifeToken] = useState<{ id: string; name: string; image: string } | null>(locationState?.lifeToken || null);
  const [backcard, setBackcard] = useState<{
    id: string;
    name: string;
    image: string;
  } | null>(null);
  const [isStateInitialized, setIsStateInitialized] = useState(false);
  const {
    state,
    set,
    drawCard,
    playCardToField,
    discardCardFromHand,
    removeCardFromField,
    exhaustCard,
    attackCard,
    doMulligan,
    keepInitialHand,
    handleDeckChoice,
    handleReadyClick,
    updateLifePoints,
    updateTokenCount,
    setHoveredTokenId,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
    addToDeck,
  } = useGameState();
  const { socket, emit, tryJoin, revealedCards } = useGameSocket(
    gameId,
    set,
    state.connection.playerId ?? locationState?.playerId ?? null,
    state.connection.isConnected,
  );

  useEffect(() => {
    if (!gameId || !locationState?.playerId) {
      navigate('/');
      return;
    }

    if (
      state.connection.playerId !== locationState.playerId ||
      !state.connection.isConnected
    ) {
      set((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          playerId: locationState.playerId ?? null,
          isConnected: true,
        },
        deckSelection: {
          ...prev.deckSelection,
          randomizers: locationState.availableDecks || prev.deckSelection.randomizers,
        },
      }));
    }

    if (!state.connection.isConnected) {
      tryJoin();
    }

    if (locationState.playmats && isMounted.current) {
      setPlaymats(locationState.playmats);
    }

    if (locationState.lifeToken && isMounted.current) {
      setLifeToken(locationState.lifeToken);
    }
  }, [
    gameId,
    locationState,
    state.connection.playerId,
    state.connection.isConnected,
    set,
    tryJoin,
    navigate,
  ]);

  useEffect(() => {
    const fetchBackcard = async () => {
      try {
        const response = await fetch(`${clientConfig.apiUrl}/api/backcard`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la backcard');
        }
        const data = await response.json();
        setBackcard(data);
      } catch (error) {
        toast.error('Impossible de charger l’image de la backcard.');
      }
    };
    fetchBackcard();
  }, []);

  useEffect(() => {
    socket.on('updatePhase', (phaseData: { phase: 'Standby' | 'Main' | 'Battle' | 'End'; turn: number; nextPlayerId?: number }) => {
      console.log('[Game] updatePhase received:', phaseData);
      set((prev) => ({
        ...prev,
        game: {
          ...prev.game,
          currentPhase: phaseData.phase,
          turn: phaseData.turn,
        },
      }));
    });

    socket.on('endTurn', () => {
      console.log('[Game] endTurn received');
      set((prev) => ({
        ...prev,
        game: {
          ...prev.game,
          isMyTurn: false,
        },
      }));
    });

    socket.on('yourTurn', () => {
      console.log('[Game] yourTurn received for player:', state.connection.playerId);
      set((prev) => ({
        ...prev,
        game: {
          ...prev.game,
          isMyTurn: true,
        },
      }));
    });

    socket.on('initializeDeck', (data: { deck: Card[]; initialDraw: Card[]; tokenType: string | null; tokenCount: number }) => {
      console.log('[Game] initializeDeck received:', data);
      set((prev: GameState) => ({
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
        opponent: {
          ...prev.opponent,
          nexus: { health: 30 },
        },
        deckSelection: {
          ...prev.deckSelection,
          initialDraw: data.initialDraw,
        },
      }));
      setIsStateInitialized(true);
    });

    socket.on('updateGameState', (newState: GameState) => {
      console.log('[Game] updateGameState received:', {
        playerId: state.connection.playerId,
        isMyTurn: newState.game?.isMyTurn,
        phase: newState.game?.currentPhase,
        turn: newState.game?.turn,
        field: newState.player.field,
        nexus: newState.player.nexus,
      });
      if (!newState.game) {
        console.error('newState.game is undefined in updateGameState', {
          newState: JSON.stringify(newState, null, 2),
        });
        toast.error('Erreur : état du jeu incomplet reçu du serveur.');
        return;
      }
      set((prev: GameState) => {
        const updatedState = {
          ...prev,
          player: {
            ...prev.player,
            ...newState.player,
            field: newState.player.field.length === 8 ? newState.player.field : Array(8).fill(null),
            nexus: newState.player.nexus || { health: 30 },
          },
          opponent: {
            ...prev.opponent,
            ...newState.opponent,
            nexus: newState.opponent.nexus || { health: 30 },
          },
          game: { ...prev.game, ...newState.game },
          ui: { ...prev.ui, ...newState.ui },
          chat: { ...prev.chat, ...newState.chat },
          deckSelection: { ...prev.deckSelection, ...newState.deckSelection },
          connection: { ...prev.connection, ...newState.connection },
          revealedCards: newState.revealedCards,
          lastCardPlayed: newState.lastCardPlayed,
          lastDestroyedUnit: newState.lastDestroyedUnit,
          turnState: newState.turnState,
        };
        console.log('[Game] Updated state:', {
          isMyTurn: updatedState.game.isMyTurn,
          currentPhase: updatedState.game.currentPhase,
          turn: updatedState.game.turn,
        });
        return updatedState;
      });
      setIsStateInitialized(true);
    });

    socket.on('requestChoice', (data) => {
      console.log('[Game] requestChoice received:', data);
      // Logique pour afficher une modale de choix (implémentée dans GameLayout.tsx)
    });

    socket.on('revealCards', (cards) => {
      console.log('[Game] revealCards received:', cards);
      set((prev) => ({
        ...prev,
        revealedCards: cards,
        ui: { ...prev.ui, isRevealedCardsOpen: true },
      }));
    });

    socket.on('reorderRevealedCards', (data) => {
      console.log('[Game] reorderRevealedCards received:', data);
      // Logique pour réorganiser les cartes (implémentée dans GameLayout.tsx)
    });

    socket.on('selectSplitDamageTargets', (data) => {
      console.log('[Game] selectSplitDamageTargets received:', data);
      // Logique pour sélectionner les cibles (implémentée dans GameLayout.tsx)
    });

    return () => {
      socket.off('updatePhase');
      socket.off('endTurn');
      socket.off('yourTurn');
      socket.off('initializeDeck');
      socket.off('updateGameState');
      socket.off('requestChoice');
      socket.off('revealCards');
      socket.off('reorderRevealedCards');
      socket.off('selectSplitDamageTargets');
    };
  }, [socket, set, state.connection.playerId, state.game]);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const sendChatMessage = useCallback(() => {
    if (state.chat.input.trim() && gameId && state.connection.isConnected) {
      emit('sendMessage', {
        gameId,
        message: state.chat.input,
      });
      set((prev) => ({ ...prev, chat: { ...prev.chat, input: '' } }));
    }
  }, [state.chat.input, gameId, state.connection.isConnected, emit, set]);

  const handlePhaseChange = useCallback(
    (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => {
      if (gameId && state.connection.isConnected) {
        emit('updatePhase', {
          gameId,
          phase: newPhase,
          turn: state.game.turn,
        });
      }
      set((prev) => ({
        ...prev,
        game: {
          ...prev.game,
          currentPhase: newPhase,
        },
      }));
    },
    [gameId, state.connection.isConnected, state.game.turn, emit, set],
  );

  const handleDeckChoiceCallback = useCallback(
    (deckId: string) => {
      if (!gameId) {
        toast.error('ID de partie manquant.', { toastId: 'deck_choice_error' });
        return;
      }
      if (!state.connection.playerId || !state.connection.isConnected) {
        console.error('Impossible de choisir un deck:', {
          playerId: state.connection.playerId,
          isConnected: state.connection.isConnected,
        });
        toast.error('Erreur : joueur non connecté ou non identifié.', {
          toastId: 'deck_choice_error',
        });
        return;
      }
      const result = handleDeckChoice(deckId, gameId, emit);
      if (!result) {
        toast.error('Erreur lors du choix du deck.', {
          toastId: 'deck_choice_error',
        });
      }
    },
    [
      handleDeckChoice,
      gameId,
      state.connection.playerId,
      state.connection.isConnected,
      emit,
    ],
  );

  const handleReadyClickCallback = useCallback(() => {
    if (!gameId) {
      toast.error('ID de partie manquant.', { toastId: 'ready_click_error' });
      return;
    }
    const result = handleReadyClick(gameId, emit);
    if (!result) {
      toast.error('Erreur lors de la confirmation de préparation.', {
        toastId: 'ready_click_error',
      });
    }
  }, [handleReadyClick, gameId, emit]);

  const handleKeepInitialHand = useCallback(() => {
    const result = keepInitialHand();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: {
          hand: result.hand,
          deck: state.player.deck,
          deckSelection: { mulliganDone: true },
        },
      });
      set((prev) => ({
        ...prev,
        deckSelection: { ...prev.deckSelection, mulliganDone: true },
      }));
    }
  }, [
    keepInitialHand,
    gameId,
    state.connection.isConnected,
    state.player.deck,
    emit,
    set,
  ]);

  const handleDoMulligan = useCallback(() => {
    const result = doMulligan();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: {
          hand: result.hand,
          deck: result.deck,
          deckSelection: { mulliganDone: true },
        },
      });
      set((prev) => ({
        ...prev,
        deckSelection: { ...prev.deckSelection, mulliganDone: true },
      }));
    }
  }, [doMulligan, gameId, state.connection.isConnected, emit, set]);

  const handleQuitGame = useCallback(() => {
    if (gameId && state.connection.isConnected) {
      emit('leaveGame', { gameId, playerId: state.connection.playerId }, () => {
        navigate('/');
        toast.success('Partie quittée avec succès.', { toastId: 'game_quit' });
      });
    } else {
      toast.error('Impossible de quitter la partie.', {
        toastId: 'quit_game_error',
      });
    }
  }, [
    gameId,
    state.connection.isConnected,
    state.connection.playerId,
    emit,
    navigate,
  ]);

  const setHoveredCardId = useCallback(
    (id: string | null) => {
      set((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          hoveredCardId: id,
        },
      }));
    },
    [set],
  );

  const setIsHandHovered = useCallback(
    (val: boolean) => {
      set((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          isCardHovered: val,
        },
      }));
    },
    [set],
  );

  const handleRemoveCardFromField = useCallback(
    (index: number) => {
      const result = removeCardFromField(index);
      if (result && gameId && state.connection.isConnected) {
        emit('updateGameState', {
          gameId,
          state: { field: result.field, graveyard: result.graveyard },
        });
      }
    },
    [removeCardFromField, gameId, state.connection.isConnected, emit],
  );

  const handleExhaustCard = useCallback(
    (index: number) => {
      const result = exhaustCard(index);
      if (result && gameId && state.connection.isConnected) {
        emit('exhaustCard', {
          gameId,
          cardId: result.cardId,
          fieldIndex: result.fieldIndex,
        });
      }
    },
    [exhaustCard, gameId, state.connection.isConnected, emit],
  );

  const handleAttackCard = useCallback(
    (index: number) => {
      const result = attackCard(index);
      if (result && gameId && state.connection.isConnected) {
        emit('attackCard', {
          gameId,
          cardId: result.cardId,
        });
      }
    },
    [attackCard, gameId, state.connection.isConnected, emit],
  );

  const handleDiscardCardFromHand = useCallback(
    (card: Card) => {
      const result = discardCardFromHand(card);
      if (result && gameId && state.connection.isConnected) {
        emit('updateGameState', {
          gameId,
          state: { hand: result.hand, graveyard: result.graveyard },
        });
      }
    },
    [discardCardFromHand, gameId, state.connection.isConnected, emit],
  );

  const handlePlayCardToField = useCallback(
    (card: Card) => {
      const result = playCardToField(card);
      if (result && gameId && state.connection.isConnected) {
        emit('playCard', {
          gameId,
          card: result.card,
          fieldIndex: result.fieldIndex,
        });
      }
    },
    [playCardToField, gameId, state.connection.isConnected, emit],
  );

  const handleAddToDeck = useCallback(
    (card: Card) => {
      const result = addToDeck(card);
      if (result && gameId && state.connection.isConnected) {
        emit('updateGameState', {
          gameId,
          state: { hand: result.hand, deck: result.deck },
        });
      }
    },
    [addToDeck, gameId, state.connection.isConnected, emit],
  );

  const handleDrawCard = useCallback(() => {
    if (
      !gameId ||
      !state.connection.playerId ||
      !state.connection.isConnected ||
      !isStateInitialized
    ) {
      toast.error(
        'Impossible de piocher : connexion, ID de partie manquant ou état non initialisé.',
        {
          toastId: 'draw_card_error',
        },
      );
      return;
    }
    const result = drawCard((event, data) =>
      emit(event, {
        ...data,
        gameId,
        playerId: state.connection.playerId,
      }),
    );
    if (result) {
      emit('drawCard', {
        gameId,
        playerId: state.connection.playerId,
      });
    }
  }, [
    drawCard,
    gameId,
    state.connection.playerId,
    state.connection.isConnected,
    isStateInitialized,
    emit,
  ]);

  const handleShuffleDeck = useCallback(() => {
    const result = shuffleDeck(state.player.deck);
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { deck: result },
      });
    }
  }, [
    shuffleDeck,
    gameId,
    state.connection.isConnected,
    state.player.deck,
    emit,
  ]);

  const handleUpdateLifePoints = useCallback(
    (newValue: number) => {
      const result = updateLifePoints(newValue);
      if (result && gameId && state.connection.isConnected) {
        emit('updateLifePoints', {
          gameId,
          lifePoints: newValue,
        });
      }
    },
    [updateLifePoints, gameId, state.connection.isConnected, emit],
  );

  const handleUpdateTokenCount = useCallback(
    (newValue: number) => {
      const result = updateTokenCount(newValue);
      if (result && gameId && state.connection.isConnected) {
        emit('updateTokenCount', {
          gameId,
          tokenCount: newValue,
        });
      }
    },
    [updateTokenCount, gameId, state.connection.isConnected, emit],
  );

  const handleAddAssassinTokenToOpponentDeck = useCallback(() => {
    const result = addAssassinTokenToOpponentDeck((event, data) =>
      emit(event, { ...data, gameId }),
    );
    if (!result && gameId && state.connection.isConnected) {
      toast.error('Erreur lors de l’ajout du token assassin.', {
        toastId: 'add_assassin_token_error',
      });
    }
  }, [
    addAssassinTokenToOpponentDeck,
    gameId,
    state.connection.isConnected,
    emit,
  ]);

  const handlePlaceAssassinTokenAtOpponentDeckBottom = useCallback(() => {
    const result = placeAssassinTokenAtOpponentDeckBottom((event, data) =>
      emit(event, { ...data, gameId }),
    );
    if (!result && gameId && state.connection.isConnected) {
      toast.error('Erreur lors du placement du token assassin.', {
        toastId: 'place_assassin_token_error',
      });
    }
  }, [
    placeAssassinTokenAtOpponentDeckBottom,
    gameId,
    state.connection.isConnected,
    emit,
  ]);

  const setGraveyardOpen = useCallback(
    (isOpen: boolean) => {
      set((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          isGraveyardOpen: isOpen,
        },
      }));
    },
    [set],
  );

  const setOpponentGraveyardOpen = useCallback(
    (isOpen: boolean) => {
      set((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          isOpponentGraveyardOpen: isOpen,
        },
      }));
    },
    [set],
  );

  const setTokenZoneOpen = useCallback(
    (isOpen: boolean) => {
      set((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          isTokenZoneOpen: isOpen,
        },
      }));
    },
    [set],
  );

  const setOpponentTokenZoneOpen = useCallback(
    (isOpen: boolean) => {
      set((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          isOpponentTokenZoneOpen: isOpen,
        },
      }));
    },
    [set],
  );

  const setChatInput = useCallback(
    (input: string) => {
      set((prev) => ({
        ...prev,
        chat: {
          ...prev.chat,
          input,
        },
      }));
    },
    [set],
  );

  const handleSelectChoice = useCallback(
    (cardId: string, choice: string) => {
      if (gameId && state.connection.isConnected) {
        emit('selectChoice', {
          cardId,
          choice,
        });
      }
    },
    [gameId, state.connection.isConnected, emit],
  );

  const handleReorderRevealedCards = useCallback(
    (cardIds: string[]) => {
      if (gameId && state.connection.isConnected) {
        emit('reorderRevealedCardsResponse', {
          cardIds,
        });
      }
    },
    [gameId, state.connection.isConnected, emit],
  );

  const handleSelectSplitDamageTargets = useCallback(
    (targets: any[]) => {
      if (gameId && state.connection.isConnected) {
        emit('selectSplitDamageTargetsResponse', {
          targets,
        });
      }
    },
    [gameId, state.connection.isConnected, emit],
  );

  const fieldKey = useMemo(
    () => state.player.field.map((c) => c?.exhausted).join('-'),
    [state.player.field],
  );

  return (
    <GameLayout
      state={state}
      set={set}
      fieldKey={fieldKey}
      playerId={state.connection.playerId ?? locationState?.playerId ?? null}
      gameId={gameId}
      socket={socket}
      sendChatMessage={sendChatMessage}
      handlePhaseChange={handlePhaseChange}
      handleDeckChoice={handleDeckChoiceCallback}
      handleReadyClick={handleReadyClickCallback}
      handleQuitGame={handleQuitGame}
      handleKeepInitialHand={handleKeepInitialHand}
      handleDoMulligan={handleDoMulligan}
      setHoveredCardId={setHoveredCardId}
      setIsHandHovered={setIsHandHovered}
      removeCardFromField={handleRemoveCardFromField}
      exhaustCard={handleExhaustCard}
      attackCard={handleAttackCard}
      discardCardFromHand={handleDiscardCardFromHand}
      playCardToField={handlePlayCardToField}
      addToDeck={handleAddToDeck}
      drawCard={handleDrawCard}
      shuffleDeck={handleShuffleDeck}
      updateLifePoints={handleUpdateLifePoints}
      updateTokenCount={handleUpdateTokenCount}
      setHoveredTokenId={setHoveredTokenId}
      addAssassinTokenToOpponentDeck={handleAddAssassinTokenToOpponentDeck}
      placeAssassinTokenAtOpponentDeckBottom={handlePlaceAssassinTokenAtOpponentDeckBottom}
      setGraveyardOpen={setGraveyardOpen}
      setOpponentGraveyardOpen={setOpponentGraveyardOpen}
      setTokenZoneOpen={setTokenZoneOpen}
      setOpponentTokenZoneOpen={setOpponentTokenZoneOpen}
      setChatInput={setChatInput}
      deckSelectionData={state.deckSelection.deckSelectionData}
      backcard={backcard}
      playmats={playmats}
      lifeToken={lifeToken}
      revealedCards={revealedCards}
      onSelectChoice={handleSelectChoice}
      onReorderRevealedCards={handleReorderRevealedCards}
      onSelectSplitDamageTargets={handleSelectSplitDamageTargets}
      isStateInitialized={isStateInitialized}
    />
  );
}