import { useCallback, useEffect, useState } from 'react'
import { Crown, Truck, CalendarDays, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { LoadingSpinner, PageWrapper } from '@/components/shared'
import { buyerAPI } from '@/services/api'
import toast from 'react-hot-toast'

const money = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const displayDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function ShopLinkPlusPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const loadMembership = useCallback(async () => {
    try {
      const response = await buyerAPI.getMembership()
      setData(response.data)
    } catch {
      toast.error('Unable to load ShopLink Plus')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadMembership)
  }, [loadMembership])

  const openRazorpayCheckout = async (checkout) => {
    const open = () => {
      const razorpay = new window.Razorpay({
        key: checkout.razorpay.key,
        amount: checkout.razorpay.amount,
        currency: checkout.razorpay.currency,
        order_id: checkout.razorpay.orderId,
        name: 'ShopLink',
        description: `ShopLink Plus · ${checkout.membership.validityDays} days`,
        theme: { color: '#f97316' },
        handler: async (result) => {
          try {
            await buyerAPI.verifyMembershipPayment({
              membershipId: checkout.membership._id,
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            })
            toast.success('ShopLink Plus is active.')
            await loadMembership()
          } catch {
            toast('Payment verification is pending. The signed Razorpay webhook will also reconcile it.', { icon: 'ℹ️' })
            await loadMembership()
          } finally {
            setCheckoutLoading(false)
          }
        },
        modal: {
          ondismiss: () => setCheckoutLoading(false),
        },
        prefill: {},
      })
      razorpay.on('payment.failed', () => {
        setCheckoutLoading(false)
        toast.error('Membership payment failed. You can retry the pending checkout.')
      })
      razorpay.open()
    }

    if (window.Razorpay) {
      open()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = open
    script.onerror = () => {
      setCheckoutLoading(false)
      toast.error('Unable to load Razorpay Checkout.')
    }
    document.body.appendChild(script)
  }

  const handlePurchase = async () => {
    setCheckoutLoading(true)
    try {
      const response = await buyerAPI.createMembershipCheckout()
      await openRazorpayCheckout(response.data)
    } catch (error) {
      setCheckoutLoading(false)
      toast.error(error.response?.data?.message || 'Unable to start ShopLink Plus checkout.')
    }
  }

  const handleCancel = async () => {
    const active = data?.activeMembership
    if (!active || !window.confirm('Cancel ShopLink Plus benefits now? The one-time membership payment is non-recurring and is not refunded by cancellation.')) return
    setCancelling(true)
    try {
      await buyerAPI.cancelMembership(active._id)
      toast.success('Membership benefits cancelled.')
      await loadMembership()
    } catch {
      toast.error('Unable to cancel membership.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  const plan = data?.plan
  const active = data?.activeMembership

  return (
    <PageWrapper>
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-bold">ShopLink Plus</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">A time-limited, one-time membership. No recurring billing is configured.</p>
      </header>

      <Card className="mb-5 overflow-hidden border-amber-300 dark:border-amber-800">
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 p-5 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="border-0 bg-white/20 text-white">SHOPLINK PLUS</Badge>
              <h2 className="mt-3 text-2xl font-bold">Make local shopping go further.</h2>
              <p className="mt-2 max-w-xl text-sm text-white/90">
                Use configured delivery-fee waivers on qualifying orders, and access your buyer analytics.
              </p>
            </div>
            <Sparkles className="h-10 w-10 shrink-0 text-white/80" />
          </div>
        </div>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Truck className="mt-0.5 h-4 w-4 text-orange-500" />
              <p className="text-sm">
                {plan?.deliveryBenefitsEnabled
                  ? `Eligible delivery waivers are capped at ${money(plan.maxWaiverPaise)} per order and ${plan.maxWaivedDeliveries} orders per membership period.`
                  : 'Delivery-fee waiver benefits are not currently configured.'}
              </p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-orange-500" />
              <p className="text-sm">Every checkout is re-priced and eligibility checked by ShopLink’s backend. Your regular purchase history and analytics remain available without Plus.</p>
            </div>
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-orange-500" />
              <p className="text-sm">One-time payment for {plan?.validityDays ? `${plan.validityDays} days` : 'a configured validity period'}; it will not automatically renew.</p>
            </div>
          </div>
          <div className="min-w-52 rounded-xl bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Membership price</p>
            <p className="my-1 text-2xl font-bold">{plan?.enabled ? money(plan.pricePaise) : 'Not configured'}</p>
            <p className="mb-3 text-xs text-muted-foreground">{plan?.enabled ? `for ${plan.validityDays} days · one-time` : 'Ask ShopLink to configure the Plus plan'}</p>
            {active ? (
              <Button className="w-full" variant="outline" disabled={cancelling} onClick={handleCancel}>
                {cancelling ? 'Cancelling…' : 'Cancel benefits'}
              </Button>
            ) : (
              <Button className="w-full" disabled={!plan?.enabled || checkoutLoading} onClick={handlePurchase}>
                {checkoutLoading ? 'Opening secure checkout…' : 'Join ShopLink Plus'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {active && (
        <Card className="mb-5">
          <CardHeader><CardTitle className="flex items-center justify-between">Your membership <Badge variant="success">Active</Badge></CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Started</p><p className="mt-1 font-medium">{displayDate(active.startsAt)}</p></div>
            <div><p className="text-xs text-muted-foreground">Valid through</p><p className="mt-1 font-medium">{displayDate(active.endsAt)}</p></div>
            <div><p className="text-xs text-muted-foreground">Successful waivers</p><p className="mt-1 font-medium">{active.successfulWaivers}</p></div>
            <div><p className="text-xs text-muted-foreground">Waivers remaining</p><p className="mt-1 font-medium">{active.remainingWaivedDeliveries}</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Membership payment history</CardTitle></CardHeader>
        <CardContent>
          {data?.memberships?.length ? (
            <div className="divide-y">
              {data.memberships.map((membership) => (
                <div key={membership._id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{money(membership.amountPaise)} · {membership.validityDays} days</p>
                    <p className="text-xs text-muted-foreground">Purchased {displayDate(membership.createdAt)}{membership.endsAt ? ` · Ends ${displayDate(membership.endsAt)}` : ''}</p>
                  </div>
                  <Badge variant={membership.status === 'active' ? 'success' : membership.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">{membership.status}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No membership purchases yet.</p>}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
