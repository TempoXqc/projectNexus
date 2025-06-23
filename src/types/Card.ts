import { z } from 'zod';

export interface Card {
  id: string;
  name: string;
  image: string;
  exhausted?: boolean;
}

export const CardSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  exhausted: z.boolean().optional(),
});