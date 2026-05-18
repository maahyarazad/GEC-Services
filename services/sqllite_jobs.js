const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dbService = require("./dbService");
const claudeAgent = require("./claudeAgent");

async function normalizePhoneLocal(raw) {
    try {
        if (!raw || typeof raw !== "string") return null;

        const cleaned = raw.trim();

        const segments = cleaned.split(/[\/\\,;|]+/).map((s) => s.trim()).filter(Boolean);
        const candidate = segments[segments.length - 1];

        let parsed = parsePhoneNumberFromString(candidate);

        if (!parsed?.isValid()) {
            parsed = parsePhoneNumberFromString(candidate, "AE");
        }

        if (parsed?.isValid()) {
            return parsed.number.replace(/^\+/, "");
        }

        return null;
    } catch (e) {
        console.error("Error in parsePhoneNumber:", e); 
        return null;
    }
}

const Jobs = {
    normilizeMemberPhoneNumbers: async () => {
        try {
            const db = dbService.getDB();

            const rows = db
                .prepare(
                    `SELECT id, mobile_number FROM member_card
                     WHERE mobile_number IS NOT NULL AND mobile_number != ''`
                )
                .all();

            const update = db.prepare(
                `UPDATE member_card SET mobile_number = ? WHERE id = ?`
            );

            let fixed = 0;
            let aiFixed = 0;
            let skipped = 0;
            const malformed = [];

            for (const row of rows) {
                let normalized = await normalizePhoneLocal(row.mobile_number);

                if (normalized === null) {
                    console.log(`[normilizeMemberPhoneNumbers] Sending to Claude Agent: id=${row.id} raw="${row.mobile_number}"`);
                    // normalized = await claudeAgent.normalizePhone(row.mobile_number);
                    

                    if (normalized !== null) {
                        aiFixed++;
                    }
                }

                if (normalized === null) {
                    malformed.push({ id: row.id, mobile_number: row.mobile_number });
                    skipped++;
                    continue;
                }

                if (normalized !== row.mobile_number) {
                    update.run([normalized, row.id]);
                    fixed++;
                }
            }

            console.log(
                `[normilizeMemberPhoneNumbers] fixed=${fixed} (ai=${aiFixed}) skipped=${skipped} total=${rows.length}`
            );

            if (malformed.length > 0) {
                console.warn("[normilizeMemberPhoneNumbers] Could not parse — manual review required:");
                malformed.forEach(({ id, mobile_number }) =>
                    console.warn(`  id=${id}  raw="${mobile_number}"`)
                );
            }
        } catch (error) {
            console.error("Error normalizing mobile numbers:", error);
        }
    },
};

module.exports = Jobs;