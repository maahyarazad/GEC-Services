const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// A SECOND router, deliberately separate from `router` above.
// `router` is blanket-gated by authorize_admin further down, and server.js
// gates all of /api/ the same way. The stream route must be reachable with a
// ticket and no admin cookie, so it can live on neither — it is exported
// separately and mounted in server.js ahead of that global gate.
const streamRouter = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();
const authorize = require("../middleware/auth");
const { signVideoTicket, verifyVideoTicket } = require("../services/kbVideoTicket");

// Where tutorial recordings live. This directory sits inside file_storage/,
// which server.js serves publicly at /uploads — so server.js ALSO registers a
// guard that 404s /uploads/knowledge_base/* before that static mount. Videos are
// reachable only through the authenticated route below (FR-020).
const VIDEO_DIR = path.resolve(__dirname, "..", "file_storage", "knowledge_base");

// Server-side copy of the catalogue's videoId -> filename map. The catalogue
// itself lives in the client
// (public/src/components/Dashboard/KnowledgeBase/knowledgeBase.catalog.js);
// this mirrors only what the server needs to resolve a request. Both change in
// the same release by design (FR-017).
//
// Requests are resolved THROUGH this map, never by joining a path with the URL
// parameter — so directory traversal is structurally impossible rather than
// filtered out.
const VIDEO_FILES = Object.freeze({
  "whatsapp-broadcast": "whatsapp-broadcast.mp4",
  "whatsapp-twilio-templates": "whatsapp-twilio-templates.mp4",
  "whatsapp-auto-response": "whatsapp-auto-response.mp4",
  "whatsapp-guest-list": "whatsapp-guest-list.mp4",
  "whatsapp-sender": "whatsapp-sender.mp4",
  "whatsapp-reporting": "whatsapp-reporting.mp4",
  "place-id-finder": "place-id-finder.mp4",
  "pdf-generator": "pdf-generator.mp4",
  "registration-internal": "registration-internal.mp4",
  "registration-external": "registration-external.mp4",
});

// Every topic id that may appear in a view-log write. Sub-topics included.
const TOPIC_IDS = new Set(Object.keys(VIDEO_FILES));

const VIEW_EVENT_TYPES = new Set(["topic_opened", "video_played"]);

// ─── DB migration (idempotent — runs once at startup) ────────────────────────
// Mirrors the DDL documented in create_tables.sql.
(function runMigrations() {
  const steps = [
    `CREATE TABLE IF NOT EXISTS knowledge_base_view_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id    TEXT    NOT NULL,
      event_type  TEXT    NOT NULL
                  CHECK (event_type IN ('topic_opened', 'video_played')),
      admin_user  TEXT,
      created_at  INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kb_view_log_topic   ON knowledge_base_view_log (topic_id)`,
    `CREATE INDEX IF NOT EXISTS idx_kb_view_log_created ON knowledge_base_view_log (created_at)`,
  ];
  for (const sql of steps) {
    try { db.exec(sql); } catch { /* already applied */ }
  }
})();

// server.js already applies authorize_admin to everything under /api/, but this
// router states its own requirement too: these routes must never be reachable
// without an admin session, however they are mounted later.
router.use("/api/knowledge-base", authorize.authorize_admin);

/**
 * Resolve a videoId to an on-disk absolute path, or null.
 *
 * Requests are resolved THROUGH the VIDEO_FILES map, never by joining a path
 * with the URL parameter — so directory traversal is structurally impossible
 * rather than filtered out.
 *
 * Every caller answers null with the same 404, so an unknown id and a declared
 * recording that is not on disk are indistinguishable from outside: the
 * endpoint cannot be used to enumerate what exists.
 */
const resolveVideoPath = (videoId) => {
  const filename = VIDEO_FILES[videoId];
  if (!filename) return null;

  const absolutePath = path.resolve(VIDEO_DIR, filename);

  // Second, cheap line of defence: the resolved path must still be inside
  // VIDEO_DIR. Unreachable given the map lookup above, but the assertion is
  // what stops a future edit to VIDEO_FILES from becoming a traversal.
  if (!absolutePath.startsWith(VIDEO_DIR + path.sep)) return null;

  if (!fs.existsSync(absolutePath)) return null;

  return absolutePath;
};

/**
 * Send a recording, shared by both video routes.
 *
 * Range handling (seek and resume) comes from res.sendFile(), which delegates
 * to `send` and already emits 206 / 416 / Accept-Ranges correctly — no
 * hand-rolled Range parsing.
 */
