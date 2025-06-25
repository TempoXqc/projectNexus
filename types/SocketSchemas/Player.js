// types/SocketSchemas/Player.ts
import { z } from 'zod';
export const PlayerReadySchema = z.object({
    playerId: z.number().min(1),
});
export const EmitPlayerReadySchema = z.object({
    gameId: z.string().min(1),
    playerId: z.number().min(1).nullable(),
});
