// client/src/utils/shuffleDeck.ts
export const shuffleDeck = <T>(deck: T[]): T[] => [...deck].sort(() => Math.random() - 0.5);