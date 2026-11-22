import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { EventEmitter } from 'node:events';
import bookingRoutes, { calculateServerFee, CATEGORY_BASE_RATES, PROMO_CODES } from './booking.routes.js';

const app = express();
app.use(express.json());
app.use('/api/v1/booking', bookingRoutes);

// In-memory request dispatcher that doesn't need external TCP sockets
function dispatch(app: express.Express, method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req = new EventEmitter() as any;
    req.method = method;
    req.url = path;
    req.headers = {
      'content-type': 'application/json',
      'host': 'localhost',
    };
    req.body = body || {};

    let statusCode = 200;
    const resHeaders: Record<string, string> = {};
    let responseData = '';

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return resHeaders[name.toLowerCase()];
      },
      json(data: any) {
        resolve({ status: statusCode, body: data });
        return this;
      },
      send(data: any) {
        if (typeof data === 'object') {
          resolve({ status: statusCode, body: data });
        } else {
          try {
            resolve({ status: statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: statusCode, body: data });
          }
        }
        return this;
      },
      end(chunk?: any) {
        if (chunk) responseData += chunk;
        resolve({ status: statusCode, body: responseData });
        return this;
      },
    } as any;

    app(req, res);
  });
}

describe('Member 2: Customer Booking & Dynamic Fee Quote System', () => {

  it('1. Fee Calculation: Computes correct base fee and weight surcharge on the server', () => {
    // 1kg parcel: exactly base fee $8.50
    const quote1 = calculateServerFee({ category: 'parcels', weightKg: 1.0 });
    assert.equal(quote1.baseFee, 8.50);
    assert.equal(quote1.weightFee, 0.00);
    assert.equal(quote1.totalFee, 8.50);

    // 2.5kg parcel: $8.50 + 1.5kg * $1.50 = $8.50 + $2.25 = $10.75
    const quote2 = calculateServerFee({ category: 'parcels', weightKg: 2.5 });
    assert.equal(quote2.baseFee, 8.50);
    assert.equal(quote2.weightFee, 2.25);
    assert.equal(quote2.totalFee, 10.75);

    // Documents 0.5kg: $4.50
    const quoteDoc = calculateServerFee({ category: 'documents', weightKg: 0.5 });
    assert.equal(quoteDoc.baseFee, 4.50);
    assert.equal(quoteDoc.totalFee, 4.50);
  });

  it('2. Promotional Discount: Applies SWIFT20 (20% off) discount correctly', () => {
    const quoteWithPromo = calculateServerFee({
      category: 'parcels',
      weightKg: 2.0, // Subtotal: 8.50 + 1.50 = $10.00
      promoCode: 'SWIFT20', // 20% discount = $2.00
    });
    assert.equal(quoteWithPromo.subtotal, 10.00);
    assert.equal(quoteWithPromo.discount, 2.00);
    assert.equal(quoteWithPromo.totalFee, 8.00);
    assert.equal(quoteWithPromo.appliedPromo, 'SWIFT20');
  });

  it('3. API /quote: Returns valid fee quote for correct pickup/dropoff and weight', async () => {
    const res = await dispatch(app, 'POST', '/api/v1/booking/quote', {
      pickupAddress: 'Elm Street, 23 (Colombo 03)',
      dropoffAddress: '456 Galle Rd, Colombo 04',
      weightKg: 1.5,
      category: 'parcels',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.quote);
    assert.equal(res.body.quote.category, 'Parcels');
    assert.equal(res.body.quote.baseFee, 8.50);
    assert.equal(res.body.quote.totalFee, 9.25); // 8.50 + 0.5 * 1.50 = 9.25
  });

  it('4. API /quote: Rejects invalid weight and missing addresses with 400 Bad Request', async () => {
    // Missing address
    const res1 = await dispatch(app, 'POST', '/api/v1/booking/quote', {
      pickupAddress: '',
      dropoffAddress: '456 Galle Rd',
      weightKg: 2.0,
    });
    assert.equal(res1.status, 400);
    assert.equal(res1.body.success, false);

    // Excessive weight (>100kg)
    const res2 = await dispatch(app, 'POST', '/api/v1/booking/quote', {
      pickupAddress: 'Colombo 03',
      dropoffAddress: 'Colombo 04',
      weightKg: 150, // exceeds max 100kg
    });
    assert.equal(res2.status, 400);
    assert.equal(res2.body.success, false);
  });

  it('5. Security Enforcement: Server calculates fee independently and IGNORES client price', async () => {
    // Client attempts to tamper price and claim it costs $0.01
    const res = await dispatch(app, 'POST', '/api/v1/booking/create', {
      pickupAddress: 'Elm Street, 23 (Colombo 03)',
      dropoffAddress: '456 Galle Rd, Colombo 04',
      senderName: 'Kasun Perera',
      senderPhone: '+94 77 123 4567',
      recipientName: 'Robert Smith',
      recipientPhone: '+94 71 555 0192',
      weightKg: 2.0,
      category: 'parcels',
      clientFeeEstimate: 0.01, // TAMPER ATTEMPT
      paymentMethod: 'wallet',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.serverFeeEnforced, true);
    // Server overrides with calculated price: $8.50 + 1.0 * 1.50 = $10.00
    assert.equal(res.body.parcel.totalFee, 10.00);
    assert.notEqual(res.body.parcel.totalFee, 0.01);
    assert.ok(res.body.parcel.trackingNumber.startsWith('SWIFT-'));
    assert.equal(res.body.parcel.status, 'CONFIRMED');
  });

  it('6. Booking Confirmation: Generates unique SWIFT tracking number and receipt', async () => {
    const res = await dispatch(app, 'POST', '/api/v1/booking/create', {
      pickupAddress: 'Elm Street, 23 (Colombo 03)',
      dropoffAddress: 'Kandy City Center, Kandy',
      senderName: 'Kasun Perera',
      recipientName: 'Nimal Jayawardena',
      weightKg: 1.0,
      category: 'electronics',
      paymentMethod: 'wallet',
      promoCode: 'SWIFT20',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.parcel.id);
    assert.ok(res.body.parcel.trackingNumber);
    assert.equal(res.body.parcel.category, 'Electronics');
    // Electronics base: $12.50, 20% discount = $2.50 => total $10.00
    assert.equal(res.body.parcel.totalFee, 10.00);
    assert.equal(res.body.parcel.status, 'CONFIRMED');
  });

});
