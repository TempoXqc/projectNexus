import { z } from 'zod';
import { CardSchema } from '../CardTypes.js';
import { ChatMessageSchema } from './Chat.js';

export const GameStartSchema = z.object({
  playerId: z.number().nullable(),
  gameId: z.string().min(1),
  chatHistory: z.array(ChatMessageSchema),
  availableDecks: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), image: z.string().min(1), infoImage: z.string().min(1) })),
});

// Add schema for createGame ACK
export const CreateGameAckSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.number().nullable(),
  chatHistory: z.array(ChatMessageSchema),
  availableDecks: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), image: z.string().min(1) })),
});

export const GameStateUpdateSchema = z.object({
  player1: z
    .object({
      field: z.array(CardSchema.nullable()).length(8),
      hand: z.array(CardSchema),
      opponentHand: z.array(z.unknown()).optional(),
      graveyard: z.array(CardSchema),
      mustDiscard: z.boolean(),
      hasPlayedCard: z.boolean(),
      deck: z.array(CardSchema),
      lifePoints: z.number().min(0).max(30).optional(),
      tokenCount: z.number().min(0).optional(),
      tokenType: z.enum(['assassin', 'engine', 'viking', 'celestial', 'dragon', 'samurai', 'wizard', 'vampire']).nullable().optional(),
    })
    .optional(),
  player2: z
    .object({
      field: z.array(CardSchema.nullable()).length(8),
      hand: z.array(CardSchema).optional(),
      opponentHand: z.array(z.unknown()).optional(),
      graveyard: z.array(CardSchema),
      mustDiscard: z.boolean(),
      hasPlayedCard: z.boolean(),
      deck: z.array(CardSchema),
      lifePoints: z.number().min(0).max(30).optional(),
      tokenCount: z.number().min(0).optional(),
      tokenType: z.enum(['assassin', 'engine', 'viking', 'celestial', 'dragon', 'samurai', 'wizard', 'vampire']).nullable().optional(),
    })
    .optional(),
  turn: z.number().min(1).optional(),
  phase: z.enum(['Standby', 'Main', 'Battle', 'End']).optional(),
  activePlayer: z.string().min(1).optional(),
  gameOver: z.boolean().optional(),
  winner: z.string().min(1).nullable().optional(),
});

export const EmitUpdateGameStateSchema = z.object({
  gameId: z.string().min(1),
  state: z.object({
    hand: z.array(CardSchema).optional(),
    deck: z.array(CardSchema).optional(),
    field: z.array(CardSchema.nullable()).length(8).optional(),
    graveyard: z.array(CardSchema).optional(),
    hasPlayedCard: z.boolean().optional(),
    mustDiscard: z.boolean().optional(),
    lifePoints: z.number().min(0).max(30).optional(),
    tokenCount: z.number().min(0).optional(),
    tokenType: z.enum(['assassin', 'engine', 'viking', 'celestial', 'dragon', 'samurai', 'wizard', 'vampire']).nullable().optional(),
  }),
});

export const GameOverSchema = z.object({
  winner: z.string().min(1).nullable(),
});