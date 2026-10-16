import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { getNearbyUsers } from '../../services/locationService';
import NearbyUserCard from '../../components/NearbyUserCard/NearbyUserCard';
import ProfileCard from '../../components/ProfileCard/ProfileCard';
import Loading from '../../components/Loading/Loading';
import EmptyState from '../../components/common/EmptyState';
import './Discover.css';

/**
 * Controller component inside MapContainer to smoothly pan/zoom
 * when center, radius, or selected user changes.
 */
const MapViewController = ({ center, radius, selectedUser }) => {
  const map = useMap();
  const prevCenterRef = useRef(center);

  // Zoom level corresponding to proximity radius
  const targetZoom = useMemo(() => {
    if (radius <= 100) return 18;
    if (radius <= 500) return 16;
    return 15;
  }, [radius]);

  useEffect(() => {
    if (selectedUser?.mapPosition?.latitude && selectedUser?.mapPosition?.longitude) {
      map.flyTo(
        [selectedUser.mapPosition.latitude, selectedUser.mapPosition.longitude],
        Math.max(map.getZoom(), 16),
        { duration: 0.8, easeLinearity: 0.25 }
      );
    } else if (center && center[0] && center[1]) {
      map.flyTo(center, targetZoom, { duration: 0.8, easeLinearity: 0.25 });
    }
  }, [center, targetZoom, selectedUser, map]);

  return null;
};

