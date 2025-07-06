(async function() {
  // 1. Load CryptoJS if not present
  function loadCryptoJS() {
    return new Promise((resolve, reject) => {
      if (window.CryptoJS && window.CryptoJS.AES) return resolve();
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 2. Wait for CryptoJS to be available
  await loadCryptoJS();

  // 3. Monkey-patch AES.decrypt to log passphrases
  if (!window._cryptojs_patched) {
    const origDecrypt = CryptoJS.AES.decrypt;
    CryptoJS.AES.decrypt = function(ciphertext, passphrase, ...args) {
      console.log("CryptoJS.AES.decrypt called with passphrase:", passphrase);
      window._lastCryptoJSPassphrase = passphrase;
      return origDecrypt.apply(this, arguments);
    };
    window._cryptojs_patched = true;
    console.log("CryptoJS.AES.decrypt is now monkey-patched.");
  }

  // 4. Try to extract the encrypted answer from localStorage
  // Try common keys, or list all keys for user to pick
  const possibleKeys = [
    "classic_today_answer",
    "answer",
    "today_answer"
  ];
  let encrypted = null, keyUsed = null;
  for (const k of possibleKeys) {
    if (localStorage.getItem(k)) {
      encrypted = localStorage.getItem(k);
      keyUsed = k;
      break;
    }
  }
  if (!encrypted) {
    // Fallback: show all localStorage keys
    console.log("Could not find answer in common keys. Here are all localStorage keys:");
    Object.keys(localStorage).forEach(k => console.log(k, localStorage.getItem(k)));
    return;
  }
  console.log("Found encrypted answer in localStorage key:", keyUsed);

  // 5. Try to extract the passphrase from the code (if not already known)
  let passphrase = window._lastCryptoJSPassphrase;
  if (!passphrase) {
    // Try to find it in window properties (as in previous scripts)
    for (const prop in window) {
      try {
        if (window[prop] && typeof window[prop].decrypt === "function") {
          const src = window[prop].decrypt.toString();
          const match = src.match(/AES\.decrypt\(.*?,\s*["'`](.*?)["'`]\)/);
          if (match) {
            passphrase = match[1];
            console.log("Extracted passphrase from code:", passphrase);
            break;
          }
        }
      } catch (e) {}
    }
  }
  if (!passphrase) {
    // Ask user to trigger a decryption in-game to log the passphrase
    console.log("Passphrase not found. Please play/reload the game to trigger decryption, then rerun this script.");
    return;
  }

  // 6. Decrypt the answer
  const decrypted = CryptoJS.AES.decrypt(encrypted, passphrase).toString(CryptoJS.enc.Utf8);
  console.log("Decrypted answer:", decrypted);
})();
