
const generateRecordId = (eventName, codeLength = null, useGecPrefix = true) => {
  const sanitize = (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')   // remove special characters
      .replace(/\s+/g, '-')           // replace spaces with dash
      .replace(/-+/g, '-');           // collapse multiple dashes
  };

  const createAcronym = (str) => {
    const words = str.split(/[\s-]/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 3); // e.g. "expo" → "exp"
    }
    return words.map(w => w[0]).join(''); // e.g. "german breakfast" → "gb"
  };

  const createID = (val= 0 ) => {
      const currentDate = new Date();
      const id = Math.floor(currentDate.getTime() / 1000);
      const idString = id.toString();
      return idString.slice(val);
  };

  const cleaned = sanitize(eventName);
  const idSuffix = createAcronym(cleaned);

  const code = useGecPrefix
    ? `gec-${idSuffix}-${createID(codeLength)}`
    : `${idSuffix}-${createID(codeLength)}`;

  return code;
};


const generateOTP = (length = 5) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // digits 0–9
  }
  return otp;
}

module.exports = {generateRecordId, generateOTP};