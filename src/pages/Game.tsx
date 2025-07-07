import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, GameState } from '@tempoxqc/project-nexus-types';
import { ClientToServerEvents, useGameSocket } from '@/hooks/useGameSocket.ts';
import { useGameState } from '@/hooks/useGameState.ts';
import GameLayout from '@/components/GameLayout.tsx';
import { shuffleDeck } from '@/utils/shuffleDeck.ts';
import { clientConfig } from '@/config/clientConfig';

interface LocationState {
  playerId?: number | null;
  availableDecks?: string[];
  playmats?: { id: string; name: string; image: string }[];
}

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const [playmats, setPlaymats] = useState<{ id: string; name: string; image: string }[]>(locationState?.playmats || []);
  const [backcard, setBackcard] = useState<{
    id: string;
    name: string;
    image: string;
  } | null>(null);
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
  const { socket, emit, tryJoin } = useGameSocket(
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
      set(
        (prev: GameState): Partial<GameState> => ({
          connection: {
            ...prev.connection,
            playerId: locationState.playerId,
            isConnected: true,
          },
          deckSelection: {
            ...prev.deckSelection,
            randomizers:
              locationState.availableDecks || prev.deckSelection.randomizers,
          },
        }),
      );
    }

    if (!state.connection.isConnected) {
      tryJoin();
    }

    if (locationState.playmats && isMounted.current) {
      console.log('[DEBUG] Playmats définis:', locationState.playmats);
      setPlaymats(locationState.playmats);
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
    socket.on(
      'initializeDeck',
      ({ deck, initialDraw, tokenType, tokenCount }) => {
        set((prev: GameState): Partial<GameState> => {
          return {
            player: {
              ...prev.player,
              deck,
              hand: initialDraw,
              tokenType,
              tokenCount,
            },
            deckSelection: {
              ...prev.deckSelection,
              initialDraw,
            },
          };
        });
      },
    );

    return () => {
      socket.off('initializeDeck');
    };
  }, [socket, set]);

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

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const sendChatMessage = useCallback(() => {
    if (state.chat.input.trim() && gameId && state.connection.isConnected) {
      emit('sendMessage' as keyof ClientToServerEvents, {
        gameId,
        message: state.chat.input,
      });
      set({ chat: { ...state.chat, input: '' } });
    }
  }, [state.chat.input, gameId, state.connection.isConnected, emit, set]);

  const handlePhaseChange = useCallback(
    (newPhase: 'Standby' | 'Main' | 'Battle' | 'End') => {
      if (gameId && state.connection.isConnected) {
        emit('updatePhase' as keyof ClientToServerEvents, {
          gameId,
          phase: newPhase,
          turn: state.game.turn,
        });
      }
      set({
        game: {
          ...state.game,
          currentPhase: newPhase,
        },
      });
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
      emit('updateGameState' as keyof ClientToServerEvents, {
        gameId,
        state: {
          hand: result.hand,
          deck: state.player.deck,
          deckSelection: { mulliganDone: true },
        },
      });
      set({ deckSelection: { ...state.deckSelection, mulliganDone: true } });
    }
  }, [
    keepInitialHand,
    gameId,
    state.connection.isConnected,
    state.player.deck,
    emit,
    set
  ]);

  const handleDoMulligan = useCallback(() => {
    const result = doMulligan();
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState' as keyof ClientToServerEvents, {
        gameId,
        state: {
          hand: result.hand,
          deck: result.deck,
          deckSelection: { mulliganDone: true },
        },
      });
      set({ deckSelection: { ...state.deckSelection, mulliganDone: true } });
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
        emit('updateGameState' as keyof ClientToServerEvents, {
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
        emit('exhaustCard' as keyof ClientToServerEvents, {
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
        emit('attackCard' as keyof ClientToServerEvents, {
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
        emit('updateGameState' as keyof ClientToServerEvents, {
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
        emit('playCard' as keyof ClientToServerEvents, {
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
        emit('updateGameState' as keyof ClientToServerEvents, {
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
      !state.connection.isConnected
    ) {
      toast.error(
        'Impossible de piocher : connexion ou ID de partie manquant.',
        {
          toastId: 'draw_card_error',
        },
      );
      return;
    }
    const result = drawCard((event, data) =>
      emit(event as keyof ClientToServerEvents, {
        ...data,
        gameId,
        playerId: state.connection.playerId,
      }),
    );
    if (result) {
      emit('drawCard' as keyof ClientToServerEvents, {
        gameId,
        playerId: state.connection.playerId,
      });
    }
  }, [
    drawCard,
    gameId,
    state.connection.playerId,
    state.connection.isConnected,
    emit,
  ]);

  const handleShuffleDeck = useCallback(() => {
    const result = shuffleDeck(state.player.deck);
    if (result && gameId && state.connection.isConnected) {
      emit('updateGameState' as keyof ClientToServerEvents, {
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
        emit('updateLifePoints' as keyof ClientToServerEvents, {
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
        emit('updateTokenCount' as keyof ClientToServerEvents, {
          gameId,
          tokenCount: newValue,
        });
      }
    },
    [updateTokenCount, gameId, state.connection.isConnected, emit],
  );

  const handleAddAssassinTokenToOpponentDeck = useCallback(() => {
    const result = addAssassinTokenToOpponentDeck((event, data) =>
      emit(event as keyof ClientToServerEvents, { ...data, gameId }),
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
      emit(event as keyof ClientToServerEvents, { ...data, gameId }),
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
      placeAssassinTokenAtOpponentDeckBottom={
        handlePlaceAssassinTokenAtOpponentDeckBottom
      }
      setGraveyardOpen={setGraveyardOpen}
      setOpponentGraveyardOpen={setOpponentGraveyardOpen}
      setTokenZoneOpen={setTokenZoneOpen}
      setOpponentTokenZoneOpen={setOpponentTokenZoneOpen}
      setChatInput={setChatInput}
      deckSelectionData={state.deckSelection.deckSelectionData}
      backcard={backcard}
      playmats={playmats}
    />
  );
}