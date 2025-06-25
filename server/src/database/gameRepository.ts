// server/src/database/gameRepository.ts
import { Db } from 'mongodb';

export class GameRepository {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async findGameById(gameId: string) {
    return this.db.collection('games').findOne({ gameId });
  }

  async insertGame(game: any) {
    await this.db.collection('games').insertOne(game);
    return game;
  }

  async updateGame(gameId: string, update: Partial<GameState>) {
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
      .toArray();
  }

  async cleanupInactiveGames() {
    await this.db.collection('games').deleteMany({
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) },
    });
  }
}