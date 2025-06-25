// server/src/cache/gameCache.ts
export class GameCache {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
  }

  getGame(gameId: string) {
    return this.cache.get(gameId);
  }

  setGame(gameId: string, game: any) {
    this.cache.set(gameId, game);
  }

  deleteGame(gameId: string) {
    this.cache.delete(gameId);
  }
}