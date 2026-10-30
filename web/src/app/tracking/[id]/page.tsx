'use client';

import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';

function TrackingContent() {
  const params = useParams();
  const id = (params?.id as string) || 'SWIFT-DEMO';
  const [trackingNumber, setTrackingNumber] = useState(id);
  const [timeline] = useState([
    { status: 'BOOKING CONFIRMED', time: '10:00 AM', completed: true },
    { status: 'COURIER ASSIGNED', time: '11:15 AM', completed: true },
    { status: 'PARCEL PICKED UP', time: '12:30 PM', completed: true },
    { status: 'IN TRANSIT', time: '02:00 PM', completed: true },
    { status: 'DELIVERED', time: 'Pending', completed: false }
  ]);

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '2rem', background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <h2 style={{ color: '#0f172a', fontWeight: 800 }}>📍 Live Parcel Tracking</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Public tracking page with real-time status updates.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: 9999, background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}
        />
        <button
          onClick={() => alert(`Fetching tracking for ${trackingNumber}`)}
          style={{ background: '#ff6600', color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: 9999, fontWeight: 600, cursor: 'pointer' }}
        >
          Track
        </button>
      </div>

      <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tracking ID</span>
            <h3 style={{ margin: 0, color: '#0f172a' }}>{trackingNumber}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Status</span>
            <h3 style={{ margin: 0, color: '#ff6600' }}>IN TRANSIT</h3>
          </div>
        </div>

        <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '1.5rem', color: '#334155' }}>Status Timeline</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {timeline.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: item.completed ? '#10b981' : '#cbd5e1'
              }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#1e293b' }}>{item.status}</strong>
                <span style={{ marginLeft: '1rem', color: '#64748b', fontSize: '0.85rem' }}>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading tracking data...</div>}>
      <TrackingContent />
    </Suspense>
  );
}
