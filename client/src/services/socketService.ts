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
    console.log('Nouveau socket créé, ID:', this.socket.id, 'timestamp:', new Date().toISOString());
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
    console.log('Socket.IO connecting to: http://localhost:3000', 'timestamp:', new Date().toISOString());
    this.socket.connect();
    this.socket.on('connect', () => {
      console.log('Socket connecté dans socketService, ID:', this.socket.id, 'timestamp:', new Date().toISOString());
      this.isConnecting = false;
    });
    this.socket.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error, 'timestamp:', new Date().toISOString());
      this.isConnecting = false;
    });
  }

  disconnect() {
    this.socket.disconnect();
    console.log('Socket déconnecté, ID:', this.socket.id, 'timestamp:', new Date().toISOString());
    this.isConnecting = false;
  }

  getSocket(): Socket {
    console.log('getSocket appelé, socket ID:', this.socket.id, 'connected:', this.socket.connected, 'timestamp:', new Date().toISOString());
    return this.socket;
  }
}

export const socketService = new SocketService();