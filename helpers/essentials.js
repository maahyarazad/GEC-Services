
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

// Phones are stored as country code + digits, no "+" — the format member_card already uses.
// "+971 50-123 4567", "00971501234567" and "971501234567" all become "971501234567".
const normalizePhone = (raw) => {
  const digits = String(raw ?? "").trim().replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
};

// Accepts D/M/YYYY, DD/MM/YYYY and YYYY-MM-DD (optionally followed by a time).
// Returns YYYY-MM-DD for a real calendar date between 1900 and this year, otherwise null.
const parseBirthday = (raw) => {
  const str = String(raw ?? "").trim();
  if (!str) return null;

  let y, m, d;
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dmy) [, d, m, y] = dmy.map(Number);
  else if (ymd) [, y, m, d] = ymd.map(Number);
  else return null;

  const date = new Date(Date.UTC(y, m - 1, d));
  const isRealDate =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (!isRealDate || y < 1900 || y > new Date().getUTCFullYear()) return null;

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

module.exports = {
    chunkArray,
    isObject,
    flattenObject,
    normalizeRow,
    normalizePhone,
    parseBirthday
}