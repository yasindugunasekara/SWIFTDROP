import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AuthBackButton({ onPress, label, disabled = false }: {
  onPress: () => void; label: string; disabled?: boolean;
}) {
  return <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}
    accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} activeOpacity={0.65}>
    <View style={styles.icon} pointerEvents="none">
      <View style={styles.head} /><View style={styles.shaft} />
    </View>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f2f7', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  icon: { width: 20, height: 20, justifyContent: 'center' },
  head: { position: 'absolute', left: 3, width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#636366', transform: [{ rotate: '45deg' }] },
  shaft: { position: 'absolute', left: 3, width: 15, height: 2, borderRadius: 1, backgroundColor: '#636366' },
});
