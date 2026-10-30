'use client';

export default function HistoryPage() {
  return (
    <div style={{ maxWidth: 800, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>📜 My Delivery History & Receipts</h2>
      <p style={{ color: '#9ca3af' }}>Authenticated view of your past orders and downloadable VAT receipts.</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
            <th style={{ padding: '0.75rem' }}>Tracking #</th>
            <th style={{ padding: '0.75rem' }}>Recipient</th>
            <th style={{ padding: '0.75rem' }}>Fee</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
            <th style={{ padding: '0.75rem' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #1f2937' }}>
            <td style={{ padding: '0.75rem' }}>SWIFT-782910</td>
            <td style={{ padding: '0.75rem' }}>Alice Johnson</td>
            <td style={{ padding: '0.75rem' }}>$17.50</td>
            <td style={{ padding: '0.75rem', color: '#10b981' }}>DELIVERED</td>
            <td style={{ padding: '0.75rem' }}>
              <button
                onClick={() => alert('Downloading official receipt PDF...')}
                style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: 4, cursor: 'pointer' }}
              >
                Download Receipt
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
