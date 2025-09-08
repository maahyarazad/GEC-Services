require('dotenv').config();
const jwt = require("jsonwebtoken");

function authorize_admin(req, res, next) {
  try {
    const token = req?.cookies["a-usr"];
    if (!token) {
      return res.status(401).json({ authenticated: false, message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "admin") {
      // Token is valid and user is admin
      // attach decoded info
      req.user = decoded; 
      return next();
    } else {
      return res.status(403).json({ authenticated: false, message: "Forbidden" });
    }

  } catch (err) {
    return res.status(401).json({ authenticated: false, message: "Invalid token" });
  }
}

module.exports = authorize_admin;
