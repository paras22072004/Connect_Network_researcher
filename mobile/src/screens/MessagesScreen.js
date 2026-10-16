import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAcceptedConnections } from '../services/connectionService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import TeamBuilderView from '../components/TeamBuilderView';
import { COLORS, SHADOWS } from '../theme/theme';

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.round((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

const MessagesScreen = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  const { onlineUsers, messages: socketMessages } = useSocket();

  // Top Section: 'chats' | 'teambuilder'
  const [activeSection, setActiveSection] = useState('chats');

  const [connectedUsers, setConnectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConnections = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getAcceptedConnections();
      if (res.success) {
        setConnectedUsers(res.connections || []);
      }
    } catch (err) {
      console.error('Error fetching chat connections:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const onRefresh = useCallback(() => {
    fetchConnections(true);
  }, []);

  // Compute latest message and unread count for each connection
  const conversationList = useMemo(() => {
    const myId = currentUser?._id;

    return connectedUsers.map((item) => {
      const otherUser = item.user;
      const otherId = otherUser?._id;

      // Find all messages between currentUser and this peer
      const peerMessages = socketMessages.filter((m) => {
        const sId = m.sender?._id || m.sender;
        const rId = m.receiver?._id || m.receiver;
        return (sId === otherId && rId === myId) || (sId === myId && rId === otherId);
      });

      // Latest message
      const lastMessage = peerMessages.length > 0 ? peerMessages[peerMessages.length - 1] : null;

      // Unread count
      const unreadCount = peerMessages.filter((m) => {
        const sId = m.sender?._id || m.sender;
        const rId = m.receiver?._id || m.receiver;
        return sId === otherId && rId === myId && !m.read && m.status !== 'read';
      }).length;

      return {
        ...item,
        lastMessage,
        unreadCount
      };
    });
  }, [connectedUsers, socketMessages, currentUser]);

  // Total unread messages across all chats
  const totalUnreadCount = useMemo(() => {
    return conversationList.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
  }, [conversationList]);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversationList;
    const q = searchQuery.toLowerCase().trim();

    return conversationList.filter((item) => {
      const u = item.user;
      return (
        u?.name?.toLowerCase().includes(q) ||
        u?.role?.toLowerCase().includes(q) ||
        u?.organization?.toLowerCase().includes(q)
      );
    });
  }, [conversationList, searchQuery]);

  const renderMessagePreview = (lastMessage) => {
    if (!lastMessage) return 'Start a conversation';
    if (lastMessage.messageType === 'image') return 'Photo';
    if (lastMessage.messageType === 'video') return 'Video';
    if (lastMessage.messageType === 'audio') return 'Voice note';
    if (lastMessage.messageType === 'file') return lastMessage.mediaName || 'Document';
    return lastMessage.content || 'Start a conversation';
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Control: Chats vs Team Builder */}
      <View style={styles.topSegmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'chats' && styles.segmentBtnActive]}
          onPress={() => setActiveSection('chats')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Chats tab"
        >
          <Text style={[styles.segmentBtnText, activeSection === 'chats' && styles.segmentBtnTextActive]}>
            Chats
          </Text>
          {totalUnreadCount > 0 && (
            <View style={styles.segmentBadge}>
              <Text style={styles.segmentBadgeText}>{totalUnreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'teambuilder' && styles.segmentBtnActive]}
          onPress={() => setActiveSection('teambuilder')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Team Builder tab"
        >
          <Text style={[styles.segmentBtnText, activeSection === 'teambuilder' && styles.segmentBtnTextActive]}>
            Team Builder
          </Text>
        </TouchableOpacity>
      </View>

      {/* RENDER ACTIVE SECTION */}
      {activeSection === 'teambuilder' ? (
        <TeamBuilderView navigation={navigation} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search Header */}
          <View style={styles.headerBox}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color={COLORS.textLight} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {loading && !refreshing ? (
            <LoadingView message="Loading conversations..." />
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.connectionId}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
              }
              renderItem={({ item }) => {
                const user = item.user;
                const isOnline = onlineUsers.includes(user?._id);
                const profileImage =
                  user?.profileImage ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

                const lastMsg = item.lastMessage;
                const unreadCount = item.unreadCount;

                return (
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('Chat', { connectedUser: user })}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Chat with ${user?.name}`}
                  >
                    <View style={styles.avatarContainer}>
                      <Image source={{ uri: profileImage }} style={styles.avatar} />
                      {Boolean(isOnline) ? <View style={styles.onlineDot} /> : null}
                    </View>

                    <View style={styles.infoCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
                        {lastMsg ? (
                          <Text style={[styles.timeText, unreadCount > 0 && styles.timeTextUnread]}>
                            {formatTimestamp(lastMsg.createdAt || lastMsg.timestamp)}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={styles.role} numberOfLines={1}>
                        {user?.role ? `${user.role} • ${user.organization || 'Connected'}` : 'Professional Connection'}
                      </Text>

                      <View style={styles.previewRow}>
                        <Text
                          style={[styles.previewText, unreadCount > 0 && styles.previewTextUnread]}
                          numberOfLines={1}
                        >
                          {renderMessagePreview(lastMsg)}
                        </Text>

                        {unreadCount > 0 ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <EmptyStateView
                  title="No Active Chats"
                  description={
                    searchQuery
                      ? 'No conversations found matching your search.'
                      : 'Connect with nearby researchers or use the Team Builder to form collaborative project groups.'
                  }
                />
              }
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  topSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    marginHorizontal: 4
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primaryLight
  },
  segmentBtnText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  segmentBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  segmentBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6
  },
  segmentBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700'
  },
  headerBox: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    paddingVertical: 0
  },
  clearSearchIcon: {
    fontSize: 13,
    color: COLORS.textLight,
    paddingHorizontal: 4
  },
  listContent: {
    padding: 14,
    paddingBottom: 24
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  infoCol: {
    flex: 1,
    marginLeft: 12
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    marginRight: 6
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  timeTextUnread: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  role: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  previewText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
    marginRight: 6
  },
  previewTextUnread: {
    color: COLORS.textMain,
    fontWeight: '600'
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center'
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  }
});

export default MessagesScreen;
