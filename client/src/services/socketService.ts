// client/src/services/SocketService.ts
import { io, Socket } from 'socket.io-client';
import { clientConfig } from '../../../config/clientConfig';

export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(clientConfig.socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }

  connect() {
    if (!this.socket.connected) {
      console.log('Socket.IO connecting to:', clientConfig.socketUrl);
      this.socket.connect();
    }
  }

  disconnect() {
    this.socket.disconnect();
  }

  getSocket(): Socket {
    return this.socket;
  }
}

export const socketService = new SocketService();