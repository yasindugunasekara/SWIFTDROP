import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MobileTrackingScreen({ route }: any) {
  const { trackingId } = route?.params || { trackingId: 'SWIFT-991122' };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Track Parcel</Text>
      <View style={styles.card}>
        <Text style={styles.trackingNo}>{trackingId}</Text>
        <Text style={styles.status}>Status: IN TRANSIT</Text>
        <Text style={styles.time}>Estimated Delivery: Today by 5:00 PM</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 10 },
  trackingNo: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  status: { color: '#38bdf8', fontSize: 16, marginTop: 8, fontWeight: '600' },
  time: { color: '#94a3b8', marginTop: 4 }
});
