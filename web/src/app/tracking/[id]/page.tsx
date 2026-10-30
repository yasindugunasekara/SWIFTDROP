'use client';

import { use, useEffect, useState } from 'react';

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [trackingNumber, setTrackingNumber] = useState(id || 'SWIFT-DEMO');
  const [timeline, setTimeline] = useState([
    { status: 'BOOKING CONFIRMED', time: '10:00 AM', completed: true },
    { status: 'COURIER ASSIGNED', time: '11:15 AM', completed: true },
    { status: 'PARCEL PICKED UP', time: '12:30 PM', completed: true },
    { status: 'IN TRANSIT', time: '02:00 PM', completed: true },
    { status: 'DELIVERED', time: 'Pending', completed: false }
  ]);

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>📍 Live Parcel Tracking</h2>
      <p style={{ color: '#9ca3af' }}>Public tracking page with real-time status updates.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          style={{ flex: 1, padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151' }}
        />
        <button
          onClick={() => alert(`Fetching tracking for ${trackingNumber}`)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 6, cursor: 'pointer' }}
        >
          Track
        </button>
      </div>

      <div style={{ padding: '1.5rem', background: '#1e293b', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Tracking ID</span>
            <h3 style={{ margin: 0, color: '#f8fafc' }}>{trackingNumber}</h3>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status</span>
            <h3 style={{ margin: 0, color: '#38bdf8' }}>IN TRANSIT</h3>
          </div>
        </div>

        <h4 style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginTop: '1.5rem' }}>Status Timeline</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {timeline.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: item.completed ? '#10b981' : '#475569'
              }} />
              <div style={{ flex: 1 }}>
                <strong>{item.status}</strong>
                <span style={{ marginLeft: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
