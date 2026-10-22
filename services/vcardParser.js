// Minimal vCard (3.0/4.0) parser for WhatsApp contact shares.
// Only reads the properties ChatView shows: FN, N, ORG, TEL, EMAIL.

const unescapeValue = (value) =>
  value.replace(/\\([nN,;\\])/g, (_, ch) => (ch === "n" || ch === "N" ? "\n" : ch));

// Split on the first `sep` that isn't backslash-escaped.
const splitUnescaped = (str, sep) => {
  const parts = [];
  let current = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\" && i + 1 < str.length) {
      current += str[i] + str[i + 1];
      i++;
    } else if (str[i] === sep) {
      parts.push(current);
      current = "";
    } else {
      current += str[i];
    }
  }
  parts.push(current);
  return parts;
};

// "TEL;type=CELL;type=VOICE;waid=9715…" → { name: "TEL", params: { type: ["cell", "voice"], waid: ["9715…"] } }
const parsePropertyHeader = (header) => {
  const [rawName, ...rawParams] = header.split(";");
  const name = rawName.replace(/^item\d+\./i, "").toUpperCase();
  const params = {};
  for (const param of rawParams) {
    const eq = param.indexOf("=");
    // vCard 2.1 bare params like "TEL;CELL:" are type values.
    const key = eq === -1 ? "type" : param.slice(0, eq).toLowerCase();
    const values = (eq === -1 ? param : param.slice(eq + 1)).split(",");
    params[key] = [...(params[key] || []), ...values.map((v) => v.replace(/"/g, "").trim())];
  }
  return { name, params };
};

const firstType = (params) => {
  const type = (params.type || []).find((t) => t && t.toLowerCase() !== "pref");
  return type ? type.toLowerCase() : null;
};

const buildContact = (props) => {
  const contact = { name: null, org: null, phones: [], emails: [] };
  let structuredName = null;

  for (const { name, params, value } of props) {
    switch (name) {
      case "FN":
        contact.name = unescapeValue(value).trim() || contact.name;
        break;
      case "N": {
        const [family = "", given = ""] = splitUnescaped(value, ";").map(unescapeValue);
        structuredName = [given, family].map((s) => s.trim()).filter(Boolean).join(" ") || null;
        break;
      }
      case "ORG":
        contact.org = unescapeValue(splitUnescaped(value, ";")[0]).trim() || null;
        break;
      case "TEL": {
        const phone = unescapeValue(value).replace(/^tel:/i, "").trim();
        if (phone) {
          contact.phones.push({
            value: phone,
            type: firstType(params),
            waId: params.waid?.[0] || null,
          });
        }
        break;
      }
      case "EMAIL": {
        const email = unescapeValue(value).trim();
        if (email) contact.emails.push({ value: email, type: firstType(params) });
        break;
      }
      default:
        break;
    }
  }

  contact.name = contact.name || structuredName || contact.phones[0]?.value || "Unknown contact";
  return contact;
};

/**
 * Parse vCard text (one or more BEGIN:VCARD…END:VCARD blocks).
 * @param {string} text
 * @returns {{ name: string, org: string|null, phones: {value: string, type: string|null, waId: string|null}[], emails: {value: string, type: string|null}[] }[]}
 */
function parseVCard(text) {
  if (typeof text !== "string" || !text) return [];

  // Unfold continuation lines (RFC 6350 §3.2): CRLF/LF followed by a space or tab.
  const lines = text.replace(/\r\n|\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");

  const contacts = [];
  let props = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const upper = line.trim().toUpperCase();

    if (upper === "BEGIN:VCARD") {
      props = [];
      continue;
    }
    if (upper === "END:VCARD") {
      if (props) contacts.push(buildContact(props));
      props = null;
      continue;
    }
    if (!props) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    props.push({ ...parsePropertyHeader(line.slice(0, colon)), value: line.slice(colon + 1) });
  }

  return contacts;
}

module.exports = { parseVCard };
