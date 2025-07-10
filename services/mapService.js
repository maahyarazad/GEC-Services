require('dotenv').config();
const StaticMaps = require('staticmaps');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs/promises');

const MAP_WIDTH = 180;
const MAP_HEIGHT = 180;
const token = process.env.MAPBOX_ACCESS_TOKEN;

/**
 * Geocode a place name to lat/lon using Nominatim (OpenStreetMap)
 */
async function getCoords(place) {
    try{

        const query = encodeURIComponent(`${place} Dubai`);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}`;
    
        const res = await fetch(url);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].center;
            return { lon, lat };
        } 
    }catch(error){
        return error
    }

}

/**
 * Generate a static map image and save it
 */
async function generateMapImage(placeName, outputFolder = './maps') {

    // Mapbox Implementation
    let { lat, lon } = await getCoords(placeName);

    let zoomRange = 14
    if (!lat) {
        lat = 25.25809;
        lon = 55.297558;
        zoomRange = 10;
    }
    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},${zoomRange}/500x500?access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch map image');

    const buffer = await response.buffer();

    await fs.mkdir(outputFolder, { recursive: true });

    const safeFileName = placeName.replace(/\s+/g, '_').toLowerCase();
    const filePath = path.resolve(outputFolder, `${safeFileName}.png`);

    await fs.writeFile(filePath, buffer);
    return filePath;


    // StaticMaps Implementation
    // const options = {
    //     width: 400,
    //     height: 400,
    //     // tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    //     tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    //     tileSubdomains: ['a', 'b', 'c'],
    //     // tileUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    //     zoomRange: {
    //       max: zoomRange, // NASA server does not support level 9 or higher
    //     }
    //   };

    //   const map = new StaticMaps(options);
    //   const text = {
    //     coord: [13.437524, 52.4945528],
    //     text: 'My Text',
    //     size: 50,
    //     width: '1px',
    //     fill: '#000000',
    //     color: '#ffffff',
    //     font: 'Calibri'
    //   };

    //   map.addText(text);


    // const marker = {
    //     img: path.resolve(__dirname, '../assets/pngfind.com-map-pin-png-57664 (2).png'),
    //     // offsetX: 24,
    //     // offsetY: 48,
    //     width: 10,
    //     height: 10,
    //     coord: [lon, lat],
    // };

    // map.addMarker(marker);
    // await map.render([lon, lat]);
    // await map.image.save('./bluemarbletext.png');



    //   map.addMarker({
    //     coord: [lon, lat], // [longitude, latitude]
    //   });

    //   // ✅ Use `[lon, lat]` in an array
    //   await map.render([lon, lat], 14);

    //   await fs.mkdir(outputFolder, { recursive: true });

    //   const safeFileName = placeName.replace(/\s+/g, '_').toLowerCase();
    //   const filePath = path.resolve(`${outputFolder}/${safeFileName}.png`);

    //   await map.image.save(filePath);
    //   return filePath;
}

module.exports = { generateMapImage };
