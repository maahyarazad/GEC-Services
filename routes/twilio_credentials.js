const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const router = express.Router();

// Brute-force ceiling. The reveal gate is a single shared password, so without
// a limiter an authenticated admin session could grind it offline-fast. Five
// tries per 15 minutes per IP is generous for a human and useless for a script.
const revealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

/**
 * Constant-time string comparison.
 *
 * A plain `===` on secrets leaks their length and, in principle, their prefix
 * through response timing. Hashing both sides first means timingSafeEqual always
 * gets equal-length buffers, so it cannot throw on a length mismatch and the
 * comparison time is independent of the input.
 */
const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();

  return crypto.timingSafeEqual(hashA, hashB);
};

/**
 * POST /api/whatsapp/reveal-twilio-credentials
 *
 * Returns the Twilio account SID and auth token to an administrator who
 * re-enters the admin password.
 *
 * Two gates, not one: server.js already applies authorize_admin to everything
 * under /api/, so a valid admin session is required before this handler runs at
 * all; the password is a second factor on top of that, so a walk-up on an
 * unlocked machine cannot lift the credentials.
 *
 * The password is verified HERE, on the server. It is never sent to the browser
 * for comparison — that would put the secret in the bundle and make the gate
 * decorative.
 */
router.post(
  "/api/whatsapp/reveal-twilio-credentials",
  revealLimiter,
  express.json(),
  (req, res) => {
    const adminPassword = process.env.VITE_ADMIN_PASSWORD;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Misconfiguration must fail closed. Without this, an empty env var would
    // make every empty-password attempt succeed.
    if (!adminPassword) {
      console.error(
        `${Date.now()} - [TwilioReveal] VITE_ADMIN_PASSWORD is not configured; refusing to reveal.`
      );
      return res.status(503).json({ error: "Credential reveal is not configured." });
    }

    if (!accountSid || !authToken) {
      return res.status(503).json({ error: "Twilio credentials are not configured." });
    }

    const { password } = req.body || {};
    const who = req.user?.username || req.user?.email || req.user?.role || "unknown-admin";

    if (!safeEqual(password, adminPassword)) {
      // Audit trail. Surfaces in the dashboard's Server Logs section, so a burst
      // of these is visible without shell access. The attempt is never logged.
      console.warn(
        `${Date.now()} - [TwilioReveal] DENIED — bad password. admin=${who} ip=${req.ip}`
      );
      return res.status(401).json({ error: "Incorrect password." });
    }

    console.log(
      `${Date.now()} - [TwilioReveal] GRANTED — credentials revealed. admin=${who} ip=${req.ip}`
    );

    // Keep the response out of every cache between here and the browser.
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");

    return res.status(200).json({ accountSid, authToken });
  }
);

module.exports = router;
