// Every API call in this client is prefixed with VITE_SERVERURL: in development
// the SPA is served by Vite on :5175 while the API runs on :5501, so a relative
// /api/... URL would hit the dev server and 404. Matches the convention in
// SupportSection.jsx, ChatView.jsx and friends.
const SERVER_URL = import.meta.env.VITE_SERVERURL;

/**
 * Records that a topic was opened or its tutorial played (FR-015).
 *
 * Fire-and-forget by contract: not awaited, errors swallowed. Telemetry must
 * never block playback or navigation, so a failing or slow endpoint here is
 * invisible to the administrator.
 */
export const logKnowledgeBaseView = (topicId, eventType) => {
    try {
        fetch(`${SERVER_URL}/api/knowledge-base/views`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Cross-origin in development, so the admin cookie needs an explicit
            // opt-in. The server allows this origin with credentials: true.
            credentials: "include",
            body: JSON.stringify({ topicId, eventType }),
        }).catch(() => { /* best-effort */ });
    } catch {
        /* best-effort */
    }
};
