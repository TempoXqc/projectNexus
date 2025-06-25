export class PlayerManager {
  private players: Record<string, { gameId: string; playerId: number | null }> = {};

  addPlayer(socketId: string, info: { gameId: string; playerId: number | null }) {
    this.players[socketId] = info;
  }

  getPlayer(socketId: string) {
    return this.players[socketId];
  }

  removePlayer(socketId: string) {
    delete this.players[socketId];
  }
}