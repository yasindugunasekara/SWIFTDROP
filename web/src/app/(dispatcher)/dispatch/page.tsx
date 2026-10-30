'use client';

import { useState } from 'react';

export default function DispatchBoardPage() {
  const [couriers] = useState([
    { id: 'c-1', name: 'John Doe', activeDeliveries: 3, status: 'AVAILABLE' },
    { id: 'c-2', name: 'Sarah Lee', activeDeliveries: 5, status: 'BUSY' },
    { id: 'c-3', name: 'Mike Ross', activeDeliveries: 1, status: 'AVAILABLE' }
  ]);

  return (
    <div style={{ maxWidth: 1000, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>🗂️ Dispatch & Courier Assignment Board</h2>
      <p style={{ color: '#9ca3af' }}>Manage unassigned orders and balance courier workloads in real-time.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        <div>
          <h4>Unassigned Parcels</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>SWIFT-102938</strong>
                <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>UNASSIGNED</span>
              </div>
              <p style={{ margin: '0.5rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>Pickup: Brooklyn, NY → Delivery: Queens, NY</p>
              <button
                onClick={() => alert('Assigned to recommended courier!')}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Assign to Available Courier
              </button>
            </div>
          </div>
        </div>

        <div>
          <h4>Courier Workload Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {couriers.map((c) => (
              <div key={c.id} style={{ padding: '0.75rem 1rem', background: '#1e293b', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Load: {c.activeDeliveries} parcels</div>
                </div>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  background: c.status === 'AVAILABLE' ? '#065f46' : '#991b1b',
                  color: c.status === 'AVAILABLE' ? '#6ee7b7' : '#fca5a5'
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
