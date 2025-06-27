import { Card } from './CardTypes.js';

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
    tokenType: 'assassin' | 'viking' | 'engine' | 'celestial' | 'dragon' | 'samurai' | 'wizard' | 'vampire' | null;
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
    tokenType: 'assassin' | 'viking' | 'engine' | 'celestial' | 'dragon' | 'samurai' | 'wizard' | 'vampire' | null;
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
    player1DeckId: string[] | string | null;
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
    deckSelectionData: { player1DeckId: string[] | string | null; player2DeckIds: string[]; selectedDecks: string[] } | null;
    randomizers: { id: string; name: string; image: string;  infoImage: string; }[];
    waitingForPlayer1: boolean;
  };
  connection: {
    playerId: number | null;
    isConnected: boolean;
    canInitializeDraw: boolean;
  };
}

export interface ServerGameState {
  gameId: string;
  players: string[];
  chatHistory: { playerId: number; message: string }[];
  state: {
    player1: PlayerState;
    player2: PlayerState;
    turn: number;
    activePlayer: string | null;
    phase: 'Standby' | 'Main' | 'Battle' | 'End';
    gameOver: boolean;
    winner: string | null;
  };
  deckChoices: {
    '1': string[]; // Tableau pour cohérence
    '2': string[];
  };
  availableDecks: { id: string; name: string; image: string }[];
  createdAt: Date;
  status: 'waiting' | 'started';
  playersReady: Set<number>;
}

export interface PlayerState {
  hand: Card[];
  deck: Card[];
  graveyard: Card[];
  field: (Card | null)[];
  opponentField: (Card | null)[];
  opponentHand: (Card | null)[];
  mustDiscard: boolean;
  hasPlayedCard: boolean;
  lifePoints: number;
  tokenCount: number;
  tokenType: 'assassin' | 'viking' | 'engine' | 'celestial' | 'dragon' | 'samurai' | 'wizard' | 'vampire' | null;
}

export interface PersistedServerGameState extends Omit<ServerGameState, 'playersReady'> {
  playersReady: number[];
}