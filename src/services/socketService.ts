import { io, Socket } from 'socket.io-client';
import { clientConfig } from '../config/clientConfig';

export class SocketService {
  private socket: Socket;
  private isConnecting: boolean = false;

  constructor() {
    console.log('[SocketService] Initialisation avec URL:', clientConfig.socketUrl);
    this.socket = io(clientConfig.socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: false,
      path: '/socket.io'
    });
  }

  connect() {
    if (this.isConnecting || this.socket.connected) {
      console.log('Connexion déjà en cours ou établie, ignoré', {
        isConnecting: this.isConnecting,
        connected: this.socket.connected,
        timestamp: new Date().toISOString()
      });
      return;
    }
    this.isConnecting = true;
    this.socket.connect();
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connecté à', clientConfig.socketUrl);
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