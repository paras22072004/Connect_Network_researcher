import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (user && token) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

      // Connect socket to backend server with auth token
      const newSocket = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('[Socket Context] Connected to real-time socket server');
      });

      newSocket.on('get_online_users', (users) => {
        setOnlineUsers(users);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user, token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        isUserOnline: (userId) => onlineUsers.includes(userId)
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
