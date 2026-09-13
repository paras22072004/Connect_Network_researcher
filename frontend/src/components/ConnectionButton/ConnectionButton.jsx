import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest
} from '../../services/connectionService';
import './ConnectionButton.css';

const ConnectionButton = ({
  targetUserId,
  connectionStatus = 'none',
  connectionId = null,
  isSender = false,
  onStatusChange
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(connectionStatus);
  const [connId, setConnId] = useState(connectionId);
  const navigate = useNavigate();

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const res = await sendConnectionRequest(targetUserId);
      if (res.success) {
        setStatus('pending');
        setConnId(res.connection._id);
        if (onStatusChange) onStatusChange('pending', res.connection._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!connId) return;
    setLoading(true);
    try {
      const res = await acceptConnectionRequest(connId);
      if (res.success) {
        setStatus('accepted');
        if (onStatusChange) onStatusChange('accepted', connId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept connection');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!connId) return;
    setLoading(true);
    try {
      const res = await rejectConnectionRequest(connId);
      if (res.success) {
        setStatus('rejected');
        if (onStatusChange) onStatusChange('rejected', connId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject connection');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!connId) return;
    setLoading(true);
    try {
      const res = await cancelConnectionRequest(connId);
      if (res.success) {
        setStatus('none');
        setConnId(null);
        if (onStatusChange) onStatusChange('none', null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'accepted') {
    return (
      <div className="connected-action-group">
        <span className="badge badge-teal">Connected</span>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate(`/messages?user=${targetUserId}`)}
        >
          Message
        </button>
      </div>
    );
  }

  if (status === 'pending') {
    if (isSender) {
      return (
        <button
          className="btn btn-outline btn-pending"
          onClick={handleCancel}
          disabled={loading}
          title="Click to cancel connection request"
        >
          {loading ? 'Processing...' : 'Pending (Cancel)'}
        </button>
      );
    } else {
      return (
        <div className="pending-decision-group">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAccept}
            disabled={loading}
          >
            Accept
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleReject}
            disabled={loading}
          >
            Reject
          </button>
        </div>
      );
    }
  }

  return (
    <button
      className="btn btn-primary"
      onClick={handleSendRequest}
      disabled={loading}
    >
      {loading ? 'Sending...' : 'Connect'}
    </button>
  );
};

export default ConnectionButton;
