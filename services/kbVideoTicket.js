const jwt = require("jsonwebtoken");

// Short-lived, video-scoped streaming tickets.
//
// Why this exists: the video stream endpoint is admin-only, but a plain
// <video src> cannot send an Authorization header. Fetching the bytes through
// axios instead buffers the whole file and throws away the server's Range
// support, which is what made playback wait for a full download.
//
// A ticket rides in the query string so the browser can request the URL
// directly. To make that safe it is deliberately not the session token: it is
// valid for one video, for one admin, for a short window, and it is rejected
// by every route that expects a session token.
const PURPOSE = "kb-video";
const DEFAULT_TTL_SECONDS = 7200;

// A dedicated key, not JWT_SECRET. The `purpose` claim already separates the
// two domains logically; a separate key makes cross-use cryptographically
// impossible rather than merely checked, so a bug in a claim comparison cannot
// promote a ticket into a session token. It also allows rotating tickets
// without logging every admin out.
const SECRET = process.env.KB_VIDEO_TICKET_SECRET;

// Fail at require() rather than per-request. An unset secret is a deployment
// error, and a server that boots and then 500s on every video is harder to
// diagnose than one that refuses to start. Never fall back to another secret.
if (!SECRET) {
  throw new Error(
    "KB_VIDEO_TICKET_SECRET is not set. It is required to sign Knowledge Base " +
      "video tickets and must differ from JWT_SECRET."
  );
}

const parseTtl = () => {
  const parsed = Number.parseInt(process.env.KB_VIDEO_TICKET_TTL, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_SECONDS;
  return parsed;
};

const ttlSeconds = () => parseTtl();

// Sign a ticket for one video and one admin. Returns { token, expiresIn }.
//
// `vid` is stored as a STRING. Video ids in this catalogue are slugs —
// "whatsapp-broadcast", "pdf-generator" (see VIDEO_FILES in
// routes/knowledge_base.js) — so coercing with Number() yields NaN, and NaN
// never equals NaN. A numeric claim would make verifyVideoTicket reject every
// ticket this function ever signed, with a 404 indistinguishable from a
// missing file.
const signVideoTicket = ({ videoId, userId }) => {
  const expiresIn = ttlSeconds();

  const token = jwt.sign(
    {
      purpose: PURPOSE,
      vid: String(videoId),
      uid: userId ?? null,
    },
    SECRET,
    { algorithm: "HS256", expiresIn }
  );

  return { token, expiresIn };
};

// Verify a ticket against the video being requested.
//
// Returns the decoded payload, or null for every failure. Callers must not
// distinguish the causes to the client: telling an attacker whether a ticket
// was expired, mis-scoped, or forged is free information.
const verifyVideoTicket = (token, videoId) => {
  if (!token) return null;

  let payload;
  try {
    // Pin the algorithm. Without this, jsonwebtoken honours the token header's
    // own `alg`, which lets a forged token claim "none" or a different scheme.
    payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    return null;
  }

  if (payload.purpose !== PURPOSE) return null;

  // The scoping guarantee: a ticket minted for one video is useless on another.
  // Compared as strings — see the note on `vid` in signVideoTicket.
  if (String(payload.vid) !== String(videoId)) return null;

  return payload;
};

module.exports = {
  PURPOSE,
  DEFAULT_TTL_SECONDS,
  ttlSeconds,
  signVideoTicket,
  verifyVideoTicket,
};
