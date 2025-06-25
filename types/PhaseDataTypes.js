// types/PhaseDataTypes.ts
import { z } from 'zod';
export const PhaseDataSchema = z.object({
    phase: z.enum(['Standby', 'Main', 'Battle', 'End']),
    turn: z.number().min(1),
    nextPlayerId: z.number().optional(),
});
