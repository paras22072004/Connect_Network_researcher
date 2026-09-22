import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { useLocation } from '../context/LocationContext';
import { getNearbyUsers } from '../services/locationService';
import NearbyUserCard from '../components/NearbyUserCard';
import ProfileModalView from '../components/ProfileModalView';
import LoadingView from '../components/LoadingView';
import EmptyStateView from '../components/EmptyStateView';
import { COLORS } from '../theme/theme';

// Safely import react-native-maps with try-catch guard to prevent APK launch crash
let MapView, Marker, Callout, PROVIDER_DEFAULT;
try {
  if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  }
} catch (err) {
  console.warn('[Map Native Module Load Exception Guard]:', err);
}

const { width } = Dimensions.get('window');

// Generate Leaflet + OpenStreetMap HTML for Web Browser with Auto-Fit Bounds
const createLeafletHtml = (lat, lng, users, userCoords) => {
  const usersJson = JSON.stringify(users || []);
  const userCoordsJson = JSON.stringify(userCoords || null);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .user-you-pin { background: #2563EB; color: #fff; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 12px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.4); text-align: center; white-space: nowrap; }
        .user-peer-pin { width: 36px; height: 36px; border-radius: 18px; border: 2.5px solid #2563EB; background: #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.25); position: relative; cursor: pointer; }
        .user-peer-pin img { width: 100%; height: 100%; border-radius: 18px; object-fit: cover; }
        .user-peer-badge { position: absolute; top: -6px; right: -6px; background: #F59E0B; color: #fff; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 8px; border: 1px solid #fff; }
        .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .popup-card { padding: 4px; text-align: left; }
        .popup-title { font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 2px; }
        .popup-role { font-size: 11px; color: #64748B; margin-bottom: 4px; }
        .popup-meta { font-size: 10px; color: #2563EB; font-weight: 600; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        const bounds = [];

        const userCoords = ${userCoordsJson};
        if (userCoords && userCoords.latitude && userCoords.longitude) {
          bounds.push([userCoords.latitude, userCoords.longitude]);
          const youIcon = L.divIcon({
            className: 'user-you-marker',
            html: '<div class="user-you-pin">YOU</div>',
            iconSize: [44, 24],
            iconAnchor: [22, 12]
          });
          L.marker([userCoords.latitude, userCoords.longitude], { icon: youIcon }).addTo(map).bindPopup('<b>Your Location</b>');
        }

        const users = ${usersJson};
        users.forEach(u => {
          if (u.mapPosition && u.mapPosition.latitude && u.mapPosition.longitude) {
            bounds.push([u.mapPosition.latitude, u.mapPosition.longitude]);
            const avatar = u.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
            const peerIcon = L.divIcon({
              className: 'user-peer-marker',
              html: '<div class="user-peer-pin"><img src="' + avatar + '" /><div class="user-peer-badge">' + (u.matchScore || 50) + '%</div></div>',
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
            const popupHtml = '<div class="popup-card">' +
              '<div class="popup-title">' + u.name + '</div>' +
              '<div class="popup-role">' + (u.role || '') + '</div>' +
              '<div class="popup-meta">🎯 ' + (u.matchScore || 50) + '% Match &bull; 📍 ' + (u.approximateDistance || '') + '</div>' +
            '</div>';
            L.marker([u.mapPosition.latitude, u.mapPosition.longitude], { icon: peerIcon }).addTo(map).bindPopup(popupHtml);
          }
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
        }
      </script>
    </body>
    </html>
  `;
};

const DiscoverScreen = ({ navigation }) => {
  const { coordinates, locationStatus, locationError, requestAndSaveLocation } = useLocation();

  const [radius, setRadius] = useState(1000); // 100m | 500m | 1000m (1 km)
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationRequired, setLocationRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProfile, setSelectedProfile] = useState(null);

  const fetchNearby = async (selectedRadius = radius) => {
    setLoading(true);
    setError('');
    setLocationRequired(false);
    try {
      const data = await getNearbyUsers(selectedRadius);
      if (data.success) {
        setNearbyUsers(data.users || []);
        setLocationRequired(false);
      } else if (data.locationRequired) {
        setLocationRequired(true);
        setNearbyUsers([]);
      } else {
        setError(data.message || 'Failed to fetch nearby users.');
      }
    } catch (err) {
      console.error('Error fetching nearby professionals:', err);
      setError(err.response?.data?.message || 'Could not fetch nearby users.');
    } finally {
      setLoading(false);
    }
  };

  // Sync Location & Fetch Nearby Users Sequentially
  useEffect(() => {
    const initLocationAndNearby = async () => {
      await requestAndSaveLocation();
      await fetchNearby(radius);
    };
    initLocationAndNearby();
  }, []);

  const handleEnableGps = async () => {
    const res = await requestAndSaveLocation();
    if (res.success) {
      setLocationRequired(false);
      await fetchNearby(radius);
    } else {
      setError(res.message || 'GPS location error');
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    fetchNearby(newRadius);
  };

  const filteredUsers = nearbyUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(query);
    const roleMatch = u.role?.toLowerCase().includes(query);
    const orgMatch = u.organization?.toLowerCase().includes(query);
    const skillMatch = u.skills?.some((s) => s.toLowerCase().includes(query));
    const interestMatch = u.researchInterests?.some((i) => i.toLowerCase().includes(query));
    return nameMatch || roleMatch || orgMatch || skillMatch || interestMatch;
  });

  // Calculate Map Center Position
  const userLat = coordinates?.latitude || 28.6139;
  const userLng = coordinates?.longitude || 77.2090;

  return (
    <View style={styles.container}>
      {/* Privacy Guarantee Banner */}
      <View style={styles.privacyBanner}>
        <Text style={styles.privacyText}>
          🔒 <Text style={{ fontWeight: '700' }}>Privacy Guaranteed:</Text> Exact coordinates stay hidden. Maps & distances use approximate ranges.
        </Text>
      </View>

      {/* Controls Bar: Radius Pills + Search Input */}
      <View style={styles.controlsBar}>
        <View style={styles.radiusPillsRow}>
          <Text style={styles.radiusLabel}>Radius:</Text>
          {[
            { label: '100m', val: 100 },
            { label: '500m', val: 500 },
            { label: '1 km', val: 1000 }
          ].map((item) => (
            <TouchableOpacity
              key={item.val}
              style={[styles.radiusPill, radius === item.val && styles.radiusPillActive]}
              onPress={() => handleRadiusChange(item.val)}
            >
              <Text
                style={[styles.radiusPillText, radius === item.val && styles.radiusPillTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Filter by skill, interest, or role..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Main Content Area */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Interactive Map */}
            {!locationRequired && (
              <View style={styles.mapWrapper}>
                <View style={styles.mapHeaderRow}>
                  <Text style={styles.mapTitle}>🗺️ Proximity Visualization Map</Text>
                  <Text style={styles.mapBadge}>{filteredUsers.length} Nearby</Text>
                </View>

                <View style={styles.mapContainer}>
                  {Platform.OS !== 'web' && MapView ? (
                    <MapView
                      provider={PROVIDER_DEFAULT}
                      style={styles.map}
                      region={{
                        latitude: userLat,
                        longitude: userLng,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02
                      }}
                    >
                      {/* Logged-in User Marker */}
                      {coordinates && (
                        <Marker
                          coordinate={{
                            latitude: coordinates.latitude,
                            longitude: coordinates.longitude
                          }}
                          title="Your Location"
                        >
                          <View style={styles.markerYou}>
                            <Text style={styles.markerYouText}>YOU</Text>
                          </View>
                        </Marker>
                      )}

                      {/* Nearby Researchers Markers */}
                      {filteredUsers.map((u) => {
                        if (!u.mapPosition?.latitude || !u.mapPosition?.longitude) return null;
                        return (
                          <Marker
                            key={u._id}
                            coordinate={{
                              latitude: u.mapPosition.latitude,
                              longitude: u.mapPosition.longitude
                            }}
                            onPress={() => setSelectedProfile(u)}
                          >
                            <View style={styles.markerPeer}>
                              <Image
                                source={{
                                  uri:
                                    u.profileImage ||
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                                }}
                                style={styles.markerPeerImg}
                              />
                              <View style={styles.markerPeerBadge}>
                                <Text style={styles.markerPeerBadgeText}>
                                  {u.matchScore || 50}%
                                </Text>
                              </View>
                            </View>

                            <Callout onPress={() => setSelectedProfile(u)}>
                              <View style={styles.calloutCard}>
                                <Text style={styles.calloutName}>{u.name}</Text>
                                <Text style={styles.calloutRole}>{u.role}</Text>
                                <Text style={styles.calloutMeta}>
                                  🎯 {u.matchScore}% Match  •  📍 {u.approximateDistance}
                                </Text>
                                <Text style={styles.calloutBtn}>Tap to View Profile</Text>
                              </View>
                            </Callout>
                          </Marker>
                        );
                      })}
                    </MapView>
                  ) : (
                    <iframe
                      srcDoc={createLeafletHtml(userLat, userLng, filteredUsers, coordinates)}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: 8
                      }}
                      title="GeoConnect Leaflet Map"
                    />
                  )}
                </View>
              </View>
            )}

            {/* Enable GPS Button Banner */}
            <View style={styles.gpsBannerRow}>
              <TouchableOpacity
                style={styles.btnGps}
                onPress={handleEnableGps}
                disabled={locationStatus === 'loading'}
              >
                <Text style={styles.btnGpsText}>
                  {locationStatus === 'loading' ? 'Acquiring GPS...' : '⚡ Re-Sync GPS Location'}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && <LoadingView message="Scanning area for nearby professionals..." />}

            {locationRequired && !loading && (
              <View style={styles.promptCard}>
                <Text style={styles.promptTitle}>Location Access Required</Text>
                <Text style={styles.promptDesc}>
                  Please enable your device GPS location to discover professionals nearby.
                </Text>
                <TouchableOpacity style={styles.promptBtn} onPress={handleEnableGps}>
                  <Text style={styles.promptBtnText}>Enable GPS Location</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !locationRequired && filteredUsers.length > 0 && (
              <Text style={styles.sectionTitle}>Nearby Professionals List</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <NearbyUserCard
            user={item}
            onViewProfile={(profile) => setSelectedProfile(profile)}
            onOpenMessage={(targetUser) =>
              navigation.navigate('Messages', {
                screen: 'Chat',
                params: { connectedUser: targetUser }
              })
            }
          />
        )}
        ListEmptyComponent={
          !loading && !locationRequired ? (
            <EmptyStateView
              title="No Professionals Found Nearby"
              description="No registered researchers are discoverable within your selected 1 km radius area."
            />
          ) : null
        }
      />

      {/* Full Profile Modal View */}
      <ProfileModalView
        visible={!!selectedProfile}
        user={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onOpenMessage={(targetUser) => {
          setSelectedProfile(null);
          navigation.navigate('Messages', {
            screen: 'Chat',
            params: { connectedUser: targetUser }
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
    paddingHorizontal: 14,
    paddingTop: 10
  },
  privacyBanner: {
    backgroundColor: COLORS.primaryLight,
    borderColor: '#bfdbfe',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10
  },
  privacyText: {
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center'
  },
  controlsBar: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10
  },
  radiusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginRight: 8
  },
  radiusPill: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  radiusPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  radiusPillTextActive: {
    color: COLORS.textWhite
  },
  searchInput: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.textMain
  },
  listContent: {
    paddingBottom: 24
  },
  mapWrapper: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 10
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  mapBadge: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  map: {
    width: '100%',
    height: '100%'
  },
  markerYou: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.textWhite
  },
  markerYouText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: '800'
  },
  markerPeer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.bgCard
  },
  markerPeerImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18
  },
  markerPeerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6
  },
  markerPeerBadgeText: {
    color: COLORS.textWhite,
    fontSize: 8,
    fontWeight: '800'
  },
  calloutCard: {
    padding: 6,
    minWidth: 160
  },
  calloutName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain
  },
  calloutRole: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  calloutMeta: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '600'
  },
  calloutBtn: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    marginTop: 4
  },
  gpsBannerRow: {
    marginBottom: 10
  },
  btnGps: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnGpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain
  },
  promptCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6
  },
  promptDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14
  },
  promptBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  promptBtnText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginVertical: 8
  }
});

export default DiscoverScreen;
