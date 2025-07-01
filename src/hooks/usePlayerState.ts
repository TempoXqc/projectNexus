// client/src/hooks/usePlayerState.ts
import { useCallback } from 'react';
import { GameState } from '@tempoxqc/project-nexus-types';
import { Card } from '@tempoxqc/project-nexus-types';
import { toast } from 'react-toastify';
import { generateTokenId } from '@/utils/generateTokenId.ts';

export const usePlayerState = (
  state: GameState,
  set: (updates: Partial<GameState>) => void,
) => {
  const updateLifePoints = useCallback(
    (newValue: number) => {
      if (newValue < 0 || newValue > 30) {
        toast.error('Points de vie invalides (doit être entre 0 et 30).', {
          toastId: 'update_life_points_error',
        });
        return null;
      }
      set({ player: { ...state.player, lifePoints: newValue } });
      return { lifePoints: newValue };
    },
    [state.player, set],
  );

  const updateTokenCount = useCallback(
    (newValue: number) => {
      let max = 30;
      if (state.player.tokenType === 'assassin') {
        max = 8;
      }
      if (newValue < 0 || newValue > max) {
        toast.error(`Nombre de tokens invalide (doit être entre 0 et ${max}).`, {
          toastId: 'update_token_count_error',
        });
        return null;
      }
      set({ player: { ...state.player, tokenCount: newValue } });
      return { tokenCount: newValue };
    },
    [state.player, set],
  );

  const addAssassinTokenToOpponentDeck = useCallback(
    (emit?: (event: string, data: any) => void) => {
      if (state.player.tokenCount < 1) {
        toast.error('Pas assez de tokens pour ajouter un token assassin.', {
          toastId: 'add_assassin_token_error',
        });
        return null;
      }
      const tokenCard: Card = {
        id: generateTokenId(),
        name: 'Assassin Token',
        image: '/addons/tokens/token_assassin.jpg',
        exhausted: false,
      };
      const newOpponentDeck = [...state.opponent.deck, tokenCard].sort(() => Math.random() - 0.5);
      const newTokenCount = state.player.tokenCount - 1;
      set({
        player: { ...state.player, tokenCount: newTokenCount },
        opponent: { ...state.opponent, deck: newOpponentDeck },
      });
      console.log('[DEBUG] addAssassinTokenToOpponentDeck:', {
        tokenCardId: tokenCard.id,
        newOpponentDeckLength: newOpponentDeck.length,
      });
      toast.success('Token assassin ajouté au deck adverse et mélangé !', {
        toastId: 'add_assassin_token',
      });

      if (emit) {
        emit('addAssassinTokenToOpponentDeck', {
          gameId: '',
          tokenCount: newTokenCount,
          tokenCard,
        });
      }

      return { tokenCount: newTokenCount, opponentDeck: newOpponentDeck };
    },
    [state.player.tokenCount, state.opponent.deck, state.player, state.opponent, set],
  );

  const placeAssassinTokenAtOpponentDeckBottom = useCallback(
    (emit?: (event: string, data: any) => void) => {
      if (state.player.tokenCount < 1) {
        toast.error('Pas assez de tokens pour placer un token assassin.', {
          toastId: 'place_assassin_token_error',
        });
        return null;
      }
      const tokenCard: Card = {
        id: generateTokenId(),
        name: 'Assassin Token',
        image: '/addons/tokens/token_assassin.jpg',
        exhausted: false,
      };
      const newOpponentDeck = [...state.opponent.deck, tokenCard];
      const newTokenCount = state.player.tokenCount - 1;
      set({
        player: { ...state.player, tokenCount: newTokenCount },
        opponent: { ...state.opponent, deck: newOpponentDeck },
      });
      console.log('[DEBUG] placeAssassinTokenAtOpponentDeckBottom:', {
        tokenCardId: tokenCard.id,
        newOpponentDeckLength: newOpponentDeck.length,
      });
      toast.success('Token assassin placé en bas du deck adverse !', {
        toastId: 'place_assassin_token',
      });

      if (emit) {
        emit('placeAssassinTokenAtOpponentDeckBottom', {
          gameId: '',
          tokenCard,
        });
      }

      return { opponentDeck: newOpponentDeck, tokenCount: newTokenCount };
    },
    [state.opponent.deck, state.player.tokenCount, state.player, state.opponent, set],
  );

  const setHoveredTokenId = useCallback(
    (id: string | null) => {
      set({ ui: { ...state.ui, hoveredTokenId: id } });
    },
    [state.ui, set],
  );

  return {
    updateLifePoints,
    updateTokenCount,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
    setHoveredTokenId,
  };
};