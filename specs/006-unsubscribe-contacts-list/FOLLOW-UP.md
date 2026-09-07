# Follow-up: normalise `unsubscribe_contacts.phone` storage

**Raised by**: feature `006-unsubscribe-contacts-list` (task T031)
**Date**: 2026-09-07
**Status**: Not started — deliberately out of scope for 006

> Recorded here as an in-repo note rather than a GitHub issue, since filing to a remote tracker
> publishes outward. Promote it to an issue or a `/speckit-specify` feature when you want it done.

## Problem

`unsubscribe_contacts.phone` is declared `INTEGER NOT NULL UNIQUE` (`create_tables.sql:459`), but
the writer at `services/whatsAppSender.js:867-868` inserts a `+`-prefixed **string**
(`From.replace("whatsapp:", "")` → `'+971585831595'`). SQLite's INTEGER affinity silently coerces
it, **dropping the `+`**, so the stored value is `971585831595`.

`contact_book.phone` is `VARCHAR(50)` holding `'+971585831595'`. Comparisons between the two
resolve only because SQLite applies integer affinity to both sides.

## Why it currently works

- Verified against `app.db`: 2461 contacts, of which **1** has a phone that will not coerce cleanly
  (`"+4917632351894‬"` — contains a trailing U+202C POP DIRECTIONAL FORMATTING character).
- All 28 current unsubscribe rows join successfully to a contact.
- The broadcast exclusion (`services/whatsAppSender.js:150`, `:174`) and the new panel's LEFT JOIN
  both rely on this same coercion, so they agree with each other.

## Why it should still be fixed

- It is undocumented behaviour that a future schema or driver change could break silently — and
  the failure mode is a person who opted out receiving broadcasts again.
- Any contact whose phone contains a space, dash, parenthesis or stray Unicode will not coerce,
  so it will neither be excluded from broadcasts nor matched in the panel.
- The `UNIQUE` constraint currently dedupes on the integer, which happens to be the desired
  behaviour but only by accident.

## Suggested scope

1. Change `unsubscribe_contacts.phone` to `TEXT`.
2. Backfill existing rows with the `+` prefix restored.
3. Normalise the writer at `services/whatsAppSender.js:867` to store a canonical E.164 string.
4. Update the two broadcast exclusion filters and the `006` panel join to compare normalised text.
5. Decide what to do with the one malformed `contact_book` phone.

**Do not bundle this with a UI change** — it touches the live broadcast audience calculation and
deserves its own review and rollback plan.
