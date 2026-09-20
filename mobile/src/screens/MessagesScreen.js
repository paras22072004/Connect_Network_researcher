import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image
} from 'react-native';
import { getAcceptedConnections } from '../services/connectionService';
import { useSocket } from '../context/SocketContext';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const MessagesScreen = ({ navigation }) => {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { onlineUsers } = useSocket();

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await getAcceptedConnections();
      if (res.success) {
        setConnectedUsers(res.connections || []);
      }
    } catch (err) {
      console.error('Error fetching chat connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversations</Text>
      <Text style={styles.subtitle}>Real-time 1-to-1 messaging with accepted connections</Text>

      {loading ? (
        <LoadingView message="Loading conversations..." />
      ) : (
        <FlatList
          data={connectedUsers}
          keyExtractor={(item) => item.connectionId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const user = item.user;
            const isOnline = onlineUsers.includes(user?._id);
            const profileImage =
              user?.profileImage ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Chat', { connectedUser: user })}
              >
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                  {isOnline && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{user?.name}</Text>
                    {isOnline && <Text style={styles.onlineText}>Online</Text>}
                  </View>
                  <Text style={styles.role}>{user?.role}</Text>
                  <Text style={styles.org}>{user?.organization}</Text>
                </View>

                <Text style={styles.chatArrow}>💬</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyStateView
              title="No Active Chats"
              description="Connect with nearby professionals to unlock real-time 1-to-1 chat messaging."
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    padding: 14
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 14
  },
  listContent: {
    paddingBottom: 20
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
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.bgCard
  },
  infoCol: {
    flex: 1,
    marginLeft: 12
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent
  },
  role: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600'
  },
  org: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  chatArrow: {
    fontSize: 18
  }
});

export default MessagesScreen;
