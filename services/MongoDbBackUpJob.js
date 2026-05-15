const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const MongoDbBackUpJob = {
  run: () => {
    const uri       = process.env.MONGO_URI;
    const backupDir = process.env.MONGO_BACKUP_DIR || "./backups/mongo";

    if (!uri) throw new Error("[MongoDbBackUpJob] MONGO_URI is not defined in .env");

    const timestamp  = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outputPath = path.resolve(backupDir, timestamp);
    fs.mkdirSync(outputPath, { recursive: true });

    const cmd = `mongodump --uri="${uri}" --out="${outputPath}"`;

    console.log(`[MongoDbBackUpJob] Running backup → ${outputPath}`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`[MongoDbBackUpJob] Backup complete → ${outputPath}`);

    return outputPath;
  },
};

module.exports = MongoDbBackUpJob;
