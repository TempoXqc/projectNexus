// server/src/game/cardManager.ts
import { readFileSync } from 'fs';
import { Card } from '../../../types/CardTypes.js';

export class CardManager {
  private deckLists: any; // À typer si nécessaire
  private allCards: Card[];

  constructor() {
    this.deckLists = JSON.parse(readFileSync('server/public/deckLists.json', 'utf8'));
    this.allCards = JSON.parse(readFileSync('server/public/cards.json', 'utf8')).map(
      (card: Card) => ({ ...card, exhausted: false })
    );
  }

  getDeckLists() {
    return this.deckLists;
  }

  getAllCards() {
    return this.allCards;
  }

  getRandomDecks(count: number = 4) {
    const allDecks = [
      'assassin',
      'celestial',
      'dragon',
      'wizard',
      'vampire',
      'viking',
      'engine',
      'samurai',
    ];
    return [...allDecks].sort(() => 0.5 - Math.random()).slice(0, count);
  }
}