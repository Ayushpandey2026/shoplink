import { useCallback, useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { isValidCoordinates, toLeafletPosition } from '@/utils/geolocation'

const selectedLocationIcon = L.divIcon({
  className: 'selected-location-marker',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 1px 5px #333"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function MapSelectionEvents({ onSelect }) {
  useMapEvents({
    click: (event) => onSelect({
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
    }),
  })
  return null
}

function MapCenter({ position, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), zoom))
  }, [map, position, zoom])
  return null
}

export default function LocationPicker({
  location,
  onChange,
  label = 'Selected location',
  initialCenter,
  initialZoom = 15,
}) {
  const validLocation = isValidCoordinates(location)
  const validInitialCenter = isValidCoordinates(initialCenter)
  const position = validLocation
    ? toLeafletPosition(location)
    : validInitialCenter
      ? toLeafletPosition(initialCenter)
      : null
  const mapZoom = validLocation ? 15 : initialZoom
  const updateFromMarker = useCallback((event) => {
    const point = event.target.getLatLng()
    onChange({ latitude: point.lat, longitude: point.lng })
  }, [onChange])

  if (!position) {
    return (
      <p className="text-xs text-muted-foreground">
        Enter valid coordinates or use device location to show the map selector.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{label}. Click the map or drag the marker to adjust.</p>
      <MapContainer center={position} zoom={mapZoom} scrollWheelZoom className="h-64 w-full rounded-lg">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter position={position} zoom={mapZoom} />
        <MapSelectionEvents onSelect={onChange} />
        {validLocation && (
          <Marker
            position={position}
            icon={selectedLocationIcon}
            draggable
            eventHandlers={{ dragend: updateFromMarker }}
          />
        )}
      </MapContainer>
    </div>
  )
}
