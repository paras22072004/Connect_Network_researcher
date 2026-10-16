import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  recommendTeammatesApi,
  saveProjectApi,
  getMyProjectsApi,
  getProjectByIdApi,
  inviteToProjectApi,
  getMyInvitationsApi,
  respondToInvitationApi,
  finalizeTeamApi,
  completeProjectApi,
  deleteProjectApi,
  requestToJoinProjectApi,
  cancelJoinRequestApi,
  getProjectRequestsApi,
  respondToJoinRequestApi,
  getMySentRequestsApi,
  removeTeamMemberApi
} from '../services/teamService';
import { addTaskApi, updateTaskApi, getWorkspaceByIdApi } from '../services/workspaceService';
import ProfileModalView from './ProfileModalView';
import LoadingView from './LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

// Quick Preset Project Ideas for fast demonstration
const PROJECT_PRESETS = [
  {
    title: 'AI Diagnostic Assistant',
    description: 'Developing multimodal deep learning models for medical image classification and clinical decision support.',
    requiredSkills: 'PyTorch, Computer Vision, Medical Imaging, Python',
    researchDomain: 'Healthcare AI',
    desiredRoles: 'AI Researcher, ML Engineer',
    collaborationType: 'Research Paper',
    desiredTeamSize: '4',
    projectGoals: 'Develop and evaluate an attention-based multimodal model and submit to MICCAI.',
    timeline: '3 months'
  },
  {
    title: 'Decentralized Edge Protocol',
    description: 'High-throughput P2P consensus and off-grid mobile computing mesh for resilient disaster communications.',
    requiredSkills: 'Rust, Distributed Systems, Go, Networking',
    researchDomain: 'Distributed Systems',
    desiredRoles: 'Systems Engineer, Protocol Architect',
    collaborationType: 'Hackathon Project',
    desiredTeamSize: '3',
    projectGoals: 'Build prototype mesh testnet with local BLE and Wi-Fi Direct sync.',
    timeline: '1 month'
  },
  {
    title: 'Climate Risk Informatics Platform',
    description: 'Satellite imagery analysis and spatial econometric modeling to predict flood and wildfire vulnerabilities.',
    requiredSkills: 'GIS, Remote Sensing, Python, Geospatial ML',
    researchDomain: 'Climate Informatics',
    desiredRoles: 'Data Scientist, Geospatial Analyst',
    collaborationType: 'Open-Source Tool',
    desiredTeamSize: '5',
    projectGoals: 'Assemble geospatial pipeline for real-time risk index generation across 50 regions.',
    timeline: '6 months'
  }
];

