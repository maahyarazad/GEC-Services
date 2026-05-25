# Feature Ticket: Corporate Member Card and Partner Onboarding Data Control

## Part 1 — The merged query (Available Update column)

You want one result set that gives both the existing member count per partner *and* the count of pending (un-synchronized) records per partner. A `LEFT JOIN` on two aggregated subqueries does this cleanly:

```sql
SELECT
    mc.partner,
    mc.member_count,
    COALESCE(pod.total_records, 0) AS available_update
FROM (
    SELECT partner, COUNT(*) AS member_count
    FROM member_card
    GROUP BY partner
) AS mc
LEFT JOIN (
    SELECT partner, COUNT(*) AS total_records
    FROM partner_onboarding_data
    WHERE metadata_createdAt >= datetime('now', '-1 month')
      AND synchronized != 1
    GROUP BY partner
) AS pod
  ON LOWER(mc.partner) = LOWER(pod.partner)
ORDER BY available_update DESC, mc.member_count DESC;
```

A note: this uses `member_card` as the base table, so partners that exist *only* in `partner_onboarding_data` (brand-new partners with no member cards yet) won't appear. If you want those to show up too, you'd need a `FULL OUTER JOIN` — which SQLite doesn't support directly, so it'd be done with a `UNION`. Let me know if new-partner-only rows matter.

On the client side, each row with `available_update > 0` gets a "Synchronize" button that calls the sync endpoint with that partner name.

## Part 2 — The sync endpoint: questions before I write it

Your description has a few ambiguities that change the logic materially. Rather than guess, here are the decisions I need from you:I'll wait for your selections on those, but let me give you the structure now so you can see the shape of it and correct anything that's off. I'll fill in the exact column lists once you answer.

## The sync endpoint logic

The key insight is that this **must run inside a single transaction**. If it fails halfway, you'd have member cards deactivated but the `synchronized` flag never set — leaving the data in a corrupt state. So the whole thing wraps in `BEGIN ... COMMIT` with a `ROLLBACK` on error.

Here's the logical flow for one partner, based on how I read your spec:

**Step 0 — Load the pending batch**

```sql
SELECT *
FROM partner_onboarding_data
WHERE metadata_createdAt >= datetime('now', '-1 month')
  AND synchronized != 1
  AND partner = ?;
```

**Step 1 — UPDATE matches** (phone exists in both → overwrite the card from onboarding data)

```sql
UPDATE member_card
SET /* columns... pending your answer to Q1 */
    active = 1,
    remark = 'synchronized ' || datetime('now')
WHERE LOWER(partner) = LOWER(?)
  AND phone IN (
      SELECT phone FROM partner_onboarding_data
      WHERE metadata_createdAt >= datetime('now', '-1 month')
        AND synchronized != 1
        AND partner = ?
  );
```

**Step 2 — INSERT new ones** (phone in onboarding but NOT in member_card)

```sql
INSERT INTO member_card (partner, phone, /* ... */ active, remark)
SELECT partner, phone, /* ... */ 1, 'synchronized ' || datetime('now')
FROM partner_onboarding_data AS pod
WHERE pod.partner = ?
  AND pod.metadata_createdAt >= datetime('now', '-1 month')
  AND pod.synchronized != 1
  AND NOT EXISTS (
      SELECT 1 FROM member_card AS mc
      WHERE LOWER(mc.partner) = LOWER(pod.partner)
        AND mc.phone = pod.phone
  );
```

**Step 3 — DEACTIVATE the rest** (cards for this partner whose phone is *not* in the new batch → `active = 0` + remark). This is the step your Q2 answer pins down:

```sql
UPDATE member_card
SET active = 0,
    remark = 'synchronized ' || datetime('now')
WHERE LOWER(partner) = LOWER(?)
  AND phone NOT IN (
      SELECT phone FROM partner_onboarding_data
      WHERE metadata_createdAt >= datetime('now', '-1 month')
        AND synchronized != 1
        AND partner = ?
  );
```

**Step 4 — Mark the batch synchronized** (only after everything above succeeds)

```sql
UPDATE partner_onboarding_data
SET synchronized = 1
WHERE partner = ?
  AND metadata_createdAt >= datetime('now', '-1 month')
  AND synchronized != 1;
```

A few things worth flagging in your spec before the answers come back:

The query you wrote with `HAVING member_count > 0` won't run as-is — `HAVING` needs a `GROUP BY` and `member_count` isn't a column in `member_card`, it was an alias from the *other* query. For "does this partner have any cards," a plain `SELECT COUNT(*) ... WHERE LOWER(partner) = LOWER(?)` is what you want.

Also, **ordering matters**: Step 1 (update matches) must run before Step 3 (deactivate the rest), otherwise a freshly-updated card could get caught by the deactivation. The way I've structured it, matches get `active=1` and non-matches get `active=0`, so they don't collide — but only if the WHERE clauses use the exact same phone-matching rule, which is why Q3 (the matching key) matters.

Once you pick the three options, I'll write this as a complete, runnable endpoint — tell me your stack (Node/Express, Python/Flask, etc.) and I'll match it, with the transaction wrapper and parameterized queries done properly.
Here's the corrected version:

---

**Step 5 — Update the MemberCardDataGrid UI and Add the Synchronization Button**

For every partner row, add an individual **Sync** button.

Additionally, add a **Sync All** button. Set its label to "Under Development" and keep it **disabled**.