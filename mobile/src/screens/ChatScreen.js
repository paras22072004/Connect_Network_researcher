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
  Image
} from 'react-native';
import { getConversation } from '../services/messageService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import { COLORS } from '../theme/theme';

const ChatScreen = ({ route, navigation }) => {
  const { connectedUser } = route.params || {};
  const { user } = useAuth();
  const {
    messages: socketMessages,
    sendMessage,
    sendTyping,
    sendStopTyping,
    typingUsers,
    onlineUsers
  } = useSocket();

  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

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
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [receiverId]);

  // Combine fetched history + incoming socket messages for this conversation
  const currentConversation = [
    ...chatHistory,
    ...socketMessages.filter(
      (m) =>
        (m.sender === receiverId && m.receiver === user?._id) ||
        (m.sender === user?._id && m.receiver === receiverId)
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
        <Image source={{ uri: profileImage }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{connectedUser?.name}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? ' typing...' : isOnline ? 'Online' : 'Offline'}
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
            return (
              <View style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgPeer]}>
                <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextPeer]}>
                  {item.content}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Write a message..."
          placeholderTextColor={COLORS.textLight}
          value={inputText}
          onChangeText={handleInputChange}
          multiline={false}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  headerInfo: {
    marginLeft: 12
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600'
  },
  messagesList: {
    padding: 14,
    paddingBottom: 10
  },
  msgBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8
  },
  msgMe: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2
  },
  msgPeer: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 2
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
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center'
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8
  },
  sendBtnText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '700'
  }
});

export default ChatScreen;
