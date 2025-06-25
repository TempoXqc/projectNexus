// types/GameStateTypes.ts
import { Card } from './CardTypes';

export interface GameState {
  player: {
    hand: Card[];
    deck: Card[];
    graveyard: Card[] | null;
    field: (Card | null)[];
    mustDiscard: boolean;
    hasPlayedCard: boolean;
    lifePoints: number;
    tokenCount: number;
    tokenType: 'assassin' | 'engine' | 'viking' | null;
  };
  opponent: {
    hand: Card[];
    deck: Card[];
    graveyard: Card[];
    field: (Card | null)[];
    mustDiscard: boolean;
    hasPlayedCard: boolean;
    lifePoints: number;
    tokenCount: number;
    tokenType: 'assassin' | 'engine' | 'viking' | null;
  };
  game: {
    turn: number;
    currentPhase: 'Standby' | 'Main' | 'Battle' | 'End';
    isMyTurn: boolean;
    activePlayerId: string | null;
    gameOver: boolean;
    winner: string | null;
  };
  ui: {
    hoveredCardId: string | null;
    hoveredTokenId: string | null;
    isCardHovered: boolean;
    isGraveyardOpen: boolean;
    isOpponentGraveyardOpen: boolean;
    isRightPanelOpen: boolean;
    isRightPanelHovered: boolean;
    isTokenZoneOpen: boolean;
    isOpponentTokenZoneOpen: boolean;
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
    deckSelectionData: { player1DeckId: string; player2DeckIds: string[]; selectedDecks: string[] } | null;
    randomizers: { id: string; name: string; image: string }[];
    waitingForPlayer1: boolean;
  };
  connection: {
    playerId: number | null;
    isConnected: boolean;
    canInitializeDraw: boolean;
  };
}