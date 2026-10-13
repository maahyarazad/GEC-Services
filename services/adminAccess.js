// Central authority for "who is a full admin".
//
// The admin panel has two access tiers:
//   - "full"    → the complete panel (all sections)
//   - "limited" → PDF Generator + Place ID Finder only
//
// A session is full when it logged in with the shared master password, or when
// its SSO email is on the allowlist configured in ADMIN_FULL_EMAILS. The list is
// read from the environment (never shipped to the browser) and parsed on demand
// so a server restart picks up edits without a code change — see
// specs/008-sso-role-access/.

let warnedEmptyAllowlist = false;

/**
 * Parse ADMIN_FULL_EMAILS into a Set of normalized (trimmed, lowercased) emails.
 * Empty/unset → empty Set (fail-safe: SSO users become "limited"); warns once.
 * @returns {Set<string>}
 */
function parseAllowlist() {
  const raw = process.env.ADMIN_FULL_EMAILS;
  if (!raw || !raw.trim()) {
    if (!warnedEmptyAllowlist) {
      console.warn(
        `${Date.now()} - ADMIN_FULL_EMAILS is not configured; no SSO email will receive full admin access (password login is unaffected).`
      );
      warnedEmptyAllowlist = true;
    }
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * Decide the access tier for a login.
 * @param {{ email?: string, viaPassword?: boolean }} params
 * @returns {"full" | "limited"}
 */
function classify({ email, viaPassword } = {}) {
  if (viaPassword) return "full";
  const normalized = normalizeEmail(email);
  if (normalized && parseAllowlist().has(normalized)) return "full";
  return "limited";
}

module.exports = { parseAllowlist, classify, normalizeEmail };
