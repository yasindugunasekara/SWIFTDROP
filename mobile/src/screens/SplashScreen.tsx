import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, useWindowDimensions } from 'react-native';
import { Colors } from '../theme/colors';

interface Props { onGetStarted: () => void; onLogin: () => void; }

export default function SplashScreen({ onGetStarted, onLogin }: Props) {
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const visualSize = Math.max(120, Math.min(width - 80, height * 0.34, 300));
  return <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#f2f2f7" />
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compact]} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>swiftdrop<Text style={styles.orange}>.</Text></Text>
      </View>
      <View style={styles.hero}>
        <View style={[styles.visual, { width: visualSize, height: visualSize }]}>
          <Image source={require('../../assets/hero-3d.png')} style={styles.image} resizeMode="cover" accessible={false} />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, compact && styles.compactTitle]}>Delivery, simplified.</Text>
        <Text style={styles.subtitle}>Send, track and manage your parcels.{ '\n' }All in one place.</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onGetStarted} activeOpacity={0.8} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Get started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogin} activeOpacity={0.7} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f2f2f7' },
  container: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 24, justifyContent: 'space-between', gap: 24 },
  compact: { paddingTop: 16, paddingBottom: 16, gap: 16 },
  header: { alignItems: 'center', paddingVertical: 4 },
  brand: { fontSize: 26, fontWeight: '800', color: '#1c1c1e', letterSpacing: -1 },
  orange: { color: Colors.primary },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  visual: { borderRadius: 34, overflow: 'hidden', backgroundColor: '#fff7ed', shadowColor: '#1c1c1e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 22 },
  image: { width: '100%', height: '100%' },
  content: { alignItems: 'center' },
  title: { fontSize: 32, lineHeight: 39, letterSpacing: -1.3, fontWeight: '700', color: '#1c1c1e', textAlign: 'center' },
  compactTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { fontSize: 14, lineHeight: 22, color: '#8e8e93', textAlign: 'center', marginTop: 10 },
  actions: { width: '100%', gap: 10, marginTop: 28 },
  primary: { minHeight: 52, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  secondary: { minHeight: 50, borderRadius: 15, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
});
