// src/pages/product/MyProductsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Package, Edit2, Trash2, Eye, AlertCircle, TrendingUp } from 'lucide-react'
import { Button, Badge, Card, CardContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { EmptyState, PageWrapper, LoadingSpinner, orderStatusVariant } from '@/components/shared'
import { productAPI } from '@/services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const listingTypeColor = { dead_stock: 'destructive', excess_inventory: 'warning', clearance: 'blue', regular: 'success' }

export default function MyProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchProducts() }, [statusFilter])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await productAPI.getMyProducts({ limit: 100, ...(statusFilter && { status: statusFilter }) })
      setProducts(res.data.products || [])
    } catch { setProducts([]) } finally { setLoading(false) }
  }

  const handleDelete = async (productId) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeleting(productId)
    try {
      await productAPI.deleteProduct(productId)
      toast.success('Product deleted')
      setProducts(prev => prev.filter(p => p._id !== productId))
    } catch { toast.error('Failed to delete') } finally { setDeleting(null) }
  }

  const daysToExpiry = (expiryDate) => expiryDate
    ? Math.ceil((new Date(expiryDate) - new Date()) / 86400000) : null

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">My Products</h1>
        <Button size="sm" onClick={() => navigate('/sell/add')} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add New
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold_out">Sold Out</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSpinner className="py-12" /> : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products listed"
          description="Start listing your dead stock to sell locally"
          action={() => navigate('/sell/add')}
          actionLabel="List First Product"
        />
      ) : (
        <div className="space-y-3">
          {products.map(product => {
            const expiry = daysToExpiry(product.expiryDate)
            const isExpiringSoon = expiry !== null && expiry <= 30 && expiry > 0
            const isExpired = expiry !== null && expiry <= 0

            return (
              <Card key={product._id} className={isExpired ? 'border-red-200 dark:border-red-900' : ''}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0].url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-tight truncate">{product.name}</p>
                        <Badge variant={product.status === 'active' ? 'success' : product.status === 'expired' ? 'destructive' : 'secondary'} className="text-[10px] flex-shrink-0">
                          {product.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-600">₹{product.sellingPrice}</span>
                        {product.mrp > product.sellingPrice && (
                          <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
                        )}
                        <Badge variant={listingTypeColor[product.listingType] || 'secondary'} className="text-[10px]">
                          {product.listingType?.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Qty: {product.availableQuantity}/{product.quantity} {product.unit}</span>
                        <span>👁 {product.views}</span>
                        <span>Sold: {product.totalSold}</span>
                      </div>

                      {/* Expiry warning */}
                      {isExpired && (
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          <span>Expired on {format(new Date(product.expiryDate), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                      {isExpiringSoon && !isExpired && (
                        <div className="flex items-center gap-1 text-xs text-orange-500">
                          <AlertCircle className="h-3 w-3" />
                          <span>Expires in {expiry} days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3 pt-2 border-t">
                    <Button
                      variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs h-8"
                      onClick={() => navigate(`/products/${product._id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs h-8"
                      onClick={() => navigate(`/sell/edit/${product._id}`)}
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs h-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(product._id)}
                      disabled={deleting === product._id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting === product._id ? '...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
