// Type definitions for global Firebase objects loaded via CDN
declare global {
  interface Window {
    firebaseAuth: any;
    RecaptchaVerifier: any;
    signInWithPhoneNumber: any;
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

export const setupRecaptcha = (): boolean => {
  try {
    if (!window.firebaseAuth || !window.RecaptchaVerifier) {
      console.error('Firebase not loaded yet');
      return false;
    }

    // Clear existing verifier if any
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // Ignore clear errors
      }
    }

    // Create hidden container dynamically
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    window.recaptchaVerifier = new window.RecaptchaVerifier(
      window.firebaseAuth,
      'recaptcha-container',
      {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          window.recaptchaVerifier = null;
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error setting up reCAPTCHA:', error);
    return false;
  }
};

export const sendFirebaseOTP = async (phoneNumber: string): Promise<void> => {
  if (!window.firebaseAuth || !window.signInWithPhoneNumber) {
    throw new Error('Firebase not initialized. Please refresh the page.');
  }

  // Setup reCAPTCHA if not already done
  if (!window.recaptchaVerifier) {
    const success = setupRecaptcha();
    if (!success) {
      throw new Error('Failed to initialize reCAPTCHA. Please refresh the page.');
    }
  }

  try {
    const confirmationResult = await window.signInWithPhoneNumber(
      window.firebaseAuth,
      phoneNumber,
      window.recaptchaVerifier
    );
    window.confirmationResult = confirmationResult;
  } catch (error: any) {
    console.error('Firebase OTP error:', error);
    
    // Reset reCAPTCHA on error
    window.recaptchaVerifier = null;
    
    // Handle specific Firebase errors
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please try again later.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to send OTP');
  }
};

export const verifyFirebaseOTP = async (otp: string): Promise<{ user: any; idToken: string }> => {
  if (!window.confirmationResult) {
    throw new Error('No OTP session found. Please request a new OTP.');
  }

  try {
    const result = await window.confirmationResult.confirm(otp);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } catch (error: any) {
    console.error('Firebase verify error:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP. Please check and try again.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('OTP expired. Please request a new one.');
    }
    
    throw new Error(error.message || 'Failed to verify OTP');
  }
};

export const isFirebaseReady = (): boolean => {
  return !!(window.firebaseAuth && window.RecaptchaVerifier && window.signInWithPhoneNumber);
};
