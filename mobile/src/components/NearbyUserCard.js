import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import ConnectionButton from './ConnectionButton';
import { COLORS, SHADOWS } from '../theme/theme';

const NearbyUserCard = ({ user, onViewProfile, onOpenMessage }) => {
  const matchScore = user?.matchScore || 50;
  const approxDistance = user?.approximateDistance || 'Nearby';
  const profileImage = user?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Image source={{ uri: profileImage }} style={styles.avatar} />
        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
          <Text style={styles.role} numberOfLines={1}>{user?.role || 'Researcher'}</Text>
          <Text style={styles.organization} numberOfLines={1}>{user?.organization}</Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{matchScore}% Match</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.distBadge}>
          <Text style={styles.distText}>📍 {approxDistance}</Text>
        </View>
      </View>

      {/* Tags preview */}
      {user?.skills && user.skills.length > 0 && (
        <View style={styles.tagsRow}>
          {user.skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.tagPill}>
              <Text style={styles.tagText}>{skill}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Card Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => onViewProfile && onViewProfile(user)}
        >
          <Text style={styles.btnOutlineText}>View Profile</Text>
        </TouchableOpacity>

        <ConnectionButton
          targetUser={user}
          initialStatus={user?.connectionStatus || 'none'}
          initialConnectionId={user?.connectionId}
          isSender={user?.isSender}
          onOpenMessage={onOpenMessage}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginVertical: 6,
    ...SHADOWS.sm
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain
  },
  role: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 1
  },
  organization: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1
  },
  matchBadge: {
    backgroundColor: '#fffbeb',
    borderColor: COLORS.warning,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  matchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706'
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  distBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  distText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 4
  },
  tagPill: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  tagText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '500'
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  btnOutline: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.bgMain
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain
  }
});

export default NearbyUserCard;
