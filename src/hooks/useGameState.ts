import { useState, useCallback } from 'react';
import { Card } from '../types/Card';
import { GameState, PartialGameState } from '../types/GameState';
import { toast } from 'react-toastify';

let tokenIdCounter = 0;

const initialState: GameState = {
  player: {
    hand: [],
    deck: [],
    graveyard: [],
    field: Array(8).fill(null),
    mustDiscard: false,
    hasPlayedCard: false,
    lifePoints: 30,
    tokenCount: 0,
    tokenType: null,
  },
  opponent: {
    hand: [],
    deck: [],
    graveyard: [],
    field: Array(8).fill(null),
    mustDiscard: false,
    hasPlayedCard: false,
    lifePoints: 30,
    tokenCount: 0,
    tokenType: null,
  },
  game: {
    turn: 1,
    currentPhase: 'Standby',
    isMyTurn: false,
    activePlayerId: null,
    gameOver: false,
    winner: null,
  },
  ui: {
    hoveredCardId: null,
    hoveredTokenId: null,
    isCardHovered: false,
    isGraveyardOpen: false,
    isOpponentGraveyardOpen: false,
    isRightPanelOpen: false,
    isRightPanelHovered: false,
    isTokenZoneOpen: false,
    isOpponentTokenZoneOpen: false,
  },
  chat: {
    messages: [],
    input: '',
  },
  deckSelection: {
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
    randomizers: [],
    waitingForPlayer1: false,
  },
  connection: {
    playerId: null,
    isConnected: false,
    canInitializeDraw: false,
  },
};

const getRandomHand = <T,>(deck: T[], count: number): T[] =>
  [...deck].sort(() => 0.5 - Math.random()).slice(0, count);

const generateTokenId = () => {
  const timestamp = Date.now();
  const uniqueId = `token_assassin_${timestamp}_${tokenIdCounter++}_${Math.random().toString(36).substr(2, 9)}`;
  return uniqueId;
};

