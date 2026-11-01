import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { Button } from '@/components/ui'
import {
  LocateFixed,
  MapPin,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react'
import api, { shopAPI } from '@/services/api'
import { useNavigate } from 'react-router-dom'
import { useLocationStore } from '@/store'
import { centerMapOnLocation, createManualLocation, getCurrentDeviceLocation, toLeafletPosition } from '@/utils/geolocation'

const DEFAULT_CENTER = [0, 0]
const DEFAULT_ZOOM = 2

const CATEGORY_OPTIONS = [
  { value: 'grocery', label: 'Grocery' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'tools', label: 'Tools' },
  { value: 'medicines', label: 'Medicines' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'other', label: 'Other' },
]

const createShopIcon = (count, selected = false) =>
  L.divIcon({
    className: 'custom-shop-marker-wrap',
    html: `<div class="custom-shop-marker${selected ? ' is-selected' : ''}">${count}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })

const createUserLocationIcon = () =>
  L.divIcon({
    className: 'custom-user-marker-wrap',
    html: '<div class="custom-user-marker"><span></span></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

const createPendingLocationIcon = () =>
  L.divIcon({
    className: 'custom-pending-location-marker-wrap',
    html: '<div class="custom-pending-location-marker"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const distanceBetween = (origin, destination) => {
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(destination[0] - origin[0])
  const longitudeDelta = radians(destination[1] - origin[1])
  const originLatitude = radians(origin[0])
  const destinationLatitude = radians(destination[0])
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

function MapEvents({ onMoveEnd, onReady, onZoomChange }) {
  const map = useMap()
  const callbacksRef = useRef({ onMoveEnd, onReady, onZoomChange })

  useEffect(() => {
    callbacksRef.current = { onMoveEnd, onReady, onZoomChange }
  }, [onMoveEnd, onReady, onZoomChange])

  useEffect(() => {
    callbacksRef.current.onReady?.(map)
  }, [map])

  useMapEvents({
    moveend: () => callbacksRef.current.onMoveEnd?.(map),
    zoomend: () => {
      callbacksRef.current.onZoomChange?.(map.getZoom())
      callbacksRef.current.onMoveEnd?.(map)
    },
  })

  return null
}

function MapSelectionEvents({ onSelect }) {
  const callbacksRef = useRef(onSelect)
  useEffect(() => { callbacksRef.current = onSelect }, [onSelect])
  useMapEvents({
    click: (event) => callbacksRef.current?.({
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
    }),
  })
  return null
}

function MapResizeHandler() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const resizeMap = () => map.invalidateSize({ pan: false })
    const observer = new ResizeObserver(resizeMap)
    observer.observe(container)
    const resizeFrame = window.requestAnimationFrame(resizeMap)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(resizeFrame)
    }
  }, [map])

  return null
}

export default function DeadStockMap() {
  const navigate = useNavigate()
  const setCurrentLocation = useLocationStore((state) => state.setLocation)
  const clearStoredLocation = useLocationStore((state) => state.clearLocation)
  const mapRef = useRef(null)
  const fetchDebounceRef = useRef(null)
  const requestRef = useRef(0)
  const abortRef = useRef(null)
  const locationRequestRef = useRef(0)
  const locatingRef = useRef(false)
  const lastRequestKeyRef = useRef('')
  const confirmedLocationRef = useRef(null)
  const discoveryModeRef = useRef('bounds')
  const suppressNextMapMoveRef = useRef(false)
  const reverseGeocodeRequestRef = useRef(0)
  const addressSearchRequestRef = useRef(0)
  const markerRefs = useRef(new Map())

  const [shops, setShops] = useState([])
  const [selectedShopId, setSelectedShopId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchAreaVisible, setSearchAreaVisible] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [maxDistance, setMaxDistance] = useState('10')
  const [userLocation, setUserLocation] = useState(null)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [locationSource, setLocationSource] = useState(null)
  const [confirmedAddress, setConfirmedAddress] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressCandidates, setAddressCandidates] = useState([])
  const [addressSearchLoading, setAddressSearchLoading] = useState(false)
  const [pendingLocation, setPendingLocation] = useState(null)
  const [manualAddressMessage, setManualAddressMessage] = useState('')
  const [diagnostics, setDiagnostics] = useState(null)

  const query = useMemo(() => ({
    search,
    category,
    minPrice,
    maxPrice,
    maxDistance,
  }), [search, category, minPrice, maxPrice, maxDistance])

  const fetchMapShops = useCallback(async ({ bounds, position, manual = false } = {}) => {
    if (!bounds && !position) return

    const params = {
      ...(position
        ? {
            lat: position[0],
            lng: position[1],
            maxDistance: Number(maxDistance || 10),
          }
        : {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          }),
      ...(search && { search }),
      ...(category && { category }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
      ...(maxDistance && { maxDistance: Number(maxDistance) }),
    }
    const requestKey = JSON.stringify(params)
    if (!manual && requestKey === lastRequestKeyRef.current) return
    lastRequestKeyRef.current = requestKey

    const requestId = ++requestRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')

    if (import.meta.env.DEV) {
      setDiagnostics((current) => ({
        ...current,
        sentCoordinates: position ? { latitude: params.lat, longitude: params.lng } : null,
        requestMode: position
          ? confirmedLocationRef.current?.source === 'manual'
            ? 'manual-confirmed-location'
            : 'confirmed-gps-location'
          : 'visible-map-bounds',
      }))
    }

    try {
      const response = await api.get('/shops/map', {
        params,
        signal: controller.signal,
      })

      const payload = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response?.data) ? response.data : []

      const normalizedItems = (payload || [])
        .map((shop) => {
          const latitude = Number(shop?.latitude)
          const longitude = Number(shop?.longitude)

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null
          }

          return {
            ...shop,
            latitude,
            longitude,
            distance: shop.distance ?? (confirmedLocationRef.current
              ? Number(distanceBetween(toLeafletPosition(confirmedLocationRef.current), [latitude, longitude]).toFixed(2))
              : null),
            products: Array.isArray(shop?.products) ? shop.products : [],
          }
        })
        .filter(Boolean)
        .sort((first, second) => (
          confirmedLocationRef.current && first.distance !== null && second.distance !== null
            ? first.distance - second.distance
            : 0
        ))

      if (requestId !== requestRef.current) return
      setShops(normalizedItems)
      if (import.meta.env.DEV) {
        setDiagnostics((current) => ({
          ...current,
          apiReceivedCoordinates: response?.diagnostics?.receivedCoordinates || null,
          apiReturnedShopCoordinates: normalizedItems.slice(0, 5).map((shop) => ({
            shopId: String(shop.shopId),
            latitude: shop.latitude,
            longitude: shop.longitude,
          })),
        }))
      }
      setSelectedShopId((selectedId) => (
        normalizedItems.some((shop) => String(shop.shopId) === String(selectedId)) ? selectedId : ''
      ))

      if (manual) setSearchAreaVisible(false)
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      if (requestId === requestRef.current) {
        setError('Unable to load nearby shops. Please try again.')
        setShops([])
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [category, maxDistance, maxPrice, minPrice, search])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      clearTimeout(fetchDebounceRef.current)
    }
  }, [])

  const handleMapMoveEnd = useCallback((mapInstance) => {
    if (!mapInstance || !mapRef.current) return
    if (import.meta.env.DEV) {
      const center = mapInstance.getCenter()
      setDiagnostics((current) => ({
        ...current,
        leafletCenter: { latitude: center.lat, longitude: center.lng },
      }))
    }
    if (suppressNextMapMoveRef.current) {
      suppressNextMapMoveRef.current = false
      return
    }

    if (locatingRef.current) {
      locationRequestRef.current += 1
      locatingRef.current = false
      setLocating(false)
    }
    discoveryModeRef.current = 'bounds'
    setSearchAreaVisible(true)
    clearTimeout(fetchDebounceRef.current)
    fetchDebounceRef.current = setTimeout(() => {
      fetchMapShops({ bounds: mapInstance.getBounds() })
    }, 350)
  }, [fetchMapShops])

  const handleSearchThisArea = useCallback(() => {
    if (!mapRef.current) return
    discoveryModeRef.current = 'bounds'
    fetchMapShops({ bounds: mapRef.current.getBounds(), manual: true })
  }, [fetchMapShops])

  const handleSearchDeadStock = useCallback((event) => {
    event?.preventDefault()
    if (discoveryModeRef.current === 'location' && confirmedLocationRef.current) {
      fetchMapShops({
        position: toLeafletPosition(confirmedLocationRef.current),
        manual: true,
      })
      return
    }
    if (mapRef.current) fetchMapShops({ bounds: mapRef.current.getBounds(), manual: true })
  }, [fetchMapShops])

  const handleMapReady = useCallback((mapInstance) => {
    mapRef.current = mapInstance
    setMapZoom(mapInstance.getZoom())
    if (import.meta.env.DEV) {
      const center = mapInstance.getCenter()
      setDiagnostics((current) => ({
        ...current,
        leafletCenter: { latitude: center.lat, longitude: center.lng },
      }))
    }
    fetchMapShops({ bounds: mapInstance.getBounds() })
  }, [fetchMapShops])

  const handleZoomChange = useCallback((zoom) => {
    setMapZoom(zoom)
  }, [])

  const centerMapWithoutAreaSearch = (location, zoom) => {
    const map = mapRef.current
    if (!map) return
    suppressNextMapMoveRef.current = true
    centerMapOnLocation(map, location, zoom)
    if (import.meta.env.DEV) {
      const center = map.getCenter()
      setDiagnostics((current) => ({
        ...current,
        leafletCenter: { latitude: center.lat, longitude: center.lng },
      }))
    }
    if (suppressNextMapMoveRef.current) {
      setTimeout(() => { suppressNextMapMoveRef.current = false }, 0)
    }
  }

  useEffect(() => {
    if (!mapRef.current) return
    clearTimeout(fetchDebounceRef.current)
    fetchDebounceRef.current = setTimeout(() => {
      if (discoveryModeRef.current === 'location' && confirmedLocationRef.current) {
        fetchMapShops({
          position: toLeafletPosition(confirmedLocationRef.current),
          manual: true,
        })
      } else {
        fetchMapShops({ bounds: mapRef.current.getBounds(), manual: true })
      }
    }, 250)
  }, [query, fetchMapShops])

  const handleLocateMe = useCallback(async () => {
    if (locatingRef.current) return
    locatingRef.current = true
    const requestId = ++locationRequestRef.current
    addressSearchRequestRef.current += 1
    setAddressSearchLoading(false)
    requestRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    lastRequestKeyRef.current = ''
    setLocating(true)
    setLocationMessage('')
    setShops([])
    setLoading(false)
    confirmedLocationRef.current = null
    discoveryModeRef.current = 'bounds'
    setUserLocation(null)
    setLocationAccuracy(null)
    setLocationSource(null)
    setConfirmedAddress(null)
    clearStoredLocation()
    if (import.meta.env.DEV) {
      setDiagnostics({
        rawGpsCoordinates: null,
        accuracyMeters: null,
        acquiredAt: null,
        sentCoordinates: null,
        requestMode: 'waiting-for-fresh-gps',
        apiReceivedCoordinates: null,
        apiReturnedShopCoordinates: [],
        leafletCenter: mapRef.current
          ? { latitude: mapRef.current.getCenter().lat, longitude: mapRef.current.getCenter().lng }
          : null,
      })
    }
    try {
      const location = await getCurrentDeviceLocation()
      if (requestId !== locationRequestRef.current) return
      const nextPosition = toLeafletPosition(location)
      confirmedLocationRef.current = location
      discoveryModeRef.current = 'location'
      setUserLocation(nextPosition)
      setLocationAccuracy(location.accuracy)
      setLocationSource('gps')
      setConfirmedAddress(null)
      setCurrentLocation(location)
      setManualAddressMessage('')
      setLocationMessage('')
      if (import.meta.env.DEV) {
        setDiagnostics({
          rawGpsCoordinates: { latitude: location.latitude, longitude: location.longitude },
          accuracyMeters: location.accuracy,
          acquiredAt: location.acquiredAt,
          sentCoordinates: { latitude: location.latitude, longitude: location.longitude },
          requestMode: 'confirmed-location',
          apiReceivedCoordinates: null,
          apiReturnedShopCoordinates: [],
          leafletCenter: mapRef.current
            ? { latitude: mapRef.current.getCenter().lat, longitude: mapRef.current.getCenter().lng }
            : null,
        })
      }
      centerMapWithoutAreaSearch(location, 15)
      fetchMapShops({ position: nextPosition, manual: true })
    } catch (error) {
      if (requestId === locationRequestRef.current) {
        setLocationMessage(error.message)
        if (import.meta.env.DEV) console.warn('[ShopLink location] browser GPS request failed', error)
      }
    } finally {
      if (requestId === locationRequestRef.current) {
        locatingRef.current = false
        setLocating(false)
      }
    }
  }, [clearStoredLocation, fetchMapShops, setCurrentLocation])

  const searchAddress = async (event) => {
    event.preventDefault()
    const queryText = addressQuery.trim()
    if (queryText.length < 3) {
      setManualAddressMessage('Enter at least 3 characters to search for a place.')
      return
    }
    const requestId = ++addressSearchRequestRef.current
    setAddressSearchLoading(true)
    setManualAddressMessage('')
    setAddressCandidates([])
    try {
      const response = await shopAPI.searchMapLocations({ query: queryText })
      if (requestId !== addressSearchRequestRef.current) return
      setAddressCandidates(response.data.candidates || [])
      if (!response.data.candidates?.length) setManualAddressMessage('No matching address was found.')
    } catch (error) {
      if (requestId === addressSearchRequestRef.current) {
        setManualAddressMessage(error?.message || 'Address search is unavailable. Select a point directly on the map.')
      }
    } finally {
      if (requestId === addressSearchRequestRef.current) setAddressSearchLoading(false)
    }
  }

  const setPendingAddressLocation = (location) => {
    addressSearchRequestRef.current += 1
    setAddressSearchLoading(false)
    reverseGeocodeRequestRef.current += 1
    const requestId = reverseGeocodeRequestRef.current
    setPendingLocation({
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      address: location.address || null,
    })
    setManualAddressMessage('')
    setAddressCandidates([])
    centerMapWithoutAreaSearch(location, Math.max(mapRef.current?.getZoom() || 0, 15))
    if (location.address) return

    shopAPI.reverseMapLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    }).then((response) => {
      if (requestId !== reverseGeocodeRequestRef.current) return
      const address = response.data.address
      setPendingLocation((current) => current && current.latitude === location.latitude && current.longitude === location.longitude
        ? { ...current, address }
        : current)
    }).catch(() => {
      if (requestId === reverseGeocodeRequestRef.current) {
        setManualAddressMessage('Address lookup is unavailable. You can still confirm the selected map coordinates.')
      }
    })
  }

  const confirmManualLocation = () => {
    if (!pendingLocation) return
    try {
      const location = createManualLocation(pendingLocation)
      confirmedLocationRef.current = location
      discoveryModeRef.current = 'location'
      setUserLocation(toLeafletPosition(location))
      setLocationAccuracy(null)
      setLocationSource('manual')
      setConfirmedAddress(location.address)
      setCurrentLocation(location)
      setLocationMessage('')
      setPendingLocation(null)
      if (import.meta.env.DEV) {
        setDiagnostics({
          rawGpsCoordinates: null,
          accuracyMeters: null,
          acquiredAt: location.acquiredAt,
          sentCoordinates: { latitude: location.latitude, longitude: location.longitude },
          requestMode: 'manual-confirmed-location',
          apiReceivedCoordinates: null,
          apiReturnedShopCoordinates: [],
          leafletCenter: mapRef.current
            ? { latitude: mapRef.current.getCenter().lat, longitude: mapRef.current.getCenter().lng }
            : null,
        })
      }
      centerMapWithoutAreaSearch(location, 15)
      fetchMapShops({ position: toLeafletPosition(location), manual: true })
    } catch (error) {
      setManualAddressMessage(error.message)
    }
  }

  const selectShop = useCallback((shop) => {
    const shopId = String(shop.shopId)
    setSelectedShopId(shopId)
    mapRef.current?.flyTo([shop.latitude, shop.longitude], Math.max(mapRef.current.getZoom(), 15), {
      animate: true,
      duration: 0.6,
    })
    window.setTimeout(() => markerRefs.current.get(shopId)?.openPopup(), 650)
  }, [])

  const handleResetFilters = useCallback(() => {
    setSearch('')
    setCategory('')
    setMinPrice('')
    setMaxPrice('')
    setMaxDistance('10')
    setShowFilters(false)
  }, [])

  const availableProductCount = shops.reduce(
    (total, shop) => total + Number(shop.productCount || shop.deadStockCount || 0),
    0
  )

  return (
    <main className="explore-page mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(290px,0.35fr)_minmax(0,0.65fr)] lg:gap-5">
        <section className="explore-panel min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:col-start-1 lg:row-start-1">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">ShopLink local</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Explore nearby</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Find useful deals and surplus stock from shops around you.
            </p>
          </div>

          <section aria-labelledby="location-search-title" className="border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="location-search-title" className="text-sm font-semibold">Choose an area</h2>
                <p className="mt-1 text-xs text-muted-foreground">Search an address or select a point on the map.</p>
              </div>
              <MapPin className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
            </div>

            <form onSubmit={searchAddress} className="mt-3 space-y-2">
              <label htmlFor="explore-location-search" className="sr-only">Enter area, locality or city</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="explore-location-search"
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  placeholder="Enter area, locality or city"
                  maxLength={200}
                  autoComplete="address-level2"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                />
                {addressQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      addressSearchRequestRef.current += 1
                      setAddressQuery('')
                      setAddressCandidates([])
                      setManualAddressMessage('')
                      setAddressSearchLoading(false)
                    }}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    aria-label="Clear location search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" className="h-11 w-full" disabled={addressSearchLoading}>
                {addressSearchLoading
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />Searching location…</>
                  : <><Search className="h-4 w-4" />Search location</>}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                onClick={handleLocateMe}
                disabled={locating}
              >
                <LocateFixed className="h-4 w-4" />
                {locating ? 'Requesting device location…' : 'Use current location'}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Current location uses your device GPS. If it is inaccurate or unavailable, select an area manually.
              </p>
            </form>

            {addressCandidates.length > 0 && (
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background p-1" aria-label="Address search results">
                {addressCandidates.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    onClick={() => setPendingAddressLocation(candidate)}
                    className="block w-full break-words rounded-md px-3 py-2 text-left text-xs leading-5 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    {candidate.address}
                  </button>
                ))}
                <p className="px-3 py-1 text-[11px] text-muted-foreground">Address search by OpenStreetMap contributors.</p>
              </div>
            )}

            {manualAddressMessage && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" role="alert">
                {manualAddressMessage}
              </p>
            )}
            {locationMessage && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="alert">
                {locationMessage}
              </p>
            )}
            {pendingLocation && (
              <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50/70 p-3 dark:border-orange-900 dark:bg-orange-950/20">
                <p className="text-xs font-semibold text-foreground">Confirm selected location</p>
                <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                  {pendingLocation.address || `Map point ${pendingLocation.latitude.toFixed(5)}, ${pendingLocation.longitude.toFixed(5)}`}
                </p>
                <Button type="button" size="sm" className="mt-2 w-full" onClick={confirmManualLocation}>
                  Use this location
                </Button>
              </div>
            )}
            {userLocation && !pendingLocation && (
              <div className="mt-3 rounded-lg border bg-muted/50 px-3 py-2.5" role="status">
                <p className="text-xs font-medium text-foreground">
                  {locationSource === 'gps' ? 'Current device location' : 'Selected location'}
                  {locationAccuracy !== null ? ` · reported ±${Math.round(locationAccuracy)} m` : ''}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                  {confirmedAddress || (locationSource === 'manual' ? 'Manually selected on map' : 'Coordinates supplied by your device')}
                </p>
                {locationSource === 'gps' && locationAccuracy > 100 && (
                  <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
                    This GPS fix may be approximate. Retry or select a location manually.
                  </p>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="dead-stock-search-title" className="mt-5 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="dead-stock-search-title" className="text-sm font-semibold">Search dead stock</h2>
                <p className="mt-1 text-xs text-muted-foreground">Filter available products by name and category.</p>
              </div>
              <PackageSearch className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
            </div>
            <form onSubmit={handleSearchDeadStock} className="mt-3 space-y-2">
              <label htmlFor="dead-stock-search" className="sr-only">Search products by name</label>
              <input
                id="dead-stock-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products by name"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              />
              <Button type="submit" className="h-11 w-full">
                <Search className="h-4 w-4" />
                Search Dead Stock
              </Button>
            </form>

            <button
              type="button"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((previous) => !previous)}
              className="mt-3 flex min-h-10 w-full items-center justify-between rounded-lg border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filters</span>
              <span className="text-xs text-muted-foreground">{showFilters ? 'Hide' : 'Show'}</span>
            </button>
            {showFilters && (
              <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="min-w-0 text-xs font-medium text-foreground">
                    Category
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      <option value="">All categories</option>
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0 text-xs font-medium text-foreground">
                    Within
                    <select
                      value={maxDistance}
                      onChange={(event) => setMaxDistance(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {[2, 5, 10, 20, 50].map((value) => (
                        <option key={value} value={String(value)}>{value} km</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-foreground">
                    Minimum price
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="Any"
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    />
                  </label>
                  <label className="text-xs font-medium text-foreground">
                    Maximum price
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="Any"
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="flex-1">Clear filters</Button>
                  <Button type="button" size="sm" onClick={handleSearchDeadStock} className="flex-1">Apply filters</Button>
                </div>
              </div>
            )}
            {searchAreaVisible && (
              <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={handleSearchThisArea}>
                Search this map area
              </Button>
            )}
          </section>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Shop map</h2>
              <p className="mt-1 text-xs text-muted-foreground">Pan or zoom to explore. Select a pin for shop details.</p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
              {shops.length} {shops.length === 1 ? 'shop' : 'shops'}
            </span>
          </div>
          <div className="explore-map dead-stock-map-shell relative overflow-hidden">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom
              className="h-full w-full"
              worldCopyJump
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapEvents onMoveEnd={handleMapMoveEnd} onReady={handleMapReady} onZoomChange={handleZoomChange} />
              <MapResizeHandler />
              <MapSelectionEvents onSelect={(point) => setPendingAddressLocation(point)} />

              {pendingLocation && <Marker position={toLeafletPosition(pendingLocation)} icon={createPendingLocationIcon()} />}
              {userLocation && (
                <>
                  {locationAccuracy !== null && (
                    <Circle
                      center={userLocation}
                      radius={locationAccuracy}
                      pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.18, weight: 1 }}
                    />
                  )}
                  <Marker
                    position={userLocation}
                    icon={locationSource === 'gps' ? createUserLocationIcon() : createPendingLocationIcon()}
                  />
                </>
              )}

              <MarkerClusterGroup chunkedLoading maxClusterRadius={48} disableClusteringAtZoom={14}>
                {shops.map((shop) => {
                  const shopId = String(shop.shopId)
                  const productCount = Number(shop.productCount || shop.deadStockCount || 0)
                  const markerCount = Math.max(1, productCount)

                  return (
                    <Marker
                      key={shopId}
                      ref={(marker) => {
                        if (marker) markerRefs.current.set(shopId, marker)
                        else markerRefs.current.delete(shopId)
                      }}
                      position={[shop.latitude, shop.longitude]}
                      icon={createShopIcon(markerCount, selectedShopId === shopId)}
                      eventHandlers={{ click: () => setSelectedShopId(shopId) }}
                    >
                      {mapZoom >= 16 && <Tooltip direction="top" offset={[0, -16]} permanent>{shop.name}</Tooltip>}
                      <Popup>
                        <div className="map-popup-card">
                          <div className="font-semibold text-sm">{shop.name}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {shop.shopType || 'Shop'}
                            {Number.isFinite(shop.distance) ? ` · ${shop.distance} km away` : ''}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {productCount} available {productCount === 1 ? 'product' : 'products'}
                          </div>
                          {(shop.products || []).slice(0, 4).map((product) => (
                            <div key={product.productId} className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                              <span className="truncate">{product.name}</span>
                              <span className="shrink-0 font-medium">{formatCurrency(product.price)}</span>
                            </div>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => navigate(`/shops/${shop.shopId}/stock`)}
                          >
                            View products
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MarkerClusterGroup>
            </MapContainer>

            {loading && (
              <div className="pointer-events-none absolute left-3 top-3 z-[500] inline-flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-xs font-medium text-foreground shadow-sm" role="status">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-600" aria-hidden="true" />
                Finding nearby shops…
              </div>
            )}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="absolute bottom-4 right-3 z-[500] inline-flex h-11 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-wait disabled:opacity-60"
              aria-label="Find my current location"
              title={locating ? 'Getting your current location' : 'Use current location'}
            >
              <LocateFixed className="h-4 w-4 text-orange-700 dark:text-orange-300" />
              {locating ? 'Locating…' : 'Current location'}
            </button>
          </div>
          {import.meta.env.DEV && diagnostics && (
            <details className="border-t px-4 py-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">Development location diagnostics</summary>
              <div className="mt-2 space-y-1 break-words">
                <p>Raw browser GPS: {diagnostics.rawGpsCoordinates ? `${diagnostics.rawGpsCoordinates.latitude}, ${diagnostics.rawGpsCoordinates.longitude}` : 'not applicable'}</p>
                <p>Accuracy: {diagnostics.accuracyMeters === null ? 'not available' : `${diagnostics.accuracyMeters} m`} · Acquired: {diagnostics.acquiredAt || 'n/a'}</p>
                <p>Mode: {diagnostics.requestMode}</p>
                <p>Coordinates sent: {diagnostics.sentCoordinates ? `${diagnostics.sentCoordinates.latitude}, ${diagnostics.sentCoordinates.longitude}` : 'map bounds'}</p>
                <p>API received: {diagnostics.apiReceivedCoordinates ? `${diagnostics.apiReceivedCoordinates.latitude}, ${diagnostics.apiReceivedCoordinates.longitude}` : 'pending / bounds query'}</p>
                <p>Leaflet center: {diagnostics.leafletCenter ? `${diagnostics.leafletCenter.latitude}, ${diagnostics.leafletCenter.longitude}` : 'map not ready'}</p>
                <p>Returned shop coordinates: {diagnostics.apiReturnedShopCoordinates?.map((shop) => `${shop.latitude},${shop.longitude}`).join(' | ') || 'none yet'}</p>
              </div>
            </details>
          )}
        </section>

        <section aria-labelledby="nearby-shops-title" className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-start-1 lg:row-start-2">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 id="nearby-shops-title" className="text-base font-semibold">Nearby shops</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {availableProductCount} available {availableProductCount === 1 ? 'dead-stock product' : 'dead-stock products'} across {shops.length} {shops.length === 1 ? 'shop' : 'shops'}.
              </p>
            </div>
            <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 px-2 text-sm font-semibold text-orange-900 dark:bg-orange-950 dark:text-orange-100">
              {shops.length}
            </span>
          </div>

          {error && (
            <p className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 sm:mx-5" role="alert">
              {error}
            </p>
          )}

          <div className="explore-shop-list divide-y">
            {loading && shops.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-5" role="status">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-600" aria-hidden="true" />
                Searching this area…
              </div>
            )}
            {!loading && shops.length === 0 && !error && (
              <div className="px-4 py-7 text-center sm:px-5">
                <Store className="mx-auto h-8 w-8 text-muted-foreground/70" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">No shops found yet</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Search for a location, move the map, or adjust your product filters.
                </p>
              </div>
            )}
            {shops.map((shop) => {
              const shopId = String(shop.shopId)
              const firstProduct = shop.products?.[0]
              const productCount = Number(shop.productCount || shop.deadStockCount || 0)
              const validDistance = Number.isFinite(shop.distance)

              return (
                <article
                  key={shopId}
                  className={`px-3 py-3 transition-colors sm:px-4 ${selectedShopId === shopId ? 'bg-orange-50/70 dark:bg-orange-950/20' : 'bg-card'}`}
                >
                  <button
                    type="button"
                    onClick={() => selectShop(shop)}
                    aria-pressed={selectedShopId === shopId}
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    {firstProduct?.image
                      ? <img src={firstProduct.image} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" loading="lazy" />
                      : <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground"><Store className="h-5 w-5" aria-hidden="true" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground" title={shop.name}>{shop.name}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{shop.shopType || 'Local shop'}</span>
                      {firstProduct && (
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {firstProduct.name}{firstProduct.price !== undefined ? ` · ${formatCurrency(firstProduct.price)}` : ''}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-900 dark:bg-orange-950 dark:text-orange-100">
                      {productCount}
                    </span>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-3 pl-[60px]">
                    <span className="text-xs text-muted-foreground">
                      {validDistance ? `${shop.distance} km away` : 'Distance unavailable'}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => navigate(`/shops/${shop.shopId}/stock`)}
                    >
                      View products
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
