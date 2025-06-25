// config/serverConfig.ts
export const serverConfig = {
  port: process.env.PORT || 3000,
  corsOrigins: [
    'http://localhost:5176',
    'https://projectnexus-nynw.onrender.com',
    'https://projectnexus-staging.up.railway.app',
  ],
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/projectNexus',
};