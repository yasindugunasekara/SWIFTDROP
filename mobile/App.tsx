import React, { useState } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TrackScreen from './src/screens/TrackScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import AccountScreen from './src/screens/AccountScreen';
import BookDeliveryModal from './src/screens/BookDeliveryModal';
import BottomNavBar, { TabKey } from './src/components/BottomNavBar';
import { Colors } from './src/theme/colors';

const { width } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'login' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [userRole, setUserRole] = useState<'customer' | 'courier'>('customer');
  const [userName, setUserName] = useState('Alex Silva');
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [activeTrackingId, setActiveTrackingId] = useState('SWIFT-991122');

  const handleLoginSuccess = (role: 'customer' | 'courier', name: string) => {
    setUserRole(role);
    setUserName(name);
    setCurrentScreen('main');
    setActiveTab(role === 'courier' ? 'track' : 'home');
  };

  const handleTrackPress = (id?: string) => {
    if (id) setActiveTrackingId(id);
    setActiveTab('track');
  };

  const handleBookingComplete = (newTrackingId: string) => {
    setBookModalVisible(false);
    setActiveTrackingId(newTrackingId);
    setActiveTab('track');
  };

  const handleLogout = () => {
    setCurrentScreen('splash');
    setActiveTab('home');
  };

  // Render active content
  const renderMainContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onBookNow={() => setBookModalVisible(true)}
            onTrackPress={handleTrackPress}
            onNotifications={() => setActiveTab('orders')}
          />
        );
      case 'orders':
        return <OrdersScreen onTrackOrder={handleTrackPress} />;
      case 'track':
        return <TrackScreen initialTrackingId={activeTrackingId} />;
      case 'account':
        return (
          <AccountScreen
            userName={userName}
            userRole={userRole}
            onLogout={handleLogout}
            onNavigateOrders={() => setActiveTab('orders')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Responsive Device Wrapper for Web / Desktop */}
      <View style={styles.phoneFrame}>
        {currentScreen === 'splash' && (
          <SplashScreen
            onGetStarted={() => setCurrentScreen('login')}
            onLogin={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setCurrentScreen('splash')}
          />
        )}

        {currentScreen === 'main' && (
          <View style={styles.appShell}>
            <View style={styles.screenArea}>{renderMainContent()}</View>
            <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Global 3-Step Booking Wizard Modal */}
            <BookDeliveryModal
              visible={bookModalVisible}
              onClose={() => setBookModalVisible(false)}
              onBookingComplete={handleBookingComplete}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxHeight: width > 500 ? 900 : '100%',
        borderRadius: width > 500 ? 36 : 0,
        boxShadow: width > 500 ? '0 25px 60px -15px rgba(0, 0, 0, 0.15)' : 'none',
        borderWidth: width > 500 ? 1 : 0,
        borderColor: '#e2e8f0',
      },
    }),
  },
  appShell: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenArea: {
    flex: 1,
  },
});
