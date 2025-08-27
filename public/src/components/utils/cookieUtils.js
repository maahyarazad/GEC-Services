// cookieUtils.js
import CryptoJS from "crypto-js";

// Helper to get the secret key
const SECRET_KEY = "tw9SLTj6HrYznicP25wgO53YgaEjuKyF"

// ------------------ COOKIE UTILS ------------------

export function getCookie(name) {
  const pair = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(name + '='));
  
  const ciphertext = pair ? decodeURIComponent(pair.split('=')[1]) : null;

  if (ciphertext) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
      const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedJson);
    } catch (e) {
      console.error("Failed to decrypt cookie:", e);
    }
  }

  return null;
}

export function setEncryptedCookie(name, value) {
  try {
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(value), SECRET_KEY).toString();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toUTCString(); // 1 hour

    document.cookie = [
      `${encodeURIComponent(name)}=${encodeURIComponent(ciphertext)}`,
      `expires=${expires}`,
      `path=/`,
      `sameSite=strict`,
      // `secure` // Enable on HTTPS
    ].join('; ');
  } catch (e) {
    console.error("Failed to set encrypted cookie:", e);
  }
}

// ------------------ QUERY PARAM UTILS ------------------

export function encryptQueryParam(obj) {
  try {
    const jsonString = JSON.stringify(obj);
    const ciphertext = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    return encodeURIComponent(ciphertext);
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
}

export function decryptQueryParam(encrypted) {
  try {
    const decoded = decodeURIComponent(encrypted);
    const bytes = CryptoJS.AES.decrypt(decoded, SECRET_KEY);
    const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

// ------------------ LOCAL STORAGE UTILS ------------------

export function setEncryptedLocalStorage(key, value) {
  try {
    const jsonString = JSON.stringify(value);
    const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    localStorage.setItem(key, encrypted);
  } catch (e) {
    console.error("Failed to set encrypted localStorage:", e);
  }
}

export function getEncryptedLocalStorage(key) {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedJson);
  } catch (e) {
    console.error("Failed to get or decrypt localStorage:", e);
    return null;
  }
}

export function removeEncryptedLocalStorage(key) {
  localStorage.removeItem(key);
}
