import { Db } from 'mongodb';
import { Card } from '../../../types/CardTypes.js';

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
    console.log('Decks chargés depuis MongoDB, decks disponibles:', Object.keys(this.deckLists), 'timestamp:', new Date().toISOString());
    console.log('Contenu de deckLists:', JSON.stringify(this.deckLists, null, 2), 'timestamp:', new Date().toISOString());
    console.log('Cartes chargées, nombre de cartes:', this.allCards.length, 'timestamp:', new Date().toISOString());
  }

  private async loadData() {
    console.log('Chargement des données depuis MongoDB Atlas', 'timestamp:', new Date().toISOString());

    try {
      const deckListsCollection = this.db.collection('decklists');
      const deckListsDocs = await deckListsCollection.find({}).toArray();
      console.log('Résultat de deckListsCollection.find():', deckListsDocs, 'timestamp:', new Date().toISOString());
      if (deckListsDocs.length === 0) {
        console.error('Aucun deck trouvé dans la collection decklists', 'timestamp:', new Date().toISOString());
      }
      this.deckLists = deckListsDocs.reduce((acc, doc) => {
        acc[doc._id.toString()] = doc.cardIds;
        return acc;
      }, {} as { [key: string]: string[] });
      console.log('decklists chargé avec succès, decks disponibles:', Object.keys(this.deckLists), 'timestamp:', new Date().toISOString());
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
      console.log('cards chargé avec succès, nombre de cartes:', this.allCards.length, 'timestamp:', new Date().toISOString());
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

  async getRandomDecks(count: number = 4): Promise<{ id: string; name: string; image: string }[]> {
    try {
      const deckListsCollection = this.db.collection('decklists');
      const deckListsDocs = await deckListsCollection.find({}).toArray();
      console.log('Résultat de deckListsCollection.find():', deckListsDocs, 'timestamp:', new Date().toISOString());
      if (deckListsDocs.length === 0) {
        console.error('Aucun deck trouvé dans la collection decklists', 'timestamp:', new Date().toISOString());
        return [];
      }
      const deckData = deckListsDocs.map((deck: any) => ({
        id: deck._id.toString(), // Utiliser _id au lieu de id
        name: deck.name,
        image: deck.image || `https://res.cloudinary.com/dsqxexeam/image/upload/v1750992816/${deck.name}_default.png`,
      }));
      console.log('Decks récupérés pour getRandomDecks:', deckData, 'timestamp:', new Date().toISOString());
      const shuffled = deckData.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    } catch (error) {
      console.error('Erreur lors du chargement de decklists pour getRandomDecks:', error, 'timestamp:', new Date().toISOString());
      return [];
    }
  }
}