import { GameState } from './GameState';

export type PartialGameState = {
  player?: Partial<GameState['player']>;
  opponent?: Partial<GameState['opponent']>;
  game?: Partial<GameState['game']>;
  ui?: Partial<GameState['ui']>;
  chat?: Partial<GameState['chat']>;
  deckSelection?: Partial<GameState['deckSelection']>;
  connection?: Partial<GameState['connection']>;
};