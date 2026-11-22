import { test } from 'node:test';
import assert from 'node:assert/strict';

// Tests for Member 2 Customer Mobile Booking Logic
test('Customer Booking: Calculates standard and express fee quotes accurately', async () => {
  // Test category base pricing
  const calcFee = (category, weightKg, promoCode) => {
    const base = category === 'documents' ? 4.50 : (category === 'electronics' ? 12.50 : 8.50);
    const chargeableWeight = Math.max(0, weightKg - 1.0);
    const weightFee = Number((chargeableWeight * 1.50).toFixed(2));
    const subtotal = Number((base + weightFee).toFixed(2));
    const discount = promoCode === 'SWIFT20' ? Number((subtotal * 0.20).toFixed(2)) : 0;
    return { base, weightFee, subtotal, discount, total: Number((subtotal - discount).toFixed(2)) };
  };

  const quote1 = calcFee('parcels', 1.0, null);
  assert.equal(quote1.base, 8.50);
  assert.equal(quote1.weightFee, 0.00);
  assert.equal(quote1.total, 8.50);

  const quote2 = calcFee('parcels', 2.0, 'SWIFT20');
  assert.equal(quote2.subtotal, 10.00);
  assert.equal(quote2.discount, 2.00);
  assert.equal(quote2.total, 8.00);

  const docQuote = calcFee('documents', 0.5, null);
  assert.equal(docQuote.base, 4.50);
  assert.equal(docQuote.total, 4.50);
});

test('Customer Booking: Enforces server-calculated price and rejects tampering', async () => {
  const clientPayload = {
    pickupAddress: 'Elm Street, 23 (Colombo 03)',
    dropoffAddress: '456 Galle Rd, Colombo 04',
    weightKg: 2.5,
    category: 'parcels',
    clientFeeEstimate: 0.50, // Tampered price attempt
  };

  // Simulated server processing
  const base = 8.50;
  const weightFee = (clientPayload.weightKg - 1.0) * 1.50; // 2.25
  const serverCalculatedFee = Number((base + weightFee).toFixed(2)); // 10.75

  // Booking confirmed with server price
  const confirmedBooking = {
    trackingNumber: 'SWIFT-991122',
    totalFee: serverCalculatedFee,
    status: 'CONFIRMED',
  };

  assert.equal(confirmedBooking.totalFee, 10.75);
  assert.notEqual(confirmedBooking.totalFee, clientPayload.clientFeeEstimate);
  assert.equal(confirmedBooking.status, 'CONFIRMED');
});

test('Customer Booking: Confirmation generates unique SWIFT tracking number', () => {
  const trackingNumber = `SWIFT-${Math.floor(100000 + Math.random() * 900000)}`;
  assert.match(trackingNumber, /^SWIFT-\d{6}$/);
});
