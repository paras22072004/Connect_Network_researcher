import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventByIdApi, joinEventApi, leaveEventApi, getEventAttendeesApi } from '../services/eventService';
import { sendConnectionRequest } from '../services/connectionService';
import ProfileModalView from '../components/ProfileModalView';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const formatDateFull = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
};

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params || {};
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendees'); // 'overview' | 'attendees'

  // Matched Attendees
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await getEventByIdApi(eventId);
      if (res.success) {
        setEvent(res.event);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
      Alert.alert('Error', 'Could not load event details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendeesMatch = async () => {
    setLoadingAttendees(true);
    try {
      const res = await getEventAttendeesApi(eventId);
      if (res.success) {
        setAttendees(res.attendees || []);
      }
    } catch (err) {
      console.error('Error fetching event attendees:', err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchDetails();
      fetchAttendeesMatch();
    }
  }, [eventId]);

  const handleJoinToggle = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      if (event.isAttending) {
        const res = await leaveEventApi(event._id);
        if (res.success) {
          setEvent((prev) => ({
            ...prev,
            isAttending: false,
            attendeeCount: Math.max(0, prev.attendeeCount - 1)
          }));
          fetchAttendeesMatch();
        }
      } else {
        const res = await joinEventApi(event._id);
        if (res.success) {
          setEvent((prev) => ({
            ...prev,
            isAttending: true,
            attendeeCount: prev.attendeeCount + 1
          }));
          fetchAttendeesMatch();
        } else {
          Alert.alert('Notice', res.message || 'Could not join event.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    setConnectingId(userId);
    try {
      const res = await sendConnectionRequest(userId);
      if (res.success) {
        setAttendees((prev) =>
          prev.map((a) =>
            a._id === userId ? { ...a, connectionStatus: 'pending', isSender: true } : a
          )
        );
      } else {
        Alert.alert('Notice', res.message || 'Failed to send connection request.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not send request.');
    } finally {
      setConnectingId(null);
    }
  };

  if (loading) return <LoadingView message="Loading event details & networking..." />;
  if (!event) return <EmptyStateView title="Event Not Found" description="The requested event does not exist." />;

  return (
    <View style={styles.container}>
      {/* Top Details Card */}
      <View style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>
          <View style={styles.modeBadge}>
            <Ionicons
              name={event.locationType === 'Virtual' ? 'globe-outline' : event.locationType === 'Hybrid' ? 'flash-outline' : 'location-outline'}
              size={12}
              color={COLORS.textMuted}
              style={{ marginRight: 3 }}
            />
            <Text style={styles.modeBadgeText}>
              {event.locationType || 'In-Person'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.venue}>{event.venue} ({event.city || 'Venue'})</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.date}>{formatDateFull(event.startDate)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btnJoin, event.isAttending ? styles.btnJoined : null]}
            onPress={handleJoinToggle}
            disabled={actionLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={event.isAttending ? 'Attending event' : 'Register or join event'}
          >
            {actionLoading ? (
              <ActivityIndicator color={event.isAttending ? COLORS.primary : '#ffffff'} size="small" />
            ) : event.isAttending ? (
              <View style={styles.btnContentRow}>
                <Ionicons name="checkmark" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.btnJoinText, styles.btnJoinedText]}>Attending Event (Leave)</Text>
              </View>
            ) : (
              <View style={styles.btnContentRow}>
                <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.btnJoinText}>Register / Join Event</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'attendees' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('attendees')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === 'attendees' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'attendees' ? styles.tabBtnTextActive : null]}>
              Attendees & Match ({attendees.length})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('overview')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="document-text-outline"
              size={15}
              color={activeTab === 'overview' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'overview' ? styles.tabBtnTextActive : null]}>
              Event Overview
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'attendees' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBanner}>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={styles.infoBannerText}>
              Attendees are ranked by AI semantic similarity to your research interests and complementary technical skills.
            </Text>
          </View>

          {loadingAttendees ? (
            <LoadingView message="Matching event attendees..." />
          ) : attendees.length === 0 ? (
            <EmptyStateView
              title="No Other Attendees Yet"
              description="You are among the first participants! As other professionals join, AI will match and rank them here."
            />
          ) : (
            attendees.map((attendee) => {
              const profileImg =
                attendee.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
              const isConnecting = connectingId === attendee._id;
              const isConnected = attendee.connectionStatus === 'accepted';
              const isPending = attendee.connectionStatus === 'pending';

              return (
                <View key={attendee._id} style={styles.attendeeCard}>
                  <View style={styles.attendeeTop}>
                    <Image source={{ uri: profileImg }} style={styles.attendeeAvatar} />
                    <View style={styles.attendeeInfo}>
                      <View style={styles.nameScoreRow}>
                        <Text style={styles.attendeeName} numberOfLines={1}>{attendee.name}</Text>
                        <View style={styles.matchBadge}>
                          <Ionicons name="sparkles" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
                          <Text style={styles.matchBadgeText}>{attendee.matchScore}% Match</Text>
                        </View>
                      </View>
                      <Text style={styles.attendeeRole} numberOfLines={1}>
                        {attendee.role || 'Professional'} • {attendee.organization || 'Attendee'}
                      </Text>
                      <View style={styles.distRow}>
                        <Ionicons name="location" size={11} color={COLORS.forest} style={{ marginRight: 3 }} />
                        <Text style={styles.attendeeDist}>{attendee.approximateDistance}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Why You Match */}
                  {attendee.matchExplanation ? (
                    <View style={styles.matchExplanationBox}>
                      <Ionicons name="bulb-outline" size={13} color={COLORS.primary} style={{ marginRight: 5, marginTop: 1 }} />
                      <Text style={styles.matchExplanationText}>
                        {attendee.matchExplanation}
                      </Text>
                    </View>
                  ) : null}

                  {/* Skills */}
                  {Array.isArray(attendee.skills) && attendee.skills.length > 0 ? (
                    <View style={styles.skillsRow}>
                      {attendee.skills.slice(0, 3).map((s, idx) => (
                        <View key={idx} style={styles.skillPill}>
                          <Text style={styles.skillPillText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Actions */}
                  <View style={styles.attendeeActions}>
                    <TouchableOpacity
                      style={styles.btnOutline}
                      onPress={() => setSelectedUser(attendee)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnOutlineText}>Profile</Text>
                    </TouchableOpacity>

                    {isConnected ? (
                      <View style={styles.btnConnected}>
                        <Ionicons name="checkmark-circle" size={13} color={COLORS.accent} style={{ marginRight: 4 }} />
                        <Text style={styles.btnConnectedText}>Connected</Text>
                      </View>
                    ) : isPending ? (
                      <View style={styles.btnPending}>
                        <Ionicons name="time-outline" size={13} color={COLORS.warning} style={{ marginRight: 4 }} />
                        <Text style={styles.btnPendingText}>Pending</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.btnConnect}
                        onPress={() => handleConnect(attendee._id)}
                        disabled={isConnecting}
                        activeOpacity={0.8}
                      >
                        {isConnecting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <View style={styles.btnContentRow}>
                            <Ionicons name="person-add" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={styles.btnConnectText}>Connect</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* Event Overview Tab */
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.overviewCard}>
            <Text style={styles.sectionTitle}>About this Event</Text>
            <Text style={styles.overviewDesc}>{event.description}</Text>

            <Text style={styles.sectionTitle}>Key Topics</Text>
            <View style={styles.topicsRow}>
              {Array.isArray(event.topics) && event.topics.length > 0 ? (
                event.topics.map((top, idx) => (
                  <View key={idx} style={styles.topicPill}>
                    <Text style={styles.topicPillText}>{top}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.metaSub}>Open technical and academic networking</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Organized By</Text>
            <View style={styles.organizerCard}>
              <Image
                source={{
                  uri:
                    event.organizer?.profileImage ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                }}
                style={styles.organizerAvatar}
              />
              <View style={styles.organizerInfo}>
                <Text style={styles.organizerName}>{event.organizer?.name || 'Verified Member'}</Text>
                <Text style={styles.organizerRole}>
                  {event.organizer?.role ? `${event.organizer.role} • ${event.organizer.organization || ''}` : 'Event Host'}
                </Text>
                {event.organizer?.bio ? (
                  <Text style={styles.organizerBio} numberOfLines={2}>
                    {event.organizer.bio}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Profile Modal */}
      {selectedUser ? (
        <ProfileModalView
          user={selectedUser}
          visible={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          onConnectSuccess={(userId) => {
            setAttendees((prev) =>
              prev.map((a) =>
                a._id === userId ? { ...a, connectionStatus: 'pending', isSender: true } : a
              )
            );
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C5DDD0'
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  modeBadge: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  modeBadgeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6
  },
  metaRow: {
    marginBottom: 10
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  venue: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  date: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  actionRow: {
    marginTop: 4
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  btnJoin: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: '700'
  },
  btnJoinedText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '700'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight
  },
  tabBtnText: {
    fontSize: 12,
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
  infoBanner: {
    backgroundColor: '#F3F8F5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16
  },
  attendeeCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    ...SHADOWS.sm
  },
  attendeeTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginRight: 10
  },
  attendeeInfo: {
    flex: 1
  },
  nameScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    marginRight: 6
  },
  matchBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C3E0CE',
    flexDirection: 'row',
    alignItems: 'center'
  },
  matchBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  attendeeRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  attendeeDist: {
    fontSize: 11,
    color: COLORS.textLight
  },
  matchExplanationBox: {
    backgroundColor: '#FAFBF9',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  matchExplanationText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8
  },
  skillPill: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  skillPillText: {
    fontSize: 11,
    color: COLORS.textMain
  },
  attendeeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain
  },
  btnConnect: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnConnectText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  btnConnected: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnConnectedText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600'
  },
  btnPending: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPendingText: {
    color: '#F57F17',
    fontSize: 12,
    fontWeight: '600'
  },
  overviewCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 12,
    marginBottom: 6
  },
  overviewDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  topicPill: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  topicPillText: {
    fontSize: 12,
    color: COLORS.textMain,
    fontWeight: '600'
  },
  metaSub: {
    fontSize: 12,
    color: COLORS.textLight
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBF9',
    borderRadius: 10,
    padding: 10,
    marginTop: 6
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10
  },
  organizerInfo: {
    flex: 1
  },
  organizerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  organizerRole: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  organizerBio: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  }
});

export default EventDetailScreen;