const Discover = () => {
  const { user: currentUser } = useAuth();
  const {
    requestAndSaveLocation,
    locationStatus,
    locationError,
    coordinates,
    autoRequestLocationIfPossible
  } = useLocation();

  const [radius, setRadius] = useState(1000); // 100m | 500m | 1000m (1 km)
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationRequired, setLocationRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected user for map popup & card synchronization
  const [selectedMapUser, setSelectedMapUser] = useState(null);
  // Selected profile for full details Modal view
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch nearby discoverable professionals from backend API
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
      setError(
        err.response?.data?.message ||
          'Could not fetch nearby users. Make sure location is updated.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDiscover = async () => {
      if (autoRequestLocationIfPossible) {
        await autoRequestLocationIfPossible();
      }
      fetchNearby(radius);
    };
    initDiscover();
  }, []);

  // Handler for GPS sync button
  const handleDiscoverNearbyClick = async () => {
    const res = await requestAndSaveLocation();
    if (res.success) {
      setLocationRequired(false);
      await fetchNearby(radius);
    } else {
      setError(res.message || 'Location permission error');
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    setSelectedMapUser(null);
    fetchNearby(newRadius);
  };

  // Filter nearby users based on search query
  const filteredUsers = useMemo(() => {
    return nearbyUsers.filter((u) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const nameMatch = u.name?.toLowerCase().includes(query);
      const roleMatch = u.role?.toLowerCase().includes(query);
      const orgMatch = u.organization?.toLowerCase().includes(query);
      const skillMatch = u.skills?.some((s) => s.toLowerCase().includes(query));
      const interestMatch = u.researchInterests?.some((i) =>
        i.toLowerCase().includes(query)
      );
      return nameMatch || roleMatch || orgMatch || skillMatch || interestMatch;
    });
  }, [nearbyUsers, searchQuery]);

  // Center coordinate: GPS position or fallback
  const userLat = coordinates?.latitude;
  const userLng = coordinates?.longitude;

  const mapCenter = useMemo(() => {
    if (userLat && userLng) {
      return [userLat, userLng];
    }
    const firstWithCoords = filteredUsers.find(
      (u) => u.mapPosition?.latitude && u.mapPosition?.longitude
    );
    if (firstWithCoords) {
      return [
        firstWithCoords.mapPosition.latitude,
        firstWithCoords.mapPosition.longitude
      ];
    }
    // Default fallback (e.g. New Delhi default)
    return [28.6139, 77.209];
  }, [userLat, userLng, filteredUsers]);

  // Avoid overlapping markers by calculating slight offsets for close points
  const markersWithPositions = useMemo(() => {
    const seen = new Map();

    return filteredUsers.map((u, index) => {
      let lat = u.mapPosition?.latitude;
      let lng = u.mapPosition?.longitude;

      if (!lat || !lng) {
        // Fallback offset around user center if mapPosition is absent
        const angle = ((2 * Math.PI) / Math.max(filteredUsers.length, 1)) * index;
        const dist = (radius * 0.4) / 111320;
        lat = (userLat || mapCenter[0]) + dist * Math.sin(angle);
        lng =
          (userLng || mapCenter[1]) +
          (dist * Math.cos(angle)) / Math.cos(((userLat || mapCenter[0]) * Math.PI) / 180);
      }

      // Check collision with previously placed markers (within ~15 meters)
      const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      if (seen.has(key)) {
        const count = seen.get(key) + 1;
        seen.set(key, count);
        const jitterAngle = (count * 65 * Math.PI) / 180;
        const jitterDist = 0.00018 * count;
        lat += jitterDist * Math.cos(jitterAngle);
        lng += jitterDist * Math.sin(jitterAngle);
      } else {
        seen.set(key, 1);
      }

      return {
        ...u,
        renderedLat: lat,
        renderedLng: lng
      };
    });
  }, [filteredUsers, userLat, userLng, radius, mapCenter]);

  // Create current user marker icon
  const currentUserIcon = useMemo(() => {
    const avatar =
      currentUser?.profileImage ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

    return L.divIcon({
      className: 'user-location-marker-container',
      html: `
        <div class="user-pulse-ring"></div>
        <div class="user-avatar-disc">
          <img src="${avatar}" alt="Your Location" class="user-avatar-image" />
          <span class="user-you-tag">YOU</span>
        </div>
      `,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
      popupAnchor: [0, -25]
    });
  }, [currentUser]);

  // Create marker icon for nearby professional
  const createProIcon = (user, isSelected) => {
    const avatar =
      user.profileImage ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
    const matchScore = user.matchScore ? `${user.matchScore}%` : '';

    return L.divIcon({
      className: `pro-marker-icon ${isSelected ? 'pro-marker-selected' : ''}`,
      html: `
        <div class="pro-marker-ring ${isSelected ? 'ring-active' : ''}">
          <img src="${avatar}" alt="${user.name}" class="pro-marker-photo" />
          ${
            matchScore
              ? `<span class="pro-marker-badge">${matchScore}</span>`
              : ''
          }
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
      popupAnchor: [0, -24]
    });
  };

  const handleCardClick = (user) => {
    setSelectedMapUser(user);
  };

  return (
    <div className="page-container container discover-page">
      {/* Header Banner */}
      <div className="discover-header">
        <div>
          <div className="discover-title-row">
            <h1 className="discover-title">Discover Nearby</h1>
            <span className="live-count-pill">
              <span className="live-count-dot"></span>
              {filteredUsers.length} Nearby
            </span>
          </div>
          <p className="discover-subtitle">
            Explore researchers, scholars, and professionals currently within your proximity.
          </p>
        </div>

        <button
          className="btn btn-primary btn-discover-gps"
          onClick={handleDiscoverNearbyClick}
          disabled={locationStatus === 'loading'}
        >
          {locationStatus === 'loading' ? 'Acquiring GPS...' : '⚡ Re-Sync Location'}
        </button>
      </div>

      {/* Privacy Notice Banner */}
      <div className="privacy-info-box">
        <div className="privacy-text">
          🔒 <strong>Privacy Protected:</strong> Nearby markers are rendered using generalized, privacy-safe proximity zones. Exact coordinates are never shared or displayed.
        </div>
      </div>

      {locationError && <div className="form-error">{locationError}</div>}
      {error && <div className="form-error">{error}</div>}

      {/* Controls Bar: Radius Filter & Search */}
      <div className="controls-bar">
        <div className="radius-selector-group">
          <span className="control-label">Proximity Radius:</span>
          <div className="radius-pills">
            {[
              { label: '100m', value: 100 },
              { label: '500m', value: 500 },
              { label: '1 km', value: 1000 }
            ].map((item) => (
              <button
                key={item.value}
                className={`radius-pill ${radius === item.value ? 'pill-active' : ''}`}
                onClick={() => handleRadiusChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="search-box-wrapper">
          <input
            type="text"
            placeholder="Search by skill, role, or interest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Main Map Visual Section */}
      {!locationRequired && (
        <div className="map-view-wrapper">
          <div className="map-card-container">
            {/* Minimalist Map Top Bar */}
            <div className="map-header-bar">
              <div className="map-header-left">
                <span className="map-status-indicator"></span>
                <span className="map-heading-label">Interactive Proximity Map</span>
                <span className="map-radius-badge">{radius === 1000 ? '1 km' : `${radius}m`} range</span>
              </div>

              {/* Map Legend */}
              <div className="map-legend-items">
                <div className="legend-entry">
                  <span className="legend-swatch swatch-you"></span>
                  <span className="legend-text">You</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-swatch swatch-pro"></span>
                  <span className="legend-text">Professionals</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-swatch swatch-radius"></span>
                  <span className="legend-text">Coverage Area</span>
                </div>
              </div>
            </div>

            {/* Leaflet Map Canvas */}
            <div className="leaflet-map-canvas-container">
              <MapContainer
                center={mapCenter}
                zoom={radius <= 100 ? 18 : radius <= 500 ? 16 : 15}
                scrollWheelZoom={true}
                className="minimalist-map-container"
              >
                {/* Controller for automatic smooth panning */}
                <MapViewController
                  center={mapCenter}
                  radius={radius}
                  selectedUser={selectedMapUser}
                />

                {/* Minimalist Warm Off-White / Sage Basemap Tiles (CartoDB Positron) */}
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  subdomains="abcd"
                  maxZoom={19}
                />

                {/* Subtle Translucent Radius Circle Around Current User */}
                {userLat && userLng && (
                  <Circle
                    center={[userLat, userLng]}
                    radius={radius}
                    pathOptions={{
                      color: '#4b7b61',
                      fillColor: '#88b297',
                      fillOpacity: 0.12,
                      weight: 1.5,
                      dashArray: '6, 6'
                    }}
                  />
                )}

                {/* Current User Location Marker */}
                {userLat && userLng && (
                  <Marker
                    position={[userLat, userLng]}
                    icon={currentUserIcon}
                    zIndexOffset={1000}
                  >
                    <Popup className="minimalist-pro-popup" closeButton={false}>
                      <div className="popup-you-card">
                        <div className="popup-you-badge">Your Location</div>
                        <div className="popup-you-text">
                          You are discoverable to other professionals within {radius === 1000 ? '1 km' : `${radius}m`}.
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Nearby Professional Markers */}
                {markersWithPositions.map((user) => {
                  const isSelected = selectedMapUser?._id === user._id;

                  return (
                    <Marker
                      key={user._id}
                      position={[user.renderedLat, user.renderedLng]}
                      icon={createProIcon(user, isSelected)}
                      eventHandlers={{
                        click: () => setSelectedMapUser(user)
                      }}
                    >
                      {/* Rich Professional Profile Popup Card */}
                      <Popup className="minimalist-pro-popup">
                        <div className="popup-card-content">
                          <div className="popup-card-header">
                            <img
                              src={
                                user.profileImage ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                              }
                              alt={user.name}
                              className="popup-avatar"
                            />
                            <div className="popup-header-info">
                              <h4 className="popup-user-name">{user.name}</h4>
                              <p className="popup-user-role">{user.role || 'Professional'}</p>
                              {user.organization && (
                                <p className="popup-user-org">{user.organization}</p>
                              )}
                            </div>
                          </div>

                          <div className="popup-badges-row">
                            <span className="popup-badge match-pill">
                              ✨ {user.matchScore || 50}% Match
                            </span>
                            <span className="popup-badge dist-pill">
                              📍 {user.approximateDistance || 'Nearby'}
                            </span>
                          </div>

                          {/* AI Match Breakdown in Popup */}
                          <div className="popup-ai-breakdown">
                            <div className="popup-breakdown-title">AI Match Breakdown</div>
                            <div className="popup-metric-line">
                              <span>Semantic</span>
                              <div className="popup-mini-bar">
                                <div
                                  className="popup-bar-fill fill-semantic"
                                  style={{ width: `${user.semanticScore ?? user.matchScore ?? 50}%` }}
                                ></div>
                              </div>
                              <span className="popup-metric-num">{user.semanticScore ?? user.matchScore ?? 50}%</span>
                            </div>
                            <div className="popup-metric-line">
                              <span>Skills</span>
                              <div className="popup-mini-bar">
                                <div
                                  className="popup-bar-fill fill-skill"
                                  style={{ width: `${user.skillScore ?? 50}%` }}
                                ></div>
                              </div>
                              <span className="popup-metric-num">{user.skillScore ?? 50}%</span>
                            </div>
                            <div className="popup-metric-line">
                              <span>Research</span>
                              <div className="popup-mini-bar">
                                <div
                                  className="popup-bar-fill fill-research"
                                  style={{ width: `${user.researchScore ?? 50}%` }}
                                ></div>
                              </div>
                              <span className="popup-metric-num">{user.researchScore ?? 50}%</span>
                            </div>
                            <div className="popup-metric-line">
                              <span>Proximity</span>
                              <div className="popup-mini-bar">
                                <div
                                  className="popup-bar-fill fill-proximity"
                                  style={{ width: `${user.locationScore ?? 50}%` }}
                                ></div>
                              </div>
                              <span className="popup-metric-num">{user.locationScore ?? 50}%</span>
                            </div>
                          </div>

                          {/* Why You Match Section */}
                          <div className="popup-why-match">
                            <span className="popup-why-title">Why You Match:</span>
                            {user.matchReasons && user.matchReasons.length > 0 ? (
                              <div className="popup-reasons-wrap">
                                {user.matchReasons.slice(0, 3).map((r, i) => (
                                  <span key={i} className="popup-reason-chip">
                                    ✓ {r}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="popup-explanation-text">
                                ✓ {user.matchExplanation || 'Your professional and research profiles are semantically related.'}
                              </p>
                            )}
                          </div>

                          <button
                            className="popup-view-btn"
                            onClick={() => {
                              setSelectedProfile(user);
                            }}
                          >
                            View Profile
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Floating Quick Re-center Button */}
              {userLat && userLng && (
                <button
                  className="map-recenter-floating-btn"
                  title="Center on Your Location"
                  onClick={() => {
                    setSelectedMapUser(null);
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  <span>My Location</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Synchronized Nearby Professionals List Below Map */}
      {loading ? (
        <Loading text="Scanning nearby area for discoverable professionals..." />
      ) : locationRequired ? (
        <div className="location-prompt-card">
          <div className="location-prompt-header">
            <h2>Location Access Required</h2>
            <p>
              Please enable your GPS location to discover professionals and researchers nearby on the map.
            </p>
          </div>
          <div className="location-prompt-action">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleDiscoverNearbyClick}
              disabled={locationStatus === 'loading'}
            >
              {locationStatus === 'loading' ? 'Acquiring GPS...' : 'Enable GPS Location'}
            </button>
          </div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="compact-list-section">
          <div className="section-divider-row">
            <h2 className="section-divider-title">
              Nearby Professionals ({filteredUsers.length})
            </h2>
            <span className="section-divider-subtitle">
              Click a profile card to locate on map or view complete details.
            </span>
          </div>

          <div className="nearby-grid">
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className={`synced-card-wrapper ${
                  selectedMapUser?._id === user._id ? 'card-synced-active' : ''
                }`}
                onClick={() => handleCardClick(user)}
              >
                <NearbyUserCard
                  user={user}
                  onViewProfile={(profile) => setSelectedProfile(profile)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon=""
          title="No Professionals Found Nearby"
          description={`No registered professionals are currently discoverable within your selected ${
            radius === 1000 ? '1 km' : `${radius}m`
          } radius.`}
        />
      )}

      {/* Full Profile Modal */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setSelectedProfile(null)}
            >
              ✕
            </button>
            <ProfileCard user={selectedProfile} isOwnProfile={false} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;
