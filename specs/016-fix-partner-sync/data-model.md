# Data Model: Partner employee list sync — reliability fixes

See [research.md](./research.md) D2–D9 for the rationale behind each change.

## 1. `partner_onboarding_data` (staged employee row): changed

| Column | Type | Change | Rule |
|---|---|---|---|
| `id` | INTEGER PK | — | |
| `title` | TEXT CHECK (`Mr.`,`Ms.`,`Mrs.`,`Dr.`,`''`) | — | Invalid values become `''` |
| `firstname`, `lastname`, `email` | VARCHAR(150) | — | Required by the wizard |
| `gender` | TEXT CHECK (`''`,`m`,`f`) | — | |
| `mobile_number` | VARCHAR(150) | **Value changes** | Always `normalizePhone()` output: country code and digits, no `+` (D2) |
| `partner` | TEXT | **Source changes** | Taken from the partner JWT `partner.title`, not the form (D6) |
| `birthday` | DATETIME | **Value changes** | `YYYY-MM-DD` or `NULL`. Never raw text (D3) |
| `language` | TEXT CHECK (`en`,`de`) | — | Default `en` |
| `action_type` | VARCHAR(10) CHECK (`add`,`update`,`delete`) | — | Default `add` |
| `synchronized` | INTEGER DEFAULT 0 | **Meaning clarified** | 0 = pending, 1 = closed (any final state) |
| `sync_status` | TEXT NOT NULL DEFAULT `'pending'` CHECK (`pending`,`synchronized`,`superseded`,`not_found`,`conflict`,`already_active`) | **New** | `pending` ⇔ `synchronized = 0` |
| `synced_at` | DATETIME | **New** | Set when the row is closed |
| `sync_note` | TEXT | **New** | Reason or detail, e.g. `owned by <partner>`, `moved from <A>`, `replaced by upload <ts>` |
| `metadata_createdAt` | DATETIME DEFAULT CURRENT_TIMESTAMP | — | Drives the "older than 30 days" flag; no longer limits the sync |

**New index**: `ux_pod_pending_partner_phone` — `UNIQUE (LOWER(TRIM(partner)), mobile_number) WHERE synchronized = 0`.
It guarantees at most one pending row per employee per partner (FR-019).

### State transitions

```
            upload (new / changed row)
                    │
                    ▼
               ┌─────────┐   newer upload for same partner+phone   ┌────────────┐
               │ pending │ ───────────────────────────────────────▶│ superseded │
               └─────────┘                                         └────────────┘
                    │ sync of the row's partner AND language
     ┌──────────────┼──────────────┬───────────────┬─────────────────┐
     ▼              ▼              ▼               ▼                 ▼
synchronized    not_found       conflict     already_active      superseded
(applied)    (update/delete,  (update/delete, (add; active card  (lost latest-per-
             no card)         other partner)  of this partner,   phone dedup)
                                              synced < 3 months)
```

Every transition out of `pending` sets `synchronized = 1`, `synced_at = now` and `sync_note`.
There is no transition back to `pending`, and none for age, because rows don't expire.

## 2. `member_card` (live card): no schema change, write rules change

| Situation | Effect |
|---|---|
| Matching | Always by digits-only `mobile_number`, combined with the umlaut-folded partner comparison |
| `update` (same partner) | `firstname`, `lastname`, `title`, `email`, `active = 1`, `gender` (m/f → Herr/Frau, else keep), `birthday = COALESCE(new, old)`, `remarks = 'synchronized <ts>'`, `metadata_modifiedAt` |
| `delete` (same partner) | `active = 0`, `remarks = 'synchronized delete <ts>'`, `metadata_modifiedAt` |
| `add` → existing same-partner card | Like update, plus `type` (de→5, en→7) and `card_expiry_date = now + 1 year` |
| `add` → card owned by another partner (**move**) | As above, plus `partner = <new>` and `remarks = 'moved from <A> to <B> <ts>'`. `card_number`, `serial_number`, `google_pass_token` and `memberId` are kept |
| `add` → no card | INSERT with `card_number = MAX(prefix range) + 1` (5000000 de / 7000000 en base), `type`, 1-year expiry, `remarks = 'synchronized'` |
| Cross-partner `update` or `delete` | No write |

## 3. `partner_delivery_info`: unchanged

The upsert on `partner` (unique) stays as it is. Only the `partner` value now comes from the JWT.

## 4. Derived, read-only shapes

**Submission result**: `{ total, inserted (new), replaced, unchanged, skipped (= unchanged) }`.
`inserted + replaced + unchanged = total`.

**Sync result**: `{ inserted, updated, moved, deactivated, superseded, not_found, conflict,
already_active, invitations_queued, moves: [{ mobile_number, from_partner }],
conflicts: [{ mobile_number, action, owner_partner }] }`.

**Partner pending stats** (per partner): `available_update`/`pending_count` (total pending),
`pending_en`, `pending_de`, `oldest_pending` (min `metadata_createdAt` of pending rows).

## 5. Normalization rules

- **`normalizePhone(raw)`**:
  1. `String(raw ?? '').trim()`
  2. Keep digits only.
  3. If the result starts with `00`, drop those two digits.
  4. Return the result (`''` if empty).

  For example, `+971 50-123 4567`, `00971501234567` and `971501234567` all give `971501234567`.
- **`parseBirthday(raw)`**: accepts `D/M/YYYY`, `DD/MM/YYYY` and `YYYY-MM-DD` (with an optional
  time). The date must be a real calendar date with a year from 1900 to the current year. It
  returns `YYYY-MM-DD`, or `null` otherwise.
- **Client date cell**: a `Date` becomes `YYYY-MM-DD` built from UTC year, month and day.
