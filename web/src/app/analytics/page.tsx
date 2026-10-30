'use client';

import { useState } from 'react';

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState('7d');

  return (
    <div style={{ maxWidth: 950, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: '#38bdf8', margin: 0 }}>📊 Operational Reports & Analytics</h2>
          <p style={{ color: '#9ca3af', margin: '0.25rem 0' }}>Aggregated delivery performance metrics, success ratios, and KPIs.</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151' }}
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Dispatched</span>
          <h3 style={{ margin: '0.5rem 0 0', color: '#f8fafc', fontSize: '1.5rem' }}>1,482</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Delivered Successfully</span>
          <h3 style={{ margin: '0.5rem 0 0', color: '#10b981', fontSize: '1.5rem' }}>1,438</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Success Rate</span>
          <h3 style={{ margin: '0.5rem 0 0', color: '#38bdf8', fontSize: '1.5rem' }}>97.03%</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Delivery Failures</span>
          <h3 style={{ margin: '0.5rem 0 0', color: '#ef4444', fontSize: '1.5rem' }}>44</h3>
        </div>
      </div>

      <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 8 }}>
        <h4>Courier Performance Leaderboard</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
              <th style={{ padding: '0.5rem' }}>Courier Name</th>
              <th style={{ padding: '0.5rem' }}>Completed Deliveries</th>
              <th style={{ padding: '0.5rem' }}>Avg Delivery Time</th>
              <th style={{ padding: '0.5rem' }}>On-Time Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              <td style={{ padding: '0.5rem' }}>John Doe</td>
              <td style={{ padding: '0.5rem' }}>184</td>
              <td style={{ padding: '0.5rem' }}>42 mins</td>
              <td style={{ padding: '0.5rem', color: '#10b981' }}>98.4%</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              <td style={{ padding: '0.5rem' }}>Sarah Lee</td>
              <td style={{ padding: '0.5rem' }}>162</td>
              <td style={{ padding: '0.5rem' }}>38 mins</td>
              <td style={{ padding: '0.5rem', color: '#10b981' }}>99.1%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
