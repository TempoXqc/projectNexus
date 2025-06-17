export interface Card {
  id: string;
  image: string;
}

export interface Player {
  id: string;
  hand: Card[];
}

export interface GameState {
  players: Record<string, Player>;
}
