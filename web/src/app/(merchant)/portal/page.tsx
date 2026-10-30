'use client';

import { useState } from 'react';

export default function MerchantPortalPage() {
  const [apiKey, setApiKey] = useState('sw_live_d8a1c93f0b4842e6a9f1c7e9');

  return (
    <div style={{ maxWidth: 900, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>🏢 Merchant B2B Portal & Partner API</h2>
      <p style={{ color: '#9ca3af' }}>Manage bulk orders, onboarding status, and secure Partner API credentials.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 8 }}>
          <h4>API Credentials & Authentication</h4>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Include this API Key in the <code>X-API-KEY</code> header for automated order injections.</p>

          <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: 6, border: '1px solid #334155', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
            {apiKey}
          </div>

          <button
            onClick={() => {
              setApiKey('sw_live_' + Math.random().toString(36).substring(2));
              alert('New API Key generated!');
            }}
            style={{ marginTop: '1rem', background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Regenerate API Key
          </button>
        </div>

        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 8 }}>
          <h4>Partner API Quick Reference</h4>
          <pre style={{ background: '#0f172a', padding: '0.75rem', borderRadius: 6, fontSize: '0.8rem', color: '#38bdf8', overflowX: 'auto' }}>
{`POST /api/v1/merchant/partner/orders
Headers:
  X-API-KEY: ${apiKey}
  Content-Type: application/json

Body:
{
  "recipientName": "John Doe",
  "deliveryAddress": "123 Elm St",
  "weightKg": 2.5
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
