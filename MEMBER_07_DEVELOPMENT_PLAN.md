# Member 07 — Notification Preferences & Delivery Inbox
## Phase 01 Inspection Report and Development Plan

| Item | Value |
|---|---|
| Project | SwiftDrop — Enterprise Courier & Parcel Delivery Management System |
| Module owner | Member 07 |
| Module folder | `server/src/modules/notifications/` |
| Repository branch inspected | `pasindu` (clean working tree) |
| Inspection date | 2026-11-22 |
| Status | **Phase 01 complete — awaiting approval before Phase 02** |
| Files changed in this phase | This document only. No application source code was modified. |

---

## 1. Executive summary

The repository is a working multi-member skeleton. The notification feature is currently **three fake endpoints, an empty-ish consumer, and two placeholder database tables**. Nothing is persisted, nothing is delivered, and no test exists for Member 07.

The good news is that the foundations are solid and the integration seams are already prepared:

* Authentication is centralised and testable (`createAuthenticationMiddleware(gateway)`).
* The database access layer is a plain `pg` connection pool used by every real module.
* The RabbitMQ publisher (Member 04) already sends parcel status events to `swiftdrop_notifications_queue`.
* The frontend API client (`fetchApi`) already handles Bearer tokens and 401 refresh.
* The web app proxies `/api/v1/*` to the Express app, so there is no CORS or base-URL work.
* The repo already has two proven test harness styles (`node:test` + PGlite, and live-Postgres integration).

The main technical risks are:

1. **The publisher does not send an `eventId`.** The consumer therefore cannot rely on a publisher-supplied idempotency key and must derive a deterministic one from the message content.
2. **The existing `notifications.event_id` has a global `UNIQUE` constraint.** One event must fan out to *two* users (customer + courier). A global constraint makes the second recipient fail. This must be replaced by a per-recipient uniqueness rule.
3. **Booking and dispatch are still stubs**, so `PARCEL_BOOKED` and `COURIER_ASSIGNED` events are not published yet. The consumer must support them, but the end-to-end demo for those two events depends on Members 02 and 05.
4. **The migration runner has no ledger.** Every `.sql` file in `migrations/` is re-executed on every `npm run migrate`, so every new migration must be fully idempotent.
5. **No `node_modules` are installed** in `server/` or `web/` in this working copy, and the `npm test` script references Jest, which is not a dependency. Tests cannot be run until dependencies are installed.

None of these are blockers. Section 7 explains the idempotency design in detail, which is the centrepiece of the assessment.

---

## 2. Repository architecture (as inspected)

### 2.1 High-level layout

```
SWIFTDROP/
├── .env / .env.example              # root environment (gitignored)
├── docker-compose.yml               # postgres, redis, rabbitmq, server, worker, web
├── k8s/base/                        # deployment manifests
├── server/                          # Express + TypeScript API and workers
│   └── src/
│       ├── app.ts                   # Express app, route mounting
│       ├── index.ts                 # HTTP + WebSocket server bootstrap
│       ├── config/                  # env, database, rabbitmq, redis, supabase
│       ├── middleware/              # auth, rbac, error-handler, rate-limiter
│       ├── modules/                 # one folder per member
│       ├── database/                # schema.sql, migrate.ts, migrations/, seeds/
│       ├── workers/                 # notification + webhook consumers
│       ├── scripts/                 # demo / verification scripts
│       └── tests/                   # analytics test
├── web/                             # Next.js 16 App Router frontend
│   └── src/
│       ├── app/                     # route groups per role
│       ├── components/              # layout + ui components
│       ├── lib/                     # api client, auth store, supabase
│       └── pages/api/[...path].ts   # proxies /api/v1/* into Express
└── mobile/                          # Expo / React Native app
    └── src/{screens,components,services,theme}
```

### 2.2 Backend stack and conventions

| Concern | Observed implementation |
|---|---|
| Runtime | Node.js, ES Modules (`"type": "module"`), TypeScript 5.5, `module: NodeNext` |
| Framework | Express 4.19 |
| DB driver | `pg` `Pool` in `server/src/config/database.ts` — raw SQL, no ORM |
| Validation | `zod` (used in `auth.routes.ts` and `merchant.routes.ts`) |
| Errors | `{ "error": "message" }`; auth adds `{ code, fields }` |
| Auth | Supabase Auth; `authenticateToken` verifies the token with Supabase and loads the local profile |
| RBAC | `requireRoles([...])` checks `req.user.role` from the database, never from the token |
| Route prefix | `/api/v1/<module>` |
| Bootstrapping | `app.ts` mounts each member router explicitly (`app.ts:50-60`) |

**Response shape conventions seen in real modules**

```jsonc
// success — list
{ "count": 3, "exceptions": [ ... ] }

// success — single
{ "message": "Delivery exception logged successfully", "exception": { ... } }

// error
{ "error": "parcelId and reason are required" }
```

I will follow this convention: camelCase JSON, `{ error }` for failures, 201 for creation, 400 validation, 401 unauthenticated, 403 forbidden role, 404 not found / not owned, 429 rate limited, 500/503 infrastructure failure.

### 2.3 Authentication and authorisation (critical for Member 07)

`server/src/middleware/auth.ts`

```ts
export interface AuthRequest extends Request { user?: AuthenticatedUser; }
export interface AuthenticatedUser {
  id: string;            // public.users.id  ← the app's stable user id
  email: string;
  role: 'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | 'MERCHANT';
  merchantId?: string;
  approvalStatus?: string;
  authUserId?: string;
  fullName?: string;
  phone?: string | null;
}
```

* `authenticateToken` rejects a missing/malformed `Authorization` header with **401**.
* It calls `authGateway.authenticate(token)`, which:
  1. Verifies the Supabase access token.
  2. Calls the `is_current_session_active()` RPC so logout revokes access immediately.
  3. Loads `public.users` by `auth_user_id`.
  4. Rejects inactive accounts and unknown roles.
* **The role and the user id come from the database, not from client input or JWT claims.** This satisfies the requirement "never trust user IDs supplied by the frontend".
* `createAuthenticationMiddleware(gateway)` is a dependency-injection seam. `auth.test.ts` already uses it with a fake gateway. I will use the same pattern so Member 07 tests run without Supabase.

The Supabase trigger `private.sync_swiftdrop_auth_user()` creates a `public.users` row automatically when a Supabase auth user is created, so `users.id` always exists for authenticated accounts.

### 2.4 Database

`server/src/database/schema.sql` (227 lines) defines the full schema by member. The parts relevant to me are lines 157–177:

