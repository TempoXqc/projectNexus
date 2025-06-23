import { useState, useCallback } from 'react';
import { Card } from '../types/Card';

interface GameState {
  hand: Card[];
  deck: Card[];
  graveyard: Card[];
  opponentGraveyard: Card[];
  field: (Card | null)[];
  opponentField: (Card | null)[];
  opponentHand: Card[];
  opponentDeck: Card[];
  chatMessages: { playerId: number; message: string }[];
  chatInput: string;
  playerId: number | null;
  turn: number;
  isConnected: boolean;
  hoveredCardId: string | null;
  isCardHovered: boolean;
  isGraveyardOpen: boolean;
  isOpponentGraveyardOpen: boolean;
  mustDiscard: boolean;
  hasPlayedCard: boolean;
  isMyTurn: boolean;
  selectedDecks: string[];
  player1DeckId: string | null;
  player1Deck: Card[];
  player2Deck: Card[];
  hasChosenDeck: boolean;
  deckSelectionDone: boolean;
  initialDraw: Card[];
  selectedForMulligan: string[];
  mulliganDone: boolean;
  isReady: boolean;
  bothReady: boolean;
  opponentReady: boolean;
  deckSelectionData: {
    player1DeckId: string;
    player2DeckIds: string[];
    selectedDecks: string[];
  } | null;
  canInitializeDraw: boolean;
  randomizers: { id: string; name: string; image: string }[];
  isRightPanelOpen: boolean;
  currentPhase: 'Standby' | 'Main' | 'Battle' | 'End';
  isRightPanelHovered: boolean;
}

const initialState: GameState = {
  hand: [],
  deck: [],
  graveyard: [],
  opponentGraveyard: [],
  field: Array(8).fill(null),
  opponentField: Array(8).fill(null),
  opponentHand: [],
  opponentDeck: [],
  chatMessages: [],
  chatInput: '',
  playerId: null,
  turn: 1,
  isConnected: false,
  hoveredCardId: null,
  isCardHovered: false,
  isGraveyardOpen: false,
  isOpponentGraveyardOpen: false,
  mustDiscard: false,
  hasPlayedCard: false,
  isMyTurn: false,
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
  deckSelectionData: null,
  canInitializeDraw: false,
  randomizers: [],
  isRightPanelOpen: false,
  currentPhase: 'Standby',
  isRightPanelHovered: false,
};

const getRandomHand = <T,>(deck: T[], count: number): T[] =>
  [...deck].sort(() => 0.5 - Math.random()).slice(0, count);

