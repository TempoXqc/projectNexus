// types/SocketSchemas/Phase.ts
import { z } from 'zod';

export const EmitUpdatePhaseSchema = z.object({
  gameId: z.string().min(1),
  phase: z.enum(['Standby', 'Main', 'Battle', 'End']),
  turn: z.number().min(1),
});