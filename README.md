# SwiftDrop - Courier & Parcel Delivery System

SwiftDrop includes a Next.js web app, an Express API with WebSocket tracking, background notification/webhook workers, and an optional React Native / Expo mobile app. Supabase provides PostgreSQL and authentication; Redis and RabbitMQ support background processing.

## Setup guide

1. [Choose a setup](#choose-a-setup) and [install the prerequisites](#prerequisites).
2. [Clone the project and create environment files](#1-clone-and-create-environment-files).
3. [Prepare Supabase](#2-prepare-supabase) and [configure environment values](#3-configure-environment-values).
4. Start with [Docker](#4a-start-with-docker) or [local development](#4b-start-for-local-development).
5. [Create your first accounts](#5-create-accounts-and-verify-the-application).
6. Optionally [run the mobile app](#6-mobile-app-optional) and [run verification](#7-tests-and-builds).

All commands run from the repository root (`SWIFTDROP/`) unless a block explicitly changes directory. There is **no root `package.json`**. Install dependencies separately in `server/`, `web/`, and, optionally, `mobile/`.

## Choose a setup

| Setup | Application processes | Database and authentication | Best use |
|---|---|---|---|
| Docker + hosted Supabase | Docker Compose runs web, API, workers, Redis and RabbitMQ | A separate hosted Supabase development project | Running the application without installing Node.js on the host |
| Local development + hosted Supabase | Node.js runs web, API and workers; Compose runs Redis and RabbitMQ | A separate hosted Supabase development project | Editing application code |
| Local Supabase alternative | Use either application setup above | Supabase CLI runs database/auth containers locally | Working without a hosted Supabase project |

Choose **one database setup**. The application's Compose file does not start PostgreSQL or Supabase Auth. A plain PostgreSQL container alone is insufficient because migrations depend on Supabase's `auth` schema and roles.

## Prerequisites

| Tool or account | When needed |
|---|---|
| Git | All setups |
| Docker Desktop with Docker Compose and Linux containers | The supplied Compose setup and local Supabase |
| Node.js 22+ and npm | Local development, Expo, or the local Supabase instructions below; Docker app images use Node.js 22 |
| Supabase project URL, publishable/anon key, and PostgreSQL connection string | Hosted Supabase setup |
| Android emulator or physical device | Native Android testing |
| macOS and Xcode | iOS simulator |

Start Docker Desktop before continuing. Verify your installed tools:

```bash
git --version
docker compose version
```

For local development/mobile, also run:

```bash
node --version
npm --version
```

The initial installation needs internet access to the npm registry and Docker image registries. On Windows, if PowerShell blocks `npm.ps1` or `npx.ps1`, use `npm.cmd` / `npx.cmd` in the commands below.

## 1. Clone and create environment files

```bash
git clone https://github.com/yasindugunasekara/SWIFTDROP.git
cd SWIFTDROP
```

Create missing environment files without overwriting existing configuration.

**Windows PowerShell:**

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
# Optional: only needed for the mobile application
if (!(Test-Path mobile/.env)) { Copy-Item mobile/.env.example mobile/.env }
```

**macOS / Linux:**

```bash
[ -f .env ] || cp .env.example .env
[ -f server/.env ] || cp server/.env.example server/.env
# Optional: only needed for the mobile application
[ -f mobile/.env ] || cp mobile/.env.example mobile/.env
```

| File | What reads it |
|---|---|
| `.env` | Docker Compose: published ports, broker credentials and shared application URLs |
| `server/.env` | Local API/workers, and the local web app through `web/next.config.ts`; Compose injects it into app containers |
| `mobile/.env` | Expo mobile/web preview; `EXPO_PUBLIC_*` values are public client configuration |

A separate `web/.env` is not required. The root `.env` is not a replacement for `server/.env`. Keep real passwords, database URLs and secret keys out of commits.

## 2. Prepare Supabase

### Option A: Hosted Supabase

1. Create a separate Supabase project for development, or use an existing project whose migrations you manage.
2. Copy its project URL and publishable/anon key into `server/.env`.
3. From the project's **Connect** dialog, copy the PostgreSQL **session pooler** connection string into `DATABASE_URL`. Replace the database password placeholder; percent-encode reserved characters in the password.
4. Initialize a **new** database with all `.sql` files from [`server/src/database/migrations/`](server/src/database/migrations/) in ascending filename order. Use Supabase's SQL Editor, or the local migration runner below after installing server dependencies. If an individual file fails, fix that error before continuing.

For an **existing initialized database**, apply only outstanding migration files. The runner does not maintain an applied-migration ledger. Do not replay the full directory or run `schema.sql` as another initialization step.

**Migration runner (requires host Node.js):**

```bash
npm ci --prefix server
cd server
# New database only: applies every migration in filename order
npm run migrate
cd ..
```

For an existing database needing only the operational update:

```bash
cd server
npm run migrate -- --only 20261122162110_operational_persistence_and_delivery_flows.sql
cd ..
```

That single-file command assumes **all earlier migrations are already applied**. The runner exits unsuccessfully on a connection or migration failure; inspect its output before starting the app. Its PostgreSQL connection uses `DATABASE_URL` directly; if your provider requires additional TLS settings, use the Supabase SQL Editor for initialization.

### Option B: Local Supabase containers

This alternative requires Docker and host Node.js. The repository already contains [`supabase/config.toml`](supabase/config.toml); do not run `supabase init` over it. For CLI installation and version guidance, see the [official Supabase local setup guide](https://supabase.com/docs/guides/local-development/cli/getting-started).

From the repository root, prepare the combined bootstrap SQL **before the first start**:

```bash
node scripts/sync-local-schema.mjs
npx supabase --version
npx supabase start --help
npx supabase start
npx supabase status
```

`sync-local-schema.mjs` combines the canonical backend migrations into an ignored local bootstrap file. The CLI applies it when initializing a fresh local database. It does not incrementally upgrade an already initialized database: apply outstanding source migrations individually instead. Regenerating the file alone does not update a running database.

Use the API URL, publishable/anon key and database URL printed by `supabase status`. With the committed default ports, host processes normally use:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<public key from supabase status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

For **application containers on Docker Desktop**, replace `127.0.0.1` in those two server URLs with `host.docker.internal` so containers can reach the host's Supabase ports. Browser/mobile clients need their own reachable Supabase URL; a physical phone cannot use the computer's loopback address. On Linux Docker Engine, supply an appropriate host gateway/network configuration if `host.docker.internal` is unavailable.

Default local tools are Supabase Studio at `http://localhost:54323` and the email testing inbox at `http://localhost:54324`. Confirmation/reset emails for local Auth appear in that inbox rather than a real mailbox.

The CLI version is not pinned by this repository. Use the same version across the team and check its `--help` when commands/configuration differ. The full fresh-container path remains a live verification item in the test report.

## 3. Configure environment values

### Backend and web: `server/.env`

Replace template placeholders with your project's values. For hosted Supabase and host-based development:

```dotenv
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_PROJECT_PUBLIC_KEY
DATABASE_URL=YOUR_SUPABASE_POSTGRES_CONNECTION_STRING
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://swiftdrop:swiftdrop_local@localhost:5672
TRACKING_WS_URL=ws://localhost:5000/ws/tracking
AUTH_DEMO_ENABLED=false
```

| Setting | Notes |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Must belong to the same project as `DATABASE_URL`. Use a publishable/anon key, never a server secret, in this public-key field. |
| `DATABASE_URL` | PostgreSQL connection string, available only to server processes. Use the normal PostgreSQL driver for this setup. |
| `DATABASE_SSL_CA` | Optional project CA certificate, with literal `\n` line breaks, if required by the runtime database connection. |
| `CORS_ORIGIN` | Comma-separated allowed browser origins. Include `http://localhost:8081` if using Expo web preview on that origin. |
| `TRACKING_WS_URL` | Browser-facing standalone tracking socket URL. Leave empty to use HTTP polling. |
| Proof upload storage | The current handler uses `uploads/` under the process working directory and a fixed 5 MB limit. `UPLOAD_DIR` / `MAX_FILE_SIZE_MB` template values do not currently change these settings. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEBHOOK_HMAC_SECRET` | Replace template secrets with private random values before using a shared environment; use at least 32 characters for the webhook secret. |
| `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`), `AI_MODEL_NAME` | Optional `/assistant` feature. Supply a model currently available to your Google AI account. Other setup steps do not require an AI key. |

`DATABASE_DRIVER=supabase` is an optional development SQL bridge, not the default setup. It requires the SQL bridge migrations and a server-only `SUPABASE_SECRET_KEY`; its statements are not transactional. Prefer `DATABASE_URL` for the operational flows documented here.

### Docker Compose: root `.env`

```dotenv
WEB_PORT=3000
API_PORT=5000
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
TRACKING_WS_URL=ws://localhost:5000/ws/tracking
REDIS_PORT=6379
RABBITMQ_PORT=5672
RABBITMQ_USER=swiftdrop
RABBITMQ_PASSWORD=swiftdrop_local
```

The local development `RABBITMQ_URL` in `server/.env` must match this account. Compose overrides the app containers' Redis/RabbitMQ URLs with Docker service addresses and overrides `APP_URL`, `CORS_ORIGIN` and `TRACKING_WS_URL` from the root `.env`. Supabase settings still come from `server/.env`.

Use a non-`guest` broker account across containers. If you change the password, URL-encode reserved characters in AMQP URLs.

### Authentication callbacks

For hosted Supabase, configure **Authentication > URL Configuration**:

| Field | Development value |
|---|---|
| Site URL | `http://localhost:3000` |
| Redirect URL | `http://localhost:3000/auth/callback` |
| Password reset redirect | `http://localhost:3000/reset-password` |
| Native mobile redirect, when used | `swiftdrop://auth/callback` |
| Expo web Google callback, when used | `http://localhost:8081/auth/callback` (adjust to the actual preview origin) |

Keep email confirmation enabled. Configure SMTP for hosted email delivery and use passwords of at least 8 characters; configure the provider's minimum length to match. The local Supabase configuration already enables email confirmation, but currently has a provider minimum of 6; increase it to 8 if using that route.

**Optional Google sign-in:** Enable Google in Supabase Auth providers and supply your Google OAuth credentials there. Register the Supabase provider callback URL in the Google OAuth client. The app callback in the table above is a separate redirect back to SwiftDrop.

This project expects users to register before Google sign-in. After migrations, activate the **Before User Created** Auth hook using `public.swiftdrop_google_existing_accounts_only`; creating the SQL function alone does not activate the hook. See [Supabase's Auth hook configuration](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook). For local Supabase, configure the corresponding hook in `supabase/config.toml` before restarting the local stack. Set mobile `EXPO_PUBLIC_GOOGLE_EXISTING_ONLY_READY=true` only after the hook is active.

## 4A. Start with Docker

Finish database initialization and environment configuration first. From the repository root:

```bash
docker compose config --quiet
docker compose up --build -d --wait
docker compose ps
docker compose logs --tail=100 server web worker
```

The first build installs locked dependencies and compiles the applications. You do not need host `node_modules`, `dist` or `.next` folders. Do not also run local app processes on the same ports.

| Service | Default address |
|---|---|
| Web application | `http://localhost:3000` |
| Web HTTP API health | `http://localhost:3000/api/v1/health` |
| Standalone API health | `http://localhost:5000/health` |
| Standalone API base | `http://localhost:5000/api/v1` |
| Tracking WebSocket | `ws://localhost:5000/ws/tracking` |
| RabbitMQ management | `http://localhost:15672` (root `.env` credentials) |
| Redis | `127.0.0.1:6379` |

Check configured provider access:

```bash
docker compose exec server node dist/scripts/check-database.js
docker compose exec server node dist/scripts/check-auth-setup.js
```

`check-database` checks Supabase Auth connectivity and anonymous profile access restrictions; it does **not** prove every PostgreSQL operation works. Verify a real booking in step 5 as well.

Uploaded proof files share a named volume between web and API containers. RabbitMQ and Redis also retain data in named volumes.

## 4B. Start for local development

Install server dependencies first because the web app builds the shared backend:

```bash
npm ci --prefix server
npm ci --prefix web
docker compose up -d redis rabbitmq
```

If you have not applied migrations yet, return to step 2 before continuing. Check provider configuration:

```bash
cd server
npm run db:check
npm run auth:check
cd ..
```

Open **three separate terminals**, each initially in the repository root:

| Terminal | Directory | Command | Purpose |
|---|---|---|---|
| 1 | `web/` | `npm run dev` | Web pages and same-origin HTTP API at port 3000 |
| 2 | `server/` | `npm run dev` | Standalone API and live tracking socket at port 5000 |
| 3 | `server/` | `npm run worker` | Outbox relay, notification consumption and webhook delivery/retries |

For example, terminal 1 runs:

```bash
cd web
npm run dev
```

Open `http://localhost:3000`. Next.js's `predev` automatically builds the backend; restart the web app after shared backend source changes. The standalone API serves native mobile requests and WebSockets. Keep the worker process running for asynchronous deliveries; a booking can persist while delivery work waits in the outbox.

For host-based development, web and standalone API store/read proof files in `web/uploads/` and `server/uploads/` respectively. For proof photos to be available through both processes, use a shared filesystem directory linked/mounted at both paths, or use the Docker setup, which already shares an upload volume. Setting `UPLOAD_DIR` alone does not change the current handler's path.

## 5. Create accounts and verify the application

1. Open `/register`, create a customer account, and confirm its email. For local Supabase, retrieve the confirmation link from the local email inbox.
2. Sign in at `/login`. Courier/business registrations require staff approval before operational access.
3. Create a parcel booking and record its tracking number. Reload the page and verify it appears in your history and can be tracked. This checks the configured application database beyond HTTP health.
4. With approved staff accounts, verify dispatch assignment and courier task updates. Keep workers running and inspect logs for event/notification processing.

### First administrator

The application includes an operator-only bootstrap command. After migrations, temporarily set these **server-only** values in `server/.env`:

```dotenv
ADMIN_SEED_EMAIL=your-admin@example.com
ADMIN_SEED_PASSWORD=<unique password of at least 16 characters>
ADMIN_SEED_NAME=SwiftDrop Administrator
SUPABASE_SECRET_KEY=<Supabase secret or legacy service-role key>
```

For local development:

```bash
cd server
npm run seed:admin
cd ..
```

For Docker, recreate the server so it receives the temporary values, then run the compiled command:

```bash
docker compose up -d server
docker compose exec server node dist/scripts/seed-admin.js
```

Sign in through the normal web login and use the admin workspace to review applications. The bootstrap refuses to elevate an existing non-admin account; use a new admin email. Remove the temporary bootstrap values afterward and restart/recreate the affected processes. Never put `SUPABASE_SECRET_KEY` in public client variables.

### Optional demo accounts

For a disposable test project, review and manually run [`supabase-demo-accounts.sql`](server/src/database/seeds/supabase-demo-accounts.sql) after all migrations. Then enable `AUTH_DEMO_ENABLED=true` and verify provisioned accounts with `npm run auth:check -- --demo` from `server/`. Sample profile rows alone do not create working Auth logins. Keep demo shortcuts disabled for normal/shared use.

## 6. Mobile app (optional)

The mobile app uses Expo SDK 51. Use an SDK-compatible client; do not assume the newest Expo Go supports this older SDK. Native custom-scheme OAuth requires a compatible installed native build. iOS simulator testing requires macOS/Xcode.

```bash
npm ci --prefix mobile
```

Edit `mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:5000/api/v1
EXPO_PUBLIC_SUPABASE_URL=YOUR_CLIENT_REACHABLE_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PROJECT_PUBLIC_KEY
EXPO_PUBLIC_GOOGLE_EXISTING_ONLY_READY=false
```

| Client | API base URL |
|---|---|
| Physical phone | `http://<computer-LAN-IP>:5000/api/v1`; same network and reachable host firewall port |
| Standard Android emulator | `http://10.0.2.2:5000/api/v1` |
| iOS simulator | `http://localhost:5000/api/v1` |
| Expo web on the development computer | `http://localhost:5000/api/v1`; allow the preview origin in `CORS_ORIGIN` |

A phone's `localhost` refers to the phone, not your computer. Local Supabase must also be reachable from that client. `EXPO_PUBLIC_WS_URL` exists in the template but is not currently consumed by the mobile services; mobile tracking uses the API.

From `mobile/`, choose one command:

```bash
cd mobile
npm start
# Or launch a specific target:
# npm run android
# npm run ios
# npm run web
```

Restart Expo after editing environment values. Grant camera/location permissions when using those features. Add the actual mobile/web authentication callback to the Supabase redirect allowlist before Google sign-in.

## 7. Tests and builds

Run from the repository root after installing dependencies:

```bash
# Backend audit: isolated database fixtures, mocks and scoped coverage
npm --prefix server run test:audit

# Web client suites matching the recorded report
node --test web/tests/auth-session.test.mjs web/tests/tracking.test.mjs web/tests/notification-helpers.test.mjs

# Mobile service suites
npm --prefix mobile test

# Production web build also builds the shared backend
npm --prefix web run build
```

Optional TypeScript checks, from each application's directory:

```bash
cd web
npx tsc --noEmit
cd ../mobile
npx tsc --noEmit
cd ..
```

The recorded report contains **137 backend + 41 web + 30 mobile = 208 passing checks**. These are recorded local results, not a claim that every new machine or live integration is already verified. Full browser journeys, hosted provider login, fresh Docker installation, native camera and Kubernetes deployment require separate live checks.

- [Design, diagrams and requirement status report](docs/SwiftDrop-design-and-test-report.pdf)
- [Detailed test cases and execution report](docs/test-reports/SwiftDrop-detailed-test-report.pdf)
- [Machine-readable detailed cases](docs/test-reports/detailed-test-cases.json)
- [Backend audit evidence](docs/test-reports/backend-audit.json)

## Stop, restart and update

| Action | Command / procedure |
|---|---|
| Stop local app processes | `Ctrl+C` in each terminal |
| Stop only Compose support services | `docker compose stop redis rabbitmq` |
| Stop Compose applications and keep data | `docker compose down` (without `--volumes`) |
| Rebuild after application changes | `docker compose up --build -d --wait` |
| Apply edited Compose environment values | `docker compose up -d` recreates services whose configuration changed |
| Stop optional local Supabase | `npx supabase stop` |

When updating an existing checkout, preserve local changes, pull the new revision, install updated lockfiles (`npm ci` in affected packages), apply only outstanding migrations, then restart/rebuild the processes. Keep database, broker and uploaded-file volumes if you need the stored data.

## Troubleshooting

| Symptom | Check / fix |
|---|---|
| `npm` cannot find a root `package.json` | Run from the application directory or use `npm --prefix server`, `web`, or `mobile`. |
| Dependency install fails on an old Node version | Use Node.js 22+ and reinstall with `npm ci`. Native-addon build failures may require the platform's native build tools. |
| Docker cannot connect / pull images | Start Docker Desktop in Linux-container mode; check registry access, DNS and proxy settings. |
| A port is already in use | Stop the conflicting process or edit root `.env` published ports. Update public URLs, CORS and Auth redirect allowlists consistently. |
| Login or confirmation fails | Check matching Supabase URL/key, email confirmation/inbox, callback allowlist, migrations and `auth:check`. |
| Google login is disabled or creates unexpected accounts | Enable the provider, check OAuth callback URLs, activate the existing-account hook, and set the mobile readiness flag only afterward. |
| Booking/dispatch says database unavailable | Check `DATABASE_URL`, network/TLS and migration output. Provider/HTTP health checks alone do not validate all SQL operations. |
| Containers cannot reach local Supabase | Container `localhost` is the container itself. On Docker Desktop use `host.docker.internal` for backend Supabase/database URLs. |
| RabbitMQ denies login | Match root broker credentials and local `RABBITMQ_URL`. Existing broker volumes keep their old account; changing `.env` does not reset it. Update the account in RabbitMQ management with existing credentials. |
| Notifications/webhooks do not arrive | Keep the worker running; inspect `docker compose logs --tail=100 worker rabbitmq` or the local worker terminal. SMS is stored in `mock_sms_messages`, not sent to a real phone provider. |
| Proof image works in one process but not another | Share/link `server/uploads/` and `web/uploads/` to the same storage, or use the shared Compose upload volume. Proof access requires an authorized account. |
| Phone cannot connect | Use the computer's LAN IP, same network and reachable firewall ports; configure both API and Supabase URLs for that device. |
| Configuration edits appear ignored | Restart Node/Expo processes or recreate Docker containers. Rebuild containers after source changes. |

## Repository structure

```text
SWIFTDROP/
|-- .env.example              # Docker/shared configuration template
|-- docker-compose.yml        # Web, API, workers, Redis and RabbitMQ
|-- scripts/                  # Local Supabase schema bootstrap helper
|-- supabase/                 # Optional local database/Auth configuration
|-- server/                   # Express API, SQL migrations and event workers
|   |-- .env.example
|   |-- src/database/migrations/
|   |-- src/modules/
|   `-- src/workers/
|-- web/                      # Next.js web app and HTTP API bridge
|-- mobile/                   # React Native / Expo application
|-- docs/                     # Reports, test evidence and diagrams
`-- k8s/                      # Deployment manifests; separate cluster setup
```

The Kubernetes manifests are not a replacement for this local setup guide. They require separately configured images, secrets, ingress and Supabase-compatible authentication/database services; the included plain PostgreSQL manifest alone does not provide Supabase Auth.

## License

This project is proprietary and confidential. Developed by the SwiftDrop Engineering Team.