```sql
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id),
    event_id VARCHAR(100) UNIQUE, -- Idempotency key
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

The same definitions exist in `server/src/database/migrations/001_initial_schema.sql:141-165`.

Relevant neighbouring tables:

| Table | Columns I need | Notes |
|---|---|---|
| `users` | `id`, `role`, `is_active` | recipient validation |
| `parcels` | `id`, `tracking_number`, `customer_id`, `merchant_id`, `status` | recipient lookup + display context |
| `courier_assignments` | `parcel_id`, `courier_id`, `is_active`, `assigned_at` | authoritative courier for a parcel |
| `parcel_status_history` | `parcel_id`, `status`, `created_at` | cross-check for Member 03 |

**Migration mechanics**

`server/src/database/migrate.ts` reads every `.sql` file in `server/src/database/migrations/`, sorts by filename, and executes it — **with no `schema_migrations` ledger**. Consequences:

* Every migration must be idempotent (`IF NOT EXISTS`, `DROP ... IF EXISTS`, `DO $$` guards).
* I will add a single new file, `004_notifications_hardening.sql`, and mirror the final state in `schema.sql` for documentation.
* `docker-compose.yml` also mounts the migrations folder into `/docker-entrypoint-initdb.d`, which only runs on a fresh volume. Existing databases must be updated with `npm run migrate` or the Supabase SQL Editor.

**Row Level Security note:** the backend connects with `pg` using `DATABASE_URL`, typically the Supabase `postgres` role. That role owns the tables and bypasses RLS. RLS therefore does not interfere with the Express API, but enables defence-in-depth against direct PostgREST/Data API access. Member 01 already uses this pattern in `20261113164606_use_supabase_auth.sql`.

### 2.5 RabbitMQ

`server/src/config/rabbitmq.ts`

```ts
export const connectRabbitMQ = async () => { ... return { connection, channel } | null; };
export const getRabbitMQChannel = () => channel;
```

* Plain AMQP over `amqplib`, URL from `RABBITMQ_URL`.
* No exchange is declared anywhere. Publishers use **direct queue publishing** with `channel.sendToQueue(..., { persistent: true })`.
* Queue names come from env with defaults:
  * `RABBITMQ_QUEUE_NOTIFICATIONS` → `swiftdrop_notifications_queue`
  * `RABBITMQ_QUEUE_WEBHOOKS` → `swiftdrop_webhooks_queue`
  * `RABBITMQ_QUEUE_DLQ` → `swiftdrop_dead_letter_queue`
* The worker process (`server/src/workers/index.ts`) starts the notification consumer and the webhook worker.

**The only real publisher today** is Member 04 in `server/src/modules/courier/courier.service.ts:482-506`:

```ts
const payload = {
  event: newStatus === 'DELIVERED' ? 'PARCEL_DELIVERED'
       : newStatus === 'FAILED'    ? 'PARCEL_FAILED'
       : 'PARCEL_STATUS_UPDATED',
  parcelId: parcel.id,
  trackingNumber: parcel.trackingNumber,
  courierId: parcel.courierId,
  courierName: parcel.courierName,
  recipientName: parcel.recipientName,
  recipientPhone: parcel.recipientPhone,
  status: newStatus,               // ASSIGNED | PICKED_UP | IN_TRANSIT | ...
  note: note || '',
  timestamp: new Date().toISOString()
};
channel.sendToQueue('swiftdrop_notifications_queue', Buffer.from(JSON.stringify(payload)), { persistent: true });
channel.sendToQueue('swiftdrop_webhooks_queue',      Buffer.from(JSON.stringify(payload)), { persistent: true });
```

**Critical finding:** there is **no `eventId` field**. The stub consumer logs `event.eventId`, which is always `undefined`. My design must derive a stable idempotency key from message content, while accepting an explicit `eventId` if a teammate adds one later.

Other event facts:

* Member 08 consumes `swiftdrop_webhooks_queue` separately — **no consumer conflict**.
* `booking.routes.ts` and `dispatch.routes.ts` are stubs and publish nothing today.
* Member 08 defines merchant-facing event names `PARCEL_STATUS_UPDATED`, `PARCEL_DELIVERED`, `PARCEL_FAILED` in `merchant_webhook_endpoints.events`.

### 2.6 Web frontend

| Area | Finding |
|---|---|
| Framework | Next.js 16.4.3 App Router, React 19.3, TypeScript strict, Tailwind CSS 3.4 |
| API access | `web/src/lib/api.ts` → `fetchApi<T>(endpoint)` prefixes `/api/v1`, attaches Supabase Bearer token, retries once after refresh on 401 |
| Session store | `web/src/lib/auth.ts` — external store with `useSyncExternalStore`, `getStoredUser`, `subscribeAuth`, `dashboardFor`, `clearAuthSession` |
| Page guard | `web/src/components/layout/AuthBoundary.tsx` maps paths to allowed roles |
| Routing | Route groups `(customer)`, `(courier)`, `(dispatcher)`, `(merchant)`, `(support)` do **not** add URL segments |
| API hosting | `web/src/pages/api/[...path].ts` imports `server/dist/app.js`; so `web` must build `server` first (`predev` / `prebuild` scripts) |
| Design system | White/slate surfaces, brand orange `#ff6600`, rounded-2xl/3xl cards, `font-black` headings, thin slate-100 borders |
| Reusable component | `web/src/components/ui/LoadingState.tsx` (full-screen or inline) |
| Existing inbox | `web/src/app/(customer)/inbox/page.tsx` — **hardcoded array of 3 notifications**, local-only checkbox preferences, `alert('Channel preferences saved!')` |

**Route guard detail** (`AuthBoundary.tsx:9-14`):

```ts
const access: Record<string, UserRole[]> = {
  '/booking': ['CUSTOMER'], '/history': ['CUSTOMER'], '/inbox': ['CUSTOMER'],
  '/tasks': ['COURIER', 'ADMIN'],
  ...
};
```

`/inbox` is currently **customer-only**. There is no courier inbox route. Because Next would reject two pages at the same URL, the clean solution is one shared `/inbox` page whose content is role-aware, and adding `COURIER` to the allowed roles. That is a one-line change in a shared file and will be flagged for team coordination.

The dashboard pages (`/booking`, `/tasks`) contain their own sidebars and top bars; the public `Navbar` hides itself on these routes. There is no link to `/inbox` from either dashboard today — only a decorative bell button in the customer right panel (`booking/page.tsx:626-635`) with a static unread dot.

### 2.7 Mobile

| Area | Finding |
|---|---|
| Framework | Expo ~51, React Native 0.74, React 18.2, TypeScript |
| Navigation | Manual state switch in `mobile/App.tsx` (`currentScreen`, `activeTab`) — no React Navigation |
| Tabs | `BottomNavBar.tsx` defines `TabKey = 'home' | 'orders' | 'track' | 'account'` |
| API | `mobile/src/services/api.ts` → `mobileApiFetch(endpoint)` with Bearer token and one refresh retry |
| Auth | `mobile/src/services/auth.ts` — external store, same pattern as web |
| Theme | `mobile/src/theme/colors.ts` — brand `#ff6600`, slate neutrals, status colours |
| Current notification entry point | `App.tsx:123` → `onNotifications={() => setActiveTab('orders')}` (placeholder) |
| Existing screens | `HomeScreen`, `OrdersScreen`, `TrackScreen`, `AccountScreen`, courier `TaskListScreen`, `ProofPhotoScreen` |

Adding an `alerts` tab requires touching the shared `BottomNavBar.tsx` and `App.tsx` — coordinate with the mobile owner.

### 2.8 Testing setup

| Layer | Mechanism | Evidence |
|---|---|---|
| Server unit/API | `node:test` + `node:assert/strict`, run with `tsx --test` | `server/src/modules/auth/auth.test.ts` |
| Server integration | Standalone script with custom `assert`, live PostgreSQL, starts an in-process Express server | `server/src/modules/merchant/merchant.test.ts`, `support.test.ts` |
| Web | `node:test` against a running Next server | `web/tests/*.mjs` |
| Mobile | `node --test` for pure service tests | `mobile/tests/*.mjs` |
| `@electric-sql/pglite` | In-memory Postgres used by `auth.test.ts` to apply real migrations | already a devDependency |

**Warning:** `server/package.json` has `"test": "jest"`, but `jest` is **not installed and not listed** in `devDependencies`. That script is broken. The established working convention is `tsx --test <file>` (e.g. `test:support`, `test:merchant`). I will add `test:notifications` in that style and will not introduce a new framework.

