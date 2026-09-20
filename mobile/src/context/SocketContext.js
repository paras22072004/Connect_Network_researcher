import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // senderId -> boolean

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Extract socket server URL (stripping '/api')
    const socketServerUrl = API_URL.replace(/\/api\/?$/, '');

    const newSocket = io(socketServerUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true
    });

    newSocket.on('connect', () => {
      console.log('[Mobile Socket.io Connected]:', newSocket.id);
    });

    newSocket.on('get_online_users', (usersList) => {
      setOnlineUsers(usersList);
    });

    newSocket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message_sent', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('user_typing', ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    });

    newSocket.on('user_stop_typing', ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const sendMessage = (receiverId, content) => {
    if (socket && receiverId && content) {
      socket.emit('send_message', { receiverId, content });
    }
  };

  const sendTyping = (receiverId) => {
    if (socket && receiverId) {
      socket.emit('typing', { receiverId });
    }
  };

  const sendStopTyping = (receiverId) => {
    if (socket && receiverId) {
      socket.emit('stop_typing', { receiverId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        messages,
        setMessages,
        typingUsers,
        sendMessage,
        sendTyping,
        sendStopTyping
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
