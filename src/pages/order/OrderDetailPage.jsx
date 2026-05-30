// src/pages/order/OrderDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2, Circle, Clock, Package, Truck, Home,
  ChevronLeft, MessageCircle, Star, Phone, MapPin, AlertCircle
} from 'lucide-react'
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Separator, Textarea, Label
} from '@/components/ui'
import { PageLoader, LoadingSpinner, orderStatusVariant } from '@/components/shared'
import { orderAPI, reviewAPI, chatAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_STEPS = ['pending','accepted','packed','dispatched','delivered','completed']
const stepIcon = { pending: Clock, accepted: CheckCircle2, packed: Package, dispatched: Truck, delivered: Home, completed: CheckCircle2 }

export default function OrderDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  useEffect(() => { fetchOrder() }, [id])

  const fetchOrder = async () => {
    try {
      const res = await orderAPI.getOrder(id)
      setOrder(res.data.order)
    } catch { navigate('/orders') } finally { setLoading(false) }
  }

  const handleStatusUpdate = async (status, note = '') => {
    setUpdating(true)
    try {
      await orderAPI.updateStatus(id, { status, note })
      toast.success(`Order ${status} successfully`)
      fetchOrder()
    } catch { toast.error('Failed to update status') } finally { setUpdating(false) }
  }

  const handleConfirmDelivery = async () => {
    await handleStatusUpdate('completed', 'Delivery confirmed by buyer')
  }

  const handleCancelOrder = async () => {
    if (!confirm(t('order.confirm_cancel'))) return
    setUpdating(true)
    try {
      await orderAPI.cancelOrder(id, { reason: 'Cancelled by buyer' })
      toast.success('Order cancelled')
      fetchOrder()
    } catch { toast.error('Cannot cancel this order') } finally { setUpdating(false) }
  }

  const handleSubmitReview = async () => {
    setReviewSubmitting(true)
    try {
      await reviewAPI.createReview({ orderId: id, rating, comment })
      toast.success('Review submitted!')
      setShowReview(false)
      fetchOrder()
    } catch { toast.error('Failed to submit review') } finally { setReviewSubmitting(false) }
  }

  const handleStartChat = async () => {
    try {
      const otherParty = isBuyer ? order.seller._id : order.buyer._id
      const res = await chatAPI.getOrCreateConversation({
        participantId: otherParty,
        shopId: order.shop._id
      })
      navigate(`/chat/${res.data.conversation._id}`)
    } catch { toast.error('Could not start chat') }
  }

  if (loading) return <PageLoader />
  if (!order) return null

  const isBuyer = order.buyer?._id === user?._id || order.buyer === user?._id
  const isSeller = order.seller?._id === user?._id || order.seller === user?._id
  const currentStepIdx = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <button onClick={() => navigate('/orders')}><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <p className="font-bold text-sm">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</p>
        </div>
        <Badge variant={orderStatusVariant(order.status)} className="capitalize">
          {t(`order.status.${order.status}`) || order.status}
        </Badge>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Order Timeline */}
        {!['rejected','cancelled','refunded','refund_init'].includes(order.status) && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Order Progress</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = stepIcon[step] || Circle
                  const isDone = idx <= currentStepIdx
                  const isCurrent = idx === currentStepIdx
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        isDone ? 'bg-orange-500 border-orange-500' : 'bg-background border-border'
                      }`}>
                        <Icon className={`h-4 w-4 ${isDone ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm capitalize ${isCurrent ? 'font-bold text-orange-600' : isDone ? 'font-medium' : 'text-muted-foreground'}`}>
                          {t(`order.status.${step}`) || step}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground">Current status</p>
                        )}
                      </div>
                      {isCurrent && <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected / Cancelled */}
        {['rejected','cancelled'].includes(order.status) && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-red-600 capitalize">Order {order.status}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.rejectionReason || order.cancellationReason || 'No reason provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seller Action Buttons */}
        {isSeller && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Seller Actions</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {order.status === 'pending' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="success" disabled={updating} onClick={() => handleStatusUpdate('accepted')}>
                    ✅ Accept Order
                  </Button>
                  <Button variant="destructive" disabled={updating} onClick={() => handleStatusUpdate('rejected', 'Out of stock')}>
                    ❌ Reject
                  </Button>
                </div>
              )}
              {order.status === 'accepted' && (
                <Button className="w-full" disabled={updating} onClick={() => handleStatusUpdate('packed')}>
                  📦 Mark as Packed
                </Button>
              )}
              {order.status === 'packed' && (
                <Button className="w-full" disabled={updating} onClick={() => handleStatusUpdate('dispatched')}>
                  🚚 Mark as Dispatched
                </Button>
              )}
              {order.status === 'dispatched' && (
                <Button className="w-full" disabled={updating} onClick={() => handleStatusUpdate('delivered')}>
                  🏠 Mark as Delivered
                </Button>
              )}
              {updating && <LoadingSpinner size="sm" className="py-1" />}
            </CardContent>
          </Card>
        )}

        {/* Buyer Action Buttons */}
        {isBuyer && (
          <div className="space-y-2">
            {order.status === 'delivered' && (
              <Button className="w-full gap-2" onClick={handleConfirmDelivery} disabled={updating}>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Receipt & Release Payment
              </Button>
            )}
            {order.status === 'completed' && !order.isReviewed && (
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowReview(true)}>
                <Star className="h-4 w-4" />
                {t('order.leave_review')}
              </Button>
            )}
            {['pending','accepted'].includes(order.status) && (
              <Button variant="destructive" className="w-full" onClick={handleCancelOrder} disabled={updating}>
                {t('order.cancel_order')}
              </Button>
            )}
          </div>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Items Ordered</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Qty: {item.quantity} {item.unit}</span>
                    <span className="text-xs font-medium">× ₹{item.sellingPrice}</span>
                  </div>
                </div>
                <p className="font-bold text-sm">₹{item.subtotal}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pricing Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('order.order_summary')}</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('order.subtotal')}</span><span>₹{order.pricing?.subtotal}</span></div>
            {order.pricing?.deliveryCharge > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t('order.delivery_charge')}</span><span>₹{order.pricing.deliveryCharge}</span></div>
            )}
            {order.pricing?.platformFee > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t('order.platform_fee')}</span><span>₹{order.pricing.platformFee}</span></div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>{t('order.total')}</span>
              <span className="text-orange-600">₹{order.pricing?.total}</span>
            </div>
            {order.payment?.status && (
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Payment Status</span>
                <Badge variant={order.payment.status === 'released' ? 'success' : order.payment.status === 'escrow_held' ? 'warning' : 'secondary'} className="text-[10px]">
                  {order.payment.status?.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Delivery Information</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize">{order.deliveryType?.replace('_', ' ')}</span>
            </div>
            {order.deliveryAddress && (
              <div className="flex gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  {order.deliveryAddress.addressLine}, {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="pt-4 pb-3 space-y-2">
            <Button variant="outline" className="w-full gap-2" onClick={handleStartChat}>
              <MessageCircle className="h-4 w-4" />
              Chat with {isBuyer ? 'Seller' : 'Buyer'}
            </Button>
          </CardContent>
        </Card>

        {order.buyerNote && (
          <Card>
            <CardContent className="pt-3 pb-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Buyer Note:</p>
              <p>{order.buyerNote}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(r => (
                  <button key={r} onClick={() => setRating(r)}>
                    <Star className={`h-8 w-8 transition-colors ${r <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Comment (Optional)</Label>
              <Textarea placeholder="Share your experience..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={reviewSubmitting} className="flex-1">
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