Dependencies are not installed in this working copy, so the first implementation step is `npm install` in `server/` and `web/`.

---

## 3. Existing notification code — exact inventory

| File | Lines | State | Verdict |
|---|---|---|---|
| `server/src/modules/notifications/notification.routes.ts` | 24 | Stub: `GET /inbox` returns `[]`; `PUT /preferences` returns a message without saving; `PATCH /:id/read` returns a message | Rewrite (my module) |
| `server/src/workers/notification-consumer.ts` | 29 | Parses JSON, logs `eventId` (undefined), has `// TODO [Member 7]`, acks every parsed message | Rewrite (my module) |
| `server/src/config/rabbitmq.ts` | 20 | Connect + get channel | Reuse unchanged |
| `server/src/workers/index.ts` | 19 | Starts my consumer | Reuse unchanged |
| `server/src/app.ts` | 64 | Mounts `/api/v1/notifications` | Reuse unchanged |
| `server/src/database/schema.sql` | 157–177 | Two tables with issues listed below | Add migration + mirror |
| `server/src/database/migrations/001_initial_schema.sql` | 141–165 | Same two tables | Do not edit (already applied); new migration supersedes |
| `web/src/app/(customer)/inbox/page.tsx` | 150 | Hardcoded notifications + fake save | Rewrite (my route) |
| `web/src/components/layout/AuthBoundary.tsx` | 41 | `/inbox` customer-only | One-line change, coordinate |
| `server/src/modules/courier/courier.service.ts` | 482–506 | Publishes events | Consumer side only; no change needed |
| `.env.example` / `server/.env.example` | — | Queue env vars already present | No change needed |

**No test file exists for notifications.** No notifications README exists.

---

## 4. Gap analysis against the Member 07 brief

| # | Requirement | Current state | Work needed |
|---|---|---|---|
| A | Customer notification inbox | Hardcoded mock data | Real API + UI |
| A | Recent alerts, title, description, date/time | Mock only | Real data + formatting |
| A | Read/unread status, mark one/all read | No persistence | API + DB |
| A | Unread count | Static dot | API + UI badge |
| A | Relevant parcel information | Mock tracking number in text | Store `parcel_id`, join `tracking_number` |
| A | Refresh, loading, empty, error states | Missing | Implement |
| B | Courier inbox | None | Shared role-aware inbox + API |
| B | New assignment notifications | None | Consumer event `COURIER_ASSIGNED` |
| C | Preferences: push/email/SMS | Checkboxes only, not saved | API + DB + UI |
| C | Load saved preferences | Missing | `GET /preferences` |
| C | Success/error feedback | `alert()` | Inline accessible feedback |
| D | Notification CRUD/retrieval backend | 3 fake endpoints | Full module |
| D | Unread count endpoint | Missing | Add |
| D | Pagination | Missing | Keyset pagination |
| E | Database structure | Placeholder tables with design flaws | Migration `004` |
| F | RabbitMQ consumer | Stub; logs and acks | Full consumer |
| F | Recipient resolution | Missing | DB lookup |
| F | Preference check in consumer | Missing | Read preferences, record channels |
| F | Acknowledgement/rejection policy | Always `ack` on parse success | Bounded retries + DLQ |
| G | Idempotency | TODO comment only | Unique index + content hash + `ON CONFLICT` |
| H | Web UI | Mock | Rewrite |
| H | Mobile UI | None | New screens + tab |
| I | JWT auth on endpoints | Router-level `authenticateToken` already present | Keep + test |
| I | User isolation | No queries yet | Enforce in every SQL statement |
| J | Automated tests | None | Full suite |
| K | Documentation + demo evidence | None | README, demo script, screenshots |

---

## 5. Proposed architecture and file structure

```
server/src/modules/notifications/
├── notification.types.ts          # Domain types + DTOs (no Express, no SQL)
├── notification.events.ts         # Event contract: parse, validate, map to type/recipients/templates
├── notification.service.ts        # SQL via a small Queryable interface + factory
├── notification.routes.ts         # createNotificationRouter(dependencies) + default export
├── notification.test.ts           # API, security, preferences, idempotency (node:test + PGlite)
└── README.md                      # API + DB + RabbitMQ + demo documentation

server/src/workers/
├── notification-consumer.ts       # Rewritten, exported pure handler + start function
└── notification-consumer.test.ts  # Consumer behaviour with a fake channel

server/src/database/migrations/
└── 004_notifications_hardening.sql

server/src/scripts/
└── notification-demo.ts           # Live demo: publish event → inbox → duplicate proof

web/src/lib/
└── notifications.ts               # Typed API client functions

web/src/app/(customer)/inbox/
└── page.tsx                       # Rewritten: inbox + preferences, role-aware

mobile/src/screens/notifications/
├── NotificationInboxScreen.tsx
└── NotificationPreferencesScreen.tsx

docs/member-07/
├── API.md                         # Endpoint reference with examples
├── DATABASE.md                    # Tables, constraints, indexes, migration
├── RABBITMQ.md                    # Event contract + idempotency explanation
└── evidence/                      # Screenshots + demo transcript
```

### Design principles applied

1. **Separation of concerns.** Event parsing/templates are pure functions; SQL lives in the service; HTTP concerns live in routes; RabbitMQ concerns live in the worker.
2. **Dependency injection for testability.** `createNotificationRouter({ authenticate, service })`, mirroring `createAuthRouter(gateway)`. Production default uses `authenticateToken` and the real pool; tests inject a fake auth gateway and a PGlite adapter.
3. **Single-statement writes.** Every mutation is one SQL statement, so no explicit transaction is needed and the service only needs a minimal `Queryable` interface.

```ts
export interface Queryable {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    text: string, values?: unknown[]
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}
```

`db` from `config/database.ts` is wrapped in a three-line adapter; PGlite is wrapped the same way in tests.

---

## 6. Database changes

### 6.1 Problems with the current tables

| Problem | Impact |
|---|---|
| `event_id VARCHAR(100) UNIQUE` is **global** | One event cannot create a row for both the customer and the courier: the second insert violates the constraint |
| No `type` column | Cannot distinguish booked / assigned / delivered / failed for icons, filters or tests |
| No `read_at` | Cannot show *when* a notification was read; weaker audit trail |
| No index on `(user_id, created_at)` | Inbox query degrades to a sequential scan |
| No index for unread count | Count query degrades |
| Preference row may not exist | `GET /preferences` must create defaults safely |
| No defence against Supabase Data API exposure | Notifications contain parcel and address-adjacent information |
| No record of channel selection | Cannot demonstrate that preferences were respected without pretending delivery happened |

### 6.2 Proposed migration — `server/src/database/migrations/004_notifications_hardening.sql`

```sql
-- =============================================================================
-- MEMBER 07: Notification inbox hardening
-- Additive and idempotent: safe to re-run (the migration runner has no ledger).
-- =============================================================================

-- 1. Notification classification and read audit
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivery_channels TEXT[] NOT NULL DEFAULT '{}';

-- 2. Replace the global event constraint with per-recipient idempotency.
--    Postgres treats NULLs as distinct in a unique index, so manually created
--    notifications (event_id IS NULL) are never blocked.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_event_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_unique
  ON notifications (user_id, event_id);

-- 3. Inbox and unread-count indexes
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id)
  WHERE is_read = FALSE;

-- 4. Defence in depth: the Express API uses the owner role over a direct
--    PostgreSQL connection, so RLS does not affect it. These statements stop
--    direct Supabase Data API access through the anon/authenticated roles.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.notifications FROM anon;
    REVOKE ALL ON TABLE public.user_notification_preferences FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.notifications FROM authenticated;
    REVOKE ALL ON TABLE public.user_notification_preferences FROM authenticated;
  END IF;
END
$$;
```

