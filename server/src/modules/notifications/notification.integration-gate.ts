/**
 * Member 07 — pure live-integration safety gate.
 *
 * This module must not import database, RabbitMQ or notification runtime
 * modules. It is evaluated before any live test setup so unsafe configuration
 * is rejected without opening a connection.
 *
 * Required:
 *   RUN_NOTIFICATION_INTEGRATION=1
 *   NOTIFICATION_INTEGRATION_CONFIRM=I_AM_USING_DEDICATED_TEST_INFRASTRUCTURE
 *   TEST_DATABASE_URL=postgresql://.../<database-name-containing-test-or-ci>
 *   RABBITMQ_URL=amqp[s]://.../<vhost-containing-test-or-ci>
 *     or a broker/vhost listed in NOTIFICATION_INTEGRATION_ALLOWED_BROKERS
 *
 * Optional isolation comparisons:
 *   DATABASE_URL              — must not resolve to the same host/port/database
 *   APP_RABBITMQ_URL          — test broker must not resolve to this broker
 *   PRODUCTION_RABBITMQ_URL   — test broker must not resolve to this broker
 *
 * Optional broker allowlist:
 *   NOTIFICATION_INTEGRATION_ALLOWED_BROKERS=host:port/vhost,host:port/vhost
 *   Full amqp:// URLs are also accepted in the allowlist.
 */

export const NOTIFICATION_INTEGRATION_CONFIRMATION =
  'I_AM_USING_DEDICATED_TEST_INFRASTRUCTURE';

export interface NotificationIntegrationGateResult {
  ok: boolean;
  error?: string;
}

type GateEnvironment = Record<string, string | undefined>;

interface PostgresTarget {
  identity: string;
  database: string;
}

interface AmqpTarget {
  identity: string;
  vhost: string;
}

function parsePostgresTarget(value: string): PostgresTarget | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
      return null;
    }

    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!database) return null;

    const host = parsed.hostname.toLowerCase();
    const port = parsed.port || '5432';
    return {
      identity: `${host}:${port}/${database}`,
      database,
    };
  } catch {
    return null;
  }
}

function parseAmqpTarget(value: string): AmqpTarget | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'amqp:' && parsed.protocol !== 'amqps:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (!host) return null;

    const port = parsed.port || (parsed.protocol === 'amqps:' ? '5671' : '5672');
    const path = parsed.pathname.replace(/^\//, '');
    const vhost = path ? decodeURIComponent(path) : '/';

    return {
      identity: `${host}:${port}/${vhost}`,
      vhost,
    };
  } catch {
    return null;
  }
}

function normalizeAllowlistEntry(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  if (/^amqps?:\/\//i.test(trimmed)) {
    return parseAmqpTarget(trimmed)?.identity ?? null;
  }

  const slash = trimmed.indexOf('/');
  if (slash <= 0) return null;

  const hostPort = trimmed.slice(0, slash);
  const vhost = trimmed.slice(slash + 1);
  if (!vhost) return null;

  const [host, port = '5672'] = hostPort.split(':');
  if (!host || !port) return null;
  return `${host.toLowerCase()}:${port}/${vhost}`;
}

function allowedBrokers(env: GateEnvironment): Set<string> {
  const raw = env.NOTIFICATION_INTEGRATION_ALLOWED_BROKERS;
  if (!raw) return new Set();

  const identities = raw
    .split(',')
    .map(normalizeAllowlistEntry)
    .filter((identity): identity is string => Boolean(identity));

  return new Set(identities);
}

function productionEnvironment(env: GateEnvironment): string | null {
  for (const key of ['NODE_ENV', 'APP_ENV', 'VERCEL_ENV']) {
    if ((env[key] ?? '').toLowerCase() === 'production') return key;
  }
  return null;
}

function unsafeError(message: string): NotificationIntegrationGateResult {
  return { ok: false, error: message };
}

export function evaluateNotificationIntegrationGate(
  env: GateEnvironment = process.env,
): NotificationIntegrationGateResult {
  if (env.RUN_NOTIFICATION_INTEGRATION !== '1') {
    return unsafeError('RUN_NOTIFICATION_INTEGRATION must be exactly "1".');
  }

  if (env.NOTIFICATION_INTEGRATION_CONFIRM !== NOTIFICATION_INTEGRATION_CONFIRMATION) {
    return unsafeError(
      `Set NOTIFICATION_INTEGRATION_CONFIRM=${NOTIFICATION_INTEGRATION_CONFIRMATION}.`,
    );
  }

  const productionKey = productionEnvironment(env);
  if (productionKey) {
    return unsafeError(`Refusing live integration tests with ${productionKey}=production.`);
  }

  const rawTestDatabase = env.TEST_DATABASE_URL;
  if (!rawTestDatabase) {
    return unsafeError('TEST_DATABASE_URL is required for live integration tests.');
  }

  const testDatabase = parsePostgresTarget(rawTestDatabase);
  if (!testDatabase) {
    return unsafeError(
      'TEST_DATABASE_URL must be a valid PostgreSQL URL with a database name.',
    );
  }

  if (!/test|ci/i.test(testDatabase.database)) {
    return unsafeError(
      'TEST_DATABASE_URL must target a dedicated database whose name contains "test" or "ci".',
    );
  }

  if (env.DATABASE_URL) {
    const applicationDatabase = parsePostgresTarget(env.DATABASE_URL);
    if (!applicationDatabase) {
      return unsafeError(
        'DATABASE_URL is configured but is not a valid PostgreSQL URL; cannot verify database isolation.',
      );
    }
    if (applicationDatabase.identity === testDatabase.identity) {
      return unsafeError(
        'TEST_DATABASE_URL must differ from DATABASE_URL (same host, port and database).',
      );
    }
  }

  const rawTestBroker = env.RABBITMQ_URL;
  if (!rawTestBroker) {
    return unsafeError('RABBITMQ_URL is required for live integration tests.');
  }

  const testBroker = parseAmqpTarget(rawTestBroker);
  if (!testBroker) {
    return unsafeError('RABBITMQ_URL must be a valid AMQP URL with a vhost.');
  }

  const allowlist = allowedBrokers(env);
  if (!/test|ci/i.test(testBroker.vhost) && !allowlist.has(testBroker.identity)) {
    return unsafeError(
      'RABBITMQ_URL must target a dedicated vhost whose name contains "test" or "ci", ' +
        'or the broker/vhost must be listed in NOTIFICATION_INTEGRATION_ALLOWED_BROKERS.',
    );
  }

  for (const key of ['APP_RABBITMQ_URL', 'PRODUCTION_RABBITMQ_URL'] as const) {
    const rawApplicationBroker = env[key];
    if (!rawApplicationBroker) continue;

    const applicationBroker = parseAmqpTarget(rawApplicationBroker);
    if (!applicationBroker) {
      return unsafeError(
        `${key} is configured but is not a valid AMQP URL; cannot verify broker isolation.`,
      );
    }
    if (applicationBroker.identity === testBroker.identity) {
      return unsafeError(`RABBITMQ_URL must not match ${key}.`);
    }
  }

  return { ok: true };
}
