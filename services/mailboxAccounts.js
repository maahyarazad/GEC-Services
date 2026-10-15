// Fixed mailbox account + folder registry for the Do-Not-Reply Mail Box feature
// (009-do-not-reply-mailbox).
//
// The browser NEVER chooses a mailbox by address and NEVER sends credentials — it
// sends only an account KEY and a folder KEY, both validated here against these
// allow-lists before any curl call. Credentials are read from env at call time and
// handed to curl on stdin; they are never returned to the client.
//
// Reuses the existing IMAP host/credential convention from services/imapPoller.js.

require("dotenv").config();

// Account key -> which env vars hold its address + credentials.
const ACCOUNTS = Object.freeze({
  "do-not-reply": {
    key: "do-not-reply",
    label: "Do-Not-Reply",
    addressEnv: "SMTP_SENDER",
    userEnv: "SMTP_SENDER",
    passEnv: "SMTP_PASS",
    default: true,
  },
  support: {
    key: "support",
    label: "Support",
    addressEnv: "SMTP_SUPPORT_SENDER",
    userEnv: "SMTP_SUPPORT_SENDER",
    passEnv: "SMTP_SUPPORT_SENDER_PASS",
    default: false,
  },
});

// Client folder key -> real IMAP mailbox name.
const FOLDERS = Object.freeze({
  Inbox: "INBOX",
  Sent: "Sent",
});

function imapHost() {
  return process.env.IMAP_HOST || process.env.SMTP_HOST || "buenapublica.cmpsrv.com";
}

function imapPort() {
  return parseInt(process.env.IMAP_PORT || "993", 10);
}

function isValidAccountKey(key) {
  return Object.prototype.hasOwnProperty.call(ACCOUNTS, key);
}

function isValidFolderKey(key) {
  return Object.prototype.hasOwnProperty.call(FOLDERS, key);
}

function imapFolderName(folderKey) {
  return FOLDERS[folderKey];
}

// Resolve an account key to everything a curl call needs. `available` is false
// when the credential env vars are not configured. The returned object DOES
// contain `user`/`pass` for server-side use only — never serialise it to a client.
function resolve(key) {
  const acct = ACCOUNTS[key];
  if (!acct) return null;
  const address = process.env[acct.addressEnv] || "";
  const user = process.env[acct.userEnv] || "";
  const pass = process.env[acct.passEnv] || "";
  return {
    key: acct.key,
    label: acct.label,
    address,
    user,
    pass,
    host: imapHost(),
    port: imapPort(),
    available: Boolean(user && pass),
  };
}

// Public (client-safe) account list — no credentials.
function publicAccounts() {
  return Object.values(ACCOUNTS).map((acct) => {
    const r = resolve(acct.key);
    return {
      key: acct.key,
      label: acct.label,
      address: r.address,
      available: r.available,
      default: Boolean(acct.default),
    };
  });
}

function publicFolders() {
  return Object.keys(FOLDERS).map((key) => ({ key }));
}

module.exports = {
  ACCOUNTS,
  FOLDERS,
  isValidAccountKey,
  isValidFolderKey,
  imapFolderName,
  resolve,
  publicAccounts,
  publicFolders,
  imapHost,
  imapPort,
};
