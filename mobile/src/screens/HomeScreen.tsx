import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
  onBookNow: (category?: string, promoCode?: string) => void;
  onTrackPress: (trackingId?: string) => void;
  onNotifications: () => void;
  userName?: string;
}

export default function HomeScreen({
  onBookNow,
  onTrackPress,
  onNotifications,
  userName = 'Kasun',
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('parcels');
  const [searchQuery, setSearchQuery] = useState('');
  const [balance, setBalance] = useState(120.00);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({ s1: true });

  const categories = [
    { id: 'parcels', label: 'Parcels', icon: '📦' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'electronics', label: 'Electronics', icon: '💻' },
    { id: 'gift_box', label: 'Gift Box', icon: '🎁' },
    { id: 'apparel', label: 'Apparel', icon: '👕' },
    { id: 'heavy_cargo', label: 'Heavy Cargo', icon: '🚚' },
  ];

  const popularServices = [
    {
      id: 's1',
      title: 'Same-Day Express',
      price: 'From $8.50',
      time: 'Under 2 hours',
      tag: '15% OFF',
      category: 'parcels',
      image: require('../../assets/service-express.jpg'),
    },
    {
      id: 's2',
      title: 'Standard Priority',
      price: 'From $4.50',
      time: 'Next day verified',
      tag: 'Popular',
      category: 'documents',
      image: require('../../assets/service-tracking.jpg'),
    },
    {
      id: 's3',
      title: 'Fragile Electronics',
      price: 'From $12.50',
      time: 'Insured bubble pack',
      tag: 'Safe POD',
      category: 'electronics',
      image: require('../../assets/service-pod.jpg'),
    },
    {
      id: 's4',
      title: 'Heavy Island Cargo',
      price: 'From $25.00',
      time: 'Pallets & bulk boxes',
      tag: '15% OFF',
      category: 'heavy_cargo',
      image: require('../../assets/service-api.jpg'),
    },
  ];

  const orderMenuItems = [
    {
      id: 'SWIFT-991122',
      title: 'Document Envelope',
      price: '+$4.50',
      qty: 'x1',
      icon: '📄',
      status: 'In Transit',
      eta: '14 mins away',
    },
    {
      id: 'SWIFT-882233',
      title: 'Electronics Package',
      price: '+$12.50',
      qty: 'x1',
      icon: '💻',
      status: 'Out for Delivery',
      eta: 'Arriving today',
    },
    {
      id: 'SWIFT-782910',
      title: 'Express Care Gift',
      price: '+$6.20',
      qty: 'x1',
      icon: '🎁',
      status: 'Confirmed',
      eta: 'Pickup scheduled',
    },
  ];

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTopUp = () => {
    setBalance(prev => prev + 25);
    Alert.alert('Wallet Top-Up', 'Successfully added $25.00 to your SwiftDrop Wallet! New Balance: $' + (balance + 25).toFixed(2));
  };

  const handleTransfer = () => {
    Alert.alert('Transfer Balance', 'Instant transfer to bank account or mobile wallet initiated.');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.brandLogo}>
              swiftdrop<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.greetingTitle}>Hello, {userName}</Text>
            <Text style={styles.greetingSubtitle}>
              Ready to dispatch or track your island deliveries today?
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={onNotifications}
              style={styles.iconCircle}
              activeOpacity={0.7}
              accessibilityLabel="Notifications"
            >
              <Text style={{ fontSize: 16 }}>🔔</Text>
              <View style={styles.badgeDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircle}
              activeOpacity={0.7}
              accessibilityLabel="Settings"
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </TouchableOpacity>

            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {userName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="What parcel do you want to send today..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterPill} activeOpacity={0.7}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Promo Banner (Vivid Orange Rounded Card) */}
        <View style={styles.promoBanner}>
          <View style={styles.promoTextCol}>
            <Text style={styles.promoPreTitle}>Get Discount Voucher</Text>
            <Text style={styles.promoTitle}>Up To 20%</Text>
            <Text style={styles.promoSubtitle}>
              Doorstep pickup within 15 minutes. Island-wide live GPS tracking with verified recipient signature on delivery.
            </Text>
            <TouchableOpacity
              style={styles.promoButton}
              onPress={() => onBookNow('parcels', 'SWIFT20')}
              activeOpacity={0.85}
            >
              <Text style={styles.promoButtonText}>Claim Voucher →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.promoImageContainer}>
            <Image
              source={require('../../assets/hero-3d.png')}
              style={styles.promoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Your Balance Widget (From First Screenshot) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Balance</Text>
        </View>
        <View style={styles.balanceCard}>
          <View style={styles.balancePill}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceActionBtn}
              onPress={handleTopUp}
              activeOpacity={0.8}
            >
              <Text style={styles.balanceActionIcon}>+</Text>
              <Text style={styles.balanceActionText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.balanceActionBtn}
              onPress={handleTransfer}
              activeOpacity={0.8}
            >
              <Text style={styles.balanceActionIcon}>⇄</Text>
              <Text style={styles.balanceActionText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Section (From First Screenshot) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category</Text>
          <TouchableOpacity onPress={() => onBookNow()}>
            <Text style={styles.viewAllText}>View all &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesGrid}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  onBookNow(cat.id);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.categoryIconBadge,
                    isSelected && styles.categoryIconBadgeActive,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Your Address Section (From First Screenshot) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Address</Text>
          <TouchableOpacity onPress={() => Alert.alert('Address Book', 'Select or add a new delivery destination.')}>
            <Text style={styles.viewAllText}>Change</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.addressCard}>
          <View style={styles.addressHeaderRow}>
            <View style={styles.addressPinWrap}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>Elm Street, 23 (Colombo 03)</Text>
              <Text style={styles.addressSubtitle}>Apartment 4B, Duplication Rd, Western Province</Text>
            </View>
          </View>
          <View style={styles.addressActionsRow}>
            <TouchableOpacity
              style={styles.addressPillBtn}
              onPress={() => Alert.alert('Address Details', 'Apartment 4B, Buzzer #12, 4th Floor')}
            >
              <Text style={styles.addressPillText}>+ Add Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addressPillBtn}
              onPress={() => Alert.alert('Address Note', 'Leave package with security if away')}
            >
              <Text style={styles.addressPillText}>+ Add Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Menu / Active Deliveries (From First Screenshot) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Menu</Text>
          <Text style={styles.orderCountBadge}>{orderMenuItems.length} items</Text>
        </View>

        <View style={styles.orderMenuContainer}>
          {orderMenuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.orderMenuItem}
              onPress={() => onTrackPress(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.orderMenuIconWrap}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderMenuTitle}>{item.title}</Text>
                <Text style={styles.orderMenuEta}>{item.status} • {item.eta}</Text>
              </View>
              <View style={styles.orderMenuPriceCol}>
                <Text style={styles.orderMenuPrice}>{item.price}</Text>
                <View style={styles.orderMenuQtyPill}>
                  <Text style={styles.orderMenuQtyText}>{item.qty}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Services Section (From First Screenshot) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          <TouchableOpacity onPress={() => onBookNow()}>
            <Text style={styles.viewAllText}>View all &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalServicesScroll}
        >
          {popularServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.popularServiceCard}
              onPress={() => onBookNow(service.category)}
              activeOpacity={0.85}
            >
              <View style={styles.serviceCardTopRow}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{service.tag}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavorite(service.id)}
                  style={styles.favoriteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.favoriteHeart, favorites[service.id] && styles.favoriteHeartActive]}>
                    {favorites[service.id] ? '❤️' : '🤍'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Image source={service.image} style={styles.popularServiceImage} resizeMode="contain" />

              <Text style={styles.popularServiceTitle}>{service.title}</Text>
              <Text style={styles.popularServiceTime}>{service.time}</Text>

              <View style={styles.popularServiceBottom}>
                <Text style={styles.popularServicePrice}>{service.price}</Text>
                <View style={styles.popularServiceAddBtn}>
                  <Text style={styles.popularServiceAddPlus}>+</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  brandLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  brandDot: {
    color: Colors.primary,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 6,
    right: 6,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitials: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  filterPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBanner: {
    backgroundColor: Colors.primaryOrange,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: Colors.primaryOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  promoTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  promoPreTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    opacity: 0.95,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  promoSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    marginBottom: 14,
  },
  promoButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  promoButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  promoImageContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoImage: {
    width: 100,
    height: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  balanceCard: {
    backgroundColor: Colors.balanceCardBg,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: Colors.balanceCardBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  balancePill: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 120,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  balanceActionIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  balanceActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: (width > 440 ? 440 : width - 36) / 3 - 8,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#fff7ed',
  },
  categoryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIconBadgeActive: {
    backgroundColor: '#ffe8d6',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: Colors.primary,
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  addressPinWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  addressActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  addressPillBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  orderCountBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  orderMenuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  orderMenuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderMenuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderMenuEta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  orderMenuPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderMenuPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.primary,
  },
  orderMenuQtyPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderMenuQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  horizontalServicesScroll: {
    gap: 12,
    paddingRight: 10,
  },
  popularServiceCard: {
    width: 170,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.danger,
  },
  favoriteBtn: {
    padding: 2,
  },
  favoriteHeart: {
    fontSize: 14,
  },
  favoriteHeartActive: {
    color: Colors.danger,
  },
  popularServiceImage: {
    width: '100%',
    height: 80,
    marginBottom: 10,
  },
  popularServiceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  popularServiceTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 10,
  },
  popularServiceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  popularServicePrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  popularServiceAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularServiceAddPlus: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
});
