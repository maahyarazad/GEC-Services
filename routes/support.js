const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uniqid = require("uniqid");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");
const dbService = require("../services/dbService");
const db = dbService.getDB();
const { sendRawEmailWithAttachments_AppSupport } = require("../services/emailService");
const authorize = require("../middleware/auth");
const { fromBuffer } = require("file-type");
// ─── Storage directory ───────────────────────────────────────────────────────
const STORAGE_DIR = path.resolve(__dirname, "../support_attachments");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });



// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".pdf", ".docx", ".txt"]);
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
const MAX_FILES = 3;

const VALID_STATUSES = ["Open", "In Progress", "Waiting for Customer", "Resolved", "Closed"];
const VALID_CATEGORIES = ["Bug Report", "Technical Issue", "Feature Request", "Account Issue", "General Inquiry"];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

// ─── Multer (memory storage for validation before disk write) ─────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

// ─── Rate limiters ───────────────────────────────────────────────────────────
const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const trackLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// ─── reCAPTCHA verification ──────────────────────────────────────────────────
const RECAPTCHA_SECRET    = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_MIN_SCORE = 0.5;

// Verifies a Google reCAPTCHA token. Supports both v2 (no score) and v3
// (score-based); the score threshold is only enforced when present.
// Fails open when no secret is configured (e.g. local dev) so the public
// support flow keeps working — set RECAPTCHA_SECRET_KEY in production.
async function verifyRecaptcha(token, remoteIp) {
  if (!RECAPTCHA_SECRET) {
    console.warn("RECAPTCHA_SECRET_KEY not configured — skipping reCAPTCHA verification.");
    return { ok: true };
  }
  if (!token) return { ok: false, reason: "Missing reCAPTCHA token." };

  try {
    const params = new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token });
    if (remoteIp) params.append("remoteip", remoteIp);

    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await resp.json();

    if (!data.success) return { ok: false, reason: "reCAPTCHA verification failed." };
    if (typeof data.score === "number" && data.score < RECAPTCHA_MIN_SCORE)
      return { ok: false, reason: "reCAPTCHA score too low. Please try again." };

    return { ok: true };
  } catch (err) {
    console.error("reCAPTCHA verification error:", err);
    return { ok: false, reason: "Could not verify reCAPTCHA. Please try again." };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateTicketNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq  = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `SUP-${date}-${seq}`;
}

function logActivity(ticketId, adminId, action, oldValue = null, newValue = null) {
  db.prepare(
    `INSERT INTO support_ticket_activity (ticket_id, admin_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)`
  ).run(ticketId, adminId ?? null, action, oldValue, newValue);
}

function touchUpdatedAt(ticketId) {
  db.prepare(`UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?`).run(ticketId);
}

async function validateFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return { valid: false, reason: `File extension ${ext} not allowed` };
  if (file.size > MAX_FILE_SIZE) return { valid: false, reason: "File exceeds 1 MB limit" };

  const detected = await fromBuffer(file.buffer);
  const mime = detected?.mime ?? (ext === ".txt" ? "text/plain" : null);
  if (!mime || !ALLOWED_MIME.has(mime)) return { valid: false, reason: "File type not permitted" };

  return { valid: true, mime };
}

