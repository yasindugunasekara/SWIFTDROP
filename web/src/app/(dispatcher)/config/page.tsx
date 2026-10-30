'use client';

export default function ServiceConfigPage() {
  return (
    <div style={{ maxWidth: 750, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>⚙️ Service & Pricing Configuration</h2>
      <p style={{ color: '#9ca3af' }}>Administrator control panel for delivery zones, base fees, and merchant approvals.</p>

      <div style={{ marginTop: '1.5rem', background: '#1e293b', padding: '1.5rem', borderRadius: 8 }}>
        <h4>Delivery Zones & Rates</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8' }}>Base Rate ($)</label>
            <input defaultValue="10.00" style={{ width: '100%', padding: '0.5rem', borderRadius: 6, background: '#0f172a', color: '#fff', border: '1px solid #334155', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8' }}>Per Kg Rate ($)</label>
            <input defaultValue="2.50" style={{ width: '100%', padding: '0.5rem', borderRadius: 6, background: '#0f172a', color: '#fff', border: '1px solid #334155', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8' }}>Per Km Rate ($)</label>
            <input defaultValue="1.20" style={{ width: '100%', padding: '0.5rem', borderRadius: 6, background: '#0f172a', color: '#fff', border: '1px solid #334155', boxSizing: 'border-box' }} />
          </div>
        </div>
        <button style={{ marginTop: '1rem', background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
          Save Configuration
        </button>
      </div>

      <div style={{ marginTop: '1.5rem', background: '#1e293b', padding: '1.5rem', borderRadius: 8 }}>
        <h4>Pending Merchant Approvals</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div>
            <strong>Acme Electronics LLC</strong>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Registration: #US-8877123</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
            <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 4, cursor: 'pointer' }}>Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}
