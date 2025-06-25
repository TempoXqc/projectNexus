import { z } from 'zod';
import { CardSchema } from '../../../types/CardTypes.js';

export const PlayCardSchema = z.object({
  gameId: z.string(),
  card: CardSchema,
  fieldIndex: z.number().min(0).max(7),
});

export const JoinGameSchema = z.string().min(1);