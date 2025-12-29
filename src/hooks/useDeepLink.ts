import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

export const useDeepLink = () => {
  const navigate = useNavigate();

  const handleDeepLink = useCallback((event: URLOpenListenerEvent) => {
    const url = event.url;
    console.log('Deep link received:', url);

    // Parse the URL - handles both grumming:// and https:// schemes
    let path = '';
    
    if (url.startsWith('grumming://')) {
      // Custom scheme: grumming://salon/123 -> /salon/123
      path = url.replace('grumming://', '/');
    } else if (url.includes('grumming.app')) {
      // Universal link: https://grumming.app/salon/123 -> /salon/123
      const urlObj = new URL(url);
      path = urlObj.pathname + urlObj.search;
    }

    if (path) {
      // Clean up double slashes
      path = path.replace(/\/+/g, '/');
      
      // Navigate to the path
      console.log('Navigating to:', path);
      navigate(path);
    }
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Handle app opened via deep link
    App.addListener('appUrlOpen', handleDeepLink);

    // Check if app was launched via deep link
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        handleDeepLink({ url: result.url });
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [handleDeepLink]);

  return {
    isNative: Capacitor.isNativePlatform(),
  };
};
