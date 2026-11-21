# ⚡ SwiftDrop - Courier & Parcel Delivery System

[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019-orange)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20WebSockets-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Supabase-blue)](https://supabase.com/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native%20%7C%20Expo%2051-black)](https://expo.dev/)
[![Docker](https://img.shields.io/badge/Infrastructure-Docker%20%7C%20Kubernetes-2496ED)](https://www.docker.com/)

**SwiftDrop** is a mission-critical, enterprise-grade courier, dispatch, real-time tracking, and parcel delivery platform designed and engineered by a 10-member software engineering team. The system provides seamless end-to-end logistics orchestration across Web, Mobile, and Cloud micro-services tailored for the Sri Lankan logistics ecosystem.

---

## 🌟 What's New in Recent Releases

### 🎨 Brand Identity & 3D Visual Hub
- **3D Isometric Logistics Hub**: High-resolution 3D isometric hero background showcasing SwiftDrop's automated distribution facility, conveyor line-hauls, and courier fleet.
- **3D Claymorphic Service Cards**: Custom high-fidelity 3D illustrations for **Same-Day Express**, **GPS Live Tracking**, **Automated Merchant API**, and **Verified Proof of Delivery (POD)**.
- **Electric Orange Favicon Suite**: Custom brand parcel favicon in SVG, ICO, and PNG formats configured with Next.js 16 metadata standards.

### 💰 Transparent Dynamic Pricing & Sri Lankan Rupee (LKR) Migration
- **LKR Currency Standard**: Full migration from USD to Sri Lankan Rupees (`LKR`) across pricing plans, fee estimates, and booking breakdowns.
- **Dynamic Calculation Engine**: Replaced rigid flat fees with a real-time formula based on actual road transit distance (km), scale weight brackets, and priority service level agreements (SLAs).
- **Full-Width Interactive Fee Estimator (`max-w-7xl`)**:
  - **Left Configuration Console**: 3-step selector featuring 4 parcel weight tiers (`< 1 kg`, `1–3 kg`, `3–10 kg`, `10–25 kg`), 3 transit zones (`Intra-City < 15 km`, `Inter-District 15–60 km`, `Island-Wide 60+ km`), and 2 delivery speeds (`Standard Next-Day` vs. `⚡ 2–4 Hours Express`).
  - **Right Live Fare Receipt Card**: Dark slate glassmorphism summary with live LKR range, itemized cost breakdown, guaranteed delivery ETA, free parcel insurance guarantee, and direct booking integration.
- **3 Transparency Pillars**:
  1. *Island-Wide Line-Haul*: Full logistics coverage across all 9 provinces and 25 districts.
  2. *Dynamic Pricing Engine*: Zero artificial markups or hidden surcharges.
  3. *Digital Proof of Delivery*: Geotagged camera snapshots and recipient e-signatures.

### 📡 Real-Time WebSocket Parcel Tracking (Member 3)
- **Live Courier Coordinates**: WebSocket streaming updates for driver GPS location and live delivery route tracking.
- **Milestone Timeline**: Real-time event progression (`Booked`, `Picked Up`, `In Transit`, `Out for Delivery`, `Delivered`).
- **Customer Delivery History & Receipts**: Ownership-verified past shipments, downloadable digital receipts, and public tracking lookup.

### 🛡️ Parcel Support & Exceptions Desk (Member 10)
- **Exceptions Management Console**: Dedicated portal for handling failed delivery attempts, damaged goods, and address corrections.
- **Doorstep Audit Trail**: Review photo proofs captured by couriers, customer dispute logs, and status escalation workflows.

### 🔐 Enterprise Auth & Active Session Security (Member 1)
- **Supabase Auth & Google OAuth**: Production email verification, Google OAuth, and password hashing managed securely via Supabase Auth.
- **Active Session RPC Enforcement**: Restricted boolean RPC database checks to instantly reject revoked or logged-out JWT tokens.
- **Expo SecureStore Integration**: AES-encrypted token persistence and automatic rotation on native mobile devices.

---

## 👥 10-Member Engineering Team Architecture

| # | Member Responsibility | Core Module & Endpoints | Web / Mobile Interface |
|---|------------------------|-------------------------|------------------------|
| **1** | **Identity, Security & Account Management** | `server/src/modules/auth` | `/login`, `/register`, `/auth/callback` |
| **2** | **Customer Booking & Instant Dynamic Quoting** | `server/src/modules/booking` | `/booking`, `/quote` |
| **3** | **Live Real-Time Tracking, History & Receipts** | `server/src/modules/tracking` | `/tracking`, `/tracking/[id]`, `/history` |
| **4** | **Courier Execution & Proof-of-Delivery (POD)** | `server/src/modules/courier` | Mobile App (`mobile/src/screens/courier`) |
| **5** | **Dispatcher Console & Line-Haul Routing** | `server/src/modules/dispatch` | `/dispatch`, `/admin/routes` |
| **6** | **Merchant B2B Portal & Bulk Order API** | `server/src/modules/merchant` | `/portal`, `/merchant`, `/api/v1/merchant` |
| **7** | **Multi-Channel Notifications & Inbox** | `server/src/modules/notifications` | RabbitMQ Worker, User Notifications Bar |
| **8** | **Merchant Webhooks Center & DLQ Retries** | `server/src/modules/webhooks` | `/portal/webhooks`, Webhook Background Worker |
| **9** | **Operational Analytics, Heatmaps & Reports** | `server/src/modules/analytics` | `/analytics`, `/admin/reports` |
| **10** | **Parcel Support Desk & Exception Resolution** | `server/src/modules/support` | `/support`, `/support/exceptions` |
| **★** | **Shared AI Workstream** | `server/src/modules/ai` | Smart Dispatch, Address Verification, OCR POD |

Member 01 setup, API contracts and verification evidence: [Identity and account security](docs/member-01-auth.md).

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
│       │   ├── schema.sql           # Unified PostgreSQL schema for all 10 members
│       │   └── migrations/          # Versioned schema migrations
│       ├── modules/                 # 10 Team Member Modules + AI
│       │   ├── auth/                # [Member 1] Identity & Account Security
│       │   ├── booking/             # [Member 2] Customer Booking & Fee Quote
│       │   ├── tracking/            # [Member 3] Real-Time Tracking, History & Receipt
│       │   ├── courier/             # [Member 4] Courier Task Execution
│       │   ├── dispatch/            # [Member 5] Dispatch & Service Configuration
│       │   ├── merchant/            # [Member 6] Merchant Account, Orders & Partner API
│       │   ├── notifications/       # [Member 7] Notification Preferences & Delivery Inbox
│       │   ├── webhooks/            # [Member 8] Merchant Webhook Center & DLQ
│       │   ├── analytics/           # [Member 9] Operational Analytics & Reports
│       │   ├── support/             # [Member 10] Parcel Support & Exception Management
│       │   └── ai/                  # [Shared AI] Dispatch optimization, OCR & POD audit
│       └── workers/
│           ├── index.ts             # Background workers runner
│           ├── notification-consumer.ts # RabbitMQ notification consumer
│           └── webhook-worker.ts    # Webhook delivery & retry worker
└── web/                             # Frontend (Next.js 16, React 19, TypeScript, Tailwind CSS)
    ├── .env.example                 # Frontend environment variables
    ├── Dockerfile
    ├── public/                      # Static brand assets (3D renders, favicons, logos)
    └── src/
        ├── app/                     # App router pages mapped to each member's module
        ├── components/              # Role-aware navigation & shared UI components
        ├── lib/                     # API fetchers, Supabase client, auth helpers
        └── pages/api/[...path].ts   # Serverless Vercel API bridge
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** (optional for local DB/RabbitMQ)

### 2. Configure Environment Files
Copy the sample environment templates:
```bash
# In the root repository
cp .env.example .env

# Server
cp server/.env.example server/.env

# Web
cp web/.env.example web/.env.local

# Mobile
cp mobile/.env.example mobile/.env
```

#### Supabase Auth setup

- Authentication > URL Configuration: set the site URL to the web origin and
  allow `http://localhost:3000/auth/callback` plus the deployed callback URL.
- Email confirmation remains enabled. Users must confirm their email before login.
  Configure production SMTP for delivery to real customers; observe Supabase's
  email limits. Set the provider's minimum password length to at least 8 as well.
- Authentication > Providers > Google: supply Google OAuth credentials and enable
  the provider. `npm run auth:check` in `server/` reports the live provider status
  without displaying credentials. Google was verified enabled on 2026-11-19.
- Native mobile login uses the real `/auth/login` and `/auth/me` endpoints. The
  backend profile decides whether the account is a customer or courier; the role
  selector and demo shortcuts cannot grant access. Merchant/dispatcher accounts
  use the web portal. Mobile signup and Google PKCE login are implemented;
  courier/business signup enters a staff approval queue before operational access.

See [Member 01 setup](docs/member-01-auth.md) for password-reset callbacks, native
Google redirects, the approval migration and demo configuration.

### 3. Install Dependencies
```bash
# Install server dependencies
cd server && npm install

# Install web dependencies
cd ../web && npm install

# Install mobile dependencies
cd ../mobile && npm install
```

### 4. Run Development Servers

You can run services concurrently in separate terminals:

#### Terminal 1: Backend API & WebSocket Server
```bash
cd server
npm run dev
```
> API listening on `http://localhost:5000` | WebSockets on `ws://localhost:5000`

#### Terminal 2: Next.js Web Frontend
```bash
cd web
npm run dev
```
> Web App running on `http://localhost:3000`

#### Terminal 3: Mobile App (Expo)
```bash
cd mobile
npm run web      # For Web Preview
# or
npm run android  # For Android Emulator
# or
npm run ios      # For iOS Simulator
```
> Expo Dev Server running on `http://localhost:8081`

---

## 🐳 Docker Compose Orchestration

To run the complete micro-services infrastructure (PostgreSQL, RabbitMQ, Redis, API, Worker, and Web):

```bash
docker-compose up --build
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:5000/health](http://localhost:5000/health)
- **RabbitMQ Management Dashboard**: [http://localhost:15672](http://localhost:15672) *(guest / guest)*
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 🧪 Automated Testing & Verification Suite

The repository contains isolated test suites and live demo runners across backend, web, and mobile:

### Backend Testing (`server/`)
```bash
# Verify live Supabase Auth and database connectivity
npm run db:check

# Run Member 1 Auth & RLS signup suite
npm run test:signup

# Run Member 3 Tracking & Receipt suite
npm run test:tracking

# Run Member 3 Live WebSocket tracking suite
npm run test:tracking-socket

# Run Member 4 Courier execution suite & demo
npm run test:courier
npm run demo:courier

# Run Member 5 Dispatch, Workload Balancer & AI suite & demo
npm run test:dispatch
npm run demo:dispatch
npm run db:seed:dispatch

# Run Member 8 Webhooks & DLQ retry suite & demo
npm run test:webhooks
npm run demo:webhooks

# Run Member 10 Parcel Support & Exception Desk suite & demo
npm run test:support
npm run demo:support
```

### Web Testing (`web/`)
```bash
# Test Supabase session lifecycle, token refresh & logout race conditions
npm run test:auth

# Test same-origin Vercel API mounting
npm run test:api

# Test Tracking client state, normalisation & retry
npm run test:tracking

# Type-check TypeScript across the web app
npx tsc --noEmit
```

### Mobile Testing (`mobile/`)
```bash
# Test Expo SecureStore token persistence & Google sign-in
npm run test:auth
```

---

## 🌐 Production Deployment

### Unified Vercel Deployment (Web + API)
The web application is configured to run both the Next.js pages and the Express API serverless handlers on Vercel:
1. In Vercel, set the **Root Directory** to `web` and enable **Include source files outside Root Directory**.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel Project Environment Variables.
3. Set `APP_URL` to your production URL (e.g. `https://swiftdrop.vercel.app`) and authorize `/auth/callback` in Supabase Auth.
4. Next.js automatically mounts API routes at `/api/v1/*` through `web/src/pages/api/[...path].ts`.

### Kubernetes (`k8s/`)
Production enterprise deployment manifests are maintained under `k8s/base/` with ConfigMaps, Secrets, Ingress, and auto-scaling deployments for the API, Background Workers, and Web pods.

---

## 📄 License
This project is proprietary and confidential. Developed by the SwiftDrop Engineering Team.
