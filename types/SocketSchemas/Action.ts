// types/SocketSchemas/Action.ts
import { z } from 'zod';
import { CardSchema } from '../CardTypes';

export const EmitJoinGameSchema = z.string().min(1);

export const EmitEndTurnSchema = z.object({
  gameId: z.string().min(1),
  nextPlayerId: z.number().min(1),
});

export const EmitExhaustCardSchema = z.object({
  gameId: z.string().min(1),
  cardId: z.string().min(1),
  fieldIndex: z.number().min(0).max(7),
});

export const EmitAttackCardSchema = z.object({
  gameId: z.string().min(1),
  cardId: z.string().min(1),
});

export const EmitUpdateLifePointsSchema = z.object({
  gameId: z.string().min(1),
  lifePoints: z.number().min(0).max(30),
});

export const EmitUpdateTokenCountSchema = z.object({
  gameId: z.string().min(1),
  tokenCount: z.number().min(0),
});

export const EmitAddAssassinTokenToOpponentDeckSchema = z.object({
  gameId: z.string().min(1),
  tokenCount: z.number().min(0).max(8),
  tokenCard: CardSchema,
});

export const EmitPlaceAssassinTokenAtOpponentDeckBottomSchema = z.object({
  gameId: z.string().min(1),
  tokenCard: CardSchema,
});

export const EmitHandleAssassinTokenDrawSchema = z.object({
  gameId: z.string().min(1),
  playerLifePoints: z.number().min(0).max(30),
  opponentTokenCount: z.number().min(0).max(8),
});