import { useCallback } from 'react';
import { GameState, Card } from '@tempoxqc/project-nexus-types';
import { toast } from 'react-toastify';

export const useCardActions = (
  state: GameState,
  set: (updates: Partial<GameState>) => void,
) => {
  const handleAssassinTokenDraw = useCallback(
    (emit?: (event: string, data: any) => void) => {
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
    [state.opponent, state.player.nexus, state.opponent?.tokenCount, state.player, state.opponent, set],
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

      if (drawnCard.types.some(t => t.type === 'token' && t.subTypes === 'token') && state.opponent?.tokenType === 'assassin') {
        const assassinResult = handleAssassinTokenDraw(emit);
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
          toast.warn('Aucune carte restante pour repiocher.', {
            toastId: 'no_cards_to_draw',
          });
        }
      } else {
        newHand = [...state.player.hand, { ...drawnCard, exhausted: false }];
      }

      set({ player: { ...state.player, hand: newHand, deck: newDeck } });

      return { hand: newHand, deck: newDeck };
    },
    [state.player.deck, state.game.isMyTurn, state.player.hand, state.opponent, state.player, handleAssassinTokenDraw, set],
  );

  const playCardToField = useCallback(
    (card: Card, emit?: (event: string, data: any) => void) => {
      if (!emit) {
        console.error('emit function is undefined in playCardToField');
        toast.error('Erreur de connexion au serveur.', { toastId: 'emit_error' });
        return null;
      }

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
        toast.error('Aucun emplacement disponible sur le terrain.', {
          toastId: 'play_card_no_space',
        });
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
          {
            toastId: 'play_card_error',
          },
        );
        return null;
      }

      // Envoyer l'action au serveur et attendre la mise à jour via updateGameState
      emit('playCard', { gameId: state.connection.gameId, card, fieldIndex });

      return { card, fieldIndex, hand: state.player.hand, field: state.player.field };
    },
    [state.player.field, state.player.hand, state.player, state.game, state.connection, set],
  );

  const discardCardFromHand = useCallback(
    (card: Card) => {
      const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
      const newGraveyard = [...state.player.graveyard, card];
      set({
        player: { ...state.player, hand: newHand, graveyard: newGraveyard },
        turnState: { ...state.turnState, discardedCardsCount: state.turnState.discardedCardsCount + 1 },
      });

      return { hand: newHand, graveyard: newGraveyard };
    },
    [state.player.hand, state.player.graveyard, state.turnState, set],
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
      set({
        player: { ...state.player, field: newField, graveyard: newGraveyard },
        lastDestroyedUnit: removedCard,
      });

      return { field: newField, graveyard: newGraveyard };
    },
    [state.player.field, state.player.graveyard, set],
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
      set({
        player: { ...state.player, field: newField, graveyard: newGraveyard },
        lastDestroyedUnit: removedCard,
      });

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