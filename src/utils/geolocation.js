export const isValidCoordinates = (location) => (
  Number.isFinite(location?.latitude)
  && Number.isFinite(location?.longitude)
  && location.latitude >= -90
  && location.latitude <= 90
  && location.longitude >= -180
  && location.longitude <= 180
)

export const toLeafletPosition = ({ latitude, longitude }) => [latitude, longitude]

export const toGeoJsonCoordinates = ({ latitude, longitude }) => [longitude, latitude]

export const centerMapOnLocation = (map, location, zoom = 15) => {
  if (!map || !isValidCoordinates(location)) return false
  map.setView(toLeafletPosition(location), zoom, { animate: false })
  return true
}

export const getCurrentDeviceLocation = ({
  geolocation = globalThis.navigator?.geolocation,
  isSecureContext = globalThis.isSecureContext ?? true,
  timeout = 20000,
} = {}) => new Promise((resolve, reject) => {
  if (!isSecureContext) {
    reject(new Error('Device location requires a secure HTTPS connection.'))
    return
  }

  if (!geolocation?.getCurrentPosition) {
    reject(new Error('Device location is not supported by this browser.'))
    return
  }

  geolocation.getCurrentPosition(
    (position) => {
      const { coords } = position || {}
      if (!coords) {
        reject(new Error('The device returned no location coordinates.'))
        return
      }
      const location = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: Number.isFinite(coords.accuracy) && coords.accuracy >= 0 ? coords.accuracy : null,
        acquiredAt: new Date(Number.isFinite(position.timestamp) ? position.timestamp : Date.now()).toISOString(),
        source: 'gps',
      }
      if (!isValidCoordinates(location)) {
        reject(new Error('The device returned invalid location coordinates.'))
        return
      }
      if (import.meta.env?.DEV) {
        console.debug('[ShopLink location] browser GPS fix', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters: location.accuracy,
          acquiredAt: location.acquiredAt,
        })
      }
      resolve(location)
    },
    (error) => {
      const message = error?.code === 1
        ? 'Location permission was denied. Allow location access in your browser or device settings, then try again.'
        : error?.code === 2
          ? 'Your device location is unavailable. Try again or select a location manually.'
          : error?.code === 3
            ? 'Timed out while getting your location. Try again.'
            : 'Unable to get your device location. Try again or select a location manually.'
      const details = typeof error?.message === 'string' ? error.message.trim() : ''
      reject(new Error(details && details !== message ? `${message} Details: ${details}` : message))
    },
    {
      enableHighAccuracy: true,
      timeout,
      maximumAge: 0,
    }
  )
})

export const createManualLocation = ({ latitude, longitude, address = null }) => {
  const location = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    accuracy: null,
    acquiredAt: new Date().toISOString(),
    source: 'manual',
    address,
  }
  if (!isValidCoordinates(location)) {
    throw new Error('Select a valid location on the map or from address search.')
  }
  return location
}
