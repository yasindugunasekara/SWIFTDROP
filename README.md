# SwiftDrop - Courier & Parcel Delivery System

## 🚀 Installation and Local Development

### 1. Prerequisites
- **Git** to clone the repository.
- **Node.js 22 or higher** and its bundled **npm**. The pinned Supabase client requires Node.js 22; Node.js 18 is insufficient.
- A **Supabase project** for authentication and the application database, with its URL, anon/publishable key, and PostgreSQL connection string available.
- **Docker Desktop with Docker Compose** for local Redis and RabbitMQ, or existing instances of those services.
- For mobile: an Android emulator or physical device; the iOS simulator requires macOS and Xcode. The app uses Expo SDK 51, so use a compatible client/development build.

Check the tools before starting:

```bash
git --version
node --version
npm --version
docker compose version
```

### 2. Clone the Repository

```bash
git clone https://github.com/yasindugunasekara/SWIFTDROP.git
cd SWIFTDROP
```

All commands below start in the repository root unless a different directory is stated. There is no root `package.json`; install dependencies in each application directory.

### 3. Configure Environment Files

On Windows PowerShell, copy the templates only if the destination files do not already exist:

```powershell
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
Copy-Item mobile/.env.example mobile/.env
```

On macOS/Linux:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env
```

The web app loads `server/.env` through `web/next.config.ts`. A separate `web/.env.example` is not provided or required for local setup. The root `.env` supplies Docker Compose values; it does not automatically configure the standalone backend.

Edit `server/.env` with the following values:

| Variable | Local value / purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_ANON_KEY` | The project's anon/publishable key, never a service-role secret. |
| `DATABASE_URL` | PostgreSQL connection string for the **same Supabase project**, preferably its session pooler URL. Percent-encode reserved characters in the password. |
| `APP_URL` | `http://localhost:3000` |
| `CORS_ORIGIN` | `http://localhost:3000` for the web app; adjust for a different browser preview origin when needed. |
| `PORT` | `5000` for the standalone API. |
| `REDIS_URL` | `redis://localhost:6379` |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` for local development. |
| `TRACKING_WS_URL` | `ws://localhost:5000/ws/tracking` when running the standalone server; leave empty for HTTP polling. |

Keep `AUTH_DEMO_ENABLED=false` unless you intentionally provision examiner/demo accounts. Configure optional AI, webhook, and upload settings from the template only for the features you use. Keep credentials out of commits.

#### Supabase Auth setup

- Authentication > URL Configuration: set the site URL to the web origin and
  allow `http://localhost:3000/auth/callback` plus the deployed callback URL.
- Email confirmation remains enabled. Users must confirm their email before login.
  Configure production SMTP for delivery to real customers; observe Supabase's
  email limits. Set the provider's minimum password length to at least 8 as well.
- Authentication > Providers > Google: supply Google OAuth credentials and enable
  the provider. `npm run auth:check` in `server/` reports the live provider status
  without displaying credentials.
- Native mobile login uses the real `/auth/login` and `/auth/me` endpoints. The
  backend profile decides whether the account is a customer or courier; the role
  selector and demo shortcuts cannot grant access. Merchant/dispatcher accounts
  use the web portal. Mobile signup and Google PKCE login are implemented;
  courier/business signup enters a staff approval queue before operational access.

See [Member 01 setup](docs/member-01-auth.md) for password-reset callbacks, native
Google redirects, the approval migration and demo configuration.

### 4. Install Dependencies

Use the committed lockfiles for reproducible installation:

```bash
npm ci --prefix server
npm ci --prefix web
npm ci --prefix mobile
```

The mobile installation is optional if you are only reviewing the web application.

### 5. Initialize the Database and Supporting Services

Use a new development Supabase project. The migrations reference Supabase's `auth` schema and roles, so a plain PostgreSQL container alone cannot initialize the current application.

From the repository root, start the local messaging/cache services:

```bash
docker compose up -d redis rabbitmq
```

Then apply migrations to the database configured in `server/.env`:

```bash
cd server
npm run migrate
npm run db:check
npm run auth:check
```

The migration command reads SQL files from `server/src/database/migrations/` in filename order, including the initial schema, sample data, Supabase Auth integration, session checks, and account approval changes. Alternatively, run those files in that order through the Supabase SQL Editor. Do not also run `schema.sql` as a second initialization step.

The current runner does not track applied migrations and can report an error without a nonzero exit code. Check its output for successful application of every file, then verify connectivity with `db:check`; do not repeatedly replay all migrations against an existing database. Apply only outstanding files to an existing project.

For optional demo identities, follow [Member 01 setup](docs/member-01-auth.md) and the instructions in `server/src/database/seeds/supabase-demo-accounts.sql` after migrations. Ordinary sample profile rows alone do not create working Supabase Auth logins.

### 6. Run the Applications

Open separate terminals from the repository root. For web-only use, the Next.js process serves both pages and HTTP API routes; start the standalone backend additionally for native mobile API access or live WebSocket tracking.

