import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/authService';
import LoadingView from '../components/LoadingView';
import { COLORS, SHADOWS } from '../theme/theme';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  const fetchLatestProfile = async () => {
    setRefreshing(true);
    try {
      const res = await getMe();
      if (res.success && res.user) {
        updateUser(res.user);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const completeness = useMemo(() => {
    if (!user) return { score: 0, missing: [] };

    let score = 0;
    const missing = [];

    if (user.name) score += 15;
    else missing.push('Full Name');

    if (user.profileImage) score += 15;
    else missing.push('Profile Photo');

    if (user.role) score += 10;
    else missing.push('Professional Role');

    if (user.organization) score += 10;
    else missing.push('Organization');

    if (user.bio && user.bio.trim().length > 10) score += 15;
    else missing.push('About / Bio');

    if (Array.isArray(user.skills) && user.skills.length > 0) score += 15;
    else missing.push('Skills');

    if (Array.isArray(user.researchInterests) && user.researchInterests.length > 0) score += 10;
    else missing.push('Research Interests');

    if (
      (Array.isArray(user.projects) && user.projects.length > 0) ||
      (Array.isArray(user.publications) && user.publications.length > 0)
    ) {
      score += 10;
    } else {
      missing.push('Projects or Publications');
    }

    return {
      score: Math.min(score, 100),
      missing
    };
  }, [user]);

  if (!user) return <LoadingView message="Loading user profile..." />;

  const profileImage =
    user.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={fetchLatestProfile}
          tintColor={COLORS.primary || '#007AFF'}
          colors={[COLORS.primary || '#007AFF']}
        />
      }
    >
      {/* 1. Header Profile Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: profileImage }} style={styles.avatar} />
          {Boolean(user.discoverable) && <View style={styles.activeBeaconDot} />}
        </View>

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role || 'Add Professional Role'}</Text>
        <Text style={styles.org}>{user.organization || 'Add Organization'}</Text>

        <View style={styles.statusPillRow}>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: user.discoverable ? '#34C759' : '#8E8E93' }
              ]}
            />
            <Text style={styles.statusPillText}>
              {user.discoverable ? 'Discoverable (1km)' : 'Hidden'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.btnPrimaryText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={16} color={COLORS.textMain || '#1C1C1E'} style={styles.btnIcon} />
            <Text style={styles.btnOutlineText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Profile Completeness Indicator */}
      <View style={styles.sectionCard}>
        <View style={styles.completenessHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.completenessTitle}>Profile Strength</Text>
            <Text style={styles.completenessSub}>
              {completeness.score === 100
                ? 'All-Star Profile: Maximum discovery match potential!'
                : `Complete ${completeness.missing[0] || 'details'} to boost AI matchmaking.`}
            </Text>
          </View>
          <View style={styles.completenessScoreBadge}>
            <Text style={styles.completenessScoreText}>{completeness.score}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completeness.score}%` }]} />
        </View>

        {completeness.score < 100 && (
          <TouchableOpacity
            style={styles.completenessAction}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Text style={styles.completenessActionText}>
              + Add {completeness.missing.slice(0, 2).join(' & ')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary || '#007AFF'} />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Research & Collaboration Hub */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Collaboration Hub</Text>
        <View style={styles.hubGrid}>
          <TouchableOpacity
            style={styles.hubTile}
            onPress={() => navigation.navigate('QRProfile')}
            activeOpacity={0.7}
          >
            <View style={styles.hubIconBg}>
              <Ionicons name="qr-code-outline" size={20} color={COLORS.primary || '#007AFF'} />
            </View>
            <Text style={styles.hubTileTitle}>My QR Code</Text>
            <Text style={styles.hubTileSub}>Share profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubTile}
            onPress={() => navigation.navigate('TeamBuilder')}
            activeOpacity={0.7}
          >
            <View style={styles.hubIconBg}>
              <Ionicons name="people-outline" size={20} color={COLORS.primary || '#007AFF'} />
            </View>
            <Text style={styles.hubTileTitle}>Build a Team</Text>
            <Text style={styles.hubTileSub}>AI match</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubTile}
            onPress={() => navigation.navigate('Workspaces')}
            activeOpacity={0.7}
          >
            <View style={styles.hubIconBg}>
              <Ionicons name="flask-outline" size={20} color={COLORS.primary || '#007AFF'} />
            </View>
            <Text style={styles.hubTileTitle}>Workspaces</Text>
            <Text style={styles.hubTileSub}>Manage tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubTile}
            onPress={() => navigation.navigate('Events')}
            activeOpacity={0.7}
          >
            <View style={styles.hubIconBg}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary || '#007AFF'} />
            </View>
            <Text style={styles.hubTileTitle}>Events</Text>
            <Text style={styles.hubTileSub}>Conferences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hubTile, { width: '100%', flexDirection: 'row', alignItems: 'center' }]}
            onPress={() => navigation.navigate('ResearchDiscovery')}
            activeOpacity={0.7}
          >
            <View style={[styles.hubIconBg, { marginRight: 12, marginBottom: 0 }]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary || '#007AFF'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hubTileTitle}>Explore Research Papers</Text>
              <Text style={styles.hubTileSub}>Search academic preprints & collaborative authors</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted || '#8E8E93'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. About / Bio */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About / Bio</Text>
        <Text style={styles.bioText}>
          {user.bio || 'Add a short bio describing your research background and professional goals.'}
        </Text>
      </View>

      {/* 5. Research Interests */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Research Interests {user.researchInterests ? `(${user.researchInterests.length})` : ''}
        </Text>
        {user.researchInterests && user.researchInterests.length > 0 ? (
          <View style={styles.pillsRow}>
            {user.researchInterests.map((interest, idx) => (
              <View key={idx} style={[styles.pill, styles.interestPill]}>
                <Text style={styles.interestPillText}>{interest}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyFieldText}>
            No research interests added yet. Click Edit Profile to add topics.
          </Text>
        )}
      </View>

      {/* 6. Technical Skills */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Technical Skills {user.skills ? `(${user.skills.length})` : ''}
        </Text>
        {user.skills && user.skills.length > 0 ? (
          <View style={styles.pillsRow}>
            {user.skills.map((skill, idx) => (
              <View key={idx} style={styles.pill}>
                <Text style={styles.pillText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyFieldText}>
            No technical skills added yet. Click Edit Profile to add skills.
          </Text>
        )}
      </View>

      {/* 7. Research Publications */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Research Publications {user.publications ? `(${user.publications.length})` : ''}
        </Text>
        {user.publications && user.publications.length > 0 ? (
          user.publications.map((pub, idx) => (
            <View key={idx} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{pub.title}</Text>
              {pub.abstract ? <Text style={styles.itemDesc}>{pub.abstract}</Text> : null}
              {pub.publicationVenue ? (
                <Text style={styles.itemMeta}>Venue: {pub.publicationVenue}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyFieldText}>
            No publications listed yet. Publications enhance academic networking.
          </Text>
        )}
      </View>

      {/* 8. Featured Projects */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Projects {user.projects ? `(${user.projects.length})` : ''}
        </Text>
        {user.projects && user.projects.length > 0 ? (
          user.projects.map((proj, idx) => (
            <View key={idx} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{proj.title}</Text>
              {proj.description ? <Text style={styles.itemDesc}>{proj.description}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyFieldText}>
            No projects added yet. Highlight research implementations here.
          </Text>
        )}
      </View>

      {/* 9. Account & Session Management */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account & Session</Text>
        <Text style={styles.sessionEmailText}>Signed in as {user?.email}</Text>
        <TouchableOpacity
          style={styles.fullLogoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Log out of GeoConnect"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.fullLogoutBtnText}>Log Out of GeoConnect</Text>
        </TouchableOpacity>
      </View>

      {/* Cross-Platform Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out-outline" size={26} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out of GeoConnect? You will need to log back in to access your connections, messages, and workspaces.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.modalLogoutText}>Yes, Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain || '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E5E5EA',
  },
  activeBeaconDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.4,
  },
  role: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary || '#007AFF',
    marginTop: 2,
  },
  org: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
    marginTop: 2,
  },
  statusPillRow: {
    marginTop: 10,
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    color: COLORS.secondary || '#3A3A3C',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary || '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    flex: 1,
  },
  btnIcon: {
    marginRight: 6,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    flex: 1,
  },
  btnOutlineText: {
    color: COLORS.textMain || '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hubTile: {
    width: '48%',
    backgroundColor: COLORS.bgInput || '#F8F9FA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border || '#E5E5EA',
  },
  hubIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,122,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hubTileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  hubTileSub: {
    fontSize: 11,
    color: COLORS.textMuted || '#8E8E93',
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    color: COLORS.secondary || '#3C3C43',
    lineHeight: 20,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.secondary || '#3C3C43',
    fontWeight: '500',
  },
  interestPill: {
    backgroundColor: 'rgba(0,122,255,0.08)',
  },
  interestPillText: {
    fontSize: 13,
    color: COLORS.primary || '#007AFF',
    fontWeight: '600',
  },
  emptyFieldText: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
    fontStyle: 'italic',
  },
  itemCard: {
    backgroundColor: COLORS.bgInput || '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textMuted || '#636366',
    marginTop: 4,
    lineHeight: 17,
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.primary || '#007AFF',
    marginTop: 6,
    fontWeight: '600',
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completenessTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  completenessSub: {
    fontSize: 12,
    color: COLORS.textMuted || '#8E8E93',
    marginTop: 2,
  },
  completenessScoreBadge: {
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completenessScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary || '#007AFF',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: COLORS.bgInput || '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary || '#007AFF',
    borderRadius: 3,
  },
  completenessAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  completenessActionText: {
    fontSize: 13,
    color: COLORS.primary || '#007AFF',
    fontWeight: '600',
  },
  btnLogoutSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    minWidth: 80,
  },
  btnLogoutSmallText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  sessionEmailText: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
    marginBottom: 12,
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  fullLogoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconText: {
    fontSize: 26,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.1)',
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textMain || '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
  modalLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalLogoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProfileScreen;