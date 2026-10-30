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
    <div className="max-w-2xl mx-auto px-4 pt-28 sm:pt-32 pb-12">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)]">
        <h2 className="text-2xl font-black text-slate-900 mb-1">📍 Live Parcel Tracking</h2>
        <p className="text-sm text-slate-500 mb-6">Public tracking page with real-time status updates.</p>

        <div className="flex gap-2 mb-8">
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 text-slate-900 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
          />
          <button
            onClick={() => alert(`Tracking parcel ${trackingNumber}`)}
            className="px-6 py-2.5 bg-[#ff6600] hover:bg-[#ea580c] text-white rounded-full text-sm font-bold shadow-sm transition-all"
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
