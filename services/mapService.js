require('dotenv').config();
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs/promises');


const token = process.env.MAPBOX_ACCESS_TOKEN;

async function generateMapImage({ lat, lon, event_name }, outputFolder = './maps') {

    // Mapbox Implementation

    const zoomRange = 13

    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},${zoomRange}/500x500?access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch map image');

    const buffer = await response.buffer();

    await fs.mkdir(outputFolder, { recursive: true });

    const safeFileName = event_name.replace(/\s+/g, '_').toLowerCase();
    const filePath = path.resolve(outputFolder, `${safeFileName}.png`);

    await fs.writeFile(filePath, buffer);
    return filePath;

}

module.exports = { generateMapImage };
