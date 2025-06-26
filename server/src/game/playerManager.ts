export class PlayerManager {
  private players: Record<string, { gameId: string; playerId: number | null; lastCreateTime?: number }> = {};

  addPlayer(socketId: string, info: { gameId: string; playerId: number | null }) {
    this.players[socketId] = { ...info, lastCreateTime: this.players[socketId]?.lastCreateTime };
  }

  getPlayer(socketId: string) {
    return this.players[socketId];
  }

  removePlayer(socketId: string) {
    delete this.players[socketId];
  }

  setLastCreateTime(socketId: string, time: number) {
    const player = this.players[socketId] || { gameId: '', playerId: null };
    this.players[socketId] = { ...player, lastCreateTime: time };
  }

  getLastCreateTime(socketId: string): number | undefined {
    return this.players[socketId]?.lastCreateTime;
  }
}