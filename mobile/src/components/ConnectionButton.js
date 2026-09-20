import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  cancelConnectionRequest
} from '../services/connectionService';
import { COLORS } from '../theme/theme';

const ConnectionButton = ({
  targetUser,
  initialStatus = 'none',
  initialConnectionId = null,
  isSender = false,
  onStatusChange,
  onOpenMessage
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading || !targetUser?._id) return;

    if (status === 'accepted') {
      if (onOpenMessage) onOpenMessage(targetUser);
      return;
    }

    setLoading(true);
    try {
      if (status === 'none') {
        const res = await sendConnectionRequest(targetUser._id);
        if (res.success && res.connection) {
          setStatus('pending');
          setConnectionId(res.connection._id);
          if (onStatusChange) onStatusChange('pending', res.connection._id);
        }
      } else if (status === 'pending') {
        if (!isSender && connectionId) {
          // Accept request if target user sent it to us
          const res = await acceptConnectionRequest(connectionId);
          if (res.success) {
            setStatus('accepted');
            if (onStatusChange) onStatusChange('accepted', connectionId);
          }
        } else if (connectionId) {
          // Cancel outgoing request
          const res = await cancelConnectionRequest(connectionId);
          if (res.success) {
            setStatus('none');
            setConnectionId(null);
            if (onStatusChange) onStatusChange('none', null);
          }
        }
      }
    } catch (err) {
      console.error('Connection action error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={COLORS.primary} />;
    }

    if (status === 'accepted') {
      return <Text style={styles.textSuccess}>Connected ✓</Text>;
    }

    if (status === 'pending') {
      return (
        <Text style={styles.textWarning}>
          {isSender ? 'Pending (Cancel)' : 'Accept Request'}
        </Text>
      );
    }

    return <Text style={styles.textPrimary}>Connect +</Text>;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        status === 'accepted' && styles.btnSuccess,
        status === 'pending' && styles.btnWarning,
        status === 'none' && styles.btnPrimary
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  btnWarning: {
    backgroundColor: COLORS.bgMain,
    borderColor: COLORS.warning
  },
  btnSuccess: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.accent
  },
  textPrimary: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '700'
  },
  textWarning: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '700'
  },
  textSuccess: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700'
  }
});

export default ConnectionButton;
