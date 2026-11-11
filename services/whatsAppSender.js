require("dotenv").config();
const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dbService = require("../services/dbService");
const {
  twilioMessageCache,
  historyPageCache,
  templateListCache,
} = require("../services/cacheService");
const db = dbService.getDB();
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const {generateQR_WhatsApp} = require("../services/qrGenerator");
const {isObject, chunkArray} = require('../helpers/essentials');

dayjs.extend(utc);
dayjs.extend(timezone);

const UAE_TZ = "Asia/Dubai";

// Helper: parse any date string → UAE dayjs object
const toUAE = (dateStr) => {
  if (!dateStr) return null;

  return dayjs.utc(dateStr).tz(UAE_TZ);
};

const otpSender = async (req) => {
  let { mobile_number, otp } = req.body;

  try {
    // Basic validation & normalization of mobile_number
    if (!mobile_number) throw new Error("Mobile number is required");

    // Remove spaces, dashes, parentheses, etc.
    mobile_number = mobile_number.replace(/[\s()-]/g, "");

    // Ensure it starts with '+' and only digits after
    if (!/^\+\d{7,15}$/.test(mobile_number)) {
      throw new Error("Invalid phone number format. Must be E.164 format.");
    }

    // Prevent sending to the same number as your WhatsApp sender
    if (mobile_number === "+971521160991") {
      throw new Error(
        "Cannot send message to the sender's own WhatsApp number."
      );
    }

    const whatsapp_sender_result = await twilioClient.messages.create({
      from: "whatsapp:+971521160991",
      to: `whatsapp:${mobile_number}`,

      contentSid: process.env.TWILIO_OTP_CONTENT_SID,
      contentVariables: JSON.stringify({
        1: "1623",
        2: "5 minutes",
      }),
    });

    console.log(`${Date.now()} - WhatsApp message sent:`, whatsapp_sender_result);
    return { status: true, result: whatsapp_sender_result.status };
  } catch (error) {
    console.error(`${Date.now()} - WhatsApp sender error:`, error.message || error);
    return { status: false, result: error.message || error };
  }
};

function extractPlaceholders(text) {
  const regex = /{{\s*(\d+)\s*}}/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((m) => m[1]); // returns ["1", "2", ...]
}

async function enrichPhoneListWithContactData(phoneList, db) {
  const phoneNumbers = phoneList.map((item) => item.phone);

  const placeholders = phoneNumbers.map(() => "?").join(", ");

  const query = `
    SELECT 
      id,
      title,
      first_name,
      last_name,
      gender,
      phone,
      language,
      type,
      club_partner_name,
      blacklist,
      contentSid
    FROM contact_book
    WHERE phone IN (${placeholders})
  `;

  // better-sqlite3: prepare first, then call .all() on the statement
  const contactRows = db.prepare(query).all(...phoneNumbers);

  const contactMap = new Map(contactRows.map((row) => [row.phone, row]));

  const enrichedList = phoneList.map((item) => {
    const contact = contactMap.get(item.phone);

    if (!contact) {
      return { ...item, contactFound: false };
    }

    return {
      ...item,
      contactFound: true,
      contactId: contact.id,
      title: contact.title,
      first_name: contact.first_name,
      last_name: contact.last_name,
      gender: contact.gender,
      language: contact.language,
      type: contact.type,
      club_partner_name: contact.club_partner_name,
      blacklist: contact.blacklist,
      contentSid: contact.contentSid,
    };
  });

  return enrichedList;
}


// Helper to detect placeholders in body/
function hasPlaceholders(text) {
  return /{{\s*[^}]+\s*}}/.test(text);
}

