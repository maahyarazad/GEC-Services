/**
 * Records that a topic was opened or its tutorial played (FR-015).
 *
 * Fire-and-forget by contract: not awaited, errors swallowed. Telemetry must
 * never block playback or navigation, so a failing or slow endpoint here is
 * invisible to the administrator.
 */
export const logKnowledgeBaseView = (topicId, eventType) => {
    try {
        fetch("/api/knowledge-base/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ topicId, eventType }),
        }).catch(() => { /* best-effort */ });
    } catch {
        /* best-effort */
    }
};
