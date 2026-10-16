import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventsApi, joinEventApi, leaveEventApi } from '../services/eventService';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const CATEGORIES = ['All', 'Conference', 'Hackathon', 'Seminar', 'Workshop'];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
};

const getCategoryColor = (cat = '') => {
  switch (cat.toLowerCase()) {
    case 'conference':
      return { bg: '#EBF4EE', text: '#24563B', border: '#C5DDD0' };
    case 'hackathon':
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    case 'seminar':
      return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
    case 'workshop':
      return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }
};

const EventsScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEvents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getEventsApi({
        category: selectedCategory,
        search: searchQuery.trim()
      });
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    fetchEvents(true);
  }, [selectedCategory, searchQuery]);

  const handleJoinToggle = async (event) => {
    setActionLoadingId(event._id);
    try {
      if (event.isAttending) {
        const res = await leaveEventApi(event._id);
        if (res.success) {
          setEvents((prev) =>
            prev.map((e) =>
              e._id === event._id
                ? { ...e, isAttending: false, attendeeCount: Math.max(0, e.attendeeCount - 1) }
                : e
            )
          );
        }
      } else {
        const res = await joinEventApi(event._id);
        if (res.success) {
          setEvents((prev) =>
            prev.map((e) =>
              e._id === event._id
                ? { ...e, isAttending: true, attendeeCount: e.attendeeCount + 1 }
                : e
            )
          );
        } else {
          Alert.alert('Notice', res.message || 'Could not join event.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderEventCard = ({ item }) => {
    const isBusy = actionLoadingId === item._id;
    const catStyle = getCategoryColor(item.category);

    return (
      <View style={styles.card}>
        {/* Top Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
            <Text style={[styles.categoryBadgeText, { color: catStyle.text }]}>{item.category}</Text>
          </View>

          <View style={styles.modeBadge}>
            <Ionicons
              name={item.locationType === 'Virtual' ? 'globe-outline' : item.locationType === 'Hybrid' ? 'flash-outline' : 'location-outline'}
              size={12}
              color={COLORS.textMuted}
              style={{ marginRight: 3 }}
            />
            <Text style={styles.modeBadgeText}>
              {item.locationType || 'In-Person'}
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDesc} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Venue & Date */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{formatDate(item.startDate)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{item.venue}</Text>
          </View>
        </View>

        {/* Attendees Count & Organizer */}
        <View style={styles.attendeesRow}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.attendeesCountText}>
              {item.attendeeCount} {item.attendeeCount === 1 ? 'Attendee' : 'Attendees'}
            </Text>
          </View>
          <Text style={styles.organizerText} numberOfLines={1}>
            By: {item.organizer?.name || 'Verified Host'}
          </Text>
        </View>

        {/* Tags */}
        {Array.isArray(item.tags) && item.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagPillText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnDetails}
            onPress={() => navigation.navigate('EventDetail', { eventId: item._id })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View event details and match attendees"
          >
            <View style={styles.btnContentRow}>
              <Text style={styles.btnDetailsText}>View & Match</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnJoin, item.isAttending ? styles.btnJoined : null]}
            onPress={() => handleJoinToggle(item)}
            disabled={isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={item.isAttending ? 'Attending event' : 'Join event'}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={item.isAttending ? COLORS.primary : '#ffffff'} />
            ) : item.isAttending ? (
              <View style={styles.btnContentRow}>
                <Ionicons name="checkmark" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.btnJoinText, styles.btnJoinedText]}>Attending</Text>
              </View>
            ) : (
              <View style={styles.btnContentRow}>
                <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.btnJoinText}>Join Event</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Search & Publish Row */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textLight} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, topics, venues..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchEvents()}
          />
        </View>

        <TouchableOpacity
          style={styles.btnPublish}
          onPress={() => navigation.navigate('CreateEvent')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Host a new event"
        >
          <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 2 }} />
          <Text style={styles.btnPublishText}>Host</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === item ? styles.categoryChipActive : null]}
              onPress={() => setSelectedCategory(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, selectedCategory === item ? styles.categoryChipTextActive : null]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Events List */}
      {loading && !refreshing ? (
        <LoadingView message="Loading upcoming events..." />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <EmptyStateView
              title="No Events Found"
              description="No conferences, hackathons, or workshops found matching your query. Tap Host to publish one!"
            />
          }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    paddingVertical: 8
  },
  btnPublish: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPublishText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  categoryBar: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  categoryChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  listContent: {
    padding: 14,
    paddingBottom: 36
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    ...SHADOWS.sm
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  modeBadge: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center'
  },
  modeBadgeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6
  },
  eventDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 10
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  attendeesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 4
  },
  attendeesCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  organizerText: {
    fontSize: 12,
    color: COLORS.textLight,
    maxWidth: '50%'
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  tagPill: {
    backgroundColor: '#F5F7F5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  tagPillText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8
  },
  btnDetails: {
    flex: 1.2,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  btnDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  btnJoin: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnJoined: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  btnJoinText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  btnJoinedText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700'
  }
});

export default EventsScreen;
