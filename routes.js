// routes.js
// Central place to wire every Express router onto the app, keeping server.js
// focused on bootstrap (db, middleware, websocket, cron).
//
// Mount order and path prefixes are preserved exactly from the original server.js.

const otp = require("./routes/otp.js");
const account_deletion = require("./routes/account_deletion.js");
const registration_config = require("./routes/registration_config.js");
const registration = require("./routes/registration.js");
const survey = require("./routes/survey.js");
const gic_user = require("./routes/gic_user.js");
const member = require("./routes/member.js");
const partner_onboarding = require("./routes/partner_onboarding.js");
const registration_keys = require("./routes/registration_keys.js");
const maps = require("./routes/maps.js");
const payment = require("./routes/payment.js");
const member_card = require("./routes/member_card.js");
const email_storage = require("./routes/email_storage.js");
const email_sender = require("./routes/email_sender.js");
const g_sheet = require("./routes/gSheet.js");
const invoice = require("./routes/invoice.js");
const whatsapp = require("./routes/whatsapp_sender.js");
const health_check = require("./routes/health_check.js");
const server_logs = require("./routes/server_logs.js");
const contact_book = require("./routes/contact_book.js");
const clubtime_guest_logs = require("./routes/clubtime_guest_logs.js");
const external_route = require("./routes/external_route.js");
const events = require("./routes/events.js");
const gec_members = require("./routes/gec_members.js");
const gec_member_check = require("./routes/gec_member_check.js");
const support = require("./routes/support.js");
const gec_endpoints = require("./routes/gec_endpoints.js");

// Routers mounted at the app root ("/").
const rootRouters = [
  otp,
  account_deletion,
  registration_config,
  registration,
  survey,
  gic_user,
  member,
  partner_onboarding,
  registration_keys,
  maps,
  payment,
  member_card,
  email_storage,
  email_sender,
  g_sheet,
  invoice,
  whatsapp,
  health_check,
  server_logs,
  contact_book,
  clubtime_guest_logs,
  external_route,
  events,
  gec_member_check
];

function registerRoutes(app) {
  rootRouters.forEach((router) => app.use("/", router));

  // gec_members is the only router mounted under the /api/ prefix.
  app.use("/api/", gec_members);

  app.use("/", support);
  app.use("/", gec_endpoints);
}

module.exports = registerRoutes;