const contactBookData = (conditions, useAudience, eventId, contentSid) => {
  const params = { eventId: Number(eventId) };
  params.language = conditions.language.slice(0, 2);
  params.contentSid = contentSid

  let query = "";

  if (useAudience === "all") {
    query = `
           SELECT *
      FROM contact_book AS cb
      WHERE cb.phone IS NOT NULL
        AND cb.blacklist = 0
       AND cb.language = @language
		AND cb.id not in (SELECT cbe.contact_book_id FROM contact_book_events as cbe WHERE cbe.event_id = @eventId AND cbe.contentSid = @contentSid)
        AND cb.type  NOT IN ('Wüstenkinder', 'expert_guest', 'only_guest')
		AND cb.phone NOT IN (SELECT uc.phone FROM unsubscribe_contacts as uc)
      ORDER BY 
		CASE cb.type
			WHEN 'gec_staff'       THEN 1
          WHEN 'club_partner'    THEN 2
          WHEN 'club_member'     THEN 3
          WHEN 'expert'          THEN 4
          WHEN 'difa'            THEN 5
          WHEN 'medical_society' THEN 6
          ELSE                        7
        END;
    `;
  } else {
    params.useAudience = useAudience;
    params.senderLimit = Number(conditions.senderLimit);

    query = `
       SELECT *
      FROM contact_book AS cb
      WHERE cb.phone IS NOT NULL
        AND cb.blacklist = 0
        AND cb.language = @language
		AND cb.id NOT in (SELECT cbe.contact_book_id FROM contact_book_events as cbe WHERE cbe.event_id = @eventId AND cbe.contentSid = @contentSid)
        AND cb.type = @useAudience
		AND cb.phone NOT IN (SELECT uc.phone FROM unsubscribe_contacts as uc)
        LIMIT @senderLimit;
        
    `;
  }

  const stmt = db.prepare(query);
  const result = stmt.all(params);

  return result;
};

const corruptedContactBookData = (conditions) => {
  const query = `
      SELECT *
      FROM contact_book
    `;

  const stmt = db.prepare(query);
  const result = stmt.all();

  result.forEach((el) => {
    try {
      const phoneNumber = parsePhoneNumberFromString(el.phone);

      if (!phoneNumber) {
        el.phone_validation = false;
        el.phone_invalid_reason = "Parsing failed";
      } else if (!phoneNumber.isValid()) {
        el.phone_validation = false;
        el.phone_invalid_reason = "Number format invalid";
      } else {
        el.phone_validation = true;
        el.phone_invalid_reason = null;
      }
    } catch (error) {
      el.phone_validation = false;
      el.phone_invalid_reason = "Exception: " + error.message;
    }
  });

  return result.filter((el) => el.phone_validation === false);
};

