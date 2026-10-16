import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getAcceptedConnections } from '../../services/connectionService';
import {
  getMessages,
  sendMessage as apiSendMessage,
  uploadMessageMedia
} from '../../services/messageService';
import Loading from '../../components/Loading/Loading';
import EmptyState from '../../components/common/EmptyState';
import './Messages.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Resolves media URL with backend host if relative
 */
const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  return BACKEND_URL ? `${BACKEND_URL}${url}` : url;
};

/**
 * Formats bytes to readable file size
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

  // Selected media pending upload: { file, previewUrl, type, name, size }
  const [pendingMedia, setPendingMedia] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Lightbox preview for full images / videos
  const [lightboxItem, setLightboxItem] = useState(null);

  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Auto-scroll strictly inside the chat messages container without shifting the outer page or layout
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Fetch accepted connections for left chat sidebar
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const res = await getAcceptedConnections();
        if (res.success) {
          const list = res.connections.map((c) => c.user);
          setConnections(list);

          // If URL contains target user parameter, set as active
          if (preselectedUserId) {
            const found = list.find((u) => u._id === preselectedUserId);
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
          // Notify the other user via socket that incoming messages have been read
          if (socket && socket.connected) {
            socket.emit('mark_as_read', { senderId: activeContact._id });
          }
        }
      } catch (err) {
        console.error('Error loading message history:', err);
      } finally {
        setLoadingMessages(false);
        setTimeout(scrollToBottom, 50);
      }
    };

    fetchHistory();
  }, [activeContact, socket]);

  // Socket event listeners for real-time messages, typing, delivery, and read ticks
  useEffect(() => {
    if (!socket || !activeContact) return;

    const handleReceiveMessage = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      if (senderId === activeContact._id) {
        // Conversation is open, so mark as read immediately
        if (socket.connected) {
          socket.emit('mark_as_read', { senderId: activeContact._id });
        }
        setMessages((prev) => [...prev, { ...msg, read: true, status: 'read' }]);
        setTimeout(scrollToBottom, 50);
      } else if ((msg.receiver?._id || msg.receiver) === activeContact._id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
    };

    const handleMessageSent = (msg) => {
      if (
        (msg.receiver?._id || msg.receiver) === activeContact._id ||
        (msg.sender?._id || msg.sender) === activeContact._id
      ) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
    };

    // When recipient reads our messages, update all our sent messages to read
    const handleMessagesRead = ({ readerId }) => {
      if (activeContact._id === readerId) {
        setMessages((prev) =>
          prev.map((m) => {
            const isMine = (m.sender?._id || m.sender) === user._id;
            return isMine ? { ...m, read: true, status: 'read' } : m;
          })
        );
      }
    };

    // When recipient comes online, update sent messages to delivered
    const handleMessagesDelivered = ({ recipientId }) => {
      if (activeContact._id === recipientId) {
        setMessages((prev) =>
          prev.map((m) => {
            const isMine = (m.sender?._id || m.sender) === user._id;
            return isMine && !m.read ? { ...m, status: 'delivered' } : m;
          })
        );
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
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, activeContact, user._id]);

  // Helper to categorize any file: image, video, audio, pdf, excel, ppt, word, zip, etc.
  const getFileCategory = (fileName = '', mimeType = '') => {
    const ext = fileName && fileName.includes('.')
      ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
      : '';
    const mime = (mimeType || '').toLowerCase();

    if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
      return { type: 'image', category: 'image', icon: '🖼️', label: 'Image', badge: 'IMG', badgeColor: '#16a34a' };
    }
    if (mime.startsWith('video/') || ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.3gp'].includes(ext)) {
      return { type: 'video', category: 'video', icon: '🎥', label: 'Video', badge: 'VID', badgeColor: '#8b5cf6' };
    }
    if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext)) {
      return { type: 'audio', category: 'audio', icon: '🎵', label: 'Audio', badge: 'AUD', badgeColor: '#0284c7' };
    }
    if (ext === '.pdf' || mime.includes('pdf')) {
      return { type: 'file', category: 'pdf', icon: '📕', label: 'PDF Document', badge: 'PDF', badgeColor: '#dc2626' };
    }
    if (['.xls', '.xlsx', '.csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) {
      return { type: 'file', category: 'excel', icon: '📊', label: 'Excel Spreadsheet', badge: 'XLSX', badgeColor: '#16a34a' };
    }
    if (['.ppt', '.pptx'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
      return { type: 'file', category: 'ppt', icon: '📽️', label: 'PowerPoint Presentation', badge: 'PPT', badgeColor: '#ea580c' };
    }
    if (['.doc', '.docx'].includes(ext) || mime.includes('word') || mime.includes('document')) {
      return { type: 'file', category: 'word', icon: '📝', label: 'Word Document', badge: 'DOC', badgeColor: '#2563eb' };
    }
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
      return { type: 'file', category: 'archive', icon: '📦', label: 'Compressed Archive', badge: 'ZIP', badgeColor: '#9333ea' };
    }
    if (['.txt', '.md', '.json', '.js', '.py', '.html', '.css'].includes(ext) || mime.startsWith('text/')) {
      return { type: 'file', category: 'text', icon: '📄', label: 'Text File', badge: 'TXT', badgeColor: '#475569' };
    }
    return { type: 'file', category: 'file', icon: '📄', label: 'Document / File', badge: 'FILE', badgeColor: '#64748b' };
  };

  // Handle local file selection (image, video, audio, pdf, excel, ppt, files)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileMeta = getFileCategory(file.name, file.type);
    const previewUrl = URL.createObjectURL(file);
    setPendingMedia({
      file,
      previewUrl,
      type: fileMeta.type,
      category: fileMeta.category,
      label: fileMeta.label,
      icon: fileMeta.icon,
      badge: fileMeta.badge,
      badgeColor: fileMeta.badgeColor,
      name: file.name,
      size: file.size
    });

    // Reset input value so same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingMedia = () => {
    if (pendingMedia?.previewUrl) {
      URL.revokeObjectURL(pendingMedia.previewUrl);
    }
    setPendingMedia(null);
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
        const previewUrl = URL.createObjectURL(audioBlob);

        setPendingMedia({
          file: audioFile,
          previewUrl,
          type: 'audio',
          category: 'voice',
          label: 'Voice Note',
          icon: '🎙️',
          badge: 'REC',
          badgeColor: '#dc2626',
          name: 'Voice Note',
          size: audioBlob.size
        });

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Microphone access denied or not supported by browser.');
    }
  };

  // Stop voice recording & attach
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Cancel voice recording without saving
  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      audioChunksRef.current = [];
    }
  };

  // Handle message sending via Socket.io & REST
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeContact) return;

    const hasText = textInput.trim().length > 0;
    const hasMedia = !!pendingMedia;

    if (!hasText && !hasMedia) return;

    let mediaData = null;

    // Upload file to server first if media is attached
    if (pendingMedia?.file) {
      setIsUploading(true);
      try {
        const uploadRes = await uploadMessageMedia(pendingMedia.file);
        if (uploadRes.success) {
          mediaData = {
            mediaUrl: uploadRes.mediaUrl,
            messageType: uploadRes.messageType,
            mediaName: uploadRes.mediaName,
            mediaSize: uploadRes.mediaSize,
            mediaMimeType: uploadRes.mediaMimeType
          };
        }
      } catch (err) {
        console.error('Error uploading media:', err);
        alert(err.response?.data?.message || 'Failed to upload media file.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const payload = {
      receiverId: activeContact._id,
      content: textInput.trim(),
      messageType: mediaData ? mediaData.messageType : 'text',
      mediaUrl: mediaData ? mediaData.mediaUrl : null,
      mediaName: mediaData ? mediaData.mediaName : null,
      mediaSize: mediaData ? mediaData.mediaSize : null,
      mediaMimeType: mediaData ? mediaData.mediaMimeType : null
    };

    setTextInput('');
    removePendingMedia();

    if (socket && socket.connected) {
      socket.emit('send_message', payload);
    } else {
      // REST API Fallback
      try {
        const res = await apiSendMessage(activeContact._id, payload);
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

  // Format recording seconds mm:ss
  const formatRecordingTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="messages-page-wrapper container">
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
                    className={`contact-item ${
                      activeContact?._id === contact._id ? 'active-contact' : ''
                    }`}
                    onClick={() => setActiveContact(contact)}
                  >
                    <div className="avatar-wrapper">
                      <img
                        src={
                          contact.profileImage ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                        }
                        alt={contact.name}
                        className="contact-avatar"
                      />
                      <span
                        className={`status-dot ${online ? 'dot-online' : 'dot-offline'}`}
                      ></span>
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
                      src={
                        activeContact.profileImage ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                      }
                      alt={activeContact.name}
                      className="chat-avatar"
                    />
                    <span
                      className={`status-dot ${
                        isUserOnline(activeContact._id) ? 'dot-online' : 'dot-offline'
                      }`}
                    ></span>
                  </div>
                  <div>
                    <h3 className="chat-user-name">{activeContact.name}</h3>
                    <p className="chat-user-status">
                      {isUserOnline(activeContact._id) ? 'Online' : 'Offline'} •{' '}
                      {activeContact.organization}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Stream */}
              <div className="chat-messages-container" ref={messagesContainerRef}>
                {loadingMessages ? (
                  <Loading text="Loading conversation history..." />
                ) : messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const isMine = (msg.sender?._id || msg.sender) === user._id;
                    const msgType = msg.messageType || 'text';
                    const mediaSrc = resolveMediaUrl(msg.mediaUrl);
                    const isRead = msg.read === true || msg.status === 'read';
                    const isDelivered = msg.status === 'delivered';

                    return (
                      <div
                        key={msg._id || index}
                        className={`message-wrapper ${
                          isMine ? 'message-mine' : 'message-other'
                        }`}
                      >
                        <div className={`message-bubble bubble-${msgType}`}>
                          {/* 1. Image Media Rendering */}
                          {msgType === 'image' && mediaSrc && (
                            <div className="bubble-media-wrapper image-container">
                              <img
                                src={mediaSrc}
                                alt={msg.mediaName || 'Sent image'}
                                className="bubble-image"
                                onClick={() =>
                                  setLightboxItem({
                                    url: mediaSrc,
                                    type: 'image',
                                    name: msg.mediaName
                                  })
                                }
                              />
                            </div>
                          )}

                          {/* 2. Video Media Rendering */}
                          {msgType === 'video' && mediaSrc && (
                            <div className="bubble-media-wrapper video-container">
                              <video
                                src={mediaSrc}
                                controls
                                className="bubble-video"
                                preload="metadata"
                              />
                            </div>
                          )}

                          {/* 3. Audio / Voice Note Rendering */}
                          {msgType === 'audio' && mediaSrc && (
                            <div className="bubble-media-wrapper audio-container">
                              <div className="audio-bubble-header">
                                <span className="audio-mic-icon">🎙️</span>
                                <span className="audio-label">
                                  {msg.mediaName || 'Voice Note'}
                                </span>
                              </div>
                              <audio
                                src={mediaSrc}
                                controls
                                className="bubble-audio"
                                preload="metadata"
                              />
                            </div>
                          )}

                          {/* 4. Document / Office File Rendering (PDF, Excel, PPT, Word, Archives, etc.) */}
                          {msgType === 'file' && mediaSrc && (() => {
                            const fileInfo = getFileCategory(msg.mediaName, msg.mediaMimeType);
                            return (
                              <div className={`bubble-media-wrapper file-container file-cat-${fileInfo.category}`}>
                                <a
                                  href={mediaSrc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="file-download-card"
                                  download={msg.mediaName || 'attachment'}
                                >
                                  <div
                                    className="file-badge-box"
                                    style={{
                                      backgroundColor: `${fileInfo.badgeColor}15`,
                                      borderColor: `${fileInfo.badgeColor}40`
                                    }}
                                  >
                                    <span className="file-icon">{fileInfo.icon}</span>
                                    <span
                                      className="file-type-pill"
                                      style={{ backgroundColor: fileInfo.badgeColor }}
                                    >
                                      {fileInfo.badge}
                                    </span>
                                  </div>
                                  <div className="file-info-col">
                                    <span className="file-name" title={msg.mediaName || 'Attachment'}>
                                      {msg.mediaName || 'Attachment'}
                                    </span>
                                    <div className="file-meta-row">
                                      {msg.mediaSize && (
                                        <span className="file-size">
                                          {formatFileSize(msg.mediaSize)}
                                        </span>
                                      )}
                                      <span className="file-label-badge">
                                        {fileInfo.label}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="download-btn-circle" title="Download / Open File">
                                    <svg
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                  </div>
                                </a>
                              </div>
                            );
                          })()}

                          {/* Text Content / Caption */}
                          {msg.content && msg.content.trim() && (
                            <p className="message-text">{msg.content}</p>
                          )}

                          {/* Message Footer with Timestamp & Status Ticks */}
                          <div className="message-meta-footer">
                            <span className="message-time">
                              {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>

                            {isMine && (
                              <span
                                className={`msg-status-ticks ${
                                  isRead
                                    ? 'ticks-read'
                                    : isDelivered
                                    ? 'ticks-delivered'
                                    : 'ticks-sent'
                                }`}
                                title={
                                  isRead
                                    ? 'Read'
                                    : isDelivered
                                    ? 'Delivered'
                                    : 'Sent'
                                }
                              >
                                {isRead ? (
                                  /* Double Blue Tick */
                                  <svg width="16" height="15" viewBox="0 0 16 15" fill="none" className="tick-svg">
                                    <path d="M1 8.5L4.5 12L12 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5 8.5L8.5 12L15 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : isDelivered ? (
                                  /* Double Gray / White Tick */
                                  <svg width="16" height="15" viewBox="0 0 16 15" fill="none" className="tick-svg">
                                    <path d="M1 8.5L4.5 12L12 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5 8.5L8.5 12L15 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  /* Single Gray / White Tick */
                                  <svg width="12" height="15" viewBox="0 0 12 15" fill="none" className="tick-svg">
                                    <path d="M1 8.5L4.5 12L11 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
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
              </div>

              {/* Pending Media Attachment Preview Bar */}
              {pendingMedia && (
                <div className="pending-media-bar animate-fade-in">
                  <div className="pending-media-preview">
                    {pendingMedia.type === 'image' ? (
                      <img
                        src={pendingMedia.previewUrl}
                        alt="Preview"
                        className="pending-thumb"
                      />
                    ) : (
                      <div
                        className="pending-file-icon-box"
                        style={{
                          backgroundColor: `${pendingMedia.badgeColor || '#2563eb'}18`,
                          borderColor: pendingMedia.badgeColor || '#2563eb'
                        }}
                      >
                        <span className="pending-file-emoji">
                          {pendingMedia.icon || '📄'}
                        </span>
                        <span
                          className="pending-file-badge-pill"
                          style={{ backgroundColor: pendingMedia.badgeColor || '#2563eb' }}
                        >
                          {pendingMedia.badge || 'FILE'}
                        </span>
                      </div>
                    )}
                    <div className="pending-info">
                      <span className="pending-name">{pendingMedia.name}</span>
                      <span className="pending-size">
                        {formatFileSize(pendingMedia.size)} • {pendingMedia.label || 'Attachment'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pending-remove-btn"
                    onClick={removePendingMedia}
                    title="Remove attachment"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Live Voice Recording Status Bar */}
              {isRecording && (
                <div className="live-recording-bar animate-fade-in">
                  <div className="recording-indicator">
                    <span className="rec-pulse-dot"></span>
                    <span className="rec-label">Recording Voice Note...</span>
                    <span className="rec-timer">
                      {formatRecordingTime(recordingSeconds)}
                    </span>
                  </div>
                  <div className="recording-actions">
                    <button
                      type="button"
                      className="rec-btn btn-rec-cancel"
                      onClick={cancelVoiceRecording}
                      title="Cancel Recording"
                    >
                      ✕ Cancel
                    </button>
                    <button
                      type="button"
                      className="rec-btn btn-rec-done"
                      onClick={stopVoiceRecording}
                      title="Attach Recording"
                    >
                      ✓ Attach
                    </button>
                  </div>
                </div>
              )}

              {/* Modern Polished Chat Input Bar */}
              <div className="chat-composer-wrapper">
                <form onSubmit={handleSendMessage} className="modern-chat-input-form">
                  {/* Action Buttons */}
                  <div className="composer-actions-left">
                    {/* Single Universal Attachment Button (Audio, Video, Image, PDF, Excel, PPT, Files) */}
                    <label
                      className="composer-action-btn universal-attachment-btn"
                      title="Attach file (Audio, Video, Image, PDF, Excel, PPT, etc.)"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="*/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect(e)}
                      />
                      <svg
                        width="21"
                        height="21"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </label>

                    {/* Voice Recording Button */}
                    <button
                      type="button"
                      className={`composer-action-btn ${
                        isRecording ? 'recording-active' : ''
                      }`}
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      title={
                        isRecording
                          ? 'Stop Recording'
                          : 'Record Voice Note'
                      }
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>
                  </div>

                  {/* Main Message Text Input Box */}
                  <div className="input-field-container">
                    <input
                      type="text"
                      placeholder={
                        pendingMedia
                          ? `Add a caption for this ${pendingMedia.type}...`
                          : `Write a message to ${activeContact.name}...`
                      }
                      value={textInput}
                      onChange={handleInputChange}
                      className="modern-chat-input"
                      disabled={isUploading}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="composer-send-btn"
                    disabled={
                      isUploading ||
                      (!textInput.trim() && !pendingMedia)
                    }
                    title="Send Message"
                  >
                    {isUploading ? (
                      <span className="send-spinner"></span>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
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

      {/* Lightbox Modal for Full Image Viewing */}
      {lightboxItem && (
        <div
          className="lightbox-overlay animate-fade-in"
          onClick={() => setLightboxItem(null)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close-btn"
              onClick={() => setLightboxItem(null)}
            >
              ✕
            </button>
            {lightboxItem.type === 'image' && (
              <img
                src={lightboxItem.url}
                alt={lightboxItem.name || 'Full view'}
                className="lightbox-media-img"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
