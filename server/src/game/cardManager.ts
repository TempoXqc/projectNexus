import { Db } from 'mongodb';
import { Card } from '../../../types/CardTypes'

interface DeckDocument {
  id: string;
  name: string;
  cardIds: string[];
  image?: string;
  infoImage?: string;
}

export class CardManager {
  private deckLists: { [key: string]: string[] };
  private allCards: Card[];
  private db: Db;

  constructor(db: Db) {
    this.db = db;
    this.deckLists = {};
    this.allCards = [];
  }

  // async initialize() {
  //   await this.loadData();
  // }

  async initialize() {
    await this.loadData();
  }


  private async loadData() {
    try {
      const deckListsCollection = this.db.collection('decklists');
      const deckListsDocs = await deckListsCollection.find({}).toArray();
      if (deckListsDocs.length === 0) {
        console.error('Aucun deck trouvé dans la collection decklists', 'timestamp:', new Date().toISOString());
      }
      this.deckLists = deckListsDocs.reduce((acc, doc) => {
        acc[doc.id.toString()] = doc.cardIds;
        return acc;
      }, {} as { [key: string]: string[] });
    } catch (error) {
      console.error('Erreur lors du chargement de decklists depuis MongoDB Atlas:', error, 'timestamp:', new Date().toISOString());
      throw new Error(`Erreur lors du chargement de decklists: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    try {
      const cardsCollection = this.db.collection('card');
      this.allCards = (await cardsCollection.find({}).toArray()).map((card: any) => ({
        id: card.id,
        name: card.name,
        image: card.image,
        exhausted: false,
      }));
    } catch (error) {
      console.error('Erreur lors du chargement de cards depuis MongoDB Atlas:', error, 'timestamp:', new Date().toISOString());
      throw new Error(`Erreur lors du chargement de cards: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  getDeckLists() {
    return this.deckLists;
  }

  getAllCards() {
    return this.allCards;
  }

  async getRandomDecks(count: number = 4): Promise<{ id: string; name: string; image: string; infoImage: string }[]> {
    try {
      const deckListsCollection = this.db.collection('decklists');
      const deckListsDocs = await deckListsCollection.find<DeckDocument>({}).toArray();
      console.log('[DEBUG] Documents bruts de decklists:', JSON.stringify(deckListsDocs, null, 2));
      if (deckListsDocs.length === 0) {
        console.error('Aucun deck trouvé dans la collection decklists', 'timestamp:', new Date().toISOString());
        return [];
      }
      const deckData = deckListsDocs.map((deck) => {
        const mappedDeck = {
          id: deck.id.toString(),
          name: deck.name,
          image: deck.image || `https://res.cloudinary.com/dsqxexeam/image/upload/v1750992816/${deck.name}_default.png`,
          infoImage: deck.infoImage || `https://res.cloudinary.com/dsqxexeam/image/upload/v1750992816/${deck.name}_default.png`,
        };
        console.log('[DEBUG] Deck mappé:', JSON.stringify(mappedDeck, null, 2));
        return mappedDeck;
      });
      const shuffled = deckData.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    } catch (error) {
      console.error('Erreur lors du chargement de decklists pour getRandomDecks:', error, 'timestamp:', new Date().toISOString());
      return [];
    }
  }
}