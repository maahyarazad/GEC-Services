// cookieUtils.js
import CryptoJS from "crypto-js";

// Named export
export function getCookie(name) {
  const pair = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(name + '='));

    const ciphertext = pair ? decodeURIComponent(pair.split('=')[1]) : null;
    if(ciphertext){

      const bytes = CryptoJS.AES.decrypt(ciphertext, import.meta.env.VITE_LOCAL_STORAGE_KEY);
      const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
      const cookie_data = JSON.parse(decryptedJson);
      return cookie_data;
    }

  return null;
}

export function setEncryptedCookie(name, value) {
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(value), import.meta.env.VITE_LOCAL_STORAGE_KEY).toString();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString(); // now + 60min

  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(ciphertext)}`,
    `expires=${expires}`,
    `path=/`,
    `sameSite=strict`,  
    // `secure`            // enable if you’re on HTTPS
  ].join('; ');
}