import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance = null;

export function getSocket() {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not authenticated');

  if (socketInstance && socketInstance.connected) return socketInstance;

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000', {
    auth: { token: `Bearer ${token}` },
    reconnection: true,
    reconnectionDelay: 2000,
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[socket] connect error:', err.message);
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
