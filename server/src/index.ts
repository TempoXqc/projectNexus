// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { serverConfig } from './config/serverConfig';
import { connectToMongoDB } from './database/db';
import { registerSocketHandlers } from './sockets/socketHandlers';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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
app.use(rateLimiter);
app.use(express.static('public'));
app.use('/api', apiRoutes);
app.use(errorHandler);

connectToMongoDB().then(() => {
  registerSocketHandlers(io);
  server.listen(serverConfig.port, () => {
    console.log(`Serveur démarré sur le port ${serverConfig.port}`);
  });
}).catch((error) => {
  console.error('Erreur au démarrage du serveur:', error);
  process.exit(1);
});