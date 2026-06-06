import { socket } from './socket';
import { bindSocketEvents, unbindSocketEvents } from './socket-events';

class SocketManagerClass {
  private isConnected = false;

  public connect(token: string) {
    // If already connected with a live socket, skip
    if (this.isConnected && socket.connected) return;
    
    // BUG 5 FIX: Always clean up old lifecycle listeners before adding new ones.
    // Without this, every reconnection attempt adds duplicate listeners which causes
    // memory leaks and duplicate notification/toast handling.
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');

    // Set authentication token
    socket.auth = { token };
    
    // Bind all application-level events before connecting
    bindSocketEvents();
    
    socket.connect();
    
    socket.on('connect', () => {
      console.log('Socket connected gracefully');
      this.isConnected = true;
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected, gracefully degrading');
      this.isConnected = false;
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      this.isConnected = false;
    });
  }

  public disconnect() {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    unbindSocketEvents();
    socket.disconnect();
    this.isConnected = false;
  }
}

export const SocketManager = new SocketManagerClass();
