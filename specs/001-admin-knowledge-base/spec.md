# Feature Specification: Admin Knowledge Base

**Feature Branch**: `001-admin-knowledge-base`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Create a Knowledge Base section in the admin dashboard where an admin user can view a list of the things they can do. Each line of work has a recorded tutorial video that can be viewed, and next to the 'view video' control there is an icon that navigates the admin directly to the pointed section of the application."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover what I can do and learn how (Priority: P1)

An administrator opens the Knowledge Base and sees a single, readable catalogue of every line of work the admin dashboard supports — WhatsApp broadcasting, broadcast reporting, Place ID lookup, PDF generation, and internal and external registration. Each entry names the task in the administrator's own vocabulary ("How to configure an Event Auto Response") rather than in system vocabulary, and each entry offers a recorded tutorial video the administrator can play without leaving the Knowledge Base.

**Why this priority**: This is the whole point of the feature and the minimum viable slice. An administrator who can only browse the catalogue and watch videos already gets the core value — self-service onboarding and a reference for infrequent tasks — even if no other part of the feature ships. Every other story is an accelerator on top of this one.

**Independent Test**: Can be fully tested by opening the Knowledge Base as an administrator, confirming all six top-level topics and the four WhatsApp sub-topics are listed, and playing each tutorial video to completion. Delivers value on its own: a new administrator can learn the system unaided.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator on the admin dashboard, **When** they open the Knowledge Base, **Then** they see the catalogue of admin tasks grouped by the section of the application each task belongs to.
2. **Given** an administrator viewing a knowledge base entry that has a recorded tutorial, **When** they activate the view-video control, **Then** the tutorial plays and they can pause, seek, and resume it.
3. **Given** an administrator viewing a knowledge base entry whose tutorial has not been recorded yet, **When** they look at that entry, **Then** the view-video control is visibly unavailable and the entry is labelled as not yet recorded, rather than failing when activated.
4. **Given** an administrator has finished watching a tutorial, **When** they close the video, **Then** they return to the same position in the catalogue they were browsing.

---

### User Story 2 - Go straight to the section the tutorial is about (Priority: P2)

Having watched (or skipped) a tutorial, the administrator activates the jump icon shown next to the view-video control and lands directly on the section of the admin dashboard that the tutorial describes — the WhatsApp Broadcast section, the Place ID Finder, the PDF Generator, or the Registration section — ready to perform the task themselves.

**Why this priority**: This converts learning into doing and removes the "now where was that screen again?" gap that makes documentation go unread. It is second priority because the catalogue and videos are still useful without it, but it is what makes the Knowledge Base a working tool rather than a video library.

**Independent Test**: Can be tested by activating the jump icon on each catalogue entry and confirming the administrator arrives at the correct section of the dashboard with that section fully loaded and usable.

**Acceptance Scenarios**:

1. **Given** an administrator viewing the "How to work with the Place ID Finder" entry, **When** they activate the jump icon, **Then** the Place ID Finder section opens and is ready for use.
2. **Given** an administrator viewing the WhatsApp Broadcast topic, which has sub-topics, **When** they activate the jump icon, **Then** they are offered a choice of destinations — the WhatsApp Broadcast section itself plus each sub-topic's specific destination — and land on the one they pick.
3. **Given** an administrator picks the "managing the guest list" destination, **When** the jump completes, **Then** the guest list is the view in front of them, not the section's default view.
4. **Given** an administrator has jumped from the Knowledge Base to a section, **When** they navigate back, **Then** they return to the Knowledge Base rather than to the dashboard's default landing section.
5. **Given** an entry whose target section the current administrator is not permitted to use, **When** they view that entry, **Then** the jump icon is unavailable while the tutorial video remains viewable.

---

### User Story 3 - Find the one topic I need (Priority: P3)

An administrator who already knows roughly what they are looking for types a few words — "auto response", "guest list", "invoice" — and the catalogue narrows to matching entries, including matches on sub-topics nested under a parent topic.

