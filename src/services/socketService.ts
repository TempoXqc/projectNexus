import { io, Socket } from 'socket.io-client';

export class SocketService {
  private socket: Socket;
  private isConnecting: boolean = false;

  constructor() {
    this.socket = io('http://localhost:3000', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: false,
    });
  }

  connect() {
    if (this.isConnecting || this.socket.connected) {
      console.log('Connexion déjà en cours ou établie, ignoré', {
        isConnecting: this.isConnecting,
        connected: this.socket.connected,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    this.isConnecting = true;
    this.socket.connect();
    this.socket.on('connect', () => {
      this.isConnecting = false;
    });
    this.socket.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error, 'timestamp:', new Date().toISOString());
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