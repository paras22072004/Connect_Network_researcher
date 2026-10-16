import React, { useState } from 'react';
import ConnectionButton from '../ConnectionButton/ConnectionButton';
import './NearbyUserCard.css';

const NearbyUserCard = ({ user, onViewProfile }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const matchScore = user.matchScore ?? 50;
  const semanticScore = user.semanticScore ?? user.matchScore ?? 50;
  const skillScore = user.skillScore ?? 50;
  const researchScore = user.researchScore ?? 50;
  const locationScore = user.locationScore ?? 50;

  const matchReasons = Array.isArray(user.matchReasons) ? user.matchReasons : [];
  const matchExplanation = user.matchExplanation || 'Your professional and research profiles are semantically related.';

  return (
    <div className="nearby-user-card">
      <div className="card-top-header">
        <span className="distance-badge">
          📍 {user.approximateDistance || 'Nearby'}
        </span>
        {user.matchScore !== undefined && (
          <button
            className="match-badge-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowBreakdown(!showBreakdown);
            }}
            title="Click to view AI match breakdown"
          >
            <span className="ai-spark-icon">✨</span>
            <span className="match-score-text">{matchScore}% Match</span>
            <span className="breakdown-toggle-indicator">{showBreakdown ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      <div className="card-profile-header">
        <img
          src={user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
          alt={user.name}
          className="user-card-avatar"
        />
        <div className="user-info">
          <h3 className="user-name">{user.name}</h3>
          <p className="user-role">{user.role}</p>
          <p className="user-org">{user.organization}</p>
        </div>
      </div>

      <p className="user-bio">{user.bio || 'No bio provided yet.'}</p>

      {/* AI Match Breakdown & Why You Match Section */}
      <div className="ai-match-container">
        <div className="why-match-section">
          <span className="why-match-title">Why You Match</span>
          {matchReasons.length > 0 ? (
            <div className="match-reasons-list">
              {matchReasons.slice(0, 4).map((reason, idx) => (
                <span key={idx} className="match-reason-chip">
                  <span className="check-icon">✓</span> {reason}
                </span>
              ))}
            </div>
          ) : (
            <p className="semantic-explanation-text">
              <span className="check-icon">✓</span> {matchExplanation}
            </p>
          )}
        </div>

        {/* Detailed AI Compatibility Breakdown (expandable or default visible) */}
        {showBreakdown && (
          <div className="ai-breakdown-details animate-fade-in">
            <div className="breakdown-heading">AI Match Breakdown</div>
            <div className="breakdown-metric-row">
              <span className="metric-label">Semantic Compatibility</span>
              <div className="metric-bar-wrap">
                <div className="metric-bar-fill fill-semantic" style={{ width: `${semanticScore}%` }}></div>
              </div>
              <span className="metric-value">{semanticScore}%</span>
            </div>
            <div className="breakdown-metric-row">
              <span className="metric-label">Skills</span>
              <div className="metric-bar-wrap">
                <div className="metric-bar-fill fill-skill" style={{ width: `${skillScore}%` }}></div>
              </div>
              <span className="metric-value">{skillScore}%</span>
            </div>
            <div className="breakdown-metric-row">
              <span className="metric-label">Research</span>
              <div className="metric-bar-wrap">
                <div className="metric-bar-fill fill-research" style={{ width: `${researchScore}%` }}></div>
              </div>
              <span className="metric-value">{researchScore}%</span>
            </div>
            <div className="breakdown-metric-row">
              <span className="metric-label">Proximity</span>
              <div className="metric-bar-wrap">
                <div className="metric-bar-fill fill-proximity" style={{ width: `${locationScore}%` }}></div>
              </div>
              <span className="metric-value">{locationScore}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Research Interests Showcase */}
      {user.researchInterests && user.researchInterests.length > 0 && (
        <div className="card-section">
          <span className="section-label">Research Interests:</span>
          <div className="tag-container">
            {user.researchInterests.slice(0, 3).map((interest, idx) => (
              <span key={idx} className="badge badge-primary">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Skills Showcase */}
      {user.skills && user.skills.length > 0 && (
        <div className="card-section">
          <span className="section-label">Top Skills:</span>
          <div className="tag-container">
            {user.skills.slice(0, 4).map((skill, idx) => (
              <span key={idx} className="badge badge-gray">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card-actions">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onViewProfile(user)}
        >
          View Profile
        </button>
        <ConnectionButton
          targetUserId={user._id}
          connectionStatus={user.connectionStatus}
          connectionId={user.connectionId}
          isSender={user.isSender}
        />
      </div>
    </div>
  );
};

export default NearbyUserCard;
