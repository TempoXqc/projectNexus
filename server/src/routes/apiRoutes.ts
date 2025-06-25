// server/src/routes/apiRoutes.ts
import { Router, Request, Response } from 'express';
import { GameRepository } from '../database/gameRepository.js';
import { z } from 'zod';
import { Db } from 'mongodb';

const ActiveGameSchema = z.object({
  gameId: z.string(),
  status: z.enum(['waiting', 'started']),
  createdAt: z.date(),
  players: z.array(z.string()),
});

export function initializeRoutes(db: Db) {
  const gameRepository = new GameRepository(db);
  const router = Router();

  router.get('/games', async (_req: Request, res: Response) => {
    try {
      const activeGames = await gameRepository.findActiveGames();
      const validatedGames = z.array(ActiveGameSchema).parse(activeGames);
      res.status(200).json(validatedGames);
    } catch (error: unknown) {
      console.error('Erreur lors de la récupération des parties:', error);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des parties' });
    }
  });

  return router;
}

export default initializeRoutes;