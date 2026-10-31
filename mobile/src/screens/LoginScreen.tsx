import React, { useState } from 'react';
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
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  onLoginSuccess: (userRole: 'customer' | 'courier', userName: string) => void;
  onBack: () => void;
}

export default function LoginScreen({ onLoginSuccess, onBack }: Props) {
  const [role, setRole] = useState<'customer' | 'courier'>('customer');
  const [email, setEmail] = useState('alex@swiftdrop.io');
  const [password, setPassword] = useState('••••••••');

  const handleQuickCustomer = () => {
    setRole('customer');
    setEmail('alex@swiftdrop.io');
    onLoginSuccess('customer', 'Alex Silva');
  };

  const handleQuickCourier = () => {
    setRole('courier');
    setEmail('sunil.courier@swiftdrop.io');
    onLoginSuccess('courier', 'Sunil Silva');
  };

  const handleSubmit = () => {
    const name = role === 'courier' ? 'Sunil Silva' : 'Alex Silva';
    onLoginSuccess(role, name);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.logoText}>
              swiftdrop<Text style={styles.logoDot}>.</Text>
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Greeting */}
          <View style={styles.headerBlock}>
            <Text style={styles.welcomeTitle}>Welcome Back 👋</Text>
            <Text style={styles.welcomeSub}>
              Sign in to manage live deliveries, waybills, and island express shipments.
            </Text>
          </View>

          {/* Role Toggle Switch */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              onPress={() => setRole('customer')}
              style={[styles.roleTab, role === 'customer' && styles.activeRoleTab]}
            >
              <Text style={[styles.roleTabText, role === 'customer' && styles.activeRoleTabText]}>
                📦 Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('courier')}
              style={[styles.roleTab, role === 'courier' && styles.activeRoleTab]}
            >
              <Text style={[styles.roleTabText, role === 'courier' && styles.activeRoleTabText]}>
                🛵 Courier Rider
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL OR MOBILE NUMBER</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email or phone"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity onPress={() => alert('Password reset link sent')}>
                  <Text style={styles.forgotLink}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>
                Log In as {role === 'courier' ? 'Courier Rider' : 'Customer'} &rarr;
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick 1-Click Demo Login Bar */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>⚡ ONE-CLICK DEMO LOGIN</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={styles.demoButton}
                onPress={handleQuickCustomer}
                activeOpacity={0.7}
              >
                <Text style={styles.demoButtonTitle}>Alex Silva</Text>
                <Text style={styles.demoButtonRole}>Customer Portal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoButton}
                onPress={handleQuickCourier}
                activeOpacity={0.7}
              >
                <Text style={styles.demoButtonTitle}>Sunil Silva</Text>
                <Text style={styles.demoButtonRole}>Rider #101 Hub</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => alert('Registration opened')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backArrow: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  logoDot: {
    color: Colors.primary,
  },
  headerBlock: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeRoleTab: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeRoleTabText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  demoSection: {
    padding: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
    marginBottom: 24,
  },
  demoLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
  },
  demoButtonTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  demoButtonRole: {
    fontSize: 10,
    color: '#ea580c',
    fontWeight: '600',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
});
