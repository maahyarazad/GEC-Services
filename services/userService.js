const bcrypt = require("bcrypt");

const hashPassword = async (plainPassword) => {
    const saltRounds = 10; // recommended 10–12
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
};

function generatePassword(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}


module.exports = {generatePassword, hashPassword};