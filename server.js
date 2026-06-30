require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5500;
const session = require("express-session");

const cookieParser = require("cookie-parser");
const authorize = require("./middleware/auth");
const { serveWithOgTags } = require("./middleware/ogTags");
const { createWebSocketServer } = require("./websocket/admin.js");
const imapPoller = require("./services/imapPoller.js");
const registerRoutes = require("./routes.js");

// Services used by the scheduled jobs in the cron section below.
const GSheetService = require("./services/gSheetService.js");
const cron = require("node-cron");

// Setup DB connection
const betterSqlite3 = require("better-sqlite3");
const Jobs = require("./services/sqllite_jobs.js");
const MongoDbBackUpJob = require("./services/MongoDbBackUpJob.js");
const dbService = require("./services/dbService.js");

let db;

try {
  db = new betterSqlite3(path.resolve(__dirname, "app.db"));
  console.log(`${Date.now()} - Connected to SQLite database (better-sqlite3).`);
} catch (err) {
  console.error(`${Date.now()} - Failed to connect to database:`, err.message);
  process.exit(1);
}

// Read and apply SQL schema from create_tables.sql
(async () => {
  try {
    // const sql = await fs.readFile(
    //   path.resolve(__dirname, "create_tables.sql"),
    //   "utf8"
    // );
    // db.exec(sql);
    // console.log("Tables created or already exist.");
  } catch (err) {
    console.error(`${Date.now()} - Failed to create tables or read SQL file:`, err.message);
  }
})();

app.use(
  session({
    secret: process.env.SERVER_SESSION_SECRET, // required
    resave: false, // don't save session if unmodified
    saveUninitialized: true, // save new but empty sessions
    cookie: {
      maxAge: 5 * 60 * 1000, // 5 minutes
      httpOnly: true,
      secure: false, // true only if you're using HTTPS
      sameSite: "lax", // or 'none' if cross-site with credentials
    },
  })
);

// Create HTTP server
const server = require("http").createServer(app);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.MEDICAL_SOCIETY_CLIENT_ORIGIN,
  process.env.GIC_CLIENT_ORIGIN,
  process.env.CLIENT_ORIGIN_EVENTS,
  process.env.GEC__ORIGIN,
  process.env.BP_ORIGIN,
];

app.set("trust proxy", 1);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${Date.now()} - Received request for: ${req.url}`);
  next();
});

// Auth + static assets must be registered before the application routes.
app.use("/api/", authorize.authorize_admin);
app.use("/uploads", express.static(path.join(__dirname, "file_storage")));
app.use("/apple_pass", express.static(path.join(__dirname, "pass_storage")));
app.use("/qr_codes", express.static(path.join(__dirname, "qr_files")));
app.use("/maps", express.static(path.join(__dirname, "maps")));
app.use("/", express.static(path.join(__dirname, "public")));

// Mount all application routers (see routes.js).
registerRoutes(app);

app.get("*", serveWithOgTags);

// Attach websocket to same server
const io = createWebSocketServer(server, allowedOrigins);
imapPoller.start(io);

// https://crontab.guru/
// Maahyar CM: node cron expression is different than normal expression use this site to check
// cron.schedule("* */6 * * *", async () => {
//   try {
//     console.log(`${Date.now()} - [Cron | Every 6h] Starting: GSheet sync + phone normalization —`, new Date());
//     await GSheetService.GSheetParser();
//     await Jobs.normilizeMemberPhoneNumbers();
//     console.log(`${Date.now()} - [Cron | Every 6h] Completed —`, new Date());
//   } catch (error) {
//     console.error(`${Date.now()} - [Cron | Every 6h] Failed:`, error);
//     dbService.create("error_log", {
//       error: error.toString(),
//       origin_function: "cron_6h_gsheet_normalize",
//     });
//   }
// });

// cron.schedule("0 0 * * *", async () => {
//   try {
//     console.log(`${Date.now()} - [Cron | daily] Starting: MongoDB backup —`, new Date());
//     await MongoDbBackUpJob.run();
//     console.log(`${Date.now()} - [Cron | daily] Completed —`, new Date());
//   } catch (error) {
//     console.error(`${Date.now()} - [Cron | daily] Failed:`, error);
//     dbService.create("error_log", {
//       error: error.toString(),
//       origin_function: "cron_daily_mongo_backup",
//     });
//   }
// });

server.listen(PORT, () => {
  console.log(`${Date.now()} - 🚀 Server + WS listening on http://localhost:${PORT}`);
});