**Safety check before Phase 02:** confirm that the `DATABASE_URL` role owns these tables (in Supabase, the `postgres` role does). If the project ever connects with a non-owner application role, RLS would block reads. The migration README will document the one-line rollback (`DISABLE ROW LEVEL SECURITY`) in that case.

**Why not a separate `processed_events` table?** The per-recipient unique index already makes message processing idempotent: a redelivered message produces the same `event_id` for the same user and conflicts. A second table would add writes without adding correctness. This is simpler to explain and defend in the viva.

### 6.3 Preference semantics (honest scope)

The three toggles control **external channel delivery intent**, not whether the in-app inbox row exists. Rationale: suppressing the inbox row would make delivery events silently disappear from the system of record.

On notification creation, the consumer reads the recipient's preferences and records the enabled channels in `notifications.delivery_channels` (for example `{PUSH,EMAIL}`). No email/SMS/push provider exists in this repository, so:

* The system **does not claim** a message was sent.
* `delivery_channels` means "channels requested by the user's saved preferences at creation time".
* Tests assert that disabling a channel removes it from that array.
* If a provider is added later (email/SMS/push service), the consumer calls it only for the recorded channels.

This is documented in `docs/member-07/RABBITMQ.md` and in the API README so the scope is explicit during evaluation.

---

## 7. Idempotency — design and explanation

### 7.1 The problem

RabbitMQ guarantees **at-least-once** delivery. A message can be delivered twice because:

* The consumer crashed after writing to the database but before acknowledging.
* The broker connection dropped before the ack reached it.
* A publisher retried after a timeout.

Without protection, the second delivery creates a second inbox row.

### 7.2 The design (three layers)

**Layer 1 — a stable event identifier.**

If the publisher supplies `eventId`, use it (length ≤ 100). Otherwise derive a deterministic SHA-256 hash from the canonical event content:

```ts
const canonical = JSON.stringify({
  event,
  parcelId,
  status: status ?? null,
  courierId: courierId ?? null,
  timestamp: timestamp ?? null,
  note: note ?? null,
});
const eventId = `sha256:${createHash('sha256').update(canonical).digest('hex')}`; // 71 chars
```

A redelivery is byte-identical, so it produces the same hash. A genuinely new event (different timestamp/status) produces a different hash. No publisher change is required, and the design improves automatically if Member 04 later adds `eventId`.

**Layer 2 — a database uniqueness rule.**

```sql
CREATE UNIQUE INDEX notifications_user_event_unique
  ON notifications (user_id, event_id);
```

The key is per **recipient**, which allows one event to fan out to the customer and the courier while forbidding a second row for either.

**Layer 3 — an atomic insert that tolerates conflicts.**

```sql
INSERT INTO notifications
  (user_id, parcel_id, event_id, type, title, message, delivery_channels)
VALUES
  ($1, $2, $3, $4, $5, $6, $7),
  ($8, $2, $3, $4, $9, $10, $11)
ON CONFLICT (user_id, event_id) DO NOTHING
RETURNING id, user_id;
```

`ON CONFLICT DO NOTHING` is atomic. If two consumer instances process the same message concurrently, PostgreSQL serialises the index insert: the first commits, the second conflicts and inserts nothing.

### 7.3 Worked example

```
Event E1: PARCEL_OUT_FOR_DELIVERY / parcel P1 / customer C1 / courier K1
Content hash → eventId = sha256:9f2c...

Delivery attempt 1:
  INSERT (C1, P1, sha256:9f2c...)  → inserted
  INSERT (K1, P1, sha256:9f2c...)  → inserted
  COMMIT
  ack

Delivery attempt 2 (broker redelivery):
  INSERT (C1, P1, sha256:9f2c...)  → conflict, skipped
  INSERT (K1, P1, sha256:9f2c...)  → conflict, skipped
  COMMIT
  ack

Result: exactly one inbox row per recipient. RETURNING count is 0, so the
consumer logs "duplicate event skipped" — visible proof for the demo.
```

### 7.4 Failure ordering — why the ack comes last

| Step | Crash behaviour |
|---|---|
| Process event, write to DB, **then** `ack` | Crash before commit → no ack → broker redelivers → insert succeeds once. |
| | Crash after commit, before ack → redelivery → conflict → no duplicate. |
| | Crash after ack → message gone, data committed. |
| Ack **before** DB write (anti-pattern) | Crash after ack → notification lost forever. Never do this. |

This is the key sentence for the viva: **"We ack only after the database transaction commits. A crash can therefore only cause a redelivery, never a lost notification, and the unique index makes the redelivery harmless."**

### 7.5 What must *not* be marked processed

* A thrown SQL error means no ack and no commit, so the event is not considered processed.
* Transient errors are retried with a bounded counter (Section 8.4).
* Only malformed/unsupported messages are acknowledged after being written to the DLQ.

---

## 8. RabbitMQ consumer design

### 8.1 Flow

```
Member 04 / 05 / 02
        │  sendToQueue('swiftdrop_notifications_queue', persistent)
        ▼
swiftdrop_notifications_queue
        │  channel.prefetch(10); manual ack
        ▼
notification-consumer.ts
        │
        ├─ 1. JSON.parse                       → failure → DLQ
        ├─ 2. Zod schema validation            → failure → DLQ
        ├─ 3. Map event + status → type        → unknown event → log + ack (ignore)
        ├─ 4. Validate parcelId is a UUID
        ├─ 5. Look up parcel + active courier + user roles
        ├─ 6. Resolve recipients (customer, courier)
        ├─ 7. Read preferences for each recipient
        ├─ 8. Render title/message from templates
        ├─ 9. INSERT ... ON CONFLICT (user_id, event_id) DO NOTHING
        ├─ 10. Log inserted vs skipped
        └─ 11. ack  (or retry / DLQ on failure)
```

### 8.2 Event contract

```ts
const parcelEventSchema = z.object({
  eventId:       z.string().min(1).max(100).optional(),   // future-proof
  event:         z.string().min(1).max(64),
  parcelId:      z.string().uuid(),
  trackingNumber:z.string().max(30).optional(),
  courierId:     z.string().uuid().optional(),
  courierName:   z.string().max(150).optional(),
  status:        z.string().max(30).optional(),
  note:          z.string().max(1000).optional(),
  timestamp:     z.string().datetime().optional(),
}).passthrough();
```

Supported event names:

| Incoming `event` | Incoming `status` | Notification `type` | Customer | Courier |
|---|---|---|---|---|
| `PARCEL_BOOKED` | — | `PARCEL_BOOKED` | ✅ | — |
| `COURIER_ASSIGNED` | — | `COURIER_ASSIGNED` | ✅ | ✅ |
| `PARCEL_PICKED_UP` | — | `PARCEL_PICKED_UP` | ✅ | — |
| `PARCEL_IN_TRANSIT` | — | `PARCEL_IN_TRANSIT` | ✅ | — |
| `PARCEL_OUT_FOR_DELIVERY` | — | `PARCEL_OUT_FOR_DELIVERY` | ✅ | — |
| `PARCEL_DELIVERED` | — | `PARCEL_DELIVERED` | ✅ | — |
| `PARCEL_FAILED` / `PARCEL_DELIVERY_FAILED` | — | `PARCEL_DELIVERY_FAILED` | ✅ | — |
| `PARCEL_STATUS_UPDATED` | `ASSIGNED` | `COURIER_ASSIGNED` | ✅ | ✅ |
| `PARCEL_STATUS_UPDATED` | `PICKED_UP` | `PARCEL_PICKED_UP` | ✅ | — |
| `PARCEL_STATUS_UPDATED` | `IN_TRANSIT` | `PARCEL_IN_TRANSIT` | ✅ | — |
| `PARCEL_STATUS_UPDATED` | `OUT_FOR_DELIVERY` | `PARCEL_OUT_FOR_DELIVERY` | ✅ | — |
| `PARCEL_STATUS_UPDATED` | `DELIVERED` | `PARCEL_DELIVERED` | ✅ | — |
| `PARCEL_STATUS_UPDATED` | `FAILED` | `PARCEL_DELIVERY_FAILED` | ✅ | — |
| `PARCEL_STATUS_UPDATED` | `CONFIRMED` | `PARCEL_BOOKED` | ✅ | — |

