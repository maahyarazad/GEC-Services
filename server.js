const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const app = express();
const bcrypt = require("bcrypt");
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Received request for: ${req.url}`);
  next();
});

const hashthis = async (hashitem) => {
  const saltRounds = 10; // You can adjust the number of salt rounds as needed
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(hashitem.toString(), salt);
  return hash;
};

//GENERATE THE DATE USED IN METADATA
const generateRecordDate = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

//GENERATE THE DATETIME USED IN METADATA
const generateRecordDateTime = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const hours = String(today.getHours()).padStart(2, "0");
  const minutes = String(today.getMinutes()).padStart(2, "0");
  const seconds = String(today.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

//GENERATE USER ID TAIL USING TIME IN SECONDS
const createID = () => {
  const currentDate = new Date();
  const id = Math.floor(currentDate.getTime() / 1000);
  const idString = id.toString();
  return idString.slice(-8);
};

//DEFINE PATHS
const leadsListPath = "./data/leads_list.json";
const accessPath = "./data/access.json";

//MAIN RUNNER
const runner = async (xPath) => {
  console.log("running runner");
  const path = xPath;
  const read = await fs.readFile(path, "utf-8");
  const parse = JSON.parse(read);
  return parse;
};

// MAIN AUTHOR
const author = async (xPath, data) => {
  try {
    await fs.writeFile(xPath, JSON.stringify(data, null, 2));
    return { success: true, message: "File written successfully." };
  } catch (error) {
    console.error("Error occurred while writing to file:", error);
    if (error.code === "ENOENT") {
      throw new Error("The specified path does not exist.");
    } else if (error.code === "EACCES") {
      throw new Error("Permission denied when trying to write to the file.");
    } else {
      throw new Error(
        "An unexpected error occurred while writing to the file."
      );
    }
  }
};

// MULTER STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/");
  },
  filename: async (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    let newFileName = originalName;
    let counter = 1;
    // Check if the file already exists
    let filePath = path.join("public", file.originalname);
    try {
      while (true) {
        try {
          await fs.access(filePath);
          newFileName = `${originalName} (${counter})`;
          filePath = path.join("public", `${newFileName}${extension}`);
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

const upload = multer({ storage: storage });

//MAIN RECORD CREATOR FUNCTION
app.post("/records", async (req, res) => {
  const data = req.body?.data;
  const key = req.body?.key;
  const insert = req.body?.insert;
  const path = req.body?.path;
  const command = req.body?.command;
  const dataset = await runner(`./data/${path}.json`);
  console.log("This is the dataset: ", dataset);

  //INNER UPDATE FUNCTION
  if (command.includes("update")) {
    const match = await Array.from(dataset).find((item) => item.id === key);

    if (match) {
      const firstmark = command.indexOf("_");
      const lastmark = command.lastIndexOf("_");
      const property = command.slice(firstmark + 1, lastmark).trim();
      const action = command.slice(lastmark + 1);
      // console.log(command, firstmark, lastmark, property, action, insert);

      if (action !== "single") {
        if (!(property in match) || match[property] === undefined) {
          match[property] = [];
        }
        match[property].push(insert);
      } else {
        match[property] = insert;
      }

      await handleStageCheck(path, match);

      match.metadata.modifiedAt = await generateRecordDateTime();
      await author(path, dataset);
      return res.status(200).json({
        status: true,
        key: match.id,
        message: `Updated ${match.id} with new ${property} data: ${insert}`,
      });
    } else {
      return res.status(404).json({
        status: false,
        message: `No match found for id ${key}.`,
      });
    }
  } else if (command.includes("replace")) {
    console.log("replace");
    console.log(key, path);
    const match = await Array.from(dataset).find((item) => item.id === key);
    if (match) {
      Object.assign(match, data);
    }

    await handleStageCheck(path, match);
    match.metadata.modifiedAt = await generateRecordDateTime();
    await author(path, dataset);
    console.log("author called.");

    return res.status(200).json({
      status: true,
      key: match.id,
      data: match,
      message: `Updated ${match.id} with contents from the formdata`,
    });
  } else if (command === "archive") {
    try {
      const archive = await runner(archivePath);
      const selection = dataset.find((item) => item.id === key);

      if (!selection) {
        return res
          .status(404)
          .json({ message: `${key} was not found`, status: false });
      }

      archive.push(selection);
      await author(archivePath, archive);

      const updated = dataset.filter((item) => item.id !== key);

      await author(path, updated);
      res.status(200).json({
        message: "Item archived successfully",
        status: true,
        data: selection,
      });
    } catch (error) {
      console.error("Error archiving item:", error);
      res
        .status(500)
        .json({ message: "An error occurred while archiving", status: false });
    }
  } else {
    console.log("create ", data);

    const match = dataset.find((item) => item.email === data.email);

    if (match) {
      console.log("match found");
      return res.status(200).json({
        status: true,
        message: `${data.email} is already registered`,
      });
    }

    let idSuffix;

    switch (true) {
      case path.includes("leads"):
        idSuffix = "le";
        break;
      case path.includes("contacts"):
        idSuffix = "co";
        break;
      case path.includes("scheduled_meetings"):
        idSuffix = "sc";
        break;
      case path.includes("factsheet"):
        idSuffix = "fs";
        break;
      case path.includes("logs"):
        idSuffix = "lg";
        break;
      case path.includes("notifications"):
        idSuffix = "no";
        break;
      case path.includes("aftercare"):
        idSuffix = "af";
        break;
      case path.includes("registration"):
        idSuffix = "re";
        break;
      default:
        idSuffix = "lo";
    }
    console.log("chosen");
    //GENERATES RECORD ID
    idSuffix === "le"
      ? (data.id = `gec${idSuffix}${createID()}`)
      : (data.id = `gec${idSuffix}${createID()}`);

    console.log(data.id);
    //GENERATES RECORD ID
    data["metadata"] = {
      createdAt: await generateRecordDate(),
      modifiedAt: await generateRecordDateTime(),
    };

    try {
      // console.log(dataset);
      console.log(data);
      dataset.push(data);
      await author(`./data/${path}.json`, dataset);
      return res.status(200).json({
        key: data.id,
        data: data,
        status: true,
        message: "Success!",
      });
    } catch (error) {
      console.log(error);
    }
  }
});

//WILL FETCH AND RETURN ANY DATA
app.post("/data", async (req, res) => {
  const endpoint = req.body.endpoint;
  const key = req.body.key;
  // console.log(endpoint);

  try {
    const response = await fs.readFile(`./data/${endpoint}.json`, "utf-8");
    const data = JSON.parse(response);
    if (key) {
      console.log("searching for " + key + " in" + endpoint);
      let targetProperty;
      if (!endpoint.includes("lead_list") && !endpoint.includes("logs")) {
        targetProperty = "company_id";
      } else {
        targetProperty = "id";
      }

      console.log("/data looking for match");
      const matches = data.filter((item) => item[targetProperty] === key);
      console.log(matches);
      return res.json(matches);
    }
    return res.json(data);
  } catch (error) {
    console.error("Error reading the file:", error);
    res.status(500).send("Internal error with Data API");
  }
});

//LOGIN
app.post("/login", async (req, res) => {
  const key = req.body.key;
  const users = await runner(usersPath);
  console.log(users);
  const match = users.find((item) => item.id === key);

  if (match) {
    res.status(200).json({ message: "User found", data: match });
  } else {
    res.status(200).json({ message: "User not found" });
    console.log("match not found");
  }
});

//ACCESS CODE
app.post("/access", async (req, res) => {
  const data = req.body.data;
  console.log("Received data:", data.confirm);
  const access = await runner(accessPath);
  console.log("Access data:", access);

  const match = access.find((item) => item.id === data.confirm);
  console.log("Match found:", match);

  if (match) {
    res
      .status(200)
      .json({ success: true, message: "Access code is valid.", data: match });
  } else {
    res
      .status(404)
      .json({ success: false, message: "Access code is invalid." });
  }
});

// Route to read JSON data from a file
app.get("/data/web_partner", async (req, res) => {
  try {
    const data = await fs.readFile("./data/web_partner.json", "utf-8");
    const jsonData = JSON.parse(data);
    res.json(jsonData);
  } catch (error) {
    console.error("Error reading the file:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Jack: I'm good on port ${PORT}`);
});
