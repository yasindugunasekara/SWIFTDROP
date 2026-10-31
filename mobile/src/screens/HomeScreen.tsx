import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
  onBookNow: () => void;
  onTrackPress: (trackingId?: string) => void;
  onNotifications: () => void;
}

export default function HomeScreen({ onBookNow, onTrackPress, onNotifications }: Props) {
  const quickActions = [
    { id: 'send', label: 'Send Package', icon: '📦', action: onBookNow },
    { id: 'track', label: 'Track Package', icon: '📍', action: () => onTrackPress('SWIFT-991122') },
    { id: 'express', label: 'Island Express', icon: '⚡', action: onBookNow },
    { id: 'freight', label: 'B2B Cargo', icon: '🚚', action: onBookNow },
  ];

  const popularServices = [
    {
      id: 's1',
      title: 'Same-Day Express',
      price: 'From $8.50',
      time: 'Under 2 hours',
      tag: '15% Off',
      image: require('../../assets/service-express.jpg'),
    },
    {
      id: 's2',
      title: 'Standard Priority',
      price: 'From $4.50',
      time: 'Next day verified',
      tag: 'Popular',
      image: require('../../assets/service-tracking.jpg'),
    },
    {
      id: 's3',
      title: 'Fragile Electronics',
      price: 'From $12.50',
      time: 'Insured bubble pack',
      tag: 'Safe POD',
      image: require('../../assets/service-pod.jpg'),
    },
    {
      id: 's4',
      title: 'Heavy Island Cargo',
      price: 'From $25.00',
      time: 'Pallets & bulk boxes',
      tag: 'Freight',
      image: require('../../assets/service-api.jpg'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.locationSelector} activeOpacity={0.7}>
            <Text style={styles.locationPin}>📍</Text>
            <View>
              <Text style={styles.locationLabel}>Deliver to</Text>
              <Text style={styles.locationText}>Colombo, Sri Lanka ▾</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={onNotifications}
              style={styles.iconCircle}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>🔔</Text>
              <View style={styles.badgeDot} />
            </TouchableOpacity>

            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>AS</Text>
            </View>
          </View>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a service, package or location..."
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Hero Promo Banner (Vibrant Orange Gradient Card) */}
        <View style={styles.promoBanner}>
          <View style={styles.promoTextCol}>
            <Text style={styles.promoTitle}>Send Packages{'\n'}Anywhere</Text>
            <Text style={styles.promoSubtitle}>
              Fast, reliable and secure delivery island-wide.
            </Text>
            <TouchableOpacity
              style={styles.promoButton}
              onPress={onBookNow}
              activeOpacity={0.85}
            >
              <Text style={styles.promoButtonText}>Book Now &rarr;</Text>
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

        {/* Quick Actions (4 Circular Items) */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.actionItem}
              onPress={item.action}
              activeOpacity={0.75}
            >
              <View style={styles.actionIconBadge}>
                <Text style={styles.actionEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active In-Transit Shipment Card */}
        <View style={styles.activeTrackingCard}>
          <View style={styles.activeTrackingHeader}>
            <View style={styles.trackingTag}>
              <View style={styles.pulsingDot} />
              <Text style={styles.trackingTagText}>LIVE IN TRANSIT</Text>
            </View>
            <Text style={styles.etaText}>Arriving in 14 mins</Text>
          </View>

          <View style={styles.trackingBody}>
            <View style={styles.packageIconWrap}>
              <Text style={{ fontSize: 24 }}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trackingCode}>#SWIFT-991122</Text>
              <Text style={styles.trackingRoute}>Pettah &rarr; 742 Evergreen Terrace</Text>
              <Text style={styles.courierName}>Courier: Sunil Silva (#101)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.trackDetailsButton}
            onPress={() => onTrackPress('SWIFT-991122')}
            activeOpacity={0.8}
          >
            <Text style={styles.trackDetailsText}>View Live Map Tracking &rarr;</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Services Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          <TouchableOpacity onPress={onBookNow}>
            <Text style={styles.viewAllText}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          {popularServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={onBookNow}
              activeOpacity={0.8}
            >
              <View style={styles.serviceTagWrap}>
                <Text style={styles.serviceTag}>{service.tag}</Text>
              </View>

              <Image source={service.image} style={styles.serviceCardImage} resizeMode="contain" />

              <Text style={styles.serviceCardTitle}>{service.title}</Text>
              <Text style={styles.serviceCardTime}>{service.time}</Text>

              <View style={styles.serviceCardBottom}>
                <Text style={styles.serviceCardPrice}>{service.price}</Text>
                <View style={styles.addCircle}>
                  <Text style={styles.addPlus}>+</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationPin: {
    fontSize: 20,
  },
  locationLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 8,
    right: 8,
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
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  promoBanner: {
    backgroundColor: '#ff8c00',
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  promoTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 6,
  },
  promoSubtitle: {
    fontSize: 11,
    color: '#ffedd5',
    lineHeight: 16,
    marginBottom: 14,
  },
  promoButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  promoImageContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoImage: {
    width: 90,
    height: 90,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    width: (width - 40) / 4,
  },
  actionIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  activeTrackingCard: {
    backgroundColor: '#fffaf5',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ffedd5',
    marginBottom: 24,
  },
  activeTrackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  trackingTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  trackingBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  packageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  trackingRoute: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  courierName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  trackDetailsButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  trackDetailsText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  serviceTagWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
  },
  serviceTag: {
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: '#fff7ed',
    color: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceCardImage: {
    width: '100%',
    height: 80,
    marginBottom: 8,
    marginTop: 10,
  },
  serviceCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  serviceCardTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 10,
  },
  serviceCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  serviceCardPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  addCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
});
