// client/src/config/clientConfig.ts
export const clientConfig = {
  socketUrl: import.meta?.env.VITE_SOCKET_URL || 'http://localhost:3000',
  apiUrl: import.meta?.env.VITE_API_URL || 'http://localhost:3000',
};