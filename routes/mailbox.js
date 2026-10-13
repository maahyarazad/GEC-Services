// Admin API for the Do-Not-Reply Mail Box (009-do-not-reply-mailbox).
//
// Read-only, admin-guarded, curl-backed (see services/mailboxService.js). The
// client sends ONLY an account key + folder key (+ uid) — never an address or a
// credential. Keys are validated against the allow-list before any curl call.
//
// Contract: specs/009-do-not-reply-mailbox/contracts/mailbox-api.md

const express = require("express");
const router = express.Router();
const authorize = require("../middleware/auth");
const accounts = require("../services/mailboxAccounts");
const mailbox = require("../services/mailboxService");

// Every /api/mailbox/* route is admin-only.
router.use("/api/mailbox", authorize.authorize_admin);

// Map a MailboxError.code (or a validation failure) to an HTTP status + generic
// message. Raw curl stderr is never surfaced here (it is logged in the service).
function sendError(res, err) {
  const code = err && err.code;
  const map = {
    unavailable: [409, "This mailbox is not configured"],
    auth: [502, "Could not sign in to the mailbox"],
    unreachable: [502, "Could not reach the mail server"],
    timeout: [504, "The mail server timed out"],
    parse: [500, "Could not read the mailbox response"],
    unknown: [500, "Mailbox request failed"],
  };
  const [status, message] = map[code] || [500, "Mailbox request failed"];
  if (status >= 500 && code !== "parse" && code !== "unknown") {
    // 502/504 — log lightly; detailed stderr already logged in the service.
    console.error(`${Date.now()} - mailbox endpoint error: ${code}`);
  }
  return res.status(status).json({ status: false, code: code || "unknown", message });
}

// GET /api/mailbox/accounts — selector data (US3). No credentials in the response.
router.get("/api/mailbox/accounts", (req, res) => {
  try {
    return res.json({
      status: true,
      accounts: accounts.publicAccounts(),
      folders: accounts.publicFolders(),
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// GET /api/mailbox/messages — paged list for one account+folder (US1).
router.get("/api/mailbox/messages", async (req, res) => {
  const { account = "do-not-reply", folder = "Inbox", page, pageSize } = req.query;
  if (!accounts.isValidAccountKey(account)) {
    return res.status(400).json({ status: false, code: "bad_account", message: "Unknown account" });
  }
  if (!accounts.isValidFolderKey(folder)) {
    return res.status(400).json({ status: false, code: "bad_folder", message: "Unknown folder" });
  }
  try {
    const result = await mailbox.listMessages({ account, folder, page, pageSize });
    return res.json({ status: true, ...result });
  } catch (err) {
    return sendError(res, err);
  }
});

// GET /api/mailbox/message — one full message, peek semantics (US2).
router.get("/api/mailbox/message", async (req, res) => {
  const { account = "do-not-reply", folder = "Inbox", uid } = req.query;
  if (!accounts.isValidAccountKey(account)) {
    return res.status(400).json({ status: false, code: "bad_account", message: "Unknown account" });
  }
  if (!accounts.isValidFolderKey(folder)) {
    return res.status(400).json({ status: false, code: "bad_folder", message: "Unknown folder" });
  }
  const uidNum = parseInt(uid, 10);
  if (!Number.isFinite(uidNum) || uidNum <= 0) {
    return res.status(400).json({ status: false, code: "bad_uid", message: "Invalid uid" });
  }
  try {
    const message = await mailbox.getMessage({ account, folder, uid: uidNum });
    return res.json({ status: true, message });
  } catch (err) {
    return sendError(res, err);
  }
});

module.exports = router;
