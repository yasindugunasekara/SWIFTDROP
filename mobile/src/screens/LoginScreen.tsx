import { LoadingOverlay } from '../components/AppLoading';
import { RegistrationRequired, signInMobileWithGoogle } from '../services/google-auth';
import AuthBackButton from '../components/AuthBackButton';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import { loginMobile, type MobileUser } from '../services/auth';

interface Props {
  onLoginSuccess: (user: MobileUser) => void;
  onBack: () => void;
  onRegister: (notice?: string) => void;
  notice?: string;
}

export default function LoginScreen({ onLoginSuccess, onBack, onRegister, notice }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const { height } = useWindowDimensions();

  const handleSubmit = async () => {
    if (pending.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setError('Enter your email address and password.'); return;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      const profile = await loginMobile(email, password);
      setPassword('');
      onLoginSuccess(profile);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sign-in failed. Please retry.');
    } finally { pending.current = false; setBusy(false); }
  };

  const handleGoogle = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const profile = await signInMobileWithGoogle();
      if (profile) onLoginSuccess(profile);
    } catch (failure) {
      if (failure instanceof RegistrationRequired) onRegister(failure.message);
      else setError(failure instanceof Error ? failure.message : 'Google sign-in failed.');
    } finally { pending.current = false; setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={busy} label="Signing you in..." />
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f7" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, height < 700 && styles.compactContent]}
          bounces={false}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, height < 700 && styles.compactCard]}>
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <AuthBackButton onPress={onBack} disabled={busy} label="Back to home" />
            <Text style={styles.logoText}>
              swiftdrop<Text style={styles.logoDot}>.</Text>
            </Text>
          </View>

          {/* Greeting */}
          <View style={styles.headerBlock}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
          </View>

          {notice ? <Text style={styles.error} accessibilityRole="alert">{notice}</Text> : null}
          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoComplete="email"
                editable={!busy}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordRow}>
                <Text style={styles.label}>Password</Text>
              </View>
              <View style={styles.passwordControl}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
                autoComplete="current-password"
                editable={!busy}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(value => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} disabled={busy}>
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSubmit}
              disabled={busy}
              accessibilityState={{ busy, disabled: busy }}
              activeOpacity={0.85}
            >
              {busy && <ActivityIndicator color="#ffffff" size="small" />}
              <Text style={styles.loginButtonText}>
                {busy ? 'Signing in...' : 'Sign in'}
              </Text>
            </TouchableOpacity>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </View>

          <View style={styles.googleDivider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
          <TouchableOpacity onPress={handleGoogle} disabled={busy} accessibilityRole="button" accessibilityLabel="Continue with Google" style={styles.googleButton}>
            <Text style={styles.googleMark} accessibilityElementsHidden>G</Text><Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
          {/* Sign Up Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to SwiftDrop? </Text>
            <TouchableOpacity onPress={() => onRegister()}>
              <Text style={styles.signupLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f2f2f7' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  compactContent: { paddingHorizontal: 16, paddingVertical: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 28, padding: 28, shadowColor: '#1c1c1e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 2 },
  compactCard: { padding: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, lineHeight: 34, color: '#636366', fontWeight: '400' },
  logoText: { fontSize: 23, fontWeight: '800', color: '#1c1c1e', letterSpacing: -0.9 },
  logoDot: { color: Colors.primary },
  headerBlock: { marginBottom: 24 },
  welcomeTitle: { fontSize: 30, fontWeight: '700', color: '#1c1c1e', letterSpacing: -1 },
  roleContainer: { flexDirection: 'row', backgroundColor: '#f2f2f7', borderRadius: 11, padding: 3, marginBottom: 24 },
  roleTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  activeRoleTab: { backgroundColor: '#ffffff', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 3, elevation: 2 },
  roleTabText: { fontSize: 13, fontWeight: '500', color: '#8e8e93' },
  activeRoleTabText: { color: '#1c1c1e', fontWeight: '600' },
  formSection: { marginBottom: 22 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#636366', marginBottom: 8 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: '#f7f7fa', borderWidth: 1, borderColor: '#ededf2', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14, minHeight: 52, fontSize: 16, color: '#1c1c1e', fontWeight: '400' },
  passwordControl: { position: 'relative' },
  passwordInput: { paddingRight: 64 },
  passwordToggle: { position: 'absolute', right: 4, top: 2, bottom: 2, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  toggleText: { color: '#8e8e93', fontSize: 12, fontWeight: '500' },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 14, minHeight: 52, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  error: { marginTop: 12, color: '#b91c1c', backgroundColor: '#fff1f2', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19 },
  googleDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ededf2' },
  dividerText: { color: '#8e8e93', fontSize: 12 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#e4e4ea', backgroundColor: '#ffffff', marginBottom: 16 },
  googleMark: { fontSize: 20, fontWeight: '700', color: '#4285f4' },
  googleText: { fontSize: 14, fontWeight: '500', color: '#1c1c1e' },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#8e8e93' },
  signupLink: { fontSize: 12, fontWeight: '600', color: Colors.primary, paddingVertical: 8 },
});

const styles = authStyles;
