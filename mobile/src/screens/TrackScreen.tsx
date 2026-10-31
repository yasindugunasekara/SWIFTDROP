import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
  initialTrackingId?: string;
}

export default function TrackScreen({ initialTrackingId = 'SWIFT-991122' }: Props) {
  const [trackingId, setTrackingId] = useState(initialTrackingId);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 300);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => alert('Barcode camera scanner ready')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>📷</Text>
          </TouchableOpacity>
        </View>

        {/* Tracking Input Bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.input}
            value={trackingId}
            onChangeText={setTrackingId}
            placeholder="Enter tracking number (e.g. SWIFT-991122)"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Progress Card */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <View style={styles.pkgBadge}>
              <Text style={{ fontSize: 22 }}>📦</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.statusTitle}>In Transit</Text>
              <Text style={styles.statusSub}>Arriving in 14 mins</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>ON ROUTE</Text>
            </View>
          </View>

          {/* Stepper Dots & Line */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperTrack} />
            <View style={styles.stepperTrackActive} />

            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotDone]}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.stepLabelDone}>Picked Up</Text>
              <Text style={styles.stepTime}>10:15 AM</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotActive]}>
                <View style={styles.innerActiveDot} />
              </View>
              <Text style={styles.stepLabelActive}>In Transit</Text>
              <Text style={styles.stepTime}>11:30 AM</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepDot}>
                <View style={styles.innerInactiveDot} />
              </View>
              <Text style={styles.stepLabel}>Out for Delivery</Text>
              <Text style={styles.stepTime}>Pending</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepDot}>
                <View style={styles.innerInactiveDot} />
              </View>
              <Text style={styles.stepLabel}>Delivered</Text>
              <Text style={styles.stepTime}>Est. 12:45</Text>
            </View>
          </View>
        </View>

        {/* Live Route Map Simulation */}
        <View style={styles.mapCard}>
          {/* Simulated Map Background Grid with Streets */}
          <View style={styles.mapGridBackground}>
            <View style={styles.mapRoadHorizontal} />
            <View style={styles.mapRoadVertical} />
            <View style={styles.mapRoadDiagonal} />

            {/* Courier Rider Pin */}
            <View style={styles.riderPin}>
              <Text style={{ fontSize: 18 }}>🛵</Text>
              <View style={styles.riderCallout}>
                <Text style={styles.riderCalloutText}>Sunil Silva</Text>
              </View>
            </View>

            {/* Destination Pin */}
            <View style={styles.destPin}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
          </View>

          {/* Floating Driver Arrival Tag */}
          <View style={styles.arrivalBanner}>
            <Text style={styles.arrivalText}>
              ⚡ Your courier Sunil is 1.4 km away
            </Text>
          </View>
        </View>

        {/* Driver Contact & Info Card */}
        <View style={styles.driverCard}>
          <View style={styles.driverInfoRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>SS</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.driverName}>Sunil Silva</Text>
              <Text style={styles.vehicleText}>Courier #101 &bull; Honda 150cc (WP-BHK-8921)</Text>
              <Text style={styles.ratingText}>★ 4.9 (142 deliveries)</Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => alert('Dialing courier: +94 77 987 6543')}
              activeOpacity={0.8}
            >
              <Text style={styles.callButtonText}>📞 Call Courier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => alert('Opening in-app chat with Sunil Silva')}
              activeOpacity={0.8}
            >
              <Text style={styles.messageButtonText}>💬 Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.addressCard}>
          <Text style={styles.addressCardTitle}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Text style={{ fontSize: 16 }}>🏠</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.addressText}>742 Evergreen Terrace, Sector 4, Colombo 03</Text>
              <Text style={styles.estimatedTimeText}>Expected Delivery: Today, 12:30 PM – 1:15 PM</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontSize: 16,
  },
  milestoneCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 18,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  pkgBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  statusSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    paddingTop: 8,
  },
  stepperTrack: {
    position: 'absolute',
    top: 22,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#e2e8f0',
  },
  stepperTrackActive: {
    position: 'absolute',
    top: 22,
    left: 20,
    width: (width - 80) * 0.45,
    height: 2,
    backgroundColor: Colors.primary,
  },
  stepItem: {
    alignItems: 'center',
    width: (width - 80) / 4,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepDotActive: {
    borderColor: Colors.primary,
    backgroundColor: '#ffffff',
  },
  innerActiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  innerInactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepLabelDone: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  stepLabelActive: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
  },
  stepTime: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  mapCard: {
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    position: 'relative',
  },
  mapGridBackground: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  mapRoadHorizontal: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#e2e8f0',
  },
  mapRoadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 120,
    width: 12,
    backgroundColor: '#e2e8f0',
  },
  mapRoadDiagonal: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
    height: 4,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '15deg' }],
  },
  riderPin: {
    position: 'absolute',
    top: 60,
    left: 90,
    alignItems: 'center',
  },
  riderCallout: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  riderCalloutText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  destPin: {
    position: 'absolute',
    bottom: 40,
    right: 50,
  },
  arrivalBanner: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  arrivalText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  driverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitials: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehicleText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  ratingText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  messageButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  addressCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  estimatedTimeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
});
