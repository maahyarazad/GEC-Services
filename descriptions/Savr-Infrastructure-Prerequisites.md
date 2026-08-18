# Savr — Infrastructure Prerequisites (Technical Setup Worksheet)

> Server-side prerequisites to stand up **Savr** on a Linux server **before** application deployment.
> Covers: Domain & DNS, Linux base, **PostgreSQL**, **Nginx reverse proxy**, **TLS/SSL**, **WebSocket**, **IMAP** (inbound email).
> Worksheet tables have **empty cells to fill in** (values, owner, status). Config snippets are templates — replace every `<placeholder>`.

## How to use

- Do phases **P0 → P7 in order**; each phase ends with an **acceptance check** you tick off.
- Fill blank cells: **Value / Owner / Status / Notes**. Status: `todo` / `wip` / `done` / `blocked`.
- Do **one column per environment** — repeat the worksheets for **staging** and **production**.
- Never write real secrets in this document — record only *where* a secret lives (vault key/path).

### Environment being provisioned (fill one sheet per env)

| Field | Value |
|---|---|
| Environment (staging / production) |  |
| Target go-live date |  |
| Owner (this env) |  |
| Cloud / host provider |  |
| Region |  |

---

## Phase P0 — Domain & DNS worksheet
*Register domains and map every subdomain the platform needs. DNS propagation can take up to 24–48h — do this first.*

### P0.1 Registrar & zone

| Field | Value | Owner | Status | Notes |
|---|---|---|---|---|
| Root domain (e.g. `savr.app`) |  |  |  |  |
| Domain registrar |  |  |  |  |
| DNS provider (registrar / Cloudflare / Route53) |  |  |  |  |
| Nameservers (NS1 / NS2) |  |  |  |  |
| Registrar lock enabled |  |  |  |  |
| Auto-renew enabled |  |  |  |  |

### P0.2 Subdomain / record plan

| Purpose | Hostname | Type | Points to (IP / target) | Proxied? | TTL | Status |
|---|---|---|---|---|---|---|
| Marketing / public site | `www` / root | A / CNAME |  |  |  |  |
| Backend API | `api.` | A |  |  |  |  |
| Web app (member/merchant) | `app.` | A |  |  |  |  |
| Admin dashboard | `admin.` | A |  |  |  |  |
| WebSocket endpoint (if split) | `ws.` | A |  |  |  |  |
| Media / uploads (optional CDN) | `cdn.` / `media.` | CNAME |  |  |  |  |
| Mail — sending domain SPF | root | TXT |  |  |  |  |
| Mail — DKIM | `<selector>._domainkey` | TXT |  |  |  |  |
| Mail — DMARC | `_dmarc` | TXT |  |  |  |  |
| Mail — MX (if self-receiving) | root | MX |  |  |  |  |
| Deep-link / universal-link verification | `.well-known` host | A |  |  |  |  |

**Acceptance P0:** `dig +short api.<domain>` resolves to the server IP from an external network; all subdomains resolve; mail TXT records present.

---

## Phase P1 — Linux server base & hardening
*Bring the box to a known-good, secured baseline before installing services.*

| # | Task | Value / detail | Owner | Status | Notes |
|---|---|---|---|---|---|
| P1.1 | OS + version (e.g. Ubuntu 22.04 LTS) |  |  |  |  |
| P1.2 | Server specs (vCPU / RAM / disk) |  |  |  |  |
| P1.3 | Public IPv4 / IPv6 |  |  |  |  |
| P1.4 | Create non-root sudo user; disable root SSH login |  |  |  |  |
| P1.5 | SSH key-only auth (`PasswordAuthentication no`) |  |  |  |  |
| P1.6 | `apt update && upgrade`; enable unattended-security-upgrades |  |  |  |  |
| P1.7 | Timezone + NTP sync |  |  |  |  |
| P1.8 | Swap file sized (if low RAM) |  |  |  |  |
| P1.9 | `fail2ban` installed (SSH jail) |  |  |  |  |
| P1.10 | Firewall (ufw) enabled — see port matrix below |  |  |  |  |

### P1.11 Firewall / port matrix

| Port | Service | Exposure | Allowed from | Status |
|---|---|---|---|---|
| 22 | SSH | restricted | admin IPs / VPN |  |
| 80 | HTTP (nginx → redirect to 443) | public | anywhere |  |
| 443 | HTTPS (nginx) | public | anywhere |  |
| 5432 | PostgreSQL | **private only** | app host / localhost |  |
| 3000 (or `<app port>`) | Node backend (upstream) | **localhost only** | 127.0.0.1 |  |
| 993 | IMAP (outbound to mail host) | egress | — |  |
| 587 | SMTP submission (egress) | egress | — |  |

```bash
# ufw baseline
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80,443/tcp
# Postgres stays private — do NOT `ufw allow 5432` to the world
sudo ufw enable
```

**Acceptance P1:** SSH works via key only; `ufw status` shows the matrix; `sudo` user confirmed; automatic security updates on.

---

## Phase P2 — PostgreSQL setup
*Primary datastore for Savr (UUID / JSON / decimal / enum schema).*

### P2.1 Install & cluster

