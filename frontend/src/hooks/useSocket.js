import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const useSocket = (providedToken, providedRole) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Get token and role from params or localStorage
    const token = providedToken || localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let role = providedRole;
    
    if (!role && userStr) {
      try {
        const user = JSON.parse(userStr);
        role = user.role;
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }

    if (!token || !role) {
      console.warn('Socket connection requires token and role');
      return;
    }

    // Initialize Socket.IO connection
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    // Connection successful
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;

      // Subscribe to appropriate room based on role
      if (role === 'admin') {
        socketInstance.emit('subscribe:admin');
      } else if (role === 'co-admin') {
        socketInstance.emit('subscribe:co-admin');
      }
    });

    // Connection error
    socketInstance.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      setError(err.message);
      setConnected(false);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('Failed to connect after multiple attempts');
      }
    });

    // Disconnected
    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected, manual reconnection required
        socketInstance.connect();
      }
    });

    // Authentication error
    socketInstance.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setError(error.message || 'Socket error occurred');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.off('connect');
        socketInstance.off('connect_error');
        socketInstance.off('disconnect');
        socketInstance.off('error');
        socketInstance.close();
      }
    };
  }, [providedToken, providedRole]);

  return { socket, connected, error };
};

export default useSocket;
