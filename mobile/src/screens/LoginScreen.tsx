import { LoadingOverlay } from '../components/AppLoading';
import { RegistrationRequired, signInMobileWithGoogle } from '../services/google-auth';
import AuthBackButton from '../components/AuthBackButton';
import React, { useEffect, useRef, useState } from 'react';
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
  Keyboard,
  Modal,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import { API_URL, loginMobile, loginMobileDemo, requestMobilePasswordReset, type MobileUser } from '../services/auth';

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
  const [resetMessage, setResetMessage] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showDemos, setShowDemos] = useState(false);
  const passwordField = useRef<TextInput>(null);
  const [demoRoles, setDemoRoles] = useState<Array<'CUSTOMER' | 'COURIER'>>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${API_URL}/auth/demo`, { signal: controller.signal }).then(response => response.ok ? response.json() : { roles: [] })
      .then(data => { if (!controller.signal.aborted) setDemoRoles((data.roles || []).filter((role: string) => role === 'CUSTOMER' || role === 'COURIER')); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const { height } = useWindowDimensions();
  const [frameHeight, setFrameHeight] = useState(Math.min(height, 900));
  const compact = frameHeight < 800;
  const tight = frameHeight < 640;
  const minimal = frameHeight < 440;
  const showSecondary = frameHeight >= 440 && !(focusedField && frameHeight < 560);
  const styles = {
    ...authStyles, ...loginStyles,
    topBar: [loginStyles.topBar, compact && fixedStyles.compactTopBar],
    headerBlock: [loginStyles.headerBlock, compact && fixedStyles.compactHeader],
    welcomeTitle: [loginStyles.welcomeTitle, compact && fixedStyles.compactTitle],
    inputGroup: [loginStyles.inputGroup, compact && fixedStyles.compactInputGroup],
    input: [loginStyles.input, compact && fixedStyles.compactInput],
    formSection: [loginStyles.formSection, compact && fixedStyles.compactForm, !showSecondary && fixedStyles.keyboardForm],
    recoveryRow: [loginStyles.recoveryRow, compact && fixedStyles.compactRecovery],
    loginButton: [loginStyles.loginButton, compact && fixedStyles.compactButton],
    googleDivider: [loginStyles.googleDivider, compact && fixedStyles.compactDivider],
    googleButton: [loginStyles.googleButton, compact && fixedStyles.compactGoogle],
    demoSection: [loginStyles.demoSection, compact && fixedStyles.compactDemo],
  };

  const handleSubmit = async () => {
    if (pending.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setError('Enter your email address and password.'); return;
    }
    pending.current = true; setBusy(true); setError(''); setResetMessage('');
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
    pending.current = true; setBusy(true); setError(''); setResetMessage('');
    try {
      const profile = await signInMobileWithGoogle();
      if (profile) onLoginSuccess(profile);
    } catch (failure) {
      if (failure instanceof RegistrationRequired) onRegister(failure.message);
      else setError(failure instanceof Error ? failure.message : 'Google sign-in failed.');
    } finally { pending.current = false; setBusy(false); }
  };
  async function handleReset() {
    if (pending.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address above, then request a reset link.'); return; }
    pending.current = true; setBusy(true); setSendingReset(true); setError(''); setResetMessage('');
    try { setResetMessage(await requestMobilePasswordReset(email)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to send reset email.'); }
    finally { pending.current = false; setBusy(false); setSendingReset(false); }
  }
  async function handleDemo(role: 'CUSTOMER' | 'COURIER') {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setResetMessage('');
    try { const profile = await loginMobileDemo(role); setPassword(''); onLoginSuccess(profile); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Demo login failed.'); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={busy} label={sendingReset ? 'Sending reset link...' : 'Signing you in...'} />
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={Platform.OS !== 'web'}
        style={{ flex: 1 }}
      >
        <View
          style={fixedStyles.container}
          onLayout={event => { const next = event.nativeEvent.layout.height; if (next > 0) setFrameHeight(next); }}
        >
          {/* A sibling backdrop cannot intercept or dismiss an input's tap. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} accessible={false} />
          <View style={fixedStyles.content}>
          {/* Top Bar with Back Button */}
          {!minimal && <View style={styles.topBar}>
            <AuthBackButton onPress={onBack} disabled={busy} label="Back to home" />
            <Text style={styles.logoText}>
              swiftdrop<Text style={styles.logoDot}>.</Text>
            </Text>
          </View>}

          {/* Greeting */}
          {!tight && <View style={styles.headerBlock}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your SwiftDrop account.</Text>
          </View>}

          {notice && !error && !resetMessage ? <Text style={styles.error} numberOfLines={2} accessibilityRole="alert">{notice}</Text> : null}
          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              {!minimal && <Text style={styles.label}>Email address</Text>}
              <TextInput
                key="login-email"
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                value={email}
                onChangeText={value => { setEmail(value); setError(''); setResetMessage(''); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Email address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                editable={!busy}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordField.current?.focus()}
                selectionColor={Colors.primary}
              />
            </View>

            <View style={styles.passwordGroup}>
                {!minimal && <Text style={styles.label}>Password</Text>}
              <View style={styles.passwordControl}>
              <TextInput
                key="login-password"
                ref={passwordField}
                style={[styles.input, styles.passwordInput, focusedField === 'password' && styles.inputFocused]}
                value={password}
                onChangeText={value => { setPassword(value); setError(''); }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
                autoComplete="current-password"
                editable={!busy}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                selectionColor={Colors.primary}
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(value => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} disabled={busy}>
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              </View>
            </View>

            <View style={styles.recoveryRow}>
              <TouchableOpacity style={styles.recoveryButton} onPress={() => void handleReset()} disabled={busy}
                accessibilityRole="button" accessibilityLabel="Forgot password? Send a reset link to the email above"
                accessibilityState={{ disabled: busy }} activeOpacity={0.6}>
                <Text style={styles.recoveryText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text accessibilityRole="alert" numberOfLines={2} style={styles.error}>{error}</Text> : null}
            {resetMessage ? <View accessibilityLiveRegion="polite" style={styles.resetNotice}>
              {!tight && <Text style={styles.resetTitle}>Check your inbox</Text>}
              <Text style={styles.resetText} numberOfLines={tight ? 2 : 3}>{resetMessage}</Text>
            </View> : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, busy && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              activeOpacity={0.85}
            >
              {busy && !sendingReset && <ActivityIndicator color="#ffffff" size="small" />}
              <Text style={styles.loginButtonText}>
                {busy && !sendingReset ? 'Signing in...' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {showSecondary && (frameHeight < 560 ? <View style={fixedStyles.smallActions}>
            <TouchableOpacity style={fixedStyles.smallGoogle} onPress={handleGoogle} disabled={busy} accessibilityRole="button" accessibilityLabel="Continue with Google">
              <Text style={styles.googleMark} accessibilityElementsHidden>G</Text><Text style={styles.googleText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createAccountButton} onPress={() => onRegister()} disabled={busy} accessibilityRole="button"><Text style={styles.signupLink}>Create an account</Text></TouchableOpacity>
          </View> : <>
          <View style={styles.googleDivider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
          <TouchableOpacity onPress={handleGoogle} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} accessibilityLabel="Continue with Google" style={[styles.googleButton, busy && styles.buttonDisabled]} activeOpacity={0.65}>
            <Text style={styles.googleMark} accessibilityElementsHidden>G</Text><Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
          {/* Sign Up Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to SwiftDrop? </Text>
            <TouchableOpacity onPress={() => onRegister()} disabled={busy} accessibilityRole="button" style={styles.createAccountButton} activeOpacity={0.6}>
              <Text style={styles.signupLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
          {demoRoles.length > 0 && !(tight && (error || resetMessage || notice)) && <View style={styles.demoSection}>
            <TouchableOpacity style={styles.demoDisclosure} onPress={() => { Keyboard.dismiss(); setShowDemos(true); }} disabled={busy}
              accessibilityRole="button" accessibilityState={{ expanded: showDemos, disabled: busy }} activeOpacity={0.6}>
              <Text style={styles.demoLabel}>Explore a demo</Text>
              <Text style={styles.demoChevron} accessibilityElementsHidden>+</Text>
            </TouchableOpacity>
          </View>}
          </>)}
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={showDemos} transparent animationType="fade" onRequestClose={() => setShowDemos(false)}>
        <View style={fixedStyles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDemos(false)} accessibilityLabel="Dismiss demo workspaces" accessibilityRole="button" />
          <View style={fixedStyles.demoSheet} accessibilityViewIsModal>
            <Text style={fixedStyles.sheetTitle}>Choose a demo</Text>
            <View style={styles.demoButtons}>
              {demoRoles.map(role => <TouchableOpacity key={role} disabled={busy} accessibilityRole="button"
                accessibilityLabel={`Sign in to ${role.toLowerCase()} demo`} onPress={() => { setShowDemos(false); void handleDemo(role); }}
                style={[styles.demoButton, busy && styles.buttonDisabled]} activeOpacity={0.65}>
                <Text style={styles.demoButtonText}>{role === 'COURIER' ? 'Courier' : 'Customer'}</Text>
              </TouchableOpacity>)}
            </View>
            <TouchableOpacity style={styles.demoDisclosure} onPress={() => setShowDemos(false)} accessibilityRole="button"><Text style={styles.recoveryText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
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

// Login-specific refinements; registration retains its shared auth styles.
const loginStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 28 },
  compactContent: { paddingHorizontal: 24, paddingVertical: 16 },
  card: { backgroundColor: '#ffffff', padding: 4 },
  compactCard: { padding: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  logoText: { fontSize: 22, fontWeight: '800', color: '#1d1d1f', letterSpacing: -0.9 },
  headerBlock: { marginBottom: 28 },
  welcomeTitle: { fontSize: 34, lineHeight: 42, fontWeight: '700', color: '#1d1d1f', letterSpacing: -1.2 },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 21, color: '#86868b' },
  formSection: { marginBottom: 24 },
  inputGroup: { marginBottom: 18 },
  passwordGroup: { marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '500', color: '#515154', marginBottom: 9 },
  input: { backgroundColor: '#f5f5f7', borderWidth: 1, borderColor: '#f5f5f7', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, minHeight: 56, fontSize: 16, color: '#1d1d1f', fontWeight: '400' },
  inputFocused: { borderColor: '#ffb280', backgroundColor: '#fffaf6' },
  passwordInput: { paddingRight: 68 },
  passwordToggle: { position: 'absolute', right: 4, top: 4, bottom: 4, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
  toggleText: { color: '#6e6e73', fontSize: 12, fontWeight: '600' },
  recoveryRow: { alignItems: 'flex-end', marginTop: 2, marginBottom: 8 },
  recoveryButton: { minHeight: 44, paddingLeft: 16, paddingRight: 2, justifyContent: 'center' },
  recoveryText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 15, minHeight: 56, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  buttonDisabled: { opacity: 0.5 },
  error: { marginBottom: 16, color: '#b42332', backgroundColor: '#fff3f3', borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 20 },
  resetNotice: { marginBottom: 16, backgroundColor: '#f0f8f3', borderRadius: 12, padding: 14, gap: 4 },
  resetTitle: { color: '#276340', fontSize: 13, fontWeight: '600' },
  resetText: { color: '#3f6a50', fontSize: 13, lineHeight: 20 },
  googleDivider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#dedee3' },
  dividerText: { color: '#86868b', fontSize: 12 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 54, borderRadius: 15, borderWidth: 1, borderColor: '#e5e5ea', backgroundColor: '#ffffff', marginBottom: 16 },
  googleText: { fontSize: 15, fontWeight: '500', color: '#1d1d1f' },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#86868b', lineHeight: 20 },
  createAccountButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  signupLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  demoSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ededf0', marginTop: 20, paddingTop: 8 },
  demoDisclosure: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  demoLabel: { color: '#6e6e73', fontSize: 12, fontWeight: '500' },
  demoChevron: { color: '#86868b', fontSize: 16 },
  demoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  demoButton: { flex: 1, minWidth: 110, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f5f5f7' },
  demoButtonText: { color: '#515154', fontSize: 13, fontWeight: '500' },
});
const fixedStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  content: { width: '100%', maxWidth: 384, alignSelf: 'center' },
  compactTopBar: { marginBottom: 12 },
  compactHeader: { marginBottom: 18 },
  compactTitle: { fontSize: 30, lineHeight: 36 },
  compactInputGroup: { marginBottom: 12 },
  compactInput: { minHeight: 48, paddingVertical: 11 },
  compactForm: { marginBottom: 16 },
  keyboardForm: { marginBottom: 0 },
  compactRecovery: { marginTop: 0, marginBottom: 4 },
  compactButton: { minHeight: 48 },
  compactDivider: { marginBottom: 12 },
  compactGoogle: { minHeight: 48, marginBottom: 4 },
  compactDemo: { marginTop: 8, paddingTop: 0 },
  smallActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  smallGoogle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e5ea', borderRadius: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  demoSheet: { width: '100%', maxWidth: 360, backgroundColor: '#ffffff', borderRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '600', color: '#1d1d1f', marginBottom: 16 },
});