| # | Task | Value / detail | Owner | Status | Notes |
|---|---|---|---|---|---|
| P2.1a | PostgreSQL major version (e.g. 16) |  |  |  |  |
| P2.1b | Install from PGDG repo; init cluster |  |  |  |  |
| P2.1c | Data directory / disk mount |  |  |  |  |
| P2.1d | Locale / encoding = `UTF8` |  |  |  |  |

### P2.2 Roles & databases worksheet

| Item | Value | Secret location (vault key) | Status |
|---|---|---|---|
| App database name |  |  |  |
| App role (least-privilege) |  | `<vault/path>` |  |
| Migration/owner role |  | `<vault/path>` |  |
| Read-only role (reporting, optional) |  | `<vault/path>` |  |
| Connection string (`DATABASE_URL`) shape | `postgres://<user>:<pw>@127.0.0.1:5432/<db>` | `<vault/path>` |  |

```sql
-- least-privilege app setup
CREATE ROLE savr_app LOGIN PASSWORD '<from-vault>';
CREATE DATABASE savr OWNER savr_owner;
GRANT CONNECT ON DATABASE savr TO savr_app;
-- after migrations: grant table/sequence privileges to savr_app, not superuser
```

### P2.3 Access & network (`postgresql.conf` / `pg_hba.conf`)

| Setting | Value | Status |
|---|---|---|
| `listen_addresses` | `localhost` (or private IP only) |  |
| `pg_hba.conf` — app connection | `host savr savr_app 127.0.0.1/32 scram-sha-256` |  |
| `password_encryption` | `scram-sha-256` |  |
| SSL for remote conns (if any) | `on` |  |

### P2.4 Tuning (fill from server RAM)

| Parameter | Suggested basis | Value | Status |
|---|---|---|---|
| `shared_buffers` | ~25% RAM |  |  |
| `effective_cache_size` | ~50–75% RAM |  |  |
| `work_mem` | per-op, modest |  |  |
| `maintenance_work_mem` | for migrations/indexes |  |  |
| `max_connections` | app + pooler |  |  |

### P2.5 Pooling, backups & monitoring

| # | Task | Value / detail | Owner | Status | Notes |
|---|---|---|---|---|---|
| P2.5a | PgBouncer (transaction pooling) |  |  |  |  |
| P2.5b | Automated backups (pg_dump / WAL / `pgBackRest`) + schedule |  |  |  |  |
| P2.5c | Backup retention + **restore test** performed |  |  |  |  |
| P2.5d | Off-server backup destination (S3 / bucket) |  |  |  |  |
| P2.5e | Monitoring (disk, connections, slow queries) |  |  |  |  |

**Acceptance P2:** app role connects over `127.0.0.1` with SCRAM; Postgres not reachable from public internet; a backup has been taken **and restored** to a scratch DB.

---

## Phase P3 — Nginx & reverse proxy
*Nginx terminates TLS and reverse-proxies to the Node backend and serves the web app.*

| # | Task | Value / detail | Owner | Status | Notes |
|---|---|---|---|---|---|
| P3.1 | Install nginx; enable + start |  |  |  |  |
| P3.2 | Node backend upstream host:port (localhost) |  |  |  |  |
| P3.3 | Web app: static build path or proxied dev server |  |  |  |  |
| P3.4 | `client_max_body_size` set for media/KYC uploads |  |  |  |  |
| P3.5 | Gzip / caching for static assets |  |  |  |  |
| P3.6 | Security headers (HSTS, X-Frame-Options, etc.) |  |  |  |  |
| P3.7 | Access + error logs / log rotation |  |  |  |  |

```nginx
# /etc/nginx/sites-available/api.<domain>
upstream savr_api { server 127.0.0.1:<app_port>; keepalive 32; }

server {
    listen 443 ssl http2;
    server_name api.<domain>;

    ssl_certificate     /etc/letsencrypt/live/api.<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.<domain>/privkey.pem;

    client_max_body_size 25m;              # media / KYC uploads
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    location / {
        proxy_pass http://savr_api;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {                                    # HTTP → HTTPS redirect
    listen 80;
    server_name api.<domain>;
    return 301 https://$host$request_uri;
}
```

**Acceptance P3:** `curl -I https://api.<domain>` returns the app through nginx; HTTP redirects to HTTPS; large upload within limit succeeds.

---

## Phase P4 — TLS / SSL
*Free, auto-renewing certificates via Let's Encrypt (certbot), strong ciphers.*

| # | Task | Value / detail | Owner | Status | Notes |
|---|---|---|---|---|---|
| P4.1 | Install certbot (+ nginx plugin) |  |  |  |  |
| P4.2 | Issue certs for each host (api / app / admin / www) |  |  |  |  |
| P4.3 | Wildcard cert (DNS-01) if many subdomains |  |  |  |  |
| P4.4 | Auto-renewal timer active + dry-run passes |  |  |  |  |
| P4.5 | TLS 1.2/1.3 only; disable old protocols/ciphers |  |  |  |  |
| P4.6 | HSTS enabled; OCSP stapling on |  |  |  |  |
| P4.7 | Renewal-failure alerting |  |  |  |  |

