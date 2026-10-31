import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  userName: string;
  userRole: 'customer' | 'courier';
  onLogout: () => void;
  onNavigateOrders: () => void;
}

export default function AccountScreen({ userName, userRole, onLogout, onNavigateOrders }: Props) {
  const menuItems = [
    { id: 'orders', label: 'My Orders', icon: '📦', action: onNavigateOrders },
    { id: 'addr', label: 'Saved Addresses', icon: '📍', action: () => alert('Saved Addresses: Home, Office') },
    { id: 'pay', label: 'Payment Methods', icon: '💳', action: () => alert('Saved Cards: Visa •••• 4242') },
    { id: 'notif', label: 'Notifications & Alerts', icon: '🔔', action: () => alert('Notifications enabled') },
    { id: 'vouchers', label: 'Coupons & Vouchers', icon: '🎟️', action: () => alert('Active Coupon: SWIFTDROP20') },
    { id: 'support', label: 'Help & 24/7 Support', icon: '💬', action: () => alert('Contacting SwiftDrop support...') },
    { id: 'settings', label: 'Settings & Security', icon: '⚙️', action: () => alert('Settings opened') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.split(' ').map((n) => n[0]).join('')}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>
              {userRole === 'courier' ? 'sunil.courier@swiftdrop.io' : 'alex.silva@swiftdrop.io'}
            </Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>
                {userRole === 'courier' ? '⚡ Courier Rider #101' : '★ Customer Pro Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>SwiftDrop Balance</Text>
            <Text style={styles.walletAmount}>$45.00</Text>
          </View>

          <TouchableOpacity
            style={styles.topUpBtn}
            onPress={() => alert('Top up wallet modal opened')}
            activeOpacity={0.8}
          >
            <Text style={styles.topUpBtnText}>+ Top Up</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items List */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconWrap}>
                  <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Text style={styles.menuChevron}>&gt;</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 18,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffedd5',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  walletCard: {
    backgroundColor: '#ff8c00',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  walletLabel: {
    fontSize: 11,
    color: '#ffedd5',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  walletAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  topUpBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  topUpBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  menuChevron: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '800',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
  },
});
