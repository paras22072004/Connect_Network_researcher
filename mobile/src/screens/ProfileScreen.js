import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  Linking,
  ActivityIndicator,
  Platform
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

  // Open Research Topic Modal
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

  // Open Project Modal
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
        return { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' };
      case 'Active':
        return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'Planning':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'Archived':
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
      case 'In Progress':
      default:
        return { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' };
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
          tintColor={COLORS.primary || '#15803D'}
          colors={[COLORS.primary || '#15803D']}
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
                { backgroundColor: user.discoverable ? '#10B981' : '#9CA3AF' }
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
            <Ionicons name="create-outline" size={15} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.btnPrimaryText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={15} color={COLORS.textMain || '#1C1C1E'} style={styles.btnIcon} />
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
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary || '#15803D'} />
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
              <Ionicons name="qr-code-outline" size={18} color={COLORS.primary || '#15803D'} />
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
              <Ionicons name="people-outline" size={18} color={COLORS.primary || '#15803D'} />
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
              <Ionicons name="flask-outline" size={18} color={COLORS.primary || '#15803D'} />
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
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary || '#15803D'} />
            </View>
            <Text style={styles.hubTileTitle}>Events</Text>
            <Text style={styles.hubTileSub}>Conferences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hubTile, styles.hubTileFullWidth]}
            onPress={() => navigation.navigate('ResearchDiscovery')}
            activeOpacity={0.7}
          >
            <View style={[styles.hubIconBg, { marginRight: 12, marginBottom: 0 }]}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.primary || '#15803D'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hubTileTitle}>Explore Research Papers</Text>
              <Text style={styles.hubTileSub}>Search academic preprints & collaborative authors</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted || '#9CA3AF'} />
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
            <Ionicons name="add-circle" size={16} color={COLORS.primary || '#15803D'} style={{ marginRight: 4 }} />
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
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.entryTitle}>{topic.title}</Text>
                      {Boolean(topic.domain) && (
                        <View style={styles.domainBadge}>
                          <Ionicons name="school-outline" size={11} color={COLORS.primary || '#15803D'} style={{ marginRight: 4 }} />
                          <Text style={styles.domainBadgeText}>{topic.domain}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.entryActionsRow}>
                      <TouchableOpacity
                        style={styles.entryActionBtn}
                        onPress={() => openEditResearchModal(topic)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil" size={14} color={COLORS.primary || '#15803D'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.entryActionBtn, styles.deleteActionBtn]}
                        onPress={() => handleDeleteResearchTopic(topic)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

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
                            color={COLORS.primary || '#15803D'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

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
              <Ionicons name="sparkles-outline" size={20} color={COLORS.primary || '#15803D'} />
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
              <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
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
            <Ionicons name="add-circle" size={16} color={COLORS.primary || '#15803D'} style={{ marginRight: 4 }} />
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
                            <Ionicons name="folder-outline" size={11} color={COLORS.sage || '#6B7280'} style={{ marginRight: 3 }} />
                            <Text style={styles.domainBadgeText}>{proj.domain}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.entryActionsRow}>
                      <TouchableOpacity
                        style={styles.entryActionBtn}
                        onPress={() => openEditProjectModal(proj)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil" size={14} color={COLORS.primary || '#15803D'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.entryActionBtn, styles.deleteActionBtn]}
                        onPress={() => handleDeleteProject(proj)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

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
                            color={COLORS.primary || '#15803D'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {Array.isArray(proj.techStack) && proj.techStack.length > 0 && (
                    <View style={styles.entryChipsRow}>
                      {proj.techStack.map((tech, tIdx) => (
                        <View key={`tech-${tIdx}`} style={styles.techChip}>
                          <Text style={styles.techChipText}>{tech}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {Boolean(proj.link) && (
                    <TouchableOpacity
                      style={styles.projectLinkBtn}
                      onPress={() => handleOpenLink(proj.link)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="link-outline" size={13} color={COLORS.primary || '#15803D'} style={{ marginRight: 6 }} />
                      <Text style={styles.projectLinkText} numberOfLines={1}>
                        {proj.link}
                      </Text>
                      <Ionicons name="open-outline" size={12} color={COLORS.primary || '#15803D'} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="construct-outline" size={20} color={COLORS.primary || '#15803D'} />
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
              <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
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
              <View key={idx} style={styles.domainPill}>
                <Ionicons name="compass-outline" size={13} color={COLORS.primary || '#15803D'} style={{ marginRight: 4 }} />
                <Text style={styles.domainPillText}>{domain}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyFieldText}>
            No primary research domains specified yet. Click Edit Profile to add domains.
          </Text>
        )}
      </View>

      {/* 9. Research Publications */}
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

      {/* 10. Account & Session Management */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account & Session</Text>
        <Text style={styles.sessionEmailText}>Signed in as {user?.email}</Text>
        <TouchableOpacity
          style={styles.fullLogoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={17} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.fullLogoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* CRUD RESEARCH TOPIC MODAL */}
      <Modal
        visible={researchModalVisible}
        transparent={true}
        animationType="fade"
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
                <Ionicons name="close" size={20} color={COLORS.textMuted || '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {Boolean(topicError) && (
                <View style={styles.crudErrorBox}>
                  <Ionicons name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.crudErrorText}>{topicError}</Text>
                </View>
              )}
              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Research Title / Area *</Text>
                <TextInput
                  style={styles.crudInput}
                  placeholder="e.g. Graph Neural Networks, Climate Modeling"
                  placeholderTextColor={COLORS.textLight || '#9CA3AF'}
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
                  placeholderTextColor={COLORS.textLight || '#9CA3AF'}
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
                  placeholder="Select skills (e.g. PyTorch, CUDA)..."
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

      {/* CRUD PROJECT MODAL */}
      <Modal
        visible={projectModalVisible}
        transparent={true}
        animationType="fade"
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
                <Ionicons name="close" size={20} color={COLORS.textMuted || '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {Boolean(projectError) && (
                <View style={styles.crudErrorBox}>
                  <Ionicons name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.crudErrorText}>{projectError}</Text>
                </View>
              )}
              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Project Title *</Text>
                <TextInput
                  style={styles.crudInput}
                  placeholder="e.g. GeoConnect Spatial Engine"
                  placeholderTextColor={COLORS.textLight || '#9CA3AF'}
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
                  placeholder="Select project domain (e.g. AI, Climate)..."
                />
              </View>
              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Description</Text>
                <TextInput
                  style={[styles.crudInput, styles.crudTextArea]}
                  placeholder="Describe project purpose, methodology, and key achievements..."
                  placeholderTextColor={COLORS.textLight || '#9CA3AF'}
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
                  placeholder="Select technologies & skills (e.g. React Native, Python)..."
                />
              </View>
              <View style={styles.crudFormGroup}>
                <Text style={styles.crudLabel}>Project Link / Repository (Optional)</Text>
                <TextInput
                  style={styles.crudInput}
                  placeholder="https://github.com/..."
                  placeholderTextColor={COLORS.textLight || '#9CA3AF'}
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

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
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
    backgroundColor: COLORS.bgMain || '#F9FAFB'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  headerCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }
    })
  },
  avatarWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    padding: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.primary || '#15803D'
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 42
  },
  activeBeaconDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF'
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 3,
    textAlign: 'center',
    letterSpacing: -0.2
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary || '#15803D',
    marginBottom: 2,
    textAlign: 'center'
  },
  org: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: 12,
    textAlign: 'center'
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput || '#F3F4F6'
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280'
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary || '#15803D',
    paddingVertical: 10,
    borderRadius: 10
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    paddingVertical: 10,
    borderRadius: 10
  },
  btnOutlineText: {
    color: COLORS.textMain || '#1C1C1E',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6
  },
  btnIcon: {
    marginRight: 2
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 }
    })
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  titleWithCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.2
  },
  countBadge: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary || '#15803D'
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight || '#E8F5E9'
  },
  addInlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary || '#15803D'
  },
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  completenessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E'
  },
  completenessSub: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2
  },
  completenessScoreBadge: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12
  },
  completenessScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary || '#15803D'
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary || '#15803D',
    borderRadius: 4
  },
  completenessAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || 'rgba(0,0,0,0.05)'
  },
  completenessActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary || '#15803D'
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10
  },
  hubTile: {
    width: '48%',
    backgroundColor: COLORS.bgInput || '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.05)',
    alignItems: 'flex-start'
  },
  hubTileFullWidth: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center'
  },
  hubIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  hubTileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E'
  },
  hubTileSub: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted || '#4B5563',
    marginTop: 6
  },
  emptyFieldText: {
    fontSize: 12,
    color: COLORS.textLight || '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic'
  },
  entriesList: {
    gap: 10
  },
  entryCard: {
    backgroundColor: COLORS.bgInput || '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)'
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.1
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  domainBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary || '#15803D'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  entryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  entryActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteActionBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  descContainer: {
    marginTop: 6
  },
  entryDescText: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textMuted || '#4B5563'
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary || '#15803D'
  },
  entryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8
  },
  skillChip: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  skillChipText: {
    fontSize: 10,
    color: COLORS.primaryDark || '#15803D',
    fontWeight: '600'
  },
  techChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)'
  },
  techChipText: {
    fontSize: 10,
    color: COLORS.textMain || '#1C1C1E',
    fontWeight: '600'
  },
  projectLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.8,
    borderTopColor: COLORS.borderLight || 'rgba(0,0,0,0.05)'
  },
  projectLinkText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.primary || '#15803D',
    fontWeight: '600'
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgInput || '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.05)'
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  emptyStateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 4
  },
  emptyStateDesc: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary || '#15803D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  emptyStateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  pill: {
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)'
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E'
  },
  domainPill: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: '#C4DEC9',
    flexDirection: 'row',
    alignItems: 'center'
  },
  domainPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark || '#15803D'
  },
  itemCard: {
    paddingVertical: 8,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.borderLight || 'rgba(0,0,0,0.05)'
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E'
  },
  itemDesc: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 3,
    lineHeight: 15
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textLight || '#9CA3AF',
    marginTop: 3
  },
  sessionEmailText: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: 10,
    marginTop: 4
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 10
  },
  fullLogoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...SHADOWS.md
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 6,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    alignItems: 'center'
  },
  modalCancelText: {
    color: COLORS.textMain || '#1C1C1E',
    fontSize: 13,
    fontWeight: '600'
  },
  modalLogoutBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center'
  },
  modalLogoutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  crudModalCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...SHADOWS.md
  },
  crudModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.borderLight || 'rgba(0,0,0,0.05)',
    marginBottom: 12
  },
  crudModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E'
  },
  crudErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  crudErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1
  },
  crudFormGroup: {
    marginBottom: 12
  },
  crudLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 5
  },
  crudInput: {
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textMain || '#1C1C1E',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)'
  },
  crudTextArea: {
    minHeight: 65,
    textAlignVertical: 'top'
  },
  statusChipsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  statusSelectorChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)'
  },
  statusSelectorChipSelected: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    borderColor: COLORS.primary || '#15803D'
  },
  statusSelectorChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280'
  },
  statusSelectorChipTextSelected: {
    color: COLORS.primary || '#15803D',
    fontWeight: '700'
  },
  crudModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.8,
    borderTopColor: COLORS.borderLight || 'rgba(0,0,0,0.05)'
  },
  crudCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    alignItems: 'center'
  },
  crudCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E'
  },
  crudSubmitBtn: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary || '#15803D',
    alignItems: 'center',
    justifyContent: 'center'
  },
  crudSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

export default ProfileScreen;