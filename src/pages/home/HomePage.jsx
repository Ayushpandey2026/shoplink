// src/pages/home/HomePage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, MapPin, Zap, Clock, Tag, X } from 'lucide-react'
import { Button, Input, Badge, Card, CardContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { ProductCard, ProductSkeleton, EmptyState, SectionHeader, PageWrapper } from '@/components/shared'
import { productAPI } from '@/services/api'
import { useLocationStore, useAuthStore } from '@/store'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthRequired } from '@/hooks/useAuthRequired'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'grocery', label: 'Grocery', emoji: '🛒' },
  { value: 'snacks', label: 'Snacks', emoji: '🍿' },
  { value: 'beverages', label: 'Beverages', emoji: '🧃' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'hardware', label: 'Hardware', emoji: '🔧' },
  { value: 'medicines', label: 'Medicines', emoji: '💊' },
  { value: 'cosmetics', label: 'Cosmetics', emoji: '💄' },
  { value: 'electronics', label: 'Electronics', emoji: '📱' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest First' },
  { value: 'sellingPrice', label: 'Price: Low to High' },
  { value: 'discountPercent', label: 'Best Discount' },
  { value: 'expiryDate', label: 'Expiring Soon' },
]

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { checkAuth } = useAuthRequired()
  const { latitude, longitude, requestLocation } = useLocationStore()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [radiusKm, setRadiusKm] = useState(10)

  const debouncedSearch = useDebounce(search, 400)

  // Request location on mount
  useEffect(() => {
    if (!latitude && !longitude) requestLocation()
  }, [])

  const fetchProducts = useCallback(async (resetPage = false) => {
    setLoading(true)
    try {
      const params = {
        page: resetPage ? 1 : page,
        limit: 20,
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(category && { category }),
        ...(latitude && longitude && { lat: latitude, lng: longitude, radiusKm }),
      }

      const res = await productAPI.getProducts(params)
      const { products: newProducts, pagination } = res.data

      if (resetPage) {
        setProducts(newProducts)
        setPage(1)
      } else {
        setProducts((prev) => [...prev, ...newProducts])
      }
      setHasMore(pagination.hasMore)
    } catch (err) {
      if (resetPage) setProducts([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, sortBy, sortOrder, latitude, longitude, radiusKm, page])

  // Reset and fetch on filter change
  useEffect(() => {
    fetchProducts(true)
  }, [debouncedSearch, category, sortBy, sortOrder, latitude, longitude])

  const loadMore = () => {
    if (!hasMore || loading) return
    setPage((p) => p + 1)
    fetchProducts(false)
  }

  const expiringProducts = products.filter(
    (p) => p.daysToExpiry != null && p.daysToExpiry <= 30 && p.daysToExpiry > 0
  )
  const bestDeals = products.filter((p) => p.discountPercent >= 20)

  return (
    <PageWrapper className="pb-24">
      {/* Search Bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur -mx-4 px-4 py-3 border-b mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('home.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Location indicator */}
        {latitude && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-orange-500" />
            <span>Showing products within {radiusKm} km</span>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 space-y-3 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium mb-1">Sort By</p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Radius</p>
                <Select value={String(radiusKm)} onValueChange={(v) => setRadiusKm(Number(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 5, 10, 20, 50].map((km) => (
                      <SelectItem key={km} value={String(km)}>{km} km</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setCategory('')}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
            !category ? 'bg-orange-500 text-white border-orange-500' : 'bg-background border-border text-foreground'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(category === cat.value ? '' : cat.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              category === cat.value
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-background border-border text-foreground'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expiring Soon Section */}
      {!search && !category && expiringProducts.length > 0 && (
        <div className="mb-6">
          <SectionHeader
            title={`⏰ ${t('home.expiring_soon')}`}
            onViewAll={() => navigate('/explore?filter=expiring')}
          />
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {expiringProducts.slice(0, 6).map((p) => (
              <div key={p._id} className="w-36 flex-shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Deals */}
      {!search && !category && bestDeals.length > 0 && (
        <div className="mb-6">
          <SectionHeader title={`🔥 ${t('home.best_deals')}`} />
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {bestDeals.slice(0, 6).map((p) => (
              <div key={p._id} className="w-36 flex-shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Products Grid */}
      <div className="mb-4">
        <SectionHeader
          title={search ? `Results for "${search}"` : `${t('home.new_listings')}`}
        />

        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title={t('home.no_products')}
            description="Try adjusting your filters or search query"
            action={() => { setSearch(''); setCategory('') }}
            actionLabel="Clear Filters"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loading} size="sm">
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
