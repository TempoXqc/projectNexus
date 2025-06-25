// server/src/game/cardManager.ts
import fs from 'fs';

export class CardManager {
  private deckLists: any;
  private allCards: any[];

  constructor() {
    this.deckLists = JSON.parse(fs.readFileSync('public/deckLists.json', 'utf8'));
    this.allCards = JSON.parse(fs.readFileSync('public/cards.json', 'utf8')).map(
      (card) => ({ ...card, exhausted: false }),
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