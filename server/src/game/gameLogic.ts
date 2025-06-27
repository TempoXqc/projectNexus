import { Server } from 'socket.io';
import { GameRepository } from '../database/gameRepository.js';
import { CardManager } from './cardManager.js';

interface ActiveGameProjection {
  gameId: string;
  players: string[];
  createdAt: Date;
  status: 'waiting' | 'started';
  playersReady: number[];
}

export class GameLogic {
  private gameRepository: GameRepository;
  private cardManager: CardManager;

  constructor(gameRepository: GameRepository, cardManager: CardManager) {
    this.gameRepository = gameRepository;
    this.cardManager = cardManager;
  }

  async emitActiveGames(io: Server, lastUpdate: string | null, updateCallback: (newUpdate: string) => void) {
    const games = await this.gameRepository.findActiveGames();
    const activeGames = games.map((game) => ({
      gameId: game.gameId,
      players: game.players,
      createdAt: game.createdAt,
      status: game.status,
    }));
    const currentUpdate = JSON.stringify(activeGames);
    if (currentUpdate !== lastUpdate) {
      console.log('Émission de activeGamesUpdate:', activeGames);
      io.to('lobby').emit('activeGamesUpdate', activeGames);
      updateCallback(currentUpdate);
    } else {
      console.log('activeGamesUpdate inchangé, émission ignorée');
    }
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
}