**Why this priority**: With around ten entries the catalogue is browsable without search, so this is a convenience rather than a necessity. It becomes important as the catalogue grows past the initial six topics.

**Independent Test**: Can be tested by entering search terms and confirming that matching top-level topics and sub-topics appear while non-matching entries are hidden, and that clearing the search restores the full catalogue.

**Acceptance Scenarios**:

1. **Given** an administrator in the Knowledge Base, **When** they type a term matching a sub-topic title, **Then** that sub-topic is shown together with enough of its parent topic for context.
2. **Given** a search term that matches nothing, **When** the administrator finishes typing, **Then** an empty-state message explains that no topics matched and offers a way to clear the search.

---

### Edge Cases

- What happens when a tutorial video fails to load or is missing from storage? The entry must surface a clear "video unavailable" message and must not break the rest of the catalogue.
- What happens when an administrator opens the Knowledge Base on a phone? The catalogue, video player, and jump icon must all remain usable at small widths, since administrators check procedures on mobile during events.
- What happens when a topic points at a section that has been renamed or removed from the dashboard? The entry must not navigate the administrator to a dead or blank screen.
- What happens when the administrator's session expires while a video is playing? Returning to the dashboard must route them through sign-in rather than showing a partially broken page.
- What happens when a video is long? Administrators need to resume partway through rather than restarting, particularly for the multi-part WhatsApp topic.
- How does the system handle a topic that has sub-topics but no tutorial of its own? The parent must remain a browsable grouping without offering a broken video control.
- What happens when a recording file named by the catalogue is missing from the server's storage? The entry must report the tutorial as unavailable rather than presenting a player that fails on activation.
- What happens when someone who is not signed in requests a tutorial file directly by its address? The request must be refused, not served.
- What happens when a topic has sub-topics but the administrator wants the section overview rather than a specific view? The parent section must remain one of the offered destinations, not be replaced by the sub-topic destinations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Knowledge Base section within the admin dashboard, reachable from the dashboard's primary navigation alongside the existing sections.
- **FR-002**: The Knowledge Base MUST be available only to authenticated administrators, consistent with every other admin dashboard section.
- **FR-003**: The Knowledge Base MUST present a catalogue of admin tasks in which each entry states, in plain language, one thing an administrator can do.
- **FR-004**: The catalogue MUST include the following six top-level topics: working with the WhatsApp Broadcast section; using the reporting of the WhatsApp Broadcast section; working with the Place ID Finder; working with the PDF Generator; working with the Registration section for internal purposes; and working with the Registration section for external sources (German Medical Society and German Industry Club).
- **FR-005**: The WhatsApp Broadcast topic MUST contain these four sub-topics as individually listed entries: creating the different types of Twilio template; configuring an event auto-response; managing the guest list; and adding a person from the contact list to the guest list.
- **FR-006**: Each catalogue entry MUST offer a control to view its recorded tutorial video, and the video MUST play within the Knowledge Base without navigating the administrator away from the catalogue.
- **FR-007**: Each catalogue entry MUST display a jump control, positioned next to its view-video control, that navigates the administrator directly to the section of the admin dashboard the entry describes.
- **FR-008**: The jump control MUST land the administrator on the target section in a ready-to-use state, equivalent to having selected that section from the dashboard navigation directly.
- **FR-009**: The system MUST allow an administrator to return from a jumped-to section back to the Knowledge Base without re-navigating from the dashboard's default landing section.
- **FR-010**: An entry with no recorded tutorial MUST be listed with its view-video control clearly unavailable and MUST be labelled as not yet recorded.
- **FR-011**: The system MUST show a clear, recoverable message when a tutorial video cannot be loaded, leaving the rest of the catalogue usable.
- **FR-012**: The Knowledge Base MUST remain fully usable on mobile screen widths, including browsing, video playback, and the jump control.
- **FR-013**: Administrators MUST be able to filter the catalogue by a free-text search term that matches both top-level topics and sub-topics.
- **FR-014**: Each entry MUST indicate the approximate length of its tutorial before the administrator commits to watching it.
- **FR-015**: The system MUST record which knowledge base topics are viewed, so that the organisation can tell which procedures administrators struggle with and which tutorials still need recording.
- **FR-016**: Tutorial videos MUST be served by the application itself from its own server-side file storage, where the team places the recording files directly. No third-party video service is involved.
- **FR-017**: The knowledge base catalogue MUST be a fixed list defined as part of the application. Topics, sub-topics, their order, and the recording each points at change only by releasing a new version of the application; no in-application editing of catalogue content is provided.
- **FR-018**: For an entry that has sub-topics, the jump control MUST let the administrator choose where to go — offering the parent section and each sub-topic's specific destination as selectable options — rather than silently picking one. For an entry with no sub-topics, the jump control MUST navigate directly to its single destination without an intermediate choice.
- **FR-019**: The specific destinations offered for the WhatsApp Broadcast sub-topics MUST be individually reachable, so that choosing "managing the guest list" arrives at the guest list itself rather than at the section's default view.
- **FR-020**: Tutorial video files MUST NOT be readable by anyone who is not an authenticated administrator, including via a direct link to the file.

