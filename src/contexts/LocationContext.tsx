import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface LocationContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  isDetecting: boolean;
  coordinates: { lat: number; lng: number } | null;
  detectLocation: () => Promise<string | null>;
  hasAutoDetected: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  const detectLocation = async (): Promise<string | null> => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return null;
    }

    setIsDetecting(true);

    return new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });

          try {
            // Use reverse geocoding to get location name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
            );
            const data = await response.json();

            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.state_district ||
              data.address?.county ||
              "Unknown Location";
            
            const state = data.address?.state || "";
            const locationName = state ? `${city}, ${state}` : city;

            setSelectedCity(locationName);
            setIsDetecting(false);
            setHasAutoDetected(true);
            
            toast.success(`📍 Location: ${locationName}`);
            resolve(locationName);
          } catch {
            // Fallback if geocoding fails
            setIsDetecting(false);
            resolve(null);
          }
        },
        (error) => {
          setIsDetecting(false);
          
          // Don't show error on auto-detect, only on manual detect
          if (hasAutoDetected) {
            let errorMessage = "Failed to detect location";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "Location permission denied";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "Location unavailable";
                break;
              case error.TIMEOUT:
                errorMessage = "Location request timed out";
                break;
            }
            toast.error(errorMessage);
          }
          
          resolve(null);
        },
        {
          enableHighAccuracy: false, // Faster detection
          timeout: 8000,
          maximumAge: 600000, // Cache for 10 minutes
        }
      );
    });
  };

  // Auto-detect location on mount (only once)
  useEffect(() => {
    const autoDetect = async () => {
      // Check if we have a cached location in localStorage
      const cachedLocation = localStorage.getItem('grumming_location');
      const cachedTime = localStorage.getItem('grumming_location_time');
      
      if (cachedLocation && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime, 10);
        // Use cache if less than 30 minutes old
        if (cacheAge < 30 * 60 * 1000) {
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
            setSelectedCity('Mumbai, Maharashtra');
            setHasAutoDetected(true);
            return;
          }
        } catch {
          // Permissions API not supported, try detecting anyway
        }
      }

      // Auto-detect location
      const location = await detectLocation();
      
      if (location) {
        // Cache the location
        localStorage.setItem('grumming_location', location);
        localStorage.setItem('grumming_location_time', Date.now().toString());
      } else if (!selectedCity) {
        // Set default city if detection failed
        setSelectedCity('Mumbai, Maharashtra');
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
