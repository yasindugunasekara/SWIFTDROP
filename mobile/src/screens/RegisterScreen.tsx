import { LoadingOverlay } from '../components/AppLoading';
import AuthBackButton from '../components/AuthBackButton';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { authStyles as styles } from './LoginScreen';
import { API_URL } from '../services/auth';

export default function RegisterScreen({ onBack, notice }: { onBack: () => void; notice?: string }) {
  const [role, setRole] = useState<'CUSTOMER' | 'COURIER' | 'MERCHANT'>('CUSTOMER');
  const [details, setDetails] = useState({ phone: '', address: '', vehicleType: 'Motorcycle', vehicleNumber: '', companyName: '', registrationNumber: '' });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(false);
  const { height } = useWindowDimensions();

  async function register() {
    if (pending.current) return;
    setError('');
    if (fullName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your name and a valid email address.'); return;
    }
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (role !== 'CUSTOMER' && (details.phone.trim().length < 7 || details.address.trim().length < 3)) { setError('Enter your phone number and address or delivery area.'); return; }
    if (role === 'MERCHANT' && (!details.companyName.trim() || !details.registrationNumber.trim())) { setError('Enter your company name and registration number.'); return; }
    if (role === 'COURIER' && details.vehicleType !== 'Bicycle' && !details.vehicleNumber.trim()) { setError('Enter your vehicle registration number.'); return; }
    pending.current = true; setBusy(true);
    try {
      const response = await fetch(`${API_URL}/auth/${role === 'CUSTOMER' ? 'register' : 'register-application'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password, confirmPassword, ...(role === 'CUSTOMER' ? { role: 'CUSTOMER' } : { application: { role, phone: details.phone, address: details.address,
          ...(role === 'COURIER' ? { vehicleType: details.vehicleType, vehicleNumber: details.vehicleNumber } : { companyName: details.companyName, registrationNumber: details.registrationNumber }) } }) }),
        signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(20000) : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        const fields = Object.values(result.fields || {}).flat().filter(value => typeof value === 'string');
        throw new Error(fields[0] as string || result.error || 'Unable to create your account.');
      }
      setPassword(''); setConfirmPassword('');
      setSuccess(result.requiresApproval ? 'Confirm your email. Your application is pending SwiftDrop approval.' : result.requiresEmailConfirmation !== false ? 'Check your email to confirm your account.' : 'Your account is ready. Sign in to continue.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to register. Please retry.'); }
    finally { pending.current = false; setBusy(false); }
  }

  return <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={busy} label="Submitting your registration..." />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scrollContent, layout.content]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.card, layout.card]}>
          <View style={[styles.topBar, layout.topBar]}>
            <AuthBackButton onPress={onBack} disabled={busy} label="Back to sign in" />
            <Text style={styles.logoText}>swiftdrop<Text style={styles.logoDot}>.</Text></Text>
          </View>
          <View style={[styles.headerBlock, layout.header]}><Text style={[styles.welcomeTitle, layout.title]}>{success ? (role !== 'CUSTOMER' ? 'Application submitted' : success.startsWith('Check') ? 'Check your email' : 'Account created') : 'Create an account'}</Text></View>
          {notice && !success ? <Text style={[styles.error, { marginBottom: 12 }]} accessibilityRole="alert">{notice}</Text> : null}
          {success ? <>
            <Text accessibilityRole="text" style={styles.footerText}>{success}</Text>
            <TouchableOpacity onPress={onBack} style={[styles.loginButton, { marginTop: 24 }]} accessibilityRole="button"><Text style={styles.loginButtonText}>Back to sign in</Text></TouchableOpacity>
          </> : <>
            <View style={[styles.roleContainer, { marginBottom: 14 }]} accessibilityRole="radiogroup">
              {(['CUSTOMER', 'COURIER', 'MERCHANT'] as const).map(value => <TouchableOpacity key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: role === value }} onPress={() => { setRole(value); setError(''); }} style={[styles.roleTab, role === value && styles.activeRoleTab]}><Text style={[styles.roleTabText, role === value && styles.activeRoleTabText]}>{value === 'MERCHANT' ? 'Business' : value === 'COURIER' ? 'Courier' : 'Customer'}</Text></TouchableOpacity>)}
            </View>
            {role !== 'CUSTOMER' && <Text style={[styles.footerText, { marginBottom: 12 }]}>Approval required for {role === 'COURIER' ? 'courier' : 'business'} access.</Text>}
            {[
              { label: 'Full name', value: fullName, update: setFullName, password: false, email: false },
              { label: 'Email address', value: email, update: setEmail, password: false, email: true },
              { label: 'Password', value: password, update: setPassword, password: true, email: false },
              { label: 'Confirm password', value: confirmPassword, update: setConfirmPassword, password: true, email: false },
            ].map(field => <View key={field.label} style={[styles.inputGroup, layout.field]}>
              <Text style={[styles.label, layout.label]}>{field.label}</Text>
              <View style={styles.passwordControl}>
                <TextInput accessibilityLabel={field.label} style={[styles.input, layout.input, height < 600 && layout.shortInput, field.label === 'Password' && styles.passwordInput]} value={field.value} onChangeText={field.update} editable={!busy}
                  placeholder={field.label === 'Password' ? 'At least 8 characters' : field.label} placeholderTextColor="#8e8e93"
                  secureTextEntry={field.password && !showPassword} autoCapitalize={field.password || field.email ? 'none' : 'words'} autoCorrect={false}
                  keyboardType={field.email ? 'email-address' : 'default'} autoComplete={field.email ? 'email' : field.password ? 'new-password' : 'name'} />
                {field.label === 'Password' && <TouchableOpacity style={styles.passwordToggle} disabled={busy} onPress={() => setShowPassword(value => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide passwords' : 'Show passwords'}><Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text></TouchableOpacity>}
              </View>
            </View>)}
            {role !== 'CUSTOMER' && <>
              {(role === 'COURIER' ? [ ['phone', 'Phone number'], ['address', 'Delivery area'], ...(details.vehicleType === 'Bicycle' ? [] : [['vehicleNumber', 'Vehicle registration number']]) ] : [ ['phone', 'Contact phone'], ['companyName', 'Company name'], ['registrationNumber', 'Business registration number'], ['address', 'Business address'] ]).map(([key, label]) => <View key={key} style={[styles.inputGroup, layout.field]}>
                <Text style={[styles.label, layout.label]}>{label}</Text>
                <TextInput accessibilityLabel={label} style={[styles.input, layout.input]} value={details[key as keyof typeof details]} editable={!busy} onChangeText={value => setDetails(previous => ({ ...previous, [key]: value }))} placeholder={label} placeholderTextColor="#8e8e93" keyboardType={key === 'phone' ? 'phone-pad' : 'default'} />
              </View>)}
              {role === 'COURIER' && <View style={[styles.inputGroup, layout.field]}>
                <Text style={[styles.label, layout.label]}>Vehicle type</Text>
                <View style={[styles.roleContainer, { marginBottom: 0 }]}>{['Motorcycle', 'Car', 'Van', 'Bicycle'].map(value => <TouchableOpacity key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: details.vehicleType === value }} style={[styles.roleTab, details.vehicleType === value && styles.activeRoleTab]} onPress={() => setDetails(previous => ({ ...previous, vehicleType: value }))}><Text style={[styles.roleTabText, { fontSize: 11 }, details.vehicleType === value && styles.activeRoleTabText]}>{value}</Text></TouchableOpacity>)}</View>
              </View>}
            </>}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <TouchableOpacity onPress={register} disabled={busy} style={[styles.loginButton, layout.button]} accessibilityRole="button" accessibilityState={{ busy, disabled: busy }}>
              {busy && <ActivityIndicator color="#ffffff" />}<Text style={styles.loginButtonText}>{busy ? 'Submitting...' : role === 'CUSTOMER' ? 'Create account' : 'Submit application'}</Text>
            </TouchableOpacity>
            <View style={[styles.footerRow, { marginTop: 10 }]}><Text style={styles.footerText}>Already have an account? </Text><TouchableOpacity onPress={onBack} disabled={busy}><Text style={styles.signupLink}>Sign in</Text></TouchableOpacity></View>
          </>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const layout = StyleSheet.create({
  content: { paddingVertical: 12, paddingHorizontal: 16 },
  card: { padding: 20, borderRadius: 24 },
  topBar: { marginBottom: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingRight: 10 },
  backArrow: { fontSize: 28, lineHeight: 32, color: '#ff6600' },
  backLabel: { fontSize: 13, fontWeight: '500', color: '#ff6600' },
  header: { marginBottom: 16 },
  title: { fontSize: 26, lineHeight: 32 },
  field: { marginBottom: 10 },
  label: { marginBottom: 5, fontSize: 12 },
  input: { minHeight: 48, paddingVertical: 11 },
  shortInput: { minHeight: 44, paddingVertical: 9 },
  button: { minHeight: 48, marginTop: 4 },
});
