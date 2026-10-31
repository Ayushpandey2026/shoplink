
// src/pages/product/ProductDetailPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MapPin, Star, Package, Truck, ShoppingBag,
  MessageCircle, Share2, ChevronLeft, CheckCircle2,
  AlertCircle, Store, Zap, BarChart2, Navigation
} from 'lucide-react'
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Avatar, AvatarImage, AvatarFallback, Separator,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Label
} from '@/components/ui'
import { PageLoader } from '@/components/shared'
import { productAPI, orderAPI, chatAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import LocationPicker from '@/components/map/LocationPicker'
import { getCurrentDeviceLocation, isValidCoordinates } from '@/utils/geolocation'
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
  const [buyerLocation, setBuyerLocation] = useState(null)
  const [buyerLocationProductId, setBuyerLocationProductId] = useState(null)
  const [buyerLocationDescription, setBuyerLocationDescription] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationCandidates, setLocationCandidates] = useState([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)
  const [distancePreview, setDistancePreview] = useState(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [distanceError, setDistanceError] = useState('')
  const [buyerLocationLoading, setBuyerLocationLoading] = useState(false)
  const [buyerLocationError, setBuyerLocationError] = useState('')
  const orderSubmissionInProgress = useRef(false)
  const locationSearchRequest = useRef(0)

  const selectBuyerLocation = (location, description = 'Map-selected location') => {
    setBuyerLocation(location)
    setBuyerLocationProductId(product?._id || null)
    setBuyerLocationDescription(description)
    setBuyerLocationError('')
    setDistanceError('')
    setDistancePreview(null)
    setDistanceLoading(false)
  }

  const resetPurchaseLocation = () => {
    locationSearchRequest.current += 1
    setBuyerLocation(null)
    setBuyerLocationProductId(null)
    setBuyerLocationDescription('')
    setLocationQuery('')
    setLocationCandidates([])
    setDistancePreview(null)
    setDistanceError('')
    setDistanceLoading(false)
    setBuyerLocationError('')
  }

  const handleOpenOrderDialog = () => {
    resetPurchaseLocation()
    setShowOrderDialog(true)
  }

  const handleSearchLocation = async (event) => {
    event.preventDefault()
    const query = locationQuery.trim()
    if (query.length < 3) {
      setBuyerLocationError('Enter at least 3 characters of an address, locality, city, or postal code.')
      return
    }
    const requestId = ++locationSearchRequest.current
    setLocationSearchLoading(true)
    setLocationCandidates([])
    setBuyerLocation(null)
    setBuyerLocationProductId(null)
    setBuyerLocationDescription('')
    setDistancePreview(null)
    setDistanceLoading(false)
    setBuyerLocationError('')
    try {
      const result = await orderAPI.searchLocation({ query })
      if (requestId === locationSearchRequest.current) {
        setLocationCandidates(result.data.candidates)
      }
    } catch (error) {
      if (requestId === locationSearchRequest.current) {
        setBuyerLocationError(error?.message || 'Address search is unavailable. Try the map or current location.')
      }
    } finally {
      if (requestId === locationSearchRequest.current) setLocationSearchLoading(false)
    }
  }

  const handleSelectMapLocation = (location) => {
    locationSearchRequest.current += 1
    setLocationSearchLoading(false)
    setLocationQuery('')
    setLocationCandidates([])
    selectBuyerLocation(location)
  }

  const handleSelectAddress = (candidate) => {
    locationSearchRequest.current += 1
    setLocationSearchLoading(false)
    selectBuyerLocation({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    }, candidate.address)
    setLocationCandidates([])
  }

  const handleLocateBuyer = async () => {
    if (buyerLocationLoading) return
    setBuyerLocationLoading(true)
    setBuyerLocationError('')
    setLocationCandidates([])
    try {
      const location = await getCurrentDeviceLocation()
      selectBuyerLocation(location, 'Current device location')
      try {
        const result = await orderAPI.reverseGeocode(location)
        if (result.data.address) setBuyerLocationDescription(result.data.address)
      } catch {
        setBuyerLocationDescription('Current device location')
      }
    } catch (error) {
      setBuyerLocationError(error.message)
    } finally {
      setBuyerLocationLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const loadProduct = async () => {
      try {
        const res = await productAPI.getProduct(id)
        if (!active) return
        const loadedProduct = res.data.product
        setProduct(loadedProduct)
        const minimumOrderQuantity = Math.max(1, Number(loadedProduct.minimumOrderQuantity) || 1)
        setQuantity(minimumOrderQuantity <= loadedProduct.availableQuantity ? minimumOrderQuantity : 1)
        if (!loadedProduct.deliveryOptions?.selfPickup) {
          setDeliveryType(loadedProduct.deliveryOptions?.normalDelivery ? 'normal' : 'urgent')
        }
      } catch {
        if (active) {
          toast.error('Product not found')
          navigate('/')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProduct()
    return () => { active = false }
  }, [id, navigate])

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

  useEffect(() => {
    if (!showOrderDialog || !product?.shop?._id || buyerLocationProductId !== product?._id || !isValidCoordinates(buyerLocation)) {
      return undefined
    }

    let active = true
    const timer = setTimeout(async () => {
      setDistanceLoading(true)
      setDistanceError('')
      try {
        const result = await orderAPI.previewDistance({
          shopId: product.shop._id,
          buyerLocation,
        })
        if (active) setDistancePreview(result.data)
      } catch (error) {
        if (active) {
          setDistancePreview(null)
          setDistanceError(error?.message || 'Unable to check distance. Try selecting your location again.')
        }
      } finally {
        if (active) setDistanceLoading(false)
      }
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [buyerLocation, buyerLocationProductId, product?._id, product?.shop?._id, showOrderDialog])

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) return navigate('/auth/login')
    if (orderSubmissionInProgress.current) return
    if (buyerLocationProductId !== product._id || !isValidCoordinates(buyerLocation)) {
      setBuyerLocationError('Capture your current location or search and confirm an address to continue.')
      return
    }
    if (distanceLoading || !distancePreview) {
      setDistanceError('Wait for the shop distance check to finish before continuing.')
      return
    }
    if (!distancePreview.eligible) {
      setDistanceError('This shop is outside the 50 km purchase area.')
      return
    }
    orderSubmissionInProgress.current = true
    setOrderLoading(true)
    try {
      const orderData = {
        shopId: product.shop._id,
        items: [{ productId: product._id, quantity }],
        deliveryType,
        buyerLocation,
        paymentMethod: 'online',
        ...(deliveryType !== 'self_pickup' && { deliveryAddress })
      }

      const res = await orderAPI.createOrder(orderData)
      const { order, razorpay } = res.data

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onerror = async () => {
        await orderAPI.cancelOrder(order._id, { reason: 'Razorpay checkout could not be loaded' }).catch(() => {})
        orderSubmissionInProgress.current = false
        setOrderLoading(false)
        toast.error('Unable to load Razorpay Checkout. Your stock reservation has been released.')
      }
      script.onload = () => {
        let paymentCallbackReceived = false
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
            paymentCallbackReceived = true
            try {
              await orderAPI.verifyPayment({
                orderId: order._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
              toast.success('Test payment verified and order confirmed.')
              orderSubmissionInProgress.current = false
              setOrderLoading(false)
              setShowOrderDialog(false)
              navigate('/orders')
            } catch {
              orderSubmissionInProgress.current = false
              setOrderLoading(false)
              toast.error('Payment verification is pending. Check your order status shortly.')
            }
          },
          modal: {
            ondismiss: async () => {
              if (!paymentCallbackReceived) {
                await orderAPI.cancelOrder(order._id, { reason: 'Checkout closed before payment' }).catch(() => {})
              }
              orderSubmissionInProgress.current = false
              setOrderLoading(false)
            }
          }
        })
        rzp.on('payment.failed', async () => {
          paymentCallbackReceived = true
          try {
            await orderAPI.markPaymentFailed(order._id)
          } catch {
            toast.error('The checkout will expire and release reserved stock automatically.')
          }
          orderSubmissionInProgress.current = false
          setOrderLoading(false)
          toast.error('Payment failed. No expense was recorded and reserved stock has been released.')
        })
        rzp.open()
      }
      document.body.appendChild(script)
    } catch (err) {
      orderSubmissionInProgress.current = false
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
  const minimumOrderQuantity = Math.max(1, Number(product.minimumOrderQuantity) || 1)
  const hasValidMinimumOrderQuantity = minimumOrderQuantity <= product.availableQuantity
  const canOrder = !isSeller && product.availableQuantity > 0 && product.status === 'active' && hasValidMinimumOrderQuantity

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ================= LEFT COLUMN: Image Gallery ================= */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="relative rounded-2xl overflow-hidden bg-muted border">
              <div className="aspect-square">
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

              {/* Back + Share Buttons */}
              <div className="absolute top-4 left-4 right-4 flex justify-between">
                <button
                  onClick={() => navigate(-1)}
                  className="h-9 w-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={handleShare}
                  className="h-9 w-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <Share2 className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Discount badge */}
              {product.discountPercent > 0 && (
                <div className="absolute top-4 left-14 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  {product.discountPercent}% OFF
                </div>
              )}
            </div>

            {/* Image thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activeImg === i ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: Details & Options ================= */}
          <div className="space-y-6">
            {/* Title, Brand, Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
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

              <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{product.name}</h1>
              {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 p-4 bg-muted/40 rounded-xl border">
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

            {/* Stock status */}
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

            {/* Desktop Action Buttons */}
            {!isSeller && (
              <div className="hidden lg:flex gap-4 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleStartChat}
                >
                  <MessageCircle className="h-5 w-5" />
                  {t('chat.start_chat')}
                </Button>
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  disabled={!canOrder}
                  onClick={() => canOrder && handleOpenOrderDialog()}
                >
                  <ShoppingBag className="h-5 w-5" />
                  {!canOrder ? t('product.sold_out') : t('order.buy_now')}
                </Button>
              </div>
            )}

            {/* Product Details Spec List */}
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
                  { label: 'MFG Date', value: product.manufacturingDate ? format(new Date(product.manufacturingDate), 'dd MMM yyyy') : null },
                  { label: 'Expiry Date', value: product.expiryDate ? format(new Date(product.expiryDate), 'dd MMM yyyy') : null },
                  { label: 'Min Order Qty', value: `${minimumOrderQuantity} ${product.unit}` },
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
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/shops/${product.shop?._id}`)}
            >
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

        </div>
      </div>

      {/* Bottom Action Bar (Visible on Mobile Only) */}
      {!isSeller && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 flex gap-3 pb-safe">
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
            onClick={() => canOrder && handleOpenOrderDialog()}
          >
            <ShoppingBag className="h-4 w-4" />
            {!canOrder ? t('product.sold_out') : t('order.buy_now')}
          </Button>
        </div>
      )}

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <section className="space-y-3 rounded-lg border p-3">
              <div>
                <Label>Choose your location</Label>
                <p className="text-xs text-muted-foreground">
                  Your location is used to check whether this shop is within 50 km.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-11"
                onClick={handleLocateBuyer}
                disabled={buyerLocationLoading || locationSearchLoading}
              >
                <Navigation className="h-4 w-4" />
                {buyerLocationLoading ? 'Getting current location…' : 'Capture Current Location'}
              </Button>
              <form onSubmit={handleSearchLocation} className="space-y-2">
                <Label htmlFor="buyer-location-search">Or enter an address, locality, city, or postal code</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="buyer-location-search"
                    autoComplete="street-address"
                    placeholder="e.g. 221B Baker Street, Varanasi"
                    value={locationQuery}
                    disabled={locationSearchLoading || buyerLocationLoading}
                    onChange={(event) => {
                      setLocationQuery(event.target.value)
                      locationSearchRequest.current += 1
                      setLocationCandidates([])
                      setBuyerLocation(null)
                      setBuyerLocationProductId(null)
                      setBuyerLocationDescription('')
                      setBuyerLocationError('')
                      setDistancePreview(null)
                      setDistanceError('')
                      setDistanceLoading(false)
                    }}
                  />
                  <Button type="submit" variant="outline" className="min-h-11 shrink-0" disabled={locationSearchLoading || buyerLocationLoading}>
                    {locationSearchLoading ? 'Searching…' : 'Find address'}
                  </Button>
                </div>
              </form>
              {locationCandidates.length > 0 && (
                <fieldset className="space-y-2" aria-label="Confirm a matching location">
                  <legend className="text-sm font-medium">Choose the matching location to confirm it</legend>
                  {locationCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className="w-full rounded-md border p-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      onClick={() => handleSelectAddress(candidate)}
                    >
                      {candidate.address}
                    </button>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Address search by OpenStreetMap contributors (Nominatim).
                  </p>
                </fieldset>
              )}
              {buyerLocation && (
                <div className="space-y-1 rounded-md bg-muted/50 p-3" aria-live="polite">
                  <p className="text-sm font-medium">Location confirmed</p>
                  <p className="text-xs text-muted-foreground">{buyerLocationDescription}</p>
                  <p className="text-xs text-muted-foreground">
                    {buyerLocation.latitude.toFixed(5)}, {buyerLocation.longitude.toFixed(5)}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {!buyerLocation && (
                  <p className="text-xs text-muted-foreground">
                    If address search is unavailable, zoom in on the map and select your exact location.
                  </p>
                )}
                <LocationPicker
                  location={buyerLocation}
                  onChange={handleSelectMapLocation}
                  label={buyerLocation ? 'Adjust the confirmed location on the map' : 'Select your location on the map'}
                  initialCenter={{ latitude: 22.5, longitude: 79 }}
                  initialZoom={5}
                />
              </div>
              {distanceLoading && (
                <p className="text-sm text-muted-foreground" role="status">Checking distance to the shop…</p>
              )}
              {distancePreview && !distanceLoading && (
                <p
                  className={`text-sm font-medium ${distancePreview.eligible ? 'text-green-700' : 'text-destructive'}`}
                  role="status"
                >
                  {distancePreview.distanceKm.toFixed(2)} km from the shop. {distancePreview.message}
                </p>
              )}
              {distanceError && <p role="alert" className="text-sm text-destructive">{distanceError}</p>}
              {buyerLocationError && <p role="alert" className="text-sm text-destructive">{buyerLocationError}</p>}
              <p className="text-xs text-muted-foreground">
                Map data © OpenStreetMap contributors. Selecting a map point confirms that location.
              </p>
            </section>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label>Quantity ({product.unit})</Label>
              {!hasValidMinimumOrderQuantity && (
                <p className="text-xs text-destructive">
                  This product cannot be ordered because its minimum order quantity exceeds available stock.
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(product.minimumOrderQuantity || 1, q - 1))}
                  disabled={!hasValidMinimumOrderQuantity || quantity <= minimumOrderQuantity}
                  className="h-9 w-9 rounded-lg border flex items-center justify-center font-bold hover:bg-muted"
                >
                  −
                </button>
                <span className="text-lg font-bold w-10 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(product.availableQuantity, q + 1))}
                  disabled={!hasValidMinimumOrderQuantity || quantity >= product.availableQuantity}
                  className="h-9 w-9 rounded-lg border flex items-center justify-center font-bold hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>

            {/* Delivery Type */}
            <div className="space-y-1.5">
              <Label>Delivery Type</Label>
              <div className="space-y-2">
                {product.deliveryOptions?.selfPickup && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${deliveryType === 'self_pickup' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value="self_pickup"
                      checked={deliveryType === 'self_pickup'}
                      onChange={() => setDeliveryType('self_pickup')}
                    />
                    <div>
                      <p className="text-sm font-medium">Self Pickup (Free)</p>
                      <p className="text-xs text-muted-foreground">{product.shop?.address?.city}</p>
                    </div>
                  </label>
                )}
                {product.deliveryOptions?.normalDelivery && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${deliveryType === 'normal' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value="normal"
                      checked={deliveryType === 'normal'}
                      onChange={() => setDeliveryType('normal')}
                    />
                    <div>
                      <p className="text-sm font-medium">Normal Delivery</p>
                      <p className="text-xs text-muted-foreground">₹{product.shop?.settings?.normalDeliveryCharge || 20} • 1-2 days</p>
                    </div>
                  </label>
                )}
                {product.deliveryOptions?.urgentDelivery && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${deliveryType === 'urgent' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value="urgent"
                      checked={deliveryType === 'urgent'}
                      onChange={() => setDeliveryType('urgent')}
                    />
                    <div>
                      <p className="text-sm font-medium">Urgent Delivery</p>
                      <p className="text-xs text-muted-foreground">₹{product.shop?.settings?.urgentDeliveryCharge || 50} • Same day</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Delivery address fields */}
            {deliveryType !== 'self_pickup' && (
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Recipient name"
                    value={deliveryAddress.name}
                    onChange={e => setDeliveryAddress(a => ({ ...a, name: e.target.value }))}
                  />
                  <Input
                    placeholder="10-digit phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={deliveryAddress.phone}
                    onChange={e => setDeliveryAddress(a => ({ ...a, phone: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <Input
                  placeholder="Address"
                  value={deliveryAddress.addressLine}
                  onChange={e => setDeliveryAddress(a => ({ ...a, addressLine: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={deliveryAddress.city}
                    onChange={e => setDeliveryAddress(a => ({ ...a, city: e.target.value }))}
                  />
                  <Input
                    placeholder="State"
                    value={deliveryAddress.state}
                    onChange={e => setDeliveryAddress(a => ({ ...a, state: e.target.value }))}
                  />
                  <Input
                    placeholder="Pincode"
                    maxLength={6}
                    value={deliveryAddress.pincode}
                    onChange={e => setDeliveryAddress(a => ({ ...a, pincode: e.target.value }))}
                  />
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
              Razorpay test mode. This payment does not transfer funds to the seller.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder} disabled={orderLoading || buyerLocationLoading || locationSearchLoading || distanceLoading || buyerLocationProductId !== product._id || !isValidCoordinates(buyerLocation) || !distancePreview?.eligible || !hasValidMinimumOrderQuantity} className="flex-1">
              {orderLoading ? 'Processing...' : `Pay ₹${product.sellingPrice * quantity + (deliveryType === 'self_pickup' ? 0 : deliveryType === 'urgent' ? (product.shop?.settings?.urgentDeliveryCharge || 50) : (product.shop?.settings?.normalDeliveryCharge || 20))}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}