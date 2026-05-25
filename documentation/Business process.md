# Business Process: Corporate Member Card & Partner Onboarding Data Management

**Document type:** Business process specification
**Source:** Feature Ticket — Corporate Member Card and Partner Onboarding Data Control
**Status:** Draft for review

---

## 1. Purpose

This document describes the business process behind the Corporate Member Card feature. It explains *what* the system does and *why*, in plain terms, so that product, operations, and engineering share one understanding before implementation. The technical SQL and endpoint design live in the feature ticket; this document covers the process, the actors, the rules, and the open decisions.

The feature exists to keep the internal **member card** records aligned with the **partner onboarding data** that arrives from an external service (referred to as GEC / "the Services"). Partners submit batches of member records; the business needs a controlled, auditable way to pull those batches in, reconcile them against existing cards, and reflect the result in the operator-facing grid.

---

## 2. Actors and systems

| Actor / System | Role in the process |
|----------------|---------------------|
| **Operator** | Internal user who views the Corporate Member section and triggers synchronization per partner. |
| **Member Card store** (`member_card`) | The system of record for active corporate member cards. |
| **Partner Onboarding Data store** (`partner_onboarding_data`) | Inbound staging table holding records submitted by partners, flagged `synchronized = 0/1`. |
| **GEC / Services** | External source of the canonical grouped-partner list, reached via `partners/get-grouped-partners`. |
| **Sync endpoint** | Server process that reconciles a single partner's pending batch into the member card store inside one transaction. |

---

## 3. Core business rules

These rules govern the whole process and should not change without sign-off:

- A partner's pending batch is the set of `partner_onboarding_data` rows that are **recent** (created within the last month) **and not yet synchronized** (`synchronized != 1`).
- Synchronization for a partner is **all-or-nothing**: it runs inside a single transaction and rolls back fully on any error, so cards are never left half-updated with the batch still marked pending.
- After a successful sync, every card for that partner reflects the latest batch: matched cards are refreshed and active, brand-new records become active cards, and cards absent from the batch are deactivated rather than deleted.
- Deactivation is a soft state (`active = 0`) plus an audit note (`remark`), never a hard delete — history is preserved.
- Partner matching is **case-insensitive** (`LOWER(partner)`), to avoid duplicate buckets caused by inconsistent casing in partner names.

---

## 4. Process flow — operator view

1. The operator opens the section, now labelled **Corporate Member** (UI rename only; underlying data and tables keep their existing names).
2. **Left panel** shows a scrollable, searchable table of existing members grouped by partner, with a member count per partner, ordered by count.
3. **Right panel** shows a scrollable, searchable table of the grouped partners pulled live from the Services. Any partner that appears in the member card data but has **no matching record in the Services** is flagged with a **chip indicator**, so the operator can spot partners that are out of alignment with the canonical source.
4. The existing detailed **DataGrid** is moved out of the main view into a **modal/slider**, opened by a **"Corporate Members"** button at the top of the section, keeping the main view focused on the two summary tables.
5. Each partner row carries an individual **Sync** button. A separate **Sync All** button is present but labelled **"Under Development"** and kept **disabled** for this release.
6. When the operator presses **Sync** on a partner row, the sync endpoint runs for that partner. On success, the counts and indicators refresh.

---

## 5. Process flow — synchronization (per partner)

The sync endpoint performs the following ordered steps for a single partner, all within one transaction:

1. **Load the pending batch** — read the partner's recent, un-synchronized onboarding records.
2. **Update matches** — where a phone number exists in both the batch and the member cards, refresh the card from the onboarding data, set it active, and stamp the remark.
3. **Insert new records** — where a phone number is in the batch but has no existing card, create a new active card.
4. **Deactivate the rest** — where an existing card's phone number is *not* in the new batch, set it inactive and stamp the remark.
5. **Mark the batch synchronized** — only after all prior steps succeed, flag the batch rows `synchronized = 1`.

**Ordering is intentional and load-bearing:** matches (step 2) must be processed before deactivation (step 4), so a freshly-refreshed card is not caught by the deactivation sweep. This only holds if both steps use the *exact same* phone-matching rule — see open decision Q3.

```
Load batch → Update matches → Insert new → Deactivate rest → Mark synchronized
   (read)        active=1        active=1      active=0          synchronized=1
        └──────────────── single transaction (ROLLBACK on any error) ───────────┘
```

---

## 6. Reconciliation logic (summary)

For a given partner, every member card ends up in exactly one of three states after a sync:

| Condition | Card outcome | Flag |
|-----------|-------------|------|
| Phone in both card store and batch | Card updated from onboarding data | `active = 1` |
| Phone in batch only | New card inserted | `active = 1` |
| Phone in card store only (not in batch) | Existing card deactivated | `active = 0` |

Each touched card receives a `remark` of the form `synchronized <timestamp>` for audit traceability.

---

## 7. Known data scope considerations

- The members-per-partner summary is built from the member card store, so **brand-new partners that exist only in onboarding data** (no cards yet) will not appear in that left-panel summary until their first sync creates cards. If surfacing new-partner-only rows becomes a requirement, the merged query needs a full outer join (emulated via `UNION` in SQLite). This is flagged as a future consideration, not a current requirement.
- The "does this partner have any cards" check should be a simple count against the member card store filtered by partner — not a `HAVING` clause, which requires grouping and a real column rather than an alias borrowed from another query.

---

## 8. Open decisions (blocking full implementation)

The synchronization endpoint cannot be finalized until these are resolved. Each materially changes the logic:

| ID | Decision needed | Why it matters |
|----|-----------------|----------------|
| **Q1** | Which exact columns are overwritten on a card during an update? | Defines the `SET` list in the update and the column list in the insert. |
| **Q2** | Confirm deactivation behaviour for cards absent from the batch. | Pins down step 4 — whether stale cards are deactivated and how. |
| **Q3** | What is the canonical matching key (phone, normalized phone, etc.)? | Must be identical across update and deactivate steps, or refreshed cards get wrongly deactivated. |
| **Stack** | Target server stack (e.g. Node/Express, Python/Flask). | Determines the concrete endpoint implementation and transaction wrapper. |

---

