import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { ProductCard, ProductSkeleton } from '@/components/shared'
import { productAPI } from '@/services/api'

export default function ProductRecommendations({ productId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const sentinelRef = useRef(null)
  const requestId = useRef(0)
  const cursorRef = useRef(null)
  const inFlightRef = useRef(false)

  const fetchRecommendations = useCallback(async (reset = false) => {
    if (!reset && inFlightRef.current) return
    inFlightRef.current = true
    const currentRequest = ++requestId.current
    if (reset) {
      cursorRef.current = null
      setCursor(null)
      setLoading(true)
      setProducts([])
    } else {
      setLoadingMore(true)
    }
    setError('')
    try {
      const response = await productAPI.getRecommendations(productId, {
        limit: 8,
        ...(!reset && cursorRef.current && { cursor: cursorRef.current }),
      })
      if (requestId.current !== currentRequest) return
      const result = response.data
      if (
        !Array.isArray(result?.products)
        || !result.pagination
        || (result.pagination.hasMore && !result.pagination.nextCursor)
      ) {
        throw new Error('Invalid recommendations response.')
      }
      setProducts((current) => {
        if (reset) return result.products
        const ids = new Set(current.map((item) => item._id))
        return [...current, ...result.products.filter((item) => !ids.has(item._id))]
      })
      cursorRef.current = result.pagination.nextCursor || null
      setCursor(cursorRef.current)
      setHasMore(Boolean(result.pagination.hasMore))
    } catch (fetchError) {
      if (requestId.current === currentRequest) {
        setError(fetchError?.message || 'Similar products could not be loaded.')
        if (reset) setProducts([])
      }
    } finally {
      if (requestId.current === currentRequest) {
        inFlightRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [productId])

  useEffect(() => {
    const timer = window.setTimeout(() => fetchRecommendations(true), 0)
    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
    }
  }, [fetchRecommendations])

  useEffect(() => {
    if (!hasMore || loading || loadingMore || error || !sentinelRef.current) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchRecommendations(false)
    }, { rootMargin: '350px 0px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchRecommendations, hasMore, loading, loadingMore, error, cursor])

  return (
    <section aria-labelledby={`recommendations-heading-${productId}`} className="space-y-4">
      <div>
        <h2 id={`recommendations-heading-${productId}`} className="text-xl font-bold">You May Also Like</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Related listings selected by category, product details, and price.
        </p>
      </div>

      {loading && products.length === 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={index} />)}
        </div>
      )}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3">
          <p className="text-sm text-destructive" role="alert">{error}</p>
          <Button size="sm" variant="outline" onClick={() => fetchRecommendations(products.length === 0)}>
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && products.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No similar products are available right now.
        </p>
      )}
      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((recommendedProduct) => (
            <ProductCard key={recommendedProduct._id} product={recommendedProduct} />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="text-center">
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          {loadingMore && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={index} />)}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={loadingMore}
            onClick={() => fetchRecommendations(false)}
          >
            {loadingMore ? 'Loading…' : 'Load more similar products'}
          </Button>
        </div>
      )}
    </section>
  )
}
