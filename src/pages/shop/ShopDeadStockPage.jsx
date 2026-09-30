import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, PackageSearch } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { ProductCard } from '@/components/shared'
import { productAPI, shopAPI } from '@/services/api'

const formatINR = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value || 0))

export default function ShopDeadStockPage() {
  const { shopId } = useParams()
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        setLoading(true)
        setError('')

        const [shopRes, productRes] = await Promise.all([
          shopAPI.getShopById(shopId),
          productAPI.getProducts({ shopId, limit: 50 }, { signal: controller.signal }),
        ])

        setShop(shopRes?.data?.shop || null)
        setProducts(productRes?.data?.products || [])
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') {
          setError('Unable to load this shop’s available stock.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()

    return () => controller.abort()
  }, [shopId])

  const totalValue = products.reduce((sum, product) => sum + ((Number(product.availableQuantity) || 0) * Number(product.sellingPrice || 0)), 0)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading available stock...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>
      </div>

      {error ? (
        <Card className="mb-6">
          <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : null}

      {shop && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{shop.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-orange-500" />{shop.address?.city}</span>
              <span>📦 {products.length} products available</span>
              <span>💰 {formatINR(totalValue)} stock value</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <PackageSearch className="h-4 w-4 text-orange-500" />
        Available dead stock
      </div>

      {products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No available dead stock is currently listed by this shop.</CardContent>
        </Card>
      )}
    </div>
  )
}
