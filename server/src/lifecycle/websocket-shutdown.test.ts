import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { WebSocket, WebSocketServer } from 'ws';
import { closeWebSocketServers } from './websocket-shutdown.js';

test('shutdown closes both tracking and general WebSocket channels with a going-away code', async () => {
  const servers = [new WebSocketServer({ port: 0, host: '127.0.0.1' }), new WebSocketServer({ port: 0, host: '127.0.0.1' })];
  await Promise.all(servers.map(server => once(server, 'listening')));
  const clients = servers.map(server => new WebSocket(`ws://127.0.0.1:${(server.address() as AddressInfo).port}`));
  try {
    await Promise.all(clients.map(client => once(client, 'open')));
    const closed = clients.map(client => once(client, 'close'));
    await closeWebSocketServers(servers);
    const events = await Promise.all(closed);
    assert.ok(events.every(([code]) => code === 1001));
    assert.ok(servers.every(server => server.clients.size === 0));
  } finally {
    clients.forEach(client => client.terminate());
    servers.forEach(server => server.close());
  }
});
