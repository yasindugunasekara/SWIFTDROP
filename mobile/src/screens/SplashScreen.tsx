import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function SplashScreen({ onGetStarted, onLogin }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>
            swiftdrop<Text style={styles.logoDot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Fast. Safe. Everywhere.</Text>
        </View>

        {/* Hero Visual Container */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../../assets/service-express.jpg')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.headline}>Your Packages,{'\n'}Our Priority</Text>
          <Text style={styles.subtext}>
            Send and receive your packages with speed and security, anywhere across the island.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.alreadyText}>Already have an account? </Text>
            <TouchableOpacity onPress={onLogin} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  logoDot: {
    color: Colors.primary,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 320,
    marginVertical: 12,
  },
  heroImage: {
    width: width * 0.85,
    height: 260,
    borderRadius: 24,
  },
  contentCard: {
    width: '100%',
    paddingBottom: 8,
  },
  headline: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  alreadyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
});
