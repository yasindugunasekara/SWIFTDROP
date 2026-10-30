'use client';

import { useState } from 'react';

export default function BookingPage() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [weight, setWeight] = useState(1);
  const [quote, setQuote] = useState<number | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const handleGetQuote = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate server fee quote (Member 2)
    const estimated = 10 + weight * 2.5;
    setQuote(estimated);
  };

  const handleConfirmBooking = () => {
    // Member 2 booking confirmation
    setConfirmedId('SWIFT-' + Math.floor(100000 + Math.random() * 900000));
  };

  return (
    <div style={{ maxWidth: 640, margin: '3rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8' }}>📦 Book a Parcel Delivery</h2>
      <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Enter package details to receive an authentic server-calculated quote.</p>

      {confirmedId ? (
        <div style={{ padding: '1.5rem', background: '#064e3b', borderRadius: 8, border: '1px solid #059669' }}>
          <h3>✅ Booking Confirmed!</h3>
          <p>Your tracking number: <strong>{confirmedId}</strong></p>
          <a href={`/tracking/${confirmedId}`} style={{ color: '#34d399', textDecoration: 'underline' }}>Track parcel live</a>
        </div>
      ) : (
        <form onSubmit={handleGetQuote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Pickup Address</label>
            <input
              required
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="e.g. 123 Main St, New York, NY"
              style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Delivery Address</label>
            <input
              required
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder="e.g. 456 Broadway, New York, NY"
              style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Parcel Weight (kg)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              required
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            Calculate Fee Quote
          </button>

          {quote !== null && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
              <h4>Fee Breakdown</h4>
              <p>Base Fee: $10.00</p>
              <p>Weight Fee ({weight} kg): ${(weight * 2.5).toFixed(2)}</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8' }}>Total Estimate: ${quote.toFixed(2)}</p>
              <button
                type="button"
                onClick={handleConfirmBooking}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
              >
                Confirm & Pay Booking
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
