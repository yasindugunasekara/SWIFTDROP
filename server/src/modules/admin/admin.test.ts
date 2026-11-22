import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createAuthenticationMiddleware } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { AuthServiceError, type UserRole } from '../auth/auth.service.js';

test('admin guard rejects missing/forged tokens and every non-admin role', async () => {
  const app = express();
  app.get('/admin', createAuthenticationMiddleware({ async authenticate(token) {
    if (!['ADMIN','CUSTOMER','COURIER','MERCHANT','DISPATCHER'].includes(token)) throw new AuthServiceError(401, 'INVALID_TOKEN', 'Invalid token');
    return { id: 'test', authUserId: 'test', email: 'test@example.com', fullName: 'Test', phone: null, role: token as UserRole };
  } }), requireRoles(['ADMIN']), (_req, res) => { res.json({ granted: true }); });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const token of ['forged.jwt.token', 'expired']) assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
    for (const role of ['CUSTOMER','COURIER','MERCHANT','DISPATCHER']) assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${role}` } })).status, 403);
    assert.equal((await fetch(url, { headers: { Authorization: 'Bearer ADMIN' } })).status, 200);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
