import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface AddressMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

// Component to handle map centering when coordinates change externally
function MapController({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap();
  const prevCoords = useRef({ lat: latitude, lng: longitude });

  useEffect(() => {
    if (latitude && longitude) {
      // Only fly to new position if coordinates changed significantly
      const prevLat = prevCoords.current.lat;
      const prevLng = prevCoords.current.lng;
      
      if (!prevLat || !prevLng || 
          Math.abs(latitude - prevLat) > 0.0001 || 
          Math.abs(longitude - prevLng) > 0.0001) {
        map.flyTo([latitude, longitude], 16, { duration: 1 });
        prevCoords.current = { lat: latitude, lng: longitude };
      }
    }
  }, [latitude, longitude, map]);

  return null;
}

// Draggable marker component
function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

// Component to handle map clicks
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AddressMapPicker({
  latitude,
  longitude,
  onLocationChange,
}: AddressMapPickerProps) {
  // Default to India center if no coordinates
  const defaultLat = 20.5937;
  const defaultLng = 78.9629;
  const defaultZoom = latitude && longitude ? 16 : 4;

  const currentLat = latitude || defaultLat;
  const currentLng = longitude || defaultLng;

  const handleMarkerDrag = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
  };

  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-border relative">
      <MapContainer
        center={[currentLat, currentLng]}
        zoom={defaultZoom}
        className="w-full h-full z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController latitude={latitude} longitude={longitude} />
        <MapClickHandler onLocationChange={onLocationChange} />
        {latitude && longitude && (
          <DraggableMarker
            position={[latitude, longitude]}
            onDragEnd={handleMarkerDrag}
          />
        )}
      </MapContainer>
      {(!latitude || !longitude) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 pointer-events-none">
          <p className="text-sm text-muted-foreground text-center px-4">
            Click "Use Current Location" or tap the map to set a pin
          </p>
        </div>
      )}
    </div>
  );
}
