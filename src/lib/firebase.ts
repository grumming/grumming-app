// Firebase configuration for Grumming app
// Firebase SDK is loaded via CDN in index.html to avoid TypeScript compiler issues
// Phone OTP authentication is handled via the CDN-loaded Firebase Auth module
// See src/lib/firebaseAuth.ts for the helper functions

// Using environment variables for Firebase config (security best practice)
// These are publishable client-side keys, safe for client use when protected by Firebase security rules
// REQUIRED: Set these environment variables in your deployment environment

const getFirebaseConfig = () => {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  // Validate required Firebase configuration
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.error(
      `Firebase configuration error: Missing required environment variables: ${missingFields.map(f => `VITE_FIREBASE_${f.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', ')}`
    );
  }

  return config;
};

export const FIREBASE_CONFIG = getFirebaseConfig();

// Helper to check if Firebase is properly configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId
  );
};
