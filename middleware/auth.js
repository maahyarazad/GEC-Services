require("dotenv").config();
const jwt = require("jsonwebtoken");

const authorization_middleware = {
  authorize_admin: (req, res, next) => {
    try {
      const token = req?.cookies["a-usr"];
      const externalToken = req?.cookies["token"];

      if (!token && !externalToken) {
        return res
          .status(401)
          .json({ authenticated: false, message: "Unauthorized" });
      }

      let externalUser = undefined;
      let internalUser  = undefined;

      if (externalToken) {
        try {
          externalUser = jwt.verify(
            externalToken,
            process.env.MEDICAL_SCOIETY_JWT_SECRET
          );
        } catch (err1) {
          try {
            externalUser = jwt.verify(
              externalToken,
              process.env.GIC_JWT_SECRET
            );
          } catch (err2) {
            externalUser = undefined; // invalid token
          }
        }
      }

      if (token) internalUser = jwt.verify(token, process.env.JWT_SECRET);

        if (!token && !externalToken) {
            return res
                    .status(403)
                    .json({ authenticated: false, message: "Forbidden" });
        }
          

        if (internalUser?.role === "admin") req.user = internalUser;
        
        if (externalUser) req.user = externalUser;

        return next();
      

     

    } catch (err) {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }
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
};

module.exports = authorization_middleware;
