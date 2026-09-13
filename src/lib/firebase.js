import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/**
 * SECURITY NOTE:
 * The 'apiKey' above is INTENDED to be public. It identifies your Firebase project
 * to the Google servers (like a username, not a password).
 * 
 * - Do NOT hide this key; the app will fail to connect.
 * - Security is handled by:
 *   1. App Check (verifies the app identity).
 *   2. Firestore/Storage Rules (verifies user permissions).
 *   3. Google Cloud Console Key Restrictions (prevents unauthorized domains).
 */

const app = initializeApp(firebaseConfig);

// App Check needs a registered web app id (…/apps/{appId}:exchange…) and a reCAPTCHA
// site key. With either missing the SDK sends a malformed request that surfaces as a
// CORS error in the console, so skip it and say why instead.
const appCheckReady = Boolean(firebaseConfig.appId && import.meta.env.VITE_RECAPTCHA_SITE_KEY);

if (appCheckReady) {
  if (import.meta.env.DEV) {
    // Prints a debug token to the console on first run; register it under
    // Firebase Console → App Check → Apps → Manage debug tokens.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
} else {
  console.warn(
    "[firebase] App Check not initialised — set VITE_FIREBASE_APP_ID and VITE_RECAPTCHA_SITE_KEY in .env " +
    "(Firebase Console → Project settings → General → Your apps → Web app → appId)."
  );
}

export const auth = getAuth(app);
export const db = getFirestore(app);