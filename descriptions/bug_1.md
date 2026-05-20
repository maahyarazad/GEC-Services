# Bug Ticket: Fix Twilio Template Creation in the WhatsApp Section

---

## Part 1 — UI: Support Switching Between Template Types

**Description:**

`CreateTwilioTemplate` should support creating two different types of Twilio message templates:

- `twilio/quick-reply`
- `twilio/text`

The UI should allow the user to switch between these two types.

Additionally, improve the overall appearance of `CreateTwilioTemplate` by laying out the input fields more cleanly and consistently.

**Bug fix:** The snackbar success message does not display the correct saved name — this must also be fixed.

---

## Part 2 — Backend: Fix Template Creation Handler

**Description:**

Remove the following block entirely:

```js
const varExample = variable_example?.trim() || "Hans";
const actions = (buttons || []).map((b, i) => ({
  title: b.title,
  id: b.id || `btn_${i + 1}`,
}));

// Detect all {{n}} placeholders in body and build variables map
const placeholderNums = [
  ...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])),
].sort((a, b) => Number(a) - Number(b));

const genericSamples = ["Hans", "Abu Dhabi", "20. Mai 2026", "Sylvia", "GEC"];
const variables = {};
placeholderNums.forEach((num, i) => {
  variables[num] = num === "1" ? varExample : (genericSamples[i] || `Beispiel ${num}`);
});
```

Instead, pass the following fields directly and as-is to the handler:

- `variable_example`
- `buttons` (if present)
- `body`
- `language`
- `friendly_name`

Any field that is not provided should fall back to `null`.