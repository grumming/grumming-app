import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

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
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  const detectLocation = async (options: DetectLocationOptions = {}): Promise<string | null> => {
    const { showToast = true, forceFresh = false } = options;

    if (!navigator.geolocation) {
      if (showToast) toast.error("Geolocation is not supported by your browser");
      return null;
    }

    setIsDetecting(true);

    return new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });

          try {
            // Use reverse geocoding to get location name with higher zoom for accuracy
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();

            const road = data.address?.road || "";
            const neighborhood = data.address?.neighbourhood || data.address?.suburb || "";
            const city = data.address?.city || data.address?.town || data.address?.state_district || "";
            const state = data.address?.state || "";

            // Build a precise, user-friendly location string
            let locationName = "";
            if (road && neighborhood) {
              locationName = `${road}, ${neighborhood}`;
              if (city && city !== neighborhood) locationName = `${locationName}, ${city}`;
            } else if (neighborhood) {
              locationName = city && city !== neighborhood ? `${neighborhood}, ${city}` : neighborhood;
            } else if (city) {
              locationName = state && state !== city ? `${city}, ${state}` : city;
            } else {
              locationName = "Unknown Location";
            }

            setSelectedCity(locationName);
            setIsDetecting(false);
            setHasAutoDetected(true);

            if (showToast) {
              const accuracyLabel = typeof accuracy === 'number' ? ` (±${Math.round(accuracy)}m)` : '';
              toast.success(`Location detected: ${locationName}${accuracyLabel}`);
            }
            resolve(locationName);
          } catch {
            // Fallback if geocoding fails
            const fallbackLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setSelectedCity(fallbackLocation);
            setIsDetecting(false);
            setHasAutoDetected(true);

            if (showToast) toast.success("Location detected");
            resolve(fallbackLocation);
          }
        },
        (error) => {
          setIsDetecting(false);

          if (showToast) {
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
          enableHighAccuracy: true,
          timeout: forceFresh ? 20000 : 10000,
          maximumAge: forceFresh ? 0 : 300000,
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
            setSelectedCity('Mumbai, Maharashtra');
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
