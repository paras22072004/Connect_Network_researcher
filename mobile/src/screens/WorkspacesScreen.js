import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkspacesApi } from '../services/workspaceService';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const getStatusColor = (status = '') => {
  switch (status.toLowerCase()) {
    case 'completed':
      return { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' };
    case 'in progress':
      return { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' };
    case 'planning':
      return { bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' };
    default:
      return { bg: '#F5F5F5', text: '#616161', border: '#E0E0E0' };
  }
};

const WorkspacesScreen = ({ navigation }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkspaces = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getWorkspacesApi();
      if (res.success) {
        setWorkspaces(res.workspaces || []);
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchWorkspaces();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    fetchWorkspaces(true);
  }, []);

  const renderWorkspaceCard = ({ item }) => {
    const statusStyle = getStatusColor(item.status);
    const progress = item.progressPercent || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('WorkspaceDetail', { workspaceId: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
          {item.isOwner ? (
            <View style={styles.ownerBadge}>
              <Ionicons name="ribbon-outline" size={12} color="#B45309" style={{ marginRight: 3 }} />
              <Text style={styles.ownerBadgeText}>Lead / Owner</Text>
            </View>
          ) : (
            <Text style={styles.leadText}>Lead: {item.owner?.name || 'Project Owner'}</Text>
          )}
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Tasks Progress</Text>
            <Text style={styles.progressPercent}>{item.completedTaskCount || 0} / {item.taskCount || 0} ({progress}%)</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Footer: Member avatars & Milestones count */}
        <View style={styles.cardFooter}>
          <View style={styles.membersRow}>
            {Array.isArray(item.members) && item.members.slice(0, 4).map((m, idx) => {
              const u = m.user;
              const imgUri = u?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
              return (
                <Image
                  key={idx}
                  source={{ uri: imgUri }}
                  style={[styles.memberAvatar, { marginLeft: idx > 0 ? -10 : 0 }]}
                />
              );
            })}
            {Array.isArray(item.members) && item.members.length > 4 ? (
              <View style={[styles.memberAvatar, styles.moreMembersCircle]}>
                <Text style={styles.moreMembersText}>+{item.members.length - 4}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.milestoneRow}>
            <Ionicons name="flag-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.milestoneText}>
              {item.completedMilestoneCount || 0}/{item.milestoneCount || 0} Milestones
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.screenHeading}>Research Workspaces</Text>
          <Text style={styles.screenSub}>Track team tasks, milestones, and shared research notes.</Text>
        </View>
        <TouchableOpacity
          style={styles.btnNew}
          onPress={() => navigation.navigate('CreateWorkspace')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Create New Project"
        >
          <View style={styles.btnContentRow}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.btnNewText}>New Project</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <LoadingView message="Loading collaboration workspaces..." />
      ) : (
        <FlatList
          data={workspaces}
          keyExtractor={(item) => item._id}
          renderItem={renderWorkspaceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <EmptyStateView
              title="No Research Workspaces"
              description="Create a workspace for your research team or project, assign tasks, and collaborate with your accepted connections."
            >
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateWorkspace')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Create Your First Workspace"
              >
                <View style={styles.btnContentRow}>
                  <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.emptyBtnText}>Create Your First Workspace</Text>
                </View>
              </TouchableOpacity>
            </EmptyStateView>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  screenHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary
  },
  screenSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  btnNew: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  btnNewText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  listContent: {
    padding: 14,
    paddingBottom: 40
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    ...SHADOWS.sm
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  ownerBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  ownerBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '600'
  },
  leadText: {
    fontSize: 11,
    color: COLORS.textLight
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6
  },
  desc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 12
  },
  progressContainer: {
    marginBottom: 12
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: COLORS.bgInput,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff'
  },
  moreMembersCircle: {
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10
  },
  moreMembersText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  milestoneText: {
    fontSize: 11,
    color: COLORS.textLight
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});

export default WorkspacesScreen;
