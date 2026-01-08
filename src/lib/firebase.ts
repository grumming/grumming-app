// Firebase configuration for Grumming app
// Firebase SDK is loaded via CDN in index.html to avoid TypeScript compiler issues
// Phone OTP authentication is handled via the CDN-loaded Firebase Auth module
// See src/lib/firebaseAuth.ts for the helper functions

// Using environment variables for Firebase config (security best practice)
// These are publishable client-side keys, safe for client use when protected by Firebase security rules
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAl-C6_m_jeHiBxmX4rUgCzN14eftpTBeI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "grumming-552d2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "grumming-552d2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "grumming-552d2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "901278748260",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:901278748260:web:7a1968f59c9aa08680d971",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-NTH8DNDRV5"
};
