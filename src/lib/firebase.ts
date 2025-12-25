// Firebase configuration for Grumming app
// Note: Firebase SDK causes build issues in this environment (TypeScript compiler stack overflow)
// Phone OTP authentication is handled via backend edge functions (send-sms-otp, verify-sms-otp)

export const firebaseConfig = {
  apiKey: "AIzaSyAl-C6_m_jeHiBxmX4rUgCzN14eftpTBeI",
  authDomain: "grumming-552d2.firebaseapp.com",
  projectId: "grumming-552d2",
  storageBucket: "grumming-552d2.firebasestorage.app",
  messagingSenderId: "901278748260",
  appId: "1:901278748260:web:7a1968f59c9aa08680d971",
  measurementId: "G-NTH8DNDRV5"
};
