import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export default function TaskListScreen({ navigation }: any) {
  const [tasks] = useState([
    { id: 'SWIFT-991122', recipient: 'Robert Smith', address: '742 Evergreen Terrace', status: 'OUT_FOR_DELIVERY' },
    { id: 'SWIFT-882233', recipient: 'Emily Davis', address: '10 Downing St', status: 'ASSIGNED' },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Courier Daily Deliveries</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation?.navigate('DeliveryDetail', { task: item })}
          >
            <Text style={styles.trackingNo}>{item.id}</Text>
            <Text style={styles.recipient}>To: {item.recipient}</Text>
            <Text style={styles.address}>{item.address}</Text>
            <Text style={styles.statusBadge}>{item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 12 },
  trackingNo: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  recipient: { color: '#94a3b8', marginTop: 4 },
  address: { color: '#cbd5e1', marginTop: 2 },
  statusBadge: { color: '#fbbf24', marginTop: 8, fontSize: 12, fontWeight: 'bold' }
});
