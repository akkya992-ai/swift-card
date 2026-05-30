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
  try {
    const res = await fetch('/api/firebase/config');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.configured && data.config) {
      return data.config as FirebaseWebConfig;
    }
  } catch (e) {
    console.warn('[FIREBASE CONFIG] Failed fetching firebase config from backend:', e);
  }
  return null;
}

export async function initFirebase(): Promise<boolean> {
  if (isInitialized) return true;
  
  // Try loading from localStorage first (in case of developer override)
  let config: FirebaseWebConfig | null = null;
  const saved = localStorage.getItem('swiftcart_firebase_config_override');
  if (saved) {
    try {
      config = JSON.parse(saved);
      console.log('[FIREBASE] Loading config override from LocalStorage.');
    } catch {
      localStorage.removeItem('swiftcart_firebase_config_override');
    }
  }

  if (!config) {
    config = await fetchFirebaseConfig();
  }

  if (!config || !config.apiKey || config.apiKey.includes('placeholder')) {
    console.log('[FIREBASE] No real credentials configured. Enforcing sandbox mode.');
    return false;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    authRef = getAuth(app);
    isInitialized = true;
    console.log('[FIREBASE] Successfully initialized live authentication integration.');
    return true;
  } catch (err) {
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
