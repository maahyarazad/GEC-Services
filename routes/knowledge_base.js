const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();
const authorize = require("../middleware/auth");

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
 * GET /api/knowledge-base/videos/:videoId
 *
 * Streams one tutorial recording to an authenticated administrator.
 *
 * Range handling (seek and resume) comes from res.sendFile(), which delegates to
 * `send` and already emits 206 / 416 / Accept-Ranges correctly — no hand-rolled
 * Range parsing.
 */
router.get("/api/knowledge-base/videos/:videoId", (req, res) => {
  const filename = VIDEO_FILES[req.params.videoId];

  // Unknown id: 404 before any filesystem access.
  if (!filename) {
    return res.status(404).json({ error: "Video not found" });
  }

  const absolutePath = path.resolve(VIDEO_DIR, filename);

  // Second, cheap line of defence: the resolved path must still be inside
  // VIDEO_DIR. Unreachable given the map lookup above, but the assertion is
  // what stops a future edit to VIDEO_FILES from becoming a traversal.
  if (!absolutePath.startsWith(VIDEO_DIR + path.sep)) {
    return res.status(404).json({ error: "Video not found" });
  }

  // A declared recording that is not on disk yet. Same 404 as an unknown id, so
  // the endpoint cannot be used to enumerate what exists.
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  return res.sendFile(absolutePath, { acceptRanges: true }, (err) => {
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
