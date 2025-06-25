// server/src/game/gameLogic.ts
import { GameRepository } from '../database/gameRepository';
import { CardManager } from './cardManager';

export class GameLogic {
  private gameRepository: GameRepository;
  private cardManager: CardManager;

  constructor(gameRepository: GameRepository, cardManager: CardManager) {
    this.gameRepository = gameRepository;
    this.cardManager = cardManager;
  }

  async drawCardServer(gameId: string, playerKey: 'player1' | 'player2') {
    const game = await this.gameRepository.findGameById(gameId);
    if (!game || game.state[playerKey].deck.length === 0) return null;

    const [drawnCard] = game.state[playerKey].deck.splice(0, 1);
    game.state[playerKey].hand.push(drawnCard);

    await this.gameRepository.updateGame(gameId, { state: game.state });
    return drawnCard;
  }

  async checkWinCondition(gameId: string): Promise<{ winner: string } | null> {
    const game = await this.gameRepository.findGameById(gameId);
    if (!game) return null;

    const player1Life = game.state.player1.lifePoints;
    const player2Life = game.state.player2.lifePoints;

    if (player1Life <= 0 || player2Life <= 0) {
      const winner = player1Life <= 0 ? 'player2' : 'player1';
      game.state.gameOver = true;
      game.state.winner = winner;
      await this.gameRepository.updateGame(gameId, { state: game.state });
      return { winner };
    }
    return null;
  }

  async emitActiveGames(io: any) {
    const activeGames = await this.gameRepository.findActiveGames();
    io.emit('activeGamesUpdate', activeGames);
  }
}