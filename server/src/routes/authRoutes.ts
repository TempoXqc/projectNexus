import { Router, Request, Response, NextFunction } from 'express';
import { Db, ObjectId, InsertOneResult } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

// Interface pour les documents utilisateur dans MongoDB (après insertion)
interface User {
  _id: ObjectId;
  username: string;
  password: string;
  createdAt: Date;
}

// Interface pour l'insertion d'un nouvel utilisateur (sans _id)
interface UserInsert {
  username: string;
  password: string;
  createdAt: Date;
}

const RegisterSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

// Middleware pour valider le token JWT
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }
    const user = await db.collection<User>('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });

    // Valider que l'utilisateur a les propriétés attendues
    if (!user.username || !user.password || !user.createdAt) {
      return res.status(500).json({ error: 'Données utilisateur invalides' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    res.status(403).json({ error: 'Token invalide' });
  }
};

export const setupAuthRoutes = (db: Db): Router => {
  // Inscription
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password } = RegisterSchema.parse(req.body);
      const usersCollection = db.collection<UserInsert>('users');
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Nom d\'utilisateur déjà pris' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userInsert: UserInsert = {
        username,
        password: hashedPassword,
        createdAt: new Date(),
      };
      const result: InsertOneResult<User> = await usersCollection.insertOne(userInsert);

      const token = jwt.sign({ userId: result.insertedId.toString() }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
      });
      console.log(`[POST /api/register] Nouveau utilisateur inscrit: ${username} timestamp: ${new Date().toISOString()}`);
      res.status(201).json({ token, username });
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Connexion
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = LoginSchema.parse(req.body);
      const usersCollection = db.collection<User>('users');
      const user = await usersCollection.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
      }

      const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
      });
      console.log(`[POST /api/login] Utilisateur connecté: ${username} timestamp: ${new Date().toISOString()}`);
      res.json({ token, username });
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Vérification du token
  router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
    console.log(`[GET /api/verify] Token vérifié pour utilisateur: ${req.user!.username} timestamp: ${new Date().toISOString()}`);
    res.json({ username: req.user!.username });
  });

  return router;
};