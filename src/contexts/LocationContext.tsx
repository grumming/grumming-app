import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { getCityCoordinates } from '@/data/cityCoordinates';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

type DetectLocationOptions = {
  showToast?: boolean;
  forceFresh?: boolean;
};

interface LocationContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  isDetecting: boolean;
  coordinates: { lat: number; lng: number } | null;
  detectLocation: (options?: DetectLocationOptions) => Promise<string | null>;
  hasAutoDetected: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCity, setSelectedCityInternal] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  // Wrapper to also set coordinates when city is manually selected
  const setSelectedCity = useCallback((city: string) => {
    setSelectedCityInternal(city);
    
    // Try to get coordinates for the selected city
    const cityCoords = getCityCoordinates(city);
    if (cityCoords) {
      setCoordinates(cityCoords);
    }
  }, []);

  // Use Capacitor Geolocation for native apps, browser API for web
  const getPosition = async (forceFresh: boolean): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Request permissions first on native
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        const reqStatus = await Geolocation.requestPermissions();
        if (reqStatus.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      // Use Capacitor for better GPS accuracy on native
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: forceFresh ? 30000 : 15000,
        maximumAge: forceFresh ? 0 : 60000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    }

    // Browser geolocation fallback
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: forceFresh ? 30000 : 15000,
          maximumAge: forceFresh ? 0 : 60000,
        }
      );
    });
  };

  // Use Mapbox for reverse geocoding
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { latitude, longitude },
      });

      if (error) {
        console.error('Mapbox geocoding error:', error);
        throw error;
      }

      return data?.locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (err) {
      console.error('Reverse geocode failed, using fallback:', err);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const detectLocation = async (options: DetectLocationOptions = {}): Promise<string | null> => {
    const { showToast = true, forceFresh = false } = options;

    if (!navigator.geolocation && !Capacitor.isNativePlatform()) {
      if (showToast) toast.error("Geolocation is not supported by your browser");
      return null;
    }

    setIsDetecting(true);

    try {
      const { latitude, longitude, accuracy } = await getPosition(forceFresh);
      setCoordinates({ lat: latitude, lng: longitude });

      // Warn if accuracy is poor (> 1km)
      if (accuracy > 1000 && showToast) {
        toast.info("GPS signal weak. For better accuracy, go outdoors or enable GPS.", { duration: 4000 });
      }

      // Use Mapbox for reverse geocoding
      const locationName = await reverseGeocode(latitude, longitude);

      setSelectedCityInternal(locationName);
      setIsDetecting(false);
      setHasAutoDetected(true);

      if (showToast) {
        const accuracyLabel = typeof accuracy === 'number' ? ` (±${Math.round(accuracy)}m)` : '';
        toast.success(`Location detected: ${locationName}${accuracyLabel}`);
      }
      return locationName;
    } catch (error: any) {
      setIsDetecting(false);

      if (showToast) {
        let errorMessage = "Failed to detect location";
        if (error?.code === 1 || error?.message?.includes('denied')) {
          errorMessage = "Location permission denied. Please enable location access in settings.";
        } else if (error?.code === 2) {
          errorMessage = "Location unavailable. Please check if GPS is enabled.";
        } else if (error?.code === 3) {
          errorMessage = "Location request timed out. Try again outdoors.";
        }
        toast.error(errorMessage);
      }

      return null;
    }
  };

  // Auto-detect location on mount (only once)
  useEffect(() => {
    const autoDetect = async () => {
      // Check if we have a cached location in localStorage
      const cachedLocation = localStorage.getItem('grumming_location');
      const cachedTime = localStorage.getItem('grumming_location_time');
      
      if (cachedLocation && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime, 10);
        // Use cache if less than 5 minutes old (shorter cache for accuracy)
        if (cacheAge < 5 * 60 * 1000) {
          setSelectedCity(cachedLocation);
          setHasAutoDetected(true);
          return;
        }
      }

      // Check if geolocation permission was previously denied
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'denied') {
            // Set default city if permission denied
            setSelectedCityInternal('Mumbai, Maharashtra');
            setCoordinates(getCityCoordinates('Mumbai'));
            setHasAutoDetected(true);
            return;
          }
        } catch {
          // Permissions API not supported, try detecting anyway
        }
      }

      // Auto-detect location (silent)
      const location = await detectLocation({ showToast: false });
      
      if (location) {
        // Cache the location
        localStorage.setItem('grumming_location', location);
        localStorage.setItem('grumming_location_time', Date.now().toString());
      } else if (!selectedCity) {
        // Set default city if detection failed
        setSelectedCityInternal('Mumbai, Maharashtra');
        setCoordinates(getCityCoordinates('Mumbai'));
        setHasAutoDetected(true);
      }
    };

    autoDetect();
  }, []);

  // Update cache when city changes manually
  useEffect(() => {
    if (selectedCity && hasAutoDetected) {
      localStorage.setItem('grumming_location', selectedCity);
      localStorage.setItem('grumming_location_time', Date.now().toString());
    }
  }, [selectedCity, hasAutoDetected]);

  return (
    <LocationContext.Provider value={{ 
      selectedCity, 
      setSelectedCity, 
      isDetecting, 
      coordinates,
      detectLocation,
      hasAutoDetected
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
