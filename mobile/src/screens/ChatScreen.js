import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Linking,
  Alert
} from 'react-native';
import { getConversation, sendMessageApi } from '../services/messageService';
import { resolveMediaUrl } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/theme';

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

const getFileBadgeMeta = (fileName = '', mime = '') => {
  const ext = fileName && fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  if (ext === '.pdf' || mime.includes('pdf')) return { badge: 'PDF', color: '#ef4444', icon: 'document-text-outline' };
  if (['.xls', '.xlsx', '.csv'].includes(ext)) return { badge: 'EXCEL', color: '#10b981', icon: 'stats-chart-outline' };
  if (['.ppt', '.pptx'].includes(ext)) return { badge: 'PPT', color: '#f97316', icon: 'easel-outline' };
  if (['.doc', '.docx'].includes(ext)) return { badge: 'DOC', color: '#3b82f6', icon: 'document-outline' };
  if (['.zip', '.rar', '.7z'].includes(ext)) return { badge: 'ZIP', color: '#8b5cf6', icon: 'archive-outline' };
  return { badge: 'FILE', color: '#64748b', icon: 'document-outline' };
};

const ChatScreen = ({ route, navigation }) => {
  const { connectedUser } = route.params || {};
  const { user } = useAuth();
  const {
    messages: socketMessages,
    sendMessage,
    markAsRead,
    sendTyping,
    sendStopTyping,
    typingUsers,
    onlineUsers
  } = useSocket();

  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const flatListRef = useRef();

  const receiverId = connectedUser?._id;
  const isOnline = onlineUsers.includes(receiverId);
  const isTyping = typingUsers[receiverId];

  // Fetch initial chat conversation history from backend
  useEffect(() => {
    if (!receiverId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await getConversation(receiverId);
        if (res.success) {
          setChatHistory(res.messages || []);
          markAsRead(receiverId);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [receiverId]);

  // Mark incoming messages as read while conversation is active
  useEffect(() => {
    if (receiverId) {
      markAsRead(receiverId);
    }
  }, [socketMessages, receiverId]);

  // Combine fetched history + incoming socket messages for this conversation
  const currentConversation = [
    ...chatHistory,
    ...socketMessages.filter(
      (m) =>
        ((m.sender === receiverId || m.sender?._id === receiverId) &&
          (m.receiver === user?._id || m.receiver?._id === user?._id)) ||
        ((m.sender === user?._id || m.sender?._id === user?._id) &&
          (m.receiver === receiverId || m.receiver?._id === receiverId))
    )
  ].filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i); // Deduplicate by _id

  const handleSend = () => {
    if (!inputText.trim() || !receiverId) return;
    sendMessage(receiverId, inputText.trim());
    setInputText('');
    sendStopTyping(receiverId);
  };

  const handleInputChange = (text) => {
    setInputText(text);
    if (text.length > 0) {
      sendTyping(receiverId);
    } else {
      sendStopTyping(receiverId);
    }
  };

  // Quick media attach sender helper
  const handleSendQuickMedia = (type, sampleUrl, sampleName, mimeType) => {
    setShowAttachModal(false);
    sendMessage(receiverId, inputText.trim(), {
      messageType: type,
      mediaUrl: sampleUrl,
      mediaName: sampleName,
      mediaSize: 1024 * 250,
      mediaMimeType:
        mimeType ||
        (type === 'image'
          ? 'image/jpeg'
          : type === 'audio'
          ? 'audio/mp3'
          : type === 'video'
          ? 'video/mp4'
          : 'application/pdf')
    });
    setInputText('');
  };

  const handleOpenFile = (url) => {
    const fullUrl = resolveMediaUrl(url);
    if (fullUrl) {
      Linking.openURL(fullUrl).catch(() => {
        Alert.alert('Cannot Open File', 'Could not open the attachment on this device.');
      });
    }
  };

  const profileImage =
    connectedUser?.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: profileImage }} style={styles.avatar} />
          {Boolean(isOnline) ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{connectedUser?.name}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? 'typing...' : isOnline ? 'Online' : 'Offline'} • {connectedUser?.organization || 'Connected'}
          </Text>
        </View>
      </View>

      {loading ? (
        <LoadingView message="Loading conversation history..." />
      ) : (
        <FlatList
          ref={flatListRef}
          data={currentConversation}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.sender === user?._id || item.sender?._id === user?._id;
            const isRead = item.read === true || item.status === 'read';
            const isDelivered = item.status === 'delivered';
            const mediaUrl = resolveMediaUrl(item.mediaUrl);
            const msgType = item.messageType || 'text';

            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowPeer]}>
                <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgPeer]}>
                  {/* 1. Image Attachment */}
                  {msgType === 'image' && Boolean(mediaUrl) ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setPreviewImage(mediaUrl)}
                      style={styles.imageContainer}
                    >
                      <Image source={{ uri: mediaUrl }} style={styles.chatImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : null}

                  {/* 2. Video Attachment */}
                  {msgType === 'video' && Boolean(mediaUrl) ? (
                    <TouchableOpacity
                      style={styles.mediaCard}
                      onPress={() => handleOpenFile(mediaUrl)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.mediaIconWrapper, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(36,86,59,0.1)' }]}>
                        <Ionicons name="videocam" size={20} color={isMe ? '#FFFFFF' : COLORS.primary} />
                      </View>
                      <View style={styles.mediaInfo}>
                        <Text style={[styles.mediaTitle, isMe && styles.textWhite]} numberOfLines={1}>
                          {item.mediaName || 'Video Attachment'}
                        </Text>
                        <Text style={[styles.mediaSub, isMe && styles.textWhiteMuted]}>Tap to play video</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* 3. Audio Attachment / Voice Note */}
                  {msgType === 'audio' && Boolean(mediaUrl) ? (
                    <TouchableOpacity
                      style={styles.mediaCard}
                      onPress={() => handleOpenFile(mediaUrl)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.mediaIconWrapper, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(36,86,59,0.1)' }]}>
                        <Ionicons name="mic" size={20} color={isMe ? '#FFFFFF' : COLORS.primary} />
                      </View>
                      <View style={styles.mediaInfo}>
                        <Text style={[styles.mediaTitle, isMe && styles.textWhite]} numberOfLines={1}>
                          {item.mediaName || 'Voice Note'}
                        </Text>
                        <Text style={[styles.mediaSub, isMe && styles.textWhiteMuted]}>Audio Clip • Tap to listen</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* 4. Document / File Attachment (PDF, Excel, PPT, etc.) */}
                  {msgType === 'file' && Boolean(mediaUrl) ? (() => {
                    const badgeMeta = getFileBadgeMeta(item.mediaName, item.mediaMimeType);
                    return (
                      <TouchableOpacity
                        style={[styles.fileCard, isMe && styles.fileCardMe]}
                        onPress={() => handleOpenFile(mediaUrl)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.fileBadge, { backgroundColor: badgeMeta.color }]}>
                          <Text style={styles.fileBadgeText}>{badgeMeta.badge}</Text>
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={[styles.fileName, isMe && styles.textWhite]} numberOfLines={1}>
                            {item.mediaName || 'Document'}
                          </Text>
                          <Text style={[styles.fileMeta, isMe && styles.textWhiteMuted]}>Tap to open / download</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })() : null}

                  {/* Text Content / Caption */}
                  {Boolean(item.content && item.content.trim().length > 0) ? (
                    <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextPeer]}>
                      {item.content}
                    </Text>
                  ) : null}

                  {/* Footer Row: Timestamp + WhatsApp-style Status Ticks */}
                  <View style={styles.metaFooter}>
                    <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextPeer]}>
                      {formatMessageTime(item.createdAt || item.timestamp)}
                    </Text>

                    {Boolean(isMe) ? (
                      <View style={styles.ticksContainer}>
                        {isRead ? (
                          <Ionicons name="checkmark-done" size={15} color="#38BDF8" />
                        ) : isDelivered ? (
                          <Ionicons name="checkmark-done" size={15} color={isMe ? 'rgba(255,255,255,0.7)' : COLORS.textLight} />
                        ) : (
                          <Ionicons name="checkmark" size={15} color={isMe ? 'rgba(255,255,255,0.7)' : COLORS.textLight} />
                        )}
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input Bar with Universal Attachment Button */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowAttachModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Attach media or document"
        >
          <Ionicons name="attach" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Write a message..."
          placeholderTextColor={COLORS.textLight}
          value={inputText}
          onChangeText={handleInputChange}
          multiline={false}
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* Attachment Options Action Modal */}
      <Modal
        visible={showAttachModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachModal(false)}
        >
          <View style={styles.attachSheet}>
            <Text style={styles.attachSheetTitle}>Attach to message</Text>
            <View style={styles.attachGrid}>
              {/* 1. Image */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'image',
                    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
                    'Research_Team.jpg',
                    'image/jpeg'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="image" size={24} color="#2563EB" />
                </View>
                <Text style={styles.attachLabel}>Image</Text>
              </TouchableOpacity>

              {/* 2. Video */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'video',
                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                    'Project_Demo.mp4',
                    'video/mp4'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="videocam" size={24} color="#D97706" />
                </View>
                <Text style={styles.attachLabel}>Video</Text>
              </TouchableOpacity>

              {/* 3. Audio / Voice */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'audio',
                    'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
                    'Voice_Note.mp3',
                    'audio/mp3'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#faf5ff' }]}>
                  <Ionicons name="mic" size={24} color="#9333EA" />
                </View>
                <Text style={styles.attachLabel}>Audio</Text>
              </TouchableOpacity>

              {/* 4. PDF Document */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'file',
                    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    'Research_Paper.pdf',
                    'application/pdf'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="document-text" size={24} color="#DC2626" />
                </View>
                <Text style={styles.attachLabel}>PDF</Text>
              </TouchableOpacity>

              {/* 5. Excel Spreadsheet */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'file',
                    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    'Data_Analysis.xlsx',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="grid" size={24} color="#059669" />
                </View>
                <Text style={styles.attachLabel}>Excel</Text>
              </TouchableOpacity>

              {/* 6. PowerPoint Presentation */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'file',
                    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    'Keynote_Deck.pptx',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#fff7ed' }]}>
                  <Ionicons name="easel" size={24} color="#EA580C" />
                </View>
                <Text style={styles.attachLabel}>PPT</Text>
              </TouchableOpacity>

              {/* 7. Word Document */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'file',
                    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    'Summary_Brief.docx',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#f0f9ff' }]}>
                  <Ionicons name="reader" size={24} color="#0284C7" />
                </View>
                <Text style={styles.attachLabel}>Document</Text>
              </TouchableOpacity>

              {/* 8. Archive / File */}
              <TouchableOpacity
                style={styles.attachOption}
                activeOpacity={0.7}
                onPress={() =>
                  handleSendQuickMedia(
                    'file',
                    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    'Code_Assets.zip',
                    'application/zip'
                  )
                }
              >
                <View style={[styles.attachCircle, { backgroundColor: '#f5f3ff' }]}>
                  <Ionicons name="folder" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.attachLabel}>Files</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelAttachBtn}
              activeOpacity={0.7}
              onPress={() => setShowAttachModal(false)}
            >
              <Text style={styles.cancelAttachText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Image Preview Modal */}
      {previewImage && (
        <Modal visible={!!previewImage} transparent animationType="fade">
          <View style={styles.imagePreviewModal}>
            <TouchableOpacity
              style={styles.imagePreviewClose}
              activeOpacity={0.7}
              onPress={() => setPreviewImage(null)}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: previewImage }} style={styles.fullPreviewImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.bgCard
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain
  },
  headerStatus: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 1
  },
  messagesList: {
    padding: 14,
    paddingBottom: 16
  },
  msgRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 8
  },
  msgRowMe: {
    justifyContent: 'flex-end'
  },
  msgRowPeer: {
    justifyContent: 'flex-start'
  },
  msgBubble: {
    maxWidth: '78%',
    padding: 10,
    paddingBottom: 6,
    borderRadius: 16,
    ...SHADOWS.sm
  },
  msgMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 3
  },
  msgPeer: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 3
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20
  },
  msgTextMe: {
    color: COLORS.textWhite
  },
  msgTextPeer: {
    color: COLORS.textMain
  },
  imageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6
  },
  chatImage: {
    width: 220,
    height: 160,
    borderRadius: 10
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 6
  },
  mediaIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  mediaInfo: {
    flex: 1
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  mediaSub: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginBottom: 6,
    minWidth: 180
  },
  fileCardMe: {
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  fileBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8
  },
  fileBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800'
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain
  },
  fileMeta: {
    fontSize: 9,
    color: COLORS.textMuted
  },
  textWhite: {
    color: '#ffffff'
  },
  textWhiteMuted: {
    color: 'rgba(255,255,255,0.8)'
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4
  },
  timeText: {
    fontSize: 10
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.75)'
  },
  timeTextPeer: {
    color: COLORS.textLight
  },
  ticksContainer: {
    marginLeft: 2
  },
  tickGray: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700'
  },
  tickBlue: {
    fontSize: 11,
    color: '#67e8f9',
    fontWeight: '900'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center'
  },
  attachBtn: {
    padding: 8,
    marginRight: 6
  },
  attachIcon: {
    fontSize: 20
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textMain,
    maxHeight: 100
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    ...SHADOWS.sm
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.borderDark
  },
  sendBtnIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    transform: [{ rotate: '45deg' }]
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  attachSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30
  },
  attachSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 16,
    textAlign: 'center'
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16
  },
  attachOption: {
    alignItems: 'center',
    width: '23%',
    marginBottom: 14
  },
  attachCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...SHADOWS.sm
  },
  attachCircleIcon: {
    fontSize: 24
  },
  attachLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain
  },
  cancelAttachBtn: {
    backgroundColor: COLORS.bgInput,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelAttachText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  imagePreviewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  imagePreviewCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  fullPreviewImage: {
    width: '95%',
    height: '80%'
  }
});

export default ChatScreen;
