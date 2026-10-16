import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWorkspaceApi } from '../services/workspaceService';
import { COLORS, SHADOWS } from '../theme/theme';

const STATUS_OPTIONS = ['Planning', 'In Progress', 'Completed', 'On Hold'];

const CreateWorkspaceScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Planning');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please provide a workspace title and project description.');
      return;
    }

    setLoading(true);
    try {
      const res = await createWorkspaceApi({
        title: title.trim(),
        description: description.trim(),
        status
      });

      if (res.success) {
        Alert.alert('Success!', 'Research workspace created. You can now invite collaborators and assign tasks.');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.message || 'Could not create workspace.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.heading}>Create Research Workspace</Text>
        <Text style={styles.subheading}>
          Dedicated private environment for your collaborative project. Invite accepted connections, assign milestone deliverables, and share research notes.
        </Text>

        <Text style={styles.label}>Project Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Graph Neural Networks for Molecular Property Prediction"
          placeholderTextColor={COLORS.textLight}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Project Overview & Objectives *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Outline project objectives, methodology, paper submission targets, and team responsibilities..."
          placeholderTextColor={COLORS.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Initial Phase Status</Text>
        <View style={styles.chipsRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, status === s ? styles.chipActive : null]}
              onPress={() => setStatus(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, status === s ? styles.chipTextActive : null]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.btnCreate}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Initialize workspace"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <View style={styles.btnInnerRow}>
              <Ionicons name="sparkles-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnCreateText}>Initialize Workspace</Text>
            </View>
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
    padding: 14,
    paddingBottom: 40
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4
  },
  subheading: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 16
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 6
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top'
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
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
  btnCreate: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnCreateText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});

export default CreateWorkspaceScreen;
