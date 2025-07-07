import { io, Socket } from 'socket.io-client';
import { clientConfig } from '../config/clientConfig';

export class SocketService {
  private socket: Socket;
  private isConnecting: boolean = false;

  constructor() {
    this.socket = io(clientConfig.socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: false,
      path: '/socket.io'
    });
  }

  connect() {
    if (this.isConnecting || this.socket.connected) {
      return;
    }
    this.isConnecting = true;
    this.socket.connect();
    this.socket.on('connect', () => {
      this.isConnecting = false;
    });
    this.socket.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error, 'URL:', clientConfig.socketUrl, 'timestamp:', new Date().toISOString());
      this.isConnecting = false;
    });
  }

  disconnect() {
    this.socket.disconnect();
    this.isConnecting = false;
  }

  getSocket(): Socket {
    return this.socket;
  }
}

export const socketService = new SocketService();