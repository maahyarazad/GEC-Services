//GENERATE USER ID TAIL USING TIME IN SECONDS
const createID = () => {
    const currentDate = new Date();
    const id = Math.floor(currentDate.getTime() / 1000);
    const idString = id.toString();
    return idString.slice(-8);
};

const generateRecordId = (data) => {
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

  data.code = `gec${idSuffix}${createID()}`;
  return data;
}


module.exports = generateRecordId;