#### Terminal 1: Web Application and HTTP API
```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Verify the embedded API at [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health). The `predev` script builds the shared server package automatically, so install server dependencies first. Restart the web process after changes to shared backend code.

#### Terminal 2: Standalone Backend and WebSockets
```bash
cd server
npm run dev
```
> API: `http://localhost:5000/api/v1` | Health: `http://localhost:5000/health` | Live tracking: `ws://localhost:5000/ws/tracking`

#### Terminal 3: Background Workers
```bash
cd server
npm run worker
```

Run workers for notification delivery and webhook retries with RabbitMQ and the database configured.

#### Terminal 4: Mobile App (Optional)

Edit `mobile/.env`: set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the same project as the backend. Set `EXPO_PUBLIC_API_URL` to `http://<computer-LAN-IP>:5000/api/v1` on a physical phone, or `http://10.0.2.2:5000/api/v1` on the standard Android emulator. A phone's `localhost` refers to the phone itself. Set the socket URL to the reachable backend host as well. The phone and computer must share a network, with port 5000 reachable.

```bash
cd mobile
npm run web      # For Web Preview
# or
npm run android  # For Android Emulator
# or
npm run ios      # For iOS Simulator
```
> Expo Dev Server running on `http://localhost:8081`

Restart Expo after environment changes. For the iOS simulator, use `http://localhost:5000/api/v1`. See [Member 01 setup](docs/member-01-auth.md) for native authentication redirects and Google login prerequisites.

### 7. Verify and Troubleshoot

- Open `/register`, register a customer, confirm the verification email, and sign in at `/login`. Courier/business applications require staff approval before operational access.
- If login fails, check the Supabase URL/key, callback allowlist, email confirmation, and migration output. Run `npm run auth:check` from `server/`.
- If a business page reports database errors, check `DATABASE_URL` and run `npm run db:check` from `server/`; a healthy HTTP endpoint alone does not prove database connectivity.
- If notifications or retries fail, run `docker compose ps` and check the worker terminal. RabbitMQ management is available at `http://localhost:15672` (`guest` / `guest` locally).
- If a port is occupied, stop the conflicting process or select another port and update the corresponding URLs, CORS origin, and auth redirects.
- Stop application terminals with `Ctrl+C`. Run `docker compose stop redis rabbitmq` from the repository root to stop supporting services while keeping their data.

## 📁 Repository Structure

```
SWIFTDROP/
├── .env.example                     # Master environment variables template
├── docker-compose.yml               # Complete Docker orchestration (DB, Redis, RabbitMQ, API, Web, Worker)
├── .gitignore                       # Universal gitignore
├── k8s/                             # Kubernetes deployment manifests
│   └── base/
│       ├── kustomization.yaml
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secrets.example.yaml
│       ├── postgres.yaml
│       ├── rabbitmq.yaml
│       ├── redis.yaml
│       ├── api-deployment.yaml
│       ├── worker-deployment.yaml
│       ├── web-deployment.yaml
│       └── ingress.yaml
├── mobile/                          # Mobile App (React Native / Expo 51 for Couriers & Tracking)
│   ├── .env.example
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── screens/
│       │   ├── courier/             # Task lists, proof-of-delivery camera upload
│       │   └── customer/            # Mobile parcel tracking
│       └── services/
├── server/                          # Backend API & WebSocket Server (Node.js, Express, TS, PostgreSQL)
│   ├── .env.example                 # Backend environment variables
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # Main API & WebSocket server
│       ├── config/                  # DB, RabbitMQ, Redis, environment config
│       ├── middleware/              # JWT auth, RBAC, rate-limiting, error handling
│       ├── database/
│       │   ├── schema.sql           # Application PostgreSQL schema
│       │   └── migrations/          # Versioned schema migrations
│       ├── modules/                 # Application modules
│       │   ├── auth/                # Identity & Account Security
│       │   ├── booking/             # Customer Booking & Fee Quote
│       │   ├── tracking/            # Real-Time Tracking, History & Receipt
│       │   ├── courier/             # Courier Task Execution
│       │   ├── dispatch/            # Dispatch & Service Configuration
│       │   ├── merchant/            # Merchant Account, Orders & Partner API
│       │   ├── notifications/       # Notification Preferences & Delivery Inbox
│       │   ├── webhooks/            # Merchant Webhook Center & DLQ
│       │   ├── analytics/           # Operational Analytics & Reports
│       │   ├── support/             # Parcel Support & Exception Management
│       │   └── ai/                  # Dispatch optimization, OCR & POD audit
│       └── workers/
│           ├── index.ts             # Background workers runner
│           ├── notification-consumer.ts # RabbitMQ notification consumer
│           └── webhook-worker.ts    # Webhook delivery & retry worker
└── web/                             # Frontend (Next.js 16, React 19, TypeScript, Tailwind CSS)
    ├── Dockerfile
    ├── public/                      # Static brand assets (3D renders, favicons, logos)
    └── src/
        ├── app/                     # App router pages
        ├── components/              # Role-aware navigation & shared UI components
        ├── lib/                     # API fetchers, Supabase client, auth helpers
        └── pages/api/[...path].ts   # Serverless Vercel API bridge
```
