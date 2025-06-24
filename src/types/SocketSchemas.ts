import { z } from 'zod';
import { CardSchema } from './Card';

// Schéma pour les messages de chat
export const ChatMessageSchema = z.object({
  playerId: z.number(),
  message: z.string().min(1),
});

// Schéma pour gameStart
export const GameStartSchema = z.object({
  playerId: z.number(),
  chatHistory: z.array(ChatMessageSchema),
});

// Schéma pour deckSelectionUpdate
export const DeckSelectionUpdateSchema = z.object({
  1: z.string().nullable(),
  2: z.array(z.string()),
});

// Schéma pour deckSelectionDone
export const DeckSelectionDoneSchema = z.object({
  player1DeckId: z.string(),
  player2DeckIds: z.array(z.string()),
  selectedDecks: z.array(z.string()),
});

// Schéma pour playerReady
export const PlayerReadySchema = z.object({
  playerId: z.number(),
});

// Schéma pour updatePhase
export const PhaseDataSchema = z.object({
  phase: z.enum(['Standby', 'Main', 'Battle', 'End']),
  turn: z.number(),
  nextPlayerId: z.number().optional(),
});

// Schéma pour initialDeckList
export const InitialDeckListSchema = z.array(z.string());

// Schéma pour waitingForPlayer1Choice
export const WaitingForPlayer1ChoiceSchema = z.object({});

// Schéma pour player1ChoseDeck
export const Player1ChoseDeckSchema = z.object({});

// Schéma pour updateGameState
export const GameStateUpdateSchema = z.object({
  player1: z
    .object({
      field: z.array(CardSchema.nullable()),
      hand: z.array(CardSchema),
      opponentHand: z.array(z.unknown()).optional(),
      graveyard: z.array(CardSchema),
      mustDiscard: z.boolean(),
      hasPlayedCard: z.boolean(),
      deck: z.array(CardSchema),
      lifePoints: z.number().optional(),
    })
    .optional(),
  player2: z
    .object({
      field: z.array(CardSchema.nullable()),
      hand: z.array(CardSchema).optional(),
      opponentHand: z.array(z.unknown()).optional(),
      graveyard: z.array(CardSchema),
      mustDiscard: z.boolean(),
      hasPlayedCard: z.boolean(),
      deck: z.array(CardSchema),
      lifePoints: z.number().optional(),
    })
    .optional(),
  turn: z.number().optional(),
  phase: z.enum(['Standby', 'Main', 'Battle', 'End']).optional(),
  activePlayer: z.string().optional(),
  gameOver: z.boolean().optional(),
  winner: z.string().nullable().optional(),
});

// Schéma pour les payloads émis
export const EmitSendMessageSchema = z.object({
  gameId: z.string(),
  message: z.string().min(1),
});

export const EmitChooseDeckSchema = z.object({
  gameId: z.string(),
  playerId: z.number().nullable(),
  deckId: z.string(),
});

export const EmitPlayerReadySchema = z.object({
  gameId: z.string(),
  playerId: z.number().nullable(),
});

export const EmitUpdateGameStateSchema = z.object({
  gameId: z.string(),
  state: z.object({
    hand: z.array(CardSchema).optional(),
    deck: z.array(CardSchema).optional(),
    field: z.array(CardSchema.nullable()).optional(),
    graveyard: z.array(CardSchema).optional(),
    hasPlayedCard: z.boolean().optional(),
    mustDiscard: z.boolean().optional(),
    lifePoints: z.number().optional(),
  }),
});

export const EmitExhaustCardSchema = z.object({
  gameId: z.string(),
  cardId: z.string(),
  fieldIndex: z.number(),
});

export const EmitAttackCardSchema = z.object({
  gameId: z.string(),
  cardId: z.string(),
});

export const EmitEndTurnSchema = z.object({
  gameId: z.string(),
  nextPlayerId: z.number(),
});

export const EmitUpdatePhaseSchema = z.object({
  gameId: z.string(),
  phase: z.enum(['Standby', 'Main', 'Battle', 'End']),
  turn: z.number(),
});

export const EmitJoinGameSchema = z.string();

export const EmitUpdateLifePointsSchema = z.object({
  gameId: z.string(),
  lifePoints: z.number().min(0).max(30),
});