const TeamBuilderView = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  // Sub-tabs: 'projects' | 'create' | 'requests' | 'invitations'
  const [subTab, setSubTab] = useState('projects');
  // Requests toggle: 'incoming' | 'sent'
  const [requestsSubTab, setRequestsSubTab] = useState('incoming');

  // Step 1: Project Definition Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [researchDomain, setResearchDomain] = useState('');
  const [desiredRoles, setDesiredRoles] = useState('');
  const [collaborationType, setCollaborationType] = useState('Research Paper');
  const [desiredTeamSize, setDesiredTeamSize] = useState('4');
  const [projectGoals, setProjectGoals] = useState('');
  const [timeline, setTimeline] = useState('3 months');
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Step 2: AI Recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [invitingId, setInvitingId] = useState(null);

  // Step 4: Received Invitations
  const [myInvitations, setMyInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  // Requests state
  const [sentRequests, setSentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState(null);

  // Step 5-8: Projects & Workspaces
  const [myProjects, setMyProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProjectDetail, setLoadingProjectDetail] = useState(false);

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  // Selected User Profile Modal
  const [selectedUser, setSelectedUser] = useState(null);

  // Action status message
  const [actionNotice, setActionNotice] = useState(null);

  const activeCreationStep = useMemo(() => {
    if (recommendations.some((c) => c.isInvited) || (currentProjectId && recommendations.length > 0)) {
      return 3;
    }
    if (searched || searching) {
      return 2;
    }
    return 1;
  }, [searched, searching, recommendations, currentProjectId]);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Compute incoming requests to projects owned by current user
  const incomingRequests = useMemo(() => {
    const list = [];
    myProjects
      .filter((p) => p.owner?._id?.toString() === currentUser?._id?.toString())
      .forEach((p) => {
        const pending = (p.joinRequests || []).filter((r) => r.status === 'pending');
        pending.forEach((r) => {
          list.push({
            ...r,
            projectId: p._id,
            projectTitle: p.title
          });
        });
      });
    return list;
  }, [myProjects, currentUser]);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    await Promise.all([loadProjects(), loadInvitations(), loadSentRequests()]);
    if (isRefresh) setRefreshing(false);
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await getMyProjectsApi();
      if (res.success) {
        setMyProjects(res.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadInvitations = async () => {
    setLoadingInvites(true);
    try {
      const res = await getMyInvitationsApi();
      if (res.success) {
        setMyInvitations(res.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const loadSentRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await getMySentRequestsApi();
      if (res.success) {
        setSentRequests(res.requests || []);
      }
    } catch (err) {
      console.error('Error fetching sent requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const applyPreset = (preset) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setRequiredSkills(preset.requiredSkills);
    setResearchDomain(preset.researchDomain);
    setDesiredRoles(preset.desiredRoles);
    setCollaborationType(preset.collaborationType);
    setDesiredTeamSize(preset.desiredTeamSize || '4');
    setProjectGoals(preset.projectGoals || '');
    setTimeline(preset.timeline || '3 months');
    setCurrentProjectId(null);
    setRecommendations([]);
    setSearched(false);
  };

  // Step 1 & 2: Match Teammates with AI
  const handleFindTeammates = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Details', 'Please enter a project title and description to run AI matching.');
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const parseSkills = requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
      const parseRoles = desiredRoles.split(',').map((r) => r.trim()).filter(Boolean);
      const teamSizeNum = parseInt(desiredTeamSize, 10) || 4;

      let pId = currentProjectId;
      if (!pId) {
        const saveRes = await saveProjectApi({
          title: title.trim(),
          description: description.trim(),
          requiredSkills: parseSkills,
          researchDomain: researchDomain.trim(),
          desiredRoles: parseRoles,
          collaborationType,
          desiredTeamSize: teamSizeNum,
          projectGoals: projectGoals.trim(),
          timeline: timeline.trim()
        });
        if (saveRes.success && saveRes.project?._id) {
          pId = saveRes.project._id;
          setCurrentProjectId(pId);
        }
      }

      const recRes = await recommendTeammatesApi({
        title: title.trim(),
        description: description.trim(),
        requiredSkills: parseSkills,
        researchDomain: researchDomain.trim(),
        desiredRoles: parseRoles,
        collaborationType,
        desiredTeamSize: teamSizeNum,
        projectGoals: projectGoals.trim(),
        timeline: timeline.trim()
      });
      if (recRes.success) {
        setRecommendations(recRes.recommendations || []);
      }
      loadProjects();
    } catch (err) {
      console.error('Error finding teammates:', err);
      Alert.alert('Matching Error', err.message || 'Could not fetch teammate recommendations.');
    } finally {
      setSearching(false);
    }
  };

  // Step 3: Invite Candidate to Project
  const handleInviteCandidate = async (candidate) => {
    if (!currentProjectId) {
      try {
        const parseSkills = requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
        const parseRoles = desiredRoles.split(',').map((r) => r.trim()).filter(Boolean);
        const teamSizeNum = parseInt(desiredTeamSize, 10) || 4;
        const saveRes = await saveProjectApi({
          title: title.trim() || 'Research Project',
          description: description.trim() || 'Collaborative research exploration',
          requiredSkills: parseSkills,
          researchDomain: researchDomain.trim(),
          desiredRoles: parseRoles,
          collaborationType,
          desiredTeamSize: teamSizeNum,
          projectGoals: projectGoals.trim(),
          timeline: timeline.trim()
        });
        if (saveRes.success && saveRes.project?._id) {
          const newId = saveRes.project._id;
          setCurrentProjectId(newId);
          await sendInviteRequest(newId, candidate);
          return;
        }
      } catch (err) {
        Alert.alert('Project Setup Error', 'Please enter project title and description first.');
        return;
      }
    } else {
      await sendInviteRequest(currentProjectId, candidate);
    }
  };

  const sendInviteRequest = async (pId, candidate) => {
    setInvitingId(candidate._id);
    try {
      const res = await inviteToProjectApi(pId, {
        userId: candidate._id,
        role: candidate.role || 'Researcher'
      });
      if (res.success) {
        showNotice(`Invitation sent to ${candidate.name}!`);
        setRecommendations((prev) =>
          prev.map((c) => (c._id === candidate._id ? { ...c, isInvited: true } : c))
        );
        loadProjects();
      }
    } catch (err) {
      Alert.alert('Invite Error', err.message || 'Failed to send project invitation.');
    } finally {
      setInvitingId(null);
    }
  };

  // Respond to Outbound Invitation (Accept / Decline)
  const handleRespondInvitation = async (projectId, action) => {
    setRespondingId(projectId);
    try {
      const res = await respondToInvitationApi(projectId, action);
      if (res.success) {
        showNotice(action === 'accept' ? 'You joined the project team!' : 'Invitation declined.');
        await loadInvitations();
        await loadProjects();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not process invitation response.');
    } finally {
      setRespondingId(null);
    }
  };

  // Respond to Inbound Join Request (Owner Accepts / Rejects)
  const handleRespondJoinRequest = async (projectId, requestId, action) => {
    setRespondingRequestId(requestId);
    try {
      const res = await respondToJoinRequestApi(projectId, requestId, action);
      if (res.success) {
        showNotice(
          action === 'accept'
            ? 'Applicant approved! Added to team and workspace.'
            : 'Join request declined.'
        );
        await loadProjects();
        await loadSentRequests();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not process join request.');
    } finally {
      setRespondingRequestId(null);
    }
  };

  // Cancel Outbound Sent Join Request
  const handleCancelSentRequest = async (projectId) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel your team join request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await cancelJoinRequestApi(projectId);
            if (res.success) {
              showNotice('Join request cancelled.');
              loadSentRequests();
            }
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not cancel request.');
          }
        }
      }
    ]);
  };

  // Finalize Team and Launch Workspace
  const handleFinalizeTeam = async (projectId) => {
    try {
      const res = await finalizeTeamApi(projectId);
      if (res.success) {
        showNotice('Team finalized! Research workspace ready.');
        await loadProjects();
        if (selectedProject?._id === projectId) {
          setSelectedProject(res.project);
        }
      }
    } catch (err) {
      Alert.alert('Finalize Error', err.message || 'Could not finalize team.');
    }
  };

  // Update Task Status
  const handleCycleTaskStatus = async (workspaceId, taskId, currentStatus) => {
    let nextStatus = 'In Progress';
    if (currentStatus === 'To Do') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else if (currentStatus === 'Completed') nextStatus = 'To Do';
    try {
      const res = await updateTaskApi(workspaceId, taskId, { status: nextStatus });
      if (res.success) {
        if (selectedProject) {
          const detailRes = await getProjectByIdApi(selectedProject._id);
          if (detailRes.success) setSelectedProject(detailRes.project);
        }
        loadProjects();
      }
    } catch (err) {
      Alert.alert('Task Update Error', err.message || 'Could not update task status.');
    }
  };

  // Add New Task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a task title.');
      return;
    }
    const wsId = selectedProject?.workspace?._id || selectedProject?.workspace;
    if (!wsId) return;
    setAddingTask(true);
    try {
      const res = await addTaskApi(wsId, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        priority: newTaskPriority
      });
      if (res.success) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setIsTaskModalVisible(false);
        showNotice('Task added to workspace!');
        const detailRes = await getProjectByIdApi(selectedProject._id);
        if (detailRes.success) setSelectedProject(detailRes.project);
        loadProjects();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add task.');
    } finally {
      setAddingTask(false);
    }
  };

  // Mark Project as Completed
  const handleCompleteProject = async (projectId) => {
    Alert.alert(
      'Complete Project',
      'Are you sure you want to mark this research project as Completed? All milestones will be marked as delivered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Project',
          style: 'default',
          onPress: async () => {
            try {
              const res = await completeProjectApi(projectId);
              if (res.success) {
                showNotice('Project marked as successfully completed!');
                await loadProjects();
                if (selectedProject?._id === projectId) {
                  const detailRes = await getProjectByIdApi(projectId);
                  if (detailRes.success) setSelectedProject(detailRes.project);
                }
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not complete project.');
            }
          }
        }
      ]
    );
  };

  // Open Project Details modal
  const openProjectDetail = async (proj) => {
    setLoadingProjectDetail(true);
    try {
      const res = await getProjectByIdApi(proj._id);
      if (res.success) {
        setSelectedProject(res.project);
      } else {
        setSelectedProject(proj);
      }
    } catch (e) {
      setSelectedProject(proj);
    } finally {
      setLoadingProjectDetail(false);
    }
  };

  const handleDeleteProject = async (id) => {
    Alert.alert('Delete Project', 'Are you sure you want to remove this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await deleteProjectApi(id);
            if (res.success) {
              showNotice('Project deleted.');
              loadProjects();
              if (selectedProject?._id === id) setSelectedProject(null);
            }
          } catch (e) {
            Alert.alert('Error', 'Could not delete project.');
          }
        }
      }
    ]);
  };

  const pendingInvitesCount = myInvitations.filter((i) => i.invitationStatus === 'invited').length;
  const pendingRequestsCount = incomingRequests.length;

  return (
    <View style={styles.container}>
      {/* Top Banner Notice */}
      {actionNotice ? (
        <View style={styles.actionNoticeBox}>
          <Ionicons name="information-circle" size={16} color={COLORS.primaryDark} style={{ marginRight: 6 }} />
          <Text style={styles.actionNoticeText}>{actionNotice}</Text>
        </View>
      ) : null}

      {/* Clean Icons-Free Sub-Tabs: Projects | + Build | Requests | Invites */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'projects' && styles.subTabBtnActive]}
          onPress={() => setSubTab('projects')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="My Projects tab"
        >
          <Text style={[styles.subTabBtnText, subTab === 'projects' && styles.subTabBtnTextActive]}>
            Projects ({myProjects.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'create' && styles.subTabBtnActive]}
          onPress={() => setSubTab('create')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Build Team tab"
        >
          <Text style={[styles.subTabBtnText, subTab === 'create' && styles.subTabBtnTextActive]}>
            + Build
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'requests' && styles.subTabBtnActive]}
          onPress={() => setSubTab('requests')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Team Requests tab"
        >
          <Text style={[styles.subTabBtnText, subTab === 'requests' && styles.subTabBtnTextActive]}>
            Requests
          </Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'invitations' && styles.subTabBtnActive]}
          onPress={() => setSubTab('invitations')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Project Invites tab"
        >
          <Text style={[styles.subTabBtnText, subTab === 'invitations' && styles.subTabBtnTextActive]}>
            Invites
          </Text>
          {pendingInvitesCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingInvitesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* SUB-TAB 1: PROJECTS & WORKSPACES */}
      {subTab === 'projects' && (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollBody}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          

          {loadingProjects && !refreshing ? (
            <LoadingView message="Loading your projects & research teams..." />
          ) : myProjects.length === 0 ? (
            <EmptyStateView
              title="No Active Projects Yet"
              description="Define a new project in the '+ Build' tab to get AI collaborator recommendations and build your team."
            />
          ) : (
            myProjects.map((proj) => {
              const isOwner = proj.owner?._id?.toString() === currentUser?._id?.toString();
              const acceptedMembers = proj.finalTeam || [];
              const pendingReqs = (proj.joinRequests || []).filter((r) => r.status === 'pending');
              const hasWorkspace = Boolean(proj.workspace);
              const isCompleted = proj.status === 'Completed';
              const capacity = proj.desiredTeamSize || 4;
              const ws = proj.workspace;
              const totalTasks = ws?.tasks?.length || 0;
              const completedTasks = ws?.tasks?.filter((t) => t.status === 'Completed').length || 0;
              const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              return (
                <View
                  key={proj._id}
                  style={[styles.projectCard, isCompleted && styles.projectCardCompleted]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleCol}>
                      <Text style={styles.projectTitle} numberOfLines={1}>
                        {proj.title}
                      </Text>
                      <Text style={styles.projectSubtitle}>
                        {proj.collaborationType} • {proj.researchDomain || 'General Research'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isCompleted
                          ? styles.statusCompleted
                          : hasWorkspace
                          ? styles.statusWorkspace
                          : proj.status === 'TeamFormed'
                          ? styles.statusTeam
                          : styles.statusRecruiting
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeTextGeneral,
                          isCompleted
                            ? styles.statusCompletedText
                            : hasWorkspace
                            ? styles.statusWorkspaceText
                            : null
                        ]}
                      >
                        {isCompleted
                          ? 'Completed'
                          : hasWorkspace
                          ? 'Workspace Active'
                          : proj.status === 'TeamFormed'
                          ? 'Team Ready'
                          : 'Recruiting'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.projectDesc} numberOfLines={2}>
                    {proj.description}
                  </Text>

                  {/* Team Members Roster Bar */}
                  <View style={styles.teamRosterRow}>
                    <View style={styles.teamRosterLeft}>
                      <Ionicons name="people" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.teamCountText}>
                        Team: {acceptedMembers.length + (isOwner ? 0 : 1)} / {capacity} confirmed
                        {pendingReqs.length > 0 ? ` • ${pendingReqs.length} request(s)` : ''}
                      </Text>
                    </View>
                    {isOwner ? (
                      <Text style={styles.ownerRoleBadge}>Lead (Owner)</Text>
                    ) : (
                      <Text style={styles.memberRoleBadge}>Collaborator</Text>
                    )}
                  </View>

                  {/* Task progress if workspace exists */}
                  {hasWorkspace && (
                    <View style={styles.taskProgressBarContainer}>
                      <View style={styles.taskProgressLabelRow}>
                        <Text style={styles.taskProgressLabel}>
                          Tasks Progress ({completedTasks}/{totalTasks})
                        </Text>
                        <Text style={styles.taskProgressPercent}>{taskPercent}%</Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${taskPercent}%` }]} />
                      </View>
                    </View>
                  )}

                  {/* Direct Launch Workspace Button */}
                  {hasWorkspace && (
                    <TouchableOpacity
                      style={styles.btnOpenWorkspaceDirect}
                      onPress={() =>
                        navigation.navigate('WorkspaceDetail', {
                          workspaceId: proj.workspace?._id || proj.workspace
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="folder-open-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.btnOpenWorkspaceDirectText}>Open Research Workspace & Chat →</Text>
                    </TouchableOpacity>
                  )}

                  {/* Card Bottom Quick Actions */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.btnCardAction}
                      onPress={() => openProjectDetail(proj)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.btnCardActionText}>Manage Project & Tasks</Text>
                    </TouchableOpacity>
                    {isOwner && (
                      <TouchableOpacity
                        onPress={() => handleDeleteProject(proj._id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* SUB-TAB 2: + BUILD TEAM (Step 1-3) */}
      {subTab === 'create' && (
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* Top 3-Step Lifecycle Progress Bar */}
          <View style={styles.topProgressWrapper}>
            <View style={styles.topStepRow}>
              {/* Step 1 */}
              <View style={[styles.topStepBadge, activeCreationStep >= 1 && styles.topStepBadgeActive]}>
                <Ionicons
                  name={activeCreationStep > 1 ? 'checkmark-circle' : 'document-text'}
                  size={14}
                  color={activeCreationStep >= 1 ? '#FFFFFF' : COLORS.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.topStepText, activeCreationStep >= 1 && styles.topStepTextActive]}>
                  Step 1: Details
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} style={{ marginHorizontal: 2 }} />
              {/* Step 2 */}
              <View style={[styles.topStepBadge, activeCreationStep >= 2 && styles.topStepBadgeActive]}>
                <Ionicons
                  name={activeCreationStep > 2 ? 'checkmark-circle' : 'sparkles'}
                  size={14}
                  color={activeCreationStep >= 2 ? '#FFFFFF' : COLORS.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.topStepText, activeCreationStep >= 2 && styles.topStepTextActive]}>
                  Step 2: AI People
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} style={{ marginHorizontal: 2 }} />
              {/* Step 3 */}
              <View style={[styles.topStepBadge, activeCreationStep >= 3 && styles.topStepBadgeActive]}>
                <Ionicons
                  name="rocket"
                  size={14}
                  color={activeCreationStep >= 3 ? '#FFFFFF' : COLORS.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.topStepText, activeCreationStep >= 3 && styles.topStepTextActive]}>
                  Step 3: Launch
                </Text>
              </View>
            </View>
          </View>

         

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enter Project Details (Step 1)</Text>
            <Text style={styles.formSubtitle}>
              Specify your project goals and required skills. Our AI will suggest suitable teammates and automatically link a workspace.
            </Text>
            <Text style={styles.inputLabel}>Project Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AI-Based Healthcare Assistant"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.inputLabel}>Project Description / Abstract *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe research goals, methods, and expected deliverables..."
              placeholderTextColor={COLORS.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Research / Professional Domain</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Healthcare AI"
                  placeholderTextColor={COLORS.textLight}
                  value={researchDomain}
                  onChangeText={setResearchDomain}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Desired Team Size</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 4"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={desiredTeamSize}
                  onChangeText={setDesiredTeamSize}
                />
              </View>
            </View>
            <Text style={styles.inputLabel}>Required Skills (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Python, PyTorch, Computer Vision, MLOps"
              placeholderTextColor={COLORS.textLight}
              value={requiredSkills}
              onChangeText={setRequiredSkills}
            />
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Project Goals</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Submit paper to MICCAI"
                  placeholderTextColor={COLORS.textLight}
                  value={projectGoals}
                  onChangeText={setProjectGoals}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Timeline / Duration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 3 months"
                  placeholderTextColor={COLORS.textLight}
                  value={timeline}
                  onChangeText={setTimeline}
                />
              </View>
            </View>

            {/* Run AI Match Button */}
            <TouchableOpacity
              style={styles.btnSearch}
              onPress={handleFindTeammates}
              disabled={searching}
              activeOpacity={0.8}
            >
              {searching ? (
                <View style={styles.btnInnerRow}>
                  <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.btnSearchText}>Computing Semantic Embeddings...</Text>
                </View>
              ) : (
                <View style={styles.btnInnerRow}>
                  <Ionicons name="sparkles" size={17} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnSearchText}>AI Suggested People (Step 2)</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* AI Recommendations List (Step 2) */}
          {searching ? (
            <LoadingView message="Matching candidate researcher embeddings & skill profiles..." />
          ) : searched ? (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  AI Suggested People ({recommendations.length})
                </Text>
                <Text style={styles.resultsSubtitle}>
                  Ranked by semantic vector similarity, complementary skills, and proximity. Candidates are not auto-added to the team.
                </Text>
              </View>
              {recommendations.length === 0 ? (
                <EmptyStateView
                  title="No Matching Collaborators"
                  description="Try broadening required skills or adjusting the project description."
                />
              ) : (
                recommendations.map((candidate) => {
                  const profileImg =
                    candidate.profileImage ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
                  const isInviting = invitingId === candidate._id;
                  const isInvited = candidate.isInvited;
                  return (
                    <View key={candidate._id} style={styles.candidateCard}>
                      <View style={styles.candidateTopRow}>
                        <Image source={{ uri: profileImg }} style={styles.candidateAvatar} />
                        <View style={styles.candidateInfo}>
                          <View style={styles.candidateNameRow}>
                            <Text style={styles.candidateName} numberOfLines={1}>
                              {candidate.name}
                            </Text>
                            <View style={styles.scoreBadge}>
                              <Text style={styles.scoreBadgeText}>
                                {candidate.compatibilityScore}% Match
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.candidateRole} numberOfLines={1}>
                            {candidate.role || 'Researcher'} • {candidate.organization || 'GeoConnect'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 3 }} />
                            <Text style={styles.candidateDist}>{candidate.approximateDistance}</Text>
                          </View>
                        </View>
                      </View>

                      {/* AI Why Recommended */}
                      <View style={styles.reasonBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="sparkles" size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
                          <Text style={styles.reasonLabel}>Why Recommended:</Text>
                        </View>
                        <Text style={styles.reasonText}>{candidate.recommendationReason}</Text>
                      </View>

                      {/* Overlapping Skills */}
                      {Array.isArray(candidate.matchedSkills) && candidate.matchedSkills.length > 0 && (
                        <View style={styles.skillsRow}>
                          <Text style={styles.skillsLabel}>Overlapping Skills:</Text>
                          {candidate.matchedSkills.slice(0, 4).map((s, i) => (
                            <View key={i} style={styles.skillPill}>
                              <Text style={styles.skillPillText}>{s}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.candidateActions}>
                        <TouchableOpacity
                          style={styles.btnOutline}
                          onPress={() => setSelectedUser(candidate)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.btnOutlineText}>View Profile</Text>
                        </TouchableOpacity>
                        {isInvited ? (
                          <View style={styles.btnInvited}>
                            <Ionicons name="time-outline" size={13} color={COLORS.primaryDark} style={{ marginRight: 4 }} />
                            <Text style={styles.btnInvitedText}>Invite Sent (Pending)</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.btnInvite}
                            onPress={() => handleInviteCandidate(candidate)}
                            disabled={isInviting}
                            activeOpacity={0.7}
                          >
                            {isInviting ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <View style={styles.btnInnerRow}>
                                <Ionicons name="person-add" size={13} color="#ffffff" style={{ marginRight: 5 }} />
                                <Text style={styles.btnInviteText}>Invite to Team</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* SUB-TAB 3: TEAM REQUESTS & MY SENT REQUESTS */}
      {subTab === 'requests' && (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollBody}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Sub Pills: Inbound vs Sent */}
          <View style={styles.subPillsRow}>
            <TouchableOpacity
              style={[styles.subPill, requestsSubTab === 'incoming' && styles.subPillActive]}
              onPress={() => setRequestsSubTab('incoming')}
              activeOpacity={0.7}
            >
              <Text style={[styles.subPillText, requestsSubTab === 'incoming' && styles.subPillTextActive]}>
                Team Requests ({incomingRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subPill, requestsSubTab === 'sent' && styles.subPillActive]}
              onPress={() => setRequestsSubTab('sent')}
              activeOpacity={0.7}
            >
              <Text style={[styles.subPillText, requestsSubTab === 'sent' && styles.subPillTextActive]}>
                My Sent ({sentRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Incoming Team Requests */}
          {requestsSubTab === 'incoming' ? (
            incomingRequests.length === 0 ? (
              <EmptyStateView
                title="No Pending Team Requests"
                description="When researchers request to join your projects, their applications will appear here for your review."
              />
            ) : (
              incomingRequests.map((req) => {
                const u = req.user;
                const isResponding = respondingRequestId === req._id;
                return (
                  <View key={req._id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestProjectTitle} numberOfLines={1}>
                        {req.projectTitle}
                      </Text>
                      <View style={styles.pendingPill}>
                        <Text style={styles.pendingPillText}>Pending</Text>
                      </View>
                    </View>
                    <View style={styles.requesterProfileRow}>
                      <Image
                        source={{
                          uri:
                            u?.profileImage ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                        }}
                        style={styles.requesterAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requesterName}>{u?.name || 'Researcher'}</Text>
                        <Text style={styles.requesterRole}>
                          {u?.role || 'Engineer'} {u?.organization ? `• ${u.organization}` : ''}
                        </Text>
                        <Text style={styles.reqRoleBadge}>Desired Role: {req.role || 'Contributor'}</Text>
                      </View>
                    </View>
                    {req.message ? (
                      <View style={styles.reqMessageBox}>
                        <Text style={styles.reqMessageText}>"{req.message}"</Text>
                      </View>
                    ) : null}
                    <View style={styles.reqButtonsRow}>
                      <TouchableOpacity
                        style={styles.btnReject}
                        onPress={() => handleRespondJoinRequest(req.projectId, req._id, 'reject')}
                        disabled={isResponding}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={15} color={COLORS.danger} style={{ marginRight: 4 }} />
                        <Text style={styles.btnRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnAccept}
                        onPress={() => handleRespondJoinRequest(req.projectId, req._id, 'accept')}
                        disabled={isResponding}
                        activeOpacity={0.8}
                      >
                        {isResponding ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <View style={styles.btnInnerRow}>
                            <Ionicons name="checkmark" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={styles.btnAcceptText}>Accept & Grant Access</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          ) : (
            /* Sent Requests */
            sentRequests.length === 0 ? (
              <EmptyStateView
                title="No Sent Requests"
                description="You have not requested to join any teams yet."
              />
            ) : (
              sentRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isAccepted = req.status === 'accepted';
                const isRejected = req.status === 'rejected';
                return (
                  <View key={req._id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestProjectTitle} numberOfLines={1}>
                        {req.project?.title || 'Research Project'}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isAccepted
                            ? styles.statusCompleted
                            : isRejected
                            ? styles.statusDeclined
                            : styles.statusRecruiting
                        ]}
                      >
                        <Text style={styles.statusBadgeTextGeneral}>{req.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.sentProjectDesc} numberOfLines={2}>
                      {req.project?.description}
                    </Text>
                    <View style={styles.sentMetaRow}>
                      <Text style={styles.sentMetaText}>
                        Owner: <Text style={{ fontWeight: '600', color: COLORS.textMain }}>{req.project?.owner?.name || 'Project Lead'}</Text>
                      </Text>
                      <Text style={styles.sentMetaText}>
                        Role: <Text style={{ fontWeight: '600', color: COLORS.textMain }}>{req.role}</Text>
                      </Text>
                    </View>
                    {isPending && (
                      <View style={styles.sentActionRow}>
                        <TouchableOpacity
                          style={styles.btnCancelOutline}
                          onPress={() => handleCancelSentRequest(req.project?._id || req.project)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={13} color={COLORS.danger} style={{ marginRight: 4 }} />
                          <Text style={styles.btnCancelOutlineText}>Cancel Request</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )
          )}
        </ScrollView>
      )}

      {/* SUB-TAB 4: RECEIVED INVITATIONS */}
      {subTab === 'invitations' && (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollBody}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loadingInvites && !refreshing ? (
            <LoadingView message="Loading project invitations..." />
          ) : myInvitations.length === 0 ? (
            <EmptyStateView
              title="No Project Invitations"
              description="When other researchers invite you to join their collaborative project, invitations will appear here."
            />
          ) : (
            myInvitations.map((inv) => {
              const isResponding = respondingId === inv.projectId;
              const isAccepted = inv.invitationStatus === 'accepted';
              const isDeclined = inv.invitationStatus === 'declined';
              return (
                <View key={inv.projectId} style={styles.inviteCard}>
                  <View style={styles.inviteHeader}>
                    <View style={styles.inviteTitleCol}>
                      <Text style={styles.inviteProjectTitle}>{inv.projectTitle}</Text>
                      <Text style={styles.inviteMeta}>
                        From: {inv.owner?.name} ({inv.owner?.organization || 'Institution'})
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.inviteStatusBadge,
                        isAccepted
                          ? styles.statusCompleted
                          : isDeclined
                          ? styles.statusDeclined
                          : styles.statusRecruiting
                      ]}
                    >
                      <Text style={styles.statusBadgeTextGeneral}>
                        {isAccepted ? 'Accepted' : isDeclined ? 'Declined' : 'Pending Invite'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.inviteDesc} numberOfLines={3}>
                    {inv.projectDescription}
                  </Text>
                  <View style={styles.roleOfferBox}>
                    <Text style={styles.roleOfferLabel}>Invited Role: </Text>
                    <Text style={styles.roleOfferValue}>{inv.myRole}</Text>
                  </View>
                  {!isAccepted && !isDeclined ? (
                    <View style={styles.inviteActionRow}>
                      <TouchableOpacity
                        style={styles.btnAccept}
                        onPress={() => handleRespondInvitation(inv.projectId, 'accept')}
                        disabled={isResponding}
                        activeOpacity={0.7}
                      >
                        {isResponding ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <View style={styles.btnInnerRow}>
                            <Ionicons name="checkmark-circle" size={15} color="#ffffff" style={{ marginRight: 5 }} />
                            <Text style={styles.btnAcceptText}>Accept & Join Team</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnDecline}
                        onPress={() => handleRespondInvitation(inv.projectId, 'decline')}
                        disabled={isResponding}
                        activeOpacity={0.7}
                      >
                        <View style={styles.btnInnerRow}>
                          <Ionicons name="close-circle-outline" size={15} color={COLORS.danger} style={{ marginRight: 5 }} />
                          <Text style={styles.btnDeclineText}>Decline</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.resolvedInviteBox}>
                      <Ionicons
                        name={isAccepted ? 'checkmark-circle' : 'close-circle-outline'}
                        size={16}
                        color={isAccepted ? COLORS.primary : COLORS.danger}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.resolvedInviteText}>
                        {isAccepted
                          ? 'You have accepted this invitation and are part of the team.'
                          : 'You declined this invitation.'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FULL PROJECT DETAIL & WORKSPACE MODAL */}
      <Modal
        visible={Boolean(selectedProject)}
        animationType="slide"
        onRequestClose={() => setSelectedProject(null)}
      >
        {selectedProject ? (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedProject(null)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textMain} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {selectedProject.title}
              </Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.lifecycleCard}>
                <View style={styles.lifecycleHeaderRow}>
                  <Text style={styles.lifecycleTitle}>Project Lifecycle</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedProject.status === 'Completed'
                        ? styles.statusCompleted
                        : selectedProject.workspace
                        ? styles.statusWorkspace
                        : styles.statusTeam
                    ]}
                  >
                    <Text style={styles.statusBadgeTextGeneral}>
                      {selectedProject.status === 'Completed'
                        ? 'Completed'
                        : selectedProject.workspace
                        ? 'Workspace Active'
                        : 'Team Ready'}
                    </Text>
                  </View>
                </View>

                <View style={styles.stepperRow}>
                  <View style={styles.stepperItem}>
                    <View style={[styles.stepCircle, styles.stepCircleDone]}>
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    </View>
                    <Text style={styles.stepLabel}>Project</Text>
                  </View>
                  <View style={styles.stepLine} />
                  <View style={styles.stepperItem}>
                    <View style={[styles.stepCircle, styles.stepCircleDone]}>
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    </View>
                    <Text style={styles.stepLabel}>AI Match</Text>
                  </View>
                  <View style={styles.stepLine} />
                  <View style={styles.stepperItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        (selectedProject.finalTeam?.length || 0) > 0 && styles.stepCircleDone
                      ]}
                    >
                      {(selectedProject.finalTeam?.length || 0) > 0 ? (
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      ) : (
                        <Text style={styles.stepCircleText}>3</Text>
                      )}
                    </View>
                    <Text style={styles.stepLabel}>Accepted</Text>
                  </View>
                  <View style={styles.stepLine} />
                  <View style={styles.stepperItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        selectedProject.workspace && styles.stepCircleDone
                      ]}
                    >
                      {selectedProject.workspace ? (
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      ) : (
                        <Text style={styles.stepCircleText}>4</Text>
                      )}
                    </View>
                    <Text style={styles.stepLabel}>Workspace</Text>
                  </View>
                  <View style={styles.stepLine} />
                  <View style={styles.stepperItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        selectedProject.status === 'Completed' && styles.stepCircleDone
                      ]}
                    >
                      {selectedProject.status === 'Completed' ? (
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      ) : (
                        <Text style={styles.stepCircleText}>5</Text>
                      )}
                    </View>
                    <Text style={styles.stepLabel}>Done</Text>
                  </View>
                </View>
              </View>

              {selectedProject.workspace && (
                <TouchableOpacity
                  style={styles.btnLaunchWorkspace}
                  onPress={() => {
                    const wsId = selectedProject.workspace?._id || selectedProject.workspace;
                    setSelectedProject(null);
                    navigation.navigate('WorkspaceDetail', { workspaceId: wsId });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="folder-open" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnLaunchWorkspaceText}>
                    Open Dedicated Workspace & Group Chat →
                  </Text>
                </TouchableOpacity>
              )}

              {selectedProject.status === 'Completed' && (
                <View style={styles.celebrationBanner}>
                  <Ionicons name="trophy" size={28} color="#D97706" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.celebrationTitle}>Project Successfully Delivered!</Text>
                    <Text style={styles.celebrationSubtitle}>
                      All project milestones and workspace tasks have been completed by the collaborative team.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalSectionCard}>
                <Text style={styles.sectionHeader}>Overview & Objectives</Text>
                <Text style={styles.sectionBodyText}>{selectedProject.description}</Text>
                {Boolean(selectedProject.projectGoals) && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.inputLabel}>Goals:</Text>
                    <Text style={styles.sectionBodyText}>{selectedProject.projectGoals}</Text>
                  </View>
                )}
                {Array.isArray(selectedProject.requiredSkills) && selectedProject.requiredSkills.length > 0 && (
                  <View style={styles.skillsRowModal}>
                    {selectedProject.requiredSkills.map((s, idx) => (
                      <View key={idx} style={styles.skillPill}>
                        <Text style={styles.skillPillText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.modalSectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>Confirmed Team</Text>
                  <Text style={styles.teamBadgeCount}>
                    {(selectedProject.finalTeam?.length || 0) + 1} / {selectedProject.desiredTeamSize || 4} Members
                  </Text>
                </View>

                <View style={styles.memberRow}>
                  <Image
                    source={{
                      uri:
                        selectedProject.owner?.profileImage ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                    }}
                    style={styles.memberAvatar}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{selectedProject.owner?.name}</Text>
                    <Text style={styles.memberSub}>
                      {selectedProject.owner?.role || 'Project Lead'} • {selectedProject.owner?.organization || 'Institution'}
                    </Text>
                  </View>
                  <View style={styles.leadPill}>
                    <Text style={styles.leadPillText}>Project Lead</Text>
                  </View>
                </View>

                {selectedProject.finalTeam?.map((m, idx) => (
                  <View key={m.user?._id || idx} style={styles.memberRow}>
                    <Image
                      source={{
                        uri:
                          m.user?.profileImage ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                      }}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{m.user?.name}</Text>
                      <Text style={styles.memberSub}>
                        {m.role || m.user?.role || 'Researcher'} • {m.user?.organization || 'Institution'}
                      </Text>
                    </View>
                    <View style={styles.collaboratorPill}>
                      <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.collaboratorPillText}>Confirmed</Text>
                    </View>
                  </View>
                ))}

                {!selectedProject.workspace && (
                  <TouchableOpacity
                    style={styles.btnLaunchWorkspace}
                    onPress={() => handleFinalizeTeam(selectedProject._id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="rocket-outline" size={17} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnLaunchWorkspaceText}>
                      Confirm Final Team & Launch Workspace
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedProject.workspace && (
                <View style={styles.modalSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>Workspace Tasks</Text>
                    <TouchableOpacity
                      style={styles.btnAddTaskSmall}
                      onPress={() => setIsTaskModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={14} color="#ffffff" style={{ marginRight: 2 }} />
                      <Text style={styles.btnAddTaskSmallText}>Add Task</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.workspaceNote}>
                    Tap any task's status chip to transition: To Do → In Progress → Completed
                  </Text>

                  {selectedProject.workspace?.tasks?.length === 0 ? (
                    <Text style={styles.emptyTasksText}>No tasks yet. Tap 'Add Task' to assign deliverables.</Text>
                  ) : (
                    selectedProject.workspace?.tasks?.map((task) => {
                      const isDone = task.status === 'Completed';
                      const isInProgress = task.status === 'In Progress';
                      return (
                        <View key={task._id} style={[styles.taskItemCard, isDone && styles.taskItemDone]}>
                          <View style={styles.taskItemLeft}>
                            <Text style={[styles.taskItemTitle, isDone && styles.taskTitleDone]}>
                              {task.title}
                            </Text>
                            {Boolean(task.description) && (
                              <Text style={styles.taskItemDesc}>{task.description}</Text>
                            )}
                            <View style={styles.taskMetaRow}>
                              <Text style={styles.taskAssignee}>
                                Assigned: {task.assignee?.name || 'Team'}
                              </Text>
                              <Text style={styles.taskPriority}>
                                • Priority: {task.priority}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.taskStatusChip,
                              isDone
                                ? styles.taskStatusDone
                                : isInProgress
                                ? styles.taskStatusProgress
                                : styles.taskStatusTodo
                            ]}
                            onPress={() =>
                              handleCycleTaskStatus(
                                selectedProject.workspace._id,
                                task._id,
                                task.status
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text
                                style={[
                                  styles.taskStatusChipText,
                                  isDone
                                    ? styles.taskStatusDoneText
                                    : isInProgress
                                    ? styles.taskStatusProgressText
                                    : styles.taskStatusTodoText
                                ]}
                              >
                                {task.status}
                              </Text>
                              <Ionicons
                                name="sync-outline"
                                size={11}
                                color={isDone ? '#065F46' : isInProgress ? '#92400E' : '#374151'}
                                style={{ marginLeft: 4 }}
                              />
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}

                  {selectedProject.status !== 'Completed' && (
                    <TouchableOpacity
                      style={styles.btnCompleteProject}
                      onPress={() => handleCompleteProject(selectedProject._id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.btnCompleteProjectText}>
                        Complete Project & Deliver
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        ) : null}
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={isTaskModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTaskModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.taskModalOverlay}
          activeOpacity={1}
          onPress={() => setIsTaskModalVisible(false)}
        >
          <View style={styles.taskModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.taskModalHeader}>Add Workspace Task</Text>
            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Implement Baseline ResNet Model"
              placeholderTextColor={COLORS.textLight}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Task details and deliverables..."
              placeholderTextColor={COLORS.textLight}
              value={newTaskDesc}
              onChangeText={setNewTaskDesc}
              multiline
            />
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {['Low', 'Medium', 'High'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityPill,
                    newTaskPriority === p && styles.priorityPillActive
                  ]}
                  onPress={() => setNewTaskPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityPillText,
                      newTaskPriority === p && styles.priorityPillTextActive
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.taskModalBtnRow}>
              <TouchableOpacity
                style={styles.btnTaskCancel}
                onPress={() => setIsTaskModalVisible(false)}
              >
                <Text style={styles.btnTaskCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnTaskSubmit}
                onPress={handleAddTask}
                disabled={addingTask}
              >
                {addingTask ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnTaskSubmitText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Selected Profile Modal View */}
      {selectedUser && (
        <ProfileModalView
          user={selectedUser}
          visible={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          onConnectSuccess={() => {}}
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
  actionNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderColor: '#C4DEC9',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10
  },
  actionNoticeText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: 'transparent'
  },
  subTabBtnActive: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9'
  },
  subTabBtnText: {
    fontSize: 13,
    color: COLORS.textMuted || '#6B7280',
    fontWeight: '500'
  },
  subTabBtnTextActive: {
    color: COLORS.primary || '#15803D',
    fontWeight: '700'
  },
  tabBadge: {
    backgroundColor: COLORS.warning || '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700'
  },
  subPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 10,
    backgroundColor: COLORS.bgMain,
    marginBottom: 6
  },
  subPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
  contentScroll: {
    flex: 1
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40
  },
  topProgressWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.sm
  },
  topStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  topStepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bgMain || '#F9F8F5'
  },
  topStepBadgeActive: {
    backgroundColor: COLORS.primary || '#24563B'
  },
  topStepText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  topStepTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  flowBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  flowBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  flowStepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  flowStepPill: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8
  },
  presetsRow: {
    marginBottom: 16
  },
  presetPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    ...SHADOWS.sm
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.card
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain
  },
  formSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 6,
    marginTop: 8
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10
  },
  col: {
    flex: 1
  },
  btnSearch: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...SHADOWS.sm
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnSearchText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  resultsContainer: {
    marginTop: 8
  },
  resultsHeader: {
    marginBottom: 14
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain
  },
  resultsSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  candidateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  candidateTopRow: {
    flexDirection: 'row'
  },
  candidateAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12
  },
  candidateInfo: {
    flex: 1
  },
  candidateNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1
  },
  scoreBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6DDD0'
  },
  scoreBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '700'
  },
  candidateRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  candidateDist: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3
  },
  reasonBox: {
    backgroundColor: COLORS.bgInput,
    padding: 10,
    borderRadius: 8,
    marginTop: 12
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 3
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.textMain,
    lineHeight: 16
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10
  },
  skillsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  skillPill: {
    backgroundColor: COLORS.sageLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4E0D7'
  },
  skillPillText: {
    fontSize: 11,
    color: COLORS.sage,
    fontWeight: '600'
  },
  candidateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9
  },
  btnOutlineText: {
    fontSize: 13,
    color: COLORS.textMain,
    fontWeight: '600'
  },
  btnInvite: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9
  },
  btnInviteText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700'
  },
  btnInvited: {
    backgroundColor: COLORS.sageLight,
    borderWidth: 1,
    borderColor: '#B8CEBE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnInvitedText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600'
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  projectCardCompleted: {
    borderColor: '#86EFAC',
    backgroundColor: '#FAFDFB'
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 10
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain
  },
  projectSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  statusRecruiting: {
    backgroundColor: '#FEF3C7'
  },
  statusTeam: {
    backgroundColor: '#E0E7FF'
  },
  statusWorkspace: {
    backgroundColor: COLORS.primaryLight
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7'
  },
  statusDeclined: {
    backgroundColor: '#FEE2E2'
  },
  statusBadgeTextGeneral: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151'
  },
  statusCompletedText: {
    color: '#15803D'
  },
  statusWorkspaceText: {
    color: COLORS.primaryDark
  },
  projectDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 8
  },
  teamRosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight
  },
  teamRosterLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  teamCountText: {
    fontSize: 12,
    color: COLORS.textMain,
    fontWeight: '600'
  },
  ownerRoleBadge: {
    fontSize: 11,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '700'
  },
  memberRoleBadge: {
    fontSize: 11,
    color: COLORS.sage,
    backgroundColor: COLORS.sageLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600'
  },
  taskProgressBarContainer: {
    marginTop: 10
  },
  taskProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  taskProgressLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  taskProgressPercent: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700'
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3
  },
  btnOpenWorkspaceDirect: {
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12
  },
  btnOpenWorkspaceDirectText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight
  },
  btnCardAction: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnCardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  requestProjectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
    marginRight: 8
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  pendingPillText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700'
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
  sentProjectDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8
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
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  inviteTitleCol: {
    flex: 1,
    marginRight: 10
  },
  inviteProjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain
  },
  inviteMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  inviteDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 8
  },
  roleOfferBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    padding: 8,
    borderRadius: 8,
    marginTop: 10
  },
  roleOfferLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  roleOfferValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  inviteActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  btnDecline: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  btnDeclineText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 13
  },
  resolvedInviteBox: {
    marginTop: 12,
    padding: 8,
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  resolvedInviteText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  modalCloseBtn: {
    padding: 4
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    maxWidth: 240
  },
  modalScroll: {
    flex: 1
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  lifecycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  lifecycleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  lifecycleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  stepperItem: {
    alignItems: 'center'
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  stepCircleDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  stepCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
    marginBottom: 14
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  celebrationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E'
  },
  celebrationSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16
  },
  modalSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain
  },
  teamBadgeCount: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  sectionBodyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18
  },
  skillsRowModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  memberSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  leadPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  leadPillText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700'
  },
  collaboratorPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  collaboratorPillText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700'
  },
  btnLaunchWorkspace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16
  },
  btnLaunchWorkspaceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  workspaceNote: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 12
  },
  emptyTasksText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginVertical: 10
  },
  btnAddTaskSmall: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  btnAddTaskSmallText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgInput,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  taskItemDone: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  taskItemLeft: {
    flex: 1,
    marginRight: 10
  },
  taskItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted
  },
  taskItemDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  taskAssignee: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600'
  },
  taskPriority: {
    fontSize: 10,
    color: COLORS.textLight,
    marginLeft: 4
  },
  taskStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  taskStatusTodo: {
    backgroundColor: '#FEF3C7'
  },
  taskStatusProgress: {
    backgroundColor: '#E0E7FF'
  },
  taskStatusDone: {
    backgroundColor: '#DCFCE7'
  },
  taskStatusChipText: {
    fontSize: 11,
    fontWeight: '700'
  },
  taskStatusTodoText: {
    color: '#92400E'
  },
  taskStatusProgressText: {
    color: '#3730A3'
  },
  taskStatusDoneText: {
    color: '#15803D'
  },
  btnCompleteProject: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803D',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16
  },
  btnCompleteProjectText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  taskModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  taskModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md
  },
  taskModalHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 16
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  priorityPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary
  },
  priorityPillText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  priorityPillTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  taskModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10
  },
  btnTaskCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  btnTaskCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 13
  },
  btnTaskSubmit: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  btnTaskSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  }
});

export default TeamBuilderView;