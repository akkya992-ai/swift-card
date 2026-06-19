import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

// We fetch the configuration from the backend at runtime. 
// This prevents compiling failures in Vite if the config file was newly created or has dummy values.
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

let isInitialized = false;
let authRef: any = null;

export async function fetchFirebaseConfig(): Promise<FirebaseWebConfig | null> {
  if (typeof window !== 'undefined') {
    const win = window as any;
    win.__addDiagnosticLog?.('info', '📂 Start fetching Firebase configuration secrets from Node server /api/firebase/config');
  }
  try {
    const res = await fetch('/api/firebase/config');
    if (!res.ok) {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('warn', `⚠️ Node server returned non-ok fetch status ${res.status} for Firebase configs`);
      }
      return null;
    }
    const data = await res.json();
    if (data.configured && data.config) {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('info', `✅ Successfully retrieved active Firebase secrets. Project ID: ${data.config.projectId}`);
      }
      return data.config as FirebaseWebConfig;
    } else {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('info', 'ℹ️ Firebase credentials are not yet configured on this server or defaults are active.');
      }
    }
  } catch (e: any) {
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('warn', '⚠️ Fetch API error during Firebase secrets request', { error: e.message || String(e) });
    }
    console.warn('[FIREBASE CONFIG] Failed fetching firebase config from backend:', e);
  }
  return null;
}

export async function initFirebase(): Promise<boolean> {
  if (isInitialized) return true;
  
  if (typeof window !== 'undefined') {
    const win = window as any;
    win.__addDiagnosticLog?.('info', '🔥 Initiating Google Firebase integration initialization sequence.');
  }

  // Try loading from localStorage first (in case of developer override)
  let config: FirebaseWebConfig | null = null;
  const saved = localStorage.getItem('swiftcart_firebase_config_override');
  if (saved) {
    try {
      config = JSON.parse(saved);
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('info', '📋 Extracted custom developer Firebase override credentials from LocalStorage cache.');
      }
      console.log('[FIREBASE] Loading config override from LocalStorage.');
    } catch {
      localStorage.removeItem('swiftcart_firebase_config_override');
    }
  }

  if (!config) {
    config = await fetchFirebaseConfig();
  }

  if (!config || !config.apiKey || config.apiKey.includes('placeholder')) {
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('info', '🧱 Firebase is unconfigured or has placeholder key values. Gracefully routing Auth into Sandbox Simulation mode.');
    }
    console.log('[FIREBASE] No real credentials configured. Enforcing sandbox mode.');
    return false;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    authRef = getAuth(app);
    isInitialized = true;
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('info', '🎉 Firebase Web SDK successfully mounted.', {
        projectId: config.projectId,
        authDomain: config.authDomain,
        appId: config.appId
      });
    }
    console.log('[FIREBASE] Successfully initialized live authentication integration.');
    return true;
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('error', '💥 FIREBASE MOUNT ERROR: Component failed during initialization.', {
        message: err.message,
        stack: err.stack
      });
    }
    console.error('[FIREBASE] Failed initializing Firebase Web SDK with provided config:', err);
    return false;
  }
}

export function getFirebaseAuth() {
  return authRef;
}

export { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
};
