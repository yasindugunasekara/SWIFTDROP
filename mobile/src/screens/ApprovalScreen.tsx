import React, { useRef, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { loadMobileProfile, type MobileUser } from '../services/auth';
import { Colors } from '../theme/colors';

export default function ApprovalScreen({ user, onLogout, loggingOut, logoutError }: {
  user: MobileUser; onLogout: () => void; loggingOut: boolean; logoutError: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  return <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}><View style={{ gap: 18 }}>
    <Text style={{ fontSize: 26, fontWeight: '700' }}>{user.application?.requestedRole === 'COURIER' ? 'Courier' : 'Business'} account approval</Text>
    <Text>{user.application?.status === 'REJECTED' ? 'Your application was declined. Contact SwiftDrop support.' : 'Your application is awaiting staff approval.'}</Text>
    {user.application?.reviewNote ? <Text>Review note: {user.application.reviewNote}</Text> : null}
    {user.application?.requestedRole === 'MERCHANT' ? <Text>After approval, use the web portal for your business workspace.</Text> : null}
    {error || logoutError ? <Text accessibilityRole="alert" style={{ color: '#b91c1c' }}>{error || logoutError}</Text> : null}
    <TouchableOpacity disabled={busy || loggingOut} accessibilityRole="button" onPress={async () => {
      if (pending.current) return; pending.current = true; setBusy(true); setError('');
      try { await loadMobileProfile(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to check status.'); }
      finally { pending.current = false; setBusy(false); }
    }} style={{ backgroundColor: Colors.primary, borderRadius: 12, padding: 15 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Checking...' : 'Check status'}</Text></TouchableOpacity>
    <TouchableOpacity disabled={busy || loggingOut} onPress={onLogout} accessibilityRole="button"><Text style={{ textAlign: 'center', color: Colors.primary }}>{loggingOut ? 'Signing out...' : 'Sign out'}</Text></TouchableOpacity>
  </View></SafeAreaView>;
}
