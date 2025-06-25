// types/SocketSchemas/Deck.ts
import { z } from 'zod';
export const DeckSelectionUpdateSchema = z.object({
    1: z.string().min(1).nullable(),
    2: z.array(z.string().min(1)),
});
export const DeckSelectionDoneSchema = z.object({
    player1DeckId: z.string().min(1),
    player2DeckIds: z.array(z.string().min(1)),
    selectedDecks: z.array(z.string().min(1)),
});
export const EmitChooseDeckSchema = z.object({
    gameId: z.string().min(1),
    playerId: z.number().min(1).nullable(),
    deckId: z.string().min(1),
});
export const WaitingForPlayer1ChoiceSchema = z.object({});
export const Player1ChoseDeckSchema = z.object({});
