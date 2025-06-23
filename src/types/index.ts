import { Card } from '@/types/Card.ts';

export interface Player {
  id: string;
  hand: Card[];
}

export interface GameState {
  players: Record<string, Player>;
}
