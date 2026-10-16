import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getWorkspaceByIdApi,
  addTaskApi,
  updateTaskApi,
  deleteTaskApi,
  addMilestoneApi,
  toggleMilestoneApi,
  addNoteApi,
  deleteNoteApi,
  inviteMemberApi,
  cancelWorkspaceInvitationApi,
  deleteWorkspaceApi,
  getWorkspaceMessagesApi,
  postWorkspaceMessageApi,
  removeWorkspaceMemberApi
} from '../services/workspaceService';
import { getAcceptedConnections } from '../services/connectionService';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const WorkspaceDetailScreen = ({ route, navigation }) => {
  const { workspaceId } = route.params || {};
  const { user: currentUser } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  // Active Tab: 'tasks' | 'milestones' | 'notes' | 'members' | 'discussion'
  const [activeTab, setActiveTab] = useState('tasks');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskAssignee, setTaskAssignee] = useState('');

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteUrl, setNoteUrl] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Discussion / Group Chat State
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatScrollRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const fetchWorkspace = async () => {
    setLoading(true);
    try {
      const res = await getWorkspaceByIdApi(workspaceId);
      if (res.success) {
        setWorkspace(res.workspace);
      }
    } catch (err) {
      console.error('Fetch workspace error:', err);
      Alert.alert('Access Denied', err.message || 'Could not load workspace.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await getWorkspaceMessagesApi(workspaceId);
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && activeTab === 'discussion') {
      fetchMessages();
    }
  }, [workspaceId, activeTab]);

  // Load accepted connections when opening invite modal
  const handleOpenInviteModal = async () => {
    setShowInviteModal(true);
    setLoadingConnections(true);
    try {
      const res = await getAcceptedConnections();
      if (res.success) {
        setConnections(res.connections || []);
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Add Task
  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addTaskApi(workspaceId, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        assignee: taskAssignee || undefined
      });
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, tasks: res.tasks }));
        setShowTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        showNotice('Task created successfully!');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Task Status
  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
    try {
      const res = await updateTaskApi(workspaceId, task._id, { status: nextStatus });
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, tasks: res.tasks }));
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update task.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await deleteTaskApi(workspaceId, taskId);
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, tasks: res.tasks }));
      }
    } catch (err) {
      Alert.alert('Error', 'Could not delete task.');
    }
  };

  // Add Milestone
  const handleAddMilestone = async () => {
    if (!milestoneTitle.trim()) {
      Alert.alert('Required', 'Please enter milestone goal.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addMilestoneApi(workspaceId, { title: milestoneTitle.trim() });
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, milestones: res.milestones }));
        setShowMilestoneModal(false);
        setMilestoneTitle('');
        showNotice('Milestone defined!');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add milestone.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Milestone
  const handleToggleMilestone = async (mId) => {
    try {
      const res = await toggleMilestoneApi(workspaceId, mId);
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, milestones: res.milestones }));
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update milestone.');
    }
  };

  // Add Note
  const handleAddNote = async () => {
    if (!noteTitle.trim()) {
      Alert.alert('Required', 'Please enter note title.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addNoteApi(workspaceId, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        linkUrl: noteUrl.trim()
      });
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, notes: res.notes }));
        setShowNoteModal(false);
        setNoteTitle('');
        setNoteContent('');
        setNoteUrl('');
        showNotice('Note shared with team!');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not add note.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    try {
      const res = await deleteNoteApi(workspaceId, noteId);
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, notes: res.notes }));
      }
    } catch (err) {
      Alert.alert('Error', 'Could not remove note.');
    }
  };

  // Invite Connection (Sends pending invitation)
  const handleInviteUser = async (userId) => {
    try {
      const res = await inviteMemberApi(workspaceId, { userId, role: 'Researcher' });
      if (res.success) {
        setWorkspace((prev) => ({
          ...prev,
          invitations: res.invitations || prev.invitations,
          members: res.members || prev.members
        }));
        Alert.alert('Invitation Sent', 'An invitation has been sent! The researcher will be added to the team once they accept.');
        showNotice('Workspace invitation sent!');
      }
    } catch (err) {
      Alert.alert('Invite Error', err.message || 'Could not invite user.');
    }
  };

  // Cancel Outbound Invitation (Owner only)
  const handleCancelInvitation = (invitationId, userName) => {
    Alert.alert(
      'Cancel Invitation',
      `Are you sure you want to cancel the invitation sent to ${userName || 'this collaborator'}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await cancelWorkspaceInvitationApi(workspaceId, invitationId);
              if (res.success) {
                setWorkspace((prev) => ({
                  ...prev,
                  invitations: (prev.invitations || []).map((i) =>
                    i._id === invitationId ? { ...i, status: 'cancelled' } : i
                  )
                }));
                showNotice('Invitation cancelled.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not cancel invitation.');
            }
          }
        }
      ]
    );
  };

  // Delete Workspace (Owner only)
  const handleDeleteWorkspace = () => {
    Alert.alert(
      'Delete Workspace',
      `Are you sure you want to delete "${workspace?.title}"? All tasks, milestones, discussions, and member associations will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteWorkspaceApi(workspaceId);
              if (res.success) {
                Alert.alert('Workspace Deleted', 'The workspace has been successfully deleted.');
                navigation.goBack();
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete workspace.');
            }
          }
        }
      ]
    );
  };

  // Remove Member (Owner only)
  const handleRemoveMember = async (memberUser) => {
    const memberId = memberUser?._id || memberUser;
    const memberName = memberUser?.name || 'this member';

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this workspace and linked team? Their access will be revoked immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await removeWorkspaceMemberApi(workspaceId, memberId);
              if (res.success) {
                setWorkspace((prev) => ({ ...prev, members: res.members }));
                showNotice(`${memberName} has been removed.`);
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not remove member.');
            }
          }
        }
      ]
    );
  };

  // Send Group Discussion Message
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await postWorkspaceMessageApi(workspaceId, messageText.trim());
      if (res.success) {
        setMessages((prev) => [...prev, res.message]);
        setMessageText('');
        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOpenLink = (url) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => Alert.alert('Cannot Open URL', 'Please check link address.'));
  };

  if (loading) return <LoadingView message="Loading research workspace..." />;
  if (!workspace) return <EmptyStateView title="Workspace Not Found" description="Could not load project workspace." />;

  const isOwner =
    Boolean(workspace.isOwner) ||
    workspace.owner?._id?.toString() === currentUser?._id?.toString();

  return (
    <View style={styles.container}>
      {/* Top Banner Notice */}
      {actionNotice ? (
        <View style={styles.actionNoticeBox}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.actionNoticeText}>{actionNotice}</Text>
        </View>
      ) : null}

      {/* Workspace Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{workspace.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{workspace.status}</Text>
            </View>
            {isOwner && (
              <TouchableOpacity
                style={styles.btnDeleteWorkspaceHeader}
                onPress={handleDeleteWorkspace}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete Workspace"
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.danger || '#EF4444'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{workspace.description}</Text>

        {/* Progress Tracker */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Progress: {workspace.completedTaskCount || 0}/{workspace.taskCount || 0} tasks completed ({workspace.progressPercent || 0}%)
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${workspace.progressPercent || 0}%` }]} />
          </View>
        </View>
      </View>

      {/* Tabs Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'tasks' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkbox-outline"
            size={14}
            color={activeTab === 'tasks' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'tasks' ? styles.tabBtnTextActive : null]}>
            Tasks ({workspace.tasks?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'milestones' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('milestones')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flag-outline"
            size={14}
            color={activeTab === 'milestones' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'milestones' ? styles.tabBtnTextActive : null]}>
            Milestones ({workspace.milestones?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'notes' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('notes')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={activeTab === 'notes' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'notes' ? styles.tabBtnTextActive : null]}>
            Notes ({workspace.notes?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'members' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('members')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people-outline"
            size={14}
            color={activeTab === 'members' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'members' ? styles.tabBtnTextActive : null]}>
            Team ({workspace.members?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'discussion' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('discussion')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={14}
            color={activeTab === 'discussion' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'discussion' ? styles.tabBtnTextActive : null]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. TASKS TAB */}
      {activeTab === 'tasks' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Sprint & Action Items</Text>
            <TouchableOpacity style={styles.btnAction} onPress={() => setShowTaskModal(true)} activeOpacity={0.8}>
              <View style={styles.btnContentRow}>
                <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.btnActionText}>Add Task</Text>
              </View>
            </TouchableOpacity>
          </View>

          {Array.isArray(workspace.tasks) && workspace.tasks.length > 0 ? (
            workspace.tasks.map((task) => {
              const isDone = task.status === 'Completed';
              return (
                <View key={task._id} style={styles.itemCard}>
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => handleToggleTaskStatus(task)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isDone ? styles.checkboxChecked : null]}>
                      {isDone ? <Ionicons name="checkmark" size={13} color="#ffffff" /> : null}
                    </View>
                    <View style={styles.taskTextCol}>
                      <Text style={[styles.itemTitle, isDone ? styles.itemTitleDone : null]}>
                        {task.title}
                      </Text>
                      {task.description ? (
                        <Text style={styles.itemDesc} numberOfLines={2}>
                          {task.description}
                        </Text>
                      ) : null}
                      <View style={styles.taskMetaRow}>
                        <View style={styles.priorityPill}>
                          <Text style={styles.priorityText}>{task.priority || 'Medium'}</Text>
                        </View>
                        {task.assignee?.name ? (
                          <View style={styles.assigneeRow}>
                            <Ionicons name="person-outline" size={12} color={COLORS.textLight} style={{ marginRight: 3 }} />
                            <Text style={styles.assigneeText}>{task.assignee.name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDeleteTask(task._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <EmptyStateView
              title="No Tasks Yet"
              description="Keep research deliverables on track by adding your first project task."
            />
          )}
        </ScrollView>
      ) : null}

      {/* 2. MILESTONES TAB */}
      {activeTab === 'milestones' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Project Milestones</Text>
            <TouchableOpacity style={styles.btnAction} onPress={() => setShowMilestoneModal(true)} activeOpacity={0.8}>
              <View style={styles.btnContentRow}>
                <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.btnActionText}>Milestone</Text>
              </View>
            </TouchableOpacity>
          </View>

          {Array.isArray(workspace.milestones) && workspace.milestones.length > 0 ? (
            workspace.milestones.map((m) => (
              <TouchableOpacity
                key={m._id}
                style={styles.itemCard}
                onPress={() => handleToggleMilestone(m._id)}
                activeOpacity={0.8}
              >
                <View style={styles.checkRow}>
                  <View style={[styles.checkbox, m.completed ? styles.checkboxChecked : null]}>
                    {m.completed ? <Ionicons name="checkmark" size={13} color="#ffffff" /> : null}
                  </View>
                  <View style={styles.taskTextCol}>
                    <Text style={[styles.itemTitle, m.completed ? styles.itemTitleDone : null]}>
                      {m.title}
                    </Text>
                    <View style={styles.milestoneStatusRow}>
                      <Ionicons
                        name={m.completed ? 'checkmark-circle' : 'time-outline'}
                        size={13}
                        color={m.completed ? '#2E7D32' : '#F57F17'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.itemMeta, { color: m.completed ? '#2E7D32' : '#F57F17' }]}>
                        {m.completed ? 'Achieved' : 'In Progress'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyStateView
              title="No Milestones Defined"
              description="Define key research gates: Literature Review, Dataset Curation, Model Architecture, Paper Submission."
            />
          )}
        </ScrollView>
      ) : null}

      {/* 3. NOTES & LINKS TAB */}
      {activeTab === 'notes' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Research Notes & Links</Text>
            <TouchableOpacity style={styles.btnAction} onPress={() => setShowNoteModal(true)} activeOpacity={0.8}>
              <View style={styles.btnContentRow}>
                <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.btnActionText}>New Note</Text>
              </View>
            </TouchableOpacity>
          </View>

          {Array.isArray(workspace.notes) && workspace.notes.length > 0 ? (
            workspace.notes.map((n) => (
              <View key={n._id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle}>{n.title}</Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(n._id)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

                {n.content ? <Text style={styles.noteContent}>{n.content}</Text> : null}

                {n.linkUrl ? (
                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => handleOpenLink(n.linkUrl)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="link-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.linkText} numberOfLines={1}>{n.linkUrl}</Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={styles.noteMeta}>Shared by {n.createdBy?.name || 'Teammate'}</Text>
              </View>
            ))
          ) : (
            <EmptyStateView
              title="No Notes or Shared Links"
              description="Share experiment logs, paper preprints, dataset links, and Colab notebooks with your team."
            />
          )}
        </ScrollView>
      ) : null}

      {/* 4. TEAM MEMBERS TAB (WITH MEMBER REMOVAL FOR OWNER) */}
      {activeTab === 'members' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Collaborators ({workspace.members?.length || 0})</Text>
            <TouchableOpacity style={styles.btnAction} onPress={handleOpenInviteModal} activeOpacity={0.8}>
              <View style={styles.btnContentRow}>
                <Ionicons name="person-add" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.btnActionText}>Invite</Text>
              </View>
            </TouchableOpacity>
          </View>

          {Array.isArray(workspace.members) &&
            workspace.members.map((m) => {
              const u = m.user;
              const imgUri =
                u?.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
              const isLead = u?._id?.toString() === workspace.owner?._id?.toString();
              const isSelf = u?._id?.toString() === currentUser?._id?.toString();

              return (
                <View key={m._id || u?._id} style={styles.memberCard}>
                  <Image source={{ uri: imgUri }} style={styles.memberAvatarBig} />
                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.memberName}>{u?.name || 'Teammate'}</Text>
                      {isLead ? (
                        <View style={styles.leadBadgePill}>
                          <Text style={styles.leadBadgeText}>Lead</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.memberRole}>{u?.role ? `${u.role} • ${u.organization || ''}` : 'Researcher'}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={styles.memberRolePill}>
                      <Text style={styles.memberRolePillText}>{m.role || 'Contributor'}</Text>
                    </View>
                    {/* Owner can remove non-lead, non-self members */}
                    {isOwner && !isLead && !isSelf && (
                      <TouchableOpacity
                        style={styles.btnRemoveMember}
                        onPress={() => handleRemoveMember(u)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="remove-circle-outline" size={12} color={COLORS.danger} style={{ marginRight: 3 }} />
                        <Text style={styles.btnRemoveMemberText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

          {/* Pending Invitations Section (Visible to Owner) */}
          {isOwner && Array.isArray(workspace.invitations) && workspace.invitations.filter(i => i.status === 'pending').length > 0 && (
            <View style={{ marginTop: 22 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>
                  Pending Invitations ({workspace.invitations.filter(i => i.status === 'pending').length})
                </Text>
              </View>
              {workspace.invitations
                .filter(i => i.status === 'pending')
                .map((inv) => {
                  const u = inv.user;
                  const imgUri =
                    u?.profileImage ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
                  return (
                    <View key={inv._id} style={styles.memberCard}>
                      <Image source={{ uri: imgUri }} style={styles.memberAvatarBig} />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{u?.name || 'Invited Teammate'}</Text>
                        <Text style={styles.memberRole}>{u?.role ? `${u.role} • ${u.organization || ''}` : 'Researcher'}</Text>
                        <View style={[styles.pendingPill, { marginTop: 4, alignSelf: 'flex-start' }]}>
                          <Ionicons name="time-outline" size={11} color="#D97706" style={{ marginRight: 3 }} />
                          <Text style={styles.pendingPillText}>Invitation Sent (Pending)</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.btnCancelInviteOutline}
                        onPress={() => handleCancelInvitation(inv._id, u?.name)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={13} color={COLORS.danger || '#EF4444'} style={{ marginRight: 3 }} />
                        <Text style={styles.btnCancelInviteOutlineText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* 5. DISCUSSION / GROUP CHAT TAB */}
      {activeTab === 'discussion' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={80}
        >
          <View style={styles.chatContainer}>
            {loadingMessages ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : messages.length === 0 ? (
              <EmptyStateView
                title="Workspace Group Chat"
                description="Coordinate with team members, discuss findings, and share quick updates here."
              />
            ) : (
              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatScrollContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg, idx) => {
                  const isMine =
                    msg.sender?._id?.toString() === currentUser?._id?.toString() ||
                    msg.sender === currentUser?._id?.toString();
                  const senderName = msg.sender?.name || 'Teammate';
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <View
                      key={msg._id || idx}
                      style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}
                    >
                      {!isMine && (
                        <Image
                          source={{
                            uri:
                              msg.sender?.profileImage ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                          }}
                          style={styles.chatAvatar}
                        />
                      )}
                      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                        {!isMine && <Text style={styles.chatSenderName}>{senderName}</Text>}
                        <Text style={[styles.chatContentText, isMine ? styles.chatContentMine : styles.chatContentOther]}>
                          {msg.content}
                        </Text>
                        <Text style={[styles.chatTimeText, isMine ? styles.chatTimeMine : styles.chatTimeOther]}>
                          {time}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Chat Input Bar */}
            <View style={styles.chatInputBar}>
              <TextInput
                style={styles.chatTextInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a team message..."
                placeholderTextColor={COLORS.textLight}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.btnSend, !messageText.trim() && styles.btnSendDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
                activeOpacity={0.8}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="send" size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* MODAL: ADD TASK */}
      <Modal visible={showTaskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Project Task</Text>

            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Implement Transformer Attention Layer"
              placeholderTextColor={COLORS.textLight}
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Details or deliverables..."
              placeholderTextColor={COLORS.textLight}
              value={taskDesc}
              onChangeText={setTaskDesc}
              multiline
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipsRow}>
              {['Low', 'Medium', 'High'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, taskPriority === p ? styles.chipActive : null]}
                  onPress={() => setTaskPriority(p)}
                >
                  <Text style={[styles.chipText, taskPriority === p ? styles.chipTextActive : null]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowTaskModal(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAddTask} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnConfirmText}>Save Task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD MILESTONE */}
      <Modal visible={showMilestoneModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Project Milestone</Text>

            <Text style={styles.label}>Milestone Goal *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. arXiv Preprint Submitted"
              placeholderTextColor={COLORS.textLight}
              value={milestoneTitle}
              onChangeText={setMilestoneTitle}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowMilestoneModal(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAddMilestone} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnConfirmText}>Add Milestone</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD NOTE */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Research Note or Link</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Benchmark Results & Baseline Dataset"
              placeholderTextColor={COLORS.textLight}
              value={noteTitle}
              onChangeText={setNoteTitle}
            />

            <Text style={styles.label}>Notes / Description</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Summarize key findings or instructions..."
              placeholderTextColor={COLORS.textLight}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
            />

            <Text style={styles.label}>External Link (GitHub, Google Drive, Colab, DOI)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://github.com/..."
              placeholderTextColor={COLORS.textLight}
              value={noteUrl}
              onChangeText={setNoteUrl}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowNoteModal(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAddNote} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnConfirmText}>Share Note</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: INVITE CONNECTION */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Invite Accepted Connection</Text>
            <Text style={styles.modalSubtitle}>
              Only accepted connections can be added to private research workspaces.
            </Text>

            {loadingConnections ? (
              <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 20 }} />
            ) : connections.length === 0 ? (
              <EmptyStateView
                title="No Connections Found"
                description="Connect with nearby professionals on Discover before inviting them to private workspaces."
              />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {connections.map((c) => {
                  const u = c.user;
                  const alreadyMember = workspace.members?.some(
                    (m) => m.user?._id === u?._id || m.user === u?._id
                  );
                  const hasPendingInvite = (workspace.invitations || []).some(
                    (i) => (i.user?._id === u?._id || i.user === u?._id) && i.status === 'pending'
                  );
                  return (
                    <View key={c.connectionId} style={styles.inviteItem}>
                      <Image
                        source={{
                          uri:
                            u?.profileImage ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                        }}
                        style={styles.inviteAvatar}
                      />
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inviteName}>{u?.name}</Text>
                        <Text style={styles.inviteRole} numberOfLines={1}>
                          {u?.role} • {u?.organization}
                        </Text>
                      </View>
                      {alreadyMember ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.alreadyMemberText}>Member</Text>
                        </View>
                      ) : hasPendingInvite ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Ionicons name="time-outline" size={13} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#D97706' }}>Invited (Pending)</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnInviteAction}
                          onPress={() => handleInviteUser(u._id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="mail-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnInviteActionText}>Send Invite</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={[styles.btnCancel, { marginTop: 12 }]} onPress={() => setShowInviteModal(false)}>
              <Text style={styles.btnCancelText}>Close</Text>
            </TouchableOpacity>
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
  header: {
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    marginRight: 8
  },
  statusPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  desc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 10
  },
  progressRow: {
    marginTop: 4
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.bgInput,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 6
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  btnAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.sm
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  taskTextCol: {
    flex: 1
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 2
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textLight
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2
  },
  priorityPill: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  assigneeText: {
    fontSize: 11,
    color: COLORS.textLight
  },
  milestoneStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  itemMeta: {
    fontSize: 11,
    fontWeight: '600'
  },
  noteCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.sm
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    marginRight: 8
  },
  noteContent: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  linkText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1
  },
  noteMeta: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10
  },
  memberAvatarBig: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
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
  leadBadgePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6
  },
  leadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309'
  },
  memberRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  memberRolePill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  memberRolePillText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600'
  },
  btnRemoveMember: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  btnRemoveMemberText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600'
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  chatScroll: {
    flex: 1
  },
  chatScrollContent: {
    padding: 14,
    paddingBottom: 20
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%'
  },
  messageRowMine: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end'
  },
  messageRowOther: {
    alignSelf: 'flex-start'
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end'
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2
  },
  bubbleOther: {
    backgroundColor: COLORS.bgCard,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  chatSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2
  },
  chatContentText: {
    fontSize: 13,
    lineHeight: 18
  },
  chatContentMine: {
    color: '#ffffff'
  },
  chatContentOther: {
    color: COLORS.textMain
  },
  chatTimeText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4
  },
  chatTimeMine: {
    color: 'rgba(255,255,255,0.7)'
  },
  chatTimeOther: {
    color: COLORS.textLight
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
    color: COLORS.textMain
  },
  btnSend: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  btnSendDisabled: {
    backgroundColor: COLORS.borderDark
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16
  },
  modalBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 18,
    ...SHADOWS.md
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4
  },
  modalInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top'
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  btnCancelText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  btnConfirm: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnConfirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  inviteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10
  },
  inviteName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  inviteRole: {
    fontSize: 11,
    color: COLORS.textLight
  },
  alreadyMemberText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600'
  },
  btnInviteAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  btnInviteActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  btnDeleteWorkspaceHeader: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnCancelInviteOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6
  },
  btnCancelInviteOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.danger || '#EF4444'
  }
});

export default WorkspaceDetailScreen;
