# Savr — Technical Project Development Timeline (Phase 1)

> Derived from **`Savr.md`** (Business Logic & Data Model v4) and the business process / database schema.
> Team size: **2 developers**. Tables below have **empty columns to fill in** (Owner, Est., Start, End, Status, Notes).
>
> **Stack:** Backend **Fastify** + **PostgreSQL** · Webserver **nginx** · Web UI **React** · Mobile **Expo React Native** · Payments **Paymennt** · Currency **AED**.
> **Environments (3):** `dev.savr.com` (development — shared progress + QA testing) · `staging.savr.com` (staging) · `savr.com` (production). **No schema migration** — the table-creation code is already (almost) done in the database schema; production data arrives via a **~1-week data migration from staging** (Phase 1c).

---

## How to use this document

- Every task row has blank cells for you to fill: **Owner**, **Est. (d)** = estimate in working days, **Start**, **End**, **Status**, **Notes**.
- **Owner** column: put `A` or `B` (the two developers). A suggested split is noted at the top of each phase, but assignment is yours to decide.
- **Status** suggestion: `todo` / `wip` / `blocked` / `review` / `done`.
- **Depends on** lists the task numbers that must finish first — use it to sequence work and find what can run in parallel.
- Phases can overlap where dependencies allow (e.g. platform/console setup in Phase 3 runs alongside backend work in Phase 2).

### Suggested 2-developer strategy

| Stream | Primary owner | Covers |
|---|---|---|
| **Backend + Database + DevOps** | Dev A (suggested) | Phases 1, 2, 6 (server-side); 3 environments, PostgreSQL/nginx/SSL/IMAP; GitHub Actions CI/CD |
| **Clients (Mobile + Web)** | Dev B (suggested) | Phases 4, 5 |
| **Shared / paired** | Both | Phase 0, Phase 3 (consoles & passes), schema sign-off, integration & QA (Phase 6) |

> These are suggestions only — reassign per person as you fill in the **Owner** column.

> All Phase-1 decisions are locked in `Savr.md` v4 (roles, Paymennt, AED, merchant-confirmed redemption, per-influencer discount) and are already reflected in the tasks below.

---

## Phase 0 — Project setup & foundations
*Suggested: both (paired). Goal: repos, tooling, environments and decisions ready.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 0.1 | Confirm `Savr.md` v4 decisions are locked (roles, Paymennt, AED, merchant-confirmed redemption, per-influencer discount) | Maahyar | 1 | 07-08-2026 | 07-08-2026 | — |  |  |
| 0.2 | Confirm stack — Backend **Fastify** + **PostgreSQL**, webserver **nginx**, web **React**, mobile **Expo React Native**, payments **Paymennt**, currency **AED** | Maahyar | 1 | 07-08-2026 | 07-08-2026 | — |  |  |
| 0.3 | Create repositories / structure (api, web, mobile, infra) | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.2 |  |  |
| 0.4 | Git workflow & branch strategy (`dev` → `staging` → `main`), PR templates, code owners | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.3 |  |  |
| 0.5 | Shared tooling: ESLint, Prettier, TypeScript config, commit hooks | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.3 |  |  |
| 0.6 | Secrets & env strategy **per environment** (dev / staging / prod), `.env.example` per app | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.3 |  |  |
| 0.7 | Provision infrastructure for **3 environments** — development, staging, production (VPS/cloud, SSH, users, firewall) | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.2 |  |  |
| 0.8 | Register domains & DNS — `dev.savr.com`, `staging.savr.com`, `savr.com` (production) | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.7 |  |  |
| 0.9 | Project management board + this timeline populated | Maahyar | 1 | 07-08-2026 | 07-08-2026 | 0.1 |  |  |

---

