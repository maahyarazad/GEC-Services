const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Matches the timestamped backup folder names this job creates,
// e.g. "2026-07-14T10-30-45". Used so pruning only ever touches our own backups.
const BACKUP_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;

const MongoDbBackUpJob = {
  run: async () => {
    const uri       = process.env.MONGO_URI;
    const backupDir = process.env.MONGO_BACKUP_DIR || "./backups/mongo";
    const retention = parseInt(process.env.MONGO_BACKUP_RETENTION || "7", 10);

    if (!uri) {
      throw new Error("[MongoDbBackUpJob] MONGO_URI is not defined in .env");
    }

    const logTime    = () => new Date().toISOString();
    const timestamp  = logTime().replace(/[:.]/g, "-").slice(0, 19);
    const outputPath = path.resolve(backupDir, timestamp);
    fs.mkdirSync(outputPath, { recursive: true });

    console.log(`${logTime()} - [MongoDbBackUpJob] Running backup → ${outputPath}`);

    try {
      // execFileSync runs mongodump directly, with no shell in between, so special
      // characters in the URI's password ($ & ` ; spaces …) are passed through
      // literally instead of being interpreted — no broken commands, no injection.
      execFileSync("mongodump", [`--uri=${uri}`, `--out=${outputPath}`], {
        stdio: "inherit",
      });
    } catch (err) {
      // Drop the empty/partial folder so failed runs don't accumulate.
      fs.rmSync(outputPath, { recursive: true, force: true });
      // Re-throw WITHOUT the original message, which would contain the full URI
      // (and therefore your credentials).
      throw new Error(
        `[MongoDbBackUpJob] mongodump failed (exit ${err.status ?? "unknown"}). ` +
        `Is mongodump installed and on PATH, and is the database reachable?`
      );
    }

    console.log(`${logTime()} - [MongoDbBackUpJob] Backup complete → ${outputPath}`);

    // Retention: keep the newest `retention` backups, delete the rest.
    // Set MONGO_BACKUP_RETENTION=0 (or remove this block) to keep everything.
    if (retention > 0) {
      const oldBackups = fs
        .readdirSync(backupDir)
        .filter((name) => BACKUP_NAME_PATTERN.test(name))
        .sort()            // timestamp names sort oldest → newest
        .reverse()         // now newest → oldest
        .slice(retention); // everything past the newest `retention`

      for (const name of oldBackups) {
        fs.rmSync(path.join(backupDir, name), { recursive: true, force: true });
        console.log(`${logTime()} - [MongoDbBackUpJob] Pruned old backup → ${name}`);
      }
    }

    return outputPath;
  },
};

module.exports = MongoDbBackUpJob;