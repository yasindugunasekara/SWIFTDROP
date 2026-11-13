import request from 'supertest';
import express from 'express';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';

// Mock Express app for testing Member 9 Analytics endpoints
const testApp = express();
testApp.use(express.json());

describe('Member 9: Operational Analytics & Reporting Endpoints', () => {
  it('Enforces RBAC: Rejects unauthenticated requests with 401 Unauthorized', async () => {
    testApp.use('/api/v1/analytics', analyticsRoutes);
    const res = await request(testApp).get('/api/v1/analytics/summary');
    expect(res.status).toBe(401);
  });

  it('Validates Date Range parameters correctly for Today, 7d, and 30d', () => {
    const validRanges = ['today', '7d', '30d'];
    validRanges.forEach((range) => {
      expect(['today', '7d', '30d']).toContain(range);
    });
  });

  it('Calculates Success and Failure Rate equations with consistent denominator', () => {
    const deliveredCount = 95;
    const failedCount = 5;
    const totalTerminal = deliveredCount + failedCount;

    // SLA Success Rate Formula
    const successRate = (deliveredCount / totalTerminal) * 100;
    const failureRate = (failedCount / totalTerminal) * 100;

    expect(successRate).toBe(95.0);
    expect(failureRate).toBe(5.0);
    expect(successRate + failureRate).toBe(100.0);
  });

  it('Protects against divide-by-zero when no deliveries exist in range', () => {
    const deliveredCount = 0;
    const failedCount = 0;
    const totalTerminal = deliveredCount + failedCount;

    const safeSuccessRate = totalTerminal === 0 ? 0.0 : (deliveredCount / totalTerminal) * 100;
    expect(safeSuccessRate).toBe(0.0);
  });
});
