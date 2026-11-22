import assert from 'node:assert/strict';
import test from 'node:test';
import {
  closeRabbitMQ,
  connectRabbitMQ,
  getRabbitMQChannel,
} from './rabbitmq.js';

test('closeRabbitMQ is idempotent and prevents new connections during shutdown', async () => {
  await Promise.all([closeRabbitMQ(), closeRabbitMQ()]);
  await closeRabbitMQ();

  assert.equal(getRabbitMQChannel(), null);
  assert.equal(await connectRabbitMQ(), null);
});
