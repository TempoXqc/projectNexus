// server/src/routes/apiRoutes.ts
import { Router, Request, Response } from 'express';
import { GameRepository } from '../database/gameRepository';
import { z } from 'zod';

// Schéma Zod pour valider les réponses de l'API
const ActiveGameSchema = z.object({
  gameId: z.string(),
  status: z.enum(['waiting', 'started']),
  createdAt: z.date(),
  players: z.array(z.string()),
});

const router = Router();

let gameRepository: GameRepository;

export function initializeRoutes(db: any) {
  gameRepository = new GameRepository(db);
  return router;
}

router.get('/games', async (_req: Request, res: Response) => {
  try {
    const activeGames = await gameRepository.findActiveGames();

    const validatedGames = z.array(ActiveGameSchema).parse(activeGames);

    res.status(200).json(validatedGames);
  } catch (error) {
    console.error('Erreur lors de la récupération des parties:', error);
    res
      .status(500)
      .json({ error: 'Erreur serveur lors de la récupération des parties' });
  }
});

export default router;