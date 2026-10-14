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
  map.flyTo(toLeafletPosition(location), zoom, { animate: true, duration: 0.8 })
  return true
}

export const getCurrentDeviceLocation = ({
  geolocation = globalThis.navigator?.geolocation,
  isSecureContext = globalThis.isSecureContext ?? true,
  options = {},
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
    ({ coords }) => {
      const location = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      }
      if (!isValidCoordinates(location)) {
        reject(new Error('The device returned invalid location coordinates.'))
        return
      }
      resolve(location)
    },
    (error) => {
      const message = error?.code === 1
        ? 'Location permission was denied. You can select a location manually.'
        : error?.code === 2
          ? 'Your device location is unavailable. Try again or select a location manually.'
          : error?.code === 3
            ? 'Timed out while getting your location. Try again.'
            : 'Unable to get your device location. Try again or select a location manually.'
      reject(new Error(message))
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    }
  )
})