### P4.8 Certificate inventory

| Hostname | Issuer | Expiry date | Auto-renew | Status |
|---|---|---|---|---|
| `api.<domain>` |  |  |  |  |
| `app.<domain>` |  |  |  |  |
| `admin.<domain>` |  |  |  |  |
| `www` / root |  |  |  |  |

```bash
sudo certbot --nginx -d api.<domain> -d app.<domain> -d admin.<domain>
sudo certbot renew --dry-run          # verify auto-renewal
```

**Acceptance P4:** SSL Labs / `openssl s_client` shows a valid chain, TLS 1.2+ only, grade A; `certbot renew --dry-run` succeeds.

---

## Phase P5 — WebSocket setup
*Real-time channel (e.g. notifications, live admin/merchant updates). Nginx must upgrade the connection.*

| # | Task | Value / detail | Owner | Status | Notes |
|---|---|---|---|---|---|
| P5.1 | WS path/host decided (`/ws` on api. or dedicated `ws.`) |  |  |  |  |
| P5.2 | Nginx `Upgrade`/`Connection` headers configured |  |  |  |  |
| P5.3 | Proxy read/send timeouts raised for long-lived sockets |  |  |  |  |
| P5.4 | Sticky sessions / single node (or shared adapter if scaled) |  |  |  |  |
| P5.5 | Auth on WS handshake (token) verified server-side |  |  |  |  |
| P5.6 | Heartbeat/ping-pong + reconnect strategy |  |  |  |  |

```nginx
# add inside the api server{} block (or a dedicated ws. server)
location /ws/ {
    proxy_pass http://savr_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host       $host;
    proxy_read_timeout  3600s;
    proxy_send_timeout  3600s;
}
```

**Acceptance P5:** a `wss://<host>/ws` client connects, authenticates, exchanges a ping/pong, and survives >60s idle without being dropped.

---

## Phase P6 — IMAP setup (inbound email)
*Read a mailbox over IMAP (e.g. support inbox, bounce/reply handling) via the app's IMAP client.*

### P6.1 Mailbox worksheet

| Field | Value | Secret location (vault key) | Status |
|---|---|---|---|
| Mail provider (Gmail/Google Workspace, M365, IMAP host) |  |  |  |
| IMAP host |  |  |  |
| IMAP port (993 = implicit TLS) | `993` |  |  |
| TLS mode (SSL/TLS) | `TLS` |  |  |
| Account / mailbox address |  |  |  |
| Auth type (app password / OAuth2 / password) |  |  |  |
| App password or OAuth token |  | `<vault/path>` |  |
| Mailbox folders to watch (INBOX / Support / …) |  |  |  |

### P6.2 Tasks

| # | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P6.2a | Create/dedicate the mailbox; enable IMAP on provider |  |  |  |
| P6.2b | Generate app password / OAuth credential (MFA-safe) |  |  |  |
| P6.2c | Configure app IMAP env vars (host/port/user/secret) |  |  |  |
| P6.2d | Idle/poll strategy + processed-flag/move rule |  |  |  |
| P6.2e | Egress firewall allows 993 to mail host |  |  |  |
| P6.2f | Outbound sending (SMTP 587 / provider API) configured |  |  |  |

```bash
# .env (values from vault — never commit)
IMAP_HOST=<imap.host>
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=<mailbox@domain>
IMAP_PASSWORD=<app-password-from-vault>
IMAP_MAILBOX=INBOX
```

**Acceptance P6:** the app authenticates to IMAP over TLS, lists INBOX, reads a test message, and marks/moves it per the processing rule.

---

## Phase P7 — Integration & go-live checklist

| # | Check | Owner | Status | Notes |
|---|---|---|---|---|
| P7.1 | DNS for all hosts resolves externally |  |  |  |
| P7.2 | Nginx serves API + web over HTTPS; HTTP redirects |  |  |  |
| P7.3 | TLS grade A; auto-renew dry-run passes |  |  |  |
| P7.4 | Postgres reachable only privately; app connects with SCRAM |  |  |  |
| P7.5 | Backup taken **and** restore verified |  |  |  |
| P7.6 | WebSocket connects over `wss://` and stays alive |  |  |  |
| P7.7 | IMAP mailbox read over TLS; SMTP send works |  |  |  |
| P7.8 | Firewall matrix enforced; no unintended public ports |  |  |  |
| P7.9 | Secrets in vault, not in repo/this doc |  |  |  |
| P7.10 | Monitoring & alerting live (server, DB, cert expiry) |  |  |  |

---

## Prerequisite phase overview (fill in dates)

| Phase | Owner | Start | End | Status |
|---|---|---|---|---|
| P0 — Domain & DNS |  |  |  |  |
| P1 — Linux base & hardening |  |  |  |  |
| P2 — PostgreSQL |  |  |  |  |
| P3 — Nginx & reverse proxy |  |  |  |  |
| P4 — TLS / SSL |  |  |  |  |
| P5 — WebSocket |  |  |  |  |
| P6 — IMAP (inbound email) |  |  |  |  |
| P7 — Integration & go-live |  |  |  |  |