export const useGameState = () => {
  const [state, setState] = useState<GameState>(initialState);

  const set = useCallback((updates: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const removeCardFromField = useCallback((index: number) => {
    const newField = [...state.field];
    const removedCard = newField[index];
    newField[index] = null;

    if (!removedCard) return null;

    const newGraveyard = [...state.graveyard, removedCard];
    set({ field: newField, graveyard: newGraveyard });

    return { field: newField, graveyard: newGraveyard };
  }, [state.field, state.graveyard, set]);

  const discardCardFromHand = useCallback((card: Card) => {
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    const newGraveyard = [...state.graveyard, card];
    set({ hand: newHand, graveyard: newGraveyard });

    return { hand: newHand, graveyard: newGraveyard };
  }, [state.hand, state.graveyard, set]);

  const playCardToField = useCallback((card: Card) => {
    if (
      !state.isMyTurn ||
      state.mustDiscard ||
      state.currentPhase !== 'Main'
    ) {
      return null;
    }

    const newField = [...state.field];
    const emptyIndex = newField.findIndex((slot: Card | null) => slot === null);
    if (emptyIndex === -1) return null;

    newField[emptyIndex] = card;
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    set({ field: newField, hand: newHand });

    return { card, fieldIndex: emptyIndex, hand: newHand, field: newField };
  }, [state.isMyTurn, state.mustDiscard, state.currentPhase, state.field, state.hand, set]);

  const exhaustCard = useCallback((index: number) => {
    if (
      !state.isMyTurn ||
      state.currentPhase !== 'Main'
    ) {
      return null;
    }

    const card = state.field[index];
    if (!card) return null;

    const newField = [...state.field];
    newField[index] = { ...card, exhausted: !card.exhausted };
    set({ field: [...newField] });

    return { cardId: card.id, fieldIndex: index, field: newField };
  }, [state.isMyTurn, state.currentPhase, state.field, set]);

  const attackCard = useCallback((index: number) => {
    if (
      !state.isMyTurn ||
      state.currentPhase !== 'Battle'
    ) return null;

    const card = state.field[index];
    if (!card) return null;

    const newField = [...state.field];
    const removedCard = newField[index];
    newField[index] = null;

    if (!removedCard) return null;

    const newGraveyard = [...state.graveyard, removedCard];
    set({ field: newField, graveyard: newGraveyard });

    return { cardId: card.id, field: newField, graveyard: newGraveyard };
  }, [state.isMyTurn, state.currentPhase, state.field, state.graveyard, set]);

  const addToDeck = useCallback((card: Card) => {
    const newHand = state.hand.filter((c: Card) => c.id !== card.id);
    const newDeck = [...state.deck, card];
    set({ hand: newHand, deck: newDeck });

    return { hand: newHand, deck: newDeck };
  }, [state.hand, state.deck, set]);

  const drawCard = useCallback(() => {
    if (
      state.deck.length === 0 ||
      !state.isMyTurn ||
      state.hand.length >= 10
    ) return null;

    const [drawnCard] = state.deck.slice(0, 1);
    const newDeck = state.deck.slice(1);
    const newHand = [...state.hand, drawnCard];
    set({ hand: newHand, deck: newDeck });

    return { hand: newHand, deck: newDeck };
  }, [state.deck, state.isMyTurn, state.hand, set]);

  const shuffleDeck = useCallback(() => {
    const shuffledDeck = [...state.deck].sort(() => Math.random() - 0.5);
    set({ deck: shuffledDeck });

    return { deck: shuffledDeck };
  }, [state.deck, set]);

  const toggleCardMulligan = useCallback((cardId: string) => {
    set({
      selectedForMulligan: state.selectedForMulligan.includes(cardId)
        ? state.selectedForMulligan.filter((id: string) => id !== cardId)
        : [...state.selectedForMulligan, cardId],
    });
  }, [state.selectedForMulligan, set]);

  const doMulligan = useCallback(() => {
    const toMulligan = state.initialDraw.filter((card: Card) =>
      state.selectedForMulligan.includes(card.id),
    );
    const toKeep = state.initialDraw.filter(
      (card: Card) => !state.selectedForMulligan.includes(card.id),
    );
    const reshuffledDeck = [...state.deck, ...toMulligan].sort(
      () => Math.random() - 0.5,
    );
    const newDraw = getRandomHand(reshuffledDeck, 5 - toKeep.length);
    const finalHand = [...toKeep, ...newDraw];
    const newDeck = reshuffledDeck.filter(
      (c: Card) => !newDraw.some((d: Card) => d.id === c.id),
    );
    set({
      hand: finalHand,
      deck: newDeck,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: true,
    });

    return { hand: finalHand, deck: newDeck };
  }, [state.initialDraw, state.selectedForMulligan, state.deck, set]);

  const keepInitialHand = useCallback(() => {
    set({
      hand: state.initialDraw,
      initialDraw: [],
      selectedForMulligan: [],
      mulliganDone: true,
    });

    return { hand: state.initialDraw };
  }, [state.initialDraw, set]);

  const handleDeckChoice = useCallback((deckId: string, gameId?: string) => {
    if (!state.playerId || !state.isConnected || !gameId) return null;
    if (state.playerId === 1 && state.hasChosenDeck) return null;
    if (
      state.playerId === 2 &&
      (!state.player1DeckId ||
        state.selectedDecks.filter((d: string) => d !== state.player1DeckId)
          .length >= 2)
    )
      return null;

    set({ hasChosenDeck: true });

    return { deckId };
  }, [state.playerId, state.isConnected, state.hasChosenDeck, state.player1DeckId, state.selectedDecks, set]);

  const handleReadyClick = useCallback((gameId?: string) => {
    if (!gameId || !state.playerId || state.isReady) return null;
    set({ isReady: true });

    return { playerId: state.playerId };
  }, [state.playerId, state.isReady, set]);

  const initializeDeck = useCallback((gameId: string, emit: (event: string, data: any) => void) => {
    if (
      !state.deckSelectionData ||
      !state.bothReady ||
      state.deckSelectionDone ||
      state.playerId === null
    ) {
      return null;
    }

    const { player1DeckId, player2DeckIds, selectedDecks } = state.deckSelectionData;
    const remainingDeckId = selectedDecks.find(
      (id: string) => id !== player1DeckId && !player2DeckIds.includes(id),
    );

    Promise.all([
      fetch('/deckLists.json').then((res) => res.json()),
      fetch('/cards.json').then((res) => res.json()),
    ])
      .then(([deckLists, allCards]) => {
        const getDeckCards = (deckId: string) => {
          const cardIds = deckLists[deckId] || [];
          return allCards.filter((card: Card) => cardIds.includes(card.id));
        };

        let currentPlayerCards: Card[];
        if (state.playerId === 1) {
          const player1Cards = getDeckCards(player1DeckId);
          const remainingCards = remainingDeckId ? getDeckCards(remainingDeckId) : [];
          currentPlayerCards = [...player1Cards, ...remainingCards]
            .sort(() => Math.random() - 0.5)
            .slice(0, 30);
        } else {
          currentPlayerCards = player2DeckIds
            .flatMap((deckId: string) => getDeckCards(deckId))
            .sort(() => Math.random() - 0.5)
            .slice(0, 30);
        }

        if (currentPlayerCards.length === 0) {
          console.error('[ERROR] Aucune carte trouvée pour le deck du joueur', state.playerId);
          return;
        }

        const shuffledDeck = [...currentPlayerCards];
        const drawn = getRandomHand(shuffledDeck, 5);
        const rest = shuffledDeck.filter((c: Card) => !drawn.some((d: Card) => d.id === c.id));

        set({
          deck: rest,
          initialDraw: drawn,
          deckSelectionDone: true,
        });

        if (state.isConnected) {
          emit('updateGameState', {
            gameId,
            state: { hand: drawn, deck: rest },
          });
        }
      })
      .catch((err: Error) => console.error('[ERREUR INIT DRAW]', err));

    return { deckSelectionDone: true };
  }, [state.deckSelectionData, state.bothReady, state.deckSelectionDone, state.playerId, state.isConnected, set]);

  return {
    state,
    set,
    removeCardFromField,
    discardCardFromHand,
    playCardToField,
    exhaustCard,
    attackCard,
    addToDeck,
    drawCard,
    shuffleDeck,
    toggleCardMulligan,
    doMulligan,
    keepInitialHand,
    handleDeckChoice,
    handleReadyClick,
    initializeDeck,
  };
};