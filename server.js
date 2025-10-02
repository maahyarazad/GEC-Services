require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = process.env.PORT || 5500;
const session = require('express-session');
const otp = require('./routes/otp.js');
const registration_config = require('./routes/registration_config.js');
const registration = require('./routes/registration.js');
const member = require('./routes/member.js');
const registration_keys = require('./routes/registration_keys.js');
const maps = require('./routes/maps.js');
const member_card = require('./routes/member_card.js');
const survey = require('./routes/survey.js');
const gic_user = require('./routes/gic_user.js');
const payment = require('./routes/payment.js');
const email_storage = require('./routes/email_storage.js');
const whatsapp_sender = require('./routes/whatsapp_sender.js');
const google_wallet = require('./routes/google_wallet.js');
const cookieParser = require("cookie-parser");
const authorize = require("./middleware/auth");
const { createWebSocketServer } = require("./websocket/admin.js");

// Setup DB connection
const db = new sqlite3.Database("./app.db", (err) => {
    if (err) {
        console.error("Failed to connect to database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});


// Read and apply SQL schema from app_tables.sql
(async () => {
    try {
        const sql = await fs.readFile("./create_tables.sql", "utf8");
        db.exec(sql, (err) => {
            if (err) {
                console.error("Failed to create tables:", err.message);
            } else {
                console.log("Tables created or already exist.");
            }
        });
    } catch (err) {
        console.error("Error reading SQL file:", err.message);
    }
})();

app.use(session({
    secret: process.env.SERVER_SESSION_SECRET,       // required
    resave: false,                   // don't save session if unmodified
    saveUninitialized: true,         // save new but empty sessions
    cookie: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        httpOnly: true,
        secure: false, // true only if you're using HTTPS
        sameSite: 'lax', // or 'none' if cross-site with credentials
    }
}));

// Create HTTP server
const server = require("http").createServer(app);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,    // e.g., http://localhost:5175
  process.env.CLIENT_ORIGIN_GIC, // e.g., http://localhost:5173
  process.env.CLIENT_ORIGIN_EVENTS // e.g., http://localhost:5173
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`Received request for: ${req.url}`);
    next();
});

app.use((req, res, next) => {
  console.log('Received request for: ${req.url}');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'file_storage')));
app.use('/apple_pass', express.static(path.join(__dirname, 'pass_storage')));
app.use('/maps', express.static(path.join(__dirname, 'maps')));
app.use('/', express.static(path.join(__dirname, 'public')));

app.use('/', otp);
app.use('/', registration_config);
app.use('/', registration);
app.use('/', survey);
app.use('/', gic_user);
app.use('/', member);
app.use('/', registration_keys);
app.use('/', maps);
app.use('/', payment);
app.use('/', member_card);
app.use('/', email_storage);
app.use('/api/', authorize);

// Route to serve your main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Attach websocket to same server
createWebSocketServer(server);

// Start the server
// app.listen(PORT, () => {
//     console.log(`Jack: I'm good on port ${PORT}`);
// });

server.listen(PORT, () => {
  console.log(`🚀 Server + WS listening on http://localhost:${PORT}`);
});