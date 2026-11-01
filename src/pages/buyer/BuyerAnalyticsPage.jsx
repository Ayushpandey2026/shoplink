import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ShoppingBag, IndianRupee, TrendingDown, Truck, Store, Package,
  ChartNoAxesCombined, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import { EmptyState, LoadingSpinner, PageWrapper } from '@/components/shared'
import { buyerAPI } from '@/services/api'
import toast from 'react-hot-toast'

const money = (paise = 0) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#ef4444', '#14b8a6']

const MetricCard = ({ icon: Icon, label, value, note, color = 'text-orange-500' }) => (
  <Card>
    <CardContent className="p-4">
      <Icon className={`mb-3 h-5 w-5 ${color}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </CardContent>
  </Card>
)

const MonthlyCharts = ({ months }) => {
  if (!months.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Completed purchases will appear here.</p>
  }
  const maxSpending = Math.max(...months.map((month) => month.spendingPaise || 0), 1)
  const maxOrders = Math.max(...months.map((month) => month.orderCount || 0), 1)
  const linePoints = months.map((month, index) => {
    const x = months.length === 1 ? 50 : (index / (months.length - 1)) * 100
    const y = 90 - ((month.spendingPaise || 0) / maxSpending) * 80
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium text-muted-foreground">Monthly spending · bar chart</p>
        <div className="flex h-36 items-end gap-2 overflow-x-auto border-b px-1">
          {months.map((month) => (
            <div key={month._id} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[9px] text-muted-foreground">{money(month.spendingPaise)}</span>
              <div
                title={`${month._id}: ${money(month.spendingPaise)}`}
                className="w-full max-w-10 rounded-t bg-orange-500"
                style={{ height: `${Math.max(3, ((month.spendingPaise || 0) / maxSpending) * 65)}%` }}
              />
              <span className="text-[9px] text-muted-foreground">{month._id.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Spending trend · line chart</p>
          <svg viewBox="0 0 100 100" className="h-28 w-full" role="img" aria-label="Monthly spending trend">
            <polyline points={linePoints} fill="none" stroke="#f97316" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {months.map((month, index) => {
              const x = months.length === 1 ? 50 : (index / (months.length - 1)) * 100
              const y = 90 - ((month.spendingPaise || 0) / maxSpending) * 80
              return <circle key={month._id} cx={x} cy={y} r="2" fill="#f97316" />
            })}
          </svg>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Completed order activity</p>
          <div className="flex h-28 items-end gap-2 border-b px-1">
            {months.map((month) => (
              <div key={month._id} className="flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[9px] text-muted-foreground">{month.orderCount}</span>
                <div
                  className="w-full max-w-8 rounded-t bg-blue-500"
                  style={{ height: `${Math.max(3, ((month.orderCount || 0) / maxOrders) * 75)}%` }}
                  title={`${month._id}: ${month.orderCount} completed orders`}
                />
                <span className="text-[9px] text-muted-foreground">{month._id.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BuyerAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedRange, setAppliedRange] = useState({ startDate: '', endDate: '' })
  const [statusFilter, setStatusFilter] = useState('')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await buyerAPI.getAnalytics({
        ...(appliedRange.startDate && { startDate: appliedRange.startDate }),
        ...(appliedRange.endDate && { endDate: appliedRange.endDate }),
      })
      setAnalytics(response.data)
    } catch {
      toast.error('Unable to load buyer analytics')
    } finally {
      setLoading(false)
    }
  }, [appliedRange])

  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true)
    try {
      const response = await buyerAPI.getPurchaseHistory({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
        ...(appliedRange.startDate && { startDate: appliedRange.startDate }),
        ...(appliedRange.endDate && { endDate: appliedRange.endDate }),
      })
      setOrders(response.data?.orders || [])
      setPagination(response.data?.pagination || { page: 1, pages: 1, total: 0 })
    } catch {
      toast.error('Unable to load purchase history')
    } finally {
      setHistoryLoading(false)
    }
  }, [appliedRange, statusFilter])

  useEffect(() => {
    Promise.resolve().then(fetchAnalytics)
  }, [fetchAnalytics])

  useEffect(() => {
    Promise.resolve().then(() => fetchHistory(1))
  }, [fetchHistory])

  const overview = analytics?.overview
  const categories = useMemo(() => analytics?.categories || [], [analytics?.categories])
  const months = analytics?.monthlyActivity || []
  const categoryTotal = categories.reduce((sum, item) => sum + item.spendingPaise, 0)
  const donutGradient = useMemo(() => {
    if (!categoryTotal) return 'conic-gradient(#e5e7eb 0deg 360deg)'
    let position = 0
    const slices = categories.map((item, index) => {
      const start = position
      position += (item.spendingPaise / categoryTotal) * 360
      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}deg ${position}deg`
    })
    return `conic-gradient(${slices.join(',')})`
  }, [categories, categoryTotal])

  const applyDateRange = (event) => {
    event.preventDefault()
    if (fromDate && toDate && fromDate > toDate) {
      toast.error('Start date must be before end date')
      return
    }
    setAppliedRange({ startDate: fromDate, endDate: toDate })
  }

  const orderValuePaise = (order) => Number.isInteger(order.pricing?.totalPaise)
    ? order.pricing.totalPaise
    : Math.round((Number(order.pricing?.total) || 0) * 100)

  return (
    <PageWrapper>
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-bold">Buyer analytics</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Your completed purchases, actual payments, and measurable savings.</p>
      </header>

      <form onSubmit={applyDateRange} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          From
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Through
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <Button type="submit" size="sm">Apply range</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setFromDate(''); setToDate(''); setAppliedRange({ startDate: '', endDate: '' }) }}>
          Lifetime
        </Button>
      </form>

      {loading ? <LoadingSpinner className="py-12" /> : analytics ? (
        <>
          <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Buyer metrics">
            <MetricCard icon={IndianRupee} label="Lifetime spending" value={money(overview?.lifetimeSpendingPaise)} note="Net completed-order payment after recorded refunds" color="text-green-600" />
            <MetricCard icon={TrendingDown} label="Total savings" value={analytics.savingsReferenceAvailable ? money(overview?.totalSavingsPaise) : 'Not measurable'} note={analytics.savingsReferenceAvailable ? 'Only verified regular-price comparisons' : 'No verified regular prices recorded'} />
            <MetricCard icon={Truck} label="Delivery savings" value={money(overview?.totalDeliverySavingsPaise)} note="Waivers recorded on completed orders" color="text-blue-600" />
            <MetricCard icon={ShoppingBag} label="Total orders" value={overview?.totalOrders || 0} note={`${overview?.completedOrders || 0} completed`} />
            <MetricCard icon={Package} label="Products purchased" value={overview?.productsPurchased || 0} note="Units from completed orders" color="text-violet-600" />
            <MetricCard icon={IndianRupee} label="Average order value" value={money(overview?.averageOrderValuePaise)} note="Net completed-order total" color="text-emerald-600" />
            <MetricCard icon={Store} label="Local shops supported" value={overview?.localShopsSupported || 0} note="Distinct shops from completed orders" color="text-blue-600" />
            <MetricCard icon={Package} label="Inventory rescued value" value={analytics.shoppingImpact?.inventoryRescuedValueAvailable ? money(analytics.shoppingImpact.inventoryRescuedValuePaise) : 'Unavailable'} note={`${analytics.shoppingImpact?.excessInventoryUnitsPurchased || 0} excess-stock units purchased; no environmental conversion applied`} color="text-orange-600" />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Monthly shopping activity</CardTitle></CardHeader>
              <CardContent><MonthlyCharts months={months} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Category spending</CardTitle></CardHeader>
              <CardContent>
                {categories.length ? (
                  <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
                    <div className="mx-auto h-36 w-36 rounded-full" style={{ background: donutGradient }} role="img" aria-label="Category spending donut chart" />
                    <div className="space-y-3">
                      {categories.map((category, index) => (
                        <div key={category.category} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2 truncate">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <span className="truncate capitalize">{category.category}</span>
                          </span>
                          <span className="shrink-0 font-medium">{money(category.spendingPaise)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="py-8 text-center text-sm text-muted-foreground">No completed category purchases in this range.</p>}
                <p className="mt-4 text-xs text-muted-foreground">
                  Most purchased category: <strong className="capitalize">{analytics.mostPurchasedCategory || '—'}</strong>
                </p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Your Shopping Impact</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><p className="text-xs text-muted-foreground">Local shops supported</p><p className="mt-1 font-semibold">{analytics.shoppingImpact?.localShopsSupported || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Completed purchases</p><p className="mt-1 font-semibold">{analytics.shoppingImpact?.completedLocalPurchases || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Excess-stock units purchased</p><p className="mt-1 font-semibold">{analytics.shoppingImpact?.excessInventoryUnitsPurchased || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Estimated inventory value</p><p className="mt-1 font-semibold">{analytics.shoppingImpact?.inventoryRescuedValueAvailable ? money(analytics.shoppingImpact.inventoryRescuedValuePaise) : 'Unavailable'}</p></div>
              </CardContent>
            </Card>
          </div>

          {analytics.membershipBenefits?.active && (
            <Card className="mt-4 border-orange-200 dark:border-orange-900">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">ShopLink Plus delivery benefits</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.membershipBenefits.waivedDeliveriesUsed} completed deliveries with a waiver · {analytics.membershipBenefits.remainingWaivedDeliveries} remaining in this membership period
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.assign('/plus')}>Manage Plus</Button>
              </CardContent>
            </Card>
          )}

          <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Purchase history</h2>
                <p className="text-xs text-muted-foreground">Actual checkout total includes product and delivery charges; refunds are shown separately.</p>
              </div>
              <select aria-label="Filter purchase history by status" className="h-9 rounded-lg border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            {historyLoading ? <LoadingSpinner className="py-8" /> : orders.length ? (
              <div className="space-y-3">
                {orders.map((order) => {
                  const orderTotalPaise = orderValuePaise(order)
                  const refundedAmountPaise = order.payment?.status === 'refunded'
                    && !Number.isInteger(order.payment?.refundedAmountPaise)
                    ? orderTotalPaise
                    : Number(order.payment?.refundedAmountPaise) || 0
                  const amount = Math.max(0, orderTotalPaise - refundedAmountPaise)
                  return (
                    <Card key={order._id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {order.items?.[0]?.image && (
                            <img
                              src={order.items[0].image}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-md object-cover"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{order.items?.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{order.shop?.name || 'Shop'} · {format(new Date(order.completedAt || order.createdAt), 'dd MMM yyyy')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {order.deliveryBenefit?.waivedAmountPaise > 0
                                ? `${money(order.deliveryBenefit.waivedAmountPaise)} delivery waived · ${money(order.deliveryBenefit.actualChargePaise)} paid`
                                : `${money(order.deliveryBenefit?.actualChargePaise ?? Math.round((order.pricing?.deliveryCharge || 0) * 100))} delivery paid`}
                              {refundedAmountPaise > 0 && ` · ${money(refundedAmountPaise)} refunded`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{money(amount)}</p>
                            <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' || order.status === 'refunded' ? 'secondary' : 'warning'} className="mt-1 capitalize">
                              {order.status} · {order.payment?.status || 'unknown payment'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{pagination.total} orders</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => fetchHistory(pagination.page - 1)}>
                      <ArrowDownRight className="h-3 w-3" /> Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => fetchHistory(pagination.page + 1)}>
                      Next <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No purchase history" description="Your orders will appear here after you shop with ShopLink." />
            )}
          </section>
        </>
      ) : (
        <EmptyState title="Analytics unavailable" description="We could not load your buyer analytics. Please try again later." />
      )}
    </PageWrapper>
  )
}
