import { Db } from 'mongodb';
import { ServerGameState, PersistedServerGameState } from '../../../types/GameStateTypes.js';

// Interface pour la projection utilisée dans findActiveGames
interface ActiveGameProjection {
  gameId: string;
  players: string[];
  createdAt: Date;
  status: 'waiting' | 'started';
  playersReady: number[];
}

export class GameRepository {
  private db: Db;
  private get collection() {
    return this.db.collection<PersistedServerGameState>('games');
  }

  constructor(db: Db) {
    this.db = db;
  }

  async findGameById(gameId: string): Promise<ServerGameState | null> {
    const game = await this.collection.findOne({ gameId });
    if (!game) return null;
    return {
      ...game,
      playersReady: new Set(game.playersReady), // Convertir tableau en Set
    };
  }

  async insertGame(game: ServerGameState) {
    const persistedGame: PersistedServerGameState = {
      ...game,
      playersReady: Array.from(game.playersReady), // Convertir Set en tableau
    };
    await this.collection.insertOne(persistedGame);
    return game;
  }

  async updateGame(gameId: string, update: Partial<PersistedServerGameState>) {
    const persistedUpdate: Partial<PersistedServerGameState> = {
      ...update,
      ...(update.playersReady && { playersReady: Array.from(update.playersReady) }), // Convertir Set en tableau si présent
    };
    const result = await this.collection.updateOne({ gameId }, { $set: persistedUpdate });
    if (result.matchedCount === 0) {
      throw new Error('Partie non trouvée');
    }
    return this.findGameById(gameId);
  }

  async deleteGame(gameId: string) {
    await this.collection.deleteOne({ gameId });
  }

  async findActiveGames(): Promise<ActiveGameProjection[]> {
    const games = await this.collection
      .find({ status: { $in: ['waiting', 'started'] } })
      .project<ActiveGameProjection>({ gameId: 1, status: 1, createdAt: 1, players: 1, playersReady: 1, _id: 0 })
      .toArray();
    return games;
  }

  async cleanupInactiveGames() {
    await this.collection.deleteMany({
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) },
    });
  }
}