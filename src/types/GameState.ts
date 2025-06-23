import { Card } from './Card';

export interface GameState {
  player: {
    hand: Card[];
    deck: Card[];
    graveyard: Card[];
    field: (Card | null)[];
    mustDiscard: boolean;
    hasPlayedCard: boolean;
  };
  opponent: {
    hand: Card[];
    deck: Card[];
    graveyard: Card[];
    field: (Card | null)[];
    mustDiscard: boolean;
    hasPlayedCard: boolean;
  };
  game: {
    turn: number;
    currentPhase: 'Standby' | 'Main' | 'Battle' | 'End';
    isMyTurn: boolean;
    activePlayerId: string | null;
  };
  ui: {
    hoveredCardId: string | null;
    isCardHovered: boolean;
    isGraveyardOpen: boolean;
    isOpponentGraveyardOpen: boolean;
    isRightPanelOpen: boolean;
    isRightPanelHovered: boolean;
  };
  chat: {
    messages: { playerId: number; message: string }[];
    input: string;
  };
  deckSelection: {
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
    randomizers: { id: string; name: string; image: string }[];
  };
  connection: {
    playerId: number | null;
    isConnected: boolean;
    canInitializeDraw: boolean;
  };
}

export * from './PartialGameState';