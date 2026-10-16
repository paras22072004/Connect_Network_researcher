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
import { createEventApi } from '../services/eventService';
import { COLORS, SHADOWS } from '../theme/theme';

const CATEGORIES = ['Conference', 'Hackathon', 'Seminar', 'Workshop', 'Symposium', 'Meetup'];
const LOCATION_TYPES = ['In-Person', 'Virtual', 'Hybrid'];

const CreateEventScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Conference');
  const [locationType, setLocationType] = useState('In-Person');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [daysFromNow, setDaysFromNow] = useState('7');
  const [topics, setTopics] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !description.trim() || !venue.trim()) {
      Alert.alert('Required Fields', 'Please fill in the event title, description, and venue.');
      return;
    }

    setLoading(true);
    try {
      const days = parseInt(daysFromNow, 10) || 7;
      const startDate = new Date(Date.now() + days * 86400000);
      const endDate = new Date(startDate.getTime() + 4 * 3600000); // 4 hours duration

      const parseTopics = topics.split(',').map((s) => s.trim()).filter(Boolean);
      const parseTags = tags.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await createEventApi({
        title: title.trim(),
        description: description.trim(),
        category,
        locationType,
        venue: venue.trim(),
        city: city.trim() || 'Campus',
        startDate,
        endDate,
        topics: parseTopics,
        tags: parseTags,
        capacity: 250
      });

      if (res.success) {
        Alert.alert('Event Published!', 'Your professional event is now live and open for attendee discovery.');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.message || 'Could not create event.');
      }
    } catch (err) {
      console.error('Create event error:', err);
      Alert.alert('Error', err.message || 'Failed to publish event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.title}>Host a Professional Event</Text>
        <Text style={styles.subtitle}>
          Publish conferences, academic seminars, hackathons, or workshops for regional and global networking.
        </Text>

        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Stanford AI & Genomics Symposium 2026"
          placeholderTextColor={COLORS.textLight}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c ? styles.chipActive : null]}
              onPress={() => setCategory(c)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, category === c ? styles.chipTextActive : null]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mode</Text>
        <View style={styles.chipsRow}>
          {LOCATION_TYPES.map((lt) => (
            <TouchableOpacity
              key={lt}
              style={[styles.chip, locationType === lt ? styles.chipActive : null]}
              onPress={() => setLocationType(lt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, locationType === lt ? styles.chipTextActive : null]}>{lt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Venue / Link *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Hall B, Center for Nanoscale Systems or Zoom Webinar"
          placeholderTextColor={COLORS.textLight}
          value={venue}
          onChangeText={setVenue}
        />

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>City / Campus</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Palo Alto, CA"
              placeholderTextColor={COLORS.textLight}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Starts In (Days)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7"
              placeholderTextColor={COLORS.textLight}
              value={daysFromNow}
              onChangeText={setDaysFromNow}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Description / Agenda *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe keynote speakers, tracks, hackathon challenges, and workshop schedules..."
          placeholderTextColor={COLORS.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Key Research Topics (comma-separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Deep Learning, Genomics, CRISPR, Bio-NLP"
          placeholderTextColor={COLORS.textLight}
          value={topics}
          onChangeText={setTopics}
        />

        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Keynote, Student-Friendly, Mentorship"
          placeholderTextColor={COLORS.textLight}
          value={tags}
          onChangeText={setTags}
        />

        <TouchableOpacity
          style={styles.btnSubmit}
          onPress={handlePublish}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Publish event"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <View style={styles.btnInnerRow}>
              <Ionicons name="rocket-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnSubmitText}>Publish Event</Text>
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4
  },
  subtitle: {
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
    height: 80,
    textAlignVertical: 'top'
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
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
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10
  },
  col: {
    flex: 1
  },
  btnSubmit: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});

export default CreateEventScreen;
