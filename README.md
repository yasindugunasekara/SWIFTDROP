# ⚡ SwiftDrop - Courier & Parcel Delivery System

Enterprise courier, dispatch, tracking, and parcel delivery platform developed by a 10-member engineering team.

---

## 📁 Repository Structure

```
SWIFTDROP/
├── .env.example                     # Master environment variables template
├── docker-compose.yml               # Complete Docker orchestration (DB, Redis, RabbitMQ, API, Web, Worker)
├── .gitignore                       # Universal gitignore
├── k8s/                             # Shared Kubernetes Deployment Workstream
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
├── mobile/                          # Mobile App (React Native / Expo for Courier execution & tracking)
│   ├── .env.example
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── screens/
│       │   ├── courier/             # Task lists, proof-of-delivery camera upload
│       │   └── customer/            # Mobile tracking
│       └── services/
├── server/                          # Backend Service (Node.js, Express, WebSockets, PostgreSQL, RabbitMQ)
│   ├── .env.example                 # Backend environment variables
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # Main API & WebSocket server
│       ├── config/                  # DB, RabbitMQ, Redis, environment config
│       ├── middleware/              # JWT auth, RBAC, rate-limiting, error handling
│       ├── database/
│       │   └── schema.sql           # Unified PostgreSQL schema for all 10 members
│       ├── modules/                 # 10 Team Member Modules + AI
│       │   ├── auth/                # [Member 1] Identity & Account Security
│       │   ├── booking/             # [Member 2] Customer Booking & Fee Quote
│       │   ├── tracking/            # [Member 3] Tracking, History & Receipt
│       │   ├── courier/             # [Member 4] Courier Task Execution
│       │   ├── dispatch/            # [Member 5] Dispatch & Service Configuration
│       │   ├── merchant/            # [Member 6] Merchant Account, Orders & Partner API
│       │   ├── notifications/       # [Member 7] Notification Preferences & Delivery Inbox
│       │   ├── webhooks/            # [Member 8] Merchant Webhook Center & DLQ
│       │   ├── analytics/           # [Member 9] Operational Analytics & Reports
│       │   ├── support/             # [Member 10] Parcel Support & Exception Management
│       │   └── ai/                  # [Shared AI Workstream] Smart dispatch, address helper, proof verification
│       └── workers/
│           ├── index.ts             # Background workers runner
│           ├── notification-consumer.ts # RabbitMQ notification consumer
│           └── webhook-worker.ts    # Webhook delivery & retry worker
└── web/                             # Frontend (Next.js 16, React 19, TypeScript)
    ├── .env.example                 # Frontend environment variables
    ├── Dockerfile
    └── src/
        ├── app/                     # App router pages mapped to each member's module
        ├── components/              # Role-aware navigation & shared UI components
        └── lib/                     # API fetchers, JWT auth helpers
```

---

## 🚀 Quick Start (Local Development)

### 1. Environment Configuration
Copy the sample environment files to `.env`:
```bash
# In the root folder
cp .env.example .env

# In server/
cp server/.env.example server/.env

# In web/
cp web/.env.example web/.env.local

# In mobile/
cp mobile/.env.example mobile/.env
```

