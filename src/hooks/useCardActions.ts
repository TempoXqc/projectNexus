// client/src/hooks/useCardActions.ts
import { useCallback } from 'react';
import { GameState } from '@tempoxqc/project-nexus-types';
import { Card } from '@tempoxqc/project-nexus-types';
import { toast } from 'react-toastify';

export const useCardActions = (
  state: GameState,
  set: (updates: Partial<GameState>) => void,
) => {
  const handleAssassinTokenDraw = useCallback(
    (emit?: (event: string, data: any) => void) => {
      if (state.opponent.tokenType !== 'assassin') return null;
      const newLifePoints = Math.max(0, state.player.lifePoints - 2);
      const newOpponentTokenCount = Math.min(state.opponent.tokenCount + 1, 8);
      set({
        player: { ...state.player, lifePoints: newLifePoints },
        opponent: { ...state.opponent, tokenCount: newOpponentTokenCount },
      });
      toast.info('Vous avez pioché un token assassin ! -2 points de vie.', {
        toastId: 'assassin_token_draw',
      });

      if (emit) {
        emit('handleAssassinTokenDraw', {
          gameId: '',
          playerLifePoints: newLifePoints,
          opponentTokenCount: newOpponentTokenCount,
        });
      }

      return { lifePoints: newLifePoints, opponentTokenCount: newOpponentTokenCount };
    },
    [state.opponent.tokenType, state.player.lifePoints, state.opponent.tokenCount, state.player, state.opponent, set],
  );

  const drawCard = useCallback(
    (emit?: (event: string, data: any) => void) => {
      if (
        state.player.deck.length === 0 ||
        !state.game.isMyTurn ||
        state.player.hand.length >= 10
      ) {
        toast.error('Impossible de piocher : deck vide, tour non actif ou main pleine.', {
          toastId: 'draw_card_error',
        });
        return null;
      }

      let [drawnCard] = state.player.deck.slice(0, 1);
      let newDeck = state.player.deck.slice(1);
      let newHand = [...state.player.hand];

      if (drawnCard.name.fr === 'Assassin Token' && state.opponent.tokenType === 'assassin') {
        const assassinResult = handleAssassinTokenDraw(emit);
        if (!assassinResult) {
          console.error('[ERROR] handleAssassinTokenDraw returned null');
          return null;
        }

        if (newDeck.length > 0) {
          [drawnCard] = newDeck.slice(0, 1);
          newDeck = newDeck.slice(1);
          newHand = [...state.player.hand, drawnCard];
        } else {
          newHand = [...state.player.hand];
          toast.warn('Aucune carte restante pour repiocher.', {
            toastId: 'no_cards_to_draw',
          });
        }
      } else {
        newHand = [...state.player.hand, drawnCard];
      }

      set({ player: { ...state.player, hand: newHand, deck: newDeck } });

      return { hand: newHand, deck: newDeck };
    },
    [state.player.deck, state.game.isMyTurn, state.player.hand, state.opponent.tokenType, state.player, handleAssassinTokenDraw, set],
  );

  const playCardToField = useCallback(
    (card: Card) => {
      if (
        !state.game.isMyTurn ||
        state.player.mustDiscard ||
        state.game.currentPhase !== 'Main'
      ) {
        toast.error('Impossible de jouer une carte : conditions non remplies.', {
          toastId: 'play_card_error',
        });
        return null;
      }

      const newField: (Card | null)[] = [...state.player.field];
      const emptyIndex = newField.findIndex((slot) => slot === null);
      if (emptyIndex === -1) {
        toast.error('Aucun emplacement disponible sur le terrain.', {
          toastId: 'play_card_no_space',
        });
        return null;
      }

      newField[emptyIndex] = card;
      const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
      set({ player: { ...state.player, field: newField, hand: newHand } });

      return { card, fieldIndex: emptyIndex, hand: newHand, field: newField };
    },
    [state.game.isMyTurn, state.player.mustDiscard, state.game.currentPhase, state.player.field, state.player.hand, state.player, set],
  );

  const discardCardFromHand = useCallback(
    (card: Card) => {
      const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
      const newGraveyard = [...state.player.graveyard, card];
      set({ player: { ...state.player, hand: newHand, graveyard: newGraveyard } });

      return { hand: newHand, graveyard: newGraveyard };
    },
    [state.player.hand, state.player.graveyard, state.player, set],
  );

  const removeCardFromField = useCallback(
    (index: number) => {
      const newField: (Card | null)[] = [...state.player.field];
      const removedCard = newField[index];
      newField[index] = null;

      if (!removedCard) {
        toast.error('Aucune carte à cet emplacement.', {
          toastId: 'remove_card_error',
        });
        return null;
      }

      const newGraveyard = [...state.player.graveyard, removedCard];
      set({ player: { ...state.player, field: newField, graveyard: newGraveyard } });

      return { field: newField, graveyard: newGraveyard };
    },
    [state.player.field, state.player.graveyard, state.player, set],
  );

  const exhaustCard = useCallback(
    (index: number) => {
      if (!state.game.isMyTurn || state.game.currentPhase !== 'Main') {
        toast.error('Impossible d’épuiser une carte : conditions non remplies.', {
          toastId: 'exhaust_card_error',
        });
        return null;
      }

      const card = state.player.field[index];
      if (!card) {
        toast.error('Aucune carte à cet emplacement.', {
          toastId: 'exhaust_card_no_card',
        });
        return null;
      }

      const newField: (Card | null)[] = [...state.player.field];
      newField[index] = { ...card, exhausted: !card.exhausted };
      set({ player: { ...state.player, field: newField } });

      return { cardId: card.id, fieldIndex: index, field: newField };
    },
    [state.game.isMyTurn, state.game.currentPhase, state.player.field, state.player, set],
  );

  const attackCard = useCallback(
    (index: number) => {
      if (!state.game.isMyTurn || state.game.currentPhase !== 'Battle') {
        toast.error('Impossible d’attaquer : conditions non remplies.', {
          toastId: 'attack_card_error',
        });
        return null;
      }

      const card = state.player.field[index];
      if (!card) {
        toast.error('Aucune carte à cet emplacement.', {
          toastId: 'attack_card_no_card',
        });
        return null;
      }

      const newField: (Card | null)[] = [...state.player.field];
      const removedCard = newField[index];
      newField[index] = null;

      const newGraveyard = [...state.player.graveyard, removedCard];
      set({ player: { ...state.player, field: newField, graveyard: newGraveyard } });

      return { cardId: card.id, field: newField, graveyard: newGraveyard };
    },
    [state.game.isMyTurn, state.game.currentPhase, state.player.field, state.player.graveyard, state.player, set],
  );

  const addToDeck = useCallback(
    (card: Card) => {
      const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
      const newDeck = [...state.player.deck, card];
      set({ player: { ...state.player, hand: newHand, deck: newDeck } });

      return { hand: newHand, deck: newDeck };
    },
    [state.player.hand, state.player.deck, state.player, set],
  );

  return {
    drawCard,
    playCardToField,
    discardCardFromHand,
    removeCardFromField,
    exhaustCard,
    attackCard,
    addToDeck,
  };
};