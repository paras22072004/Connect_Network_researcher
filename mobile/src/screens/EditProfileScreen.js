import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/userService';
import { COLORS, SHADOWS } from '../theme/theme';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [role, setRole] = useState(user?.role || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState(
    Array.isArray(user?.skills) ? user.skills.join(', ') : ''
  );
  const [researchInterests, setResearchInterests] = useState(
    Array.isArray(user?.researchInterests) ? user.researchInterests.join(', ') : ''
  );
  const [researchDomains, setResearchDomains] = useState(
    Array.isArray(user?.researchDomains) ? user.researchDomains.join(', ') : ''
  );

  // Publications & Projects
  const [publications, setPublications] = useState(user?.publications || []);
  const [projects, setProjects] = useState(user?.projects || []);

  // Modals to add a publication/project
  const [showPubModal, setShowPubModal] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubVenue, setPubVenue] = useState('');
  const [pubDoi, setPubDoi] = useState('');
  const [pubAbstract, setPubAbstract] = useState('');

  const [showProjModal, setShowProjModal] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projLink, setProjLink] = useState('');

  const [loading, setLoading] = useState(false);

  const handleAddPublication = () => {
    if (!pubTitle.trim()) {
      Alert.alert('Required', 'Please enter publication title.');
      return;
    }
    setPublications((prev) => [
      ...prev,
      {
        title: pubTitle.trim(),
        publicationVenue: pubVenue.trim(),
        doiLink: pubDoi.trim(),
        abstract: pubAbstract.trim()
      }
    ]);
    setShowPubModal(false);
    setPubTitle('');
    setPubVenue('');
    setPubDoi('');
    setPubAbstract('');
  };

  const handleRemovePublication = (index) => {
    setPublications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProject = () => {
    if (!projTitle.trim()) {
      Alert.alert('Required', 'Please enter project title.');
      return;
    }
    setProjects((prev) => [
      ...prev,
      {
        title: projTitle.trim(),
        description: projDesc.trim(),
        techStack: projTech.split(',').map((s) => s.trim()).filter(Boolean),
        link: projLink.trim()
      }
    ]);
    setShowProjModal(false);
    setProjTitle('');
    setProjDesc('');
    setProjTech('');
    setProjLink('');
  };

  const handleRemoveProject = (index) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        profileImage,
        role,
        organization,
        bio,
        skills,
        researchInterests,
        researchDomains,
        publications,
        projects
      };

      const res = await updateUserProfile(payload);
      if (res.success && res.user) {
        updateUser(res.user);
        Alert.alert('Success', 'Profile updated and AI semantic embeddings refreshed!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.headerTitle}>Edit Professional Profile</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Dr. Jane Doe"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Profile Image URL</Text>
          <TextInput
            style={styles.input}
            value={profileImage}
            onChangeText={setProfileImage}
            placeholder="https://example.com/avatar.jpg"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Role / Title</Text>
          <TextInput
            style={styles.input}
            value={role}
            onChangeText={setRole}
            placeholder="AI Researcher / Machine Learning Engineer"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Organization / University</Text>
          <TextInput
            style={styles.input}
            value={organization}
            onChangeText={setOrganization}
            placeholder="Stanford University / DeepMind"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>About / Research Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Describe your research focus, methodology, and collaboration goals..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Technical Skills (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={skills}
            onChangeText={setSkills}
            placeholder="Python, PyTorch, Transformers, MLOps, CUDA"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Research Interests (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={researchInterests}
            onChangeText={setResearchInterests}
            placeholder="Machine Learning, Computer Vision, Foundation Models"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Research Domains (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={researchDomains}
            onChangeText={setResearchDomains}
            placeholder="Healthcare AI, Distributed Systems, Computational Genomics"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Publications Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Research Publications ({publications.length})</Text>
          <TouchableOpacity style={styles.btnAddSmall} onPress={() => setShowPubModal(true)}>
            <Text style={styles.btnAddSmallText}>+ Add Paper</Text>
          </TouchableOpacity>
        </View>

        {publications.map((pub, idx) => (
          <View key={idx} style={styles.itemBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{pub.title}</Text>
              {pub.publicationVenue ? (
                <Text style={styles.itemSub}>Venue: {pub.publicationVenue}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => handleRemovePublication(idx)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Remove publication"
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={{ padding: 4 }} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Projects Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Projects ({projects.length})</Text>
          <TouchableOpacity style={styles.btnAddSmall} onPress={() => setShowProjModal(true)} activeOpacity={0.7}>
            <Text style={styles.btnAddSmallText}>+ Add Project</Text>
          </TouchableOpacity>
        </View>

        {projects.map((proj, idx) => (
          <View key={idx} style={styles.itemBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{proj.title}</Text>
              {proj.description ? (
                <Text style={styles.itemSub} numberOfLines={2}>{proj.description}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveProject(idx)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Remove project"
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={{ padding: 4 }} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={styles.saveBtnText}>Save Profile & Update AI Vector</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal: Add Publication */}
      <Modal visible={showPubModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Research Publication</Text>

            <Text style={styles.label}>Paper Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Attention Is All You Need"
              placeholderTextColor={COLORS.textLight}
              value={pubTitle}
              onChangeText={setPubTitle}
            />

            <Text style={styles.label}>Venue / Journal / Conference</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NeurIPS 2025, IEEE TPAMI, Nature"
              placeholderTextColor={COLORS.textLight}
              value={pubVenue}
              onChangeText={setPubVenue}
            />

            <Text style={styles.label}>DOI or Paper Link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://doi.org/... or https://arxiv.org/..."
              placeholderTextColor={COLORS.textLight}
              value={pubDoi}
              onChangeText={setPubDoi}
            />

            <Text style={styles.label}>Abstract / Summary</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Summarize the core hypothesis and findings..."
              placeholderTextColor={COLORS.textLight}
              value={pubAbstract}
              onChangeText={setPubAbstract}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowPubModal(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAddPublication}>
                <Text style={styles.btnConfirmText}>Add Paper</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Project */}
      <Modal visible={showProjModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Featured Project</Text>

            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Autonomous Robotic Navigation"
              placeholderTextColor={COLORS.textLight}
              value={projTitle}
              onChangeText={setProjTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe technologies, system architecture, and impact..."
              placeholderTextColor={COLORS.textLight}
              value={projDesc}
              onChangeText={setProjDesc}
              multiline
            />

            <Text style={styles.label}>Tech Stack (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="ROS2, C++, PyTorch, LiDAR"
              placeholderTextColor={COLORS.textLight}
              value={projTech}
              onChangeText={setProjTech}
            />

            <Text style={styles.label}>Project Link (GitHub / Demo)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://github.com/..."
              placeholderTextColor={COLORS.textLight}
              value={projLink}
              onChangeText={setProjLink}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowProjModal(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAddProject}>
                <Text style={styles.btnConfirmText}>Add Project</Text>
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
    backgroundColor: COLORS.bgMain
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16
  },
  formGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 5
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textMain
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  btnAddSmall: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  btnAddSmallText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBF9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  itemSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  deleteIcon: {
    fontSize: 14,
    color: COLORS.danger,
    padding: 4
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18
  },
  disabledBtn: {
    opacity: 0.7
  },
  saveBtnText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700'
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
    marginBottom: 12
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 9,
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
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnConfirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});

export default EditProfileScreen;
