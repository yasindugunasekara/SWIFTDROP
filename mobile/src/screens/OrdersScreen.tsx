import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';

interface OrderItem {
  id: string;
  recipient: string;
  address: string;
  date: string;
  fee: string;
  status: 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Pending';
  weight: string;
  type: string;
}

interface Props {
  onTrackOrder: (id: string) => void;
}

export default function OrdersScreen({ onTrackOrder }: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const activeOrders: OrderItem[] = [
    {
      id: 'SWIFT-991122',
      recipient: 'Robert Smith',
      address: '742 Evergreen Terrace, Sector 4, Colombo 03',
      date: 'Today, 10:15 AM',
      fee: '$8.50',
      status: 'In Transit',
      weight: '1.2 kg',
      type: 'Standard Express Carton',
    },
    {
      id: 'SWIFT-882233',
      recipient: 'Emily Davis',
      address: '10 Downing St, Colombo 07',
      date: 'Today, 09:30 AM',
      fee: '$12.00',
      status: 'Out for Delivery',
      weight: '800g',
      type: 'Legal Document Pack',
    },
  ];

  const completedOrders: OrderItem[] = [
    {
      id: 'SWIFT-782910',
      recipient: 'Alice Johnson',
      address: '45 Duplication Rd, Colombo 03',
      date: 'Oct 30, 2026',
      fee: '$17.50',
      status: 'Delivered',
      weight: '3.5 kg',
      type: 'Fragile Electronics Box',
    },
    {
      id: 'SWIFT-665522',
      recipient: 'Sarah Connor',
      address: '94 Cyber Rd, Central Hub',
      date: 'Oct 28, 2026',
      fee: '$6.50',
      status: 'Delivered',
      weight: '500g',
      type: 'Care Gift Box',
    },
  ];

  const displayList = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>Manage past and active island deliveries</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'active' && styles.activeTabBtn]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'active' && styles.activeTabBtnText]}>
              Active ({activeOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'completed' && styles.activeTabBtn]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'completed' && styles.activeTabBtnText]}>
              Completed ({completedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        <View style={styles.listContainer}>
          {displayList.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => setSelectedOrder(order)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.trackingNo}>{order.id}</Text>
                  <Text style={styles.orderType}>{order.type}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    order.status === 'Delivered'
                      ? styles.statusDelivered
                      : styles.statusInTransit,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      order.status === 'Delivered'
                        ? styles.textDelivered
                        : styles.textInTransit,
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recipient:</Text>
                  <Text style={styles.detailValue}>{order.recipient}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{order.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date &amp; Fee:</Text>
                  <Text style={styles.detailValue}>
                    {order.date} &bull; <Text style={{ color: Colors.primary, fontWeight: '800' }}>{order.fee}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.trackActionBtn}
                  onPress={() => onTrackOrder(order.id)}
                >
                  <Text style={styles.trackActionText}>Track Live Status &rarr;</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Order Details Modal matching Screen 5 in Reference */}
      {selectedOrder && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTrackingId}>{selectedOrder.id}</Text>
                  <Text style={styles.modalSub}>Expected Delivery Today</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Milestone Timeline */}
              <View style={styles.timelineContainer}>
                {[
                  { title: 'Order Placed', time: '10:00 AM', done: true },
                  { title: 'Picked Up by Courier', time: '10:45 AM', done: true },
                  { title: 'In Transit to Hub', time: '11:30 AM', done: true },
                  { title: 'Out for Doorstep Delivery', time: '12:15 PM', done: selectedOrder.status !== 'Pending' },
                  { title: 'Verified Delivered', time: 'Estimated 01:00 PM', done: selectedOrder.status === 'Delivered' },
                ].map((step, idx) => (
                  <View key={idx} style={styles.timelineRow}>
                    <View style={styles.timelineCol}>
                      <View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>
                        {step.done && <Text style={{ color: '#ffffff', fontSize: 10 }}>✓</Text>}
                      </View>
                      {idx < 4 && <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />}
                    </View>
                    <View style={styles.timelineTextWrap}>
                      <Text style={[styles.timelineTitle, step.done && styles.timelineTitleDone]}>
                        {step.title}
                      </Text>
                      <Text style={styles.timelineTime}>{step.time}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Package Information */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Package Information</Text>
                <Text style={styles.infoCardText}>Weight: {selectedOrder.weight} &bull; Dimensions: 25x20x15 cm</Text>
                <Text style={styles.infoCardText}>To: {selectedOrder.address}</Text>
              </View>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  setSelectedOrder(null);
                  onTrackOrder(selectedOrder.id);
                }}
              >
                <Text style={styles.modalActionText}>View on Live GPS Map &rarr;</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTabBtn: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabBtnText: {
    color: Colors.primary,
    fontWeight: '900',
  },
  listContainer: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackingNo: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  orderType: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusInTransit: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  statusDelivered: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textInTransit: {
    color: Colors.primary,
  },
  textDelivered: {
    color: '#10b981',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardBody: {
    gap: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
    maxWidth: '70%',
    textAlign: 'right',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  trackActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  trackActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTrackingId: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 46,
  },
  timelineCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: Colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: Colors.primary,
  },
  timelineTextWrap: {
    flex: 1,
    paddingBottom: 10,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  timelineTitleDone: {
    color: '#0f172a',
    fontWeight: '900',
  },
  timelineTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  infoCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
