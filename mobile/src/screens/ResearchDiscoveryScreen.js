import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPublicationsApi } from '../services/researchService';
import { sendConnectionRequest } from '../services/connectionService';
import ProfileModalView from '../components/ProfileModalView';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

const RESEARCH_DOMAINS = [
  'All',
  'Artificial Intelligence',
  'Computer Vision',
  'NLP',
  'Bioinformatics',
  'Robotics',
  'Distributed Systems'
];

const ResearchDiscoveryScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [connectingId, setConnectingId] = useState(null);

  const fetchPublications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await searchPublicationsApi(
        searchQuery.trim(),
        selectedDomain === 'All' ? '' : selectedDomain
      );
      if (res.success) {
        setPublications(res.publications || []);
      }
    } catch (err) {
      console.error('Error fetching publications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, [selectedDomain]);

  const onRefresh = useCallback(() => {
    fetchPublications(true);
  }, [selectedDomain, searchQuery]);

  const handleOpenLink = (url) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => Alert.alert('Cannot Open Link', 'Invalid URL link.'));
  };

  const handleConnect = async (authorId) => {
    setConnectingId(authorId);
    try {
      const res = await sendConnectionRequest(authorId);
      if (res.success) {
        Alert.alert('Request Sent', 'Connection request sent to researcher!');
      } else {
        Alert.alert('Notice', res.message || 'Could not send request.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setConnectingId(null);
    }
  };

  const renderPublicationCard = ({ item }) => {
    const pub = item.publication;
    const author = item.author;
    const matchScore = item.authorMatchScore || 0;
    const isConnecting = connectingId === author?._id;

    const authorImg =
      author?.profileImage ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

    return (
      <View style={styles.card}>
        {/* Venue Badge */}
        {pub.publicationVenue ? (
          <View style={styles.venueBadge}>
            <Ionicons name="business-outline" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.venueText}>{pub.publicationVenue}</Text>
          </View>
        ) : null}

        {/* Publication Title */}
        <Text style={styles.pubTitle}>{pub.title}</Text>

        {/* Abstract */}
        {pub.abstract ? (
          <Text style={styles.pubAbstract} numberOfLines={3}>
            {pub.abstract}
          </Text>
        ) : null}

        {/* DOI / External Link Buttons */}
        <View style={styles.linksRow}>
          {pub.doiLink ? (
            <TouchableOpacity
              style={styles.linkPill}
              onPress={() => handleOpenLink(pub.doiLink)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open DOI reference"
            >
              <Ionicons name="link-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.linkPillText}>DOI Reference</Text>
            </TouchableOpacity>
          ) : null}

          {pub.publicationLink ? (
            <TouchableOpacity
              style={styles.linkPill}
              onPress={() => handleOpenLink(pub.publicationLink)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open full paper PDF"
            >
              <Ionicons name="document-text-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.linkPillText}>Full Paper / PDF</Text>
            </TouchableOpacity>
          ) : null}

          {pub.githubLink ? (
            <TouchableOpacity
              style={styles.linkPill}
              onPress={() => handleOpenLink(pub.githubLink)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open code repository"
            >
              <Ionicons name="code-slash-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.linkPillText}>Code Repository</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Author Card & Match Score */}
        <View style={styles.authorSection}>
          <TouchableOpacity
            style={styles.authorRow}
            onPress={() => setSelectedAuthor(author)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: authorImg }} style={styles.authorAvatar} />
            <View style={styles.authorInfo}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{author?.name}</Text>
                {matchScore > 0 ? (
                  <View style={styles.matchScoreBadge}>
                    <Ionicons name="sparkles" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
                    <Text style={styles.matchScoreText}>{matchScore}% Match</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.authorRole}>
                {author?.role} • {author?.organization || 'Verified Author'}
              </Text>
            </View>
          </TouchableOpacity>

          {item.authorMatchExplanation ? (
            <View style={styles.matchExplanationRow}>
              <Ionicons name="bulb-outline" size={13} color={COLORS.primary} style={{ marginRight: 5, marginTop: 1 }} />
              <Text style={styles.matchExplanationText}>{item.authorMatchExplanation}</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.btnAuthorProfile}
              onPress={() => setSelectedAuthor(author)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View author profile"
            >
              <Text style={styles.btnAuthorProfileText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnConnect}
              onPress={() => handleConnect(author?._id)}
              disabled={isConnecting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Connect with author"
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
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textLight} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search papers, abstracts, DOIs, venues..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchPublications()}
          />
        </View>
      </View>

      {/* Domain Filters */}
      <View style={styles.domainBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={RESEARCH_DOMAINS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.domainChip, selectedDomain === item ? styles.domainChipActive : null]}
              onPress={() => setSelectedDomain(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.domainChipText, selectedDomain === item ? styles.domainChipTextActive : null]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <LoadingView message="Searching published research papers..." />
      ) : (
        <FlatList
          data={publications}
          keyExtractor={(item, index) => item.publication?._id || String(index)}
          renderItem={renderPublicationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <EmptyStateView
              title="No Research Papers Found"
              description="No publications match your query. Add publications in Edit Profile to make your research discoverable to regional collaborators."
            />
          }
        />
      )}

      {/* Profile Modal */}
      {selectedAuthor ? (
        <ProfileModalView
          user={selectedAuthor}
          visible={Boolean(selectedAuthor)}
          onClose={() => setSelectedAuthor(null)}
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
  searchHeader: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  searchBox: {
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
  domainBar: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  domainChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.bgInput,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  domainChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary
  },
  domainChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  domainChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  listContent: {
    padding: 14,
    paddingBottom: 40
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
  venueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  venueText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  pubTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 20,
    marginBottom: 6
  },
  pubAbstract: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 10
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  linkPill: {
    backgroundColor: '#F0F5F1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C8DDD0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  linkPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary
  },
  matchExplanationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6
  },
  matchExplanationText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  authorSection: {
    backgroundColor: '#FAFBF9',
    borderRadius: 10,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10
  },
  authorInfo: {
    flex: 1
  },
  authorNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  matchScoreBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  matchScoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary
  },
  authorRole: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2
  },
  matchExplanation: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
    marginTop: 6
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  btnAuthorProfile: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  btnAuthorProfileText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain
  },
  btnConnect: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnConnectText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  }
});

export default ResearchDiscoveryScreen;
