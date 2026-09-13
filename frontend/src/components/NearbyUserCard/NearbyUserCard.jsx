import React from 'react';
import ConnectionButton from '../ConnectionButton/ConnectionButton';
import './NearbyUserCard.css';

const NearbyUserCard = ({ user, onViewProfile }) => {
  return (
    <div className="nearby-user-card">
      <div className="card-top-header">
        <span className="distance-badge">
          {user.approximateDistance || 'Nearby'}
        </span>
        {user.matchScore !== undefined && (
          <span className="match-badge">
            {user.matchScore}% Match
          </span>
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
