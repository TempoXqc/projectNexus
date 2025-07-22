import { useState } from 'react';
import { GameState, Card } from '@tempoxqc/project-nexus-types';
import { initialGameState } from '@/utils/initialGameState';
import { useCardActions } from '@/hooks/useCardActions';
import { usePlayerState } from '@/hooks/usePlayerState';

const defaultInitialGameState: GameState = {
  player: {
    id: '',
    nexus: { health: 30 },
    hand: [],
    field: Array(8).fill(null),
    opponentField: [],
    opponentHand: [],
    deck: [],
    graveyard: [],
    tokenPool: [],
    mustDiscard: false,
    hasPlayedCard: false,
    actionPoints: 1,
    lifePoints: 30,
    tokenCount: 0,
    tokenType: null,
    mulliganDone: false,
    playmat: { id: '', name: '', image: '' },
  },
  opponent: {
    id: '',
    nexus: { health: 30 },
    hand: [],
    field: Array(8).fill(null),
    opponentField: [],
    opponentHand: [],
    deck: [],
    graveyard: [],
    tokenPool: [],
    mustDiscard: false,
    hasPlayedCard: false,
    actionPoints: 1,
    lifePoints: 30,
    tokenCount: 0,
    tokenType: null,
    mulliganDone: false,
    playmat: { id: '', name: '', image: '' },
  },
  game: {
    turn: 1,
    currentPhase: 'Main',
    isMyTurn: false,
    activePlayerId: null,
    gameOver: false,
    winner: null,
    updateTimestamp: Date.now(),
  },
  revealedCards: [],
  turnState: {
    unitsDeployed: [],
    discardedCardsCount: 0,
    temporaryKeywords: [],
    preventDestructionCards: [],
    battlePhaseDisabled: false,
  },
  lastCardPlayed: undefined,
  lastDestroyedUnit: undefined,
  targetType: undefined,
  detected: false,
  currentCard: undefined,
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
    isRevealedCardsOpen: false,
    isReorderCardsOpen: false,
    isSelectCardOpen: false,
    isChoiceOpen: false,
  },
  chat: {
    messages: [],
    input: '',
  },
  deckSelection: {
    selectedDecks: [],
    player1DeckId: [],
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
    deckSelectionData: {
      player1DeckId: [],
      player2DeckIds: [],
      selectedDecks: [],
    },
    randomizers: [],
    waitingForPlayer1: true,
  },
  connection: {
    playerId: null,
    isConnected: false,
    canInitializeDraw: false,
  },
};

export const useGameState = () => {
  const [state, setState] = useState<GameState>(() => {
    if (!initialGameState || !initialGameState.game) {
      console.warn('initialGameState is incomplete or missing game property, using defaultInitialGameState', {
        initialGameState: JSON.stringify(initialGameState, null, 2),
      });
      return defaultInitialGameState;
    }
    console.log('Using initialGameState:', {
      isMyTurn: initialGameState.game.isMyTurn,
      currentPhase: initialGameState.game.currentPhase,
    });
    return initialGameState;
  });

  const {
    drawCard,
    playCardToField,
    discardCardFromHand,
    removeCardFromField,
    exhaustCard,
    attackCard,
    addToDeck,
  } = useCardActions(state, setState);

  const {
    updateLifePoints,
    updateTokenCount,
    addAssassinTokenToOpponentDeck,
    placeAssassinTokenAtOpponentDeckBottom,
    setHoveredTokenId,
  } = usePlayerState(state, setState);

  const handleDeckChoice = (
    deckId: string,
    gameId: string,
    emit: (event: string, data: any, callback?: (response: any) => void) => void,
  ) => {
    emit('chooseDeck', { gameId, playerId: state.connection.playerId, deckId });
    return true;
  };

  const handleReadyClick = (
    gameId: string,
    emit: (event: string, data: any, callback?: (response: any) => void) => void,
  ) => {
    emit('playerReady', { gameId, playerId: state.connection.playerId });
    return true;
  };

  const doMulligan = () => {
    const selectedForMulligan = state.deckSelection.selectedForMulligan;
    const newHand = state.player.hand.filter((card: Card) => !selectedForMulligan.includes(card.id));
    const newDeck = [...state.player.deck, ...state.player.hand.filter((card: Card) => selectedForMulligan.includes(card.id))].sort(() => Math.random() - 0.5);
    const newDraw = newDeck.slice(0, selectedForMulligan.length);
    newDeck.splice(0, selectedForMulligan.length);
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, hand: [...newHand, ...newDraw], deck: newDeck },
      deckSelection: { ...prev.deckSelection, selectedForMulligan: [], mulliganDone: true },
    }));
    return { hand: [...newHand, ...newDraw], deck: newDeck };
  };

  const keepInitialHand = () => {
    setState((prev) => ({ ...prev, deckSelection: { ...prev.deckSelection, mulliganDone: true } }));
    return { hand: state.player.hand };
  };

  return {
    state,
    set: setState,
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
  };
};