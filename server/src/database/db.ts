// server/src/database/db.ts
import { MongoClient } from 'mongodb';
import { serverConfig } from '../config/serverConfig.js';

export async function connectToMongoDB() {
  console.log('[DEBUG] Mongo URI utilisée :', serverConfig.mongodbUri);

  const client = new MongoClient(serverConfig.mongodbUri);
  try {
    await client.connect();
    console.log('Connecté à MongoDB');
    const db = client.db('projectNexus');
    await db.collection('games').createIndex({ gameId: 1 });
    return { client, db };
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    throw error;
  }
}