// client/src/pages/Game.tsx
import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GameState } from 'types/GameStateTypes';
import { Card } from 'types/CardTypes';
import { useGameSocket } from '@/hooks/useGameSocket.ts';
import { useGameState } from '@/hooks/useGameState.ts';
import { mapDeckImages } from '@/utils/mapDeckImages.ts';
import GameLayout from '@/components/GameLayout.tsx';
import { shuffleDeck } from '@/utils/shuffleDeck.ts';

interface LocationState {
  playerId?: number| null;
  availableDecks?: string[];
}

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
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
    initializeDeck,
    updateLifePoints,
    updateTokenCount,
    setHoveredTokenId,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
    addToDeck,
  } = useGameState();
  const { socket, emit } = useGameSocket(
    gameId,
    set,
    state.connection.playerId,
    state.connection.isConnected,
    state.chat.messages,
  );

  useEffect(() => {
    if (locationState?.availableDecks) {
      const randomDeckList = mapDeckImages(locationState.availableDecks);
      set((prev: GameState): Partial<GameState> => ({
        deckSelection: {
          ...prev.deckSelection,
          randomizers: randomDeckList,
        },
      }));
    }
  }, [locationState, set]);

  useEffect(() => {
    if (gameId) {
      initializeDeck(gameId, emit);
    }
  }, [gameId, initializeDeck, emit]);

  const sendChatMessage = useCallback(() => {
    if (state.chat.input.trim() && gameId && state.connection.isConnected) {
      emit('sendMessage', { gameId, message: state.chat.input });
      set({ chat: { ...state.chat, input: '' } });
    }
  }, [state.chat.input, gameId, state.connection.isConnected, emit, set]);

  const handlePhaseChange = useCallback(
    (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => {
      if (gameId && state.connection.isConnected) {
        emit('updatePhase', { gameId, phase: newPhase, turn: state.game.turn });
      }
      set({
        game: {
          ...state.game,
          currentPhase: newPhase,
        },
      });
    },
    [gameId, state.connection.isConnected, state.game, emit, set],
  );

  const handleDeckChoiceCallback = useCallback(
    (deckId: string) => {
      if (!gameId) {
        toast.error('ID de partie manquant.', { toastId: 'deck_choice_error' });
        return;
      }
      const result = handleDeckChoice(deckId, gameId, emit);
      if (!result) {
        toast.error('Erreur lors du choix du deck.', { toastId: 'deck_choice_error' });
      }
    },
    [handleDeckChoice, gameId, emit],
  );

  const handleReadyClickCallback = useCallback(() => {
    if (!gameId) {
      toast.error('ID de partie manquant.', { toastId: 'ready_click_error' });
      return;
    }
    const result = handleReadyClick(gameId, emit);
    if (!result) {
      toast.error('Erreur lors de la confirmation de préparation.', { toastId: 'ready_click_error' });
    }
  }, [handleReadyClick, gameId, emit]);

  const handleKeepInitialHand = useCallback(() => {
    const result = keepInitialHand();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { hand: result.hand, deck: state.player.deck },
      });
    }
  }, [keepInitialHand, gameId, state.connection.isConnected, state.player.deck, emit]);

  const handleDoMulligan = useCallback(() => {
    const result = doMulligan();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { hand: result.hand, deck: result.deck },
      });
    }
  }, [doMulligan, gameId, state.connection.isConnected, emit]);

  const setHoveredCardId = useCallback(
    (id: string | null) => {
      set({
        ui: {
          ...state.ui,
          hoveredCardId: id,
        },
      });
    },
    [set, state.ui],
  );

  const setIsHandHovered = useCallback(
    (val: boolean) => {
      set({
        ui: {
          ...state.ui,
          isCardHovered: val,
        },
      });
    },
    [set, state.ui],
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
    if (!gameId || !state.connection.playerId || !state.connection.isConnected) {
      toast.error('Impossible de piocher : connexion ou ID de partie manquant.', {
        toastId: 'draw_card_error',
      });
      return;
    }
    const result = drawCard((event, data) => emit(event, { ...data, gameId, playerId: state.connection.playerId }));
    if (result) {
      emit('drawCard', {
        gameId,
        playerId: state.connection.playerId,
      });
    }
  }, [drawCard, gameId, state.connection.playerId, state.connection.isConnected, emit]);

  const handleShuffleDeck = useCallback(() => {
    const result = shuffleDeck(state.player.deck);
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState', {
        gameId,
        state: { deck: result },
      });
    }
  }, [shuffleDeck, gameId, state.connection.isConnected, state.player.deck, emit]);

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
    const result = addAssassinTokenToOpponentDeck((event, data) => emit(event, { ...data, gameId }));
    if (!result && gameId && state.connection.isConnected) {
      toast.error('Erreur lors de l’ajout du token assassin.', { toastId: 'add_assassin_token_error' });
    }
  }, [addAssassinTokenToOpponentDeck, gameId, state.connection.isConnected, emit]);

  const handlePlaceAssassinTokenAtOpponentDeckBottom = useCallback(() => {
    const result = placeAssassinTokenAtOpponentDeckBottom((event, data) => emit(event, { ...data, gameId }));
    if (!result && gameId && state.connection.isConnected) {
      toast.error('Erreur lors du placement du token assassin.', { toastId: 'place_assassin_token_error' });
    }
  }, [placeAssassinTokenAtOpponentDeckBottom, gameId, state.connection.isConnected, emit]);

  const setGraveyardOpen = useCallback(
    (isOpen: boolean) => {
      set({
        ui: {
          ...state.ui,
          isGraveyardOpen: isOpen,
        },
      });
    },
    [set, state.ui],
  );

  const setOpponentGraveyardOpen = useCallback(
    (isOpen: boolean) => {
      set({
        ui: {
          ...state.ui,
          isOpponentGraveyardOpen: isOpen,
        },
      });
    },
    [set, state.ui],
  );

  const setTokenZoneOpen = useCallback(
    (isOpen: boolean) => {
      set({
        ui: {
          ...state.ui,
          isTokenZoneOpen: isOpen,
        },
      });
    },
    [set, state.ui],
  );

  const setOpponentTokenZoneOpen = useCallback(
    (isOpen: boolean) => {
      set({
        ui: {
          ...state.ui,
          isOpponentTokenZoneOpen: isOpen,
        },
      });
    },
    [set, state.ui],
  );

  const setChatInput = useCallback(
    (input: string) => {
      set({
        chat: {
          ...state.chat,
          input,
        },
      });
    },
    [set, state.chat],
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
      playerId={locationState?.playerId ?? null}
      gameId={gameId}
      socket={socket}
      sendChatMessage={sendChatMessage}
      handlePhaseChange={handlePhaseChange}
      handleDeckChoice={handleDeckChoiceCallback}
      handleReadyClick={handleReadyClickCallback}
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
    />
  );
}