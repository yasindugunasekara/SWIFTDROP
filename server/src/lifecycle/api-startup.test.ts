import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

test('API starts and serves health when RabbitMQ is unavailable', async () => {
  const previousRabbitUrl = process.env.RABBITMQ_URL;
  process.env.RABBITMQ_URL = 'amqp://127.0.0.1:1';

  try {
    const { default: app } = await import('../app.js');
    const server = http.createServer(app);

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const { port } = server.address() as AddressInfo;

    try {
      const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      assert.equal(health.status, 200);
      assert.equal((await health.json()).service, 'SwiftDrop API');

      const notifications = await fetch(
        `http://127.0.0.1:${port}/api/v1/notifications`,
        { signal: AbortSignal.timeout(5_000) },
      );
      assert.equal(notifications.status, 401);
      assert.equal((await notifications.json()).error, 'Access token required');
    } finally {
      await new Promise<void>(resolve => {
        server.close(() => resolve());
        server.closeIdleConnections();
      });
    }
  } finally {
    if (previousRabbitUrl === undefined) delete process.env.RABBITMQ_URL;
    else process.env.RABBITMQ_URL = previousRabbitUrl;
  }
});
