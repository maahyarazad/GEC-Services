require("dotenv").config();
const jwt = require("jsonwebtoken");

const authorization_middleware = {
  authorize_admin: (req, res, next) => {
    try {
      const token = req?.cookies["a-usr"];
      const externalToken = req.headers["x-access-token"];

      if (!token && !externalToken) {
        return res
          .status(401)
          .json({ authenticated: false, message: "Unauthorized" });
      }

      let externalUser = undefined;
      let internalUser = undefined;

      if (externalToken) {
        try {
          externalUser = jwt.verify(
            externalToken,
            process.env.EXTERNAL_ACCESS_SECRET
          );
        } catch (err) {
          console.error(`${Date.now()} -`, err);
        }
      }

      if (token) internalUser = jwt.verify(token, process.env.JWT_SECRET);

      if (!token && !externalToken) {
        return res
          .status(403)
          .json({ authenticated: false, message: "Forbidden" });
      }

      if (externalUser) req.user = externalUser;
      if (internalUser?.role === "admin") req.user = internalUser;

      return next();
    } catch (err) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }
  },

  // Full-tier gate for the admin panel. Runs authorize_admin's verification
  // first, then requires the session be full-tier. Used both on specific
  // full-only routes and as the /api/ chokepoint in server.js (which exempts
  // Place ID Finder's maps endpoints). See specs/008-sso-role-access/.
  authorize_admin_full: (req, res, next) => {
    authorization_middleware.authorize_admin(req, res, () => {
      const user = req.user;

      // Validated external service tokens (x-access-token) are trusted as full.
      const viaExternal = Boolean(req.headers["x-access-token"]) && Boolean(user);

      // A full SSO/password session, or a legacy admin token minted before the
      // accessLevel claim existed (treated as full for backward compatibility).
      const isFull =
        Boolean(user) &&
        (user.accessLevel === "full" ||
          (user.role === "admin" && user.accessLevel === undefined));

      if (isFull || viaExternal) return next();

      return res
        .status(403)
        .json({ authenticated: true, message: "Forbidden: full admin required" });
    });
  },

  authorize_member: (req, res, next) => {
    try {
      const token = req?.cookies["member-usr"];
      if (!token) {
        return res
          .status(401)
          .json({ authenticated: false, message: "Unauthorized" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded) {
        return next();
      }

      return res
        .status(403)
        .json({ authenticated: false, message: "Forbidden" });
    } catch (err) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }
  },

  authorize_partner: (req, res, next) => {
    try {
      const token = req?.cookies["partner-usr"];
      if (!token) {
        return res
          .status(401)
          .json({ authenticated: false, message: "Unauthorized" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded) {
        return next();
      }

      return res
        .status(403)
        .json({ authenticated: false, message: "Forbidden" });
    } catch (err) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }
  },

  authorize_member_or_partner: (req, res, next) => {
    const memberToken = req?.cookies["member-usr"];
    const partnerToken = req?.cookies["partner-usr"];

    if (!memberToken && !partnerToken) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Unauthorized" });
    }

    // Try member token first
    if (memberToken) {
      try {
        const decoded = jwt.verify(memberToken, process.env.JWT_SECRET);
        req.user = decoded;
        req.userType = "member";
        return next();
      } catch (err) {
        // invalid member token — fall through and try partner
      }
    }

    // Then try partner token
    if (partnerToken) {
      try {
        const decoded = jwt.verify(partnerToken, process.env.JWT_SECRET);
        req.user = decoded;
        req.userType = "partner";
        return next();
      } catch (err) {
        // invalid partner token — fall through
      }
    }

    return res
      .status(401)
      .json({ authenticated: false, message: "Invalid token" });
  },


  authorize_ticket: (req, res, next) => {
    try {
      const token = req?.cookies["ticket-token"];
      if (!token) {
        return res
          .status(401)
          .json({ authenticated: false, message: "Unauthorized" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded) {
        return next();
      }

      return res
        .status(403)
        .json({ authenticated: false, message: "Forbidden" });
    } catch (err) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }
  },

  authorize_operator: (req, res, next) => {
    try {
      const token = req?.cookies["o-usr"];
      if (!token) {
        return res
          .status(401)
          .json({ authenticated: false, message: "Unauthorized" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded?.role === "operator") {
        req.user = decoded;
        return next();
      }

      return res
        .status(403)
        .json({ authenticated: false, message: "Forbidden" });
    } catch (err) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }
  },

};

module.exports = authorization_middleware;
