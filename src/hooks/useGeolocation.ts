import { useState, useCallback } from "react";
import { toast } from "sonner";

interface GeolocationState {
  loading: boolean;
  error: string | null;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    location: null,
    coordinates: null,
  });

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setState((prev) => ({
        ...prev,
        error: "Geolocation not supported",
      }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

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
              data.address?.county ||
              "Unknown Location";
            const country = data.address?.country || "";
            const locationName = country ? `${city}, ${country}` : city;

            setState({
              loading: false,
              error: null,
              location: locationName,
              coordinates: { lat: latitude, lng: longitude },
            });

            toast.success(`Location detected: ${locationName}`);
            resolve(locationName);
          } catch {
            // Fallback if geocoding fails
            const fallbackLocation = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            setState({
              loading: false,
              error: null,
              location: fallbackLocation,
              coordinates: { lat: latitude, lng: longitude },
            });
            toast.success("Location detected");
            resolve(fallbackLocation);
          }
        },
        (error) => {
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

          setState({
            loading: false,
            error: errorMessage,
            location: null,
            coordinates: null,
          });
          toast.error(errorMessage);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    });
  }, []);

  return {
    ...state,
    detectLocation,
  };
};
