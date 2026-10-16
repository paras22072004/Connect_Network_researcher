import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { updateUserProfile } from '../services/userService';
import { API_BASE_URL } from '../services/api';
import { COLORS, SHADOWS } from '../theme/theme';

const SettingsScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const { preferredRadius, changePreferredRadius } = useLocation();

  const [discoverable, setDiscoverable] = useState(user?.discoverable ?? true);
  const [updating, setUpdating] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleToggleDiscoverable = async (value) => {
    setDiscoverable(value);
    setUpdating(true);
    try {
      const res = await updateUserProfile({ discoverable: value });
      if (res.success && res.user) {
        updateUser(res.user);
      }
    } catch (err) {
      console.error('Error updating discoverable setting:', err);
      setDiscoverable(!value);
      Alert.alert('Error', 'Failed to update discoverability setting.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectRadius = async (radius) => {
    await changePreferredRadius(radius);
    try {
      const res = await updateUserProfile({ preferredRadius: radius });
      if (res.success && res.user) {
        updateUser(res.user);
      }
    } catch (err) {
      console.error('Error updating radius setting:', err);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Location Privacy Settings */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary || '#007AFF'} style={styles.cardHeaderIcon} />
          <Text style={styles.cardTitle}>Privacy & Discovery</Text>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Discoverable Nearby</Text>
            <Text style={styles.settingSubtext}>
              Allow researchers within your radius to see your profile card and approximate location marker.
            </Text>
          </View>
          <Switch
            value={discoverable}
            onValueChange={handleToggleDiscoverable}
            trackColor={{ false: COLORS.border || '#E5E5EA', true: COLORS.primary || '#007AFF' }}
            thumbColor="#FFFFFF"
            disabled={updating}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.settingLabel}>Default Discovery Radius</Text>
        <Text style={styles.settingSubtext}>
          Choose your primary discovery boundary (capped at 1km as per privacy protocol).
        </Text>

        <View style={styles.radiusPills}>
          {[100, 500, 1000].map((r) => {
            const isSelected = preferredRadius === r;
            const label = r < 1000 ? `${r}m` : '1km';
            return (
              <TouchableOpacity
                key={r}
                style={[styles.radiusPill, isSelected && styles.radiusPillActive]}
                onPress={() => handleSelectRadius(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.radiusPillText, isSelected && styles.radiusPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Privacy Architecture Notice */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary || '#007AFF'} style={styles.cardHeaderIcon} />
          <Text style={styles.cardTitle}>Privacy Architecture</Text>
        </View>

        <Text style={styles.infoParagraph}>
          GeoConnect uses a strict privacy-preserving location pipeline:
        </Text>

        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={15} color={COLORS.primary || '#007AFF'} style={styles.bulletIcon} />
          <Text style={styles.bulletText}>
            Raw GPS coordinates are never sent directly to other users.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={15} color={COLORS.primary || '#007AFF'} style={styles.bulletIcon} />
          <Text style={styles.bulletText}>
            Coordinates are stored on server in MongoDB 2dsphere index with random offset jitter before sending map pin positions.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={15} color={COLORS.primary || '#007AFF'} style={styles.bulletIcon} />
          <Text style={styles.bulletText}>
            Distances are rounded to approximate tiers ("Within 500 meters") using the Haversine distance formula.
          </Text>
        </View>
      </View>

      {/* 3. Backend & Application Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary || '#007AFF'} style={styles.cardHeaderIcon} />
          <Text style={styles.cardTitle}>App Details</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Name</Text>
          <Text style={styles.infoVal}>GeoConnect Mobile</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoVal}>1.0.0 (Expo SDK 51)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API Endpoint</Text>
          <Text style={styles.infoVal} numberOfLines={1}>{API_BASE_URL}</Text>
        </View>
      </View>

      {/* 4. Account / Logout Action */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={18} color={COLORS.primary || '#007AFF'} style={styles.cardHeaderIcon} />
          <Text style={styles.cardTitle}>Session Management</Text>
        </View>

        <Text style={styles.settingSubtext}>Logged in as {user?.email}</Text>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout of GeoConnect"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger || '#FF3B30'} style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>Logout of GeoConnect</Text>
        </TouchableOpacity>
      </View>

      {/* Cross-Platform Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out-outline" size={26} color={COLORS.danger || '#FF3B30'} />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out of GeoConnect? You will need to log back in to access your connections, messages, and workspaces.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.modalLogoutText}>Yes, Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain || '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: COLORS.border || 'rgba(0,0,0,0.06)',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
  },
  settingSubtext: {
    fontSize: 12,
    color: COLORS.textMuted || '#8E8E93',
    marginTop: 3,
    lineHeight: 17,
  },
  divider: {
    height: 0.5,
    backgroundColor: COLORS.border || 'rgba(0,0,0,0.08)',
    marginVertical: 14,
  },
  radiusPills: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  radiusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    alignItems: 'center',
  },
  radiusPillActive: {
    backgroundColor: COLORS.primary || '#007AFF',
  },
  radiusPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.secondary || '#3C3C43',
  },
  radiusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoParagraph: {
    fontSize: 13,
    color: COLORS.secondary || '#3C3C43',
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 6,
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 13,
    color: COLORS.secondary || '#3C3C43',
    flex: 1,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border || 'rgba(0,0,0,0.06)',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    color: COLORS.textMain || '#1C1C1E',
    fontWeight: '600',
    maxWidth: '60%',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  logoutBtnText: {
    color: COLORS.danger || '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,59,48,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: COLORS.textMuted || '#8E8E93',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: COLORS.bgInput || '#F2F2F7',
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textMain || '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
  modalLogoutBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: COLORS.danger || '#FF3B30',
    alignItems: 'center',
  },
  modalLogoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;