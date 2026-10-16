import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS } from '../theme/theme';
import AvatarPicker from '../components/AvatarPicker';
import CatalogMultiSelect from '../components/CatalogMultiSelect';
import { DEFAULT_AVATAR_ID, AVATAR_OPTIONS } from '../constants/avatars';

const ROLE_OPTIONS = [
  'Student',
  'Software Developer',
  'AI / ML Engineer',
  'AI Researcher',
  'Research Scholar / PhD',
  'Professor / Faculty',
  'Data Scientist',
  'Product Manager',
  'Industry Professional',
  'Other'
];

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();

  // Avatar state
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [profileImage, setProfileImage] = useState(AVATAR_OPTIONS[0].uri);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [organization, setOrganization] = useState('');
  const [skills, setSkills] = useState([]);
  const [researchInterests, setResearchInterests] = useState([]);

  // UI / validation states
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Validate only essential account creation fields (name, email, password >= 6)
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectRole = (item) => {
    setSelectedRole(item);
    setIsRoleModalVisible(false);
    if (item !== 'Other') {
      setCustomRole('');
    }
    setErrors((prev) => ({ ...prev, role: '', customRole: '' }));
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrors((prev) => ({ ...prev, form: '' }));
    setSuccessMsg('');

    // Determine role: optional, fallback to Researcher if not specified
    const finalRole = selectedRole === 'Other'
      ? (customRole.trim() || 'Researcher')
      : (selectedRole.trim() || 'Researcher');

    // Organization is optional, fallback to Independent Researcher if not specified
    const finalOrg = organization.trim() || 'Independent Researcher';

    try {
      const userData = {
        name: name.trim(),
        email: email.trim(),
        password,
        avatarId,
        profileImage,
        role: finalRole,
        organization: finalOrg,
        skills: Array.isArray(skills)
          ? skills
          : (skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : []),
        researchInterests: Array.isArray(researchInterests)
          ? researchInterests
          : (researchInterests ? researchInterests.split(',').map((i) => i.trim()).filter(Boolean) : [])
      };

      const res = await register(userData);
      if (!res.success) {
        setErrors((prev) => ({
          ...prev,
          form: res.message || 'Registration failed. Please try again.'
        }));
      } else {
        setSuccessMsg('Account created successfully! Redirecting...');
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration error. Please check your network connection.';
      setErrors((prev) => ({ ...prev, form: errMsg }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandIconContainer}>
            <Ionicons name="compass" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.brandTitle}>
            <Text style={{ color: COLORS.danger }}>Geo</Text>
            <Text style={{ color: COLORS.primary }}>Connect</Text>
          </Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>AI RESEARCH & PROFESSIONAL PLATFORM</Text>
          </View>
        </View>

        {/* Registration Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Create Professional Account</Text>
          <Text style={styles.subtitle}>
            Join GeoConnect to collaborate, share research, and network with nearby professionals
          </Text>

          {/* Form-level Error Message */}
          {errors.form ? (
            <View style={styles.formErrorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} style={styles.bannerIcon} />
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          ) : null}

          {/* Form-level Success Message */}
          {successMsg ? (
            <View style={styles.formSuccessBox}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={styles.bannerIcon} />
              <Text style={styles.formSuccessText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Profile Avatar Selection (3 Presets) */}
          <AvatarPicker
            selectedAvatarId={avatarId}
            onSelectAvatar={(id, uri) => {
              setAvatarId(id);
              setProfileImage(uri);
            }}
          />

          {/* 1. Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'name' && styles.inputWrapperFocused,
                errors.name && styles.inputWrapperError
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={focusedField === 'name' ? COLORS.primary : COLORS.sage}
                style={styles.leadingIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Paras Kumar"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            {errors.name ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.fieldErrorText}>{errors.name}</Text>
              </View>
            ) : null}
          </View>

          {/* 2. Email Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused,
                errors.email && styles.inputWrapperError
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={focusedField === 'email' ? COLORS.primary : COLORS.sage}
                style={styles.leadingIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="name@university.edu or name@company.com"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
            {errors.email ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.fieldErrorText}>{errors.email}</Text>
              </View>
            ) : null}
          </View>

          {/* 3. Password with Visibility Toggle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password * (Min 6 characters)</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused,
                errors.password && styles.inputWrapperError
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedField === 'password' ? COLORS.primary : COLORS.sage}
                style={styles.leadingIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Choose a secure password"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.trailingIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={COLORS.sage}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.fieldErrorText}>{errors.password}</Text>
              </View>
            ) : null}
          </View>

          {/* 4. Professional Role Dropdown (Optional) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Professional Role</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                styles.dropdownWrapper,
                isRoleModalVisible && styles.inputWrapperFocused,
                errors.role && styles.inputWrapperError
              ]}
              onPress={() => setIsRoleModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="combobox"
              accessibilityLabel="Select professional role"
            >
              <Ionicons
                name="briefcase-outline"
                size={18}
                color={selectedRole ? COLORS.primary : COLORS.sage}
                style={styles.leadingIcon}
              />
              <Text
                style={[
                  styles.dropdownText,
                  !selectedRole && styles.dropdownPlaceholder
                ]}
                numberOfLines={1}
              >
                {selectedRole || 'Select your professional role'}
              </Text>
              <Ionicons
                name={isRoleModalVisible ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.sage}
                style={styles.trailingIcon}
              />
            </TouchableOpacity>
            {errors.role ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.fieldErrorText}>{errors.role}</Text>
              </View>
            ) : null}
          </View>

          {/* Conditional Custom Role Input (if "Other" is chosen) */}
          {selectedRole === 'Other' && (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Custom Professional Role</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'customRole' && styles.inputWrapperFocused,
                  errors.customRole && styles.inputWrapperError
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={focusedField === 'customRole' ? COLORS.primary : COLORS.sage}
                  style={styles.leadingIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Entrepreneur, UX Designer, Consultant"
                  placeholderTextColor={COLORS.textLight}
                  value={customRole}
                  onChangeText={(val) => {
                    setCustomRole(val);
                    if (errors.customRole) setErrors((prev) => ({ ...prev, customRole: '' }));
                  }}
                  onFocus={() => setFocusedField('customRole')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {errors.customRole ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                  <Text style={styles.fieldErrorText}>{errors.customRole}</Text>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Your custom role will be displayed as your primary title.
                </Text>
              )}
            </View>
          )}

          {/* 5. University / Organization (Optional) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>University / Organization</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'organization' && styles.inputWrapperFocused,
                errors.organization && styles.inputWrapperError
              ]}
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={focusedField === 'organization' ? COLORS.primary : COLORS.sage}
                style={styles.leadingIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Stanford University / Google Research"
                placeholderTextColor={COLORS.textLight}
                value={organization}
                onChangeText={(val) => {
                  setOrganization(val);
                  if (errors.organization) setErrors((prev) => ({ ...prev, organization: '' }));
                }}
                onFocus={() => setFocusedField('organization')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            {errors.organization ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.fieldErrorText}>{errors.organization}</Text>
              </View>
            ) : null}
          </View>

          {/* 6. Technical Skills (Standardized Catalog) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Technical Skills</Text>
              <Text style={styles.optionalBadge}>Standardized</Text>
            </View>
            <CatalogMultiSelect
              type="skill"
              selectedValues={skills}
              onValuesChange={setSkills}
              placeholder="Search standardized skills (e.g. Python, PyTorch, React)..."
              helperText="Select canonical skills or suggest new ones for AI matching"
            />
          </View>

          {/* 7. Research Interests (Standardized Catalog) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Research Interests</Text>
              <Text style={styles.optionalBadge}>Standardized</Text>
            </View>
            <CatalogMultiSelect
              type="interest"
              selectedValues={researchInterests}
              onValuesChange={setResearchInterests}
              placeholder="Search research topics (e.g. NLP, Computer Vision, GNN)..."
              helperText="Choose canonical research topics to power AI teammate discovery"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonInner}>
                <ActivityIndicator size="small" color={COLORS.textWhite} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Creating Account...</Text>
              </View>
            ) : (
              <View style={styles.buttonInner}>
                <Ionicons name="person-add-outline" size={18} color={COLORS.textWhite} style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Register Account</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Role Selection Modal */}
      <Modal
        visible={isRoleModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsRoleModalVisible(false)}
        >
          <View
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Select Professional Role</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsRoleModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Choose the title that best represents your role in the GeoConnect network:
            </Text>

            {/* Modal Options List */}
            <ScrollView
              style={styles.modalList}
              contentContainerStyle={{ paddingVertical: 4 }}
              showsVerticalScrollIndicator={true}
            >
              {ROLE_OPTIONS.map((item) => {
                const isSelected = selectedRole === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.modalOptionItem,
                      isSelected && styles.modalOptionItemSelected
                    ]}
                    onPress={() => handleSelectRole(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalOptionContent}>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected
                        ]}
                      >
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextSelected
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-sharp" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 40
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  brandIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D4E5D9'
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  badgeContainer: {
    backgroundColor: COLORS.sageLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D8E2DA'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  bannerIcon: {
    marginRight: 8
  },
  formErrorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500'
  },
  formSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  formSuccessText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600'
  },
  inputGroup: {
    marginBottom: 15
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 6
  },
  optionalBadge: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    minHeight: 46
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5
  },
  inputWrapperError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FEF2F2'
  },
  dropdownWrapper: {
    justifyContent: 'space-between'
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
    fontWeight: '500'
  },
  dropdownPlaceholder: {
    color: COLORS.textLight,
    fontWeight: '400'
  },
  leadingIcon: {
    marginRight: 10
  },
  trailingIcon: {
    padding: 4
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginLeft: 2
  },
  fieldErrorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginLeft: 4,
    fontWeight: '500'
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    marginLeft: 2
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6
  },
  skillChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE3D5'
  },
  skillChipText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '600'
  },
  interestChip: {
    backgroundColor: COLORS.sageLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E0D7'
  },
  interestChipText: {
    fontSize: 11,
    color: COLORS.sage,
    fontWeight: '600'
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...SHADOWS.sm
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: COLORS.textWhite,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 14,
    lineHeight: 16
  },
  modalList: {
    maxHeight: 340
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  modalOptionItemSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: '#C6DDD0'
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  radioOuterSelected: {
    borderColor: COLORS.primary
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.primary
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.textMain,
    fontWeight: '500'
  },
  modalOptionTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '700'
  }
});

export default RegisterScreen;
