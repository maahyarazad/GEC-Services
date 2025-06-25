//GENERATE USER ID TAIL USING TIME IN SECONDS
const createID = (val) => {
    const currentDate = new Date();
    const id = Math.floor(currentDate.getTime() / 1000);
    const idString = id.toString();
    return idString.slice(val);
};

const generateRecordId = (data, code_length, use_gec_prefix = true) => {
  let idSuffix;
  const path = data.page;

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

  let code = use_gec_prefix ? `gec${idSuffix}${createID(code_length)}` : `${idSuffix}${createID(code_length)}`;
  return code;
}


module.exports = generateRecordId;