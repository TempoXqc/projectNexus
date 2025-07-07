import { useCallback } from 'react';
import { GameState } from '@tempoxqc/project-nexus-types';
import { Card } from '@tempoxqc/project-nexus-types';
import { shuffleDeck } from '@/utils/shuffleDeck.ts';
import { getRandomHand } from '@/utils/getRandomHand.ts';
import { ClientToServerEvents } from '@/hooks/useGameSocket.ts';

export const useDeckManagement = (
  state: GameState,
  set: (updates: Partial<GameState>) => void,
) => {
  const toggleCardMulligan = useCallback(
    (cardId: string) => {
      set({
        deckSelection: {
          ...state.deckSelection,
          selectedForMulligan: state.deckSelection.selectedForMulligan.includes(cardId)
            ? state.deckSelection.selectedForMulligan.filter((id: string) => id !== cardId)
            : [...state.deckSelection.selectedForMulligan, cardId],
        },
      });
    },
    [state.deckSelection.selectedForMulligan, set],
  );

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
  }, [state.deckSelection.initialDraw, state.deckSelection.selectedForMulligan, state.player.deck, set]);

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
  }, [state.deckSelection.initialDraw, set]);

  const handleDeckChoice = useCallback(
    (deckId: string, gameId?: string, emit?: (event: string, data: any) => void) => {
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

      let tokenType: 'assassin' | 'engine' | 'viking' | 'celestial' | 'dragon' | 'samurai' | 'wizard' | null = null;
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
      } else if (deckId === 'celestial') {
        tokenType = 'celestial';
        tokenCount = 0;
      } else if (deckId === 'dragon') {
        tokenType = 'dragon';
        tokenCount = 0;
      } else if (deckId === 'samurai') {
        tokenType = 'samurai';
        tokenCount = 0;
      } else if (deckId === 'wizard') {
        tokenType = 'wizard';
        tokenCount = 0;
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

      if (emit) {
        emit('chooseDeck', { gameId, playerId: state.connection.playerId, deckId });
      }

      return { deckId };
    },
    [state.connection.playerId, state.connection.isConnected, state.deckSelection, state.player, set],
  );

  const handleReadyClick = useCallback(
    (gameId: string, emit?: (event: keyof ClientToServerEvents, data: any) => void) => {
      if (!gameId || !state.connection.playerId || state.deckSelection.isReady) {
        return null;
      }
      set({
        deckSelection: { ...state.deckSelection, isReady: true },
      });

      if (emit) {
        emit('playerReady', { gameId, playerId: state.connection.playerId });
      }

      return { playerId: state.connection.playerId };
    },
    [state.connection.playerId, state.deckSelection.isReady, state.deckSelection, set],
  );

  return {
    toggleCardMulligan,
    doMulligan,
    keepInitialHand,
    handleDeckChoice,
    handleReadyClick,
  };
};