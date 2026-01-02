import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Crosshair } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCoordinates?: { lat: number; lng: number } | null;
  onLocationSelect: (coordinates: { lat: number; lng: number }) => void;
  city?: string;
}

const LocationPickerDialog = ({
  open,
  onOpenChange,
  initialCoordinates,
  onLocationSelect,
  city,
}: LocationPickerDialogProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoordinates || null
  );
  const { toast } = useToast();

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Failed to fetch Mapbox token:', error);
        toast({
          title: 'Map unavailable',
          description: 'Could not load the map. Please try again.',
          variant: 'destructive',
        });
      }
    };

    if (open) {
      fetchToken();
    }
  }, [open, toast]);

  // Initialize map
  useEffect(() => {
    if (!open || !mapboxToken || !mapContainerRef.current) return;

    setIsLoading(true);
    mapboxgl.accessToken = mapboxToken;

    // Default center (India center or city-based)
    const defaultCenter: [number, number] = initialCoordinates
      ? [initialCoordinates.lng, initialCoordinates.lat]
      : [78.9629, 20.5937]; // India center

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: initialCoordinates ? 15 : 5,
    });

    mapRef.current = map;

    map.on('load', () => {
      setIsLoading(false);

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // If we have initial coordinates, add marker
      if (initialCoordinates) {
        const marker = new mapboxgl.Marker({ color: '#E11D48', draggable: true })
          .setLngLat([initialCoordinates.lng, initialCoordinates.lat])
          .addTo(map);

        markerRef.current = marker;

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setSelectedCoords({ lat: lngLat.lat, lng: lngLat.lng });
        });
      }

      // If city is provided but no coordinates, try to geocode city
      if (city && !initialCoordinates) {
        geocodeCity(city, map);
      }
    });

    // Click to place marker
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setSelectedCoords({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        const marker = new mapboxgl.Marker({ color: '#E11D48', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        markerRef.current = marker;

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setSelectedCoords({ lat: lngLat.lat, lng: lngLat.lng });
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, mapboxToken, initialCoordinates]);

  const geocodeCity = async (cityName: string, map: mapboxgl.Map) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          cityName + ', India'
        )}.json?access_token=${mapboxToken}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        map.flyTo({ center: [lng, lat], zoom: 12 });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16 });

          if (markerRef.current) {
            markerRef.current.setLngLat([longitude, latitude]);
          } else {
            const marker = new mapboxgl.Marker({ color: '#E11D48', draggable: true })
              .setLngLat([longitude, latitude])
              .addTo(mapRef.current);

            markerRef.current = marker;

            marker.on('dragend', () => {
              const lngLat = marker.getLngLat();
              setSelectedCoords({ lat: lngLat.lat, lng: lngLat.lng });
            });
          }
        }
      },
      (error) => {
        toast({
          title: 'Location access denied',
          description: 'Please enable location access to use this feature.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Pin Your Salon Location
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Use current location button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 left-3 z-10 shadow-md"
            onClick={handleUseCurrentLocation}
          >
            <Crosshair className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>

          {/* Instructions */}
          <div className="absolute bottom-3 left-3 right-3 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-sm text-muted-foreground">
            <p>Click on the map to place a pin, or drag the marker to adjust.</p>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedCoords ? (
                <span>
                  📍 {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                </span>
              ) : (
                <span>No location selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedCoords}>
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPickerDialog;
