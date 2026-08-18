# Feature → Administrator Assignment

Fill the **Administrator** column with the responsible person for each feature.

## 1. Admin Dashboard (`/admin`)

| # | Feature | Description | Administrator |
|---|---------|-------------|---------------|
| 1 | Admin Login & Auto-Login | Authenticated admin access with session/auto-login for admin users | |
| 2 | Website Health | Live health-check dashboard for site and service status | |
| 3 | Registration Config | Create/manage event registration configurations and registration keys | |
| 4 | Registrant Section | View, filter and manage event registrants | |
| 5 | Surveys | Survey data grid and response management | |
| 6 | Partner Onboarding (Admin) | Review and manage partner onboarding submissions and delivery info | |
| 7 | Expert Circle | Member/expert directory management | |
| 8 | PDF Generator | Invoice & document generation, file list, downloads | |
| 9 | WhatsApp Broadcast | WhatsApp messaging hub (see section 2) | |
| 10 | Server Logs | Live server log viewer with filtering | |
| 11 | Delivery & Tracking | Delivery tracking section for partner shipments | |
| 12 | Place ID Finder | Google Maps Place ID lookup tool | |
| 13 | Support Center | Support ticket inbox, ticket detail and replies | |
| 14 | Responsive Admin Panel | Mobile/tablet-optimised dashboard layout and slide menu | |
| 15 | Dashboard Stats & Filters | Stat cards, percentage bars, data grid operators, filter params | |

## 2. WhatsApp Module

| # | Feature | Description | Administrator |
|---|---------|-------------|---------------|
| 16 | Chat View | Two-way WhatsApp conversation view with media/audio playback | |
| 17 | Guest List Panel | Per-event guest list with QR column and bulk actions | |
| 18 | Event Logs Panel | Message/response logs per event, mobile list view | |
| 19 | Contact Book | Contact data grid, create/edit contacts | |
| 20 | Twilio Template Creation | Create and manage Twilio message templates | |
| 21 | Quick Reply | Predefined quick reply messages | |
| 22 | Notepad & Message Modal | Per-guest notes and manual message sending | |
| 23 | Twilio Credit Warning | Low-balance warning indicator | |
| 24 | Map URL Update | Attach/update event location map links | |
| 25 | Event Search & Speed Dial | Event dropdown search and quick actions | |

## 3. Public-Facing Pages

| # | Feature | Description | Administrator |
|---|---------|-------------|---------------|
| 26 | Event Registration | Public event registration flow with already-registered check | |
| 27 | Guest Registration | Guest sign-up per event slug | |
| 28 | Membership Purchase | Membership purchase and checkout flow | |
| 29 | Member Onboarding | Multi-step member onboarding wizard | |
| 30 | Partner Onboarding Wizard | Partner sign-up wizard incl. delivery info step | |
| 31 | Support Portal | Public ticket submission portal | |
| 32 | Ticket Tracker | Public ticket status tracking (`/support/track`) | |
| 33 | Account Deletion Request | Self-service account deletion request page | |
| 34 | PWA Install Prompt | Progressive Web App installation prompt | |
| 35 | OG Tags / SEO | Open Graph meta tags via Helmet middleware | |

## 4. Membership & Cards

| # | Feature | Description | Administrator |
|---|---------|-------------|---------------|
| 36 | Digital Member Card | Member card generation and management | |
| 37 | Apple Wallet Pass | Apple PassKit membership pass | |
| 38 | Google Wallet Pass | Google Wallet membership pass | |
| 39 | Corporate Member Card | Corporate card issuance and data control | |
| 40 | QR Code Generation | QR codes for guests, cards and check-in | |
| 41 | Member Check / GEC Members | Member verification and member records endpoints | |

## 5. Communications

| # | Feature | Description | Administrator |
|---|---------|-------------|---------------|
| 42 | Email Sender | Transactional and bulk email sending | |
| 43 | Email Storage / IMAP Poller | Inbound email storage and polling | |
| 44 | OTP Verification | One-time password issuance and validation | |
| 45 | Phone Validator | Phone number validation service | |
| 46 | WhatsApp Sender Service | Backend Twilio/WhatsApp delivery service | |

## 6. Data, Integrations & Infrastructure

| # | Feature | Description | Administrator |
|---|---------|-------------|---------------|
| 47 | Payments | Payment processing and payment data grid | |
| 48 | Invoicing | Invoice generation, JSON storage and PDF output | |
| 49 | Google Sheets Sync | gSheet import/export integration | |
| 50 | Google Maps Integration | Maps, place lookup, delivery locations | |
| 51 | Guest List Merge & Normalise | Merge and normalise event guest lists | |
| 52 | CSV Import/Parsing | CSV parsing for bulk data import | |
| 53 | File Upload & Type Validation | Secure file storage with type validation | |
| 54 | MongoDB Backup Job | Scheduled database backup job | |
| 55 | SQLite / MySQL Services | Multi-database access layer and scheduled jobs | |
| 56 | Caching Service | Application-level caching | |
| 57 | WebSocket (Admin) | Real-time admin updates | |
| 58 | Health Check Endpoint | Backend uptime/health monitoring endpoint | |
| 59 | External API Endpoints | Third-party/external integration routes | |
| 60 | Auth Middleware | Route protection, roles and cancellation handling | |
