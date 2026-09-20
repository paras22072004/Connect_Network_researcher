import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
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
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of GeoConnect?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Location Privacy Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Privacy & Discovery</Text>

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
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={discoverable ? COLORS.primary : COLORS.textMuted}
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
              >
                <Text style={[styles.radiusPillText, isSelected && styles.radiusPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Privacy Architecture Notice */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛡️ Privacy Architecture</Text>
        <Text style={styles.infoParagraph}>
          GeoConnect uses a strict privacy-preserving location pipeline:
        </Text>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletPoint}>• </Text>
          <Text style={styles.bulletText}>
            Raw GPS coordinates are never sent directly to other users.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletPoint}>• </Text>
          <Text style={styles.bulletText}>
            Coordinates are stored on server in MongoDB 2dsphere index with random offset jitter before sending map pin positions.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletPoint}>• </Text>
          <Text style={styles.bulletText}>
            Distances are rounded to approximate tiers ("Within 500 meters") using the Haversine distance formula.
          </Text>
        </View>
      </View>

      {/* Backend & Application Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ App Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Name:</Text>
          <Text style={styles.infoVal}>GeoConnect Mobile</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version:</Text>
          <Text style={styles.infoVal}>1.0.0 (Expo SDK 51)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API Endpoint:</Text>
          <Text style={styles.infoVal}>{API_BASE_URL}</Text>
        </View>
      </View>

      {/* Account / Logout Action */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Session Management</Text>
        <Text style={styles.settingSubtext}>Logged in as {user?.email}</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout of GeoConnect</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  content: {
    padding: 16,
    paddingBottom: 36
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 14
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain
  },
  settingSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 16
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14
  },
  radiusPills: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  radiusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  radiusPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  radiusPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary
  },
  radiusPillTextActive: {
    color: COLORS.textWhite
  },
  infoParagraph: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 10
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 10
  },
  bulletPoint: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700'
  },
  bulletText: {
    fontSize: 13,
    color: COLORS.secondary,
    flex: 1,
    lineHeight: 18
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgInput
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  infoVal: {
    fontSize: 13,
    color: COLORS.textMain,
    fontWeight: '600'
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700'
  }
});

export default SettingsScreen;
