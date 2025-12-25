// Firebase configuration for Grumming app
// Using Firebase REST API to avoid SDK build issues (TypeScript compiler stack overflow)

export const firebaseConfig = {
  apiKey: "AIzaSyAl-C6_m_jeHiBxmX4rUgCzN14eftpTBeI",
  authDomain: "grumming-552d2.firebaseapp.com",
  projectId: "grumming-552d2",
  storageBucket: "grumming-552d2.firebasestorage.app",
  messagingSenderId: "901278748260",
  appId: "1:901278748260:web:7a1968f59c9aa08680d971",
  measurementId: "G-NTH8DNDRV5"
};

// Store session info for OTP verification
let sessionInfo: string | null = null;

// Send OTP using Firebase REST API
export const sendFirebaseOTP = async (phoneNumber: string): Promise<boolean> => {
  try {
    // Note: Firebase Phone Auth via REST requires reCAPTCHA token
    // For invisible reCAPTCHA, we need to use the Identity Platform API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          recaptchaToken: 'BYPASS_FOR_TESTING' // This won't work in production
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Firebase send OTP error:', data.error);
      throw new Error(data.error.message || 'Failed to send OTP');
    }

    sessionInfo = data.sessionInfo;
    return true;
  } catch (error: any) {
    console.error('Firebase OTP error:', error);
    throw error;
  }
};

// Verify OTP using Firebase REST API
export const verifyFirebaseOTP = async (otp: string): Promise<any> => {
  if (!sessionInfo) {
    throw new Error('No OTP session found. Please request a new OTP.');
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo: sessionInfo,
          code: otp
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Firebase verify error:', data.error);
      throw new Error(data.error.message || 'Invalid OTP');
    }

    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      phoneNumber: data.phoneNumber
    };
  } catch (error: any) {
    console.error('Firebase verify error:', error);
    throw error;
  }
};
