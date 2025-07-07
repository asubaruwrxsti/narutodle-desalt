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

  // 4. Collect all localStorage keys that contain "answer"
  const answerKeys = Object.keys(localStorage).filter(k =>
    k.toLowerCase().includes("answer")
  );

  if (answerKeys.length === 0) {
    console.log("No localStorage keys with 'answer' found.");
    return;
  }

  // 5. Try to get the passphrase
  let passphrase = window._lastCryptoJSPassphrase;

  if (!passphrase) {
    // Try extracting from code
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

  // Fallback passphrase
  if (!passphrase) {
    console.log("Passphrase not found. Trying fallback passphrase: QhDZJfngdx");
    passphrase = "QhDZJfngdx";
  }

  // 6. Try to decrypt each key
  answerKeys.forEach(key => {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return;

    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, passphrase).toString(CryptoJS.enc.Utf8);
      if (decrypted) {
        console.log(`${key}: ${decrypted}`);
      }
    } catch (err) {
      // Decryption failed, ignore
    }
  });
})();
