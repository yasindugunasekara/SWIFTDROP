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
