import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

(window as any).socket = socket;