export const useGameState = () => {
  const [state, setState] = useState<GameState>(initialState);

  const set = useCallback((updates: PartialGameState) => {
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, ...(updates.player || {}) },
      opponent: { ...prev.opponent, ...(updates.opponent || {}) },
      game: { ...prev.game, ...(updates.game || {}) },
      ui: { ...prev.ui, ...(updates.ui || {}) },
      chat: { ...prev.chat, ...(updates.chat || {}) },
      deckSelection: { ...prev.deckSelection, ...(updates.deckSelection || {}) },
      connection: { ...prev.connection, ...(updates.connection || {}) },
    }));
  }, []);

  const updateLifePoints = useCallback((newValue: number) => {
    if (newValue < 0 || newValue > 30) return null;
    set({ player: { lifePoints: newValue } });
    return { lifePoints: newValue };
  }, [set]);

  const updateTokenCount = useCallback((newValue: number) => {
    let max = 30;
    if (state.player.tokenType === 'assassin') {
      max = 8;
    }
    if (newValue < 0 || newValue > max) return null;
    set({ player: { tokenCount: newValue } });
    return { tokenCount: newValue };
  }, [state.player.tokenType, set]);

  const setHoveredTokenId = useCallback(
    (id: string | null) => {
      set({ ui: { hoveredTokenId: id } });
    },
    [set],
  );

  const addAssassinTokenToOpponentDeck = useCallback(() => {
    if (state.player.tokenCount < 1) return null;
    const tokenCard: Card = {
      id: generateTokenId(),
      name: 'Assassin Token',
      image: '/cards/tokens/token_assassin.jpg',
      exhausted: false,
    };
    const newOpponentDeck = [...state.opponent.deck, tokenCard].sort(() => Math.random() - 0.5);
    const newTokenCount = state.player.tokenCount - 1;
    set({
      player: { tokenCount: newTokenCount },
      opponent: { deck: newOpponentDeck },
    });
    console.log('[DEBUG] addAssassinTokenToOpponentDeck:', {
      tokenCardId: tokenCard.id,
      newOpponentDeckLength: newOpponentDeck.length,
    });
    return { tokenCount: newTokenCount, opponentDeck: newOpponentDeck };
  }, [state.player.tokenCount, state.opponent.deck, set]);

  const placeAssassinTokenAtOpponentDeckBottom = useCallback(() => {
    if (state.player.tokenCount < 1) return null;
    const tokenCard: Card = {
      id: generateTokenId(),
      name: 'Assassin Token',
      image: '/cards/tokens/token_assassin.jpg',
      exhausted: false,
    };
    const newOpponentDeck = [...state.opponent.deck, tokenCard];
    const newTokenCount = state.player.tokenCount - 1;
    set({
      player: { tokenCount: newTokenCount },
      opponent: { deck: newOpponentDeck },
    });
    console.log('[DEBUG] placeAssassinTokenAtOpponentDeckBottom:', {
      tokenCardId: tokenCard.id,
      newOpponentDeckLength: newOpponentDeck.length,
    });
    return { opponentDeck: newOpponentDeck, tokenCount: newTokenCount };
  }, [state.opponent.deck, state.player.tokenCount, set]);

  const handleAssassinTokenDraw = useCallback(() => {
    if (state.opponent.tokenType !== 'assassin') return null;
    const newLifePoints = Math.max(0, state.player.lifePoints - 2);
    const newOpponentTokenCount = Math.min(state.opponent.tokenCount + 1, 8);
    set({
      player: { lifePoints: newLifePoints },
      opponent: { tokenCount: newOpponentTokenCount },
    });
    toast.info('Vous avez pioché un token assassin ! -2 points de vie, le token retourne à l’adversaire.', {
      toastId: 'assassin_token_draw',
    });
    console.log('[DEBUG] handleAssassinTokenDraw applied:', { newLifePoints, newOpponentTokenCount });
    return { lifePoints: newLifePoints, opponentTokenCount: newOpponentTokenCount };
  }, [state.opponent.tokenType, state.player.lifePoints, state.opponent.tokenCount, set]);

  const drawCard = useCallback(() => {
    if (
      state.player.deck.length === 0 ||
      !state.game.isMyTurn ||
      state.player.hand.length >= 10
    ) {
      console.log('[DEBUG] drawCard failed:', {
        deckLength: state.player.deck.length,
        isMyTurn: state.game.isMyTurn,
        handLength: state.player.hand.length,
      });
      return null;
    }

    let [drawnCard] = state.player.deck.slice(0, 1);
    let newDeck = state.player.deck.slice(1);
    let newHand = [...state.player.hand];

    console.log('[DEBUG] Card drawn:', { drawnCard });

    if (drawnCard.name === 'Assassin Token' && state.opponent.tokenType === 'assassin') {
      console.log('[DEBUG] Assassin Token detected, calling handleAssassinTokenDraw');
      const assassinResult = handleAssassinTokenDraw();
      if (!assassinResult) {
        console.error('[ERROR] handleAssassinTokenDraw returned null');
        return null;
      }

      // Repioche une carte si possible
      if (newDeck.length > 0) {
        [drawnCard] = newDeck.slice(0, 1);
        newDeck = newDeck.slice(1);
        newHand = [...state.player.hand, drawnCard];
        console.log('[DEBUG] Repioche:', { newDrawnCard: drawnCard });
      } else {
        newHand = [...state.player.hand];
        console.log('[DEBUG] No cards left to repioche');
      }
    } else {
      newHand = [...state.player.hand, drawnCard];
    }

    set({ player: { hand: newHand, deck: newDeck } });

    return { hand: newHand, deck: newDeck };
  }, [state.player.deck, state.game.isMyTurn, state.player.hand, state.opponent.tokenType, handleAssassinTokenDraw, set]);

  const removeCardFromField = useCallback((index: number) => {
    const newField = [...state.player.field];
    const removedCard = newField[index];
    newField[index] = null;

    if (!removedCard) return null;

    const newGraveyard = [...state.player.graveyard, removedCard];
    set({ player: { field: newField, graveyard: newGraveyard } });

    return { field: newField, graveyard: newGraveyard };
  }, [state.player.field, state.player.graveyard, set]);

  const discardCardFromHand = useCallback((card: Card) => {
    const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
    const newGraveyard = [...state.player.graveyard, card];
    set({ player: { hand: newHand, graveyard: newGraveyard } });

    return { hand: newHand, graveyard: newGraveyard };
  }, [state.player.hand, state.player.graveyard, set]);

  const playCardToField = useCallback((card: Card) => {
    if (
      !state.game.isMyTurn ||
      state.player.mustDiscard ||
      state.game.currentPhase !== 'Main'
    ) {
      return null;
    }

    const newField = [...state.player.field];
    const emptyIndex = newField.findIndex((slot: Card | null) => slot === null);
    if (emptyIndex === -1) return null;

    newField[emptyIndex] = card;
    const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
    set({ player: { field: newField, hand: newHand } });

    return { card, fieldIndex: emptyIndex, hand: newHand, field: newField };
  }, [state.game.isMyTurn, state.player.mustDiscard, state.game.currentPhase, state.player.field, state.player.hand, set]);

  const exhaustCard = useCallback((index: number) => {
    if (
      !state.game.isMyTurn ||
      state.game.currentPhase !== 'Main'
    ) {
      return null;
    }

    const card = state.player.field[index];
    if (!card) return null;

    const newField = [...state.player.field];
    newField[index] = { ...card, exhausted: !card.exhausted };
    set({ player: { field: newField } });

    return { cardId: card.id, fieldIndex: index, field: newField };
  }, [state.game.isMyTurn, state.game.currentPhase, state.player.field, set]);

  const attackCard = useCallback((index: number) => {
    if (
      !state.game.isMyTurn ||
      state.game.currentPhase !== 'Battle'
    ) return null;

    const card = state.player.field[index];
    if (!card) return null;

    const newField = [...state.player.field];
    const removedCard = newField[index];
    newField[index] = null;

    if (!removedCard) return null;

    const newGraveyard = [...state.player.graveyard, removedCard];
    set({ player: { field: newField, graveyard: newGraveyard } });

    return { cardId: card.id, field: newField, graveyard: newGraveyard };
  }, [state.game.isMyTurn, state.game.currentPhase, state.player.field, state.player.graveyard, set]);

  const addToDeck = useCallback((card: Card) => {
    const newHand = state.player.hand.filter((c: Card) => c.id !== card.id);
    const newDeck = [...state.player.deck, card];
    set({ player: { hand: newHand, deck: newDeck } });

    return { hand: newHand, deck: newDeck };
  }, [state.player.hand, state.player.deck, set]);

  const shuffleDeck = useCallback(() => {
    const shuffledDeck = [...state.player.deck].sort(() => Math.random() - 0.5);
    set({ player: { deck: shuffledDeck } });

    return { deck: shuffledDeck };
  }, [state.player.deck, set]);

  const toggleCardMulligan = useCallback((cardId: string) => {
    set({
      deckSelection: {
        selectedForMulligan: state.deckSelection.selectedForMulligan.includes(cardId)
          ? state.deckSelection.selectedForMulligan.filter((id: string) => id !== cardId)
          : [...state.deckSelection.selectedForMulligan, cardId],
      },
    });
  }, [state.deckSelection.selectedForMulligan, set]);

  const doMulligan = useCallback(() => {
    const toMulligan = state.deckSelection.initialDraw.filter((card: Card) =>
      state.deckSelection.selectedForMulligan.includes(card.id),
    );
    const toKeep = state.deckSelection.initialDraw.filter(
      (card: Card) => !state.deckSelection.selectedForMulligan.includes(card.id),
    );
    const reshuffledDeck = [...state.player.deck, ...toMulligan].sort(
      () => Math.random() - 0.5,
    );
    const newDraw = getRandomHand(reshuffledDeck, 5 - toKeep.length);
    const finalHand = [...toKeep, ...newDraw];
    const newDeck = reshuffledDeck.filter(
      (c: Card) => !newDraw.some((d: Card) => d.id === c.id),
    );
    set({
      player: { hand: finalHand, deck: newDeck },
      deckSelection: { initialDraw: [], selectedForMulligan: [], mulliganDone: true },
    });

    return { hand: finalHand, deck: newDeck };
  }, [state.deckSelection.initialDraw, state.deckSelection.selectedForMulligan, state.player.deck, set]);

  const keepInitialHand = useCallback(() => {
    set({
      player: { hand: state.deckSelection.initialDraw },
      deckSelection: { initialDraw: [], selectedForMulligan: [], mulliganDone: true },
    });

    return { hand: state.deckSelection.initialDraw };
  }, [state.deckSelection.initialDraw, set]);

  const handleDeckChoice = useCallback((deckId: string, gameId?: string) => {
    if (!state.connection.playerId || !state.connection.isConnected || !gameId) return null;
    if (state.connection.playerId === 1 && state.deckSelection.hasChosenDeck) return null;
    if (
      state.connection.playerId === 2 &&
      (!state.deckSelection.player1DeckId ||
        state.deckSelection.waitingForPlayer1 ||
        state.deckSelection.selectedDecks.filter((d: string) => d !== state.deckSelection.player1DeckId).length >= 2)
    )
      return null;

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
      deckSelection: { hasChosenDeck: true },
      player: { tokenType, tokenCount },
    });

    return { deckId };
  }, [state.connection.playerId, state.connection.isConnected, state.deckSelection.hasChosenDeck, state.deckSelection.player1DeckId, state.deckSelection.selectedDecks, state.deckSelection.waitingForPlayer1, set]);

  const handleReadyClick = useCallback((gameId?: string) => {
    if (!gameId || !state.connection.playerId || state.deckSelection.isReady) return null;
    set({ deckSelection: { isReady: true } });

    return { playerId: state.connection.playerId };
  }, [state.connection.playerId, state.deckSelection.isReady, set]);

  const initializeDeck = useCallback((gameId: string, emit: (event: string, data: any) => void) => {
    if (
      !state.deckSelection.deckSelectionData ||
      !state.deckSelection.bothReady ||
      state.deckSelection.deckSelectionDone ||
      state.connection.playerId === null
    ) {
      return null;
    }

    const { player1DeckId, player2DeckIds, selectedDecks } = state.deckSelection.deckSelectionData;
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
          return;
        }

        const shuffledDeck = [...currentPlayerCards];
        const drawn = getRandomHand(shuffledDeck, 5);
        const rest = shuffledDeck.filter((c: Card) => !drawn.some((d: Card) => d.id === c.id));

        set({
          player: { deck: rest, lifePoints: 30, tokenType, tokenCount },
          deckSelection: { initialDraw: drawn, deckSelectionDone: true },
        });

        if (state.connection.isConnected) {
          emit('updateGameState', {
            gameId,
            state: { hand: drawn, deck: rest, lifePoints: 30, tokenType, tokenCount },
          });
        }
      })
      .catch((err: Error) => console.error('[ERREUR INIT DRAW]', err));

    return { deckSelectionDone: true };
  }, [state.deckSelection.deckSelectionData, state.deckSelection.bothReady, state.deckSelection.deckSelectionDone, state.connection.playerId, state.connection.isConnected, set]);

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
    updateLifePoints,
    updateTokenCount,
    setHoveredTokenId,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
  };
};