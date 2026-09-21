
const chunkArray = (array, size) => {
    const temp = [];

    for(let i =0 ; i < array.length; i+= size){
        temp.push(array.slice(i, i+ size))
    }

    return temp;
}

const isObject = (obj) => typeof(obj) === 'object' && obj !== null && !Array.isArray(obj);



const flattenObject = (obj, parentKey = "", result = {}) => {
  for (const key in obj) {
    const newKey = parentKey ? `${parentKey}_${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      flattenObject(obj[key], newKey, result);
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
};

const normalizeRow = (row) => {
  
  let payload = {};
  try {
    payload = JSON.parse(row.payload);
  } catch(err) { console.error(`normalizeRow function error: `, err)}

  
  if (payload.ChannelMetadata) {
    try {
      payload.ChannelMetadata = JSON.parse(payload.ChannelMetadata);
    } catch {}
  }

  return flattenObject({
    ...row,
    payload,
  });
};

module.exports = {
    chunkArray,
    isObject,
    flattenObject,
    normalizeRow
}