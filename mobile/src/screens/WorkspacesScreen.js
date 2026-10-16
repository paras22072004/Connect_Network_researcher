import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getWorkspacesApi,
  getDiscoverableWorkspacesApi,
  requestWorkspaceAccessApi,
  cancelWorkspaceRequestApi,
  respondToWorkspaceRequestApi,
  getMyWorkspaceRequestsApi,
  getMyWorkspaceInvitationsApi,
  respondToWorkspaceInvitationApi,
  deleteWorkspaceApi
} from '../services/workspaceService';
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
  const [activeTab, setActiveTab] = useState('my');
  const [requestsSubTab, setRequestsSubTab] = useState('incoming');
  const [myWorkspaces, setMyWorkspaces] = useState([]);
  const [discoverWorkspaces, setDiscoverWorkspaces] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [requestRole, setRequestRole] = useState('Researcher');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [actionNotice, setActionNotice] = useState(null);
  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [myRes, discoverRes, sentRes, invitesRes] = await Promise.all([
        getWorkspacesApi().catch(() => ({ success: false, workspaces: [] })),
        getDiscoverableWorkspacesApi().catch(() => ({ success: false, workspaces: [] })),
        getMyWorkspaceRequestsApi().catch(() => ({ success: false, requests: [] })),
        getMyWorkspaceInvitationsApi().catch(() => ({ success: false, invitations: [] }))
      ]);
      if (myRes.success) setMyWorkspaces(myRes.workspaces || []);
      if (discoverRes.success) setDiscoverWorkspaces(discoverRes.workspaces || []);
      if (sentRes.success) setSentRequests(sentRes.requests || []);
      if (invitesRes.success) setMyInvitations(invitesRes.invitations || []);
    } catch (err) {
      console.error('Error fetching workspace data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    loadData(true);
  }, []);

  const incomingRequests = useMemo(() => {
    const list = [];
    myWorkspaces
      .filter((w) => w.isOwner)
      .forEach((w) => {
        const pending = (w.joinRequests || []).filter((r) => r.status === 'pending');
        pending.forEach((r) => {
          list.push({
            ...r,
            workspaceId: w._id,
            workspaceTitle: w.title
          });
        });
      });
    return list;
  }, [myWorkspaces]);

  const handleOpenRequestModal = (ws) => {
    setSelectedWorkspace(ws);
    setRequestRole('Researcher');
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const handleSendRequestAccess = async () => {
    if (!selectedWorkspace) return;
    setSubmittingRequest(true);
    try {
      const res = await requestWorkspaceAccessApi(selectedWorkspace._id, {
        role: requestRole.trim() || 'Researcher',
        message: requestMessage.trim() || 'Excited to contribute to this workspace!'
      });
      if (res.success) {
        showNotice('Access request submitted to workspace organizer!');
        setShowRequestModal(false);
        loadData();
      }
    } catch (err) {
      Alert.alert('Request Failed', err.message || 'Could not send access request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (workspaceId) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel your join request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await cancelWorkspaceRequestApi(workspaceId);
            if (res.success) {
              showNotice('Access request cancelled.');
              loadData();
            }
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not cancel request.');
          }
        }
      }
    ]);
  };

  const handleRespondRequest = async (workspaceId, requestId, action) => {
    try {
      const res = await respondToWorkspaceRequestApi(workspaceId, requestId, action);
      if (res.success) {
        showNotice(action === 'accept' ? 'Member accepted and added to workspace!' : 'Request rejected.');
        loadData();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not process request.');
    }
  };

  const pendingInvitationsCount = useMemo(() => {
    return (myInvitations || []).filter(i => i.status === 'pending').length;
  }, [myInvitations]);

  const handleDeleteWorkspace = (workspaceId, title) => {
    Alert.alert(
      'Delete Workspace',
      `Are you sure you want to delete "${title || 'this workspace'}"? All tasks, milestones, discussions, and member associations will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteWorkspaceApi(workspaceId);
              if (res.success) {
                showNotice('Workspace deleted successfully.');
                loadData();
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete workspace.');
            }
          }
        }
      ]
    );
  };

  const handleRespondInvitation = async (workspaceId, invitationId, action) => {
    try {
      const res = await respondToWorkspaceInvitationApi(workspaceId, invitationId, action);
      if (res.success) {
        showNotice(action === 'accept' ? 'Joined workspace successfully!' : 'Invitation declined.');
        loadData();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not process invitation response.');
    }
  };

  const renderMyWorkspaceCard = ({ item }) => {
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.isOwner ? (
              <View style={styles.ownerBadge}>
                <Ionicons name="ribbon-outline" size={12} color="#B45309" style={{ marginRight: 3 }} />
                <Text style={styles.ownerBadgeText}>Lead / Owner</Text>
              </View>
            ) : (
              <Text style={styles.leadText}>Lead: {item.owner?.name || 'Project Owner'}</Text>
            )}
            {item.isOwner && (
              <TouchableOpacity
                style={styles.cardDeleteBtn}
                onPress={() => handleDeleteWorkspace(item._id, item.title)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete Workspace"
              >
                <Ionicons name="trash-outline" size={14} color={COLORS.danger || '#EF4444'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Tasks Progress</Text>
            <Text style={styles.progressPercent}>
              {item.completedTaskCount || 0} / {item.taskCount || 0} ({progress}%)
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.membersRow}>
            {Array.isArray(item.members) &&
              item.members.slice(0, 4).map((m, idx) => {
                const u = m.user;
                const imgUri =
                  u?.profileImage ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
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
          <View style={styles.footerActionsRight}>
            <View style={styles.milestoneRow}>
              <Ionicons name="flag-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.milestoneText}>
                {item.completedMilestoneCount || 0}/{item.milestoneCount || 0} Milestones
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDiscoverCard = ({ item }) => {
    const isPending = item.myRequestStatus === 'pending';
    const isRejected = item.myRequestStatus === 'rejected';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.discoverTagsRow}>
            <View style={styles.discoverCategoryBadge}>
              <Ionicons name="compass-outline" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.discoverCategoryText}>{item.project?.researchDomain || 'Research Group'}</Text>
            </View>
            {item.project?.desiredTeamSize ? (
              <View style={styles.capacityBadge}>
                <Ionicons name="people-outline" size={11} color={COLORS.textMuted} style={{ marginRight: 3 }} />
                <Text style={styles.capacityText}>Cap: {item.project.desiredTeamSize}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.publicBadge}>
            <Text style={styles.publicBadgeText}>Public</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={3}>
          {item.description}
        </Text>
        <View style={styles.organizerRow}>
          <Image
            source={{
              uri:
                item.owner?.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
            }}
            style={styles.organizerAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.organizerName}>{item.owner?.name || 'Organizer'}</Text>
            <Text style={styles.organizerRole}>
              {item.owner?.role || 'Lead Researcher'} {item.owner?.organization ? `• ${item.owner.organization}` : ''}
            </Text>
          </View>
          <View style={styles.membersCountPill}>
            <Ionicons name="people" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
            <Text style={styles.membersCountText}>{item.memberCount} member{item.memberCount === 1 ? '' : 's'}</Text>
          </View>
        </View>
        <View style={styles.discoverActionRow}>
          {isPending ? (
            <View style={styles.pendingActionBox}>
              <View style={styles.pendingPill}>
                <Ionicons name="time-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
                <Text style={styles.pendingPillText}>Request Pending Approval</Text>
              </View>
              <TouchableOpacity
                style={styles.btnCancelOutline}
                onPress={() => handleCancelRequest(item._id)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCancelOutlineText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : isRejected ? (
            <View style={styles.rejectedPill}>
              <Ionicons name="close-circle-outline" size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.rejectedPillText}>Request Declined</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.btnJoinWorkspace}
              onPress={() => handleOpenRequestModal(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="enter-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnJoinWorkspaceText}>Request to Join Workspace</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderIncomingRequestCard = ({ item }) => {
    const requester = item.user;
    return (
      <View style={styles.card}>
        <View style={styles.reqHeader}>
          <Text style={styles.reqWorkspaceTitle} numberOfLines={1}>
            {item.workspaceTitle}
          </Text>
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>Pending Review</Text>
          </View>
        </View>
        <View style={styles.requesterProfileRow}>
          <Image
            source={{
              uri:
                requester?.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
            }}
            style={styles.requesterAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.requesterName}>{requester?.name || 'Applicant'}</Text>
            <Text style={styles.requesterRole}>
              {requester?.role || 'Researcher'} {requester?.organization ? `• ${requester.organization}` : ''}
            </Text>
            <Text style={styles.reqRoleBadge}>Desired Role: {item.role || 'Member'}</Text>
          </View>
        </View>
        {item.message ? (
          <View style={styles.reqMessageBox}>
            <Text style={styles.reqMessageText}>"{item.message}"</Text>
          </View>
        ) : null}
        <View style={styles.reqButtonsRow}>
          <TouchableOpacity
            style={styles.btnReject}
            onPress={() => handleRespondRequest(item.workspaceId, item._id, 'reject')}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={15} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.btnRejectText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnAccept}
            onPress={() => handleRespondRequest(item.workspaceId, item._id, 'accept')}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={15} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.btnAcceptText}>Accept & Grant Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSentRequestCard = ({ item }) => {
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    const isRejected = item.status === 'rejected';
    return (
      <View style={styles.card}>
        <View style={styles.reqHeader}>
          <Text style={styles.title} numberOfLines={1}>
            {item.workspaceTitle}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isAccepted
                ? { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }
                : isRejected
                ? { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }
                : { backgroundColor: '#FFF8E1', borderColor: '#FFECB3' }
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: isAccepted ? '#2E7D32' : isRejected ? '#C62828' : '#F57F17' }
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        {item.workspaceDescription ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.workspaceDescription}
          </Text>
        ) : null}
        <View style={styles.sentMetaRow}>
          <Text style={styles.sentMetaText}>
            Organizer: <Text style={{ fontWeight: '600', color: COLORS.textMain }}>{item.owner?.name || 'Lead'}</Text>
          </Text>
          <Text style={styles.sentMetaText}>
            Role: <Text style={{ fontWeight: '600', color: COLORS.textMain }}>{item.requestedRole || 'Member'}</Text>
          </Text>
        </View>
        {isPending && (
          <View style={styles.sentActionRow}>
            <TouchableOpacity
              style={styles.btnCancelOutline}
              onPress={() => handleCancelRequest(item.workspaceId)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={13} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.btnCancelOutlineText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderInvitationCard = ({ item }) => {
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    const isRejected = item.status === 'rejected';

    return (
      <View style={styles.card}>
        <View style={styles.reqHeader}>
          <Text style={styles.reqWorkspaceTitle} numberOfLines={1}>
            {item.workspaceTitle}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isAccepted
                ? { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }
                : isRejected
                ? { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }
                : { backgroundColor: '#FFF8E1', borderColor: '#FFECB3' }
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: isAccepted ? '#2E7D32' : isRejected ? '#C62828' : '#F57F17' }
              ]}
            >
              {isPending ? 'INVITATION' : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {item.workspaceDescription ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.workspaceDescription}
          </Text>
        ) : null}

        <View style={styles.requesterProfileRow}>
          <Image
            source={{
              uri:
                item.owner?.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
            }}
            style={styles.requesterAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.requesterName}>{item.owner?.name || 'Workspace Organizer'}</Text>
            <Text style={styles.requesterRole}>
              {item.owner?.role || 'Lead Researcher'} {item.owner?.organization ? `• ${item.owner.organization}` : ''}
            </Text>
            <Text style={styles.reqRoleBadge}>Role Offered: {item.role || 'Researcher'}</Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.reqButtonsRow}>
            <TouchableOpacity
              style={styles.btnReject}
              onPress={() => handleRespondInvitation(item.workspaceId, item.invitationId, 'reject')}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={15} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.btnRejectText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnAccept}
              onPress={() => handleRespondInvitation(item.workspaceId, item.invitationId, 'accept')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={15} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.btnAcceptText}>Accept & Join</Text>
            </TouchableOpacity>
          </View>
        ) : isAccepted ? (
          <TouchableOpacity
            style={[styles.btnJoinWorkspace, { marginTop: 10 }]}
            onPress={() => navigation.navigate('WorkspaceDetail', { workspaceId: item.workspaceId })}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.btnJoinWorkspaceText}>Open Workspace</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {actionNotice ? (
        <View style={styles.actionNoticeBox}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.actionNoticeText}>{actionNotice}</Text>
        </View>
      ) : null}

      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.screenHeading}>Research Workspaces</Text>
          <Text style={styles.screenSub}>Form teams, track tasks, and collaborate on research.</Text>
        </View>
        <TouchableOpacity
          style={styles.btnNew}
          onPress={() => navigation.navigate('CreateWorkspace')}
          activeOpacity={0.8}
        >
          <View style={styles.btnContentRow}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.btnNewText}>New Workspace</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Responsive Segmented Top Tabs */}
      <View style={styles.segmentedTabBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'my' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.segmentBtnText, activeTab === 'my' && styles.segmentBtnTextActive]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            My Workspaces{myWorkspaces.length > 0 ? ` (${myWorkspaces.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'discover' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('discover')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.segmentBtnText, activeTab === 'discover' && styles.segmentBtnTextActive]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            Discover{discoverWorkspaces.length > 0 ? ` (${discoverWorkspaces.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'requests' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.segmentBtnText, activeTab === 'requests' && styles.segmentBtnTextActive]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            Requests
          </Text>
          {(incomingRequests.length + pendingInvitationsCount) > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{incomingRequests.length + pendingInvitationsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'requests' && (
        <View style={styles.subPillsRow}>
          <TouchableOpacity
            style={[styles.subPill, requestsSubTab === 'incoming' && styles.subPillActive]}
            onPress={() => setRequestsSubTab('incoming')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subPillText, requestsSubTab === 'incoming' && styles.subPillTextActive]}>
              Incoming{incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subPill, requestsSubTab === 'invitations' && styles.subPillActive]}
            onPress={() => setRequestsSubTab('invitations')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subPillText, requestsSubTab === 'invitations' && styles.subPillTextActive]}>
              Invitations{pendingInvitationsCount > 0 ? ` (${pendingInvitationsCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subPill, requestsSubTab === 'sent' && styles.subPillActive]}
            onPress={() => setRequestsSubTab('sent')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subPillText, requestsSubTab === 'sent' && styles.subPillTextActive]}>
              My Sent{sentRequests.length > 0 ? ` (${sentRequests.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <LoadingView message="Loading collaboration workspaces..." />
      ) : activeTab === 'my' ? (
        <FlatList
          data={myWorkspaces}
          keyExtractor={(item) => item._id}
          renderItem={renderMyWorkspaceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <EmptyStateView
              title="No Research Workspaces"
              description="Create a workspace or discover an open research group to collaborate on papers and projects."
            >
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateWorkspace')}
                activeOpacity={0.8}
              >
                <View style={styles.btnContentRow}>
                  <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.emptyBtnText}>Create Your First Workspace</Text>
                </View>
              </TouchableOpacity>
            </EmptyStateView>
          }
        />
      ) : activeTab === 'discover' ? (
        <FlatList
          data={discoverWorkspaces}
          keyExtractor={(item) => item._id}
          renderItem={renderDiscoverCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <EmptyStateView
              title="No Workspaces to Discover"
              description="There are currently no public research workspaces looking for collaborators. Check back soon or create your own!"
            />
          }
        />
      ) : requestsSubTab === 'incoming' ? (
        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderIncomingRequestCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <EmptyStateView
              title="No Pending Requests"
              description="You have no pending requests to join your research workspaces."
            />
          }
        />
      ) : requestsSubTab === 'invitations' ? (
        <FlatList
          data={myInvitations}
          keyExtractor={(item) => item.invitationId || item._id}
          renderItem={renderInvitationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <EmptyStateView
              title="No Workspace Invitations"
              description="When a workspace organizer invites you to join their project team, it will appear here."
            />
          }
        />
      ) : (
        <FlatList
          data={sentRequests}
          keyExtractor={(item) => item.requestId || item._id}
          renderItem={renderSentRequestCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <EmptyStateView
              title="No Sent Requests"
              description="You haven't requested to join any public research workspaces yet."
            />
          }
        />
      )}

      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Workspace Access</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Request to join <Text style={{ fontWeight: '700', color: COLORS.textMain }}>{selectedWorkspace?.title}</Text>
            </Text>
            <Text style={styles.inputLabel}>Your Role / Contribution</Text>
            <TextInput
              style={styles.textInput}
              value={requestRole}
              onChangeText={setRequestRole}
              placeholder="e.g. ML Researcher, Frontend Engineer, Data Analyst"
              placeholderTextColor={COLORS.textLight}
            />
            <Text style={styles.inputLabel}>Message to Organizer (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={requestMessage}
              onChangeText={setRequestMessage}
              placeholder="Introduce your relevant experience and why you'd like to collaborate..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowRequestModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={handleSendRequestAccess}
                activeOpacity={0.8}
                disabled={submittingRequest}
              >
                {submittingRequest ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  actionNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9'
  },
  actionNoticeText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    flex: 1
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary
  },
  screenSub: {
    fontSize: 12,
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
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || 'rgba(0,0,0,0.08)',
    gap: 4
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 18,
    backgroundColor: 'transparent'
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9'
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center'
  },
  segmentBtnTextActive: {
    color: COLORS.primary || '#15803D',
    fontWeight: '700'
  },
  tabBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 3
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700'
  },
  subPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bgMain
  },
  subPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8
  },
  subPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  subPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  subPillTextActive: {
    color: '#ffffff',
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
  footerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  milestoneText: {
    fontSize: 11,
    color: COLORS.textLight
  },
  discoverTagsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  discoverCategoryBadge: {
    backgroundColor: '#EAEFEA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6
  },
  discoverCategoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  capacityBadge: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  capacityText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  publicBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4
  },
  publicBadgeText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '700'
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  organizerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10
  },
  organizerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  organizerRole: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  membersCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  membersCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary
  },
  discoverActionRow: {
    marginTop: 2
  },
  btnJoinWorkspace: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnJoinWorkspaceText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  pendingActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  pendingPillText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600'
  },
  rejectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  rejectedPillText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600'
  },
  btnCancelOutline: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnCancelOutlineText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600'
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  reqWorkspaceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
    marginRight: 8
  },
  requesterProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  requesterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  requesterName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  requesterRole: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  reqRoleBadge: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2
  },
  reqMessageBox: {
    backgroundColor: COLORS.bgInput,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  reqMessageText: {
    fontSize: 12,
    color: COLORS.textMain,
    fontStyle: 'italic'
  },
  reqButtonsRow: {
    flexDirection: 'row',
    gap: 8
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 9,
    borderRadius: 8
  },
  btnRejectText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700'
  },
  btnAccept: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 8
  },
  btnAcceptText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  sentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8
  },
  sentMetaText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  sentActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    ...SHADOWS.md
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textMain,
    marginBottom: 14
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6
  },
  modalBtnCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  modalBtnSubmit: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalBtnSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  cardDeleteBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4
  }
});

export default WorkspacesScreen;