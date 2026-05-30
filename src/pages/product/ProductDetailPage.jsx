// src/pages/product/ProductDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MapPin, Star, Clock, Package, Truck, ShoppingBag,
  MessageCircle, Share2, ChevronLeft, CheckCircle2,
  AlertCircle, Store, Zap, BarChart2
} from 'lucide-react'
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Avatar, AvatarImage, AvatarFallback, Separator,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, Label
} from '@/components/ui'
import { PageLoader, EmptyState, LoadingSpinner } from '@/components/shared'
import { productAPI, orderAPI, chatAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState('self_pickup')
  const [deliveryAddress, setDeliveryAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine: '', city: '', state: '', pincode: ''
  })

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const res = await productAPI.getProduct(id)
      setProduct(res.data.product)
      // Set initial delivery type based on shop settings
      if (!res.data.product.deliveryOptions?.selfPickup) {
        setDeliveryType('normal')
      }
    } catch {
      toast.error('Product not found')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = async () => {
    if (!isAuthenticated) return navigate('/auth/login')
    try {
      const res = await chatAPI.getOrCreateConversation({
        participantId: product.seller._id,
        productId: product._id,
        shopId: product.shop._id
      })
      navigate(`/chat/${res.data.conversation._id}`)
    } catch {
      toast.error('Could not start chat')
    }
  }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) return navigate('/auth/login')
    setOrderLoading(true)
    try {
      const orderData = {
        shopId: product.shop._id,
        items: [{ productId: product._id, quantity }],
        deliveryType,
        buyerNote: '',
        paymentMethod: 'online',
        ...(deliveryType !== 'self_pickup' && { deliveryAddress })
      }

      const res = await orderAPI.createOrder(orderData)
      const { order, razorpay } = res.data

      // Load Razorpay script & open checkout
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.body.appendChild(script)
      script.onload = () => {
        const rzp = new window.Razorpay({
          key: razorpay.key,
          amount: razorpay.amount,
          currency: razorpay.currency,
          order_id: razorpay.orderId,
          name: 'ShopLink',
          description: `Order #${order.orderNumber}`,
          prefill: { name: user?.name, contact: user?.phone },
          theme: { color: '#f97316' },
          handler: async (response) => {
            try {
              await orderAPI.verifyPayment({
                orderId: order._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
              toast.success('Order placed successfully! 🎉')
              setShowOrderDialog(false)
              navigate('/orders')
            } catch {
              toast.error('Payment verification failed')
            }
          },
          modal: { ondismiss: () => setOrderLoading(false) }
        })
        rzp.open()
        setOrderLoading(false)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to place order')
      setOrderLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: product.name, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  const daysToExpiry = product?.expiryDate
    ? Math.ceil((new Date(product.expiryDate) - new Date()) / 86400000)
    : null

  if (loading) return <PageLoader />
  if (!product) return null

  const isSeller = user?._id === product.seller?._id
  const canOrder = !isSeller && product.availableQuantity > 0 && product.status === 'active'

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Image Gallery */}
      <div className="relative">
        <div className="aspect-square bg-muted overflow-hidden">
          {product.images?.length > 0 ? (
            <img
              src={product.images[activeImg]?.url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Back + Share */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={handleShare}
            className="h-9 w-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
          >
            <Share2 className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Discount badge */}
        {product.discountPercent > 0 && (
          <div className="absolute top-4 left-14 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {product.discountPercent}% OFF
          </div>
        )}

        {/* Image thumbnails */}
        {product.images?.length > 1 && (
          <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                  activeImg === i ? 'border-orange-500' : 'border-transparent'
                }`}
              >
                <img src={img.url} className="h-full w-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Name, Brand, Badges */}
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className="capitalize text-xs">{product.category}</Badge>
            {product.listingType !== 'regular' && (
              <Badge variant="default" className="text-xs capitalize">
                {product.listingType?.replace('_', ' ')}
              </Badge>
            )}
            {daysToExpiry !== null && daysToExpiry <= 30 && (
              <Badge variant={daysToExpiry <= 7 ? 'destructive' : 'warning'} className="text-xs">
                ⏰ {daysToExpiry <= 0 ? 'Expired' : `Expires in ${daysToExpiry}d`}
              </Badge>
            )}
          </div>

          <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
          {product.brand && <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>}
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-orange-600">₹{product.sellingPrice}</span>
          {product.mrp > product.sellingPrice && (
            <>
              <span className="text-lg text-muted-foreground line-through">₹{product.mrp}</span>
              <span className="text-sm font-semibold text-green-600">
                Save ₹{product.mrp - product.sellingPrice}
              </span>
            </>
          )}
        </div>

        {/* Stock */}
        <div className="flex items-center gap-2">
          {product.availableQuantity > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">
                {product.availableQuantity <= 10
                  ? `Only ${product.availableQuantity} ${product.unit}(s) left!`
                  : `${product.availableQuantity} ${product.unit}(s) in stock`}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">{t('product.sold_out')}</span>
            </>
          )}
        </div>

        {/* Product Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-orange-500" />
              {t('product.details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {[
              { label: 'Barcode', value: product.barcode },
              { label: 'Weight', value: product.weight ? `${product.weight.value} ${product.weight.unit}` : null },
              { label: 'MFG Date', value: product.manufacturingDate ? format(new Date(product.manufacturingDate), 'dd MMM yyyy') : null },
              { label: 'Expiry Date', value: product.expiryDate ? format(new Date(product.expiryDate), 'dd MMM yyyy') : null },
              { label: 'Min Order Qty', value: product.minimumOrderQuantity ? `${product.minimumOrderQuantity} ${product.unit}` : null },
              { label: 'Min Order Value', value: product.minimumOrderValue > 0 ? `₹${product.minimumOrderValue}` : null },
              { label: 'Listed', value: formatDistanceToNow(new Date(product.createdAt), { addSuffix: true }) }
            ].filter(i => i.value).map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Description */}
        {product.description && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed">{product.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Delivery Options */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" /> Delivery Options
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {product.deliveryOptions?.selfPickup && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Self Pickup (Free)</span>
              </div>
            )}
            {product.deliveryOptions?.normalDelivery && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Normal Delivery — ₹{product.shop?.settings?.normalDeliveryCharge || 20}</span>
              </div>
            )}
            {product.deliveryOptions?.urgentDelivery && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-orange-500" />
                <span>Urgent Delivery — ₹{product.shop?.settings?.urgentDeliveryCharge || 50}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller / Shop Info */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(`/shops/${product.shop?._id}`)}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 rounded-xl">
                <AvatarImage src={product.shop?.logo?.url} />
                <AvatarFallback className="rounded-xl text-sm">
                  {product.shop?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate">{product.shop?.name}</p>
                  {product.shop?.isVerified && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{product.shop?.address?.city}, {product.shop?.address?.state}</span>
                </div>
                {product.shop?.rating?.count > 0 && (
                  <div className="flex items-center gap-1 text-xs mt-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{product.shop.rating.average.toFixed(1)}</span>
                    <span className="text-muted-foreground">({product.shop.rating.count} reviews)</span>
                  </div>
                )}
              </div>
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Action Bar */}
      {!isSeller && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 flex gap-3 pb-safe">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleStartChat}
          >
            <MessageCircle className="h-4 w-4" />
            {t('chat.start_chat')}
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!canOrder}
            onClick={() => canOrder && setShowOrderDialog(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            {!canOrder ? t('product.sold_out') : t('order.buy_now')}
          </Button>
        </div>
      )}

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quantity */}
            <div className="space-y-1.5">
              <Label>Quantity ({product.unit})</Label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(product.minimumOrderQuantity || 1, q - 1))}
                  className="h-9 w-9 rounded-lg border flex items-center justify-center font-bold"
                >−</button>
                <span className="text-lg font-bold w-10 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.availableQuantity, q + 1))}
                  className="h-9 w-9 rounded-lg border flex items-center justify-center font-bold"
                >+</button>
              </div>
            </div>

            {/* Delivery Type */}
            <div className="space-y-1.5">
              <Label>Delivery Type</Label>
              <div className="space-y-2">
                {product.deliveryOptions?.selfPickup && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${deliveryType === 'self_pickup' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                    <input type="radio" name="delivery" value="self_pickup" checked={deliveryType === 'self_pickup'} onChange={() => setDeliveryType('self_pickup')} />
                    <div>
                      <p className="text-sm font-medium">Self Pickup (Free)</p>
                      <p className="text-xs text-muted-foreground">{product.shop?.address?.city}</p>
                    </div>
                  </label>
                )}
                {product.deliveryOptions?.normalDelivery && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${deliveryType === 'normal' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                    <input type="radio" name="delivery" value="normal" checked={deliveryType === 'normal'} onChange={() => setDeliveryType('normal')} />
                    <div>
                      <p className="text-sm font-medium">Normal Delivery</p>
                      <p className="text-xs text-muted-foreground">₹{product.shop?.settings?.normalDeliveryCharge || 20} • 1-2 days</p>
                    </div>
                  </label>
                )}
                {product.deliveryOptions?.urgentDelivery && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${deliveryType === 'urgent' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                    <input type="radio" name="delivery" value="urgent" checked={deliveryType === 'urgent'} onChange={() => setDeliveryType('urgent')} />
                    <div>
                      <p className="text-sm font-medium">Urgent Delivery</p>
                      <p className="text-xs text-muted-foreground">₹{product.shop?.settings?.urgentDeliveryCharge || 50} • Same day</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Delivery address fields for non-pickup */}
            {deliveryType !== 'self_pickup' && (
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Input placeholder="Address" value={deliveryAddress.addressLine} onChange={e => setDeliveryAddress(a => ({ ...a, addressLine: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="City" value={deliveryAddress.city} onChange={e => setDeliveryAddress(a => ({ ...a, city: e.target.value }))} />
                  <Input placeholder="Pincode" maxLength={6} value={deliveryAddress.pincode} onChange={e => setDeliveryAddress(a => ({ ...a, pincode: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{product.sellingPrice * quantity}</span>
              </div>
              {deliveryType !== 'self_pickup' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>₹{deliveryType === 'urgent' ? (product.shop?.settings?.urgentDeliveryCharge || 50) : (product.shop?.settings?.normalDeliveryCharge || 20)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-600">
                  ₹{product.sellingPrice * quantity + (deliveryType === 'self_pickup' ? 0 : deliveryType === 'urgent' ? (product.shop?.settings?.urgentDeliveryCharge || 50) : (product.shop?.settings?.normalDeliveryCharge || 20))}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              🔒 {t('order.escrow_note')}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={orderLoading} className="flex-1">
              {orderLoading ? 'Processing...' : `Pay ₹${product.sellingPrice * quantity}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
