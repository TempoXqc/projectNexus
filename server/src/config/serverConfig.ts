// server/src/config/serverConfig.ts
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

export const serverConfig = {
  port: Number(process.env.PORT) || 3000,
  corsOrigins: [
    'https://projectnexus-nynw.onrender.com',
    'https://projectnexus-staging.up.railway.app',
  ],
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/projectNexus',
};
