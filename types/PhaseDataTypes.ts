// types/PhaseDataTypes.ts
import { z } from 'zod';

export interface PhaseData {
  phase: 'Standby' | 'Main' | 'Battle' | 'End';
  turn: number;
  nextPlayerId?: number;
}

export const PhaseDataSchema = z.object({
  phase: z.enum(['Standby', 'Main', 'Battle', 'End']),
  turn: z.number().min(1),
  nextPlayerId: z.number().optional(),
});