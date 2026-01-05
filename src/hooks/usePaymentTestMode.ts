import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentTestModeSettings {
  enabled: boolean;
  simulate_success: boolean;
}

// Global cache for test mode settings
let cachedSettings: PaymentTestModeSettings | null = null;
let cachePromise: Promise<PaymentTestModeSettings | null> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cacheTimestamp = 0;

// Preload test mode settings on module import
const preloadTestModeSettings = async (): Promise<PaymentTestModeSettings | null> => {
  const now = Date.now();
  
  // Return cached if still valid
  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }
  
  // If already fetching, return the existing promise
  if (cachePromise) {
    return cachePromise;
  }
  
  cachePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'payment_test_mode')
        .single();

      if (error) {
        console.error('Error fetching payment test mode:', error);
        cachedSettings = { enabled: false, simulate_success: true };
      } else if (data) {
        cachedSettings = data.value as unknown as PaymentTestModeSettings;
      } else {
        cachedSettings = { enabled: false, simulate_success: true };
      }
      
      cacheTimestamp = Date.now();
      return cachedSettings;
    } catch (error) {
      console.error('Error fetching payment test mode:', error);
      cachedSettings = { enabled: false, simulate_success: true };
      cacheTimestamp = Date.now();
      return cachedSettings;
    } finally {
      cachePromise = null;
    }
  })();
  
  return cachePromise;
};

// Start preloading immediately
preloadTestModeSettings();

export function usePaymentTestMode() {
  const [isTestMode, setIsTestMode] = useState(cachedSettings?.enabled ?? false);
  const [simulateSuccess, setSimulateSuccess] = useState(cachedSettings?.simulate_success ?? true);
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  useEffect(() => {
    // If already cached, use immediately
    if (cachedSettings) {
      setIsTestMode(cachedSettings.enabled);
      setSimulateSuccess(cachedSettings.simulate_success);
      setIsLoading(false);
      return;
    }

    // Otherwise fetch
    preloadTestModeSettings().then((settings) => {
      if (settings) {
        setIsTestMode(settings.enabled);
        setSimulateSuccess(settings.simulate_success);
      }
      setIsLoading(false);
    });
  }, []);

  return { isTestMode, simulateSuccess, isLoading };
}
