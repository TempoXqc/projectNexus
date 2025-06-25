import { MongoClient } from 'mongodb';

const getMongoUri = (): string => {
  const user = process.env.VITE_SOCKET_URI_USER;
  const pass = process.env.VITE_SOCKET_URI_PASS;

  if (!user || !pass) {
    console.error('[ERROR] Les variables d\'environnement VITE_SOCKET_URI_USER et VITE_SOCKET_URI_PASS doivent être définies');
    throw new Error('Les variables d\'environnement VITE_SOCKET_URI_USER et VITE_SOCKET_URI_PASS doivent être définies');
  }

  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@clusterprojectnexus.siimev4.mongodb.net/?retryWrites=true&w=majority&appName=ClusterProjectNexus`;
};

export async function connectToMongoDB() {
  const client = new MongoClient(getMongoUri());
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