**Recipient resolution uses the database, not the payload:**

1. Customer: `SELECT customer_id FROM parcels WHERE id = $1` — skip if `NULL` (merchant-only order).
2. Courier: `SELECT courier_id FROM courier_assignments WHERE parcel_id = $1 AND is_active = TRUE ORDER BY assigned_at DESC LIMIT 1`. For `COURIER_ASSIGNED`, if no assignment row exists yet, fall back to the payload `courierId`, but only after confirming `users.role = 'COURIER' AND users.is_active = TRUE`.
3. Never trust a user id without verifying the user exists, is active, and has the expected role.

### 8.3 Message templates

Pure function `renderNotification(type, recipientRole, context)`:

| Type | Customer title | Customer message |
|---|---|---|
| `PARCEL_BOOKED` | Parcel booked | Your parcel **{tracking}** has been successfully booked. |
| `COURIER_ASSIGNED` | Courier assigned | A courier has been assigned to your parcel **{tracking}**. |
| `PARCEL_PICKED_UP` | Parcel picked up | Your parcel **{tracking}** has been picked up. |
| `PARCEL_IN_TRANSIT` | Parcel in transit | Your parcel **{tracking}** is currently in transit. |
| `PARCEL_OUT_FOR_DELIVERY` | Out for delivery | Your parcel **{tracking}** is out for delivery. |
| `PARCEL_DELIVERED` | Delivered | Your parcel **{tracking}** has been successfully delivered. |
| `PARCEL_DELIVERY_FAILED` | Delivery attempt failed | Your delivery attempt for **{tracking}** has failed. |

Courier templates:

| Type | Courier title | Courier message |
|---|---|---|
| `COURIER_ASSIGNED` | New delivery assignment | You have been assigned parcel **{tracking}** for pickup and delivery. |
| `PARCEL_DELIVERY_FAILED` | Delivery failure recorded | The failed delivery for **{tracking}** has been recorded. |

Templates are plain functions with unit tests — no notification text is hardcoded in UI components.

### 8.4 Acknowledgement, retry and DLQ policy

| Situation | Action | Reason |
|---|---|---|
| Valid event, DB write succeeds | `ack` | Processed |
| Valid event, all recipients already exist | `ack` | Duplicate, successfully absorbed |
| Unknown event name | `ack` + warning log | Retrying cannot help; not poison data |
| Malformed JSON | publish to DLQ, then `ack` | Poison message; must not loop |
| Schema validation failure | publish to DLQ, then `ack` | Poison message |
| Transient DB / connection error | republish with `x-retry-count + 1` after a short delay, then `ack` the original | Bounded retry without hot-looping |
| Retry count ≥ 5 | publish to DLQ, then `ack` | Operational visibility |
| Missing parcel row | treat as transient (retry ≤ 5) | Parcel may commit moments later |
| Unknown/invalid user id | skip that recipient, process the rest | One bad recipient must not block the other |

DLQ envelope:

```json
{
  "source": "notifications",
  "reason": "INVALID_JSON",
  "error": "Unexpected token ...",
  "failedAt": "2026-11-22T10:15:00.000Z",
  "attempts": 1,
  "original": "<raw message as received>"
}
```

`prefetch(10)` limits in-flight messages per consumer. The queue is asserted `{ durable: true }` with persistent messages, matching the existing publisher.

**Important:** the current `nack(msg, false, false)` does not route to a DLQ unless the queue was declared with a dead-letter exchange argument, which it is not. Changing queue arguments on an existing durable queue causes `PRECONDITION_FAILED`, so the consumer will **explicitly publish to the DLQ queue then ack**, exactly like Member 08's webhook worker does.

### 8.5 Testability

The worker exports:

```ts
export interface NotificationChannel {
  prefetch(n: number): Promise<void>;
  assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
  consume(queue: string, handler: (msg: ConsumerMessage | null) => void): Promise<unknown>;
  ack(msg: ConsumerMessage): void;
  sendToQueue(queue: string, content: Buffer, options?: { persistent?: boolean }): boolean;
}

export async function processNotificationMessage(
  raw: Buffer,
  service: NotificationService,
  channel: NotificationChannel,
  options?: { maxRetries?: number; now?: () => number }
): Promise<'acked' | 'duplicate' | 'ignored' | 'retried' | 'dead-lettered'>;

export const startNotificationConsumer = async () => { ... }; // unchanged signature
```

This keeps `startNotificationConsumer()` working with `workers/index.ts` while allowing the test suite to drive messages without a live broker.

---

## 9. REST API contract

All endpoints require `Authorization: Bearer <supabase-access-token>`.
`userId` is **always** `req.user.id`; no endpoint accepts a user id from the client.

Base path: `/api/v1/notifications`

### 9.1 `GET /api/v1/notifications`

Query parameters (all optional, validated with Zod):

| Param | Type | Default | Rules |
|---|---|---|---|
| `limit` | integer | 20 | 1–50 |
| `cursor` | string | — | opaque base64 of `createdAt|id` |
| `unread` | boolean | false | `true` → only unread |
| `type` | string | — | one of the known notification types |

Response `200`:

```json
{
  "notifications": [
    {
      "id": "0c9e...",
      "type": "PARCEL_OUT_FOR_DELIVERY",
      "title": "Out for delivery",
      "message": "Your parcel SWIFT-991122 is out for delivery.",
      "isRead": false,
      "createdAt": "2026-11-22T10:15:00.000Z",
      "readAt": null,
      "parcelId": "6666...",
      "trackingNumber": "SWIFT-991122",
      "deliveryChannels": ["PUSH", "EMAIL"]
    }
  ],
  "count": 1,
  "nextCursor": "MjAyNi0xMS0yMlQxMDoxNTowMC4wMDBafDBjOWU...",
  "hasMore": false
}
```

Keyset pagination is used instead of `OFFSET` so new notifications arriving mid-scroll do not shift pages.

### 9.2 `GET /api/v1/notifications/unread-count`

```json
{ "unreadCount": 4 }
```

### 9.3 `PATCH /api/v1/notifications/:id/read`

* Validates `:id` is a UUID (400 otherwise).
* `UPDATE ... WHERE id = $1 AND user_id = $2` — idempotent; already-read returns 200.
* Another user's notification or a non-existent id → **404** (not 403, to avoid leaking existence).

```json
{ "message": "Notification marked as read", "notification": { "id": "...", "isRead": true, "readAt": "..." } }
```

### 9.4 `PATCH /api/v1/notifications/read-all`

```json
{ "message": "All notifications marked as read", "updatedCount": 4 }
```

### 9.5 `GET /api/v1/notifications/preferences`

Creates and returns defaults if no row exists (`push/email/sms = true`), in one statement:

