'use client';

import { useState } from 'react';

export default function ExceptionsPage() {
  const [selectedException, setSelectedException] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [status, setStatus] = useState('INVESTIGATING');

  const exceptions = [
    { id: 'exc-1', parcelId: 'SWIFT-991122', issue: 'Customer not home after 3 attempts', loggedBy: 'Courier John', date: 'Today, 2:15 PM' },
    { id: 'exc-2', parcelId: 'SWIFT-443322', issue: 'Damaged barcode scan label', loggedBy: 'Sorting Hub B', date: 'Today, 11:30 AM' }
  ];

  const handleResolve = () => {
    alert(`Exception for ${selectedException.parcelId} updated to ${status} with note: "${resolutionNote}"`);
    setSelectedException(null);
    setResolutionNote('');
  };

  return (
    <div style={{ maxWidth: 950, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>🛠️ Parcel Support & Exception Management</h2>
      <p style={{ color: '#9ca3af' }}>Triage delivery failures, append resolution audit trails, and update exception states.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div>
          <h4>Open Delivery Exceptions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {exceptions.map((exc) => (
              <div
                key={exc.id}
                onClick={() => setSelectedException(exc)}
                style={{
                  padding: '1rem',
                  background: '#1e293b',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: selectedException?.id === exc.id ? '2px solid #38bdf8' : '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{exc.parcelId}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#f87171' }}>EXCEPTION</span>
                </div>
                <p style={{ margin: '0.4rem 0', color: '#e2e8f0', fontSize: '0.9rem' }}>{exc.issue}</p>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Logged by: {exc.loggedBy} • {exc.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 8 }}>
          <h4>Resolution Workspace & Audit Trail</h4>
          {selectedException ? (
            <div>
              <p><strong>Resolving:</strong> {selectedException.parcelId}</p>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>Resolution Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
                >
                  <option value="INVESTIGATING">Under Investigation</option>
                  <option value="RESCHEDULED">Reschedule Delivery</option>
                  <option value="RETURNED_TO_SENDER">Return to Sender</option>
                  <option value="REFUNDED">Mark Refunded / Closed</option>
                </select>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>Support Agent Note</label>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Enter audit resolution details..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#0f172a', color: '#fff', border: '1px solid #334155', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={handleResolve}
                style={{ marginTop: '1rem', width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                Log Audit & Resolve
              </button>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Select an exception item on the left to triage and resolve.</p>
          )}
        </div>
      </div>
    </div>
  );
}
