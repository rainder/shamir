
/**
 *
 * @param data
 * @returns {Promise<Uint8Array>}
 */
const encrypt = async (data) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const key = window.crypto.getRandomValues(new Uint8Array(16));
  const keyEncoded = await crypto.subtle.importKey('raw', key.buffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    keyEncoded,
    data,
  );

  return new Uint8Array([
    ...iv,
    ...key,
    ...new Uint8Array(encryptedContent),
  ]);
};

/**
 *
 * @param data
 * @returns {Promise<Uint8Array>}
 */
const decrypt = async (data) => {
  const [iv, key, encryptedContent] = [
    data.slice(0, 16),
    data.slice(16, 32),
    data.slice(32),
  ];
  const keyEncoded = await crypto.subtle.importKey('raw', key.buffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    keyEncoded,
    encryptedContent,
  );

  return new Uint8Array(decryptedContent);
};

const randomBytes = (size) => window.crypto.getRandomValues(new Uint8Array(size));


const uint8ArrayToHex = (arr) => {
  return Array.from(arr).map((code) => code.toString(16).padStart(2, '0')).join('').toUpperCase();
}
