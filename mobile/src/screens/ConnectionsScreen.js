import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [pendingFilter, setPendingFilter] = useState('all'); // 'all' | 'incoming' | 'outgoing'
  const [searchQuery, setSearchQuery] = useState('');

  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [selectedProfile, setSelectedProfile] = useState(null);

  const fetchConnectionsData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      if (activeTab === 'accepted') {
        const res = await getAcceptedConnections();
        if (res.success) {
          setConnections(res.connections || []);
        } else {
          setError(res.message || 'Failed to load connections.');
        }
      } else {
        const res = await getConnectionRequests();
        if (res.success) {
          setIncomingRequests(res.incoming || []);
          setOutgoingRequests(res.outgoing || []);
        } else {
          setError(res.message || 'Failed to load requests.');
        }
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError(err.response?.data?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    fetchConnectionsData(true);
  }, [activeTab]);

  const handleAccept = async (connectionId) => {
    setActionLoadingId(connectionId);
    try {
      const res = await acceptConnectionRequest(connectionId);
      if (res.success) {
        await fetchConnectionsData();
      } else {
        setError(res.message || 'Failed to accept request.');
      }
    } catch (err) {
      console.error('Accept error:', err);
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (connectionId) => {
    setActionLoadingId(connectionId);
    try {
      const res = await rejectConnectionRequest(connectionId);
      if (res.success) {
        await fetchConnectionsData();
      } else {
        setError(res.message || 'Failed to decline request.');
      }
    } catch (err) {
      console.error('Reject error:', err);
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (connectionId) => {
    setActionLoadingId(connectionId);
    try {
      const res = await cancelConnectionRequest(connectionId);
      if (res.success) {
        await fetchConnectionsData();
      } else {
        setError(res.message || 'Failed to cancel request.');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter connections by search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const q = searchQuery.toLowerCase().trim();
    return connections.filter((item) => {
      const u = item.user;
      return (
        u?.name?.toLowerCase().includes(q) ||
        u?.role?.toLowerCase().includes(q) ||
        u?.organization?.toLowerCase().includes(q) ||
        (Array.isArray(u?.skills) && u.skills.some((s) => String(s).toLowerCase().includes(q)))
      );
    });
  }, [connections, searchQuery]);

  // Filter pending requests by search query & sub-tab
  const filteredPending = useMemo(() => {
    let combined = [];
    if (pendingFilter === 'all' || pendingFilter === 'incoming') {
      combined = [...combined, ...incomingRequests.map((r) => ({ ...r, isIncoming: true }))];
    }
    if (pendingFilter === 'all' || pendingFilter === 'outgoing') {
      combined = [...combined, ...outgoingRequests.map((r) => ({ ...r, isIncoming: false }))];
    }

    if (!searchQuery.trim()) return combined;
    const q = searchQuery.toLowerCase().trim();
    return combined.filter((item) => {
      const u = item.user;
      return (
        u?.name?.toLowerCase().includes(q) ||
        u?.role?.toLowerCase().includes(q) ||
        u?.organization?.toLowerCase().includes(q)
      );
    });
  }, [incomingRequests, outgoingRequests, pendingFilter, searchQuery]);

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
          activeOpacity={0.8}
          accessibilityLabel={`View profile of ${connectedUser?.name}`}
          accessibilityRole="button"
        >
          <Image source={{ uri: profileImage }} style={styles.avatar} />
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{connectedUser?.name}</Text>
              <View style={styles.statusBadgeConnected}>
                <Text style={styles.statusBadgeTextConnected}>Connected</Text>
              </View>
            </View>
            <Text style={styles.role} numberOfLines={1}>{connectedUser?.role || 'Professional'}</Text>
            <Text style={styles.org} numberOfLines={1}>{connectedUser?.organization || 'GeoConnect Network'}</Text>
          </View>
        </TouchableOpacity>

        {/* Skills preview */}
        {Array.isArray(connectedUser?.skills) && connectedUser.skills.length > 0 && (
          <View style={styles.skillsRow}>
            {connectedUser.skills.slice(0, 3).map((skill, idx) => (
              <View key={idx} style={styles.skillPill}>
                <Text style={styles.skillPillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => setSelectedProfile(connectedUser)}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Text style={styles.btnOutlineText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Chat', { connectedUser })}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${connectedUser?.name}`}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.btnPrimaryText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPendingItem = ({ item }) => {
    const user = item.user;
    const isBusy = actionLoadingId === item.connectionId;
    const profileImage =
      user?.profileImage ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setSelectedProfile(user)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: profileImage }} style={styles.avatar} />
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
              <View style={item.isIncoming ? styles.statusBadgeIncoming : styles.statusBadgeOutgoing}>
                <Text style={item.isIncoming ? styles.statusBadgeTextIncoming : styles.statusBadgeTextOutgoing}>
                  {item.isIncoming ? 'Incoming' : 'Sent'}
                </Text>
              </View>
            </View>
            <Text style={styles.role} numberOfLines={1}>{user?.role || 'Professional'}</Text>
            <Text style={styles.org} numberOfLines={1}>{user?.organization || 'Verified Member'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          {item.isIncoming ? (
            <>
              <TouchableOpacity
                style={[styles.btnAccept, isBusy && styles.btnDisabled]}
                onPress={() => handleAccept(item.connectionId)}
                disabled={isBusy}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnAcceptText}>Accept</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnReject, isBusy && styles.btnDisabled]}
                onPress={() => handleReject(item.connectionId)}
                disabled={isBusy}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <Text style={styles.btnRejectText}>Decline</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.btnReject, isBusy && styles.btnDisabled]}
              onPress={() => handleCancel(item.connectionId)}
              disabled={isBusy}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={COLORS.danger || '#FF3B30'} />
              ) : (
                <Text style={styles.btnRejectText}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => setSelectedProfile(user)}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Text style={styles.btnOutlineText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Tabs Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={COLORS.textMuted || '#8E8E93'} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'accepted' ? 'Search connections by name or skill...' : 'Search pending requests...'}
            placeholderTextColor={COLORS.textMuted || '#8E8E93'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted || '#8E8E93'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Main Tab Selector */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'accepted' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('accepted');
              setSearchQuery('');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'accepted' }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'accepted' && styles.tabBtnTextActive]}>
              Accepted ({connections.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('pending');
              setSearchQuery('');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'pending' }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}>
              Pending ({incomingRequests.length + outgoingRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sub-filters for Pending Requests */}
        {activeTab === 'pending' && (
          <View style={styles.subFilterRow}>
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'incoming', label: `Received (${incomingRequests.length})` },
              { id: 'outgoing', label: `Sent (${outgoingRequests.length})` }
            ].map((sf) => (
              <TouchableOpacity
                key={sf.id}
                style={[styles.subFilterPill, pendingFilter === sf.id && styles.subFilterPillActive]}
                onPress={() => setPendingFilter(sf.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subFilterText, pendingFilter === sf.id && styles.subFilterTextActive]}>
                  {sf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Error Banner with Retry */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchConnectionsData()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Content Area */}
      {loading && !refreshing ? (
        <LoadingView message="Loading connections..." />
      ) : activeTab === 'accepted' ? (
        <FlatList
          data={filteredConnections}
          keyExtractor={(item) => item.connectionId}
          renderItem={renderConnectionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary || '#007AFF'}
              colors={[COLORS.primary || '#007AFF']}
            />
          }
          ListEmptyComponent={
            <EmptyStateView
              title="No Connections Found"
              description={
                searchQuery
                  ? `No connections matching "${searchQuery}".`
                  : 'Discover nearby professionals on the Discover map and connect with peers.'
              }
            />
          }
        />
      ) : (
        <FlatList
          data={filteredPending}
          keyExtractor={(item) => item.connectionId}
          renderItem={renderPendingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary || '#007AFF'}
              colors={[COLORS.primary || '#007AFF']}
            />
          }
          ListEmptyComponent={
            <EmptyStateView
              title="No Pending Requests"
              description={
                searchQuery
                  ? `No pending requests matching "${searchQuery}".`
                  : 'You currently have no pending incoming or outgoing connection requests.'
              }
            />
          }
        />
      )}

      {/* Profile Details Modal */}
      {selectedProfile && (
        <ProfileModalView
          visible={!!selectedProfile}
          user={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onOpenMessage={(connectedUser) => {
            setSelectedProfile(null);
            navigation.navigate('Chat', { connectedUser });
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain || '#F2F2F7',
  },
  searchHeader: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border || 'rgba(0,0,0,0.08)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput || '#EFEFF4',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain || '#1C1C1E',
    paddingVertical: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: COLORS.bgInput || '#EFEFF4',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
    }),
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted || '#8E8E93',
  },
  tabBtnTextActive: {
    color: COLORS.textMain || '#1C1C1E',
    fontWeight: '600',
  },
  subFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  subFilterPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput || '#EFEFF4',
  },
  subFilterPillActive: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  subFilterText: {
    fontSize: 12,
    color: COLORS.secondary || '#3C3C43',
    fontWeight: '500',
  },
  subFilterTextActive: {
    color: COLORS.primary || '#007AFF',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 0.5,
    borderColor: '#FCA5A5',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E5E5EA',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    flex: 1,
    marginRight: 6,
    letterSpacing: -0.2,
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(0,122,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeTextConnected: {
    fontSize: 11,
    color: COLORS.primary || '#007AFF',
    fontWeight: '600',
  },
  statusBadgeIncoming: {
    backgroundColor: 'rgba(52,199,89,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeTextIncoming: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  statusBadgeOutgoing: {
    backgroundColor: 'rgba(255,149,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeTextOutgoing: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
  },
  role: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary || '#007AFF',
    marginTop: 1,
  },
  org: {
    fontSize: 12,
    color: COLORS.textMuted || '#8E8E93',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  skillPill: {
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillPillText: {
    fontSize: 11,
    color: COLORS.secondary || '#3C3C43',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border || 'rgba(0,0,0,0.06)',
  },
  btnOutline: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.bgInput || '#F2F2F7',
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary || '#007AFF',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  btnAccept: {
    backgroundColor: COLORS.primary || '#007AFF',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 18,
    minWidth: 70,
    alignItems: 'center',
  },
  btnAcceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  btnReject: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  btnRejectText: {
    color: COLORS.danger || '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default ConnectionsScreen;