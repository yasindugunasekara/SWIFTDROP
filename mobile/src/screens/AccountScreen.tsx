import React, { useRef, useState } from 'react';
import { updateMobileProfile, requestMobilePasswordReset } from '../services/auth';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userRole: 'customer' | 'courier';
  loggingOut: boolean;
  logoutError: string;
  onLogout: () => void;
  onNavigateOrders: () => void;
}

export default function AccountScreen({ userName, userEmail, userPhone, userRole, loggingOut, logoutError, onLogout, onNavigateOrders }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function perform(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please retry.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
              {userEmail}
            </Text>
            <Text style={styles.userEmail}>{userPhone || 'Phone not provided'}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>
                {userRole === 'courier' ? 'Courier' : 'Customer'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity accessibilityRole="button" style={styles.menuItem} disabled={busy || loggingOut} onPress={onNavigateOrders}><Text>{userRole === 'courier' ? 'My tasks' : 'My orders'}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.menuItem} disabled={busy || loggingOut} onPress={() => { setName(userName); setPhone(userPhone || ''); setMessage(''); setError(''); setEditing(true); }}><Text>Edit profile</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.menuItem} disabled={busy || loggingOut} onPress={() => void perform(async () => { setMessage(await requestMobilePasswordReset(userEmail)); })}><Text>{busy ? 'Please wait...' : 'Send password reset email'}</Text></TouchableOpacity>
        </View>
        {editing && <View style={{ gap: 12, marginBottom: 20 }}>
          <Text>Full name</Text>
          <TextInput accessibilityLabel="Full name" value={name} onChangeText={setName} editable={!busy && !loggingOut} maxLength={150} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 }} />
          <Text>Phone number</Text>
          <TextInput accessibilityLabel="Phone number" value={phone} onChangeText={setPhone} editable={!busy && !loggingOut} maxLength={30} keyboardType="phone-pad" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 }} />
          <TouchableOpacity accessibilityRole="button" disabled={busy || loggingOut} onPress={() => void perform(async () => {
            if (name.trim().length < 2) throw new Error('Enter a name with at least 2 characters.');
            await updateMobileProfile(name, phone); setEditing(false); setMessage('Profile saved.');
          })}><Text style={{ color: Colors.primary }}>{busy ? 'Saving...' : 'Save profile'}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setEditing(false)}><Text>Cancel</Text></TouchableOpacity>
        </View>}
        {message ? <Text accessibilityLiveRegion="polite" style={{ marginBottom: 16, color: '#15803d' }}>{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={{ marginBottom: 16, color: '#b91c1c' }}>{error}</Text> : null}


        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          disabled={loggingOut || busy}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>{loggingOut ? 'Logging out...' : 'Log Out'}</Text>
        </TouchableOpacity>
        {logoutError ? <Text accessibilityRole="alert" style={{ marginTop: 12, color: '#b91c1c' }}>{logoutError}</Text> : null}

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
