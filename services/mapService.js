require("dotenv").config();
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs/promises");

const token = process.env.MAPBOX_ACCESS_TOKEN;

async function generateMapImage(
  { lat, lon, event_name },
  outputFolder = "./maps"
) {
  // Mapbox Implementation

  console.log("generatemaps");
  const zoomRange = 13;

  const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat}/${lon},${lat},${zoomRange}/500x500?access_token=${token}`;
  console.log("generate url");
  const response = await fetch(url, { method: "GET" });
  console.log("response ", response);
  if (!response.ok)
    throw new Error(
      response.status + " " + response.statusText || "Failed to fetch map image"
    );

  const buffer = await response.buffer();

  await fs.mkdir(outputFolder, { recursive: true });

  const safeFileName = event_name.replace(/\s+/g, "_").toLowerCase();
  const filePath = path.resolve(outputFolder, `${safeFileName}.png`);

  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function reverseGeocode(lat, lon) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lat},${lon}.json?access_token=${token}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to reverse geocode: ${response.statusText}`);
  }

  const data = await response.json();
  const placeName = data?.features?.[0]?.place_name;

  return placeName || null;
}

module.exports = {
  generateMapImage,
  reverseGeocode,
};
