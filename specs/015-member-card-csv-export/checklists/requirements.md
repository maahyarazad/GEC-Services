# Specification Quality Checklist: Corporate member card CSV export — UTF-8 umlauts and complete column values

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-22
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Clarification resolved 2026-10-22: the missing values are googlePassToken, serial_number, Active, gender, lastLogin and applePass.
- When the current export was regenerated from local `app.db`, all 22 `member_card` columns were present. The causes found are listed below. They are evidence for the clarification and do not belong in the spec:
  - No UTF-8 BOM and no `charset=utf-8` on the response, so Excel decodes the file as ANSI and umlauts and "®" come out garbled.
  - 3 records have multi-line remarks, which appear to split rows in some viewers.
  - Long phone numbers are shown in scientific notation in Excel.
  - With a German regional setting, Excel expects ";" as the separator, so a comma-separated file can open as a single column.

## Implementation verification (2026-10-22, local `app.db`)

- Export: 23 headers; 4,664 rows, equal to the DB count; 0 rows with a wrong field count, including the 3 multi-line last name/email values.
- Starts with the BOM (`EF BB BF`); `Content-Type: text/csv; charset=utf-8`; `?delimiter=semicolon` works.
- All 69 cards with a serial number have both the Google Pass and Apple Pass links; no Apple link appears without a serial number.
- Active/Paid show only `Yes`/`No`/empty; Type shows labels; no `null`/`undefined` text; no formula-like cells; mobile numbers are wrapped as `="971…"`.
- All dates normalised, except one unparseable birthday (`25/9/1995`), which passes through unchanged as designed.
- Member export (`/api/member-csv-data`) is byte-identical to the baseline.
- Sync update gender (`f` → `Frau`; null keeps the existing value) and the `last_login` stamp were verified on a DB copy.
- Full export took 0.63 s (SC-005: < 10 s).
- **Data issue found (not fixed):** 11 `member_card` rows are already stored double-encoded in the DB (e.g. `AlizÃ©e`, `ERDOÄžAN`). The export writes them as stored. They need a one-off data repair and a check of the onboarding import that produced them.
- **Pending:** opening the file in Excel (Windows/macOS), Google Sheets and Numbers, and the live portal login and sync (quickstart 1, 2, 8, 9). T017.
