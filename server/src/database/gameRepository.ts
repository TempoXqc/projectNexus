// server/src/database/gameRepository.ts
import { Db } from 'mongodb';
import { ServerGameState } from '../../../types/GameStateTypes.js';

export class GameRepository {
  private db: Db;
  private get collection() {
    return this.db.collection<ServerGameState>('games');
  }

  constructor(db: Db) {
    this.db = db;
  }

  async findGameById(gameId: string): Promise<ServerGameState | null> {
    return await this.collection.findOne({ gameId });
  }

  async insertGame(game: ServerGameState) {
    await this.db.collection('games').insertOne(game);
    return game;
  }

  async updateGame(gameId: string, update: Partial<ServerGameState>) {
    await this.db.collection('games').updateOne({ gameId }, { $set: update });
    return this.findGameById(gameId);
  }

  async deleteGame(gameId: string) {
    await this.db.collection('games').deleteOne({ gameId });
  }

  async findActiveGames() {
    return this.db
      .collection('games')
      .find({ status: { $in: ['waiting', 'started'] } })
      .project({ gameId: 1, status: 1, createdAt: 1, players: 1, _id: 0 })
      .toArray() as Promise<ServerGameState[]>;
  }

  async cleanupInactiveGames() {
    await this.db.collection('games').deleteMany({
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) },
    });
  }
}