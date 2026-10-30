'use client';

import { useState } from 'react';

export default function CourierTasksPage() {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [photoSelected, setPhotoSelected] = useState(false);

  return (
    <div style={{ maxWidth: 850, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>🚚 Courier Task Execution</h2>
      <p style={{ color: '#9ca3af' }}>Manage active assignments, update parcel delivery state, and upload photo proof.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <h4>Assigned Parcels (Active Queue)</h4>
          <div
            onClick={() => setSelectedTask({ id: 'SWIFT-991122', recipient: 'Robert Smith', address: '742 Evergreen Terrace' })}
            style={{ padding: '1rem', background: '#0f172a', borderRadius: 6, cursor: 'pointer', border: '1px solid #334155', marginTop: '0.75rem' }}
          >
            <strong>SWIFT-991122</strong>
            <p style={{ margin: '0.25rem 0', color: '#94a3b8' }}>To: Robert Smith</p>
            <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Status: OUT FOR DELIVERY</span>
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <h4>Task Actions & Proof of Delivery</h4>
          {selectedTask ? (
            <div>
              <p><strong>Parcel:</strong> {selectedTask.id}</p>
              <p><strong>Address:</strong> {selectedTask.address}</p>

              <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                <button style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
                  Mark Picked Up
                </button>
                <button style={{ background: '#10b981', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
                  Mark Delivered
                </button>
                <button style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
                  Mark Failed
                </button>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem' }}>Upload Proof Photo</label>
                <input type="file" onChange={() => setPhotoSelected(true)} style={{ color: '#94a3b8' }} />
                {photoSelected && <p style={{ color: '#34d399', fontSize: '0.85rem', marginTop: 4 }}>✓ Photo attached</p>}
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Select a task from the left to execute updates.</p>
          )}
        </div>
      </div>
    </div>
  );
}
