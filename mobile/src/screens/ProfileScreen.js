import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/authService';
import LoadingView from '../components/LoadingView';
import { COLORS, SHADOWS } from '../theme/theme';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

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

  if (!user) return <LoadingView message="Loading user profile..." />;

  const profileImage =
    user.profileImage ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchLatestProfile} colors={[COLORS.primary]} />
      }
    >
      {/* Header Profile Card */}
      <View style={styles.headerCard}>
        <Image source={{ uri: profileImage }} style={styles.avatar} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role}</Text>
        <Text style={styles.org}>{user.organization}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.btnPrimaryText}>✏️ Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.btnOutlineText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bio Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About / Bio</Text>
        <Text style={styles.bioText}>
          {user.bio || 'Passionate about research, innovation, and professional networking.'}
        </Text>
      </View>

      {/* Research Interests */}
      {user.researchInterests && user.researchInterests.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Research Interests</Text>
          <View style={styles.pillsRow}>
            {user.researchInterests.map((interest, idx) => (
              <View key={idx} style={[styles.pill, styles.interestPill]}>
                <Text style={styles.interestPillText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Technical Skills */}
      {user.skills && user.skills.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Technical Skills</Text>
          <View style={styles.pillsRow}>
            {user.skills.map((skill, idx) => (
              <View key={idx} style={styles.pill}>
                <Text style={styles.pillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Research Papers Showcase */}
      {user.publications && user.publications.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Research Publications ({user.publications.length})</Text>
          {user.publications.map((pub, idx) => (
            <View key={idx} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{pub.title}</Text>
              {pub.abstract && <Text style={styles.itemDesc}>{pub.abstract}</Text>}
              {pub.publicationVenue && (
                <Text style={styles.itemMeta}>Venue: {pub.publicationVenue}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Projects Showcase */}
      {user.projects && user.projects.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Projects ({user.projects.length})</Text>
          {user.projects.map((proj, idx) => (
            <View key={idx} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{proj.title}</Text>
              {proj.description && <Text style={styles.itemDesc}>{proj.description}</Text>}
            </View>
          ))}
        </View>
      )}
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
    paddingBottom: 30
  },
  headerCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 10
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2
  },
  org: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  btnPrimaryText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '700'
  },
  btnOutline: {
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  btnOutlineText: {
    color: COLORS.textMain,
    fontSize: 13,
    fontWeight: '600'
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 10
  },
  bioText: {
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 20
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  pill: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14
  },
  pillText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500'
  },
  interestPill: {
    backgroundColor: COLORS.primaryLight
  },
  interestPillText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600'
  },
  itemCard: {
    backgroundColor: COLORS.bgMain,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600'
  }
});

export default ProfileScreen;
