import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';

export function LoadingOverlay({ visible, label }: { visible: boolean; label: string }) {
  return <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
    {visible && <AppLoading label={label} />}
  </Modal>;
}

export default function AppLoading({ label = 'Loading...' }: { label?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (reducedMotion) return;
    const spin = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]));
    spin.start(); breathe.start();
    return () => { spin.stop(); breathe.stop(); rotation.setValue(0); pulse.setValue(0); };
  }, [reducedMotion, rotation, pulse]);

  return <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">
    <View style={styles.glow} pointerEvents="none" />
    <View style={styles.content}>
      <View style={styles.mark} accessible={false}>
        <Animated.View style={[styles.orbit, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
        <View style={styles.parcel}><View style={styles.tape} /><View style={styles.parcelLabel} /></View>
      </View>
      <Text style={styles.brand}>swiftdrop<Text style={styles.orange}>.</Text></Text>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dots} accessible={false}>
        {[0, 1, 2].map(index => <Animated.View key={index} style={[styles.dot, { opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: index === 1 ? [0.4, 1, 0.4] : index === 0 ? [1, 0.6, 0.3] : [0.3, 0.6, 1] }) }]} />)}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' },
  glow: { position: 'absolute', top: -160, left: -100, width: 360, height: 360, borderRadius: 180, backgroundColor: '#fff1e8', opacity: 0.65 },
  content: { alignItems: 'center', gap: 14 },
  mark: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  orbit: { position: 'absolute', top: -4, left: -4, width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#ffedd5', borderTopColor: '#ff6600', borderRightColor: '#ffb47f' },
  parcel: { width: 29, height: 29, borderWidth: 1.8, borderColor: '#ff6600', borderRadius: 4, transform: [{ rotate: '-8deg' }], overflow: 'hidden' },
  tape: { position: 'absolute', top: 0, bottom: 0, left: 11, width: 5, backgroundColor: '#ff660033' },
  parcelLabel: { position: 'absolute', left: 4, bottom: 5, width: 6, height: 2, backgroundColor: '#ff6600' },
  brand: { color: '#0f172a', fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  orange: { color: '#ff6600' },
  label: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ff6600' },
});
