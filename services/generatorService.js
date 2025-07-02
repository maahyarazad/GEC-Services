//GENERATE USER ID TAIL USING TIME IN SECONDS
const createID = (val) => {
    const currentDate = new Date();
    const id = Math.floor(currentDate.getTime() / 1000);
    const idString = id.toString();
    return idString.slice(val);
};

const generateRecordId = (data, code_length, use_gec_prefix = true) => {
  let idSuffix;

  idSuffix =data.slice(0, 3)


  let code = use_gec_prefix ? `gec${idSuffix}${createID(code_length)}` : `${idSuffix}${createID(code_length)}`;
  return code;
}

const generateOTP = (length = 5) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // digits 0–9
  }
  return otp;
}

module.exports = {generateRecordId, generateOTP};