function confirmationEmailHtml({ full_name, ticket_number, subject, category, priority, created_at }) {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Support Ticket Received</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); margin:40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color:#ffffff; text-align:center; padding:20px; font-size:22px; font-weight:bold; border-top-left-radius:8px; border-top-right-radius:8px;">
                  Support Ticket Received
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; padding:0 30px 30px;">
              <tr>
                <td style="padding:20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>Dear <strong>${full_name}</strong>,</p>
                  <p>Thank you for reaching out. We have received your support request and our team will get back to you as soon as possible.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 20px;">
                  <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse; font-size:15px; color:#333333;">
                    <tr style="background-color:#faf8f3; border-bottom:1px solid #e8dfc0;">
                      <td style="font-weight:600; width:40%; padding:10px 12px;">Ticket Number</td>
                      <td style="padding:10px 12px;"><strong style="color:#D9B144; font-family:monospace; letter-spacing:1px;">${ticket_number}</strong></td>
                    </tr>
                    <tr style="border-bottom:1px solid #e8dfc0;">
                      <td style="font-weight:600; padding:10px 12px;">Subject</td>
                      <td style="padding:10px 12px;">${subject}</td>
                    </tr>
                    <tr style="background-color:#faf8f3; border-bottom:1px solid #e8dfc0;">
                      <td style="font-weight:600; padding:10px 12px;">Category</td>
                      <td style="padding:10px 12px;">${category}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e8dfc0;">
                      <td style="font-weight:600; padding:10px 12px;">Priority</td>
                      <td style="padding:10px 12px;">${priority}</td>
                    </tr>
                    <tr style="background-color:#faf8f3; border-bottom:1px solid #e8dfc0;">
                      <td style="font-weight:600; padding:10px 12px;">Status</td>
                      <td style="padding:10px 12px;">Open</td>
                    </tr>
                    <tr>
                      <td style="font-weight:600; padding:10px 12px;">Submitted</td>
                      <td style="padding:10px 12px;">${new Date(created_at).toLocaleString()}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>You can track your ticket status at any time using your ticket number at
                    <a href="https://services.german-emirates-club.com/support/track" style="color:#D9B144; text-decoration:none;">services.german-emirates-club.com/support/track</a>.
                  </p>
                  <p>If you have any questions, feel free to contact us at
                    <a href="mailto:office2@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">office2@german-emirates-club.com</a>.
                  </p>
                  <p>Warm regards,<br />The German Emirates Club Support Team</p>
                </td>
              </tr>
              <tr>
                <td style="font-size:13px; color:#777777; text-align:center; padding:20px; border-top:1px solid #dddddd;">
                  &copy; ${year} German Emirates Club. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /support/ticket — public submission (reCAPTCHA-protected)
