require('dotenv').config();
const jwt = require("jsonwebtoken");

function authorize_admin(req, res, next) {
    try {
        const token = req?.cookies["a-usr"];
        if (!token) {
            return res.status(401).json({ authenticated: false, message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === "admin") {
            req.user = decoded;
            return next();
        }

        return res.status(403).json({ authenticated: false, message: "Forbidden" });

    } catch (err) {
        return res.status(401).json({ authenticated: false, message: "Invalid token" });
    } 
}

module.exports = authorize_admin;