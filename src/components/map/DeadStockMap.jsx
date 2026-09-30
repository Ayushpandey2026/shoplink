import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { Button } from '@/components/ui'
import api from '@/services/api'
import { useNavigate } from 'react-router-dom'

const DEFAULT_CENTER = [28.6139, 77.209]
const DEFAULT_ZOOM = 10

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

const createShopIcon = (count) =>
  L.divIcon({
    className: 'custom-shop-marker-wrap',
    html: `<div class="custom-shop-marker">${count}</div>`,
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

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

function MapEvents({ onMoveEnd, onReady }) {
  const map = useMap()

  useEffect(() => {
    onReady?.(map)
  }, [map, onReady])

  useMapEvents({
    moveend: () => onMoveEnd?.(map),
    zoomend: () => onMoveEnd?.(map),
  })

  return null
}

export default function DeadStockMap() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const fetchDebounceRef = useRef(null)
  const requestRef = useRef(0)
  const abortRef = useRef(null)

  const [shops, setShops] = useState([])
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
  const [locationMessage, setLocationMessage] = useState('')

  const query = useMemo(() => ({
    search,
    category,
    minPrice,
    maxPrice,
    maxDistance,
  }), [search, category, minPrice, maxPrice, maxDistance])

  const fetchMapShops = useCallback(async ({ bounds, position, manual = false } = {}) => {
    if (!bounds && !position) return

    const requestId = ++requestRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')

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
            products: Array.isArray(shop?.products) ? shop.products : [],
          }
        })
        .filter(Boolean)

      if (requestId !== requestRef.current) return
      setShops(normalizedItems)

      if (mapRef.current && normalizedItems.length > 0 && !mapRef.current.__shoplinkMapCentered) {
        const avgLat = normalizedItems.reduce((sum, shop) => sum + shop.latitude, 0) / normalizedItems.length
        const avgLng = normalizedItems.reduce((sum, shop) => sum + shop.longitude, 0) / normalizedItems.length
        mapRef.current.flyTo([avgLat, avgLng], 12, { animate: true, duration: 0.7 })
        mapRef.current.__shoplinkMapCentered = true
      }

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

    setSearchAreaVisible(true)
    clearTimeout(fetchDebounceRef.current)
    fetchDebounceRef.current = setTimeout(() => {
      fetchMapShops({ bounds: mapInstance.getBounds() })
    }, 350)
  }, [fetchMapShops])

  const handleSearchThisArea = useCallback(() => {
    if (!mapRef.current) return
    fetchMapShops({ bounds: mapRef.current.getBounds(), manual: true })
  }, [fetchMapShops])

  const handleMapReady = useCallback((mapInstance) => {
    mapRef.current = mapInstance
    fetchMapShops({ bounds: mapInstance.getBounds() })
  }, [fetchMapShops])

  useEffect(() => {
    if (!mapRef.current) return
    clearTimeout(fetchDebounceRef.current)
    fetchDebounceRef.current = setTimeout(() => {
      fetchMapShops({ bounds: mapRef.current.getBounds(), manual: true })
    }, 250)
  }, [query, fetchMapShops])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is unavailable in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = [position.coords.latitude, position.coords.longitude]
        setUserLocation(nextPosition)
        setLocationMessage('')

        if (mapRef.current) {
          mapRef.current.flyTo(nextPosition, 15, {
            animate: true,
            duration: 0.8,
          })
        }

        fetchMapShops({ position: nextPosition, manual: true })
      },
      () => {
        setLocationMessage('Location permission is required to find shops near you.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    )
  }, [fetchMapShops])

  const handleResetFilters = useCallback(() => {
    setSearch('')
    setCategory('')
    setMinPrice('')
    setMaxPrice('')
    setMaxDistance('10')
    setShowFilters(false)
    if (mapRef.current) {
      fetchMapShops({ bounds: mapRef.current.getBounds(), manual: true })
    }
  }, [fetchMapShops])

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dead stock..."
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <Button type="button" variant={showFilters ? 'default' : 'outline'} size="icon" onClick={() => setShowFilters((prev) => !prev)}>
            <span className="text-base">☰</span>
          </Button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={maxDistance}
                onChange={(event) => setMaxDistance(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              >
                {[2, 5, 10, 20, 50].map((value) => (
                  <option key={value} value={String(value)}>{value} km</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Min price"
                className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              />
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max price"
                className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="flex-1">Clear</Button>
              <Button type="button" size="sm" onClick={handleSearchThisArea} className="flex-1">Apply</Button>
            </div>
          </div>
        )}

        {searchAreaVisible && (
          <div className="mt-3 flex justify-end">
            <Button type="button" size="sm" onClick={handleSearchThisArea}>Search this area</Button>
          </div>
        )}
      </div>

      <div className="dead-stock-map-shell relative overflow-hidden rounded-xl border bg-muted">
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

          <MapEvents onMoveEnd={handleMapMoveEnd} onReady={handleMapReady} />

          {userLocation && (
            <>
              <Circle
                center={userLocation}
                radius={150}
                pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.18, weight: 1 }}
              />
              <Marker position={userLocation} icon={createUserLocationIcon()} />
            </>
          )}

          <MarkerClusterGroup chunkedLoading maxClusterRadius={48} disableClusteringAtZoom={14}>
            {shops.map((shop) => {
              const productCount = Number(shop.productCount || shop.deadStockCount || 0)
              const markerCount = Math.max(1, productCount)

              return (
                <Marker
                  key={shop.shopId}
                  position={[Number(shop.latitude), Number(shop.longitude)]}
                  icon={createShopIcon(markerCount)}
                >
                  <Popup>
                    <div className="map-popup-card">
                      <div className="font-semibold text-sm text-slate-900">{shop.name}</div>
                      <div className="mt-1 text-[11px] text-slate-500">📍 {shop.distance ? `${shop.distance} km away` : 'Nearby'}</div>
                      <div className="mt-2 text-[11px] text-slate-600">
                        📦 {productCount} available products
                      </div>

                      {(shop.products || []).slice(0, 4).map((product) => (
                        <div key={product.productId} className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-700">
                          <span className="truncate">{product.name}</span>
                          <span className="font-medium">{formatCurrency(product.price)}</span>
                        </div>
                      ))}

                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => navigate(`/shops/${shop.shopId}/stock`)}
                      >
                        View All Stock
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MarkerClusterGroup>
        </MapContainer>

        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute bottom-24 right-3 z-[500] flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-white text-xl shadow-lg transition hover:scale-[1.02]"
          aria-label="Locate me"
          title="Locate me"
        >
          ⦿
        </button>

        {loading && (
          <div className="absolute left-3 top-3 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium shadow-sm">
            Loading nearby shops...
          </div>
        )}

        {!loading && shops.length === 0 && !error && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-border bg-background/95 p-3 text-sm shadow-sm">
            No dead stock found in this area.
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {locationMessage && (
          <div className="absolute right-3 top-3 z-[500] max-w-[220px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-sky-700 shadow-sm">
            {locationMessage}
          </div>
        )}
      </div>
    </div>
  )
}
