// client/src/hooks/useDeckManagement.ts
import { useCallback } from 'react';
import { GameState } from 'types/GameStateTypes';
import { Card } from 'types/CardTypes';
import { toast } from 'react-toastify';
import { shuffleDeck } from '@/utils/shuffleDeck.ts';
import { getRandomHand } from '@/utils/getRandomHand.ts';

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
      if (!state.connection.playerId || !state.connection.isConnected || !gameId) {
        console.log('Returning null because playerId, isConnected, or gameId is missing');
        return null;
      }
      if (state.connection.playerId === 1 && state.deckSelection.hasChosenDeck) {
        console.log('Returning null because player 1 already chose deck');
        return null;
      }
      if (
        state.connection.playerId === 2 &&
        (!state.deckSelection.player1DeckId ||
          state.deckSelection.waitingForPlayer1 ||
          state.deckSelection.selectedDecks.filter((d: string) => d !== state.deckSelection.player1DeckId).length >= 2)
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
        deckSelection: { ...state.deckSelection, hasChosenDeck: true },
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
    (gameId: string, emit?: (event: string, data: any) => void) => {
      if (!gameId || !state.connection.playerId || state.deckSelection.isReady) {
        console.log('Returning null because gameId, playerId, or isReady is invalid');
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

  const initializeDeck = useCallback(
    (gameId: string, emit: (event: string, data: any) => void) => {
      if (
        !state.deckSelection.deckSelectionData ||
        !state.deckSelection.bothReady ||
        state.deckSelection.deckSelectionDone ||
        state.connection.playerId === null
      ) {
        console.log('Returning null because deckSelectionData, bothReady, deckSelectionDone, or playerId is invalid');
        return null;
      }

      const { player1DeckId, player2DeckIds, selectedDecks } = state.deckSelection.deckSelectionData;
      const remainingDeckId = selectedDecks.find(
        (id: string) => id !== player1DeckId && !player2DeckIds.includes(id),
      );

      Promise.all([
        fetch('/deckLists.json').then((res) => {
          if (!res.ok) throw new Error('Erreur lors du chargement de deckLists.json');
          return res.json();
        }),
        fetch('/cards.json').then((res) => {
          if (!res.ok) throw new Error('Erreur lors du chargement de cards.json');
          return res.json();
        }),
      ])
        .then(([deckLists, allCards]) => {
          const getDeckCards = (deckId: string): Card[] => {
            const cardIds = deckLists[deckId] || [];
            return allCards.filter((card: Card) => cardIds.includes(card.id));
          };

          let currentPlayerCards: Card[] = [];
          let tokenType: 'assassin' | 'engine' | 'viking' | null = null;
          let tokenCount = 0;

          if (state.connection.playerId === 1) {
            const player1Cards = getDeckCards(player1DeckId);
            const remainingCards = remainingDeckId ? getDeckCards(remainingDeckId) : [];
            currentPlayerCards = [...player1Cards, ...remainingCards]
              .sort(() => Math.random() - 0.5)
              .slice(0, 30);
            if (player1DeckId === 'assassin') {
              tokenType = 'assassin';
              tokenCount = 8;
            } else if (player1DeckId === 'engine') {
              tokenType = 'engine';
              tokenCount = 0;
            } else if (player1DeckId === 'viking') {
              tokenType = 'viking';
              tokenCount = 1;
            }
          } else {
            currentPlayerCards = player2DeckIds
              .flatMap((deckId: string) => getDeckCards(deckId))
              .sort(() => Math.random() - 0.5)
              .slice(0, 30);
            if (player2DeckIds.includes('assassin')) {
              tokenType = 'assassin';
              tokenCount = 8;
            } else if (player2DeckIds.includes('engine')) {
              tokenType = 'engine';
              tokenCount = 0;
            } else if (player2DeckIds.includes('viking')) {
              tokenType = 'viking';
              tokenCount = 1;
            }
          }

          if (currentPlayerCards.length === 0) {
            console.error('[ERROR] Aucune carte trouvée pour le deck du joueur', state.connection.playerId);
            toast.error('Erreur : aucune carte trouvée pour le deck.', {
              toastId: 'initialize_deck_error',
            });
            return;
          }

          const shuffledDeck: Card[] = [...currentPlayerCards];
          const drawn: Card[] = getRandomHand(shuffledDeck, 5);
          const rest: Card[] = shuffledDeck.filter(
            (c: Card) => !drawn.some((d: Card) => d.id === c.id),
          );

          set({
            player: {
              ...state.player,
              deck: rest,
              lifePoints: 30,
              tokenType,
              tokenCount,
            },
            deckSelection: {
              ...state.deckSelection,
              initialDraw: drawn,
              deckSelectionDone: true,
            },
          });

          if (state.connection.isConnected) {
            emit('updateGameState', {
              gameId,
              state: { hand: drawn, deck: rest, lifePoints: 30, tokenType, tokenCount },
            });
          }
        })
        .catch((err: Error) => {
          console.error('[ERREUR INIT DRAW]', err);
          toast.error('Erreur lors du chargement des decks.', {
            toastId: 'initialize_deck_error',
          });
        });

      return { deckSelectionDone: true };
    },
    [state.deckSelection.deckSelectionData, state.deckSelection.bothReady, state.deckSelection.deckSelectionDone, state.connection.playerId, state.connection.isConnected, state.player, state.deckSelection, set],
  );

  return {
    toggleCardMulligan,
    doMulligan,
    keepInitialHand,
    handleDeckChoice,
    handleReadyClick,
    initializeDeck,
  };
};