import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { updateUserProfile } from '../../services/userService';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { locationStatus, requestAndSaveLocation } = useLocation();

  const [discoverable, setDiscoverable] = useState(user?.discoverable ?? true);
  const [preferredRadius, setPreferredRadius] = useState(user?.preferredRadius || 1000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleToggleDiscoverable = async () => {
    const newValue = !discoverable;
    setDiscoverable(newValue);
    await savePrivacySettings(newValue, preferredRadius);
  };

  const handleRadiusSelect = async (newRadius) => {
    setPreferredRadius(newRadius);
    await savePrivacySettings(discoverable, newRadius);
  };

  const savePrivacySettings = async (isDiscoverable, radiusValue) => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await updateUserProfile({
        discoverable: isDiscoverable,
        preferredRadius: radiusValue
      });
      if (res.success) {
        updateUser(res.user);
        setMessage({ type: 'success', text: 'Privacy & Discovery settings updated!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container container">
      <div className="settings-header">
        <h1>Account & Privacy Settings</h1>
        <p>Manage your location discoverability, preferred search radius, and privacy preferences.</p>
      </div>

      {message.text && (
        <div className={message.type === 'success' ? 'form-success' : 'form-error'}>
          {message.text}
        </div>
      )}

      <div className="settings-grid">
        {/* Card 1: Discovery & Privacy Controls */}
        <div className="settings-card">
          <h3>Geolocation Privacy & Discoverability</h3>
          
          <div className="setting-item">
            <div>
              <h4>Discoverable Nearby Mode</h4>
              <p>When enabled, other registered professionals within your selected radius can discover your profile card.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={discoverable}
                onChange={handleToggleDiscoverable}
                disabled={saving}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="setting-item">
            <div>
              <h4>Default Discovery Radius</h4>
              <p>Set your default scanning distance when opening the Discover page.</p>
            </div>
            <div className="radius-btn-group">
              {[
                { label: '100 meters', val: 100 },
                { label: '500 meters', val: 500 },
                { label: '1 km', val: 1000 },
                { label: '5 km', val: 5000 }
              ].map((r) => (
                <button
                  key={r.val}
                  className={`btn btn-sm ${preferredRadius === r.val ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRadiusSelect(r.val)}
                  disabled={saving}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: GPS Status & Permission Info */}
        <div className="settings-card">
          <h3>Browser Location Permission Status</h3>
          <div className="location-info-row">
            <span>Current Status:</span>
            <span className="badge badge-primary">
              {locationStatus === 'active' ? 'GPS Active' : 'Permission Idle'}
            </span>
          </div>
          <p className="setting-desc">
            The platform requests your location via the HTML5 Browser Geolocation API when you click <em>Discover Nearby</em>. You can grant or revoke location access at any time in your browser address bar.
          </p>

          <button className="btn btn-outline mt-2" onClick={requestAndSaveLocation}>
            Re-Sync GPS Coordinates
          </button>
        </div>

        {/* Card 3: Privacy & Security Guarantee */}
        <div className="settings-card full-width-settings">
          <h3>Privacy Architecture Overview</h3>
          <div className="privacy-features-list">
            <div className="privacy-feature-item">
              <div>
                <strong>Zero Coordinate Exposure:</strong>
                <p>Your exact latitude and longitude are stored securely in MongoDB as a GeoJSON Point object for spatial calculations, but are NEVER returned in API responses to other users.</p>
              </div>
            </div>

            <div className="privacy-feature-item">
              <div>
                <strong>Approximate Distance Labels:</strong>
                <p>Other users only see privacy-safe labels such as <em>"Less than 100 meters away"</em> or <em>"Within 500 meters"</em>.</p>
              </div>
            </div>

            <div className="privacy-feature-item">
              <div>
                <strong>Connection-Gated Messaging:</strong>
                <p>Real-time chat is restricted strictly to users who have sent and accepted a mutual connection request.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
