import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

// Dynamic import for the SMS Retriever plugin
let SmsRetriever: any = null;

const loadSmsRetriever = async () => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const module = await import('@skmd87/capacitor-sms-retriever');
      SmsRetriever = module.CapacitorSmsRetriever;
      return true;
    } catch (error) {
      console.log('SMS Retriever not available:', error);
      return false;
    }
  }
  return false;
};

export const useSmsRetriever = (onOtpReceived: (otp: string) => void) => {
  const isListening = useRef(false);
  const listenerCleanup = useRef<(() => void) | null>(null);

  const extractOtp = (message: string): string | null => {
    // Match 6 consecutive digits
    const otpMatch = message.match(/\b(\d{6})\b/);
    return otpMatch ? otpMatch[1] : null;
  };

  const startListening = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      console.log('SMS Retriever only works on Android native platform');
      return;
    }

    if (isListening.current) {
      console.log('Already listening for SMS');
      return;
    }

    try {
      const loaded = await loadSmsRetriever();
      if (!loaded || !SmsRetriever) {
        console.log('SMS Retriever plugin not loaded');
        return;
      }

      // Start listening for SMS
      const result = await SmsRetriever.startListening();
      isListening.current = true;
      
      if (result?.body) {
        const otp = extractOtp(result.body);
        if (otp) {
          console.log('OTP extracted from SMS:', otp);
          onOtpReceived(otp);
        }
      }
    } catch (error) {
      console.log('Failed to start SMS Retriever:', error);
      isListening.current = false;
    }
  }, [onOtpReceived]);

  const stopListening = useCallback(async () => {
    if (!isListening.current) return;
    
    try {
      if (SmsRetriever?.stopListening) {
        await SmsRetriever.stopListening();
      }
    } catch (error) {
      console.log('Error stopping SMS listener:', error);
    } finally {
      isListening.current = false;
      if (listenerCleanup.current) {
        listenerCleanup.current();
        listenerCleanup.current = null;
      }
    }
  }, []);

  const getAppSignature = useCallback(async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return null;
    }

    try {
      const loaded = await loadSmsRetriever();
      if (!loaded || !SmsRetriever) {
        return null;
      }

      const result = await SmsRetriever.getAppSignature();
      return result?.signature || null;
    } catch (error) {
      console.log('Failed to get app signature:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    startListening,
    stopListening,
    getAppSignature,
    isAndroid: Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
  };
};