```sql
WITH inserted AS (
  INSERT INTO user_notification_preferences (user_id)
  VALUES ($1)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id, push_enabled, email_enabled, sms_enabled, updated_at
)
SELECT * FROM inserted
UNION ALL
SELECT user_id, push_enabled, email_enabled, sms_enabled, updated_at
  FROM user_notification_preferences WHERE user_id = $1
LIMIT 1;
```

```json
{ "preferences": { "pushEnabled": true, "emailEnabled": true, "smsEnabled": false, "updatedAt": "..." } }
```

### 9.6 `PUT /api/v1/notifications/preferences`

Request body — strict Zod object, at least one field:

```json
{ "pushEnabled": false, "emailEnabled": true }
```

* Unknown keys (including `userId`) → **400** with `{ error, code: "VALIDATION_ERROR", fields }`, matching `auth.routes.ts`.
* Upsert in one statement using `COALESCE` so partial updates preserve existing values, and a first-time partial update falls back to the column defaults.
* Response 200 with the persisted row.

```sql
INSERT INTO user_notification_preferences
  (user_id, push_enabled, email_enabled, sms_enabled, updated_at)
VALUES
  ($1, COALESCE($2, TRUE), COALESCE($3, TRUE), COALESCE($4, TRUE), now())
ON CONFLICT (user_id) DO UPDATE SET
  push_enabled  = COALESCE($2, user_notification_preferences.push_enabled),
  email_enabled = COALESCE($3, user_notification_preferences.email_enabled),
  sms_enabled   = COALESCE($4, user_notification_preferences.sms_enabled),
  updated_at    = now()
RETURNING push_enabled, email_enabled, sms_enabled, updated_at;
```

### 9.7 Backwards compatibility

The old stub `GET /api/v1/notifications/inbox` is not called by any current code, but Rule 2 says preserve contracts. I will keep it as a **deprecated alias** of `GET /` with the same response shape, documented as deprecated. The old fake `PUT /preferences` and `PATCH /:id/read` are replaced by their real implementations at the same paths — no contract break.

### 9.8 Status codes

| Code | Use |
|---|---|
| 200 | Successful read / update / idempotent repeat |
| 400 | Invalid UUID, invalid query, invalid body |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but role not allowed (not used for ownership) |
| 404 | Notification not found **or owned by another user** |
| 429 | Rate limited |
| 500/503 | Database unavailable |

Optional: apply `apiRateLimiter` to the router. Given the existing limiter is 100 requests / 15 min per IP, it may interfere with the dashboard polling; I propose **not** attaching it initially and documenting the decision.

---

## 10. Security model

| Requirement | Implementation |
|---|---|
| JWT authentication | `router.use(authenticateToken)` — Supabase token verified server-side, session revocation respected |
| User-level isolation | Every query contains `user_id = req.user.id` in the `WHERE` clause |
| Customers see only their own | SQL scoping + test with two customers |
| Couriers see only their own | Same mechanism + test with two couriers |
| Cannot modify another user's notification | `UPDATE ... WHERE id = $1 AND user_id = $2`; 404 if no row |
| Never trust frontend user ids | No `userId` parameter exists in any DTO; Zod `.strict()` rejects extras |
| Validate all input | Zod for params, query and body |
| Role enforcement | Authentication required for all notification endpoints; inbox pages allowed for CUSTOMER and COURIER; API isolation is per-user, so any authenticated role can safely read only its own rows |
| Preferences protected | Same middleware; preferences keyed by `req.user.id` |
| No existence disclosure | Cross-user access returns 404, not 403 |
| No secrets in logs | Log event ids and types, never tokens or full payloads with phone numbers |
| Data API exposure | RLS + revoke `anon`/`authenticated` in migration 004 |
| SQL injection | Parameterised queries only; no string interpolation |
| PII minimisation | Inbox returns only what the UI needs: type, title, message, tracking number, timestamps |

**Explicit non-goal:** Member 07 does not implement external email/SMS/push delivery. The preference API records intent; the consumer records requested channels. No "sent" status is ever claimed without a provider.

---

## 11. Web frontend plan

### 11.1 Route and access

* Rewrite `web/src/app/(customer)/inbox/page.tsx` as a shared, role-aware **Notification Centre**.
* Add `'COURIER'` to `/inbox` in `AuthBoundary.tsx` (shared file — coordinate with the team).
* Courier and customer both call the same API; the server returns only their own rows.
* Optional navigation integration, to be agreed with the page owners:
  * Customer booking page bell button → `Link href="/inbox"` (`booking/page.tsx:626-635`).
  * Courier sidebar → a "Delivery Inbox" link (`tasks/page.tsx:445-449`).

### 11.2 Page structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  swiftdrop.   Notification Centre                    ← Back          │
├──────────────────────────────────────────────────────────────────────┤
│  Delivery alerts & preferences                    [4 unread]         │
│                                                                      │
│  ┌───────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  Inbox     Preferences        │  │  Channel preferences        │  │
│  │  ─────                        │  │                             │  │
│  │  [All] [Unread]  [Refresh]    │  │  Push notifications   [ON]  │  │
│  │                               │  │  Email notifications  [ON]  │  │
│  │  ● Out for delivery     2m    │  │  SMS notifications    [OFF] │  │
│  │    Your parcel SWIFT-991122   │  │                             │  │
│  │    is out for delivery.       │  │  [ Save preferences ]       │  │
│  │    SWIFT-991122   [Mark read] │  │                             │  │
│  │                               │  │  Saved just now ✓           │  │
│  │  ○ Delivered             1h   │  └─────────────────────────────┘  │
│  │    Your parcel ... delivered  │                                   │
│  │                               │  ┌─────────────────────────────┐  │
│  │  [ Load more ]                │  │  Unread summary             │  │
│  └───────────────────────────────┘  │  4 unread · 18 total        │  │
│                                     └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.3 Behaviour

| State | UI |
|---|---|
| Initial load | Skeleton cards (same height as real cards) + `aria-busy` |
| Empty | Icon + "You're all caught up" / "No unread notifications" |
| Error | Inline `role="alert"` banner + "Try again" button |
| Unread | Orange dot, orange-tinted card, bold title |
| Read | White card, muted title weight |
| Mark one | Optimistic disable of that button, server call, reconcile; revert on error |
| Mark all | Button with pending state; updates list and badge from server response |
| Save preferences | Button disabled while saving; success message with timestamp; inline error on failure; toggles reflect the **server response**, not local optimism |
| Refresh | Re-fetch list + count; keep current filter and scroll |
| Relative time | `Intl.RelativeTimeFormat` with `<time dateTime="...">` for accessibility |
| Pagination | "Load more" using `nextCursor`; preserves existing items |
| Accessibility | Real `<button>`s, visible focus rings, `aria-live="polite"` for status messages, labelled toggles |

### 11.4 Typed client — `web/src/lib/notifications.ts`

```ts
export interface NotificationItem { id: string; type: string; title: string; message: string;
  isRead: boolean; createdAt: string; readAt: string | null;
  parcelId: string | null; trackingNumber: string | null; deliveryChannels: string[]; }

export interface NotificationPreferences { pushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; updatedAt: string; }

export const listNotifications = (params) => fetchApi<NotificationListResponse>(`/notifications?${qs}`);
export const getUnreadCount = () => fetchApi<{ unreadCount: number }>('/notifications/unread-count');
export const markNotificationRead = (id: string) => fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => fetchApi('/notifications/read-all', { method: 'PATCH' });
export const getNotificationPreferences = () => fetchApi<{ preferences: NotificationPreferences }>('/notifications/preferences');
export const updateNotificationPreferences = (input) => fetchApi<{ preferences: NotificationPreferences }>('/notifications/preferences', { method: 'PUT', body: JSON.stringify(input) });
```

