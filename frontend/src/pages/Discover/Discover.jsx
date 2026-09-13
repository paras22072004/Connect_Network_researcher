import React, { useState, useEffect } from 'react';
import { useLocation } from '../../context/LocationContext';
import { getNearbyUsers } from '../../services/locationService';
import NearbyUserCard from '../../components/NearbyUserCard/NearbyUserCard';
import ProfileCard from '../../components/ProfileCard/ProfileCard';
import Loading from '../../components/Loading/Loading';
import EmptyState from '../../components/common/EmptyState';
import './Discover.css';

const Discover = () => {
  const { requestAndSaveLocation, locationStatus, locationError } = useLocation();

  const [radius, setRadius] = useState(1000); // Default 1000m (1 km)
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected profile for full details Modal view
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch nearby discoverable professionals from backend
  const fetchNearby = async (selectedRadius = radius) => {
    setLoading(true);
    setError('');
    try {
      const data = await getNearbyUsers(selectedRadius);
      if (data.success) {
        setNearbyUsers(data.users || []);
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

  // Handler for "Discover Nearby" GPS button
  const handleDiscoverNearbyClick = async () => {
    const res = await requestAndSaveLocation();
    if (res.success) {
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

  return (
    <div className="page-container container">
      {/* Header Banner */}
      <div className="discover-header">
        <div>
          <h1 className="discover-title">Discover Nearby Professionals</h1>
          <p className="discover-subtitle">
            Find registered researchers, students, and attendees in your immediate vicinity.
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
          <strong>Privacy Safe Guarantee:</strong> Your exact GPS coordinates are never exposed to other users. Only approximate distance ranges (e.g., <em>Within 500 meters</em>) are displayed.
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
              { label: '1 km', value: 1000 },
              { label: '5 km', value: 5000 }
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

      {/* Discovered Profiles Grid */}
      {loading ? (
        <Loading text="Scanning nearby area for discoverable professionals..." />
      ) : filteredUsers.length > 0 ? (
        <div className="nearby-grid">
          {filteredUsers.map((user) => (
            <NearbyUserCard
              key={user._id}
              user={user}
              onViewProfile={(profile) => setSelectedProfile(profile)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon=""
          title="No Professionals Found Nearby"
          description="No professionals are currently discoverable within your selected radius. Try expanding your radius to 5 km or click 'Enable & Discover Nearby' to update your location."
          actionButton={
            <button className="btn btn-primary" onClick={handleDiscoverNearbyClick}>
              Refresh Location
            </button>
          }
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
