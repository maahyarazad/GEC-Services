/**
 * THE knowledge base catalogue.
 *
 * Per FR-017 this list is fixed in the application: topics, their order, their
 * jump destinations, and which recording each points at all change by releasing
 * a new version. There is deliberately no admin UI for editing it and no
 * database table behind it.
 *
 * To mark a topic as NOT YET RECORDED (FR-010), set `video: null` and drop
 * `durationLabel`. The row then renders with its play control disabled and a
 * "Not yet recorded" label instead of failing when activated.
 *
 * To activate a topic, place `<filename>` into `file_storage/knowledge_base/`
 * on the server and fill in `durationLabel` here in the same commit.
 *
 * Field reference: specs/001-admin-knowledge-base/data-model.md §1.
 */

// Human-readable headings for the `sectionSlug` groups the catalogue renders under.
export const SECTION_LABELS = Object.freeze({
    "whatsapp-broadcast": "WhatsApp Broadcast",
    "place-id-finder": "Place ID Finder",
    "pdf-generator": "PDF Generator",
    "registration-config": "Registration",
});

// Order the groups appear in, independent of topic `order` within a group.
export const SECTION_ORDER = Object.freeze([
    "whatsapp-broadcast",
    "place-id-finder",
    "pdf-generator",
    "registration-config",
]);

export const KNOWLEDGE_BASE_TOPICS = Object.freeze([
    {
        id: "whatsapp-broadcast",
        title: "How to work with the WhatsApp Broadcast section",
        summary:
            "The full tour: sending a broadcast for an event, what each panel is for, and how the pieces fit together.",
        sectionSlug: "whatsapp-broadcast",
        destination: { label: "WhatsApp Broadcast (overview)", tab: "whatsapp-broadcast", view: null },
        video: { videoId: "whatsapp-broadcast", filename: "whatsapp-broadcast.mp4" },
        durationLabel: null,
        order: 1,
        subTopics: [
            {
                id: "whatsapp-twilio-templates",
                title: "How to create the different types of Twilio template",
                summary:
                    "Building each template type, what the variables mean, and getting one approved before a send.",
                sectionSlug: "whatsapp-broadcast",
                destination: { label: "Create Twilio Template", tab: "whatsapp-broadcast", view: "create-template" },
                video: { videoId: "whatsapp-twilio-templates", filename: "whatsapp-twilio-templates.mp4" },
                durationLabel: null,
                order: 1,
            },
            {
                id: "whatsapp-auto-response",
                title: "How to configure an event auto-response",
                summary:
                    "Setting the general and guest auto-replies, in German and English, from the auto-response icon on an event row.",
                sectionSlug: "whatsapp-broadcast",
                destination: { label: "Event List (auto-response settings)", tab: "whatsapp-broadcast", view: "event-list" },
                video: { videoId: "whatsapp-auto-response", filename: "whatsapp-auto-response.mp4" },
                durationLabel: null,
                order: 2,
            },
            {
                id: "whatsapp-guest-list",
                title: "How to manage the guest list",
                summary:
                    "Reviewing who is on the list for an event, correcting entries, and keeping it clean before a broadcast.",
                sectionSlug: "whatsapp-broadcast",
                destination: { label: "Guest List", tab: "whatsapp-broadcast", view: "guest-list" },
                video: { videoId: "whatsapp-guest-list", filename: "whatsapp-guest-list.mp4" },
                durationLabel: null,
                order: 3,
            },
            {
                id: "whatsapp-sender",
                title: "How to work with Sender",
                summary:
                    "The send dialog behind a template: picking the event, audience and sender limit, what the Contact Book, Guest List, QR code and language switches change about who is actually messaged, and why a send keeps running after the dialog closes.",
                sectionSlug: "whatsapp-broadcast",
                destination: { label: "Twilio Templates (Sender)", tab: "whatsapp-broadcast", view: null },
                video: { videoId: "whatsapp-sender", filename: "whatsapp-sender.mp4" },
                durationLabel: null,
                order: 4,
            },
        ],
    },
    {
        id: "whatsapp-reporting",
        title: "How to use the reporting of the WhatsApp Broadcast section",
        summary:
            "Reading delivery and response reports after a send, and what each report type tells you.",
        sectionSlug: "whatsapp-broadcast",
        destination: { label: "Reporting", tab: "whatsapp-broadcast", view: "report" },
        video: { videoId: "whatsapp-reporting", filename: "whatsapp-reporting.mp4" },
        durationLabel: null,
        order: 2,
    },
    {
        id: "place-id-finder",
        title: "How to work with the Place ID Finder",
        summary:
            "Searching for a venue, reading off its Google Place ID, and copying the canonical Maps link.",
        sectionSlug: "place-id-finder",
        destination: { label: "Place ID Finder", tab: "place-id-finder", view: null },
        video: { videoId: "place-id-finder", filename: "place-id-finder.mp4" },
        durationLabel: null,
        order: 1,
    },
    {
        id: "pdf-generator",
        title: "How to work with the PDF Generator",
        summary: "Generating documents and invoices, and finding them again in the file list.",
        sectionSlug: "pdf-generator",
        destination: { label: "PDF Generator", tab: "pdf-generator", view: null },
        video: { videoId: "pdf-generator", filename: "pdf-generator.mp4" },
        durationLabel: null,
        order: 1,
    },
    {
        id: "registration-internal",
        title: "How to work with the Registration section (for internal purposes)",
        summary:
            "Setting up and running registration for our own events, end to end.",
        sectionSlug: "registration-config",
        destination: { label: "Registration Config", tab: "registration-config", view: null },
        video: { videoId: "registration-internal", filename: "registration-internal.mp4" },
        durationLabel: null,
        order: 1,
    },
    {
        id: "registration-external",
        title: "How to work with the Registration section (for external sources)",
        summary:
            "The same section used for the German Medical Society and the German Industry Club, and what differs for an external source.",
        sectionSlug: "registration-config",
        destination: { label: "Registration Config", tab: "registration-config", view: null },
        video: { videoId: "registration-external", filename: "registration-external.mp4" },
        durationLabel: null,
        order: 2,
    },
]);

/** Every topic id in the catalogue, parents and sub-topics alike. */
export const ALL_TOPIC_IDS = Object.freeze(
    KNOWLEDGE_BASE_TOPICS.flatMap((topic) => [
        topic.id,
        ...(topic.subTopics || []).map((sub) => sub.id),
    ])
);

/**
 * Build the URL a jump control navigates to.
 *
 * `from=knowledge-base` is always appended so the target section can offer a
 * way back (FR-009). See data-model.md §2.
 */
export const buildDestinationUrl = (destination) => {
    if (!destination?.tab) return null;

    const params = new URLSearchParams();
    params.set("tab", destination.tab);
    if (destination.view) params.set("view", destination.view);
    params.set("from", "knowledge-base");

    return `/admin?${params.toString()}`;
};

/**
 * Every destination a topic's jump control can offer.
 *
 * A topic with sub-topics offers its own destination FIRST, then each
 * sub-topic's — the parent option is never dropped, so an administrator can
 * still ask for the section overview (FR-018).
 */
export const destinationsFor = (topic) => {
    const own = { ...topic.destination, topicId: topic.id };
    if (!topic.subTopics?.length) return [own];

    return [
        own,
        ...topic.subTopics.map((sub) => ({
            ...sub.destination,
            label: sub.destination.label || sub.title,
            topicId: sub.id,
        })),
    ];
};
