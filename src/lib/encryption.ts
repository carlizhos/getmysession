import CryptoJS from 'crypto-js';

// The secret key should ideally be injected via environment variables.
// Fallback is provided ONLY for development/demonstration if env is missing.
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'SAUDADE_FALLBACK_SECURE_KEY_123!';

/**
 * Encrypts a plaintext string using AES.
 * @param text Plaintext to encrypt
 * @returns Base64 encoded ciphertext string, or null if input is empty
 */
export const encryptText = (text: string | null | undefined): string | null => {
  if (!text) return null;
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
};

/**
 * Decrypts an AES ciphertext string.
 * @param ciphertext Base64 encoded ciphertext string
 * @returns Plaintext string, or the original text if decryption fails (backwards compatibility)
 */
export const decryptText = (ciphertext: string | null | undefined): string | null => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails (e.g., trying to decrypt plaintext), bytes.toString() returns empty string
    if (!decrypted && ciphertext.length > 0) {
      return ciphertext; // Fallback: it might not be encrypted yet
    }
    return decrypted;
  } catch (error) {
    // If an error occurs, it's likely not an encrypted string, return as is (backwards compatibility)
    return ciphertext;
  }
};
