import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getAcceptedConnections } from '../../services/connectionService';
import { getMessages, sendMessage as apiSendMessage } from '../../services/messageService';
import Loading from '../../components/Loading/Loading';
import EmptyState from '../../components/common/EmptyState';
import './Messages.css';

const Messages = () => {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const [searchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('user');

  const [connections, setConnections] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch accepted connections for left chat sidebar
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const res = await getAcceptedConnections();
        if (res.success) {
          const list = res.connections.map(c => c.user);
          setConnections(list);

          // If URL contains target user parameter, set as active
          if (preselectedUserId) {
            const found = list.find(u => u._id === preselectedUserId);
            if (found) setActiveContact(found);
          } else if (list.length > 0) {
            setActiveContact(list[0]);
          }
        }
      } catch (err) {
        console.error('Error loading chat contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [preselectedUserId]);

  // Fetch chat history whenever active contact changes
  useEffect(() => {
    if (!activeContact) return;

    const fetchHistory = async () => {
      setLoadingMessages(true);
      try {
        const res = await getMessages(activeContact._id);
        if (res.success) {
          setMessages(res.messages || []);
        }
      } catch (err) {
        console.error('Error loading message history:', err);
      } finally {
        setLoadingMessages(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchHistory();
  }, [activeContact]);

  // Socket event listeners for real-time messages & typing
  useEffect(() => {
    if (!socket || !activeContact) return;

    const handleReceiveMessage = (msg) => {
      if (msg.sender === activeContact._id || msg.receiver === activeContact._id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      }
    };

    const handleMessageSent = (msg) => {
      if (msg.receiver === activeContact._id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      }
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === activeContact._id) setIsTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === activeContact._id) setIsTyping(false);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, activeContact]);

  // Handle message sending via Socket.io & REST
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !activeContact) return;

    const content = textInput.trim();
    setTextInput('');

    if (socket && socket.connected) {
      socket.emit('send_message', {
        receiverId: activeContact._id,
        content
      });
    } else {
      // REST API Fallback if socket is reconnecting
      try {
        const res = await apiSendMessage(activeContact._id, content);
        if (res.success) {
          setMessages((prev) => [...prev, res.data]);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to send message.');
      }
    }
  };

  const handleInputChange = (e) => {
    setTextInput(e.target.value);
    if (socket && activeContact) {
      socket.emit('typing', { receiverId: activeContact._id });
      setTimeout(() => {
        socket.emit('stop_typing', { receiverId: activeContact._id });
      }, 2500);
    }
  };

  return (
    <div className="page-container container">
      <div className="messages-layout">
        {/* Left Sidebar - Connected Users List */}
        <aside className="contacts-sidebar">
          <div className="contacts-header">
            <h2>Messages</h2>
            <span className="badge badge-primary">{connections.length} Connected</span>
          </div>

          {loadingContacts ? (
            <Loading text="Loading contacts..." />
          ) : connections.length > 0 ? (
            <div className="contacts-list">
              {connections.map((contact) => {
                const online = isUserOnline(contact._id);
                return (
                  <div
                    key={contact._id}
                    className={`contact-item ${activeContact?._id === contact._id ? 'active-contact' : ''}`}
                    onClick={() => setActiveContact(contact)}
                  >
                    <div className="avatar-wrapper">
                      <img
                        src={contact.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={contact.name}
                        className="contact-avatar"
                      />
                      <span className={`status-dot ${online ? 'dot-online' : 'dot-offline'}`}></span>
                    </div>

                    <div className="contact-details">
                      <h4 className="contact-name">{contact.name}</h4>
                      <p className="contact-role">{contact.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center">
              <p className="text-muted">No connected contacts yet.</p>
            </div>
          )}
        </aside>

        {/* Main Chat Thread Box */}
        <main className="chat-window">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-user">
                  <div className="avatar-wrapper">
                    <img
                      src={activeContact.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={activeContact.name}
                      className="chat-avatar"
                    />
                    <span className={`status-dot ${isUserOnline(activeContact._id) ? 'dot-online' : 'dot-offline'}`}></span>
                  </div>
                  <div>
                    <h3 className="chat-user-name">{activeContact.name}</h3>
                    <p className="chat-user-status">
                      {isUserOnline(activeContact._id) ? 'Online' : 'Offline'} • {activeContact.organization}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Stream */}
              <div className="chat-messages-container">
                {loadingMessages ? (
                  <Loading text="Loading conversation history..." />
                ) : messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const isMine = (msg.sender?._id || msg.sender) === user._id;
                    return (
                      <div key={msg._id || index} className={`message-wrapper ${isMine ? 'message-mine' : 'message-other'}`}>
                        <div className="message-bubble">
                          <p className="message-text">{msg.content}</p>
                          <span className="message-time">
                            {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="chat-empty-thread">
                    <p>Start your conversation with {activeContact.name}.</p>
                  </div>
                )}
                
                {isTyping && (
                  <div className="message-wrapper message-other">
                    <div className="message-bubble typing-bubble">
                      <em>{activeContact.name} is typing...</em>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="text"
                  placeholder={`Write a message to ${activeContact.name}...`}
                  value={textInput}
                  onChange={handleInputChange}
                  className="chat-input"
                />
                <button type="submit" className="btn btn-primary btn-send">
                  Send
                </button>
              </form>
            </>
          ) : (
            <EmptyState
              icon=""
              title="Select a Conversation"
              description="Choose an accepted connection from the sidebar to begin messaging."
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Messages;
