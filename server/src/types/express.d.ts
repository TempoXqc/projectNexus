import { ObjectId, Db } from 'mongodb';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      _id: ObjectId;
      username: string;
      password: string;
      createdAt: Date;
    };
    db: Db;
  }
}