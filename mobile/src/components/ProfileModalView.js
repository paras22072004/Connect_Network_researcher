import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConnectionButton from './ConnectionButton';
import { COLORS } from '../theme/theme';

const ProfileModalView = ({ visible, user, onClose, onOpenMessage }) => {
  if (!user) return null;

  const profileImage = user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close profile details"
          >
            <Ionicons name="close" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header / Avatar */}
            <View style={styles.header}>
              <Image source={{ uri: profileImage }} style={styles.avatar} />
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.role}>{user.role}</Text>
              <Text style={styles.organization}>{user.organization}</Text>

              {Boolean(user.matchScore) ? (
                <View style={styles.matchBadge}>
                  <Ionicons name="sparkles" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.matchText}>{user.matchScore}% Match Score</Text>
                </View>
              ) : null}
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

            {/* AI Semantic Match Analysis (When supported by backend) */}
            {(Boolean(user.matchExplanation) || user.semanticScore !== undefined) ? (
              <View style={styles.aiCard}>
                <View style={styles.aiCardHeader}>
                  <View style={styles.aiCardTitleRow}>
                    <Ionicons name="bulb-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.aiCardTitle}>AI Semantic Match Analysis</Text>
                  </View>
                  {Boolean(user.matchScore) ? (
                    <View style={styles.matchScorePill}>
                      <Text style={styles.matchScorePillText}>{user.matchScore}% Match</Text>
                    </View>
                  ) : null}
                </View>
                {user.matchExplanation ? (
                  <Text style={styles.aiExplanationText}>{user.matchExplanation}</Text>
                ) : null}

                <View style={styles.metricGrid}>
                  {user.semanticScore !== undefined ? (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Semantic Match</Text>
                      <Text style={styles.metricVal}>{user.semanticScore}%</Text>
                    </View>
                  ) : null}
                  {user.skillScore !== undefined ? (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Skill Overlap</Text>
                      <Text style={styles.metricVal}>{user.skillScore}%</Text>
                    </View>
                  ) : null}
                  {user.researchScore !== undefined ? (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Research Overlap</Text>
                      <Text style={styles.metricVal}>{user.researchScore}%</Text>
                    </View>
                  ) : null}
                  {Boolean(user.approximateDistance) ? (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Proximity</Text>
                      <Text style={styles.metricVal}>{user.approximateDistance}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Bio */}
            {Boolean(user.bio) ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About / Bio</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            ) : null}

            {/* Research Interests */}
            {Array.isArray(user.researchInterests) && user.researchInterests.length > 0 ? (
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
            ) : null}

            {/* Technical Skills */}
            {Array.isArray(user.skills) && user.skills.length > 0 ? (
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
            ) : null}

            {/* Publications */}
            {Array.isArray(user.publications) && user.publications.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Research Publications</Text>
                {user.publications.map((pub, idx) => (
                  <View key={idx} style={styles.cardItem}>
                    <Text style={styles.cardTitle}>{pub.title}</Text>
                    {pub.abstract ? <Text style={styles.cardDesc}>{pub.abstract}</Text> : null}
                    {pub.publicationVenue ? (
                      <Text style={styles.cardMeta}>Venue: {pub.publicationVenue}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Projects */}
            {Array.isArray(user.projects) && user.projects.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Projects</Text>
                {user.projects.map((proj, idx) => (
                  <View key={idx} style={styles.cardItem}>
                    <Text style={styles.cardTitle}>{proj.title}</Text>
                    {proj.description ? <Text style={styles.cardDesc}>{proj.description}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
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
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.sageMuted,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  matchText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  aiCard: {
    backgroundColor: COLORS.sageLight,
    borderWidth: 1,
    borderColor: '#D4E2D8',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  aiCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  aiCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark
  },
  matchScorePill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  matchScorePillText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: '700'
  },
  aiExplanationText: {
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
    marginBottom: 10
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#D4E2D8',
    paddingTop: 8
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bgCard,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2
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
