// types/SocketSchemas/Chat.ts
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  playerId: z.number().min(1),
  message: z.string().min(1, 'Le message ne peut pas être vide.'),
});

export const EmitSendMessageSchema = z.object({
  gameId: z.string().min(1, 'L’ID de la partie ne peut pas être vide.'),
  message: z.string().min(1, 'Le message ne peut pas être vide.'),
});