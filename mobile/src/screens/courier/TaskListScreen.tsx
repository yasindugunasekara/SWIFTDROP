import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';

interface Job {
  id: string;
  trackingNumber: string;
  recipient: string;
  phone: string;
  address: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  notes?: string;
  weight: string;
}

export default function TaskListScreen({ navigation }: any) {
  const [filter, setFilter] = useState('ALL');
  const [recipientNoteInput, setRecipientNoteInput] = useState('');
  const [selectedTask, setSelectedTask] = useState<Job | null>(null);

  const [tasks, setTasks] = useState<Job[]>([
    {
      id: '1',
      trackingNumber: 'SWIFT-991122',
      recipient: 'Robert Smith',
      phone: '+94 77 987 6543',
      address: '742 Evergreen Terrace, Sector 4, Colombo 03',
      status: 'OUT_FOR_DELIVERY',
      notes: 'Ring bell twice; fragile electronics inside.',
      weight: '1.2 kg'
    },
    {
      id: '2',
      trackingNumber: 'SWIFT-882233',
      recipient: 'Emily Davis',
      phone: '+94 71 876 5432',
      address: '10 Downing St, Cinnamon Gardens, Colombo 07',
      status: 'IN_TRANSIT',
      notes: 'Leave with security guard if not available.',
      weight: '0.8 kg'
    },
    {
      id: '3',
      trackingNumber: 'SWIFT-774411',
      recipient: 'Michael Scott',
      phone: '+94 76 543 2109',
      address: '172 Industrial Zone, Hub C, Colombo 02',
      status: 'PICKED_UP',
      notes: 'Requires signature upon handover.',
      weight: '4.5 kg'
    },
    {
      id: '4',
      trackingNumber: 'SWIFT-665522',
      recipient: 'Sarah Connor',
      phone: '+94 70 123 4567',
      address: '94 Cyber Rd, Hub A, Bambalapitiya, Colombo 04',
      status: 'ASSIGNED',
      notes: 'Call 10 minutes prior to delivery.',
      weight: '2.1 kg'
    }
  ]);

  const activeTask = selectedTask || tasks[0];

  // Transition parcel status
  const handleUpdateStatus = (newStatus: Job['status']) => {
    if (!activeTask) return;

    if (newStatus === 'DELIVERED') {
      // Must navigate to ProofPhotoScreen first
      navigation?.navigate('ProofPhoto', { parcelId: activeTask.trackingNumber });
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, status: newStatus } : t))
    );
    setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    Alert.alert('Status Updated', `Parcel ${activeTask.trackingNumber} is now ${newStatus}`);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBox}>
        <Text style={styles.header}>Sunil Silva 🛵</Text>
        <Text style={styles.subHeader}>Courier Pro #101 • Western Corridor Run</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['ALL', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Delivery Card */}
      {activeTask && (
        <View style={styles.activeCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.activeLabel}>ACTIVE STOP</Text>
            <Text style={styles.statusBadge}>{activeTask.status}</Text>
          </View>

          <Text style={styles.trackingNo}>{activeTask.trackingNumber}</Text>
          <Text style={styles.recipientName}>{activeTask.recipient}</Text>
          <Text style={styles.addressText}>📍 {activeTask.address}</Text>
          <Text style={styles.phoneText}>📞 {activeTask.phone}</Text>
          <Text style={styles.notesText}>📝 Notes: {activeTask.notes || 'None'}</Text>

          {/* Stepper Status Buttons */}
          <Text style={styles.stepTitle}>TRANSITION STATUS PIPELINE:</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => handleUpdateStatus('PICKED_UP')}
            >
              <Text style={styles.stepBtnText}>1. Pick Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => handleUpdateStatus('IN_TRANSIT')}
            >
              <Text style={styles.stepBtnText}>2. In Transit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
            >
              <Text style={styles.stepBtnText}>3. Out for Delivery</Text>
            </TouchableOpacity>
          </View>

          {/* Recipient Notes Input */}
          <TextInput
            style={styles.input}
            placeholder="Add courier note (e.g. Left behind shoe rack)..."
            placeholderTextColor="#64748b"
            value={recipientNoteInput}
            onChangeText={setRecipientNoteInput}
          />

          {/* Final Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.deliverBtn}
              onPress={() => navigation?.navigate('ProofPhoto', { parcelId: activeTask.trackingNumber })}
            >
              <Text style={styles.deliverBtnText}>📸 Capture Proof & Deliver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.failBtn}
              onPress={() =>
                navigation?.navigate('ProofPhoto', {
                  parcelId: activeTask.trackingNumber,
                  isFailure: true
                })
              }
            >
              <Text style={styles.failBtnText}>Mark Failed</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Assigned Jobs List */}
      <Text style={styles.sectionTitle}>Today's Assigned Jobs ({filteredTasks.length})</Text>
      {filteredTasks.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.taskCard, activeTask?.id === item.id && styles.taskCardActive]}
          onPress={() => setSelectedTask(item)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTracking}>{item.trackingNumber}</Text>
            <Text style={styles.badgeSmall}>{item.status}</Text>
          </View>
          <Text style={styles.cardRecipient}>{item.recipient}</Text>
          <Text style={styles.cardAddress}>{item.address}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 16 },
  headerBox: { marginBottom: 16, marginTop: 8 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#ff6600' },
  subHeader: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, backgroundColor: '#1e293b' },
  filterBtnActive: { backgroundColor: '#ff6600' },
  filterText: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  filterTextActive: { color: '#ffffff' },
  activeCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  activeLabel: { fontSize: 11, fontWeight: 'bold', color: '#ff6600', backgroundColor: '#331a00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadge: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  trackingNo: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginTop: 4 },
  recipientName: { fontSize: 15, fontWeight: '600', color: '#e2e8f0', marginTop: 2 },
  addressText: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  phoneText: { color: '#38bdf8', fontSize: 12, marginTop: 2, fontWeight: '500' },
  notesText: { color: '#fbbf24', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  stepTitle: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginTop: 14, marginBottom: 6 },
  actionsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  stepBtn: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  stepBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: 'bold' },
  input: { backgroundColor: '#0f172a', borderRadius: 8, padding: 10, color: '#fff', fontSize: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 8 },
  deliverBtn: { flex: 2, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  deliverBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  failBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  failBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 10 },
  taskCard: { backgroundColor: '#131b2e', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1e293b' },
  taskCardActive: { borderColor: '#ff6600', backgroundColor: '#1a2238' },
  cardTracking: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  badgeSmall: { fontSize: 11, color: '#fbbf24', fontWeight: '600' },
  cardRecipient: { color: '#cbd5e1', fontSize: 13, marginTop: 2 },
  cardAddress: { color: '#64748b', fontSize: 11, marginTop: 2 }
});
