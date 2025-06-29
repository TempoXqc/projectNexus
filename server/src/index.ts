import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import { registerSocketHandlers } from './sockets/socketHandlers.js';
import { setupAuthRoutes } from './routes/authRoutes.js';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le fichier .env depuis server/src/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://projectnexus-nynw.onrender.com',
      'https://projectnexus-staging.up.railway.app',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/addons', express.static('addons'));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Erreur : MONGODB_URI non défini dans le fichier .env');
  process.exit(1);
}
console.log('[DEBUG] Mongo URI utilisée :', uri.replace(/:([^@]+)@/, ':****@'));
const client = new MongoClient(uri);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connecté à MongoDB');
    const db = client.db('projectNexus');
    await db.collection('games').createIndex({ gameId: 1 });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    return db;
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}

async function startServer() {
  const db = await connectToMongoDB();

  // Middleware pour passer db aux routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.db = db;
    next();
  });

  // Configurer les routes d'authentification
  app.use('/api', setupAuthRoutes(db));

  // Configurer les gestionnaires de sockets
  registerSocketHandlers(io, db);

  // Endpoint pour les parties actives
  app.get('/api/games', async (req: Request, res: Response) => {
    try {
      const gamesCollection = db.collection('games');
      const activeGames = await gamesCollection
        .find({
          status: { $in: ['waiting', 'started'] },
        })
        .project({
          gameId: 1,
          status: 1,
          createdAt: 1,
          players: 1,
          _id: 0,
        })
        .toArray();
      res.json(activeGames);
    } catch (error) {
      console.error('Erreur lors de la récupération des parties:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });

  // Nettoyage des parties inactives (toutes les heures)
  setInterval(async () => {
    const gamesCollection = db.collection('games');
    await gamesCollection.deleteMany({
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    console.log('Parties inactives supprimées');
    const activeGames = await gamesCollection
      .find({
        status: { $in: ['waiting', 'started'] },
      })
      .project({
        gameId: 1,
        status: 1,
        createdAt: 1,
        players: 1,
        _id: 0,
      })
      .toArray();
    io.emit('activeGamesUpdate', activeGames);
  }, 60 * 60 * 1000);
}

startServer();