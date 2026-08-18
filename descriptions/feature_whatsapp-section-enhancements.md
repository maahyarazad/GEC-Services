# Feature Ticket: WhatsApp Section Enhancements

## Part 1 — Normalize Twilio template name

In `CreateTwilioTemplate`, add a button next to the `friendly_name` input using the following icon:

```js
import { SiAutoprefixer } from "react-icons/si";
```

On click, the button should slugify the current value — converting it to lowercase and replacing spaces and special characters with underscores.

**Example:** `"My Template Name"` → `"my_template_name"`

---

## Part 2 — Auto-response & active event management modal

Add an icon button to the action cells of `EventSection` using:

```js
import { FaCog } from "react-icons/fa";
```

Clicking the button opens a modal with two sections:

### Section A — Member auto-response

Applies to audience types: `club_partner`, `club_member`, `expert`, `difa`

- German response field: `auto_response_general_de TEXT`
- English response field: `auto_response_general_en TEXT`

### Section B — Guest auto-response

Applies to audience types: `expert_guest`, `only_guest`, `Wüstenkinder`

- German response field: `auto_response_guest_de TEXT`
- English response field: `auto_response_guest_en TEXT`

Add a backend endpoint that accepts updates for all four fields and writes them to the corresponding record in the `events` table.

---

## Part 3 — Active event toggle

Add a toggle switch to the action cells of `EventSection`. Toggling it sets `active_event BOOLEAN` on the corresponding record in the `events` table.

**Business rule:** Only one event may be active at any given time. When an event is activated, all other events must be deactivated automatically (enforce at the backend level).




# Description

Update the `Savr-Development-Timeline.md` file by completing the **Owner**, **Estimated Days**, **Start Date**, and **End Date** fields (Fill all the subtasks). using the `3. Fill in the Owner`

## Tasks

### 1. Calculate the Estimated Days
- Calculate the **Estimated Days** for each phase based on its **Start Date** and **End Date**.
- **Exception:** For **Phase 5**, do **not** change the existing Start and End dates. Instead, calculate the **Estimated Days** using the pre-filled dates already in `Savr-Development-Timeline.md`.

### 2. Adjust the Timeline
After calculating the estimated days:

- Shift the **Start Date** and **End Date** of each phase to avoid weekends.
- Preserve the calculated **Estimated Days**.
- Ensure that **all phases are completed on or before 8 September 2026**.

### 3. Fill in the Owner
Use the following owners and initial dates:

| Phase | Owner | Start Date | End Date |
|-------|-------|------------|----------|
| Phase 0 | Maahyar | 07-08-2026 | 08-08-2026 |
| Phase 0.a | Maahyar | 07-08-2026 | 08-08-2026 |
| Phase 0.b | Rafael | 20-07-2026 | 25-07-2026 |
| Phase 0.c | Maahyar | 09-08-2026 | 10-08-2026 |
| Phase 1 | Maahyar | 09-08-2026 | 10-08-2026 |
| Phase 1.b | Rafael | 20-07-2026 | 25-07-2026 |
| Phase 1.c | Maahyar | 11-08-2026 | 14-08-2026 |
| Phase 2 | Maahyar | 14-08-2026 | 20-08-2026 |
| Phase 3 | Maahyar | 21-08-2026 | 26-08-2026 |
| Phase 4 | Maahyar | 26-08-2026 | 08-09-2026 |
| Phase 5 | Rafael | Use the pre-filled dates in `Savr-Development-Timeline.md` | Use the pre-filled dates in `Savr-Development-Timeline.md` |
| Phase 6 | Maahyar & Rafael | 10-08-2026 | 08-09-2026 |