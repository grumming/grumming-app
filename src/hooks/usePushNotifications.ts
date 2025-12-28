import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  PushNotifications, 
  PushNotificationSchema, 
  ActionPerformed,
  Token
} from '@capacitor/push-notifications';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
export interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  token: string | null;
  error: string | null;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    token: null,
    error: null,
  });

  // Save FCM token to database
  const saveTokenToDatabase = async (token: string) => {
    if (!user) {
      console.log('No user logged in, skipping token save');
      return;
    }

    try {
      const deviceType = Capacitor.getPlatform();
      
      // Upsert the token (insert or update if exists)
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: user.id,
            token: token,
            device_type: deviceType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        );

      if (error) {
        console.error('Error saving FCM token:', error);
      } else {
        console.log('FCM token saved to database');
      }
    } catch (err) {
      console.error('Error saving FCM token:', err);
    }
  };

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    
    if (!isNative) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));
    
    // Set up listeners
    const setupListeners = async () => {
      // On registration success
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setState(prev => ({ 
          ...prev, 
          isRegistered: true, 
          token: token.value,
          error: null 
        }));
        
        // Save token to database
        await saveTokenToDatabase(token.value);
      });

      // On registration error
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        setState(prev => ({ 
          ...prev, 
          isRegistered: false, 
          error: error.error 
        }));
      });

      // On notification received while app is in foreground
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        toast({
          title: notification.title || 'Notification',
          description: notification.body || '',
        });
      });

      // On notification action performed (user tapped notification)
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        // Handle notification tap - navigate or perform action based on data
        const data = action.notification.data;
        if (data?.route) {
          window.location.href = data.route;
        }
      });
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.log('Push notifications not supported on this platform');
      return false;
    }

    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        // Request permission
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          setState(prev => ({ 
            ...prev, 
            error: 'Push notification permission denied' 
          }));
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          error: 'Push notification permission not granted' 
        }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request push notification permission' 
      }));
      return false;
    }
  };

  const register = async (): Promise<boolean> => {
    const hasPermission = await requestPermission();
    
    if (!hasPermission) {
      return false;
    }

    try {
      await PushNotifications.register();
      return true;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to register for push notifications' 
      }));
      return false;
    }
  };

  const unregister = async (): Promise<void> => {
    try {
      await PushNotifications.unregister();
      setState(prev => ({ 
        ...prev, 
        isRegistered: false, 
        token: null 
      }));
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  return {
    ...state,
    requestPermission,
    register,
    unregister,
  };
};
