// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({ error: 'Erreur serveur' });
}