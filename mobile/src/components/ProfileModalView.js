import React, { useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Modal, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConnectionButton from './ConnectionButton';
import { COLORS } from '../theme/theme';
import { getAvatarUri } from '../constants/avatars';

const ProfileModalView = ({ visible, user, onClose, onOpenMessage }) => {
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

  if (!user) return null;

  const profileImage = getAvatarUri(user.profileImage, user.avatarId);

  const toggleTopicExpand = (id) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProjectExpand = (id) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenLink = async (url) => {
    if (!url) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Invalid Link', 'Unable to open the specified URL.');
      }
    } catch (err) {
      Alert.alert('Link Error', 'Could not open project URL.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: '#EBF4EE', text: '#24563B', border: '#C6DEC9' };
      case 'Active':
        return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'Planning':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'Archived':
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
      case 'In Progress':
      default:
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    }
  };

  const hasResearchTopics = Array.isArray(user.researchTopics) && user.researchTopics.length > 0;
  const hasResearchInterests = Array.isArray(user.researchInterests) && user.researchInterests.length > 0;
  const hasProjects = Array.isArray(user.projects) && user.projects.length > 0;

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
              <Text style={styles.role}>{user.role || 'Researcher'}</Text>
              <Text style={styles.organization}>{user.organization || 'Independent Researcher'}</Text>

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

            {/* AI Semantic Match Analysis */}
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

            {/* Structured Research Topics */}
            {hasResearchTopics ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Research Focus Areas ({user.researchTopics.length})</Text>
                {user.researchTopics.map((topic, idx) => {
                  const topicKey = topic._id || `modal-topic-${idx}`;
                  const isExpanded = Boolean(expandedTopics[topicKey]);
                  const isLong = topic.description && topic.description.length > 80;

                  return (
                    <View key={topicKey} style={styles.cardItem}>
                      <Text style={styles.cardTitle}>{topic.title}</Text>
                      {Boolean(topic.domain) && (
                        <View style={styles.modalDomainBadge}>
                          <Ionicons name="school-outline" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
                          <Text style={styles.modalDomainBadgeText}>{topic.domain}</Text>
                        </View>
                      )}
                      {Boolean(topic.description) && (
                        <View style={{ marginTop: 4 }}>
                          <Text
                            style={styles.cardDesc}
                            numberOfLines={isExpanded ? undefined : 2}
                          >
                            {topic.description}
                          </Text>
                          {isLong && (
                            <TouchableOpacity
                              onPress={() => toggleTopicExpand(topicKey)}
                              style={{ marginTop: 2 }}
                            >
                              <Text style={styles.expandText}>{isExpanded ? 'Show Less' : 'Show More'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      {Array.isArray(topic.skills) && topic.skills.length > 0 && (
                        <View style={styles.pillsContainer}>
                          {topic.skills.map((skill, sIdx) => (
                            <View key={`ts-${sIdx}`} style={styles.topicSkillChip}>
                              <Text style={styles.topicSkillText}>{skill}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : hasResearchInterests ? (
              /* Fallback for legacy research interests */
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

            {/* Featured Projects */}
            {hasProjects ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Projects ({user.projects.length})</Text>
                {user.projects.map((proj, idx) => {
                  const projKey = proj._id || `modal-proj-${idx}`;
                  const isExpanded = Boolean(expandedProjects[projKey]);
                  const isLong = proj.description && proj.description.length > 80;
                  const statusTheme = getStatusColor(proj.status);

                  return (
                    <View key={projKey} style={styles.cardItem}>
                      <View style={styles.projectHeaderRow}>
                        <Text style={[styles.cardTitle, { flex: 1, marginRight: 8 }]}>
                          {proj.title}
                        </Text>
                        <View
                          style={[
                            styles.modalStatusBadge,
                            { backgroundColor: statusTheme.bg, borderColor: statusTheme.border }
                          ]}
                        >
                          <Text style={[styles.modalStatusText, { color: statusTheme.text }]}>
                            {proj.status || 'In Progress'}
                          </Text>
                        </View>
                      </View>

                      {Boolean(proj.domain) && (
                        <View style={styles.modalDomainBadge}>
                          <Ionicons name="folder-outline" size={11} color={COLORS.sage} style={{ marginRight: 3 }} />
                          <Text style={styles.modalDomainBadgeText}>{proj.domain}</Text>
                        </View>
                      )}

                      {Boolean(proj.description) && (
                        <View style={{ marginTop: 4 }}>
                          <Text
                            style={styles.cardDesc}
                            numberOfLines={isExpanded ? undefined : 2}
                          >
                            {proj.description}
                          </Text>
                          {isLong && (
                            <TouchableOpacity
                              onPress={() => toggleProjectExpand(projKey)}
                              style={{ marginTop: 2 }}
                            >
                              <Text style={styles.expandText}>{isExpanded ? 'Show Less' : 'Show More'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {Array.isArray(proj.techStack) && proj.techStack.length > 0 && (
                        <View style={styles.pillsContainer}>
                          {proj.techStack.map((tech, tIdx) => (
                            <View key={`pt-${tIdx}`} style={styles.techChip}>
                              <Text style={styles.techChipText}>{tech}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {Boolean(proj.link) && (
                        <TouchableOpacity
                          style={styles.linkRow}
                          onPress={() => handleOpenLink(proj.link)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="link-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.linkText} numberOfLines={1}>{proj.link}</Text>
                          <Ionicons name="open-outline" size={11} color={COLORS.primary} style={{ marginLeft: 3 }} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    paddingBottom: 36
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 6
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
    gap: 6,
    marginTop: 6
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
    marginTop: 4,
    lineHeight: 16
  },
  cardMeta: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600'
  },
  projectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  modalStatusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  modalDomainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  modalDomainBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary
  },
  expandText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  topicSkillChip: {
    backgroundColor: COLORS.sageLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  topicSkillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.sage
  },
  techChip: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  techChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMain
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  linkText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary
  }
});

export default ProfileModalView;
