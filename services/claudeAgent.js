require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a phone number normalization assistant. Your only job is to extract and return a single valid phone number from a raw input string.

Rules:
- Return digits only (no spaces, dashes, parentheses, or leading +)
- Prefer UAE numbers (starting with 971) when multiple numbers are present
- Strip labels like (new), (old), (new#) and separators like /, |, //, ;
- If the string contains two phone numbers (separated by any delimiter), return the first UAE number, or the first number if no UAE number exists
- If the raw value is a clearly corrupted string (e.g. two phone numbers concatenated with no separator and no way to determine the boundary), return null
- Return ONLY the digits of the phone number — no explanation, no punctuation, no extra text
- If no valid phone number can be confidently extracted, return exactly: null`;

async function normalizePhone(raw) {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 32,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: raw }],
    });

    const result = response.content[0]?.text?.trim();

    if (!result || result === "null") return null;

    // Sanitize: keep digits only, reject if not a plausible phone length (7–15 digits)
    const digits = result.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return null;

    return digits;
  } catch (err) {
    console.error(`${Date.now()} - [claudeAgent.normalizePhone] API error:`, err.message);
    return null;
  }
}

module.exports = { normalizePhone };
