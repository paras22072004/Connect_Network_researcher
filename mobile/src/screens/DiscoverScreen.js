import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { getNearbyUsers } from '../services/locationService';
import NearbyUserCard from '../components/NearbyUserCard';
import ProfileModalView from '../components/ProfileModalView';
import ConnectionButton from '../components/ConnectionButton';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS, SHADOWS } from '../theme/theme';

// Safely import react-native-maps ONLY on native platforms (iOS / Android)
let MapView = null, Marker = null, Circle = null, PROVIDER_DEFAULT = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  } catch (err) {
    console.warn('[Native Map Module Load Guard]:', err.message);
  }
}

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 260;

// Minimalist, modern map style with subtle sage-green roads
const WARM_SAGE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#F7F5F0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3A443E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7F5F0' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#D5DDD7' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E5EFE7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#E8EFEA' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#D9E3DC' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#DCE8DE' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#F0EFE9' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DFEAE2' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#688272' }] }
];

const getRadiusDeltas = (r) => {
  if (r <= 100) return { latitudeDelta: 0.003, longitudeDelta: 0.003 };
  if (r <= 500) return { latitudeDelta: 0.012, longitudeDelta: 0.012 };
  return { latitudeDelta: 0.024, longitudeDelta: 0.024 };
};

const DiscoverScreen = ({ navigation }) => {
  const { coordinates, locationStatus, requestAndSaveLocation } = useLocation();
  const { user: currentUser } = useAuth();
  const [radius, setRadius] = useState(1000); // 100m | 500m | 1000m (1 km)
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationRequired, setLocationRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [fullModalProfile, setFullModalProfile] = useState(null);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef(null);

  const userLat = coordinates?.latitude || 0;
  const userLng = coordinates?.longitude || 0;
  const hasValidCoords = userLat !== 0 && userLng !== 0;

  // Fetch nearby users from backend with selected radius
  const fetchNearby = async (selectedRadius = radius) => {
    setLoading(true);
    setError('');
    setLocationRequired(false);
    try {
      const data = await getNearbyUsers(selectedRadius);
      if (data && data.success) {
        setNearbyUsers(data.users || []);
        setLocationRequired(false);
      } else if (data && data.locationRequired) {
        setLocationRequired(true);
        setNearbyUsers([]);
      } else {
        setError(data?.message || 'Failed to fetch nearby users.');
      }
    } catch (err) {
      console.error('Error fetching nearby professionals:', err);
      setError(err.response?.data?.message || 'Could not fetch nearby users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initLocationAndNearby = async () => {
      await requestAndSaveLocation();
      await fetchNearby(radius);
    };
    initLocationAndNearby();
  }, []);

  const handleEnableGps = async () => {
    const res = await requestAndSaveLocation();
    if (res && res.success) {
      setLocationRequired(false);
      await fetchNearby(radius);
    } else {
      setError(res?.message || 'GPS location error');
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    setSelectedProfile(null);
    fetchNearby(newRadius);
    if (mapRef.current && hasValidCoords) {
      const deltas = getRadiusDeltas(newRadius);
      mapRef.current.animateToRegion({
        latitude: userLat,
        longitude: userLng,
        ...deltas
      }, 500);
    }
  };

  const handleMarkerPress = (user) => {
    setSelectedProfile(user);
    if (mapRef.current && user.mapPosition?.latitude) {
      mapRef.current.animateToRegion({
        latitude: user.mapPosition.latitude,
        longitude: user.mapPosition.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008
      }, 500);
    }
  };

  // Filter nearby professionals by Search Query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return nearbyUsers;
    const query = searchQuery.toLowerCase().trim();
    return nearbyUsers.filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(query);
      const roleMatch = u.role?.toLowerCase().includes(query);
      const orgMatch = u.organization?.toLowerCase().includes(query);
      const skillMatch =
        Array.isArray(u.skills) &&
        u.skills.some((s) => String(s).toLowerCase().includes(query));
      const interestMatch =
        Array.isArray(u.researchInterests) &&
        u.researchInterests.some((i) => String(i).toLowerCase().includes(query));
      return nameMatch || roleMatch || orgMatch || skillMatch || interestMatch;
    });
  }, [nearbyUsers, searchQuery]);

  const mapRegion = useMemo(() => {
    const deltas = getRadiusDeltas(radius);
    return {
      latitude: hasValidCoords ? userLat : 37.78825,
      longitude: hasValidCoords ? userLng : -122.4324,
      ...deltas
    };
  }, [userLat, userLng, radius, hasValidCoords]);

  return (
    <View style={styles.container}>
      {/* Search Header Bar */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={COLORS.textMuted || '#8E8E93'} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, role, skill, or interest..."
            placeholderTextColor={COLORS.textMuted || '#8E8E93'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted || '#8E8E93'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Radius Filter Pills */}
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Radius:</Text>
          {[100, 500, 1000].map((r) => {
            const isSelected = radius === r;
            const label = r < 1000 ? `${r}m` : '1km';
            return (
              <TouchableOpacity
                key={r}
                style={[styles.radiusPill, isSelected && styles.radiusPillActive]}
                onPress={() => handleRadiusChange(r)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Discovery radius ${label}`}
              >
                <Text style={[styles.radiusPillText, isSelected && styles.radiusPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Collaboration & Hub Chips */}
        <View style={styles.hubContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hubScroll}>
            <TouchableOpacity
              style={styles.hubPill}
              onPress={() => navigation.navigate('Events')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={14} color={COLORS.primary || '#007AFF'} style={styles.hubIcon} />
              <Text style={styles.hubText}>Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hubPill}
              onPress={() => navigation.navigate('Workspaces')}
              activeOpacity={0.8}
            >
              <Ionicons name="flask-outline" size={14} color={COLORS.primary || '#007AFF'} style={styles.hubIcon} />
              <Text style={styles.hubText}>Workspaces</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hubPill}
              onPress={() => navigation.navigate('ResearchDiscovery')}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={14} color={COLORS.primary || '#007AFF'} style={styles.hubIcon} />
              <Text style={styles.hubText}>Papers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hubPill}
              onPress={() => navigation.navigate('QRProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={14} color={COLORS.primary || '#007AFF'} style={styles.hubIcon} />
              <Text style={styles.hubText}>My QR</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Main Content List with Map Header */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Location Permission Prompt Card */}
            {Boolean(locationRequired || !hasValidCoords) && (
              <View style={styles.promptCard}>
                <View style={styles.promptHeader}>
                  <Ionicons name="location-outline" size={18} color={COLORS.primary || '#007AFF'} style={{ marginRight: 6 }} />
                  <Text style={styles.promptTitle}>Enable GPS Discovery</Text>
                </View>
                <Text style={styles.promptDesc}>
                  GeoConnect uses privacy-obfuscated locations to discover nearby researchers within 1km.
                </Text>
                <TouchableOpacity
                  style={styles.promptBtn}
                  onPress={handleEnableGps}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Text style={styles.promptBtnText}>Enable GPS Location</Text>
                </TouchableOpacity>
              </View>
            )}

            {Boolean(error) && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Map Visualizer */}
            <View style={styles.mapWrapper}>
              {MapView && !mapError && Platform.OS !== 'web' ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={PROVIDER_DEFAULT}
                  customMapStyle={WARM_SAGE_MAP_STYLE}
                  initialRegion={mapRegion}
                  onPress={() => setSelectedProfile(null)}
                  onError={(e) => {
                    console.warn('[MapView Error]:', e?.nativeEvent?.error || e);
                    setMapError(true);
                  }}
                  showsUserLocation={false}
                  showsCompass={false}
                  toolbarEnabled={false}
                >
                  {/* Selected Radius Circle */}
                  {hasValidCoords && (
                    <Circle
                      center={{ latitude: userLat, longitude: userLng }}
                      radius={radius}
                      fillColor="rgba(0, 122, 255, 0.08)"
                      strokeColor="rgba(0, 122, 255, 0.35)"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Current User Marker */}
                  {hasValidCoords && (
                    <Marker
                      coordinate={{ latitude: userLat, longitude: userLng }}
                      title="You"
                      description="Your discovery center"
                    >
                      <View style={styles.myMarker}>
                        <View style={styles.myMarkerPulse} />
                        <View style={styles.myMarkerDot}>
                          <Text style={styles.myMarkerText}>YOU</Text>
                        </View>
                      </View>
                    </Marker>
                  )}

                  {/* Nearby Professionals Markers */}
                  {filteredUsers.map((user) => {
                    const pos = user.mapPosition;
                    if (!pos || typeof pos.latitude !== 'number' || typeof pos.longitude !== 'number') {
                      return null;
                    }
                    const isSelected = selectedProfile?._id === user._id;
                    const avatarUrl =
                      user.profileImage ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
                    return (
                      <Marker
                        key={user._id}
                        coordinate={{ latitude: pos.latitude, longitude: pos.longitude }}
                        onPress={() => handleMarkerPress(user)}
                        tracksViewChanges={false}
                      >
                        <View style={[styles.peerMarker, isSelected && styles.peerMarkerSelected]}>
                          <Image source={{ uri: avatarUrl }} style={styles.peerMarkerAvatar} />
                          {Boolean(user.matchScore) && (
                            <View style={styles.peerMarkerBadge}>
                              <Text style={styles.peerMarkerBadgeText}>{user.matchScore}%</Text>
                            </View>
                          )}
                        </View>
                      </Marker>
                    );
                  })}
                </MapView>
              ) : (
                /* Interactive Proximity Radar on Web / Unsupported environments */
                <View style={styles.radarContainer}>
                  {/* Axis Crosshairs */}
                  <View style={styles.radarAxisH} />
                  <View style={styles.radarAxisV} />

                  {/* 100m Circle - always shown */}
                  <View
                    style={[
                      styles.radarRing,
                      { width: 70, height: 70, borderRadius: 35 },
                      radius === 100 && styles.radarRingActive
                    ]}
                  />
                  <Text
                    style={[
                      styles.radarDistTag,
                      { top: '50%', left: '50%', marginTop: -43, marginLeft: 6 },
                      radius === 100 && styles.radarDistTagActive
                    ]}
                  >
                    100m
                  </Text>

                  {/* 500m Circle - ONLY visible when radius is 500m or 1000m */}
                  {radius >= 500 && (
                    <>
                      <View
                        style={[
                          styles.radarRing,
                          { width: 140, height: 140, borderRadius: 70 },
                          radius === 500 && styles.radarRingActive
                        ]}
                      />
                      <Text
                        style={[
                          styles.radarDistTag,
                          { top: '50%', left: '50%', marginTop: -78, marginLeft: 6 },
                          radius === 500 && styles.radarDistTagActive
                        ]}
                      >
                        500m
                      </Text>
                    </>
                  )}

                  {/* 1km Circle - ONLY visible when radius is 1000m (1km) */}
                  {radius >= 1000 && (
                    <>
                      <View
                        style={[
                          styles.radarRing,
                          { width: 220, height: 220, borderRadius: 110 },
                          styles.radarRingActive
                        ]}
                      />
                      <Text
                        style={[
                          styles.radarDistTag,
                          { top: '50%', left: '50%', marginTop: -118, marginLeft: 6 },
                          styles.radarDistTagActive
                        ]}
                      >
                        1km
                      </Text>
                    </>
                  )}

                  {/* Center "YOU" avatar */}
                  <View style={styles.radarCenterAvatar}>
                    <Text style={styles.radarCenterText}>YOU</Text>
                  </View>

                  {/* Discovered Nearby Peers Nodes */}
                  {filteredUsers.slice(0, 8).map((peer, idx) => {
                    const angle = (idx * (360 / Math.max(Math.min(filteredUsers.length, 8), 1)) + 35) * (Math.PI / 180);
                    let orbitRadius;
                    if (radius === 1000) {
                      orbitRadius = 45 + ((idx % 3) * 26);
                    } else if (radius === 500) {
                      orbitRadius = 36 + ((idx % 3) * 13);
                    } else {
                      orbitRadius = 24 + ((idx % 3) * 4);
                    }
                    const x = Math.cos(angle) * orbitRadius;
                    const y = Math.sin(angle) * orbitRadius;
                    const isSelected = selectedProfile?._id === peer._id;
                    return (
                      <TouchableOpacity
                        key={peer._id}
                        style={[
                          styles.radarPeerNode,
                          { transform: [{ translateX: x }, { translateY: y }] },
                          isSelected && styles.radarPeerNodeSelected
                        ]}
                        onPress={() => setSelectedProfile(peer)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{
                            uri:
                              peer.profileImage ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                          }}
                          style={styles.radarPeerAvatar}
                        />
                        {Boolean(peer.matchScore) && (
                          <View style={styles.radarPeerBadge}>
                            <Text style={styles.radarPeerBadgeText}>{peer.matchScore}%</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Map Legend Overlay */}
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary || '#007AFF' }]} />
                  <Text style={styles.legendText}>You</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#34C759', borderWidth: 1, borderColor: '#FFFFFF' }]} />
                  <Text style={styles.legendText}>Nearby Peer</Text>
                </View>
              </View>
            </View>

            {/* Selected Profile Compact Preview Card */}
            {Boolean(selectedProfile) && (
              <View style={styles.previewCard}>
                <TouchableOpacity
                  style={styles.previewClose}
                  onPress={() => setSelectedProfile(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={COLORS.textMuted || '#8E8E93'} />
                </TouchableOpacity>

                <View style={styles.previewHeader}>
                  <Image
                    source={{
                      uri:
                        selectedProfile.profileImage ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                    }}
                    style={styles.previewAvatar}
                  />
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewName} numberOfLines={1}>
                      {selectedProfile.name}
                    </Text>
                    <Text style={styles.previewRole} numberOfLines={1}>
                      {selectedProfile.role || 'Professional'}
                    </Text>
                    <Text style={styles.previewOrg} numberOfLines={1}>
                      {selectedProfile.organization || 'GeoConnect Member'}
                    </Text>
                  </View>
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>
                      {selectedProfile.matchScore || 50}% Match
                    </Text>
                  </View>
                </View>

                {/* Distance & Overlap Meta */}
                <View style={styles.previewMetaRow}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textMuted || '#8E8E93'} />
                  <Text style={styles.previewDistText}>
                    {selectedProfile.approximateDistance || 'Nearby'}
                  </Text>
                  {Array.isArray(selectedProfile.matchReasons) && selectedProfile.matchReasons.length > 0 && (
                    <Text style={styles.previewOverlapText} numberOfLines={1}>
                      • Overlap: {selectedProfile.matchReasons.slice(0, 2).join(', ')}
                    </Text>
                  )}
                </View>

                {/* AI Explanation Box */}
                {Boolean(selectedProfile.matchExplanation) && (
                  <View style={styles.previewAiBox}>
                    <Ionicons name="sparkles" size={12} color={COLORS.primary || '#007AFF'} style={{ marginRight: 4 }} />
                    <Text style={styles.previewAiText} numberOfLines={2}>
                      AI Match: {selectedProfile.matchExplanation}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.previewBtnOutline}
                    onPress={() => setFullModalProfile(selectedProfile)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.previewBtnOutlineText}>View Profile</Text>
                  </TouchableOpacity>

                  <ConnectionButton
                    targetUser={selectedProfile}
                    initialStatus={selectedProfile.connectionStatus || 'none'}
                    initialConnectionId={selectedProfile.connectionId}
                    isSender={selectedProfile.isSender}
                    onOpenMessage={(u) => navigation.navigate('Chat', { connectedUser: u })}
                  />
                </View>
              </View>
            )}

            {/* List Header Section Title */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Nearby Professionals</Text>
              <Text style={styles.sectionCount}>
                ({filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'})
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <NearbyUserCard
            user={item}
            onViewProfile={(u) => setFullModalProfile(u)}
            onOpenMessage={(u) => navigation.navigate('Chat', { connectedUser: u })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingView message="Scanning nearby area..." />
          ) : (
            <EmptyStateView
              title="No Professionals Found"
              description={
                searchQuery
                  ? `No professionals matching "${searchQuery}" in this radius.`
                  : `Expand your discovery radius to 500m or 1km to find more peers.`
              }
            />
          )
        }
      />

      {/* Full Profile Modal */}
      {Boolean(fullModalProfile) && (
        <ProfileModalView
          visible={!!fullModalProfile}
          user={fullModalProfile}
          onClose={() => setFullModalProfile(null)}
          onOpenMessage={(u) => navigation.navigate('Chat', { connectedUser: u })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain || '#F2F2F7',
  },
  searchHeader: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border || 'rgba(0,0,0,0.08)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput || '#EFEFF4',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain || '#1C1C1E',
    paddingVertical: 0,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted || '#8E8E93',
  },
  radiusPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput || '#EFEFF4',
  },
  radiusPillActive: {
    backgroundColor: COLORS.primary || '#007AFF',
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.secondary || '#3C3C43',
  },
  radiusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hubContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border || 'rgba(0,0,0,0.06)',
  },
  hubScroll: {
    gap: 8,
    paddingRight: 10,
  },
  hubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput || '#EFEFF4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hubIcon: {
    marginRight: 5,
  },
  hubText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary || '#007AFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  mapWrapper: {
    height: MAP_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    backgroundColor: '#F7F5F0',
    marginBottom: 14,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
    }),
  },
  map: {
    width: '100%',
    height: '100%',
  },
  radarContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F5',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(36, 86, 59, 0.2)',
    backgroundColor: 'rgba(36, 86, 59, 0.02)',
  },
  radarRingActive: {
    borderColor: COLORS.primary || '#24563B',
    borderWidth: 1.5,
    backgroundColor: 'rgba(36, 86, 59, 0.06)',
  },
  radarAxisH: {
    position: 'absolute',
    width: '90%',
    height: 1,
    backgroundColor: 'rgba(36, 86, 59, 0.12)',
  },
  radarAxisV: {
    position: 'absolute',
    height: '90%',
    width: 1,
    backgroundColor: 'rgba(36, 86, 59, 0.12)',
  },
  radarDistTag: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted || '#5A7D69',
    opacity: 0.85,
  },
  radarDistTagActive: {
    fontWeight: '700',
    color: COLORS.primary || '#24563B',
    opacity: 1,
  },
  radarCenterAvatar: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary || '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 5,
  },
  radarCenterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  radarPeerNode: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.primary || '#007AFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  radarPeerNodeSelected: {
    borderColor: '#34C759',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  radarPeerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  radarPeerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.primary || '#007AFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  radarPeerBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  mapLegend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    zIndex: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMain || '#1C1C1E',
  },
  myMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  myMarkerPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  myMarkerDot: {
    backgroundColor: COLORS.primary || '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  myMarkerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  peerMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.primary || '#007AFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerMarkerSelected: {
    borderColor: '#34C759',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  peerMarkerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  peerMarkerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.primary || '#007AFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  peerMarkerBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    padding: 14,
    marginBottom: 14,
    position: 'relative',
  },
  previewClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  previewRole: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary || '#007AFF',
    marginTop: 1,
  },
  previewOrg: {
    fontSize: 12,
    color: COLORS.textMuted || '#8E8E93',
  },
  previewBadge: {
    backgroundColor: 'rgba(0,122,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary || '#007AFF',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  previewDistText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted || '#8E8E93',
  },
  previewOverlapText: {
    fontSize: 12,
    color: COLORS.primary || '#007AFF',
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
  },
  previewAiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  previewAiText: {
    fontSize: 12,
    color: COLORS.textMain || '#1C1C1E',
    lineHeight: 16,
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border || 'rgba(0,0,0,0.06)',
  },
  previewBtnOutline: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.bgInput || '#F2F2F7',
  },
  previewBtnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
  },
  promptCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    marginBottom: 12,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  promptDesc: {
    fontSize: 12,
    color: COLORS.textMuted || '#8E8E93',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 17,
  },
  promptBtn: {
    backgroundColor: COLORS.primary || '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  promptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 0.5,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
});

export default DiscoverScreen;