router.post(
  "/support/ticket",
  submitLimiter,
  upload.array("attachments", MAX_FILES),
  async (req, res) => {
    try {
      // reCAPTCHA validation (replaces member/partner token auth)
      const recaptcha = await verifyRecaptcha(req.body.recaptchaToken, req.ip);
      if (!recaptcha.ok)
        return res.status(400).json({ status: false, message: recaptcha.reason });

      const { full_name, email, subject, category, priority, description } = req.body;

      // Validation
      if (!full_name?.trim() || !email?.trim() || !subject?.trim() || !description?.trim())
        return res.status(400).json({ status: false, message: "All fields are required." });
      if (!VALID_CATEGORIES.includes(category))
        return res.status(400).json({ status: false, message: "Invalid category." });
      if (!VALID_PRIORITIES.includes(priority))
        return res.status(400).json({ status: false, message: "Invalid priority." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ status: false, message: "Invalid email address." });

      const files = req.files ?? [];
      if (files.length > MAX_FILES)
        return res.status(400).json({ status: false, message: `Maximum ${MAX_FILES} files allowed.` });

      // Validate each file
      const validatedFiles = [];
      for (const file of files) {
        const result = await validateFile(file);
        if (!result.valid)
          return res.status(400).json({ status: false, message: `File "${file.originalname}": ${result.reason}` });
        validatedFiles.push({ file, mime: result.mime });
      }

      const ticket_number = generateTicketNumber();

      // Insert ticket
      const insert = db.prepare(`
        INSERT INTO support_tickets (ticket_number, full_name, email, subject, category, priority, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const { lastInsertRowid: ticketId } = insert.run(
        ticket_number,
        full_name.trim(),
        email.trim().toLowerCase(),
        subject.trim(),
        category,
        priority,
        description.trim()
      );

      // Save attachments to disk
      for (const { file, mime } of validatedFiles) {
        const ext      = path.extname(file.originalname).toLowerCase();
        const fileName = `${uniqid()}${ext}`;
        const filePath = path.join(STORAGE_DIR, fileName);
        fs.writeFileSync(filePath, file.buffer);
        db.prepare(`
          INSERT INTO support_ticket_attachments (ticket_id, original_name, file_name, mime_type, file_size)
          VALUES (?, ?, ?, ?, ?)
        `).run(ticketId, file.originalname, fileName, mime, file.size);
      }

      logActivity(ticketId, null, "Ticket Created");

      const ticket = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId);

      // Send confirmation email (non-blocking)
      sendRawEmailWithAttachments_AppSupport({
        to: ticket.email,
        subject: `Support Ticket Received - ${ticket_number}`,
        html: confirmationEmailHtml(ticket),
      }).catch((err) => console.error("Support email error:", err));

      return res.json({ status: true, ticket_number, message: "Ticket submitted successfully." });
    } catch (err) {
      console.error("Support ticket creation error:", err);
      return res.status(500).json({ status: false, message: "An unexpected error occurred." });
    }
  }
);

// GET /support/ticket/track — public ticket details (reCAPTCHA-protected)
router.get("/support/ticket/track", trackLimiter, async (req, res) => {
  try {
    const { ticketNumber, recaptchaToken } = req.query;

    // reCAPTCHA validation (replaces ticket-token auth)
    const recaptcha = await verifyRecaptcha(recaptchaToken, req.ip);
    if (!recaptcha.ok)
      return res.status(400).json({ status: false, message: recaptcha.reason });

    if (!ticketNumber?.trim())
      return res.status(400).json({ status: false, message: "Ticket number is required." });

    const ticket = db.prepare(`
      SELECT id, ticket_number, subject, category, priority, status, created_at, updated_at, resolved_at
      FROM support_tickets WHERE ticket_number = ?
    `).get(ticketNumber.trim().toUpperCase());

    if (!ticket) return res.status(404).json({ status: false, message: "Ticket not found." });

    const comments = db.prepare(`
      SELECT comment, created_at FROM support_ticket_comments
      WHERE ticket_id = ? AND is_public = 1 ORDER BY created_at ASC
    `).all(ticket.id);

    return res.json({ status: true, data: { ...ticket, comments } });
  } catch (err) {
    console.error("Ticket track error:", err);
    return res.status(500).json({ status: false, message: "An unexpected error occurred." });
  }
});

// ─── Admin routes (require admin auth) ────────────────────────────────────────

// GET /api/admin/support/tickets — paginated list
router.get("/api/admin/support/tickets", authorize.authorize_admin, (req, res) => {
  try {
    const page     = Math.max(0, parseInt(req.query.page)     || 0);
    const pageSize = Math.min(100, parseInt(req.query.pageSize) || 25);
    const sortField = ["ticket_number","subject","category","priority","status","full_name","created_at","updated_at"].includes(req.query.sortField)
      ? req.query.sortField : "created_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    const whereParts = [];
    const params = [];

    if (req.query.status)   { whereParts.push("status = ?");   params.push(req.query.status); }
    if (req.query.priority) { whereParts.push("priority = ?"); params.push(req.query.priority); }
    if (req.query.category) { whereParts.push("category = ?"); params.push(req.query.category); }
    if (req.query.search)   { whereParts.push("(ticket_number LIKE ? OR subject LIKE ? OR full_name LIKE ?)"); const s = `%${req.query.search}%`; params.push(s, s, s); }
    if (req.query.dateFrom) { whereParts.push("date(created_at) >= ?"); params.push(req.query.dateFrom); }
    if (req.query.dateTo)   { whereParts.push("date(created_at) <= ?"); params.push(req.query.dateTo); }

    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const count  = db.prepare(`SELECT COUNT(*) as total FROM support_tickets ${where}`).get(...params).total;
    const rows   = db.prepare(`SELECT * FROM support_tickets ${where} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pageSize, page * pageSize);

    return res.json({ status: true, data: rows, total: count });
  } catch (err) {
    console.error("Admin support list error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

// GET /api/admin/support/tickets/:id — single ticket with attachments, comments, activity
router.get("/api/admin/support/tickets/:id", authorize.authorize_admin, (req, res) => {
  try {
    const ticket = db.prepare(`
      SELECT t.*,
             u.firstName AS assigned_firstName,
             u.lastName  AS assigned_lastName,
             u.email     AS assigned_email
      FROM support_tickets t
      LEFT JOIN GIC_Users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `).get(req.params.id);
    if (!ticket) return res.status(404).json({ status: false, message: "Not found." });

    const attachments = db.prepare("SELECT id, original_name, mime_type, file_size, created_at FROM support_ticket_attachments WHERE ticket_id = ?").all(ticket.id);
    const comments    = db.prepare(`
      SELECT c.*, u.firstName AS admin_firstName, u.lastName AS admin_lastName
      FROM support_ticket_comments c
      LEFT JOIN GIC_Users u ON c.admin_id = u.id
      WHERE c.ticket_id = ? ORDER BY c.created_at ASC
    `).all(ticket.id);
    const activity    = db.prepare(`
      SELECT a.*, u.firstName AS admin_firstName, u.lastName AS admin_lastName
      FROM support_ticket_activity a
      LEFT JOIN GIC_Users u ON a.admin_id = u.id
      WHERE a.ticket_id = ? ORDER BY a.created_at ASC
    `).all(ticket.id);

    return res.json({ status: true, data: { ...ticket, attachments, comments, activity } });
  } catch (err) {
    console.error("Admin ticket detail error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

// GET /api/admin/support/admins — list of admin users for assignment
router.get("/api/admin/support/admins", authorize.authorize_admin, (_req, res) => {
  try {
    const admins = db.prepare("SELECT id, firstName, lastName, email FROM GIC_Users WHERE role = 'admin' ORDER BY firstName, lastName").all();
    return res.json({ status: true, data: admins });
  } catch (err) {
    console.error("Admin list error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

// PATCH /api/admin/support/tickets/:id/status
router.patch("/api/admin/support/tickets/:id/status", authorize.authorize_admin, (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ status: false, message: "Invalid status." });

    const ticket = db.prepare("SELECT status FROM support_tickets WHERE id = ?").get(req.params.id);
    if (!ticket) return res.status(404).json({ status: false, message: "Not found." });

    const resolvedAt = status === "Resolved" ? "datetime('now')" : "NULL";
    db.prepare(`UPDATE support_tickets SET status = ?, updated_at = datetime('now'), resolved_at = ${resolvedAt} WHERE id = ?`).run(status, req.params.id);
    logActivity(req.params.id, req.user?.id ?? null, "Status Changed", ticket.status, status);

    return res.json({ status: true, message: "Status updated." });
  } catch (err) {
    console.error("Status update error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

// PATCH /api/admin/support/tickets/:id/assign
router.patch("/api/admin/support/tickets/:id/assign", authorize.authorize_admin, (req, res) => {
  try {
    const { admin_id } = req.body;
    const ticket = db.prepare("SELECT assigned_to FROM support_tickets WHERE id = ?").get(req.params.id);
    if (!ticket) return res.status(404).json({ status: false, message: "Not found." });

    db.prepare("UPDATE support_tickets SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").run(admin_id ?? null, req.params.id);
    logActivity(req.params.id, req.user?.id ?? null, "Ticket Assigned", String(ticket.assigned_to ?? "Unassigned"), String(admin_id ?? "Unassigned"));

    return res.json({ status: true, message: "Ticket assigned." });
  } catch (err) {
    console.error("Assign error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

// POST /api/admin/support/tickets/:id/comment
router.post("/api/admin/support/tickets/:id/comment", authorize.authorize_admin, (req, res) => {
  try {
    const { comment, is_public } = req.body;
    if (!comment?.trim()) return res.status(400).json({ status: false, message: "Comment is required." });

    const ticket = db.prepare("SELECT id FROM support_tickets WHERE id = ?").get(req.params.id);
    if (!ticket) return res.status(404).json({ status: false, message: "Not found." });

    const isPublic = is_public ? 1 : 0;
    const result = db.prepare(
      "INSERT INTO support_ticket_comments (ticket_id, admin_id, comment, is_public) VALUES (?, ?, ?, ?)"
    ).run(ticket.id, req.user?.id ?? null, comment.trim(), isPublic);

    touchUpdatedAt(ticket.id);
    logActivity(ticket.id, req.user?.id ?? null, isPublic ? "Public Response Added" : "Internal Note Added");

    return res.json({ status: true, id: result.lastInsertRowid, message: "Comment added." });
  } catch (err) {
    console.error("Comment error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

// GET /api/admin/support/attachments/:attachmentId — download attachment
router.get("/api/admin/support/attachments/:attachmentId", authorize.authorize_admin, (req, res) => {
  try {
    const attachment = db.prepare("SELECT * FROM support_ticket_attachments WHERE id = ?").get(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ status: false, message: "Not found." });

    const filePath = path.join(STORAGE_DIR, attachment.file_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ status: false, message: "File not found on disk." });

    res.setHeader("Content-Disposition", `attachment; filename="${attachment.original_name}"`);
    res.setHeader("Content-Type", attachment.mime_type);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Attachment download error:", err);
    return res.status(500).json({ status: false, message: "Server error." });
  }
});

module.exports = router;
