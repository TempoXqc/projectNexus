// server/src/index.ts
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { serverConfig } from './config/serverConfig.js';
import { connectToMongoDB } from './database/db.js';
import { registerSocketHandlers } from './sockets/socketHandlers.js';
import initializeRoutes from './routes/apiRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';
import cors from 'cors';
import { Db, MongoClient } from 'mongodb';
import { GameRepository } from './database/gameRepository.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: `${__dirname}/../../.env` });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: serverConfig.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.use(cors());
// @ts-ignore
app.use(rateLimiter);
app.use(express.static('public'));
app.use(errorHandler);
app.use('/addons', express.static('addons'));

let dbInstance: Db | undefined;

connectToMongoDB()
  .then(({ db }: { client: MongoClient; db: Db }) => {
    dbInstance = db;
    const apiRouter = initializeRoutes(db);
    app.use('/api', apiRouter);

    if (dbInstance) {
      registerSocketHandlers(io, dbInstance);
    } else {
      throw new Error('Instance de base de données non disponible');
    }
    server.listen(serverConfig.port, () => {
      console.log(`Serveur démarré sur le port ${serverConfig.port}`);
    });

    if (dbInstance) {
      registerSocketHandlers(io, dbInstance);
      const gameRepository = new GameRepository(dbInstance);
      setInterval(async () => {
        try {
          await gameRepository.cleanupInactiveGames();
        } catch (error) {
          console.error('Erreur lors du nettoyage des jeux inactifs :', error);
        }
      }, 60 * 60 * 1000);
    } else {
      throw new Error('Instance de base de données non disponible');
    }
  })
  .catch((error: unknown) => {
    console.error('Erreur au démarrage du serveur:', error);
    process.exit(1);
  });