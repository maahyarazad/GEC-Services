const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const path = require("path");
const dbService = require("../services/dbService");
const multer = require("multer");
const { generateRecordId } = require("../services/generatorService");
const fs = require("fs").promises;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "file_storage/");
  },
  filename: async (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    let newFileName = originalName;
    let counter = 1;
    // Check if the file already exists
    let filePath = path.join("file_storage", file.originalname);
    try {
      while (true) {
        try {
          await fs.access(filePath);
          newFileName = `${originalName} (${counter})`;
          filePath = path.join("file_storage", `${newFileName}${extension}`);
          counter++;
        } catch (err) {
          break;
        }
      }
      cb(null, `${newFileName}${extension}`);
    } catch (error) {
      cb(error);
    }
  },
});
const { generateMapImage } = require("../services/mapService");
const authorize_admin = require("../middleware/auth");
const upload = multer({ storage: storage });

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 5,                   // limit each IP to 5 requests per window
  message: {
    status: 429,
    error: "Too many login attempts, please try again after 15 minutes."
  },
  headers: true, // Send rate limit info in headers (X-RateLimit-*)
});

router.post(
  "/api/registration-config",
  authorize_admin,
  upload.single("image"),
  async (req, res) => {
    try {
      const table_name = "registration_config";
      const data = req.body;

      const { uniqeCodeAccess, ...registration_data } = data;
      console.log("uniqeCodeAccess: ", uniqeCodeAccess);
      console.log("registration_data: ", registration_data);

      // EDIT MODE
      if (registration_data.id) {
        console.log("edit mode");
        const existing = await dbService.findById(
          table_name,
          registration_data.id
        );
        if (!existing) {
          return res
            .status(404)
            .json({ status: false, message: "Record not found" });
        }

        // Check duplicate
        const duplicate_record = await dbService.findByColumn(
          table_name,
          "page",
          registration_data.page
        );
        console.log("check duplicate record");
        
        if (duplicate_record && duplicate_record.id !== existing.id) {
          return res.status(400).json({
            status: false,
            message: "A duplicate record with the same page URL was found.",
          });
        }

        if (req.file) {
          registration_data.image = req.file.filename;
        }

        if (data.event_location) {
          const parts = data.event_location.split(", ");
          await generateMapImage({
            lat: parts[0],
            lon: parts[1],
            event_name: data.page,
          });
        }

        // Update record (registration_code should not change if not re-generated)

        const updated = await dbService.update(
          table_name,
          registration_data.id,
          {
            ...registration_data,
            modifiedAt: new Date().toISOString(),
          }
        );
        return res.json({
          status: true,
          message: "Record updated successfully",
          registration_data: updated,
        });
      }

      // Check duplicate
      const duplicate_record = await dbService.any(
        table_name,
        "page",
        registration_data.page
      );

      if (duplicate_record > 0) {
        console.log("duplicate");

        return res
          .status(400)
          .json({ status: false, message: "Duplicate record found." });
      }

      if (req.file) {
        registration_data.image = String(req.file.filename);
      }

      if (registration_data.event_location) {
        console.log("event_location");
        const parts = registration_data.event_location.split(", ");
        console.log("parts ", parts);
        const map = await generateMapImage({
          lat: parts[0],
          lon: parts[1],
          event_name: registration_data.page,
        });
        console.log("this is map", map);

        // console.log("mapfile ", mapfile);
      }

      // uniqeCodeAccess Logic goes here

      if(data.loginRequired){

        const code_list = [];
        if (Number(data.uniqeCodeAccess) > 1) {
          const members = await dbService.findExact(
            "Member",
            "active_member",
            true
          );
          for (let i = 0; i < Number(data.uniqeCodeAccess); i++) {
            code_list.push({
              key: generateRecordId(data.page, -6),
              memberId: members[i].id,
            });
          }
        }
  
        if (code_list.length > 0) {
          const insert_data = await dbService.insertWithKeys(
            "registration_config",
            registration_data,
            code_list
          );
          res.json({
            status: true,
            message: "Data saved successfully",
            insert_data,
          });
        } else {
          registration_data.registration_code = generateRecordId(
            data.page,
            -6,
            false
          );
          const insert_data = dbService.create(table_name, registration_data);
          res.json({
            status: true,
            message: "Data saved successfully",
            insert_data,
          });
        }
      }else{
        const insert_data = dbService.create(table_name, registration_data);
          res.json({
            status: true,
            message: "Data saved successfully",
            insert_data,
          });
      }


    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  }
);

router.post(
  "/api/registration-config/switch-registration-lock",
  authorize_admin,
  upload.single("none"),
  async (req, res) => {
    try {
      const table_name = "registration_config";
      const { Image, ...data } = req.body;

      const id = data.id;

      // Check if the record exists
      const existing = await dbService.findById(table_name, id);
      if (!existing) {
        return res
          .status(404)
          .json({ status: false, message: "Record not found" });
      }

      data.lockRegistration = String(!(data.lockRegistration === "true"));

      const updated = await dbService.update(table_name, id, {
        ...data,
        modifiedAt: new Date().toISOString(),
      });

      res.json({ status: true, message: "Data updated successfully", updated });
    } catch (error) {
      console.error("Edit error:", error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  }
);

router.get("/api/registration-config", authorize_admin ,async (req, res) => {
  try {
    const table_name = "registration_config";
    const rows = await dbService.findAll(table_name);

    res.json({ status: true, message: "Data fetched successfully", rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/registration-config/optional-login", async (req, res) => {
  try {
    const table_name = "registration_config";
    if (req.body && req.body.page) {
      const page = req.body.page;
      const rows = await dbService.findExact(table_name, "page", page);

      return res.json({
        status: true,
        message: "Data fetched successfully",
        rows,
      });
    }

    res.status(400).json({ status: true, message: "Bad Request" });


  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/registration-config-access" ,loginLimiter, upload.none(), async (req, res) => {
  try {
    const data = req.body;
    const registration_code = data.registration_code
      .replace(/\s+/g, " ")
      .trim();

      const member_key = await dbService.findExact(
        "member_card",
        "card_number", Number(registration_code.slice(1, registration_code.length)));
      if(member_key.length === 1){
          const expiryDate = new Date(member_key[0].card_expiry_date);
          const check_ExpiryDate = new Date(expiryDate);

          // add 1 year
          check_ExpiryDate.setFullYear(expiryDate.getFullYear() + 1);
          const now = new Date();


        if (
          check_ExpiryDate.getFullYear() < now.getFullYear() || 
          (check_ExpiryDate.getFullYear() === now.getFullYear() && check_ExpiryDate.getMonth() < now.getMonth())
        )  {

          const message = Number(member_key[0].card_number.toString().slice(0, 2)) === 70
          ? 'Your membership card has expired. Please contact the card issuer for assistance.'
          :'Your membership card has expired. For assistance, please contact <h3><a href="mailto:office2@german-emirates-club.com">office2@german-emirates-club.com</a></h3>';
          return res
            .status(401)
            .json({
              status: false,
              message: message
            });
}

        const page_data = await dbService.findExact(
          "registration_config",
          "page",
          data.event
        );
        
        if (page_data) {
          return res.status(200).json({
            status: true,
            message: "Login Success",
            data: page_data,
            session: req.session,
          });
        }
      }
      
      // Check duplicate
      
      const key = await dbService.findExact(
        "registration_keys",
        "key",
        registration_code
      );
      
      if (key && key.length > 0) {
        const page_data = await dbService.findExact(
          "registration_config",
          "id",
          key[0].registration_config_id
        );
        page_data[0].registration_code = registration_code;
        
        if (page_data) {
          return res.status(200).json({
            status: true,
            message: "Login Success",
            data: page_data,
            session: req.session,
          });
        }
      }
      
      const page_data = await dbService.findExact(
        "registration_config",
        "registration_code",
        registration_code
      );
      if (!page_data || page_data.length == 0) {
        return res
          .status(401)
          .json({ status: false, message: "Invalid Authorization Code" });
      }
      

    // await sendOtpToPhone(data.mobile_number, req, res, client);
    // await dbService.create("registration_client_access", data);

    return res.status(200).json({
      status: true,
      message: "Login Success",
      data: page_data,
      session: req.session,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});

module.exports = router;