### 2. Run with Docker Compose
To start PostgreSQL, RabbitMQ, Redis, Server API, Background Worker, and Next.js Frontend:
```bash
docker-compose up --build
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:5000/health](http://localhost:5000/health)
- **RabbitMQ Dashboard**: [http://localhost:15672](http://localhost:15672) (guest / guest)

### Supabase Auth (Member 1)

Signup, password storage, email confirmation, access/refresh sessions, logout,
and Google OAuth now use Supabase Auth. Authentication needs only the existing
SUPABASE_URL and SUPABASE_ANON_KEY in server/.env. DATABASE_URL is not required
for signup or login; other members' direct PostgreSQL business queries still use it.
Never put a service-role/secret key in the anon-key setting or frontend variables.

Start the API from server/ with npm run dev and the web app from web/ with npm run dev.
The web client obtains public Supabase configuration from /api/v1/auth/config,
so a separate web environment file is optional. NEXT_PUBLIC_API_URL overrides
its default http://localhost:5000/api/v1 API address.

Credentials are stored privately in auth.users by Supabase. A database trigger
creates a linked customer profile in the existing public.users table. New mapped
profiles have a NULL password_hash; application APIs and browser clients never
receive hashes. Roles come from public.users, not editable Auth user metadata.
Authenticated clients may read/update only their own allowed profile fields.
Merchant API access also requires approval. Existing profile IDs and business
foreign keys are preserved.

The additive migration is server/src/database/migrations/20261113164606_use_supabase_auth.sql.
It has been applied to SWIFTDROP. For another Supabase project, apply it after the
initial application schema through the SQL Editor or the team's migration process.
Do not run the sample seed to migrate real users. Existing legacy profiles are
not automatically claimed by matching email. An administrator must explicitly
link/migrate existing staff/customer identities; public signup always creates a
CUSTOMER and cannot provision staff roles.

Supabase Dashboard setup:

- Authentication > URL Configuration: set the site URL to the web origin and
  allow http://localhost:3000/auth/callback plus the deployed callback URL.
- Email confirmation remains enabled. Users must confirm their email before login.
  Configure production SMTP for delivery to real customers; observe Supabase's
  email limits. Set the provider's minimum password length to at least 8 as well.
- Authentication > Providers > Google: supply Google OAuth credentials and enable
  the provider. The code uses the real provider flow; Google is currently disabled
  in the hosted project's settings.
- Native mobile login now uses the real /auth/login and /auth/me endpoints. The
  backend profile decides whether the account is a customer or courier; the role
  selector and demo email shortcuts cannot grant access. Merchant/dispatcher
  accounts use the web portal. Mobile social login and signup screens are still
  separate follow-up work.

The web Supabase SDK owns browser session persistence and automatic refresh.
Old mock/local token keys are removed. Backend APIs call Supabase getUser to verify
access tokens and read current profile roles/status under RLS. The additional
`20261113174333_enforce_active_auth_sessions.sql` migration checks ownership and
expiry of the caller's `auth.sessions` row through a restricted boolean RPC.
Every backend authenticated request and successful login/refresh checks this row,
so a logged-out session's JWT is rejected immediately by the application API.
This is not a change to Supabase's general JWT lifetime: direct Data API policies
still enforce their own access rules, and JWTs expire according to project settings.
Web API calls retry a 401 once through a shared refresh operation, preserve the
session on transient network failures, and discard stale responses after logout.
Google/confirmation redirects are handled at /auth/callback. Protect against XSS,
because the browser SDK persists sessions in browser storage.

Mobile refresh tokens and session data use Expo SecureStore (encrypted chunks
with an atomic manifest for SDK 51's item size limits). The mobile web preview
uses sessionStorage. The SDK owns token rotation; the app starts/stops automatic
refresh with foreground/background transitions and revalidates the profile on
resume. Concurrent API failures share a refresh and retry once. Logout revokes
the current session and removes secure storage. No passwords are persisted by
the mobile app. Configure `EXPO_PUBLIC_API_URL` in `mobile/.env` for your server:
Android emulator defaults to `http://10.0.2.2:5000/api/v1`; a physical phone needs
your computer's LAN address. Use HTTPS for deployed servers. Rebuild native apps
after adding the SecureStore config plugin.

Supabase owns JWT signing keys, access-token expiry and refresh-token reuse
detection; the old JWT_ACCESS_SECRET/JWT_REFRESH_SECRET sample variables are not
used for application login. No second custom JWT issuer or refresh-token table
is needed. Keep the provider's refresh-token rotation/reuse protection enabled.

Verification commands from server/:

- npm run db:check: checks live Supabase Auth availability and anonymous profile
  isolation without printing credentials or requiring a database password.
- npm run test:signup: API and isolated PostgreSQL migration/RLS tests, including
  validation, forbidden roles, legacy-ID preservation and prevention of password
  reads/role escalation. No confirmation emails are sent by these tests.
- From web/: npm run test:auth checks refresh concurrency, one retry, network
  failures, logout races and profile restoration.
- From mobile/: npm run test:auth checks session lifecycle and secure storage;
  npx tsc --noEmit checks the native UI integration.

Live registration is checked through /register using an email controlled by the
operator. Confirmation email delivery and the browser confirmation step require
that person's interaction. Do not invent test credentials for a real person's
account or paste passwords/tokens into chat.
