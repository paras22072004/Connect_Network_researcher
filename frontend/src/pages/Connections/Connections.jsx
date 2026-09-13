import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAcceptedConnections,
  getConnectionRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest
} from '../../services/connectionService';
import ProfileCard from '../../components/ProfileCard/ProfileCard';
import Loading from '../../components/Loading/Loading';
import EmptyState from '../../components/common/EmptyState';
import './Connections.css';

const Connections = () => {
  const [activeTab, setActiveTab] = useState('accepted'); // accepted | pending | sent
  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected profile for full details Modal view
  const [selectedProfile, setSelectedProfile] = useState(null);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [connData, reqData] = await Promise.all([
        getAcceptedConnections(),
        getConnectionRequests()
      ]);

      if (connData.success) {
        setConnections(connData.connections || []);
      }
      if (reqData.success) {
        setIncomingRequests(reqData.incoming || []);
        setOutgoingRequests(reqData.outgoing || []);
      }
    } catch (err) {
      console.error('Error loading connections data:', err);
      setError(err.response?.data?.message || 'Failed to load connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (connId) => {
    try {
      const res = await acceptConnectionRequest(connId);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept connection');
    }
  };

  const handleReject = async (connId) => {
    try {
      const res = await rejectConnectionRequest(connId);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject connection');
    }
  };

  const handleCancelSent = async (connId) => {
    try {
      const res = await cancelConnectionRequest(connId);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="page-container container">
      <div className="connections-header">
        <h1>Professional Connections</h1>
        <p>Manage your accepted network contacts and pending invitation requests.</p>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Tabs Bar */}
      <div className="connections-tabs">
        <button
          className={`tab-btn ${activeTab === 'accepted' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          My Connections ({connections.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Incoming Requests ({incomingRequests.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'sent' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent Requests ({outgoingRequests.length})
        </button>
      </div>

      {/* Content Rendering based on Active Tab */}
      {loading ? (
        <Loading text="Fetching connections list..." />
      ) : (
        <div className="tab-content">
          {activeTab === 'accepted' && (
            connections.length > 0 ? (
              <div className="connection-cards-grid">
                {connections.map((item) => (
                  <div key={item.connectionId} className="connection-card">
                    <div
                      className="card-person-info clickable-person"
                      onClick={() => setSelectedProfile(item.user)}
                      title="Click to view full profile"
                    >
                      <img
                        src={item.user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={item.user.name}
                        className="connection-avatar"
                      />
                      <div>
                        <h3>{item.user.name}</h3>
                        <p className="person-role">{item.user.role}</p>
                        <p className="person-org">{item.user.organization}</p>
                      </div>
                    </div>
                    <div className="connection-card-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedProfile(item.user)}
                      >
                        View Profile
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/messages?user=${item.user._id}`)}
                      >
                        Start Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon=""
                title="No Connections Yet"
                description="You have not connected with any professionals yet. Go to the Discover page to find people nearby."
                actionButton={
                  <button className="btn btn-primary" onClick={() => navigate('/discover')}>
                    Discover People
                  </button>
                }
              />
            )
          )}

          {activeTab === 'pending' && (
            incomingRequests.length > 0 ? (
              <div className="connection-cards-grid">
                {incomingRequests.map((item) => (
                  <div key={item.connectionId} className="connection-card">
                    <div
                      className="card-person-info clickable-person"
                      onClick={() => setSelectedProfile(item.user)}
                      title="Click to view full profile"
                    >
                      <img
                        src={item.user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={item.user.name}
                        className="connection-avatar"
                      />
                      <div>
                        <h3>{item.user.name}</h3>
                        <p className="person-role">{item.user.role}</p>
                        <p className="person-org">{item.user.organization}</p>
                      </div>
                    </div>
                    <div className="connection-card-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedProfile(item.user)}
                      >
                        Profile
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAccept(item.connectionId)}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleReject(item.connectionId)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon=""
                title="No Pending Incoming Requests"
                description="You currently have no incoming connection invitations."
              />
            )
          )}

          {activeTab === 'sent' && (
            outgoingRequests.length > 0 ? (
              <div className="connection-cards-grid">
                {outgoingRequests.map((item) => (
                  <div key={item.connectionId} className="connection-card">
                    <div
                      className="card-person-info clickable-person"
                      onClick={() => setSelectedProfile(item.user)}
                      title="Click to view full profile"
                    >
                      <img
                        src={item.user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={item.user.name}
                        className="connection-avatar"
                      />
                      <div>
                        <h3>{item.user.name}</h3>
                        <p className="person-role">{item.user.role}</p>
                        <p className="person-org">{item.user.organization}</p>
                      </div>
                    </div>
                    <div className="connection-card-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedProfile(item.user)}
                      >
                        Profile
                      </button>
                      <button
                        className="btn btn-outline btn-sm btn-danger-outline"
                        onClick={() => handleCancelSent(item.connectionId)}
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon=""
                title="No Sent Requests"
                description="You have no pending outgoing connection requests."
              />
            )
          )}
        </div>
      )}

      {/* Full Profile Modal View */}
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

export default Connections;
