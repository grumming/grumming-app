import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SalonMapProps {
  coordinates: { lat: number; lng: number };
  salonName: string;
  address: string;
  className?: string;
}

const SalonMap = ({ coordinates, salonName, address, className = '' }: SalonMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setError('Unable to load map');
          setIsLoading(false);
          return;
        }

        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Map configuration not available');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Unable to load map');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, []);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !coordinates) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [coordinates.lng, coordinates.lat],
      zoom: 15,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Create custom marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'custom-salon-marker';
    markerEl.innerHTML = `
      <div class="relative">
        <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full opacity-30 animate-ping"></div>
      </div>
    `;

    // Add marker
    new mapboxgl.Marker(markerEl)
      .setLngLat([coordinates.lng, coordinates.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${salonName}</h3>
              <p class="text-xs text-gray-600 mt-1">${address}</p>
            </div>
          `)
      )
      .addTo(map.current);

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, coordinates, salonName, address]);

  const openGoogleMapsDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`,
      '_blank'
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-muted rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error || !mapboxToken) {
    return (
      <div className={`bg-muted rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-3">{error || 'Map not available'}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={openGoogleMapsDirections}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Open in Google Maps
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute bottom-3 right-3 z-10">
        <Button
          size="sm"
          onClick={openGoogleMapsDirections}
          className="shadow-lg"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Directions
        </Button>
      </div>
      <style>{`
        .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .custom-salon-marker {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SalonMap;
