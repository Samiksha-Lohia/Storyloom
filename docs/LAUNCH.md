# SceneCraft Production Launch & Hardening Checklist

This document details the operational, security, infrastructure, and legal requirements necessary to transition SceneCraft from staging to a live production environment.

---

## 📋 Table of Contents
1. [Environment & Secrets Management](#1-environment--secrets-management)
2. [Database & Data Integrity (MongoDB)](#2-database--data-integrity-mongodb)
3. [Queue & In-Memory Tier (Redis)](#3-queue--in-memory-tier-redis)
4. [Security & Network Hardening](#4-security--network-hardening)
5. [CDN & Asset Optimization](#5-cdn--asset-optimization)
6. [Monitoring, Telemetry & Logging](#6-monitoring-telemetry--logging)
7. [Legal, Compliance & Trust & Safety](#7-legal-compliance--trust--safety)
8. [Disaster Recovery & Rollback Plan](#8-disaster-recovery--rollback-plan)

---

## 1. Environment & Secrets Management

- [ ] **Rotate All Secrets**: Ensure no staging keys, demo secrets, or development JWT secrets are used in production.
  - `JWT_SECRET`: Must be a cryptographically random 64-byte hex string (generate with `openssl rand -hex 64`).
  - `MONGO_URI`: Use a dedicated production database user with least-privilege read/write permissions.
  - `REDIS_URL`: Use TLS-enabled Redis URL (`rediss://`) with password authentication.
- [ ] **Strict Domain Locks**:
  - `FRONTEND_URL`: Set strictly to your production domain (`https://scenecraft.com`). Multiple origins must not use wildcard `*`.
  - `NODE_ENV`: Set strictly to `production` across all backend instances and background worker nodes.
- [ ] **Secrets Vault**: Store secrets in a managed vault (AWS Secrets Manager, Doppler, or HashiCorp Vault) rather than bare `.env` files on disk.

---

## 2. Database & Data Integrity (MongoDB)

- [ ] **Index Verification**: Run `db.collection.getIndexes()` on all collections to ensure compound indexes are built:
  - `User`: `{ email: 1 }` (unique), `{ username: 1 }` (unique), `{ role: 1 }`, `{ status: 1 }`, `{ lastActiveAt: -1 }`.
  - `Book`: `{ writerId: 1 }`, `{ status: 1, 'stats.reads': -1 }`, `{ genre: 1, status: 1 }`, `{ 'pitchCard.inputHash': 1 }`.
  - `PublishRequest`: `{ publisherId: 1, bookId: 1 }` (unique for `pending`/`accepted`), `{ writerId: 1, status: 1 }`, `{ cooldownUntil: 1 }`.
  - `Conversation`: `{ participants: 1, status: 1 }`, `{ requestId: 1 }` (unique), `{ lastMessageAt: -1 }`.
  - `Message`: `{ conversationId: 1, createdAt: -1 }`, `{ conversationId: 1, readAt: 1 }`.
  - `Wishlist`: `{ publisherId: 1, bookId: 1 }` (unique), `{ publisherId: 1, createdAt: -1 }`.
  - `AuditLog`: `{ targetType: 1, targetId: 1 }`, `{ adminId: 1, createdAt: -1 }`.
- [ ] **Automated Backups & Point-in-Time Recovery**:
  - Enable MongoDB Atlas Continuous Cloud Backups with a minimum 7-day retention window.
  - Validate restore capability in an isolated test environment.
- [ ] **IP Whitelisting**:
  - Restrict Atlas Network Access strictly to the production VPC / static egress NAT IPs of your API cluster. Disable `0.0.0.0/0`.

---

## 3. Queue & In-Memory Tier (Redis)

- [ ] **Redis Memory & Persistence**:
  - Configure `maxmemory-policy: volatile-lru` or `allkeys-lru` to prevent out-of-memory crashes on high cache load.
  - Ensure AOF (Append-Only File) or RDB snapshots are enabled for BullMQ queue durability across restarts.
- [ ] **BullMQ Worker Scalability**:
  - Run background workers (`pipeline.worker.js` and `platform-maintenance.worker.js`) in separate container processes from Express web servers.
  - Configure BullMQ dead-letter queues (`removeOnFail: false` or retention of failed jobs for manual triage).
- [ ] **Cluster / Sentinel Support**:
  - For high availability, utilize Redis Cluster or Redis Sentinel with automatic failover.

---

## 4. Security & Network Hardening

- [ ] **HTTP Security Headers (Helmet)**:
  - Content Security Policy (CSP): Enforce strict origins for scripts, styles, fonts, and WebSocket connections (`connect-src 'self' wss: https:`).
  - HSTS: Set `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
  - Disable `X-Powered-By`.
- [ ] **Tiered Rate Limiting**:
  - Auth routes: 5 requests per 15 minutes per IP (`strictLimiter`).
  - Standard API routes: 120 requests per minute (`apiLimiter`).
  - Read-heavy / search routes: 300 requests per minute (`readLimiter`).
  - Socket Chat: 20 messages per minute per user via Redis token-bucket.
- [ ] **Input Sanitization & Output Encoding**:
  - Chat messages stored raw and rendered strictly as plaintext (no `dangerouslySetInnerHTML`).
  - Contact information filtering enabled on author chats unless explicitly unlocked by author.
- [ ] **WAF (Web Application Firewall)**:
  - Put Cloudflare or AWS WAF in front of the API gateway to mitigate DDoS, bad bots, and SQL/NoSQL injection payloads.

---

## 5. CDN & Asset Optimization

- [ ] **Vite Client Bundle Optimization**:
  - Verify vendor chunks are separated (`charts`, `motion`, `icons`, `vendor`).
  - Ensure Gzip / Brotli compression is active on the static web host (e.g. Vercel, Cloudflare Pages, or Nginx).
- [ ] **Media Delivery (Cloudinary / S3)**:
  - Book covers delivered with automatic format and compression (`f_auto,q_auto`).
  - User manuscript uploads stored with encrypted object storage (SSE-S3 or SSE-KMS).

---

## 6. Monitoring, Telemetry & Logging

- [ ] **Structured Logging**:
  - Centralize Winston logs to Datadog, AWS CloudWatch, or Logtail.
  - Ensure PII (passwords, JWT tokens, unmasked contact information) is scrubbed from logs.
- [ ] **Application Performance Monitoring (APM)**:
  - Configure Sentry or OpenTelemetry on both backend Express and frontend React.
  - Track API endpoint latencies, 5xx error spikes, and unhandled promise rejections.
- [ ] **Alerting Thresholds**:
  - Redis memory usage > 80%.
  - MongoDB connection pool exhaustion > 90%.
  - Express event loop delay > 100ms.
  - BullMQ failed job count > 5 per minute.

---

## 7. Legal, Compliance & Trust & Safety

- [ ] **Terms of Service & Privacy Policy**:
  - Clearly outline author intellectual property retention (SceneCraft does NOT claim ownership of manuscripts).
  - Document publisher terms, confidentiality of submissions, and negotiation guidelines.
- [ ] **DMCA & Copyright Compliance**:
  - Dedicated DMCA agent registered with the US Copyright Office.
  - Public report endpoint (`POST /api/reports`) functional with rapid takedown triage (`status: open` -> `reviewing` -> `closed`).
- [ ] **Audited Admin Inspection**:
  - Ensure administrative viewing of private conversations requires an active report ID and generates a tamper-evident record in `AuditLog`.

---

## 8. Disaster Recovery & Rollback Plan

- [ ] **Immutable Release Tags**:
  - Every production deployment must correspond to a signed Git release tag and immutable Docker image hash.
- [ ] **Database Migrations**:
  - All schema updates must be backward-compatible (expand-and-contract pattern) to allow instant rollback without data loss.
- [ ] **Health Check Endpoints**:
  - `/api/health` probes MongoDB and Redis connectivity before routing traffic to newly deployed containers.
- [ ] **Rollback Runbook**:
  - Maintain a one-command rollback workflow in CI/CD pipeline to revert to the previous container image in under 60 seconds.
