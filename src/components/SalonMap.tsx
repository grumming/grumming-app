import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/contexts/LocationContext';
import { MapPin, Navigation, Loader2, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistance, calculateDistance } from '@/lib/distance';

interface SalonMapProps {
  coordinates: { lat: number; lng: number };
  salonName: string;
  address: string;
  className?: string;
}

const SalonMap = ({ coordinates, salonName, address, className = '' }: SalonMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const { coordinates: userCoords, detectLocation, isDetecting } = useLocation();

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
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Create custom salon marker element
    const salonMarkerEl = document.createElement('div');
    salonMarkerEl.className = 'custom-salon-marker';
    salonMarkerEl.innerHTML = `
      <div class="relative">
        <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg border-3 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full opacity-30 animate-ping"></div>
      </div>
    `;

    // Add salon marker
    new mapboxgl.Marker(salonMarkerEl)
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

  // Add/update user location marker
  useEffect(() => {
    if (!map.current || !userCoords || !showUserLocation) return;

    // Remove existing user marker
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Create user location marker
    const userMarkerEl = document.createElement('div');
    userMarkerEl.className = 'user-location-marker';
    userMarkerEl.innerHTML = `
      <div class="relative">
        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white">
          <div class="w-4 h-4 bg-white rounded-full"></div>
        </div>
        <div class="absolute inset-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
      </div>
    `;

    const distance = calculateDistance(
      userCoords.lat,
      userCoords.lng,
      coordinates.lat,
      coordinates.lng
    );

    userMarker.current = new mapboxgl.Marker(userMarkerEl)
      .setLngLat([userCoords.lng, userCoords.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">📍 Your Location</h3>
              <p class="text-xs text-gray-600 mt-1">${formatDistance(distance)} to salon</p>
            </div>
          `)
      )
      .addTo(map.current);

    // Fit bounds to show both markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([coordinates.lng, coordinates.lat]);
    bounds.extend([userCoords.lng, userCoords.lat]);
    
    map.current.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 40, right: 40 },
      maxZoom: 15,
    });

    // Add route line between user and salon
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [userCoords.lng, userCoords.lat],
            [coordinates.lng, coordinates.lat]
          ]
        }
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    });

  }, [userCoords, showUserLocation, coordinates]);

  const handleShowUserLocation = async () => {
    if (userCoords) {
      setShowUserLocation(true);
    } else {
      await detectLocation({ showToast: true });
      setShowUserLocation(true);
    }
  };

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
      
      {/* User location button */}
      <div className="absolute top-3 left-3 z-10">
        <Button
          size="sm"
          variant={showUserLocation ? "default" : "secondary"}
          onClick={handleShowUserLocation}
          disabled={isDetecting}
          className="shadow-lg"
        >
          {isDetecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Locate className="w-4 h-4 mr-2" />
          )}
          {showUserLocation ? 'Location shown' : 'Show my location'}
        </Button>
      </div>

      {/* Directions button */}
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

      {/* Distance badge */}
      {showUserLocation && userCoords && (
        <div className="absolute bottom-3 left-3 z-10 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs text-muted-foreground">Distance</p>
          <p className="font-semibold text-primary">
            {formatDistance(calculateDistance(userCoords.lat, userCoords.lng, coordinates.lat, coordinates.lng))}
          </p>
        </div>
      )}

      <style>{`
        .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .custom-salon-marker, .user-location-marker {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SalonMap;
