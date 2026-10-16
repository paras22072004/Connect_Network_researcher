import React, { useState, useEffect } from 'react';
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
  Alert
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
  inviteMemberApi
} from '../services/workspaceService';
import { getAcceptedConnections } from '../services/connectionService';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const WorkspaceDetailScreen = ({ route, navigation }) => {
  const { workspaceId } = route.params || {};
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'milestones' | 'notes' | 'members'

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

  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

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
      Alert.alert('Required', 'Please enter a milestone title.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addMilestoneApi(workspaceId, {
        title: milestoneTitle.trim(),
        targetDate: new Date(Date.now() + 14 * 86400000)
      });
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, milestones: res.milestones }));
        setShowMilestoneModal(false);
        setMilestoneTitle('');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not add milestone.');
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
    if (!noteTitle.trim() && !noteContent.trim()) {
      Alert.alert('Required', 'Please enter a note title or content.');
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

  // Invite Connection
  const handleInviteUser = async (userId) => {
    try {
      const res = await inviteMemberApi(workspaceId, { userId, role: 'Researcher' });
      if (res.success) {
        setWorkspace((prev) => ({ ...prev, members: res.members }));
        Alert.alert('Success', 'Teammate joined workspace!');
        setShowInviteModal(false);
      }
    } catch (err) {
      Alert.alert('Invite Error', err.message || 'Could not invite user.');
    }
  };

  const handleOpenLink = (url) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => Alert.alert('Cannot Open URL', 'Please check link address.'));
  };

  if (loading) return <LoadingView message="Loading research workspace..." />;
  if (!workspace) return <EmptyStateView title="Workspace Not Found" description="Could not load project workspace." />;

  return (
    <View style={styles.container}>
      {/* Workspace Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{workspace.title}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{workspace.status}</Text>
          </View>
        </View>

        <Text style={styles.desc}>{workspace.description}</Text>

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

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'tasks' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="checkbox-outline"
              size={15}
              color={activeTab === 'tasks' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'tasks' ? styles.tabBtnTextActive : null]}>
              Tasks ({workspace.tasks?.length || 0})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'milestones' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('milestones')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="flag-outline"
              size={15}
              color={activeTab === 'milestones' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'milestones' ? styles.tabBtnTextActive : null]}>
              Milestones ({workspace.milestones?.length || 0})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'notes' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('notes')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="document-text-outline"
              size={15}
              color={activeTab === 'notes' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'notes' ? styles.tabBtnTextActive : null]}>
              Notes ({workspace.notes?.length || 0})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'members' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('members')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === 'members' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'members' ? styles.tabBtnTextActive : null]}>
              Team ({workspace.members?.length || 0})
            </Text>
          </View>
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

      {/* 4. TEAM MEMBERS TAB */}
      {activeTab === 'members' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Collaborators ({workspace.members?.length || 0})</Text>
            <TouchableOpacity style={styles.btnAction} onPress={handleOpenInviteModal} activeOpacity={0.8}>
              <View style={styles.btnContentRow}>
                <Ionicons name="person-add" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.btnActionText}>Invite Connection</Text>
              </View>
            </TouchableOpacity>
          </View>

          {Array.isArray(workspace.members) && workspace.members.map((m) => {
            const u = m.user;
            const imgUri =
              u?.profileImage ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
            return (
              <View key={m._id || u?._id} style={styles.memberCard}>
                <Image source={{ uri: imgUri }} style={styles.memberAvatarBig} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{u?.name || 'Teammate'}</Text>
                  <Text style={styles.memberRole}>{u?.role ? `${u.role} • ${u.organization || ''}` : 'Researcher'}</Text>
                </View>
                <View style={styles.memberRolePill}>
                  <Text style={styles.memberRolePillText}>{m.role || 'Contributor'}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
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
                          <Text style={styles.alreadyMemberText}>Added</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnInviteAction}
                          onPress={() => handleInviteUser(u._id)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel="Invite collaborator"
                        >
                          <Ionicons name="person-add" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnInviteActionText}>Invite</Text>
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
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  tabBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight
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
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.textLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  taskTextCol: {
    flex: 1
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textLight
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6
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
  deleteIcon: {
    fontSize: 14
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
    flex: 1
  },
  noteContent: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F3',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  linkIcon: {
    marginRight: 6
  },
  linkText: {
    fontSize: 12,
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
  }
});

export default WorkspaceDetailScreen;
