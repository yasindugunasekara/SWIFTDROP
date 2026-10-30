'use client';

import { useState } from 'react';

export default function WebhookCenterPage() {
  const [url, setUrl] = useState('https://merchant-api.example.com/webhooks/swiftdrop');
  const [attempts] = useState([
    { id: 'wh_1', event: 'PARCEL_DELIVERED', parcel: 'SWIFT-782910', status: 200, retries: 0, date: '12 mins ago' },
    { id: 'wh_2', event: 'PARCEL_FAILED', parcel: 'SWIFT-991122', status: 500, retries: 3, date: '1 hour ago', deadLetter: true }
  ]);

  return (
    <div style={{ maxWidth: 900, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>📡 Merchant Webhook Center</h2>
      <p style={{ color: '#9ca3af' }}>Configure automated HTTP callbacks with HMAC SHA-256 payload signing and retry tracking.</p>

      <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 8, marginTop: '1.5rem' }}>
        <h4>Webhook Endpoint Configuration</h4>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1, padding: '0.6rem', borderRadius: 6, background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
          />
          <button
            onClick={() => alert('Webhook endpoint updated!')}
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 6, cursor: 'pointer' }}
          >
            Update URL
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          Signing Secret: <code>whsec_791823901a89b7842efc</code> (Used in <code>X-SwiftDrop-Signature</code> header)
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h4>Delivery Attempt Audit & Dead-Letter Queue (DLQ)</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
              <th style={{ padding: '0.5rem' }}>Event</th>
              <th style={{ padding: '0.5rem' }}>Parcel ID</th>
              <th style={{ padding: '0.5rem' }}>HTTP Status</th>
              <th style={{ padding: '0.5rem' }}>Retries</th>
              <th style={{ padding: '0.5rem' }}>State</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '0.5rem' }}>{a.event}</td>
                <td style={{ padding: '0.5rem' }}>{a.parcel}</td>
                <td style={{ padding: '0.5rem', color: a.status === 200 ? '#10b981' : '#ef4444' }}>{a.status}</td>
                <td style={{ padding: '0.5rem' }}>{a.retries}</td>
                <td style={{ padding: '0.5rem' }}>
                  {a.deadLetter ? (
                    <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem' }}>
                      Dead Letter (DLQ)
                    </span>
                  ) : (
                    <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem' }}>
                      Success
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
