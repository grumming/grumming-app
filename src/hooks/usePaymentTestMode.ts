import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentTestModeSettings {
  enabled: boolean;
  simulate_success: boolean;
}

export function usePaymentTestMode() {
  const [isTestMode, setIsTestMode] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTestMode = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'payment_test_mode')
          .single();

        if (error) {
          console.error('Error fetching payment test mode:', error);
          setIsTestMode(false);
          setSimulateSuccess(true);
        } else if (data) {
          const settings = data.value as unknown as PaymentTestModeSettings;
          setIsTestMode(settings?.enabled ?? false);
          setSimulateSuccess(settings?.simulate_success ?? true);
        }
      } catch (error) {
        console.error('Error fetching payment test mode:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestMode();
  }, []);

  return { isTestMode, simulateSuccess, isLoading };
}
