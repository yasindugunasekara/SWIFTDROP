import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
  AppState,
  Text,
  TouchableOpacity,
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
import { getMobileUser, initializeMobileAuth, logoutMobile, setMobileAuthActive, subscribeMobileAuth, type MobileUser } from './src/services/auth';
import TaskListScreen from './src/screens/courier/TaskListScreen';

const { width } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'login' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const user = useSyncExternalStore(subscribeMobileAuth, getMobileUser, () => null);
  const userRole = user?.role === 'COURIER' ? 'courier' : 'customer';
  const [restoring, setRestoring] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [activeTrackingId, setActiveTrackingId] = useState('SWIFT-991122');

  const handleLoginSuccess = (profile: MobileUser) => {
    setCurrentScreen('main');
    setActiveTab(profile.role === 'COURIER' ? 'orders' : 'home');
  };

  useEffect(() => {
    let mounted = true;
    initializeMobileAuth().catch(() => { if (mounted) setSessionError('Unable to verify your session. Check your connection and retry.'); })
      .finally(() => { if (mounted) setRestoring(false); });
    const subscription = AppState.addEventListener('change', state => {
      void setMobileAuthActive(state === 'active').then(() => { if (mounted) setSessionError(''); })
        .catch(() => { if (mounted) setSessionError('Unable to verify your session. Check your connection and retry.'); });
    });
    return () => { mounted = false; subscription.remove(); void setMobileAuthActive(false).catch(() => undefined); };
  }, []);

  useEffect(() => {
    if (user) {
      setCurrentScreen('main');
      setActiveTab(user.role === 'COURIER' ? 'orders' : 'home');
    } else {
      setCurrentScreen(previous => previous === 'main' ? 'login' : previous);
      setBookModalVisible(false);
      setActiveTrackingId('');
    }
  }, [user?.id]);

  const handleTrackPress = (id?: string) => {
    if (id) setActiveTrackingId(id);
    setActiveTab('track');
  };

  const handleBookingComplete = (newTrackingId: string) => {
    setBookModalVisible(false);
    setActiveTrackingId(newTrackingId);
    setActiveTab('track');
  };

  const handleLogout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true; setLoggingOut(true); setLogoutError('');
    try {
      await logoutMobile();
      setCurrentScreen('login'); setActiveTab('home'); setBookModalVisible(false);
    } catch (failure) {
      setLogoutError(failure instanceof Error ? failure.message : 'Unable to sign out. Please retry.');
    } finally { logoutPending.current = false; setLoggingOut(false); }
  };

  // Render active content
  const renderMainContent = () => {
    switch (activeTab) {
      case 'home':
        if (userRole === 'courier') return <TaskListScreen navigation={undefined} />;
        return (
          <HomeScreen
            onBookNow={() => setBookModalVisible(true)}
            onTrackPress={handleTrackPress}
            onNotifications={() => setActiveTab('orders')}
          />
        );
      case 'orders':
        if (userRole === 'courier') return <TaskListScreen navigation={undefined} />;
        return <OrdersScreen onTrackOrder={handleTrackPress} />;
      case 'track':
        return <TrackScreen initialTrackingId={activeTrackingId} />;
      case 'account':
        return (
          <AccountScreen
            userName={user?.fullName || ''}
            userEmail={user?.email || ''}
            userPhone={user?.phone || null}
            userRole={userRole}
            loggingOut={loggingOut}
            logoutError={logoutError}
            onLogout={handleLogout}
            onNavigateOrders={() => setActiveTab('orders')}
          />
        );
      default:
        return null;
    }
  };

  if (restoring || sessionError) return <SafeAreaView style={styles.outerContainer}>
    <Text accessibilityRole={sessionError ? 'alert' : 'text'}>{sessionError || 'Restoring your session...'}</Text>
    {sessionError ? <TouchableOpacity onPress={() => {
      setSessionError(''); setRestoring(true);
      void initializeMobileAuth().catch(() => setSessionError('Unable to verify your session. Check your connection and retry.')).finally(() => setRestoring(false));
    }}><Text style={{ marginTop: 20, color: Colors.primary }}>Retry</Text></TouchableOpacity> : null}
  </SafeAreaView>;

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

        {currentScreen === 'main' && user && (
          <View style={styles.appShell}>
            <View style={styles.screenArea}>{renderMainContent()}</View>
            <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Global 3-Step Booking Wizard Modal */}
            {userRole === 'customer' && <BookDeliveryModal
              visible={bookModalVisible}
              onClose={() => setBookModalVisible(false)}
              onBookingComplete={handleBookingComplete}
            />}
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
