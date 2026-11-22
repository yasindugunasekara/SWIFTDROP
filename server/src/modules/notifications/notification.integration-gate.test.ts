import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  evaluateNotificationIntegrationGate,
  NOTIFICATION_INTEGRATION_CONFIRMATION,
} from './notification.integration-gate.js';

type GateEnvironment = Record<string, string | undefined>;

function validEnv(): GateEnvironment {
  return {
    RUN_NOTIFICATION_INTEGRATION: '1',
    NOTIFICATION_INTEGRATION_CONFIRM: NOTIFICATION_INTEGRATION_CONFIRMATION,
    NODE_ENV: 'test',
    TEST_DATABASE_URL:
      'postgresql://integration:secret@db-test.internal:5432/swiftdrop_notifications_test',
    DATABASE_URL:
      'postgresql://application:secret@db-production.internal:5432/swiftdrop_production',
    RABBITMQ_URL: 'amqp://integration:secret@rabbit-test.internal:5672/swiftdrop-ci',
    APP_RABBITMQ_URL: 'amqp://application:secret@rabbit-production.internal:5672/production',
  };
}

function assertRejected(env: GateEnvironment, pattern: RegExp): void {
  const result = evaluateNotificationIntegrationGate(env);
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', pattern);
  assert.doesNotMatch(result.error ?? '', /secret|postgresql:\/\/|amqp:\/\//i);
}

test('accepts a valid dedicated test configuration', () => {
  const result = evaluateNotificationIntegrationGate(validEnv());
  assert.deepEqual(result, { ok: true });
});

test('rejects a missing RUN_NOTIFICATION_INTEGRATION flag', () => {
  const env = validEnv();
  delete env.RUN_NOTIFICATION_INTEGRATION;
  assertRejected(env, /RUN_NOTIFICATION_INTEGRATION/);
});

test('rejects a missing dedicated-infrastructure confirmation', () => {
  const env = validEnv();
  delete env.NOTIFICATION_INTEGRATION_CONFIRM;
  assertRejected(env, /NOTIFICATION_INTEGRATION_CONFIRM/);
});

test('rejects production-like environments', () => {
  for (const key of ['NODE_ENV', 'APP_ENV', 'VERCEL_ENV']) {
    assertRejected({ ...validEnv(), [key]: 'production' }, new RegExp(`${key}=production`));
  }
});

test('rejects a non-test or default RabbitMQ vhost', () => {
  assertRejected(
    {
      ...validEnv(),
      RABBITMQ_URL: 'amqp://integration:secret@rabbit-test.internal:5672/swiftdrop',
    },
    /test vhost|dedicated vhost/,
  );

  assertRejected(
    {
      ...validEnv(),
      RABBITMQ_URL: 'amqp://integration:secret@rabbit-test.internal:5672/',
    },
    /test vhost|dedicated vhost/,
  );
});

test('accepts an explicitly allowlisted broker and vhost', () => {
  const result = evaluateNotificationIntegrationGate({
    ...validEnv(),
    RABBITMQ_URL: 'amqp://integration:secret@rabbit-test.internal:5672/swiftdrop',
    NOTIFICATION_INTEGRATION_ALLOWED_BROKERS:
      'rabbit-test.internal:5672/swiftdrop,rabbit-test.internal:5672/other',
  });
  assert.deepEqual(result, { ok: true });
});

test('rejects a test broker matching the application broker', () => {
  const env = validEnv();
  env.APP_RABBITMQ_URL = env.RABBITMQ_URL;
  assertRejected(env, /APP_RABBITMQ_URL/);

  const normalized = validEnv();
  normalized.APP_RABBITMQ_URL =
    'amqp://different:credentials@rabbit-test.internal:5672/swiftdrop-ci?heartbeat=30';
  assertRejected(normalized, /APP_RABBITMQ_URL/);
});

test('rejects a test broker matching the production broker', () => {
  const env = validEnv();
  env.PRODUCTION_RABBITMQ_URL = env.RABBITMQ_URL;
  assertRejected(env, /PRODUCTION_RABBITMQ_URL/);
});

test('rejects unsafe PostgreSQL configuration', () => {
  const missing = validEnv();
  delete missing.TEST_DATABASE_URL;
  assertRejected(missing, /TEST_DATABASE_URL is required/);

  assertRejected(
    {
      ...validEnv(),
      TEST_DATABASE_URL: 'mysql://integration:secret@db-test.internal/swiftdrop_test',
    },
    /valid PostgreSQL URL/,
  );

  assertRejected(
    {
      ...validEnv(),
      TEST_DATABASE_URL:
        'postgresql://integration:secret@db-test.internal:5432/swiftdrop_notifications',
    },
    /contains "test" or "ci"/,
  );

  const testDatabase = validEnv().TEST_DATABASE_URL!;
  assertRejected(
    {
      ...validEnv(),
      DATABASE_URL: testDatabase,
      TEST_DATABASE_URL: testDatabase,
    },
    /must differ from DATABASE_URL/,
  );

  assertRejected(
    {
      ...validEnv(),
      DATABASE_URL: testDatabase,
      TEST_DATABASE_URL:
        'postgresql://different:credentials@db-test.internal:5432/swiftdrop_notifications_test?sslmode=require',
    },
    /must differ from DATABASE_URL/,
  );
});

test('rejects an invalid application broker URL when comparison is required', () => {
  assertRejected(
    {
      ...validEnv(),
      APP_RABBITMQ_URL: 'not-an-amqp-url',
    },
    /APP_RABBITMQ_URL is configured but is not a valid AMQP URL/,
  );
});

test('gate-disabled live suite skips all tests without service connections', async () => {
  const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const tsxPath = path.join(repoRoot, 'server', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const liveTestPath = path.join(
    repoRoot,
    'server',
    'src',
    'modules',
    'notifications',
    'notification.integration.test.ts',
  );

  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test', NO_COLOR: '1', FORCE_COLOR: '0' };
  for (const key of [
    'RUN_NOTIFICATION_INTEGRATION',
    'NOTIFICATION_INTEGRATION_CONFIRM',
    'TEST_DATABASE_URL',
    'RABBITMQ_URL',
    'DATABASE_URL',
    'APP_RABBITMQ_URL',
    'PRODUCTION_RABBITMQ_URL',
    'NOTIFICATION_INTEGRATION_ALLOWED_BROKERS',
  ]) {
    delete env[key];
  }
  // Prevent Node's test runner from treating the child as a recursive test run.
  for (const key of Object.keys(env)) {
    if (key.startsWith('NODE_TEST_')) delete env[key];
  }

  const child = spawn(process.execPath, [tsxPath, '--test', liveTestPath], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', chunk => {
    output += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    output += chunk.toString();
  });

  const timer = setTimeout(() => child.kill('SIGTERM'), 30_000);
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  clearTimeout(timer);

  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  assert.equal(exitCode, 0, 'gate-disabled live suite must exit successfully');
  assert.match(plain, /skipped\s+19/, 'gate-disabled live suite must skip all 19 tests');
});
