import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationSetup = () => {
  const { isSupported, register } = usePushNotifications();

  useEffect(() => {
    if (isSupported) {
      // Auto-register for push notifications on native platforms
      register();
    }
  }, [isSupported]);

  // This component doesn't render anything - it just sets up push notifications
  return null;
};
