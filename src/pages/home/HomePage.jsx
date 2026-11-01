// src/pages/home/HomePage.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { ProductCard, ProductSkeleton, EmptyState, ErrorState, SectionHeader, PageWrapper } from '@/components/shared'
import { productAPI } from '@/services/api'
import { useDebounce } from '@/hooks/useDebounce'

const PRODUCT_FETCH_ATTEMPTS = 3

const isTransientProductError = (error) => {
  const status = error?.httpStatus ?? error?.response?.status
  if (status) return status === 429 || status >= 500
  return ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(error?.code)
}

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

const getSavedFeed = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem('shoplink-home-feed') || 'null')
    return saved && Date.now() - saved.savedAt < 5 * 60 * 1000 ? saved : null
  } catch {
    return null
  }
}

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [savedFeed] = useState(getSavedFeed)
  const [products, setProducts] = useState(() => savedFeed?.products || [])
  const [loading, setLoading] = useState(() => !savedFeed)
  const [loadingMore, setLoadingMore] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [page, setPage] = useState(() => savedFeed?.page || 1)
  const [cursor, setCursor] = useState(() => savedFeed?.cursor || null)
  const [hasMore, setHasMore] = useState(() => savedFeed?.hasMore ?? true)
  const [search, setSearch] = useState(() => savedFeed?.search || '')
  const [category, setCategory] = useState(() => savedFeed?.category || '')
  const [sortBy, setSortBy] = useState(() => savedFeed?.sortBy || 'createdAt')
  const sortOrder = 'desc'
  const [showFilters, setShowFilters] = useState(false)
  const requestIdRef = useRef(0)
  const abortControllerRef = useRef(null)
  const inFlightRef = useRef(null)
  const sentinelRef = useRef(null)
  const pageRef = useRef(savedFeed?.page || 1)
  const cursorRef = useRef(savedFeed?.cursor || null)

  const debouncedSearch = useDebounce(search, 400)
  const fetchProducts = useCallback(async (resetPage = false) => {
    if (!resetPage && inFlightRef.current) return
    const requestId = ++requestIdRef.current
    if (resetPage) abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    inFlightRef.current = requestId
    if (resetPage) setLoading(true)
    else setLoadingMore(true)
    setProductsError('')
    try {
      const cursorMode = sortBy !== 'expiryDate'
      const params = {
        limit: 12,
        sortBy,
        sortOrder,
        ...(cursorMode
          ? { pagination: 'cursor', ...(!resetPage && cursorRef.current && { cursor: cursorRef.current }) }
          : { page: resetPage ? 1 : pageRef.current + 1 }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(category && { category }),
      }

      let res
      for (let attempt = 0; attempt < PRODUCT_FETCH_ATTEMPTS; attempt += 1) {
        try {
          res = await productAPI.getProducts(params, { signal: abortController.signal })
          break
        } catch (error) {
          const isCanceled = abortController.signal.aborted
            || error?.name === 'CanceledError'
            || error?.name === 'AbortError'
          if (isCanceled || !isTransientProductError(error) || attempt === PRODUCT_FETCH_ATTEMPTS - 1) {
            throw error
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          if (abortController.signal.aborted) return
        }
      }

      const responseData = res?.data
      const newProducts = responseData?.products
      const pagination = responseData?.pagination

      if (!Array.isArray(newProducts) || !pagination || (cursorMode && pagination.hasMore && !pagination.nextCursor)) {
        throw new Error('Invalid product list response')
      }

      if (requestId !== requestIdRef.current) return

      if (resetPage) {
        setProducts(newProducts)
        setPage(1)
        pageRef.current = 1
        cursorRef.current = null
      } else {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((product) => product._id))
          const uniqueProducts = newProducts.filter((product) => {
            if (existingIds.has(product._id)) return false
            existingIds.add(product._id)
            return true
          })
          return [...prev, ...uniqueProducts]
        })
        setPage((currentPage) => {
          pageRef.current = currentPage + 1
          return currentPage + 1
        })
      }
      const nextCursor = cursorMode ? pagination.nextCursor : null
      cursorRef.current = nextCursor
      setCursor(nextCursor)
      setHasMore(pagination.hasMore)
    } catch (err) {
      const isCanceled = abortController.signal.aborted
        || err?.name === 'CanceledError'
        || err?.name === 'AbortError'
      if (!isCanceled && requestId === requestIdRef.current) {
        setProductsError(err?.message || 'Unable to load products. Please try again.')
        if (resetPage) {
          setProducts([])
          setHasMore(false)
        }
      }
    } finally {
      if (inFlightRef.current === requestId) inFlightRef.current = null
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [debouncedSearch, category, sortBy, sortOrder])

  useEffect(() => {
    if (!savedFeed) return undefined

    const savedScrollY = Number(sessionStorage.getItem('shoplink-home-feed-scroll') || savedFeed.scrollY || 0)
    window.requestAnimationFrame(() => window.scrollTo(0, savedScrollY))
    sessionStorage.removeItem('shoplink-home-feed-scroll')
    return () => abortControllerRef.current?.abort()
  }, [savedFeed])

  useEffect(() => {
    const snapshot = {
      savedAt: Date.now(),
      scrollY: window.scrollY,
      products,
      page,
      cursor,
      hasMore,
      search,
      category,
      sortBy,
    }
    try {
      sessionStorage.setItem('shoplink-home-feed', JSON.stringify(snapshot))
    } catch {
      // Storage can be unavailable or full; the in-memory feed still works.
    }
  }, [products, page, cursor, hasMore, search, category, sortBy])

  useEffect(() => {
    if (savedFeed && (debouncedSearch === savedFeed.search)
      && category === savedFeed.category && sortBy === savedFeed.sortBy) return
    const initialFetch = window.setTimeout(() => fetchProducts(true), 0)
    return () => {
      window.clearTimeout(initialFetch)
      abortControllerRef.current?.abort()
    }
  }, [debouncedSearch, category, sortBy, fetchProducts, savedFeed])

  useEffect(() => {
    const refreshVisibleFeed = () => {
      if (document.visibilityState === 'visible' && pageRef.current === 1) fetchProducts(true)
    }
    const refreshInterval = window.setInterval(refreshVisibleFeed, 30000)
    window.addEventListener('focus', refreshVisibleFeed)
    document.addEventListener('visibilitychange', refreshVisibleFeed)

    return () => {
      abortControllerRef.current?.abort()
      window.clearInterval(refreshInterval)
      window.removeEventListener('focus', refreshVisibleFeed)
      document.removeEventListener('visibilitychange', refreshVisibleFeed)
    }
  }, [fetchProducts])

  useEffect(() => {
    if (!hasMore || loading || loadingMore || productsError || !sentinelRef.current) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchProducts(false)
    }, { rootMargin: '400px 0px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchProducts, hasMore, loading, loadingMore, productsError])

  const loadMore = () => fetchProducts(false)

  const safeProducts = Array.isArray(products)
    ? products.filter((product) => product && typeof product === 'object')
    : []
  const expiringProducts = safeProducts.filter(
    (p) => p.daysToExpiry != null && p.daysToExpiry <= 30 && p.daysToExpiry > 0
  )
  const bestDeals = safeProducts.filter((p) => p.discountPercent >= 20)

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
              <div key={p._id} className="w-56 flex-shrink-0">
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

        {loading && safeProducts.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : productsError && safeProducts.length === 0 ? (
          <ErrorState message={productsError} onRetry={() => fetchProducts(true)} />
        ) : safeProducts.length === 0 ? (
          <EmptyState
            title={t('home.no_products')}
            description="Try adjusting your filters or search query"
            action={() => { setSearch(''); setCategory('') }}
            actionLabel="Clear Filters"
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {safeProducts.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>

            {productsError ? (
              <ErrorState
                message={productsError}
                onRetry={() => fetchProducts(false)}
              />
            ) : hasMore ? (
              <div className="mt-4 text-center">
                <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                {loadingMore && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={index} />)}
                  </div>
                )}
                <Button variant="outline" onClick={loadMore} disabled={loadingMore} size="sm" className="mt-3">
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-muted-foreground" role="status">
                You&apos;ve reached the end of the listings.
              </p>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
