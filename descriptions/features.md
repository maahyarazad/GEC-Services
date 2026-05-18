# Sub-Ticket: AI-Assisted Phone Number Normalization Using Claude Agent

## Description

Implement an AI-assisted fallback mechanism for phone number normalization using the Claude Agent when the standard phone parsing validation fails.

Currently, the normalization logic only returns a normalized phone number when:

```js
if (parsed?.isValid()) {
  return parsed.number.replace(/^\+/, "");
}

return null;
```

This causes many malformed or mixed phone number records to remain unresolved.

The goal of this task is to integrate the Claude Agent as a fallback processor to intelligently extract and normalize the correct phone number from invalid or corrupted phone entries.

---

## Requirements

### Current Behavior

When the phone number parser fails validation:

```js
if (!parsed?.isValid()) {
  return null;
}
```

the system should instead send the raw value to the Claude Agent for cleanup and normalization.

---

## Claude Agent Responsibilities

The Claude Agent should:

- Detect the most likely valid phone number
- Remove unwanted characters and text
- Ignore labels such as:
  - `(new)`
  - `(old)`
  - `(new#)`
  - `/`
  - `|`
  - duplicate separators
- Extract UAE phone numbers when possible
- Return digits only
- Remove leading `+`
- Return `null` if no valid number can be confidently extracted

---

## Example Invalid Inputs

```txt
id=14971  raw="6591094645971502083841"
id=15093  raw="97152865158128600000"
id=15312  raw="971526808709/966535450782"
id=15305  raw="9715854779950505186005"
id=14531  raw="971507365354(new#)"
id=13406  raw="971581370585|380666521657"
id=12915  raw="971525505622(new)0527136586(old)"
id=13029  raw="971505615859//79135325899"
```

---

## Expected Output Behavior

| Raw Input | Expected Result |
|---|---|
| `971507365354(new#)` | `971507365354` |
| `971526808709/966535450782` | `971526808709` |
| `971581370585|380666521657` | `971581370585` |
| `971525505622(new)0527136586(old)` | `971525505622` |
| `971505615859//79135325899` | `971505615859` |

---

## Suggested Flow

```js
if (parsed?.isValid()) {
  return parsed.number.replace(/^\+/, "");
}

// Fallback to Claude normalization
const aiNormalizedPhone = await ClaudeAgent.normalizePhone(rawPhone);

return aiNormalizedPhone || null;
```

---

## Acceptance Criteria

- Claude Agent is only used when standard validation fails
- AI returns normalized digits-only phone numbers
- Leading `+` is removed
- Invalid symbols and labels are ignored
- Multiple phone numbers in a single field are handled intelligently
- The normalization process is logged for debugging
- Failed AI normalization returns `null`
- Unit tests are added for malformed phone inputs

---

## Notes

- Prioritize UAE phone numbers (`971`) when multiple numbers exist
- Avoid storing duplicate or ambiguous results
- Ensure Claude Agent responses are sanitized before saving to DB