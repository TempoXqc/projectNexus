// src/hooks/useGameState.ts
import { useState, useCallback, useRef } from 'react';
import { GameState } from 'types/GameStateTypes';
import { produce } from 'immer';
import { useCardActions } from '@/hooks/useCardActions.ts';
import { useDeckManagement } from '@/hooks/useDeckManagement.ts';
import { usePlayerState } from '@/hooks/usePlayerState.ts';
import { initialGameState } from '@/utils/initialGameState.ts';

export const useGameState = () => {
  const initialStateRef = useRef<GameState>(initialGameState);
  const [state, setState] = useState<GameState>(initialStateRef.current);
  const set = useCallback(
    (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => {
      setState((prev) =>
        produce(prev, (draft: GameState) => {
          const partialUpdate = typeof updates === 'function' ? updates(prev) : updates;
          Object.assign(draft.player, partialUpdate.player || {});
          Object.assign(draft.opponent, partialUpdate.opponent || {});
          Object.assign(draft.game, partialUpdate.game || {});
          Object.assign(draft.ui, partialUpdate.ui || {});
          Object.assign(draft.chat, partialUpdate.chat || {});
          Object.assign(draft.deckSelection, partialUpdate.deckSelection || {});
          Object.assign(draft.connection, partialUpdate.connection || {});
        }),
      );
    },
    [],
  );

  const cardActions = useCardActions(state, set);
  const deckManagement = useDeckManagement(state, set);
  const playerState = usePlayerState(state, set);

  return {
    state,
    set,
    ...cardActions,
    ...deckManagement,
    ...playerState,
  };
};