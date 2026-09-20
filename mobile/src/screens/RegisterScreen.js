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
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AI Researcher');
  const [organization, setOrganization] = useState('');
  const [skills, setSkills] = useState('');
  const [researchInterests, setResearchInterests] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !role.trim() || !organization.trim()) {
      setError('Please fill in all required fields (*)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = {
        name: name.trim(),
        email: email.trim(),
        password,
        role: role.trim(),
        organization: organization.trim(),
        skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        researchInterests: researchInterests ? researchInterests.split(',').map((i) => i.trim()).filter(Boolean) : []
      };

      const res = await register(userData);
      if (!res.success) {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError('Registration error. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Professional Account</Text>
          <Text style={styles.subtitle}>Join GeoConnect research & professional network</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Paras Kumar"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="name@university.edu"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password * (Min 6 chars)</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Professional Role *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AI Researcher, Student"
              value={role}
              onChangeText={setRole}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>University / Organization *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. VIPS-TC / GGSIPU"
              value={organization}
              onChangeText={setOrganization}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Technical Skills (Comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Python, ML, React, Node"
              value={skills}
              onChangeText={setSkills}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Research Interests (Comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NLP, Computer Vision, Cloud"
              value={researchInterests}
              onChangeText={setResearchInterests}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <Text style={styles.buttonText}>Register Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  scrollContent: {
    padding: 20,
    paddingVertical: 30
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  errorText: {
    backgroundColor: '#fef2f2',
    color: COLORS.danger,
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fca5a5'
  },
  inputGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: COLORS.textWhite,
    fontSize: 15,
    fontWeight: '700'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14
  }
});

export default RegisterScreen;
