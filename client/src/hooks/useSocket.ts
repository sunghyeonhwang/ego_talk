import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socketInstance) {
    const serverUrl = import.meta.env.VITE_API_URL || undefined;
    socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = getSocket(token);
    socketRef.current = socket;

    if (!socket.connected) socket.connect();

    return () => {
      // Keep connection alive across page navigations
    };
  }, [token]);

  return socketRef.current;
}