No new frontend dependency is required. Tailwind and the existing orange/slate design system are reused.

---

## 12. Mobile plan

| Step | File | Change |
|---|---|---|
| 1 | `mobile/src/components/BottomNavBar.tsx` | Extend `TabKey` with `'alerts'`; add a bell tab; render an unread badge |
| 2 | `mobile/App.tsx` | Route `'alerts'` to the new screen; change `onNotifications` to `setActiveTab('alerts')` |
| 3 | `mobile/src/screens/notifications/NotificationInboxScreen.tsx` | New: list, pull-to-refresh (`RefreshControl`), mark all read, empty/error/loading states, preferences entry |
| 4 | `mobile/src/screens/notifications/NotificationPreferencesScreen.tsx` | New: three `Switch` rows + Save with success/error feedback |
| 5 | `mobile/src/services/notifications.ts` | New: typed calls through `mobileApiFetch` |

Mobile styling follows `Colors` from `theme/colors.ts` and the existing card/section idioms. `BottomNavBar.tsx` and `App.tsx` are shared files, so these changes will be listed for team review before merging.

---

## 13. Testing plan

### 13.1 Framework and commands

* `node:test` + `node:assert/strict`, executed with `tsx --test` (matches `auth.test.ts`).
* New scripts in `server/package.json`:
  * `"test:notifications": "tsx --test src/modules/notifications/notification.test.ts src/workers/notification-consumer.test.ts"`
  * `"demo:notifications": "tsx src/scripts/notification-demo.ts"`
* API/service tests use **PGlite** with a minimal fixture schema plus migration `004`, so they run offline without Supabase or a live PostgreSQL.
* The optional live demo uses the real database and a real RabbitMQ broker through docker-compose.

### 13.2 Required scenarios → test mapping

| # | Required scenario | Test |
|---|---|---|
| 1 | Create a notification successfully | service creates a row for a user |
| 2 | Retrieve a customer's notifications | customer A sees own rows, newest first |
| 3 | Retrieve a courier's notifications | courier A sees own assignment row |
| 4 | Unread count | 3 unread + 1 read → `unreadCount = 3` |
| 5 | Mark one as read | row updates, `readAt` set, unread count drops |
| 6 | Mark all as read | `updatedCount` correct, second call returns 0 |
| 7 | Reject unauthorised access | no token → 401 |
| 8 | Retrieve preferences | defaults created on first call |
| 9 | Enable push | persisted `true` |
| 10 | Disable email | persisted `false`, other fields unchanged |
| 11 | Disable SMS | persisted `false` |
| 12 | Preferences persist | new service instance reads the same values |
| 13 | Consumer respects preferences | `delivery_channels` excludes disabled channels |
| 14 | Valid parcel event → notification | `PARCEL_STATUS_UPDATED/OUT_FOR_DELIVERY` creates customer + courier rows |
| 15 | Duplicate event → no duplicate | process the same buffer twice → row count unchanged, second result `duplicate` |
| 16 | Malformed message | invalid JSON → DLQ publish + ack, no DB write |
| 17 | Temporary DB failure | stub `Queryable` throws → republish with retry count, original acked, no row |
| 18 | Acknowledgement behaviour | success → ack exactly once; permanent failure → no ack before DLQ |
| 19 | Customer A cannot read B's notifications | list scoped; PATCH B's id → 404 |
| 20 | Courier A cannot read B's notifications | courier B's row invisible to A |
| 21 | User cannot modify another user's preferences | both users have separate rows; PUT affects only caller |
| 22 | Invalid request data rejected | bad UUID → 400; unknown body key → 400; non-boolean → 400 |
| 23 | Concurrent duplicate processing | two simultaneous inserts → exactly one row |
| 24 | Event-name variations | `PARCEL_DELIVERED` and `PARCEL_STATUS_UPDATED/DELIVERED` both map correctly |
| 25 | Unknown event | ack + warning, no row |
| 26 | Merchant-owned parcel with no customer | courier still notified, no crash |

### 13.3 Test harness outline

```ts
// Boot PGlite, create the minimal fixture tables, apply migration 004.
// Build a fake auth gateway that maps tokens to profiles:
//   'customer-a-token' → CUSTOMER   1111...
//   'customer-b-token' → CUSTOMER   1111...-b
//   'courier-a-token'  → COURIER    2222...
// Mount createNotificationRouter({ authenticate, service }) on an ephemeral port.
// Assert HTTP status + body for each scenario.
// Clean up with database.close() and server.close().
```

The consumer test uses a fake `NotificationChannel` that records `ack`, `nack`, `sendToQueue` calls, so ack/retry/DLQ behaviour is asserted deterministically.

### 13.4 Demo evidence script

`server/src/scripts/notification-demo.ts`:

1. Ensures a customer, courier, parcel and active assignment exist (creates isolated demo rows).
2. Starts the consumer against the real broker.
3. Publishes `PARCEL_OUT_FOR_DELIVERY`.
4. Polls the inbox via the service and prints the created notifications.
5. Publishes the **same payload again**.
6. Prints row counts before/after, proving no duplicate.
7. Prints the DLQ result for a malformed message.

This produces the log transcript for the screenshots/evidence folder.

---

## 14. Dependencies on other members

| Member | Dependency | Contract | Status |
|---|---|---|---|
| 01 — Identity | `req.user.id`, `role`, Supabase session verification | `AuthRequest.user` | ✅ available |
| 02 — Booking | `PARCEL_BOOKED` event | `{ event, parcelId, trackingNumber, timestamp }` | ⏳ booking routes are stubs |
| 03 — Tracking | Status semantics + `parcel_status_history` | status names match `parcel_status` enum | ✅ enum exists |
| 04 — Courier | Status events on `swiftdrop_notifications_queue` | payload above; **no `eventId` today** | ✅ publishing; no id needed |
| 05 — Dispatch | `COURIER_ASSIGNED` event | `{ event, parcelId, courierId, trackingNumber, timestamp }` | ⏳ dispatch routes are stubs |
| 06 — Merchant | Merchant orders may have `customer_id = NULL` | consumer must skip missing recipients | ✅ schema supports |
| 08 — Webhooks | Shared broker, separate queue | no conflicting consumer | ✅ separate queue |
| 09 — Analytics | None required | — | ✅ |
| 10 — Support | Exception notifications are out of scope unless requested | — | ⏳ confirm |

**Coordination actions required before or during implementation**

1. **Member 04:** confirm the payload above is frozen for the demo. No change is required from them; my consumer derives its own idempotency key. (Optional improvement: add `eventId` later; my parser already accepts it.)
2. **Member 05:** publish `COURIER_ASSIGNED` when `POST /dispatch/assign` is implemented. If they use a different name, the mapping table in `notification.events.ts` is the single place to update.
3. **Member 02:** publish `PARCEL_BOOKED` after booking commit.
4. **Web/mobile owners:** approve the small shared-file changes (`AuthBoundary.tsx`, `BottomNavBar.tsx`, `App.tsx`, optional sidebar links).
5. **Team:** do not run a second consumer on `swiftdrop_notifications_queue`; queue consumers compete unless they are separate queues.

---

## 15. Step-by-step implementation roadmap

### Phase 02 — Database and contracts

