require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const PORT = process.env.PORT || 5500;
const session = require("express-session");
const otp = require("./routes/otp.js");
const registration_config = require("./routes/registration_config.js");
const registration = require("./routes/registration.js");
const member = require("./routes/member.js");
const registration_keys = require("./routes/registration_keys.js");
const maps = require("./routes/maps.js");
const member_card = require("./routes/member_card.js");
const survey = require("./routes/survey.js");
const gic_user = require("./routes/gic_user.js");
const payment = require("./routes/payment.js");
const email_storage = require("./routes/email_storage.js");
const GSheetService = require("./services/gSheetService.js");
const g_sheet = require("./routes/gSheet.js");
const email_sender = require("./routes/email_sender.js");
const invoice = require("./routes/invoice.js");
const whatsapp = require("./routes/whatsapp_sender.js");
const contact_book = require("./routes/contact_book.js");
const health_check = require("./routes/health_check.js");
const cookieParser = require("cookie-parser");
const authorize = require("./middleware/auth");
const { createWebSocketServer } = require("./websocket/admin.js");
const cron = require("node-cron");
// Setup DB connection
const betterSqlite3 = require("better-sqlite3");

let db;

try {
  db = new betterSqlite3(path.resolve(__dirname, "app.db"));
  console.log("Connected to SQLite database (better-sqlite3).");
} catch (err) {
  console.error("Failed to connect to database:", err.message);
  process.exit(1);
}

// Read and apply SQL schema from create_tables.sql
(async () => {
  try {
    const sql = await fs.readFile(
      path.resolve(__dirname, "create_tables.sql"),
      "utf8"
    );
    db.exec(sql);
    console.log("Tables created or already exist.");
  } catch (err) {
    console.error("Failed to create tables or read SQL file:", err.message);
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`Received request for: ${req.url}`);
  next();
});

app.use("/api/", authorize.authorize_admin);
app.use("/uploads", express.static(path.join(__dirname, "file_storage")));
app.use("/apple_pass", express.static(path.join(__dirname, "pass_storage")));
app.use("/maps", express.static(path.join(__dirname, "maps")));
app.use("/", express.static(path.join(__dirname, "public")));

app.use("/", otp);
app.use("/", registration_config);
app.use("/", registration);
app.use("/", survey);
app.use("/", gic_user);
app.use("/", member);
app.use("/", registration_keys);
app.use("/", maps);
app.use("/", payment);
app.use("/", member_card);
app.use("/", email_storage);
app.use("/", email_sender);
app.use("/", g_sheet);
app.use("/", invoice);
app.use("/", whatsapp);
app.use("/", health_check);
app.use("/", contact_book);

// Route to serve your main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Attach websocket to same server
createWebSocketServer(server, allowedOrigins);

cron.schedule("0 */6 * * *", async () => {
  try {
    console.log("Running background job every 6 hours:", new Date());
    await GSheetService.GSheetParser();
    console.log("Background job finished at:", new Date());
  } catch (err) {
    console.error("Background job failed:", err);
  }
});

// Start the server
// app.listen(PORT, () => {
//     console.log(`Jack: I'm good on port ${PORT}`);
// });

server.listen(PORT, () => {
  console.log(`🚀 Server + WS listening on http://localhost:${PORT}`);
});
