import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
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

  const [loading, setLoading] = useState(false);

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
        researchInterests
      };

      const res = await updateUserProfile(payload);
      if (res.success && res.user) {
        updateUser(res.user);
        Alert.alert('Success', 'Profile updated successfully!', [
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
        <Text style={styles.headerTitle}>Edit Profile Information</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Profile Image URL</Text>
          <TextInput
            style={styles.input}
            value={profileImage}
            onChangeText={setProfileImage}
            placeholder="https://example.com/avatar.jpg"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Role / Title</Text>
          <TextInput
            style={styles.input}
            value={role}
            onChangeText={setRole}
            placeholder="AI Researcher / Software Engineer"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Organization / University</Text>
          <TextInput
            style={styles.input}
            value={organization}
            onChangeText={setOrganization}
            placeholder="Stanford University / Google Research"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio / About</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell researchers and professionals about your background..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Research Interests (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={researchInterests}
            onChangeText={setResearchInterests}
            placeholder="Machine Learning, Computer Vision, Robotics"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Technical Skills (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={skills}
            onChangeText={setSkills}
            placeholder="Python, PyTorch, React Native, Node.js"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={styles.saveBtnText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 36
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
    color: COLORS.textMain,
    marginBottom: 16
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 6
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top'
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  disabledBtn: {
    opacity: 0.7
  },
  saveBtnText: {
    color: COLORS.textWhite,
    fontSize: 15,
    fontWeight: '700'
  }
});

export default EditProfileScreen;