1. Add `004_notifications_hardening.sql`.
2. Mirror the final table shape in `schema.sql` with comments.
3. Create `notification.types.ts` and `notification.events.ts` with Zod schemas, type mapping, recipient policy and templates.
4. Verify the migration against a scratch database (or PGlite fixture).
5. **Exit criteria:** migration re-runs cleanly; event mapping unit tests pass.

### Phase 03 — Backend APIs

1. Implement `notification.service.ts` with the `Queryable` interface and all seven operations.
2. Rewrite `notification.routes.ts` as `createNotificationRouter` with Zod validation and correct status codes.
3. Wire the default export to `authenticateToken` + the real pool.
4. Keep `GET /inbox` as a deprecated alias.
5. **Exit criteria:** all 26 test scenarios pass; manual curl checks return expected codes.

### Phase 04 — RabbitMQ consumer and idempotency

1. Rewrite `notification-consumer.ts` with `processNotificationMessage` and `startNotificationConsumer`.
2. Implement recipient resolution, preference lookup, templates, insert with `ON CONFLICT`.
3. Implement retry counter, DLQ publishing, prefetch and logging.
4. Add `notification-consumer.test.ts` with a fake channel.
5. **Exit criteria:** duplicate delivery produces one row; malformed message reaches DLQ; DB failure retries; ack ordering verified.

### Phase 05 — Frontend

1. Add `web/src/lib/notifications.ts`.
2. Rewrite `/inbox` with tabs, real data, loading/empty/error states, preferences persistence.
3. Add `COURIER` to `AuthBoundary`.
4. Add mobile screens and the alerts tab.
5. Optional sidebar/bell links after team approval.
6. **Exit criteria:** customer and courier see only their own notifications; preference changes survive a page reload; errors and empty states render correctly on mobile and desktop.

### Phase 06 — Testing and integration

1. Run `test:notifications` plus existing suites (`test:merchant`, `test:support`, `test:courier`, web tests) to prove nothing regressed.
2. Run `tsc --noEmit` / `npm run build` for server and web.
3. Run the live demo against docker-compose RabbitMQ + PostgreSQL.
4. Fix integration issues with Members 02/04/05.

### Phase 07 — Documentation and demonstration

1. Write `server/src/modules/notifications/README.md`.
2. Write `docs/member-07/{API,DATABASE,RABBITMQ}.md`.
3. Capture screenshots: inbox (customer), inbox (courier), preferences saved, duplicate-event proof, test output.
4. Prepare a 5-minute demo script: login → inbox → mark read → preferences → publish event → refresh → duplicate proof.

### Commands that will be used

```bash
# install once
cd server && npm install
cd ../web && npm install

# database
cd server
npm run migrate

# build and typecheck
npm run build

# Member 07 tests
npm run test:notifications

# live demonstration
docker compose up -d postgres rabbitmq
npm run demo:notifications

# run the app
cd ../web && npm run dev        # builds server first via predev
```

Git hygiene: work stays on `pasindu` (or a `feature/member-07-notifications` branch if you prefer). I will not commit, push, merge or delete branches without your explicit instruction.

---

## 16. Deliverables checklist

| # | Deliverable | Planned artefact |
|---|---|---|
| 1 | Customer inbox | `web/src/app/(customer)/inbox/page.tsx` |
| 2 | Courier inbox | same role-aware page + API |
| 3 | Preferences UI | Inbox "Preferences" tab + mobile screen |
| 4 | Notification REST APIs | `notification.routes.ts` |
| 5 | Preference REST APIs | same router |
| 6 | Database tables | migration `004` + `schema.sql` mirror |
| 7 | RabbitMQ consumer | `workers/notification-consumer.ts` |
| 8 | Parcel event integration | `notification.events.ts` + consumer |
| 9 | Idempotent processing | unique index + content hash + `ON CONFLICT` |
| 10 | Auth + user isolation | middleware + SQL scoping + tests |
| 11 | Automated tests | `notification.test.ts`, `notification-consumer.test.ts` |
| 12 | API documentation | `docs/member-07/API.md` |
| 13 | Database documentation | `docs/member-07/DATABASE.md` |
| 14 | Workflow documentation | `docs/member-07/RABBITMQ.md` |
| 15 | Screenshots + evidence | `docs/member-07/evidence/` |

---

## 17. Files I will touch — and files I will not

### Will create

* `server/src/database/migrations/004_notifications_hardening.sql`
* `server/src/modules/notifications/notification.types.ts`
* `server/src/modules/notifications/notification.events.ts`
* `server/src/modules/notifications/notification.service.ts`
* `server/src/modules/notifications/notification.test.ts`
* `server/src/modules/notifications/README.md`
* `server/src/workers/notification-consumer.test.ts`
* `server/src/scripts/notification-demo.ts`
* `web/src/lib/notifications.ts`
* `mobile/src/screens/notifications/NotificationInboxScreen.tsx`
* `mobile/src/screens/notifications/NotificationPreferencesScreen.tsx`
* `mobile/src/services/notifications.ts`
* `docs/member-07/*`

### Will modify (my module)

* `server/src/modules/notifications/notification.routes.ts` (replace stub)
* `server/src/workers/notification-consumer.ts` (replace stub)
* `web/src/app/(customer)/inbox/page.tsx` (replace mock)
* `server/package.json` (add two scripts only)
* `server/src/database/schema.sql` (document the final shape)

### Will modify only with team agreement

* `web/src/components/layout/AuthBoundary.tsx` (add `COURIER` to `/inbox`)
* `web/src/app/(customer)/booking/page.tsx` (bell → link)
* `web/src/app/(courier)/tasks/page.tsx` (sidebar link)
* `mobile/App.tsx`, `mobile/src/components/BottomNavBar.tsx` (alerts tab)

### Will not touch

`auth/`, `booking/`, `tracking/`, `courier/`, `dispatch/`, `merchant/`, `webhooks/`, `analytics/`, `support/`, `ai/`, the WebSocket bootstrap, docker-compose, or any K8s manifest.

---

## 18. Open questions requiring your decision

1. **Event contract:** the publisher sends no `eventId`. I recommend deriving a SHA-256 content hash and accepting `eventId` if it appears. This requires no change from Member 04. Is that acceptable, or do you want to ask Member 04 to add `eventId`?
2. **Preferences semantics:** the in-app inbox row is always created; the three toggles govern requested external channels. I recommend recording those channels in `delivery_channels` and making no delivery claims, because no email/SMS/push provider exists in the repo. Agree?
3. **Courier inbox route:** one shared `/inbox` page for both customers and couriers (requires adding `COURIER` to `AuthBoundary`), rather than a new URL such as `/courier/inbox`. Agree?
4. **Merchant recipients:** merchant-created parcels may have `customer_id = NULL`. I plan to skip the customer notification and still notify the courier, with no in-app notification to the merchant. Agree?
5. **Database reachability:** tests will use PGlite offline; the live demo uses your Supabase/PostgreSQL from `server/.env`. Please confirm the database and RabbitMQ broker will be running for the demo, and that `npm install` may be run in `server/` and `web/`.

---

## 19. First actions once approved

1. Install dependencies (`server`, `web`).
2. Apply `004_notifications_hardening.sql` in a scratch database and verify idempotency by running it twice.
3. Implement `notification.types.ts` + `notification.events.ts` and their unit tests.
4. Implement `notification.service.ts` and the router.
5. Implement the consumer and idempotency tests.
6. Build the web inbox and preferences.
7. Add mobile screens and the alerts tab.
8. Run every test suite, capture evidence, write the documentation.

**Phase 01 is complete. No application source code has been modified. Awaiting approval to begin Phase 02.**
