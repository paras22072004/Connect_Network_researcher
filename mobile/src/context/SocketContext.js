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

    // When recipient reads messages, update ticks to read (blue)
    newSocket.on('messages_read', ({ readerId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          (m.receiver === readerId || m.receiver?._id === readerId)
            ? { ...m, read: true, status: 'read' }
            : m
        )
      );
    });

    // When recipient comes online, update ticks to delivered
    newSocket.on('messages_delivered', ({ recipientId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          ((m.receiver === recipientId || m.receiver?._id === recipientId) && !m.read)
            ? { ...m, status: 'delivered' }
            : m
        )
      );
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

  const sendMessage = (receiverId, content = '', mediaData = null) => {
    if (socket && receiverId && (content || mediaData)) {
      const payload = {
        receiverId,
        content: content ? content.trim() : '',
        messageType: mediaData ? mediaData.messageType : 'text',
        mediaUrl: mediaData ? mediaData.mediaUrl : null,
        mediaName: mediaData ? mediaData.mediaName : null,
        mediaSize: mediaData ? mediaData.mediaSize : null,
        mediaMimeType: mediaData ? mediaData.mediaMimeType : null
      };
      socket.emit('send_message', payload);
    }
  };

  const markAsRead = (senderId) => {
    if (socket && senderId) {
      socket.emit('mark_as_read', { senderId });
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
        markAsRead,
        sendTyping,
        sendStopTyping
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
