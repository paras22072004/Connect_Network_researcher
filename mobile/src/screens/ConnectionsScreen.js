import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator
} from 'react-native';
import {
  getAcceptedConnections,
  getConnectionRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest
} from '../services/connectionService';
import ProfileModalView from '../components/ProfileModalView';
import EmptyStateView from '../components/EmptyStateView';
import LoadingView from '../components/LoadingView';
import { COLORS, SHADOWS } from '../theme/theme';

const ConnectionsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('accepted'); // 'accepted' | 'pending'
  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState(null);

  const fetchConnectionsData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'accepted') {
        const res = await getAcceptedConnections();
        if (res.success) {
          setConnections(res.connections || []);
        }
      } else {
        const res = await getConnectionRequests();
        if (res.success) {
          setIncomingRequests(res.incoming || []);
          setOutgoingRequests(res.outgoing || []);
        }
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, [activeTab]);

  const handleAccept = async (connectionId) => {
    try {
      const res = await acceptConnectionRequest(connectionId);
      if (res.success) {
        fetchConnectionsData();
      }
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  const handleReject = async (connectionId) => {
    try {
      const res = await rejectConnectionRequest(connectionId);
      if (res.success) {
        fetchConnectionsData();
      }
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleCancel = async (connectionId) => {
    try {
      const res = await cancelConnectionRequest(connectionId);
      if (res.success) {
        fetchConnectionsData();
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const renderConnectionItem = ({ item }) => {
    const connectedUser = item.user;
    const profileImage =
      connectedUser?.profileImage ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setSelectedProfile(connectedUser)}
        >
          <Image source={{ uri: profileImage }} style={styles.avatar} />
          <View style={styles.infoCol}>
            <Text style={styles.name}>{connectedUser?.name}</Text>
            <Text style={styles.role}>{connectedUser?.role}</Text>
            <Text style={styles.org}>{connectedUser?.organization}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => setSelectedProfile(connectedUser)}
          >
            <Text style={styles.btnOutlineText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() =>
              navigation.navigate('Messages', {
                screen: 'Chat',
                params: { connectedUser }
              })
            }
          >
            <Text style={styles.btnPrimaryText}>💬 Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'accepted' && styles.tabBtnActive]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text
            style={[styles.tabBtnText, activeTab === 'accepted' && styles.tabBtnTextActive]}
          >
            My Connections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text
            style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}
          >
            Pending Requests ({incomingRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingView message="Loading connections..." />
      ) : activeTab === 'accepted' ? (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.connectionId}
          renderItem={renderConnectionItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateView
              title="No Connections Yet"
              description="Discover nearby professionals and send connection requests to build your network."
            />
          }
        />
      ) : (
        <FlatList
          data={[...incomingRequests.map((r) => ({ ...r, isIncoming: true })), ...outgoingRequests.map((r) => ({ ...r, isIncoming: false }))]}
          keyExtractor={(item) => item.connectionId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const user = item.user;
            const profileImage =
              user?.profileImage ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                  <View style={styles.infoCol}>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.role}>{user?.role}</Text>
                    <Text style={styles.badgeText}>
                      {item.isIncoming ? '📥 Incoming Request' : '📤 Sent Request'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  {item.isIncoming ? (
                    <>
                      <TouchableOpacity
                        style={styles.btnAccept}
                        onPress={() => handleAccept(item.connectionId)}
                      >
                        <Text style={styles.btnAcceptText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnReject}
                        onPress={() => handleReject(item.connectionId)}
                      >
                        <Text style={styles.btnRejectText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.btnReject}
                      onPress={() => handleCancel(item.connectionId)}
                    >
                      <Text style={styles.btnRejectText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyStateView
              title="No Pending Requests"
              description="You have no pending incoming or outgoing connection requests."
            />
          }
        />
      )}

      {/* Profile Modal View */}
      <ProfileModalView
        visible={!!selectedProfile}
        user={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onOpenMessage={(connectedUser) => {
          setSelectedProfile(null);
          navigation.navigate('Messages', {
            screen: 'Chat',
            params: { connectedUser }
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    padding: 14
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: 12
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabBtnTextActive: {
    color: COLORS.textWhite
  },
  listContent: {
    paddingBottom: 20
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.sm
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  infoCol: {
    flex: 1,
    marginLeft: 12
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain
  },
  role: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600'
  },
  org: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  badgeText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '700',
    marginTop: 2
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  btnOutline: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.bgMain
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain
  },
  btnPrimary: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textWhite
  },
  btnAccept: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.accent
  },
  btnAcceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textWhite
  },
  btnReject: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.borderDark
  },
  btnRejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger
  }
});

export default ConnectionsScreen;
