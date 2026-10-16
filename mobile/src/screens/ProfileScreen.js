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
  Modal,
  Alert,
  TextInput,
  Linking,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/authService';
import {
  addProjectApi,
  updateProjectApi,
  deleteProjectApi,
  addResearchTopicApi,
  updateResearchTopicApi,
  deleteResearchTopicApi,
  updateUserProfile
} from '../services/userService';
import LoadingView from '../components/LoadingView';
import CatalogMultiSelect from '../components/CatalogMultiSelect';
import { COLORS, SHADOWS } from '../theme/theme';
import { getAvatarUri } from '../constants/avatars';

const PROJECT_STATUSES = ['In Progress', 'Completed', 'Planning', 'Active', 'Archived'];

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Expandable description states
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

  // Research Topic Modal state
  const [researchModalVisible, setResearchModalVisible] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDomain, setTopicDomain] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicSkills, setTopicSkills] = useState([]);
  const [savingTopic, setSavingTopic] = useState(false);
  const [topicError, setTopicError] = useState('');

  // Project Modal state
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectStatus, setProjectStatus] = useState('In Progress');
  const [projectDomain, setProjectDomain] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectTech, setProjectTech] = useState([]);
  const [projectLink, setProjectLink] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [projectError, setProjectError] = useState('');

  const toggleTopicExpand = (id) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProjectExpand = (id) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Open Research Topic Modal (for add or edit)
  const openAddResearchModal = () => {
    setEditingTopicId(null);
    setTopicTitle('');
    setTopicDomain('');
    setTopicDesc('');
    setTopicSkills([]);
    setTopicError('');
    setResearchModalVisible(true);
  };

  const openEditResearchModal = (topic) => {
    setEditingTopicId(topic._id || null);
    setTopicTitle(topic.title || '');
    setTopicDomain(topic.domain || '');
    setTopicDesc(topic.description || '');
    setTopicSkills(
      Array.isArray(topic.skills)
        ? topic.skills
        : (topic.skills ? topic.skills.split(',').map((s) => s.trim()).filter(Boolean) : [])
    );
    setTopicError('');
    setResearchModalVisible(true);
  };

  const handleSaveResearchTopic = async () => {
    const trimmedTitle = topicTitle.trim();
    if (!trimmedTitle) {
      setTopicError('Research topic title is required.');
      return;
    }

    // Prevent duplicate entries
    const existing = user?.researchTopics || [];
    const isDuplicate = existing.some(
      (t) =>
        t.title.toLowerCase() === trimmedTitle.toLowerCase() &&
        t._id?.toString() !== editingTopicId?.toString()
    );
    if (isDuplicate) {
      setTopicError('A research focus with this title already exists.');
      return;
    }

    setSavingTopic(true);
    setTopicError('');

    try {
      const skillsArray = Array.isArray(topicSkills)
        ? topicSkills
        : (topicSkills ? topicSkills.split(',').map((s) => s.trim()).filter(Boolean) : []);

      const finalDomain = typeof topicDomain === 'string'
        ? topicDomain.trim()
        : (Array.isArray(topicDomain) ? topicDomain[0] || '' : '');

      const payload = {
        title: trimmedTitle,
        domain: finalDomain,
        description: topicDesc.trim(),
        skills: skillsArray
      };

      if (editingTopicId && editingTopicId.length === 24) {
        const res = await updateResearchTopicApi(editingTopicId, payload);
        if (res.success) {
          const meRes = await getMe();
          if (meRes.success && meRes.user) updateUser(meRes.user);
          setResearchModalVisible(false);
        } else {
          setTopicError(res.message || 'Failed to update research topic.');
        }
      } else {
        const res = await addResearchTopicApi(payload);
        if (res.success) {
          const meRes = await getMe();
          if (meRes.success && meRes.user) updateUser(meRes.user);
          setResearchModalVisible(false);
        } else {
          setTopicError(res.message || 'Failed to add research topic.');
        }
      }
    } catch (err) {
      setTopicError(err.response?.data?.message || err.message || 'Failed to save research topic.');
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDeleteResearchTopic = (topic) => {
    Alert.alert(
      'Delete Research Topic',
      `Are you sure you want to remove "${topic.title}" from your profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (topic._id && topic._id.length === 24) {
                const res = await deleteResearchTopicApi(topic._id);
                if (res.success) {
                  const meRes = await getMe();
                  if (meRes.success && meRes.user) updateUser(meRes.user);
                }
              } else {
                // Fallback for legacy topic strings
                const updatedTopics = (user.researchTopics || []).filter(
                  (t) => t.title !== topic.title
                );
                const updatedInterests = (user.researchInterests || []).filter(
                  (i) => i !== topic.title
                );
                const res = await updateUserProfile({
                  researchTopics: updatedTopics,
                  researchInterests: updatedInterests
                });
                if (res.success && res.user) updateUser(res.user);
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete research topic.');
            }
          }
        }
      ]
    );
  };

  // Open Project Modal (for add or edit)
  const openAddProjectModal = () => {
    setEditingProjectId(null);
    setProjectTitle('');
    setProjectStatus('In Progress');
    setProjectDomain('');
    setProjectDesc('');
    setProjectTech([]);
    setProjectLink('');
    setProjectError('');
    setProjectModalVisible(true);
  };

  const openEditProjectModal = (proj) => {
    setEditingProjectId(proj._id || null);
    setProjectTitle(proj.title || '');
    setProjectStatus(proj.status || 'In Progress');
    setProjectDomain(proj.domain || '');
    setProjectDesc(proj.description || '');
    setProjectTech(
      Array.isArray(proj.techStack)
        ? proj.techStack
        : (proj.techStack ? proj.techStack.split(',').map((t) => t.trim()).filter(Boolean) : [])
    );
    setProjectLink(proj.link || '');
    setProjectError('');
    setProjectModalVisible(true);
  };

  const handleSaveProject = async () => {
    const trimmedTitle = projectTitle.trim();
    if (!trimmedTitle) {
      setProjectError('Project title is required.');
      return;
    }

    // Check duplicate
    const existing = user?.projects || [];
    const isDuplicate = existing.some(
      (p) =>
        p.title.toLowerCase() === trimmedTitle.toLowerCase() &&
        p._id?.toString() !== editingProjectId?.toString()
    );
    if (isDuplicate) {
      setProjectError('A project with this title already exists.');
      return;
    }

    // Validate optional URL
    const trimmedLink = projectLink.trim();
    if (trimmedLink) {
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
      if (!urlPattern.test(trimmedLink)) {
        setProjectError('Please enter a valid URL (e.g. https://github.com/...)');
        return;
      }
    }

    setSavingProject(true);
    setProjectError('');

    try {
      const techArray = Array.isArray(projectTech)
        ? projectTech
        : (projectTech ? projectTech.split(',').map((t) => t.trim()).filter(Boolean) : []);

      const finalDomain = typeof projectDomain === 'string'
        ? projectDomain.trim()
        : (Array.isArray(projectDomain) ? projectDomain[0] || '' : '');

      const payload = {
        title: trimmedTitle,
        status: projectStatus,
        domain: finalDomain,
        description: projectDesc.trim(),
        techStack: techArray,
        link: trimmedLink
      };

      if (editingProjectId && editingProjectId.length === 24) {
        const res = await updateProjectApi(editingProjectId, payload);
        if (res.success) {
          const meRes = await getMe();
          if (meRes.success && meRes.user) updateUser(meRes.user);
          setProjectModalVisible(false);
        } else {
          setProjectError(res.message || 'Failed to update project.');
        }
      } else {
        const res = await addProjectApi(payload);
        if (res.success) {
          const meRes = await getMe();
          if (meRes.success && meRes.user) updateUser(meRes.user);
          setProjectModalVisible(false);
        } else {
          setProjectError(res.message || 'Failed to add project.');
        }
      }
    } catch (err) {
      setProjectError(err.response?.data?.message || err.message || 'Failed to save project.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = (proj) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to remove "${proj.title}" from your profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (proj._id && proj._id.length === 24) {
                const res = await deleteProjectApi(proj._id);
                if (res.success) {
                  const meRes = await getMe();
                  if (meRes.success && meRes.user) updateUser(meRes.user);
                }
              } else {
                const updatedProjects = (user.projects || []).filter(
                  (p) => p.title !== proj.title
                );
                const res = await updateUserProfile({ projects: updatedProjects });
                if (res.success && res.user) updateUser(res.user);
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete project.');
            }
          }
        }
      ]
    );
  };

  const handleOpenLink = async (url) => {
    if (!url) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Invalid Link', 'Unable to open the specified URL.');
      }
    } catch (err) {
      Alert.alert('Link Error', 'Could not open project URL.');
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

    if (
      (Array.isArray(user.researchTopics) && user.researchTopics.length > 0) ||
      (Array.isArray(user.researchInterests) && user.researchInterests.length > 0)
    ) {
      score += 10;
    } else {
      missing.push('Research Interests');
    }

    if (
      (Array.isArray(user.projects) && user.projects.length > 0) ||
      (Array.isArray(user.publications) && user.publications.length > 0)
    ) {
      score += 15;
    } else {
      missing.push('Projects or Publications');
    }

    return {
      score: Math.min(score, 100),
      missing
    };
  }, [user]);

  if (!user) return <LoadingView message="Loading user profile..." />;

  const resolvedAvatarUri = getAvatarUri(user.profileImage, user.avatarId);

  // Normalize research topics (prefer structured researchTopics, fallback to string researchInterests)
  const researchTopicsList =
    Array.isArray(user.researchTopics) && user.researchTopics.length > 0
      ? user.researchTopics
      : Array.isArray(user.researchInterests)
      ? user.researchInterests.map((interest, idx) => ({
          _id: `legacy-${idx}`,
          title: interest,
          domain: '',
          description: '',
          skills: []
        }))
      : [];

  const projectsList = Array.isArray(user.projects) ? user.projects : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: '#EBF4EE', text: '#24563B', border: '#C6DEC9' };
      case 'Active':
        return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'Planning':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'Archived':
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
      case 'In Progress':
      default:
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    }
  };

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
          <Image source={{ uri: resolvedAvatarUri }} style={styles.avatar} />
          {Boolean(user.discoverable) && <View style={styles.activeBeaconDot} />}
        </View>

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role || 'Researcher'}</Text>
        <Text style={styles.org}>{user.organization || 'Independent Researcher'}</Text>

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

      {/* 5. MULTIPLE RESEARCH INTERESTS & TOPICS SECTION */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithCountRow}>
            <Text style={styles.sectionTitle}>Research Focus</Text>
            {researchTopicsList.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{researchTopicsList.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.addInlineBtn}
            onPress={openAddResearchModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add research topic"
          >
            <Ionicons name="add-circle" size={17} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addInlineBtnText}>Add Focus</Text>
          </TouchableOpacity>
        </View>

        {researchTopicsList.length > 0 ? (
          <View style={styles.entriesList}>
            {researchTopicsList.map((topic, idx) => {
              const topicKey = topic._id || `topic-${idx}`;
              const isExpanded = Boolean(expandedTopics[topicKey]);
              const isLongDesc = topic.description && topic.description.length > 80;

              return (
                <View key={topicKey} style={styles.entryCard}>
                  {/* Title & Actions Row */}
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.entryTitle}>{topic.title}</Text>
                      {Boolean(topic.domain) && (
                        <View style={styles.domainBadge}>
                          <Ionicons name="school-outline" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
                          <Text style={styles.domainBadgeText}>{topic.domain}</Text>
                        </View>
                      )}
                    </View>

                    {/* Owner controls */}
                    <View style={styles.entryActionsRow}>
                      <TouchableOpacity
                        style={styles.entryActionBtn}
                        onPress={() => openEditResearchModal(topic)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Edit research topic"
                      >
                        <Ionicons name="pencil" size={15} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.entryActionBtn, styles.deleteActionBtn]}
                        onPress={() => handleDeleteResearchTopic(topic)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Delete research topic"
                      >
                        <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Description with Expand/Collapse */}
                  {Boolean(topic.description) && (
                    <View style={styles.descContainer}>
                      <Text
                        style={styles.entryDescText}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {topic.description}
                      </Text>
                      {isLongDesc && (
                        <TouchableOpacity
                          onPress={() => toggleTopicExpand(topicKey)}
                          style={styles.expandToggleBtn}
                        >
                          <Text style={styles.expandToggleText}>
                            {isExpanded ? 'Show Less' : 'Show More'}
                          </Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={12}
                            color={COLORS.primary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Skills / Keywords Chips */}
                  {Array.isArray(topic.skills) && topic.skills.length > 0 && (
                    <View style={styles.entryChipsRow}>
                      {topic.skills.map((skill, sIdx) => (
                        <View key={`skill-${sIdx}`} style={styles.skillChip}>
                          <Text style={styles.skillChipText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="sparkles-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Research Topics Added</Text>
            <Text style={styles.emptyStateDesc}>
              Add multiple research topics and interests to enhance AI matchmaking with collaborators.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateBtn}
              onPress={openAddResearchModal}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.emptyStateBtnText}>Add Research Topic</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 6. MULTIPLE PROJECTS SECTION */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithCountRow}>
            <Text style={styles.sectionTitle}>Featured Projects</Text>
            {projectsList.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{projectsList.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.addInlineBtn}
            onPress={openAddProjectModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add project"
          >
            <Ionicons name="add-circle" size={17} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addInlineBtnText}>Add Project</Text>
          </TouchableOpacity>
        </View>

        {projectsList.length > 0 ? (
          <View style={styles.entriesList}>
            {projectsList.map((proj, idx) => {
              const projKey = proj._id || `proj-${idx}`;
              const isExpanded = Boolean(expandedProjects[projKey]);
              const isLongDesc = proj.description && proj.description.length > 80;
              const statusTheme = getStatusColor(proj.status);

              return (
                <View key={projKey} style={styles.entryCard}>
                  {/* Header Row: Title, Status, and Action Buttons */}
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.entryTitle}>{proj.title}</Text>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: statusTheme.bg,
                              borderColor: statusTheme.border
                            }
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
                            {proj.status || 'In Progress'}
                          </Text>
                        </View>
                        {Boolean(proj.domain) && (
                          <View style={styles.domainBadge}>
                            <Ionicons name="folder-outline" size={11} color={COLORS.sage} style={{ marginRight: 3 }} />
                            <Text style={styles.domainBadgeText}>{proj.domain}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Owner controls */}
                    <View style={styles.entryActionsRow}>
                      <TouchableOpacity
                        style={styles.entryActionBtn}
                        onPress={() => openEditProjectModal(proj)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Edit project"
                      >
                        <Ionicons name="pencil" size={15} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.entryActionBtn, styles.deleteActionBtn]}
                        onPress={() => handleDeleteProject(proj)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Delete project"
                      >
                        <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Description with Expand/Collapse */}
                  {Boolean(proj.description) && (
                    <View style={styles.descContainer}>
                      <Text
                        style={styles.entryDescText}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {proj.description}
                      </Text>
                      {isLongDesc && (
                        <TouchableOpacity
                          onPress={() => toggleProjectExpand(projKey)}
                          style={styles.expandToggleBtn}
                        >
                          <Text style={styles.expandToggleText}>
                            {isExpanded ? 'Show Less' : 'Show More'}
                          </Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={12}
                            color={COLORS.primary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Tech Stack Chips */}
                  {Array.isArray(proj.techStack) && proj.techStack.length > 0 && (
                    <View style={styles.entryChipsRow}>
                      {proj.techStack.map((tech, tIdx) => (
                        <View key={`tech-${tIdx}`} style={styles.techChip}>
                          <Text style={styles.techChipText}>{tech}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Project URL Link Button */}
                  {Boolean(proj.link) && (
                    <TouchableOpacity
                      style={styles.projectLinkBtn}
                      onPress={() => handleOpenLink(proj.link)}
                      activeOpacity={0.7}
                      accessibilityRole="link"
                      accessibilityLabel="Open project URL"
                    >
                      <Ionicons name="link-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.projectLinkText} numberOfLines={1}>
                        {proj.link}
                      </Text>
                      <Ionicons name="open-outline" size={12} color={COLORS.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="construct-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Projects Added</Text>
            <Text style={styles.emptyStateDesc}>
              Showcase your research projects, open-source code, and academic prototypes.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateBtn}
              onPress={openAddProjectModal}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.emptyStateBtnText}>Add Project</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 7. Technical Skills */}
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

      {/* 8. Professional & Research Domains */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Research & Industry Domains {user.researchDomains ? `(${user.researchDomains.length})` : ''}
        </Text>
        {user.researchDomains && user.researchDomains.length > 0 ? (
          <View style={styles.pillsRow}>
            {user.researchDomains.map((domain, idx) => (
              <View
                key={idx}
                style={[
                  styles.pill,
                  {
                    backgroundColor: '#E8F5E9',
                    borderColor: '#C8E6C9',
                    borderWidth: 1,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }
                ]}
              >
                <Ionicons name="compass-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.pillText, { color: COLORS.primaryDark, fontWeight: '600' }]}>
                  {domain}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyFieldText}>
            No primary research domains specified yet. Click Edit Profile to add domains.
          </Text>
        )}
      </View>

      {/* 8. Research Publications */}
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
          <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.fullLogoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* =================================================================== */}
      {/* ADD / EDIT RESEARCH TOPIC MODAL                                     */}
      {/* =================================================================== */}
      <Modal
        visible={researchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setResearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.crudModalCard}>
            <View style={styles.crudModalHeader}>
              <Text style={styles.crudModalTitle}>
                {editingTopicId ? 'Edit Research Focus' : 'Add Research Focus'}
              </Text>
              <TouchableOpacity
                onPress={() => setResearchModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {Boolean(topicError) && (
                <View style={styles.crudErrorBox}>
                  <Ionicons name="alert-circle" size={15} color={COLORS.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.crudErrorText}>{topicError}</Text>
                </View>
              )}

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Research Title / Area *</Text>
                <TextInput
                  style={styles.crudInput}
                  placeholder="e.g. Graph Neural Networks, Climate Modeling"
                  placeholderTextColor={COLORS.textLight}
                  value={topicTitle}
                  onChangeText={(val) => {
                    setTopicTitle(val);
                    if (topicError) setTopicError('');
                  }}
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Domain / Field</Text>
                <CatalogMultiSelect
                  type="domain"
                  singleSelect={true}
                  selectedValues={topicDomain}
                  onValuesChange={setTopicDomain}
                  placeholder="Select research domain (e.g. Healthcare, AI)..."
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Description / Objectives</Text>
                <TextInput
                  style={[styles.crudInput, styles.crudTextArea]}
                  placeholder="Summarize your research hypothesis, focus areas, or goals..."
                  placeholderTextColor={COLORS.textLight}
                  value={topicDesc}
                  onChangeText={setTopicDesc}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Related Skills / Methodologies</Text>
                <CatalogMultiSelect
                  type="skill"
                  selectedValues={topicSkills}
                  onValuesChange={setTopicSkills}
                  placeholder="Select skills (e.g. PyTorch, CUDA, Spatial Statistics)..."
                />
              </View>
            </ScrollView>

            <View style={styles.crudModalActions}>
              <TouchableOpacity
                style={styles.crudCancelBtn}
                onPress={() => setResearchModalVisible(false)}
                disabled={savingTopic}
              >
                <Text style={styles.crudCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.crudSubmitBtn}
                onPress={handleSaveResearchTopic}
                disabled={savingTopic}
              >
                {savingTopic ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.crudSubmitBtnText}>
                    {editingTopicId ? 'Save Changes' : 'Add Topic'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* ADD / EDIT PROJECT MODAL                                            */}
      {/* =================================================================== */}
      <Modal
        visible={projectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProjectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.crudModalCard}>
            <View style={styles.crudModalHeader}>
              <Text style={styles.crudModalTitle}>
                {editingProjectId ? 'Edit Project' : 'Add Project'}
              </Text>
              <TouchableOpacity
                onPress={() => setProjectModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {Boolean(projectError) && (
                <View style={styles.crudErrorBox}>
                  <Ionicons name="alert-circle" size={15} color={COLORS.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.crudErrorText}>{projectError}</Text>
                </View>
              )}

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Project Title *</Text>
                <TextInput
                  style={styles.crudInput}
                  placeholder="e.g. GeoConnect Spatial Engine"
                  placeholderTextColor={COLORS.textLight}
                  value={projectTitle}
                  onChangeText={(val) => {
                    setProjectTitle(val);
                    if (projectError) setProjectError('');
                  }}
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Status</Text>
                <View style={styles.statusChipsSelector}>
                  {PROJECT_STATUSES.map((status) => {
                    const isSelected = projectStatus === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusSelectorChip,
                          isSelected && styles.statusSelectorChipSelected
                        ]}
                        onPress={() => setProjectStatus(status)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.statusSelectorChipText,
                            isSelected && styles.statusSelectorChipTextSelected
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Domain / Field</Text>
                <CatalogMultiSelect
                  type="domain"
                  singleSelect={true}
                  selectedValues={projectDomain}
                  onValuesChange={setProjectDomain}
                  placeholder="Select project domain (e.g. AI, Climate, Healthcare)..."
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Description</Text>
                <TextInput
                  style={[styles.crudInput, styles.crudTextArea]}
                  placeholder="Describe project purpose, methodology, and key achievements..."
                  placeholderTextColor={COLORS.textLight}
                  value={projectDesc}
                  onChangeText={setProjectDesc}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Technologies / Skills</Text>
                <CatalogMultiSelect
                  type="skill"
                  selectedValues={projectTech}
                  onValuesChange={setProjectTech}
                  placeholder="Select technologies & skills (e.g. React Native, Python, MongoDB)..."
                />
              </View>

              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Project Link / Repository (Optional)</Text>
                <TextInput
                  style={styles.crudInput}
                  placeholder="https://github.com/..."
                  placeholderTextColor={COLORS.textLight}
                  value={projectLink}
                  onChangeText={setProjectLink}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </ScrollView>

            <View style={styles.crudModalActions}>
              <TouchableOpacity
                style={styles.crudCancelBtn}
                onPress={() => setProjectModalVisible(false)}
                disabled={savingProject}
              >
                <Text style={styles.crudCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.crudSubmitBtn}
                onPress={handleSaveProject}
                disabled={savingProject}
              >
                {savingProject ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.crudSubmitBtnText}>
                    {editingProjectId ? 'Save Changes' : 'Add Project'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* LOGOUT CONFIRMATION MODAL                                           */}
      {/* =================================================================== */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconText}>🚪</Text>
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out of GeoConnect? You can always sign back in anytime.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.modalLogoutText}>Log Out</Text>
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
    backgroundColor: COLORS.bgMain || '#F9F8F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...SHADOWS.card,
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
    padding: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.primary || '#24563B',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  activeBeaconDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  role: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary || '#24563B',
    marginBottom: 2,
    textAlign: 'center',
  },
  org: {
    fontSize: 13,
    color: COLORS.textMuted || '#58655E',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput || '#F2F1EC',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted || '#58655E',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary || '#24563B',
    paddingVertical: 12,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border || '#E3E7E2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnOutlineText: {
    color: COLORS.textMain || '#1C1C1E',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  btnIcon: {
    marginRight: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...SHADOWS.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWithCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: COLORS.primaryLight || '#EBF4EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary || '#24563B',
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight || '#EBF4EE',
  },
  addInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary || '#24563B',
  },
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  completenessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
  },
  completenessSub: {
    fontSize: 12,
    color: COLORS.textMuted || '#58655E',
    marginTop: 2,
  },
  completenessScoreBadge: {
    backgroundColor: COLORS.primaryLight || '#EBF4EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completenessScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary || '#24563B',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary || '#24563B',
    borderRadius: 4,
  },
  completenessAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || '#EDF0EB',
  },
  completenessActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary || '#24563B',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  hubTile: {
    width: '48%',
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  hubIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  hubTileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
  },
  hubTileSub: {
    fontSize: 11,
    color: COLORS.textMuted || '#58655E',
    marginTop: 2,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted || '#58655E',
    marginTop: 8,
  },
  emptyFieldText: {
    fontSize: 13,
    color: COLORS.textLight || '#8A9790',
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Entries lists (Research & Projects)
  entriesList: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight || '#EDF0EB',
    ...SHADOWS.sm,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.2,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight || '#EBF4EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  domainBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary || '#24563B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  entryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionBtn: {
    backgroundColor: '#FEE2E2',
  },
  descContainer: {
    marginTop: 8,
  },
  entryDescText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted || '#58655E',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary || '#24563B',
  },
  entryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  skillChip: {
    backgroundColor: COLORS.sageLight || '#F0F5F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillChipText: {
    fontSize: 11,
    color: COLORS.sage || '#5A7D69',
    fontWeight: '600',
  },
  techChip: {
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight || '#EDF0EB',
  },
  techChipText: {
    fontSize: 11,
    color: COLORS.textMain || '#1C1C1E',
    fontWeight: '600',
  },
  projectLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || '#EDF0EB',
  },
  projectLinkText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary || '#24563B',
    fontWeight: '600',
  },
  // Empty states
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    borderRadius: 14,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 4,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: COLORS.textMuted || '#58655E',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 17,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary || '#24563B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...SHADOWS.sm,
  },
  emptyStateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  itemCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight || '#EDF0EB',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textMuted || '#58655E',
    marginTop: 4,
    lineHeight: 16,
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textLight || '#8A9790',
    marginTop: 3,
  },
  sessionEmailText: {
    fontSize: 13,
    color: COLORS.textMuted || '#58655E',
    marginBottom: 12,
    marginTop: 6,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 36, 30, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...SHADOWS.md,
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
    color: COLORS.textMuted || '#58655E',
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
    backgroundColor: COLORS.bgInput || '#F2F1EC',
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
  // CRUD Modal styles
  crudModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...SHADOWS.md,
  },
  crudModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight || '#EDF0EB',
    marginBottom: 12,
  },
  crudModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
  },
  crudErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  crudErrorText: {
    fontSize: 12,
    color: COLORS.danger || '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  crudFormGroup: {
    marginBottom: 12,
  },
  crudLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 6,
  },
  crudInput: {
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textMain || '#1C1C1E',
    borderWidth: 1,
    borderColor: COLORS.border || '#E3E7E2',
  },
  crudTextArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  statusChipsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusSelectorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    borderWidth: 1,
    borderColor: COLORS.border || '#E3E7E2',
  },
  statusSelectorChipSelected: {
    backgroundColor: COLORS.primaryLight || '#EBF4EE',
    borderColor: COLORS.primary || '#24563B',
  },
  statusSelectorChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted || '#58655E',
  },
  statusSelectorChipTextSelected: {
    color: COLORS.primary || '#24563B',
    fontWeight: '700',
  },
  crudModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || '#EDF0EB',
  },
  crudCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput || '#F2F1EC',
    alignItems: 'center',
  },
  crudCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted || '#58655E',
  },
  crudSubmitBtn: {
    flex: 1.4,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.primary || '#24563B',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  crudSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;