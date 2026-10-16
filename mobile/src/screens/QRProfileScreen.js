import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../services/userService';
import ProfileModalView from '../components/ProfileModalView';
import { COLORS, SHADOWS } from '../theme/theme';

const QRProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('myqr'); // 'myqr' | 'scan'
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loadingQr, setLoadingQr] = useState(true);

  // Manual code entry / scan state
  const [inputCode, setInputCode] = useState('');
  const [inspectingUser, setInspectingUser] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (user?._id) {
      generateUserQr();
    }
  }, [user?._id]);

  const generateUserQr = async () => {
    setLoadingQr(true);
    try {
      // Privacy-safe QR payload: only contains public scheme and user ID (no tokens or passwords)
      const payload = JSON.stringify({
        type: 'geoconnect_profile',
        id: user._id,
        name: user.name,
        role: user.role
      });

      const url = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#24563B',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Connect with ${user?.name} (${user?.role}) on GeoConnect! Profile ID: ${user?._id}`,
        title: 'GeoConnect Professional Profile'
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  const handleInspectCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Required', 'Please enter or paste a GeoConnect Profile ID or QR Code payload.');
      return;
    }

    setResolving(true);
    try {
      let targetId = inputCode.trim();

      // Parse JSON if user pasted the raw QR payload
      if (targetId.startsWith('{')) {
        try {
          const parsed = JSON.parse(targetId);
          if (parsed.id) targetId = parsed.id;
        } catch (e) {
          // ignore
        }
      }

      // If user pasted a geoconnect://profile/<id> URI
      if (targetId.includes('profile/')) {
        targetId = targetId.split('profile/')[1].split('/')[0];
      }

      const res = await getUserById(targetId);
      if (res.success && res.user) {
        setInspectingUser(res.user);
      } else {
        Alert.alert('Not Found', 'No researcher found matching this profile ID.');
      }
    } catch (err) {
      console.error('Inspect error:', err);
      Alert.alert('Lookup Failed', 'Could not retrieve profile. Please check the ID.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'myqr' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('myqr')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="My QR Code tab"
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="qr-code-outline"
              size={16}
              color={activeTab === 'myqr' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'myqr' ? styles.tabBtnTextActive : null]}>
              My QR Code
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'scan' ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab('scan')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Connect with Code tab"
        >
          <View style={styles.tabBtnContent}>
            <Ionicons
              name="search-outline"
              size={16}
              color={activeTab === 'scan' ? COLORS.primary : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'scan' ? styles.tabBtnTextActive : null]}>
              Connect with Code
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'myqr' ? (
        <View style={styles.qrCard}>
          {/* User Bio Header */}
          <Image
            source={{
              uri:
                user?.profileImage ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
            }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{user?.role} • {user?.organization}</Text>

          {/* QR Code Container */}
          <View style={styles.qrWrapper}>
            {loadingQr ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 60 }} />
            ) : qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
            ) : (
              <Text style={styles.errorText}>Could not render QR code.</Text>
            )}
          </View>

          <Text style={styles.instruction}>
            Conference attendees & researchers can scan this code to instantly view your verified research portfolio.
          </Text>

          {/* Profile ID Box */}
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>YOUR PROFILE ID:</Text>
            <Text style={styles.codeValue} selectable>{user?._id}</Text>
          </View>

          <TouchableOpacity
            style={styles.btnShare}
            onPress={handleShareProfile}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Share Profile Link or ID"
          >
            <View style={styles.btnContentRow}>
              <Ionicons name="share-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnShareText}>Share Profile Link / ID</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        /* Connect with Code Tab */
        <View style={styles.qrCard}>
          <Text style={styles.cardHeading}>Enter Researcher Profile Code</Text>
          <Text style={styles.cardSub}>
            Paste a colleague's GeoConnect profile code or QR text to preview their publications, verify credentials, and connect.
          </Text>

          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="Paste User ID (e.g. 6aa636964209412f18dd2945)"
            placeholderTextColor={COLORS.textLight}
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.btnInspect}
            onPress={handleInspectCode}
            disabled={resolving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Inspect Researcher Profile"
          >
            {resolving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                <Ionicons name="scan-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnInspectText}>Inspect Researcher Profile</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.tipBox}>
            <View style={styles.tipTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.tipTitle}>Privacy & Security Guarantee</Text>
            </View>
            <Text style={styles.tipText}>
              All profile lookups respect user discoverability settings and never expose raw coordinates, credentials, or private vector embeddings.
            </Text>
          </View>
        </View>
      )}

      {/* Inspected Profile Modal */}
      {inspectingUser ? (
        <ProfileModalView
          user={inspectingUser}
          visible={Boolean(inspectingUser)}
          onClose={() => setInspectingUser(null)}
          onConnectSuccess={() => {
            Alert.alert('Connected', 'Connection request sent successfully!');
          }}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  content: {
    padding: 14,
    paddingBottom: 40
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  qrCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 8
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain
  },
  userRole: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 16
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    marginBottom: 16
  },
  qrImage: {
    width: 220,
    height: 220
  },
  errorText: {
    color: COLORS.danger,
    padding: 20
  },
  instruction: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
    marginBottom: 14
  },
  codeBox: {
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 14,
    width: '100%'
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: 2
  },
  codeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  btnShare: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 11,
    width: '100%',
    alignItems: 'center'
  },
  btnShareText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    alignSelf: 'flex-start',
    marginBottom: 4
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    alignSelf: 'flex-start',
    marginBottom: 16
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    marginBottom: 14
  },
  codeInput: {
    fontFamily: 'System'
  },
  tabBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnInspect: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center'
  },
  btnInspectText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  tipBox: {
    backgroundColor: '#F4F7F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 18,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    width: '100%'
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  tipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16
  }
});

export default QRProfileScreen;
