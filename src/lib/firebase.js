import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, getToken, ReCaptchaV3Provider } from "firebase/app-check";

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
// site key. It loads Google reCAPTCHA, so it is only started once the user has consented
// (see ConsentContext). If you turn on App Check *enforcement* in the Firebase console,
// users who decline will be locked out — see docs/LAUNCH.md.
const appCheckConfigured = Boolean(firebaseConfig.appId && import.meta.env.VITE_RECAPTCHA_SITE_KEY);
let appCheckStarted = false;
let appCheck = null;

export function enableAppCheck() {
  if (appCheckStarted) return;
  if (!appCheckConfigured) {
    if (import.meta.env.DEV) console.warn("[firebase] App Check skipped — VITE_FIREBASE_APP_ID / VITE_RECAPTCHA_SITE_KEY not set.");
    return;
  }
  appCheckStarted = true;
  if (import.meta.env.DEV) {
    // Prints a debug token to the console on first run; register it under
    // Firebase Console → App Check → Apps → Manage debug tokens.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

export const isAppCheckStarted = () => appCheckStarted;

// App Check token for our own API (api/gemini.js), or null when App Check isn't running.
export async function getAppCheckToken() {
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck)).token;
  } catch {
    return null;
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);