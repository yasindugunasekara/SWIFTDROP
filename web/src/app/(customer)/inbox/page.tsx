'use client';

import { useState } from 'react';

export default function NotificationInboxPage() {
  const [notifications] = useState([
    { id: '1', title: 'Parcel Out for Delivery', message: 'Your parcel SWIFT-991122 is out for delivery with courier John.', time: '10 mins ago', read: false },
    { id: '2', title: 'Booking Confirmed', message: 'Booking for parcel SWIFT-782910 has been processed.', time: '2 hours ago', read: true }
  ]);

  const [preferences, setPreferences] = useState({
    sms: true,
    email: true,
    push: false
  });

  return (
    <div style={{ maxWidth: 800, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>🔔 Delivery Inbox & Notification Preferences</h2>
      <p style={{ color: '#9ca3af' }}>Real-time updates delivered via RabbitMQ message broker.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div>
          <h4>Recent Alerts</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ padding: '1rem', background: '#1e293b', borderRadius: 8, borderLeft: n.read ? '3px solid #64748b' : '3px solid #38bdf8' }}>
                <strong>{n.title}</strong>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#cbd5e1' }}>{n.message}</p>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <h4>Delivery Channel Preferences</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={preferences.sms} onChange={(e) => setPreferences({ ...preferences, sms: e.target.checked })} />
              SMS Alerts
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={preferences.email} onChange={(e) => setPreferences({ ...preferences, email: e.target.checked })} />
              Email Notifications
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={preferences.push} onChange={(e) => setPreferences({ ...preferences, push: e.target.checked })} />
              Push Notifications
            </label>
            <button
              onClick={() => alert('Preferences saved!')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer', marginTop: '0.5rem' }}
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
