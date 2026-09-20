import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from '../../context/LocationContext';
import { getNearbyUsers } from '../../services/locationService';
import NearbyUserCard from '../../components/NearbyUserCard/NearbyUserCard';
import ProfileCard from '../../components/ProfileCard/ProfileCard';
import Loading from '../../components/Loading/Loading';
import EmptyState from '../../components/common/EmptyState';
import './Discover.css';

// Custom Leaflet DivIcons (Sleek & Minimal)
const createYouIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="marker-you-pill">YOU</div>`,
    iconSize: [36, 22],
    iconAnchor: [18, 11]
  });

const createResearcherIcon = (user) => {
  const match = user.matchScore || 50;
  const img = user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="marker-peer-pin">
        <img src="${img}" class="marker-peer-img" alt="${user.name || 'User'}" />
        <span class="marker-peer-badge">${match}%</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38]
  });
};

const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, map]);
  return null;
};

const Discover = () => {
  const { requestAndSaveLocation, locationStatus, locationError, coordinates, autoRequestLocationIfPossible } = useLocation();

  const [radius, setRadius] = useState(1000); // Default 1000m (1 km)
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationRequired, setLocationRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected profile for full details Modal view
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch nearby discoverable professionals from backend
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
      setError(err.response?.data?.message || 'Could not fetch nearby users. Make sure location is updated.');
    } finally {
      setLoading(false);
    }
  };

  // Attempt auto-fetching / auto-location prompt on initial page visit
  useEffect(() => {
    const initDiscover = async () => {
      if (autoRequestLocationIfPossible) {
        await autoRequestLocationIfPossible();
      }
      fetchNearby(radius);
    };
    initDiscover();
  }, []);

  // Handler for "Enable GPS Location" button
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
    fetchNearby(newRadius);
  };

  // Filter nearby users based on search query
  const filteredUsers = nearbyUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(query);
    const roleMatch = u.role?.toLowerCase().includes(query);
    const orgMatch = u.organization?.toLowerCase().includes(query);
    const skillMatch = u.skills?.some(s => s.toLowerCase().includes(query));
    const interestMatch = u.researchInterests?.some(i => i.toLowerCase().includes(query));
    return nameMatch || roleMatch || orgMatch || skillMatch || interestMatch;
  });

  // Calculate Map Center Position
  const userLat = coordinates?.latitude;
  const userLng = coordinates?.longitude;
  const defaultCenter = [28.6139, 77.2090]; // Default New Delhi fallback coordinates
  const mapCenter = userLat && userLng ? [userLat, userLng] : (
    filteredUsers.length > 0 && filteredUsers[0].mapPosition
      ? [filteredUsers[0].mapPosition.latitude, filteredUsers[0].mapPosition.longitude]
      : defaultCenter
  );

  return (
    <div className="page-container container">
      {/* Header Banner */}
      <div className="discover-header">
        <div>
          <h1 className="discover-title">Discover Nearby Professionals</h1>
          <p className="discover-subtitle">
            Find registered researchers, students, and attendees in your immediate vicinity on an interactive map.
          </p>
        </div>

        <button
          className="btn btn-primary btn-discover-gps"
          onClick={handleDiscoverNearbyClick}
          disabled={locationStatus === 'loading'}
        >
          {locationStatus === 'loading' ? 'Acquiring GPS...' : 'Enable & Discover Nearby'}
        </button>
      </div>

      {/* Location Privacy Guarantee Banner */}
      <div className="privacy-info-box">
        <div className="privacy-text">
          <strong>Privacy Safe Guarantee:</strong> Your exact GPS coordinates are never exposed to other users. Map positions and distance labels use privacy-safe approximate offsets (e.g., <em>Within 500 meters</em>).
        </div>
      </div>

      {locationError && <div className="form-error">{locationError}</div>}
      {error && <div className="form-error">{error}</div>}

      {/* Controls Bar: Radius Selector + Search Filter */}
      <div className="controls-bar">
        <div className="radius-selector-group">
          <span className="control-label">Discovery Radius:</span>
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
            placeholder="Filter by skill, interest, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Main Interactive Map Section (Minimal LinkedIn Style) */}
      {!locationRequired && (
        <div className="discover-map-wrapper">
          <div className="discover-map-bar">
            <span className="map-bar-title">Proximity Visualization Map ({filteredUsers.length} Nearby)</span>
            <div className="map-legend">
              <span className="legend-item"><span className="legend-dot you-dot"></span> You</span>
              <span className="legend-item"><span className="legend-dot peer-dot"></span> Professionals</span>
            </div>
          </div>

          <div className="discover-map-frame">
            <MapContainer center={mapCenter} zoom={14} className="discover-map" scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <RecenterMap center={mapCenter} zoom={14} />

              {/* Logged-in User Marker */}
              {userLat && userLng && (
                <Marker position={[userLat, userLng]} icon={createYouIcon()}>
                  <Popup>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <strong>Your Current Location</strong>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Nearby Researchers Markers */}
              {filteredUsers.map((u) => {
                if (!u.mapPosition || !u.mapPosition.latitude || !u.mapPosition.longitude) return null;
                return (
                  <Marker
                    key={u._id}
                    position={[u.mapPosition.latitude, u.mapPosition.longitude]}
                    icon={createResearcherIcon(u)}
                  >
                    <Popup>
                      <div className="map-popup-card">
                        <div className="map-popup-header">
                          <img
                            src={u.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                            alt={u.name}
                            className="map-popup-avatar"
                          />
                          <div>
                            <h4 className="map-popup-name">{u.name}</h4>
                            <p className="map-popup-role">{u.role}</p>
                          </div>
                        </div>
                        <div className="map-popup-meta">
                          <div className="map-popup-badge">🎯 {u.matchScore}% Match Score</div>
                          <div className="map-popup-dist">📍 {u.approximateDistance}</div>
                        </div>
                        <button
                          className="btn btn-primary btn-sm map-popup-btn"
                          onClick={() => setSelectedProfile(u)}
                        >
                          View Profile
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Discovered Profiles Grid OR Location Required Prompt */}
      {loading ? (
        <Loading text="Scanning nearby area for discoverable professionals..." />
      ) : locationRequired ? (
        <div className="location-prompt-card">
          <div className="location-prompt-header">
            <h2>Location Access Required</h2>
            <p>Please enable your GPS location to discover professionals and researchers nearby on the map.</p>
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
        <div>
          <h2 className="section-divider-title">Nearby Professionals List</h2>
          <div className="nearby-grid">
            {filteredUsers.map((user) => (
              <NearbyUserCard
                key={user._id}
                user={user}
                onViewProfile={(profile) => setSelectedProfile(profile)}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon=""
          title="No Professionals Found Nearby"
          description="No registered professionals are currently discoverable within your selected 1 km radius area."
        />
      )}

      {/* Full Profile Modal */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedProfile(null)}>
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
