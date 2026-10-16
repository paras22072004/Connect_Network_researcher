import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      return <ActivityIndicator size="small" color={status === 'none' ? '#FFFFFF' : COLORS.primary} />;
    }

    if (status === 'accepted') {
      return (
        <View style={styles.btnInnerRow}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.accent} style={{ marginRight: 4 }} />
          <Text style={styles.textSuccess}>Connected</Text>
        </View>
      );
    }

    if (status === 'pending') {
      return (
        <View style={styles.btnInnerRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.warning} style={{ marginRight: 4 }} />
          <Text style={styles.textWarning}>
            {isSender ? 'Pending' : 'Accept'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.btnInnerRow}>
        <Ionicons name="person-add" size={14} color={COLORS.textWhite} style={{ marginRight: 4 }} />
        <Text style={styles.textPrimary}>Connect</Text>
      </View>
    );
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
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        status === 'accepted'
          ? `Connected with ${targetUser?.name || 'user'}`
          : status === 'pending'
          ? isSender ? 'Pending connection' : 'Accept connection request'
          : `Connect with ${targetUser?.name || 'user'}`
      }
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
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
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
