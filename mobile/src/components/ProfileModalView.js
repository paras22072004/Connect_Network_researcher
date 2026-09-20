import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import ConnectionButton from './ConnectionButton';
import { COLORS } from '../theme/theme';

const ProfileModalView = ({ visible, user, onClose, onOpenMessage }) => {
  if (!user) return null;

  const profileImage = user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header / Avatar */}
            <View style={styles.header}>
              <Image source={{ uri: profileImage }} style={styles.avatar} />
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.role}>{user.role}</Text>
              <Text style={styles.organization}>{user.organization}</Text>

              {user.matchScore && (
                <View style={styles.matchBadge}>
                  <Text style={styles.matchText}>🎯 {user.matchScore}% Match Score</Text>
                </View>
              )}
            </View>

            {/* Connection Actions */}
            <View style={styles.actionsContainer}>
              <ConnectionButton
                targetUser={user}
                initialStatus={user.connectionStatus || 'none'}
                initialConnectionId={user.connectionId}
                isSender={user.isSender}
                onOpenMessage={(u) => {
                  onClose();
                  if (onOpenMessage) onOpenMessage(u);
                }}
              />
            </View>

            {/* Bio */}
            {user.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About / Bio</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}

            {/* Research Interests */}
            {user.researchInterests && user.researchInterests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Research Interests</Text>
                <View style={styles.pillsContainer}>
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
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Technical Skills</Text>
                <View style={styles.pillsContainer}>
                  {user.skills.map((skill, idx) => (
                    <View key={idx} style={styles.pill}>
                      <Text style={styles.pillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Publications */}
            {user.publications && user.publications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Research Publications</Text>
                {user.publications.map((pub, idx) => (
                  <View key={idx} style={styles.cardItem}>
                    <Text style={styles.cardTitle}>{pub.title}</Text>
                    {pub.abstract && <Text style={styles.cardDesc}>{pub.abstract}</Text>}
                    {pub.publicationVenue && (
                      <Text style={styles.cardMeta}>Venue: {pub.publicationVenue}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Projects */}
            {user.projects && user.projects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Projects</Text>
                {user.projects.map((proj, idx) => (
                  <View key={idx} style={styles.cardItem}>
                    <Text style={styles.cardTitle}>{proj.title}</Text>
                    {proj.description && <Text style={styles.cardDesc}>{proj.description}</Text>}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    padding: 20,
    paddingTop: 30
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    zIndex: 10,
    padding: 6
  },
  closeBtnText: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: 'bold'
  },
  header: {
    alignItems: 'center',
    marginBottom: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  organization: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2
  },
  matchBadge: {
    backgroundColor: '#fffbeb',
    borderColor: COLORS.warning,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 10
  },
  matchText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#d97706'
  },
  actionsContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8
  },
  bioText: {
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 20
  },
  pillsContainer: {
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
  cardItem: {
    backgroundColor: COLORS.bgMain,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4
  },
  cardMeta: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600'
  }
});

export default ProfileModalView;