const sendVideo = (res, absolutePath) =>
  res.sendFile(absolutePath, { acceptRanges: true }, (err) => {
    if (!err) return;
    // Client aborted mid-stream (seek, dialog closed) — not an error worth logging.
    if (res.headersSent) return;

    // `send` reports an unsatisfiable Range as 416 with the correct
    // Content-Range already set. Pass its status through rather than
    // flattening every failure to 404, which would mislead a client that
    // asked for a byte range past the end of the file.
    if (err.status && err.status !== 404) {
      return res.sendStatus(err.status);
    }

    console.error(`${Date.now()} - [KnowledgeBase] sendFile failed:`, err.message);
    return res.status(404).json({ error: "Video not found" });
  });

/**
 * GET /api/knowledge-base/videos/:videoId/ticket
 *
 * Mints a short-lived, single-video streaming ticket for the calling admin.
 *
 * Admin-authenticated by the cookie, like every other route on `router`. The
 * ticket it returns is what lets the browser fetch the bytes afterwards
 * without one: a <video> element cannot send an Authorization header, and a
 * cross-origin cookie is at the mercy of the browser's third-party cookie
 * policy (Safari ITP blocks it outright).
 */
router.get("/api/knowledge-base/videos/:videoId/ticket", (req, res) => {
  // Checked here as well as at stream time so a missing recording surfaces as
  // a clean 404 in the dialog rather than an opaque <video> error event.
  if (!resolveVideoPath(req.params.videoId)) {
    return res.status(404).json({ error: "Video not found" });
  }

  const { token, expiresIn } = signVideoTicket({
    videoId: req.params.videoId,
    // Identity comes from the verified JWT, never from the request.
    userId: req.user?.username || req.user?.email || req.user?.role || null,
  });

  // The raw token is not returned as its own field: folding it into the URL
  // leaves the client exactly one thing to use, and no second copy to mislay.
  return res.json({
    streamingUrl: `/api/knowledge-base/videos/${encodeURIComponent(
      req.params.videoId
    )}/stream?token=${encodeURIComponent(token)}`,
    expiresIn,
  });
});

/**
 * GET /api/knowledge-base/videos/:videoId/stream?token=...
 *
 * Streams one recording to the holder of a valid ticket for THAT video.
 *
 * No cookie is read and no session is consulted — the ticket is the whole
 * authentication story, which is precisely what allows a plain <video src> to
 * fetch this URL and get Range-based progressive playback.
 *
 * Mounted in server.js ABOVE app.use("/api/", authorize_admin). Registered
 * below it, a cookie-less request would be 401'd before the ticket was ever
 * examined, and the feature would appear entirely broken.
 */
streamRouter.get("/api/knowledge-base/videos/:videoId/stream", (req, res) => {
  // One uniform 404 for a missing, expired, forged or mis-scoped ticket: which
  // of those it was is free information for an attacker.
  if (!verifyVideoTicket(req.query.token, req.params.videoId)) {
    return res.status(404).json({ error: "Video not found" });
  }

  const absolutePath = resolveVideoPath(req.params.videoId);
  if (!absolutePath) {
    return res.status(404).json({ error: "Video not found" });
  }

  return sendVideo(res, absolutePath);
});

/**
 * GET /api/knowledge-base/videos/:videoId
 *
 * The original cookie-authenticated stream. RETAINED as a fallback while the
 * ticketed route above is field-verified; no client code references it any
 * more. Retire it once ticket minting has been confirmed in production —
 * removing it in the same change would leave nothing to fall back to.
 */
router.get("/api/knowledge-base/videos/:videoId", (req, res) => {
  const absolutePath = resolveVideoPath(req.params.videoId);
  if (!absolutePath) {
    return res.status(404).json({ error: "Video not found" });
  }

  return sendVideo(res, absolutePath);
});

/**
 * POST /api/knowledge-base/views
 *
 * Records that an administrator opened a topic or played its tutorial (FR-015).
 * Best-effort by contract: the client does not await this and never surfaces its
 * errors, so a failure here can never block playback or navigation.
 */
router.post("/api/knowledge-base/views", express.json(), (req, res) => {
  const { topicId, eventType } = req.body || {};

  // Rejecting unknown ids keeps this table from becoming arbitrary
  // client-writable storage.
  if (!topicId || !TOPIC_IDS.has(topicId)) {
    return res.status(400).json({ error: "Unknown topicId" });
  }

  if (!eventType || !VIEW_EVENT_TYPES.has(eventType)) {
    return res.status(400).json({ error: "Invalid eventType" });
  }

  try {
    dbService.create("knowledge_base_view_log", {
      topic_id: topicId,
      event_type: eventType,
      // Identity comes from the verified JWT, never from the request body.
      admin_user: req.user?.username || req.user?.email || req.user?.role || null,
      created_at: Date.now(),
    });
  } catch (err) {
    console.error(`${Date.now()} - [KnowledgeBase] view log write failed:`, err.message);
  }

  return res.status(204).send();
});

module.exports = router;

// Mounted separately, and BEFORE the global /api/ admin gate — see the
// comment on streamRouter at the top of this file.
module.exports.streamRouter = streamRouter;
