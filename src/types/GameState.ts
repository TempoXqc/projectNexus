import { Card } from './Card';

export interface PlayerState {
  hand: Card[];
  deck: Card[];
  graveyard: Card[];
  field: (Card | null)[];
  mustDiscard: boolean;
  hasPlayedCard: boolean;
  lifePoints: number;
  tokenCount: number;
  tokenType: 'assassin' | 'engine' | 'viking' | null;
}

export interface GameState {
  player: PlayerState;
  opponent: PlayerState;
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
    hoveredTokenId: string | null; // New: For token preview
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
    deckSelectionData: any;
    randomizers: { id: string; name: string; image: string }[];
    waitingForPlayer1: boolean;
  };
  connection: {
    playerId: number | null;
    isConnected: boolean;
    canInitializeDraw: boolean;
  };
}

export interface PartialGameState {
  player?: Partial<PlayerState>;
  opponent?: Partial<PlayerState>;
  game?: Partial<GameState['game']>;
  ui?: Partial<GameState['ui']>;
  chat?: Partial<GameState['chat']>;
  deckSelection?: Partial<GameState['deckSelection']>;
  connection?: Partial<GameState['connection']>;
}