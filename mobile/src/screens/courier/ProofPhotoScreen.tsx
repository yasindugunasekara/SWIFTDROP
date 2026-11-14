import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';

export default function ProofPhotoScreen({ route, navigation }: any) {
  const { parcelId, isFailure } = route?.params || { parcelId: 'SWIFT-991122', isFailure: false };

  const [photoTaken, setPhotoTaken] = useState(false);
  const [signed, setSigned] = useState(false);
  const [failureReason, setFailureReason] = useState('RECIPIENT_UNAVAILABLE');
  const [courierNotes, setCourierNotes] = useState('');

  const handleCapturePhoto = () => {
    setPhotoTaken(true);
    Alert.alert('Camera Capture', 'Doorstep proof photo captured with GPS coordinates & timestamp.');
  };

  const handleConfirm = () => {
    if (isFailure) {
      if (!failureReason) {
        Alert.alert('Error', 'Please select a failure reason.');
        return;
      }
      Alert.alert(
        'Delivery Exception Logged',
        `Parcel ${parcelId} marked as FAILED with reason: ${failureReason}`,
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
      return;
    }

    if (!photoTaken) {
      Alert.alert('Proof Photo Required', 'You must capture a doorstep proof photo before confirming delivery.');
      return;
    }

    Alert.alert(
      'Delivery Confirmed',
      `Parcel ${parcelId} delivered successfully with verified photo proof!`,
      [{ text: 'OK', onPress: () => navigation?.goBack() }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        {isFailure ? 'Log Delivery Failure' : 'Capture Delivery Proof'}
      </Text>
      <Text style={styles.sub}>Tracking #: {parcelId}</Text>

      {isFailure ? (
        <View style={styles.formBox}>
          <Text style={styles.label}>Select Failure Reason:</Text>
          {[
            { id: 'RECIPIENT_UNAVAILABLE', label: 'Recipient Unreachable / Not Home' },
            { id: 'WRONG_ADDRESS', label: 'Incorrect / Incomplete Address' },
            { id: 'CUSTOMER_REFUSED', label: 'Customer Refused Handover' },
            { id: 'ACCESS_DENIED', label: 'Gate / Building Access Denied' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.reasonBtn, failureReason === item.id && styles.reasonBtnActive]}
              onPress={() => setFailureReason(item.id)}
            >
              <Text style={[styles.reasonText, failureReason === item.id && styles.reasonTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.label, { marginTop: 12 }]}>Failure Details / Notes:</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Document attempts made, phone calls, etc..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={courierNotes}
            onChangeText={setCourierNotes}
          />
        </View>
      ) : (
        <>
          {/* Camera Viewfinder */}
          <View style={styles.cameraPlaceholder}>
            {photoTaken ? (
              <View style={styles.photoPreview}>
                <Text style={styles.photoCheck}>✓</Text>
                <Text style={styles.photoCapturedText}>Doorstep Proof Photo Captured</Text>
                <Text style={styles.timestamp}>{new Date().toLocaleTimeString()}</Text>
              </View>
            ) : (
              <Text style={styles.cameraText}>[Camera Viewfinder: Frame doorstep & parcel]</Text>
            )}
          </View>

          <TouchableOpacity style={styles.shutterBtn} onPress={handleCapturePhoto}>
            <Text style={styles.shutterText}>
              {photoTaken ? 'Retake Photo' : '📸 Snap Proof Photo'}
            </Text>
          </TouchableOpacity>

          {/* Signature Option */}
          <TouchableOpacity
            style={[styles.signatureBox, signed && styles.signatureBoxActive]}
            onPress={() => setSigned(!signed)}
          >
            <Text style={styles.signatureText}>
              {signed ? '✓ Recipient Signature Received' : '✍️ Tap to Sign on Screen'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.notesInput}
            placeholder="Courier recipient notes (optional)..."
            placeholderTextColor="#64748b"
            value={courierNotes}
            onChangeText={setCourierNotes}
          />
        </>
      )}

      {/* Confirm Button */}
      <TouchableOpacity
        style={[styles.confirmBtn, isFailure && styles.confirmBtnFail]}
        onPress={handleConfirm}
      >
        <Text style={styles.confirmText}>
          {isFailure ? 'Submit Failure Exception' : 'Confirm & Complete Handover'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#090d16', padding: 20, alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#ff6600', marginTop: 10 },
  sub: { color: '#94a3b8', marginVertical: 6, fontSize: 13 },
  cameraPlaceholder: { width: '100%', height: 260, backgroundColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginVertical: 14, borderWidth: 1, borderColor: '#334155' },
  cameraText: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  photoPreview: { alignItems: 'center' },
  photoCheck: { fontSize: 44, color: '#10b981', fontWeight: 'bold' },
  photoCapturedText: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  timestamp: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  shutterBtn: { backgroundColor: '#334155', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 12 },
  shutterText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  signatureBox: { width: '100%', padding: 14, backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center', marginBottom: 12 },
  signatureBoxActive: { borderColor: '#10b981', backgroundColor: '#064e3b' },
  signatureText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  notesInput: { width: '100%', backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  formBox: { width: '100%', marginVertical: 12 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  reasonBtn: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  reasonBtnActive: { borderColor: '#ef4444', backgroundColor: '#450a0a' },
  reasonText: { color: '#cbd5e1', fontSize: 13, fontWeight: '500' },
  reasonTextActive: { color: '#fca5a5', fontWeight: 'bold' },
  textArea: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: '#334155', textAlignVertical: 'top', height: 80 },
  confirmBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 10 },
  confirmBtnFail: { backgroundColor: '#ef4444' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});