const messageSender = async (req) => {
  try {
    const {
      phoneList,
      useContactBook,
      useGuestList,
      useLanguage,
      useAudience,
      template,
      payload,
      senderLimit,
      eventId,
    } = req.body;

    // Helper function to safely send message and swallow errors

    const safeSendMessage = async (el, eventId) => {
      try {
        const phoneNumber = parsePhoneNumberFromString(el.phone);

        if (!phoneNumber || !phoneNumber.isValid()) {
          console.error(`${Date.now()} - Error sending message to ${el.phone}:`, error);
          dbService.create("error_log", {
            error: error.toString(),
            origin_function: "sendMessageToPhone",
          });
          return null;
        }

        if (process.env.ENVIRONMENT === "PRODUCTION") {
            return await sendMessageToPhone(
                el.phone,
                template,
                payload,
                el,
                eventId
            );
        }
      } catch (err) {
        console.error(`${Date.now()} - Error sending message to ${el.phone}:`, err);
        dbService.create("error_log", {
          error: `Error sending message to ${el.phone} - ${err.toString()}`,
          origin_function: "sendMessageToPhone",
        });

        return null;
      }
    };

    if (useGuestList) {

      const query = `SELECT * FROM contact_book WHERE id IN(
             SELECT contact_book_id FROM event_guest_list WHERE event_id = ? and language = ? )`;
      const stmt = db.prepare(query);
      const result = stmt.all([Number(eventId), template.language.slice(0, 2)]);

        await Promise.all(
            result.map(async (x) => {
                x.qr_code_url = await generateQR_WhatsApp(Number(x.id), Number(eventId));
            })
        );

        
        await Promise.all(result.map((x) => safeSendMessage(x, eventId)));
    }

    if (useContactBook) {
      const conditions = {};
      conditions.senderLimit = senderLimit;
      if (useLanguage) {
        conditions.language = template.language;
      }

      const contactBook = contactBookData(conditions, useAudience, eventId, template.sid);

      let batchSize = 10; // safe batch size below max throughput
      let delayMs = 1 * 60 * 1000; // 1 minute
      if (useAudience === "Wüstenkinder") {
        batchSize = 25;
        delayMs = 15 * 60 * 1000; // 15 minutes
      }

      const batches = chunkArray(contactBook, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        console.log(`${Date.now()} - Sending batch ${i + 1} of ${batches.length}...`);
        await Promise.all(batch.map((x) => safeSendMessage(x, eventId)));
        console.log(`${Date.now()} - Batch ${i + 1} sent.`);

        // Delay before sending next batch except after last batch
        if (i < batches.length - 1) {
          console.log(
            `${Date.now()} - Waiting ${delayMs / 60000} minutes before next batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } else {

        const templateType = Object.keys(template?.types)?.[0];
        const enrichedPhoneList = await enrichPhoneListWithContactData(phoneList, db);
        
        if (templateType && templateType === 'twilio/media') {
            await Promise.all(
                enrichedPhoneList.map(async (x) => {
                    x.qr_code_url = await generateQR_WhatsApp(Number(x.contactId), Number(eventId));
                })
            );
        }

        await Promise.all(enrichedPhoneList.map((x) => safeSendMessage(x, eventId)));
    }

    return { status: true };
  } catch (error) {
    console.error(`${Date.now()} - WhatsApp sender error:`, error); 
    // You can decide whether to return false or not here.
  }
};

async function sendMessageToPhone(
  phone,
  template,
  payload,
  contactPayload = null,
  eventId
) {
  try {
    // Determine template type key (e.g., "twilio/text", "twilio/media", etc.)
    const templateType = Object.keys(template.types)[0];
    const data = template.types[templateType];

    // Base message options
    const messageOptions = {
      from: "whatsapp:+971521160991",
      to: `whatsapp:${phone}`,
      contentSid: template.sid,
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,
    };

    if (payload !== null && Object.keys(payload).length > 0) {
      const contentVariables = {};
      const valid_requested_variables = [
        "id",
        "title",
        "first_name",
        "last_name",
        "gender",
        "phone",
        "type",
        "club_partner_name",
        "blacklist",
        "qr_code_url",
      ];

      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) {
          if (contactPayload) {
            const contactBook_requested_variables = payload[key];

            const splitted = contactBook_requested_variables.split(" ");

            let stringBuilder = "";
            splitted.forEach((item) => {
              if (!valid_requested_variables.includes(item)) return;

              switch (contactPayload.language) {
                case "de":
                  switch (contactPayload[item]) {
                    case "male":
                      stringBuilder += `Herr`;
                      return;
                    case "female":
                      stringBuilder += `Frau`;
                      return;
                  }
                  break;
                case "en":
                  switch (contactPayload[item]) {
                    case "male":
                      stringBuilder += `Mr.`;
                      return;
                    case "female":
                      stringBuilder += `Ms.`;
                      return;
                  }
                  break;
              }

              stringBuilder += `${contactPayload[item]}`;
            });

            if (stringBuilder === "") {
                contentVariables[key] = payload[key];
            } else {
               // If the ContactPayload doesn't have the value of the Template we simple make it empty 
              contentVariables[key] = stringBuilder.trimEnd() === 'null' ? '' : stringBuilder.trimEnd();;
            }
          } else {
            contentVariables[key] = payload[key];
          }
        }
      });

      if (Object.keys(contentVariables).length > 0) {
        messageOptions.contentVariables = JSON.stringify(contentVariables);
      }
    }

    switch (templateType) {
      case "whatsapp/authentication":
        break;
      case "twilio/text":
        break;
      case "twilio/call-to-action":
        messageOptions.interactive = buildInteractiveMessage(
          templateType,
          data
        );
        break;
      case "twilio/media":
        // this for default
        // messageOptions.body = data.body || "";
        // if (Array.isArray(data.media)) {
        //   messageOptions.mediaUrls = data.body;
        // } else if (typeof data.media === "string") {
        //   messageOptions.mediaUrl = data.media;
        // }
        
        break;
      case "twilio/list-picker":
        break;
      case "twilio/quick-reply":
        break;
      case "twilio/card":
        messageOptions.interactive = buildInteractiveMessage(
          templateType,
          data
        );
        break;
      default:
        throw new Error(`Unsupported template type: ${templateType}`);
    }

    const result = await twilioClient.messages.create(messageOptions);
    
    await Promise.resolve(
      db
        .prepare(
          `INSERT INTO twilio_template_message (messageSid, contentSid, event_id) VALUES (?, ?, ?)`
        )
        .run(result.sid, messageOptions.contentSid, Number(eventId))
    );

    return result;
  } catch (error) {
    console.error(`${Date.now()} - Failed to send message to ${phone}:`, error);
    // swallow error so caller can continue
    return null;
  }
}

// Helper function to build interactive object for WhatsApp interactive messages
function buildInteractiveMessage(type, data) {
  switch (type) {
    case "twilio/list-picker":
      return {
        type: "list",
        body: {
          text: data.body
            .replace("{{order_number}}", "12345")
            .replace("{{date}}", "Jan 10"),
        },
        action: {
          button: data.button || "Select an option",
          sections: [
            {
              title: "Options",
              rows: data.items.map((item) => ({
                id: item.id,
                title: item.item,
                description: item.description || "",
              })),
            },
          ],
        },
      };

    case "twilio/quick-reply":
      return {
        type: "button",
        body: { text: data.body },
        action: {
          buttons: data.actions.map((action) => ({
            type: "reply",
            reply: {
              id: action.id,
              title: action.title,
            },
          })),
        },
      };

    case "twilio/call-to-action": {
      // WhatsApp supports call-to-action via a single URL button (cta_url).
      // Phone-number actions aren't supported by WhatsApp interactive messages,
      // so we surface the first URL action as the CTA button.
      const ctaAction = (data.actions || []).find(
        (action) => (action.type || "").toUpperCase() === "URL"
      );

      return {
        type: "cta_url",
        body: { text: data.body || "" },
        action: {
          name: "cta_url",
          parameters: {
            display_text: ctaAction?.title || "Open",
            url: ctaAction?.url || "",
          },
        },
      };
    }

    case "twilio/card":
      // WhatsApp doesn't directly support cards but you can send a media message with buttons
      // Twilio WhatsApp supports "buttons" with media, so you can construct accordingly
      // Example here:
      return {
        type: "button",
        body: {
          text: data.title + (data.subtitle ? "\n" + data.subtitle : ""),
        },
        header:
          data.media && data.media.length > 0
            ? { type: "image", image: { link: data.media[0] } }
            : undefined,
        action: {
          buttons: (data.actions || []).map((action, idx) => ({
            type: "reply",
            reply: {
              id: action.id || `btn_${idx}`,
              title: action.title || "Button",
            },
          })),
        },
      };

    default:
      throw new Error(`Interactive message type not supported: ${type}`);
  }
}

// Template list cache (spec 017 User Story 5, research R11).
// The cached array is shared by every caller: read it, never mutate it.
const TEMPLATE_LIST_KEY = "all";
let templateListInFlight = null; // { generation, forced, promise }
// Bumped on every reset. A fetch started before a reset (e.g. a delete) must
// neither repopulate the cache nor be reused by a later caller.
let templateListGeneration = 0;
// Start order of fetches; an older fetch finishing late must not overwrite a newer result.
let templateListSeq = 0;
let templateListStoredSeq = 0;

/** Drop the cached template list; the next fetchContentTemplates() asks Twilio. */
const resetTemplateListCache = () => {
  templateListGeneration++;
  templateListCache.delete(TEMPLATE_LIST_KEY);
};

/**
 * The Twilio content template list, from cache when possible.
 * Concurrent callers share one Twilio request. Failures are not cached.
 *
 * @param {{ force?: boolean }} [options] force: drop the cache and fetch fresh (admin Refresh)
 * @returns {Promise<{status: boolean, result: any}>}
 */
const fetchContentTemplates = async ({ force = false } = {}) => {
  if (force) {
    // Not a reset: the list didn't change on our side, the admin just wants it
    // fresh. Skip the cache, and only share a fetch that a refresh started too,
    // so the grid's two parallel Refresh requests make one Twilio call.
    templateListCache.delete(TEMPLATE_LIST_KEY);
  } else {
    const cached = templateListCache.get(TEMPLATE_LIST_KEY);
    if (cached) return { status: true, result: cached };
  }

  const generation = templateListGeneration;
  const inFlight = templateListInFlight;
  if (inFlight && inFlight.generation === generation && (!force || inFlight.forced)) {
    return inFlight.promise;
  }

  const entry = { generation, forced: force, promise: null };
  const seq = ++templateListSeq;
  entry.promise = (async () => {
    try {
      const templates = await twilioClient.content.v1.contents.list();
      if (generation === templateListGeneration && seq > templateListStoredSeq) {
        templateListStoredSeq = seq;
        templateListCache.set(TEMPLATE_LIST_KEY, templates);
      }
      return { status: true, result: templates };
    } catch (error) {
      console.error(`${Date.now()} - WhatsApp sender error:`, error);
      return { status: false, result: error };
    } finally {
      if (templateListInFlight === entry) templateListInFlight = null;
    }
  })();
  templateListInFlight = entry;

  return entry.promise;
};

/**
 * Deletes a content template from the Twilio content library.
 *
 * Transport-agnostic on purpose: it takes a SID and returns the same
 * { status, result } shape as fetchContentTemplates, so routes own req/res.
 *
 * It performs NO authorisation and NO usage checking. The caller is
 * responsible for both — see the delete route in routes/whatsapp_sender.js,
 * which is the authoritative gate.
 *
 * Never throws; failures come back as { status: false, result: error } so the
 * caller can map them onto a status code.
 *
 * @param {string} contentSid
 * @returns {Promise<{status: boolean, result: unknown}>}
 */
const deleteContentTemplate = async (contentSid) => {
  try {
    await twilioClient.content.v1.contents(contentSid).remove();
    resetTemplateListCache();

    return { status: true, result: true };
  } catch (error) {
    console.error(`${Date.now()} - Twilio template delete error:`, error);

    return { status: false, result: error };
  }
};

async function getMessageBody(messageSid) {
  try {
    const message = await twilioClient.messages(messageSid).fetch();
    console.log(`${Date.now()} - Message Body:`, message.body);
    return message.body;
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch message:`, error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Chat history — keyset pagination over two sources (spec 017)
//
// Sent messages come from twilio_delivery ⨝ twilio_template_message (body is
// fetched from Twilio), received ones from twilio_responses. Each source is
// paged by (ts, id) DESC; the cursor remembers the last row consumed from
// EACH source, so ties on the same second are never skipped or repeated.
// ---------------------------------------------------------------------------

const HISTORY_PAGE_SIZE = 20;
const HISTORY_MAX_PAGE_SIZE = 1000;

class InvalidCursorError extends Error {
  constructor(message = "Invalid cursor") {
    super(message);
    this.name = "InvalidCursorError";
  }
}

const CURSOR_SOURCES = ["r", "s"];

/** @param {{r?: {ts: string, id: number}, s?: {ts: string, id: number}}} obj */
function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

/** Throws InvalidCursorError on anything that isn't a cursor we produced. */
function decodeCursor(str) {
  if (str === undefined || str === null || str === "") return {};
  if (typeof str !== "string") throw new InvalidCursorError();

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(str, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCursorError();
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InvalidCursorError();
  }

  const cursor = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!CURSOR_SOURCES.includes(key)) throw new InvalidCursorError();
    if (
      !value ||
      typeof value.ts !== "string" ||
      !Number.isInteger(value.id)
    ) {
      throw new InvalidCursorError();
    }
    cursor[key] = { ts: value.ts, id: value.id };
  }
  return cursor;
}

// Newest first: ts DESC, then source, then id DESC — a total order, so the
// merge is deterministic even when sent and received share a timestamp.
const newestFirst = (a, b) => {
  if (a.ts !== b.ts) return a.ts < b.ts ? 1 : -1;
  if (a.source !== b.source) return a.source < b.source ? 1 : -1;
  return b.id - a.id;
};

/**
 * Merge the two newest-first source lists and take one page.
 * Each list must hold up to `limit + 1` rows so `hasMore` is exact.
 * Rows need { source: 'r'|'s', ts, id }.
 *
 * @returns {{ taken: object[], hasMore: boolean, lastBySource: {r?: object, s?: object} }}
 */
function mergePage(sentRows, receivedRows, limit) {
  const merged = [...sentRows, ...receivedRows].sort(newestFirst);
  const taken = merged.slice(0, limit);

  // Rows taken from each source are a prefix of that source's list, so the
  // last one of each is the next cursor for that source.
  const lastBySource = {};
  for (const row of taken) lastBySource[row.source] = row;

  return { taken, hasMore: merged.length > limit, lastBySource };
}

// Prepare once at module load, not on every call.
// db must already be opened when this module loads, and the generated columns
// + indexes from sql_versions/20261106165300_add_twilio_generated_columns.sql and
// ..._add_twilio_message_history_indexes.sql must exist, or these prepares throw.
const SENT_SELECT = `
  SELECT
    td.id                 AS id,
    td.metadata_createdAt AS ts,
    ttm.messageSid
  FROM twilio_delivery td
  INNER JOIN twilio_template_message ttm
    ON td.msg_sid = ttm.messageSid
  WHERE td.to_number = ?
    AND td.msg_status = 'delivered'
    AND ttm.contentSid IS NOT NULL`;
const SENT_ORDER = `
  ORDER BY td.metadata_createdAt DESC, td.id DESC
  LIMIT ?`;

const sentFirstStmt = db.prepare(SENT_SELECT + SENT_ORDER);
const sentAfterStmt = db.prepare(
  SENT_SELECT + `
    AND (td.metadata_createdAt, td.id) < (?, ?)` + SENT_ORDER
);

// payload ->> 'WaId' must match idx_tr_waid / idx_tr_waid_received exactly.
const RECEIVED_SELECT = `
  SELECT
    tr.id          AS id,
    tr.received_at AS ts,
    tr.body,
    tr.media_url,
    tr.media_type
  FROM twilio_responses tr
  WHERE tr.payload ->> 'WaId' = ?`;
const RECEIVED_ORDER = `
  ORDER BY tr.received_at DESC, tr.id DESC
  LIMIT ?`;

const receivedFirstStmt = db.prepare(RECEIVED_SELECT + RECEIVED_ORDER);
const receivedAfterStmt = db.prepare(
  RECEIVED_SELECT + `
    AND (tr.received_at, tr.id) < (?, ?)` + RECEIVED_ORDER
);

const clampLimit = (limit) => {
  const n = Number.isInteger(limit) ? limit : HISTORY_PAGE_SIZE;
  return Math.min(Math.max(n, 1), HISTORY_MAX_PAGE_SIZE);
};

/**
 * One page of the chat history for a WhatsApp number, newest page first.
 *
 * Caching (spec 017 User Story 4, research R9/R10):
 *  - twilioMessageCache (in fetchTwilioMessagesDetails): a sent message's body
 *    and time never change, so each messageSid goes to Twilio at most once.
 *  - historyPageCache (here): older pages, i.e. requests with a cursor, are
 *    cached whole. That is only correct because nextCursor pins BOTH sources
 *    (see below): rows are inserted with datetime('now'), so nothing new can
 *    ever fall inside a pinned cursor's range. Only full cursors are cached,
 *    never one missing a source.
 *  - The first page (no cursor) is never page-cached, because every new
 *    message changes it. It still benefits from twilioMessageCache.
 *  - A page with a failed Twilio lookup is not cached, so the dropped bubble
 *    comes back on a later request.
 *
 * @param {string|number} phone  WaId (digits only)
 * @param {{ limit?: number, cursor?: string }} [options]
 * @returns {Promise<{ messages: object[], hasMore: boolean, nextCursor: string|null }>}
 *          messages are oldest → newest within the page.
 * @throws {InvalidCursorError} when `cursor` is not one we produced.
 */
async function fetchHistory(phone, { limit, cursor } = {}) {
  const pageSize = clampLimit(limit);
  const after = decodeCursor(cursor); // throws InvalidCursorError — let the route map it to 400

  try {
    const phoneStr = String(phone); // JSON values are TEXT; a number won't match

    const pageCacheKey =
      after.r && after.s ? `${phoneStr}|${pageSize}|${cursor}` : null;
    if (pageCacheKey) {
      const hit = historyPageCache.get(pageCacheKey);
      if (hit) return structuredClone(hit);
    }

    const toNumber = `whatsapp:+${phoneStr}`;
    const probe = pageSize + 1;

    const sentRows = (
      after.s
        ? sentAfterStmt.all(toNumber, after.s.ts, after.s.id, probe)
        : sentFirstStmt.all(toNumber, probe)
    ).map((row) => ({ ...row, source: "s" }));

    const receivedRows = (
      after.r
        ? receivedAfterStmt.all(phoneStr, after.r.ts, after.r.id, probe)
        : receivedFirstStmt.all(phoneStr, probe)
    ).map((row) => ({ ...row, source: "r" }));

    const { taken, hasMore, lastBySource } = mergePage(
      sentRows,
      receivedRows,
      pageSize
    );

    // Twilio is only asked for the sent messages on THIS page.
    const takenSent = taken.filter((row) => row.source === "s");
    const details = takenSent.length
      ? await fetchTwilioMessagesDetails(takenSent)
      : [];
    const twilioBySid = new Map(
      details
        .filter((item) => item.twilioMessage)
        .map((item) => [item.localRecord.messageSid, item.twilioMessage])
    );

    let allSentResolved = true;
    const page = [];
    for (const row of taken) {
      if (row.source === "r") {
        page.push({
          id: `r:${row.id}`,
          body: row.body,
          media_url: row.media_url,
          media_type: row.media_type,
          received_at: toUAE(row.ts), // SQLite UTC bare string → UAE
          type: "r",
        });
        continue;
      }

      // A failed Twilio lookup drops the bubble (as before) but the row still
      // counts as consumed, so paging moves past it.
      const twilioMessage = twilioBySid.get(row.messageSid);
      if (!twilioMessage) {
        allSentResolved = false;
        continue;
      }

      page.push({
        id: `s:${row.messageSid}`,
        body: twilioMessage.body,
        received_at: toUAE(twilioMessage.dateSent || row.ts), // Twilio ISO → UAE
        type: "s",
      });
    }

    // Display order: oldest → newest by the time shown in the bubble.
    // Array.prototype.sort is stable, and `page` is newest-first, so reverse first.
    page.reverse().sort((a, b) => a.received_at.valueOf() - b.received_at.valueOf());

    // The next cursor pins BOTH sources (research R10), so an older page can't
    // change when new messages arrive, which is what makes it cacheable.
    let nextCursor = null;
    if (hasMore) {
      const rowsBySource = { s: sentRows, r: receivedRows };
      const next = {};
      for (const source of CURSOR_SOURCES) {
        const last = lastBySource[source];
        const rows = rowsBySource[source];
        if (last) {
          // Consumed up to here.
          next[source] = { ts: last.ts, id: last.id };
        } else if (rows.length) {
          // Nothing taken yet: bound at the newest row seen. ids are integers,
          // so (ts, id) < (ts, id + 1) means "at or below that row", and a row
          // inserted later (newer ts, or same second with a higher id) is excluded.
          next[source] = { ts: rows[0].ts, id: rows[0].id + 1 };
        } else if (after[source]) {
          next[source] = after[source];
        } else {
          // Source is empty for this contact: (ts, id) < ("", 0) matches nothing.
          next[source] = { ts: "", id: 0 };
        }
      }
      nextCursor = encodeCursor(next);
    }

    const result = {
      messages: page.map((msg) => ({
        ...msg,
        received_at: msg.received_at.format("YYYY-MM-DD HH:mm:ss"),
      })),
      hasMore,
      nextCursor,
    };

    if (pageCacheKey && allSentResolved) {
      historyPageCache.set(pageCacheKey, structuredClone(result));
    }

    return result;
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch history:`, error);
    throw error;
  }
}


function fetchEvent(OriginalRepliedMessageSid) {
  return new Promise((resolve, reject) => {
    try {
      
      const query = `SELECT event_id FROM twilio_template_message WHERE messageSid = ?`

      const row = db.prepare(query).get(OriginalRepliedMessageSid);

      resolve(Number(row.event_id ));

    } catch (error) {
      console.error(`${Date.now()} - Failed to fetch event:`, error);
      reject(error);
    }
  });
}

/**
 * Body and send time of each sent message, from twilioMessageCache when
 * possible, otherwise from Twilio. A sent message never changes, so successful
 * lookups are cached for good. Failures are never cached, so they are retried.
 *
 * @returns {Promise<Array<{ localRecord: object, twilioMessage: {body: string, dateSent: Date|null}|null, error?: unknown }>>}
 */
async function fetchTwilioMessagesDetails(sentMessages) {
  const fetchPromises = sentMessages.map(async (msg) => {
    const cached = twilioMessageCache.get(msg.messageSid);
    if (cached) {
      return { localRecord: msg, twilioMessage: cached };
    }

    try {
      const full = await twilioClient.messages(msg.messageSid).fetch();
      // Keep only what the history needs; the full Twilio object is large.
      const twilioMessage = { body: full.body, dateSent: full.dateSent };
      twilioMessageCache.set(msg.messageSid, twilioMessage);
      return {
        localRecord: msg,
        twilioMessage,
      };
    } catch (error) {
      console.error(
        `${Date.now()} - Failed to fetch Twilio message for SID ${msg.messageSid}:`,
        error
      );
      return {
        localRecord: msg,
        twilioMessage: null,
        error,
      };
    }
  });

  // Wait for all to resolve
  const results = await Promise.all(fetchPromises);

  return results;
}

async function handleAutoResponse(From, ButtonPayload, OriginalRepliedMessageSid) {
  try {
    const from = From.replace("whatsapp:", "");    

    // console.log(`${Date.now()} - handleAutoResponse - From - ${From}`);
    // console.log(`${Date.now()} - handleAutoResponse - ButtonPayload - ${ButtonPayload}`);
    // console.log(`${Date.now()} - handleAutoResponse - OriginalRepliedMessageSid - ${OriginalRepliedMessageSid}`);
    // console.log(`${Date.now()} - handleAutoResponse - from - ${from}`);
    
    const contact = db
    .prepare(`SELECT * FROM contact_book WHERE phone = ?`)
    .get(from);
        
    if (!contact){
        console.error('fetchEvent failed:', 'could not find the contact');
        return;
    } 
        
    const [templatesResult, eventResult] = await Promise.allSettled([
        fetchContentTemplates(),
        fetchEvent(OriginalRepliedMessageSid)
    ]);

    const templates = templatesResult.status === 'fulfilled' ? templatesResult.value : null;
    const event_id = eventResult.status === 'fulfilled' ? eventResult.value : null;

    if (templatesResult.status === 'rejected') {
        console.error('fetchContentTemplates failed:', templatesResult.reason);
    }
    
    if (eventResult.status === 'rejected') {
        console.error('fetchEvent failed:', eventResult.reason);
    }

    if (event_id === 0) {
      console.error(`${Date.now()} - handleAutoResponse: event_id not found`);
      return;
    }

    const simpleResponseTemplate = templates.result.find((x) => x.sid === "HX2535ccf3fbdd0d9dae5423f6e815123c");

    if (!simpleResponseTemplate) {
      console.error(`${Date.now()} - handleAutoResponse: auto-response template HX2535ccf3fbdd0d9dae5423f6e815123c not found`);
      return;
    }
    
    const event = db
        .prepare(`SELECT * FROM events WHERE id = ?`)
        .get(event_id);

    const guestTypes = ["expert_guest", "only_guest", "Wüstenkinder"];

    const type = guestTypes.includes(contact.type) ? "guest" : "general";  
    
    if (ButtonPayload === "ATTEND") {
      
      const payload = { 1: event[`auto_response_${type}_${contact.language}`] };

       await sendMessageToPhone(
                contact.phone,
                simpleResponseTemplate,
                payload,
                null,
                Number(event.id)
            );

      dbService.create("event_guest_list", {
        contact_book_id: Number(contact.id),
        event_id: Number(event.id),
      });
    }

    if (ButtonPayload === "NOT_ATTEND") {
          
        const checkGuestListQuery = `SELECT 1 FROM event_guest_list WHERE contact_book_id = ? AND event_id = ?`
        const stmt = db.prepare(checkGuestListQuery);
        const onGuestList = stmt.get(Number(contact.id),Number(event.id));

        const replyMessageTemplate = contact.language === "de"  
        ? templates.result.find((x) => x.sid === "HXa7da14800646269872ca57d98ead6770")
        : templates.result.find((x) => x.sid === "HX8597c391e879a7eaa30af7e6a21e1d63");
        
        if(isObject(onGuestList)){
            await sendMessageToPhone(
                  contact.phone,
                  replyMessageTemplate,
                  {},
                  null,
                  Number(event.id)
              );
  
            return;
        }

          const replyMessage = contact.language === "de" 
          ? "Danke für deine Nachricht. Schade, dass es nicht klappt. Dann freue ich mich, dich beim nächsten Mal zu sehen." 
          : "Thank you for your reply. Sad to hear that, but let's meet next time.";

          const payload = { 1: replyMessage };

          await sendMessageToPhone(
                  contact.phone,
                  simpleResponseTemplate,
                  payload,
                  null,
                  Number(event.id)
              );
    }

    if (ButtonPayload === "UNSUBSCRIBE") {
        const replyMessage = contact.language === "de" 
        ? "Sie werden keine Nachrichten mehr von uns erhalten."
        : "You will no longer receive messages from us."; 
         
          const payload = { 1: replyMessage };

           await sendMessageToPhone(
                contact.phone,
                simpleResponseTemplate,
                payload,
                null,
                Number(event.id)
            );


        const insert = db.prepare(`INSERT INTO unsubscribe_contacts (phone) VALUES (?)`);
        insert.run(from);
    }

    if (ButtonPayload === "CONFIRM") {

        const deleteGuestListQuery = `DELETE FROM event_guest_list WHERE contact_book_id = ? AND event_id = ?`;
        const stmt = db.prepare(deleteGuestListQuery);          
        stmt.run(Number(contact.id),Number(event.id));

        const replyMessage = contact.language === "de"
            ? "Du wurdest von der Gästeliste entfernt."
            : "You've been removed from the guest list.";

        const payload = { 1: replyMessage };
             await sendMessageToPhone(
                contact.phone,
                simpleResponseTemplate,
                payload,
                null,
                Number(event.id)
            );
    }

  } catch (e) {
    console.error(`${Date.now()} -`, e);
  }
}

module.exports = {
  fetchHistory,
  HISTORY_PAGE_SIZE,
  HISTORY_MAX_PAGE_SIZE,
  InvalidCursorError,
  encodeCursor,
  decodeCursor,
  mergePage,
  otpSender,
  messageSender,
  fetchContentTemplates,
  resetTemplateListCache,
  deleteContentTemplate,
  handleAutoResponse,
  corruptedContactBookData,
};