### Key Entities

- **Knowledge Base Topic**: One thing an administrator can do. Carries a plain-language title, an optional short summary of what the administrator will learn, the section of the dashboard it relates to, its display order within the catalogue, and an optional parent topic when it is a sub-topic.
- **Tutorial Video**: The recorded walkthrough attached to a topic. Carries the name of its recording file in the application's own storage, its approximate running time, and its recording status (recorded, or not yet recorded).
- **Jump Destination**: A place in the dashboard a topic's jump control can send the administrator — either a whole section or a specific view inside one. A topic without sub-topics has exactly one destination; a topic with sub-topics offers its own destination plus each sub-topic's, and the administrator chooses among them.
- **Topic View Event**: A record that a given administrator opened a given topic or played its tutorial, used to understand which procedures need better coverage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A newly onboarded administrator can locate the tutorial for any one of the six topics within 30 seconds of opening the Knowledge Base, without assistance.
- **SC-002**: From opening a topic's tutorial to arriving at the corresponding section of the dashboard, an administrator takes no more than two interactions.
- **SC-003**: At least 90% of administrators who watch a tutorial successfully complete the corresponding task on their first unaided attempt.
- **SC-004**: Support requests and hand-holding messages about the six covered topics fall by at least 50% within two months of the Knowledge Base going live.
- **SC-005**: Every one of the six top-level topics and four WhatsApp sub-topics has a recorded tutorial available at launch, or is explicitly marked as not yet recorded.
- **SC-006**: The Knowledge Base catalogue is browsable and its jump controls work on a phone-sized screen, verified against the smallest screen size the admin dashboard already supports.
- **SC-007**: Time for a new administrator to become independently productive on WhatsApp broadcasting drops from its current baseline to under one working day.

## Assumptions

- The admin dashboard already supports navigating directly to an individual section, so section-level jumps reuse that existing capability. Reaching a specific view *inside* the WhatsApp Broadcast section is new addressability that this feature introduces.
- Administrators reaching the Knowledge Base are already authenticated through the dashboard's existing sign-in; no separate access control model is introduced for knowledge base content.
- The tutorial videos themselves will be recorded by the team as content work outside this feature, and the resulting files placed into the server's file storage by hand; this specification covers presenting and linking them, not producing or uploading them.
- The application's existing publicly-served static file area is not a suitable home for these recordings as-is, because anything placed there is readable without signing in (see FR-020); tutorial files need an access-controlled path.
- Tutorials are recorded in one language (English) for the initial release; multi-language tutorials are out of scope.
- The Knowledge Base is read-only for the administrators who consume it — watching and navigating, not commenting, rating, or annotating.
- The catalogue launches with exactly the six topics and four sub-topics listed here. Because it is fixed in the application (FR-017), growth means a release — but ordering and grouping must still not assume a fixed count.
- The two external registration sources named — German Medical Society and German Industry Club — are covered by a single topic that addresses both, since they follow the same administrative procedure.
- Offline viewing and video download are out of scope for the initial release.
