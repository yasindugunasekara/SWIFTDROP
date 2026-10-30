import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ProofPhotoScreen({ route, navigation }: any) {
  const { parcelId } = route?.params || { parcelId: 'SWIFT-991122' };

  const handleCapture = () => {
    // Member 4 camera photo proof upload
    alert(`Proof captured for ${parcelId}! Uploading to server...`);
    navigation?.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Capture Proof of Delivery</Text>
      <Text style={styles.sub}>Parcel ID: {parcelId}</Text>

      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraText}>[Camera Viewfinder]</Text>
      </View>

      <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
        <Text style={styles.btnText}>Take Photo & Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 20, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8' },
  sub: { color: '#94a3b8', marginVertical: 8 },
  cameraPlaceholder: { width: '100%', height: 350, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  cameraText: { color: '#64748b', fontSize: 16 },
  captureBtn: { backgroundColor: '#10b981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
