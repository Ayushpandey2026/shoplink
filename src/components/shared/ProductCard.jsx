// src/components/shared/ProductCard.jsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Clock, Star, Package } from 'lucide-react'
import { Card, CardContent, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

export const ProductCard = ({ product, className }) => {
  const { t } = useTranslation()

  const primaryImage = product.images?.find((i) => i.isPrimary) || product.images?.[0]
  const daysToExpiry = product.daysToExpiry ??
    (product.expiryDate
      ? Math.ceil((new Date(product.expiryDate) - new Date()) / 86400000)
      : null)

  const getExpiryBadge = () => {
    if (!daysToExpiry && daysToExpiry !== 0) return null
    if (daysToExpiry <= 0) return <Badge variant="destructive">Expired</Badge>
    if (daysToExpiry <= 7) return <Badge variant="destructive">{daysToExpiry}d left</Badge>
    if (daysToExpiry <= 15) return <Badge variant="warning">{daysToExpiry}d left</Badge>
    if (daysToExpiry <= 30) return <Badge variant="blue">{daysToExpiry}d left</Badge>
    return null
  }

  return (
    <Link to={`/products/${product._id}`}>
      <Card className={cn('overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99]', className)}>
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Discount Badge */}
          {product.discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
              {product.discountPercent}% OFF
            </div>
          )}

          {/* Sold Out Overlay */}
          {product.availableQuantity <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{t('product.sold_out')}</span>
            </div>
          )}

          {/* Expiry Badge */}
          <div className="absolute top-2 right-2">{getExpiryBadge()}</div>
        </div>

        <CardContent className="p-3 space-y-1">
          {/* Name */}
          <p className="font-medium text-sm leading-tight line-clamp-2">{product.name}</p>

          {/* Brand */}
          {product.brand && (
            <p className="text-xs text-muted-foreground">{product.brand}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-orange-600">₹{product.sellingPrice}</span>
            {product.mrp > product.sellingPrice && (
              <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
            )}
          </div>

          {/* Shop + Distance */}
          {product.shop && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{product.shop?.name}</span>
              {product.shop?.rating?.average > 0 && (
                <span className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {product.shop.rating.average.toFixed(1)}
                </span>
              )}
            </div>
          )}

          {/* Stock left */}
          {product.availableQuantity > 0 && product.availableQuantity <= 10 && (
            <p className="text-xs text-orange-500 font-medium">
              Only {product.availableQuantity} left!
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
