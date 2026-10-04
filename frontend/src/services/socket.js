import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.activeRooms = new Set();
    this.isConnecting = false;
  }

  getSocketUrl() {
    let socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.replace(/\/api$/, '');
    }
    return socketUrl;
  }

  getToken() {
    return localStorage.getItem('scenecraft_access_token') || '';
  }

  getSocket() {
    const token = this.getToken();
    if (!token) {
      if (this.socket) {
        this.disconnect();
      }
      return null;
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      this.init(token);
    } else if (this.socket.disconnected && !this.isConnecting) {
      this.socket.auth = { token: `Bearer ${token}` };
      this.socket.connect();
    }

    return this.socket;
  }

  init(token) {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    const socketUrl = this.getSocketUrl();
    this.isConnecting = true;

    this.socket = io(socketUrl, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      // Re-join all active rooms after connection or reconnection
      this.activeRooms.forEach((room) => {
        this.emitJoin(room);
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
    });
  }

  emitJoin(room, callback) {
    if (!this.socket) return;
    if (room.startsWith('document:')) {
      const docId = room.slice('document:'.length);
      this.socket.emit('document:join', docId, callback);
    } else if (room.startsWith('conversation:')) {
      const convoId = room.slice('conversation:'.length);
      this.socket.emit('conversation:join', convoId, callback);
    } else {
      this.socket.emit('room:join', room, callback);
    }
  }

  emitLeave(room) {
    if (!this.socket) return;
    if (room.startsWith('document:')) {
      const docId = room.slice('document:'.length);
      this.socket.emit('document:leave', docId);
    } else if (room.startsWith('conversation:')) {
      const convoId = room.slice('conversation:'.length);
      this.socket.emit('conversation:leave', convoId);
    }
  }

  joinRoom(room, callback) {
    if (!room) return;
    this.activeRooms.add(room);
    const socket = this.getSocket();
    if (socket && socket.connected) {
      this.emitJoin(room, callback);
    }
  }

  leaveRoom(room) {
    if (!room) return;
    this.activeRooms.delete(room);
    this.emitLeave(room);
  }

  on(event, handler) {
    const socket = this.getSocket();
    if (socket) {
      socket.on(event, handler);
    }
  }

  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  emit(event, data, callback) {
    const socket = this.getSocket();
    if (socket) {
      socket.emit(event, data, callback);
    } else if (typeof callback === 'function') {
      callback(new Error('Socket not connected'));
    }
  }

  reconnect() {
    const token = this.getToken();
    if (token) {
      this.init(token);
    } else {
      this.disconnect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeRooms.clear();
    this.isConnecting = false;
  }
}

export const socketClient = new SocketClient();
export default socketClient;
