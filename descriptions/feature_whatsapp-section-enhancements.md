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