## Phase 0b — Environments, servers & infrastructure (dev / staging / production)
*Suggested: Dev A (DevOps). Stand up all three environments identically. Full worksheet in `Savr-Infrastructure-Prerequisites.md`.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 0b.1 | Base OS hardening on each environment (updates, non-root users, `ufw`, fail2ban) | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0.7 |  |  |
| 0b.2 | **nginx** install + reverse proxy per env (API upstream, web static, `client_max_body_size` for uploads) | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0b.1 |  |  |
| 0b.3 | **TLS / SSL** (Let's Encrypt / certbot) for `dev.savr.com`, `staging.savr.com`, `savr.com`; auto-renew | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0b.2, 0.8 |  |  |
| 0b.4 | WebSocket proxying (Upgrade/Connection headers, timeouts) where realtime is used | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0b.2 |  |  |
| 0b.5 | **IMAP email configuration** — mailbox, IMAP host/port 993/TLS, credentials in vault (support / bounce inbox) | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0b.1 |  |  |
| 0b.6 | Outbound email (SMTP / provider) + SPF / DKIM / DMARC DNS records | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0.8 |  |  |
| 0b.7 | Confirm `dev.savr.com` is the shared **progress + QA** environment (open to the whole team) | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0b.2, 0b.3 |  |  |

---

## Phase 0c — CI/CD pipelines (GitHub Actions) — server & client, per environment
*Suggested: Dev A. One pipeline per app × environment. Merges to `dev` auto-deploy to `dev.savr.com` so everyone sees progress and QA early.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 0c.1 | Base workflows — lint + test + build on every PR (server, web, mobile) | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0.3 |  |  |
| 0c.2 | **Server** deploy → **development** (`dev.savr.com`) on merge to `dev` | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.1, 0b.2 |  |  |
| 0c.3 | **Server** deploy → **staging** (`staging.savr.com`) on merge to `staging` | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.2 |  |  |
| 0c.4 | **Server** deploy → **production** (`savr.com`) on tag/release + manual approval | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.3 |  |  |
| 0c.5 | **Client (web/React)** deploy → dev / staging / production (build + publish behind nginx) | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.1, 0b.2 |  |  |
| 0c.6 | **Client (mobile/Expo)** — EAS build + OTA update channels per environment (dev/staging/prod) | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.1, 3.10 |  |  |
| 0c.7 | Secrets via GitHub Environments (per env); zero-downtime deploy + rollback; deploy notifications | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.2 |  |  |
| 0c.8 | Post-deploy smoke test / health-check gate on every environment | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0c.2 |  |  |

---

## Phase 1 — Database (schema code already written)
*Suggested: Dev A. Postgres. **No migration phase** — the table-creation code already exists (`create_tables.sql`, `sql_files/`). This phase verifies and reconciles it to the v4 model; seeding is Phase 1c.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 1.1 | Confirm schema from `Savr.md` v4 (roles, Paymennt, AED, merchant-confirmed redemption, per-influencer discount) | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 0.1 |  |  |
| 1.2 | Review the existing table-creation code against the v4 model | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 1.1 |  |  |
| 1.3 | Reconcile v4 gaps in the code — Role enum (7 roles), `RedeemedOffer.redemption_code / confirmed_by / confirmed_at`, `Payment.gateway = paymennt`, currency `AED`, `PromoDiscount` per-influencer | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 1.2 |  |  |
| 1.4 | Verify indexes, unique constraints (email, phone E.164, promo code, membership_number), FKs | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 1.3 |  |  |
| 1.5 | ERD export + schema docs kept in sync with `Savr.md` | Maahyar | 1 | 10-08-2026 | 10-08-2026 | 1.3 |  |  |

---

## Phase 1b — PostgreSQL on the Linux server (dev / staging / production)
*Suggested: Dev A (DevOps). Can start once Phase 0.7 is done; runs alongside Phase 1.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 1b.1 | Install **PostgreSQL** on all three environments (dev / staging / prod) | Rafael | 5 | 20-07-2026 | 24-07-2026 | 0.7 |  |  |
| 1b.2 | Configure Postgres: users/roles, DB, `pg_hba.conf`, network binding, TLS | Rafael | 5 | 20-07-2026 | 24-07-2026 | 1b.1 |  |  |
| 1b.3 | Harden access: firewall rules, least-privilege DB user for the app, no public exposure | Rafael | 5 | 20-07-2026 | 24-07-2026 | 1b.2 |  |  |
| 1b.4 | Apply the existing table-creation code to all three environment DBs; verify schema | Rafael | 5 | 20-07-2026 | 24-07-2026 | 1b.2, 1.4 |  |  |
| 1b.5 | Automated backups (pg_dump / WAL) + retention + restore test | Rafael | 5 | 20-07-2026 | 24-07-2026 | 1b.4 |  |  |
| 1b.6 | Monitoring & alerting (disk, connections, slow queries) | Rafael | 5 | 20-07-2026 | 24-07-2026 | 1b.4 |  |  |
| 1b.7 | Connection pooling (PgBouncer) + tuning | Rafael | 5 | 20-07-2026 | 24-07-2026 | 1b.4 |  |  |

---

## Phase 1c — Seeding + staging→production data migration
*No schema migration (tables already created). What remains is **seeding** dev & staging, then a **~1-week data migration from staging to production**.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 1c.1 | Write idempotent seed script — roles (7), Super Admin + managers, SubscriptionPlan (Tier 3), PayoutRate, PlatformAccount (AED), Categories | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1.3 |  |  |
| 1c.2 | Seed the **development** DB (`dev.savr.com`) — used for shared progress + QA | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1b.4, 1c.1 |  |  |
| 1c.3 | Seed the **staging** DB (`staging.savr.com`); verify Gate 1/Gate 2, paywall & Paymennt flows | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1b.4, 1c.1 |  |  |
| 1c.4 | Review & sign off staging data | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1c.3 |  |  |
| 1c.5 | **Data migration: staging → production (`savr.com`)** — plan, mapping, dry-run, cutover, verify (**budget ~1 week**) | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1c.4 |  |  |
| 1c.6 | Verify production data; lock / rotate any seeded credentials | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1c.5 |  |  |
| 1c.7 | Document seed + staging→production migration runbook | Maahyar | 4 | 11-08-2026 | 14-08-2026 | 1c.5 |  |  |

---

## Phase 2 — Backend server (Fastify)
*Suggested: Dev A. Build the API on **Fastify** against the schema; enforce Gate 1/Gate 2 server-side.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 2.1 | Scaffold **Fastify** server (plugins, config, PostgreSQL connection/pool, health check) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 1.4 |  |  |
| 2.2 | Error handling, logging, request validation, rate limiting | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.1 |  |  |
| 2.3 | Auth — email+password signup/login, password hashing, JWT/session, refresh | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.1 |  |  |
| 2.4 | Social sign-in — Google & Apple (verify token, set `email_verified_at`, UserAuthIdentity) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.3, 3.7 |  |  |
| 2.5 | Phone OTP verification (SMS provider e.g. Twilio) — send, verify, rate limit, cooldown | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.3 |  |  |
| 2.6 | **Gate 1** middleware — block all app endpoints until phone+email verified (server-side) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.4, 2.5 |  |  |
| 2.7 | **Gate 2** middleware — browse allowed, redeem blocked until subscription active | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.6, 2.14 |  |  |
| 2.8 | Roles & RBAC — 7 roles (super_admin, member/merchant/accountant manager, merchant, influencer, member) authorization guards | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.3 |  |  |
| 2.9 | Staff: Super Admin / Merchant Manager manually create merchant & influencer accounts, approvals | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.8 |  |  |
| 2.10 | KYC — private file upload, document review, set `kyc_verified` (admin-only), signed URLs | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.9, 2.19 |  |  |
| 2.11 | Merchant storefront + StorefrontMedia (draft→published), media validation | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.9, 2.19 |  |  |
| 2.12 | Products / offers CRUD + OfferDetail (freebie / buy-n-get-one / time-based) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.11 |  |  |
| 2.13 | Marketplace browse/search (categories, storefront directory) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.12 |  |  |
| 2.14 | Subscriptions + payments (**Paymennt**, AED): checkout, webhooks, Subscription lifecycle | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.6, 3.8 |  |  |
| 2.15 | Membership pass issuance on payment (number + QR/barcode + Apple/Google pass) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.14, 3.5, 3.6 |  |  |
| 2.16 | Promo codes — generate on gate-clear, redemption with 4-gate check, PromoDiscount (admin-only, versioned) | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.9, 2.14 |  |  |
| 2.17 | Offer redemption logic — RedeemedOffer, OfferStampCard, merchant reports | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.12, 2.7 |  |  |
| 2.18 | Financials — PayoutRate (versioned), payout accrual on payment, InfluencerCompensation, Payout (KYC gate, **issued manually by Accountant Manager**), Ledger + PlatformAccount | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.14, 2.16 |  |  |
| 2.19 | File storage service — private (KYC) vs public (media), signed URLs, size/type validation | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.1 |  |  |
| 2.20 | Notifications API + FCM/Expo push dispatch + PushNotificationLog | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.1, 3.4 |  |  |
| 2.21 | Admin dashboard APIs — balance, active payout %, accrued/pending payouts, ledger, approvals | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.18 |  |  |
| 2.22 | API documentation (OpenAPI/Swagger) + Postman collection | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.1 |  |  |
| 2.23 | Backend unit/integration tests | Maahyar | 5 | 14-08-2026 | 20-08-2026 | 2.1 |  |  |

---

## Phase 3 — Platform, console & pass configuration
*Suggested: both (paired — needs Apple/Google org accounts). Runs in parallel with Phase 2.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 3.1 | **Apple Developer** account/enrollment; App ID, bundle identifier, provisioning profiles, certificates | Maahyar | 4 | 21-08-2026 | 26-08-2026 | — |  |  |
| 3.2 | **Google Play Console** — app profile, package name, store listing draft, service account | Maahyar | 4 | 21-08-2026 | 26-08-2026 | — |  |  |
| 3.3 | **Firebase** project — create app(s), config for iOS/Android/web | Maahyar | 4 | 21-08-2026 | 26-08-2026 | — |  |  |
| 3.4 | **Firebase Cloud Messaging** — server key, push credentials (APNs key uploaded to FCM) | Maahyar | 4 | 21-08-2026 | 26-08-2026 | 3.1, 3.3 |  |  |
| 3.5 | **Apple Wallet Pass** — Pass Type ID, pass signing certificate, pass template, `.pkpass` generation config | Maahyar | 4 | 21-08-2026 | 26-08-2026 | 3.1 |  |  |
| 3.6 | **Google Wallet Pass** — Google Wallet API / issuer account, pass class & object, signing (service account) | Maahyar | 4 | 21-08-2026 | 26-08-2026 | 3.2 |  |  |
| 3.7 | OAuth credentials — Google Sign-In client IDs + **Sign in with Apple** (Service ID, key) | Maahyar | 4 | 21-08-2026 | 26-08-2026 | 3.1, 3.2 |  |  |
| 3.8 | Payment provider (**Paymennt**) — merchant account, subscription product/price (AED), API keys, webhooks | Maahyar | 4 | 21-08-2026 | 26-08-2026 | — |  |  |
| 3.9 | SMS provider (Twilio) — account, sender/number, verify service for OTP | Maahyar | 4 | 21-08-2026 | 26-08-2026 | — |  |  |
| 3.10 | EAS / build credentials for Expo (iOS + Android signing) | Maahyar | 4 | 21-08-2026 | 26-08-2026 | 3.1, 3.2 |  |  |

---

## Phase 4 — Mobile app (Expo React Native)
*Suggested: Dev B. Member-facing app (+ merchant/influencer if in-app; else web-only dashboards).*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 4.1 | Scaffold Expo app, navigation, design system/theme, API client | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 0.3 |  |  |
| 4.2 | Auth screens — email+password, Continue with Google, Continue with Apple | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.1, 2.4 |  |  |
| 4.3 | Phone + OTP screen (mandatory next step of Gate 1) | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.2, 2.5 |  |  |
| 4.4 | Verification gating UI — render nothing but verification until Gate 1 satisfied | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.3, 2.6 |  |  |
| 4.5 | Optional promo-code entry + deep-link handling | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.2, 2.16 |  |  |
| 4.6 | Browse offers + merchant storefront pages (with landing video) | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.4, 2.13 |  |  |
| 4.7 | Paywall banner + subscribe flow via **Paymennt** (card / Apple Pay / Google Pay, AED) | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.6, 2.14 |  |  |
| 4.8 | Membership pass — show number/QR + Add to Apple Wallet / Google Wallet | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.7, 2.15 |  |  |
| 4.9 | Offer redemption UX (freebie / stamp card / time-based; merchant-confirmed at the venue via redemption code) | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.8, 2.17 |  |  |
| 4.10 | Push notifications — register device token, handle FCM/Expo notifications | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.4, 2.20 |  |  |
| 4.11 | Influencer dashboard (code, QR/deep link, redemptions, compensation) — if in mobile | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.4, 2.16, 2.18 |  |  |
| 4.12 | Merchant tools (storefront/offers/reports) — if in mobile, else defer to web | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.4, 2.11, 2.12 |  |  |
| 4.13 | Profile/settings, account status handling (suspended/expired) | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.4 |  |  |
| 4.14 | EAS builds + TestFlight / Play internal testing submissions | Maahyar | 10 | 26-08-2026 | 08-09-2026 | 4.1, 3.10 |  |  |

---

## Phase 5 — Web application (React)
*Suggested: Dev B (or split admin ↔ merchant/influencer with Dev A). Admin is the largest surface.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 5.1 | Scaffold **React** web app (build tooling, routing), auth, layout, API client | Rafael | 5 | 26-07-2026 | 31-07-2026 | 0.3 |  |  |
| 5.2 | **Admin** — create/manage merchants & influencers, approvals | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.1, 2.9 |  |  |
| 5.3 | **Admin** — KYC upload/review, set `kyc_verified` | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.2, 2.10 |  |  |
| 5.4 | **Admin** — set payout percentage (versioned) & promo discount value | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.1, 2.18 |  |  |
| 5.5 | **Admin** — payouts: review accruals, approve, authorize (KYC gate), platform balance & ledger | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.4, 2.21 |  |  |
| 5.6 | **Admin** — suspend/revoke promo codes, unpublish storefronts, deactivate accounts | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.2, 2.16, 2.11 |  |  |
| 5.7 | **Merchant** — storefront builder (brand images, landing video), offers, reports | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.1, 2.11, 2.12 |  |  |
| 5.8 | **Influencer** — dashboard: reusable code, share link/QR, redemptions, compensation & payout status | Rafael | 5 | 26-07-2026 | 31-07-2026 | 5.1, 2.16, 2.18 |  |  |
| 5.9 | Notifications composer (admin) + delivery status | Rafael | 5 | 03-08-2026 | 07-08-2026 | 5.1, 2.20 |  |  |
| 5.10 | Public marketing/landing + deep-link (promo code) entry to app stores | Rafael | 5 | 03-08-2026 | 07-08-2026 | 5.1 |  |  |
| 5.11 | Web build served behind **nginx**, deployed to all 3 envs via the CI/CD pipeline | Rafael | 5 | 03-08-2026 | 07-08-2026 | 5.1, 0c.5 |  |  |

---

## Phase 6 — Integration, QA, deployment & launch
*Suggested: both. End-to-end hardening and release.*

| # | Task | Owner | Est. (d) | Start | End | Depends on | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| 6.1 | End-to-end flows: signup → OTP → subscribe → pass → redeem → payout accrual | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 2.18, 4.9, 5.5 |  |  |
| 6.2 | Money-trail verification (ledger, balance, versioned rates, refund/reversal) | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 2.18 |  |  |
| 6.3 | Security review — auth, RBAC, KYC privacy, signed URLs, rate limits, secrets | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 2.23 |  |  |
| 6.4 | Load/perf test on the production-like environment; DB tuning | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 1b.7, 6.1 |  |  |
| 6.5 | Verify CI/CD promotion dev → staging → production (backend + web); rollback drills | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 0c.4, 5.11 |  |  |
| 6.6 | App Store review submission (iOS) + Play Store production submission | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 4.14, 3.1, 3.2 |  |  |
| 6.7 | UAT with stakeholders; bug triage & fixes | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 6.1 |  |  |
| 6.8 | Production launch checklist + monitoring/alerts live | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 6.5, 6.6, 6.7 |  |  |
| 6.9 | Post-launch support & hotfix window | Maahyar & Rafael | 22 | 10-08-2026 | 08-09-2026 | 6.8 |  |  |

---

## Milestones (fill in target dates)

| Milestone | Target date | Owner sign-off | Notes |
|---|---|---|---|
| M0 — Decisions locked, repos & stack ready (end of Phase 0) |  |  |  |
| M0b — 3 environments live (nginx / SSL / IMAP) + CI/CD deploying to `dev.savr.com` (Phase 0b / 0c) |  |  |  |
| M1 — PostgreSQL live on all 3 envs; schema applied, dev/staging seeded, staging→prod migration done (Phase 1 / 1b / 1c) |  |  |  |
| M2 — Backend API feature-complete (Phase 2) |  |  |  |
| M3 — Consoles, Firebase & passes configured (Phase 3) |  |  |  |
| M4 — Mobile app in TestFlight / Play internal (Phase 4) |  |  |  |
| M5 — Web (admin/merchant/influencer) complete (Phase 5) |  |  |  |
| M6 — Launch (Phase 6) |  |  |  |

---

## Timeline overview (fill in weeks)

> Mark the weeks each phase spans. Kept empty for you to plan the calendar.

| Phase | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 | W12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 — Setup |  |  |  |  |  |  |  |  |  |  |  |  |
| 0b — Environments / nginx / SSL / IMAP |  |  |  |  |  |  |  |  |  |  |  |  |
| 0c — CI/CD (GitHub Actions) |  |  |  |  |  |  |  |  |  |  |  |  |
| 1 — Database (verify schema) |  |  |  |  |  |  |  |  |  |  |  |  |
| 1b — PostgreSQL (3 envs) |  |  |  |  |  |  |  |  |  |  |  |  |
| 1c — Seeding + staging→prod migration |  |  |  |  |  |  |  |  |  |  |  |  |
| 2 — Backend |  |  |  |  |  |  |  |  |  |  |  |  |
| 3 — Consoles & passes |  |  |  |  |  |  |  |  |  |  |  |  |
| 4 — Mobile (Expo) |  |  |  |  |  |  |  |  |  |  |  |  |
| 5 — Web |  |  |  |  |  |  |  |  |  |  |  |  |
| 6 — QA & launch |  |  |  |  |  |  |  |  |  |  |  |  |
