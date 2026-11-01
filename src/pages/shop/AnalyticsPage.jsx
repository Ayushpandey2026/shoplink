// src/pages/shop/AnalyticsPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Package, ShoppingBag, Star, IndianRupee, AlertCircle, Wallet, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress, Separator } from '@/components/ui'
import { PageWrapper, LoadingSpinner, EmptyState } from '@/components/shared'
import { shopAPI } from '@/services/api'
import toast from 'react-hot-toast'

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-orange-500', bgColor = 'bg-orange-50 dark:bg-orange-950/20' }) => (
  <Card>
    <CardContent className="pt-4 pb-4">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
          <p className="text-xl font-bold leading-none">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    shopAPI.getAnalytics()
      .then((res) => {
        if (active) setAnalytics(res.data)
      })
      .catch(() => {
        if (active) toast.error('Failed to load analytics')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  if (loading) return <LoadingSpinner className="py-20" />
  if (!analytics) return (
    <EmptyState title="No analytics yet" description="Start listing products and receiving orders" />
  )

  const { overview, products, recentOrders, monthlyRevenue } = analytics
  const inventoryRecovery = analytics.inventoryRecovery
  const maxRevenue = Math.max(...(monthlyRevenue?.map(m => m.revenue) || [1]), 1)
  const formatPaise = (amountPaise) => `₹${(amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  const orderStatusMap = {}
  recentOrders?.forEach(o => { orderStatusMap[o._id] = o })

  return (
    <PageWrapper>
      <h1 className="text-lg font-bold mb-4">📊 {t('shop.analytics')}</h1>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          icon={IndianRupee}
          label="Total Cash Recovered"
          value={inventoryRecovery ? formatPaise(inventoryRecovery.totalCashRecoveredPaise) : 'Unavailable'}
          sub="Net proceeds released to your ShopLink wallet"
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-950/20"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={overview.totalOrders || 0}
          sub="Orders received"
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-950/20"
        />
        <StatCard
          icon={TrendingUp}
          label="Potential Loss Avoided"
          value={inventoryRecovery ? formatPaise(inventoryRecovery.totalLossAvoidedPaise) : 'Unavailable'}
          sub="Net proceeds above expected unsold recovery"
          color="text-orange-500"
          bgColor="bg-orange-50 dark:bg-orange-950/20"
        />
        <StatCard
          icon={AlertCircle}
          label="Remaining Potential Loss"
          value={inventoryRecovery ? formatPaise(inventoryRecovery.totalRemainingPotentialLossPaise) : 'Unavailable'}
          sub="Estimated loss for unsold eligible units"
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-950/20"
        />
        <StatCard
          icon={Package}
          label="Units Recovered"
          value={inventoryRecovery?.unitsRecovered ?? 'Unavailable'}
          sub="Units with proceeds released"
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-950/20"
        />
        <StatCard
          icon={CheckCircle2}
          label="Inventory Cleared"
          value={inventoryRecovery
            ? `${inventoryRecovery.inventoryCleared.completedListings} / ${inventoryRecovery.inventoryCleared.totalListings}`
            : 'Unavailable'}
          sub={inventoryRecovery
            ? `${inventoryRecovery.inventoryCleared.unavailableListings} listing(s) need cost/recovery data`
            : ''}
          color="text-orange-500"
          bgColor="bg-orange-50 dark:bg-orange-950/20"
        />
        <StatCard
          icon={Star}
          label="Shop Rating"
          value={overview.rating?.average?.toFixed(1) || '—'}
          sub={`${overview.rating?.count || 0} reviews`}
          color="text-yellow-500"
          bgColor="bg-yellow-50 dark:bg-yellow-950/20"
        />
      </div>

      {inventoryRecovery && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" /> Settled sales breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Gross sales value</span><span>{formatPaise(inventoryRecovery.totalGrossSalesPaise)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Platform commission</span><span>−{formatPaise(inventoryRecovery.totalPlatformCommissionPaise)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Other deductions</span><span>−{formatPaise(inventoryRecovery.totalOtherDeductionsPaise)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Seller refunds/reversals</span><span>−{formatPaise(inventoryRecovery.totalRefundsPaise)}</span></div>
              <Separator />
              <div className="flex justify-between gap-3 font-semibold"><span>Net proceeds recovered</span><span>{formatPaise(inventoryRecovery.totalCashRecoveredPaise)}</span></div>
              <p className="text-xs text-muted-foreground">
                Potential loss avoided is separate: it compares these net proceeds with the expected unsold recovery value. Pending, failed, cancelled, and unpaid orders are excluded. Razorpay test-mode wallet proceeds are not bank payouts.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" /> Product recovery breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {inventoryRecovery.productBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground">No inventory listings yet.</p>
              )}
              {inventoryRecovery.productBreakdown.map((product) => (
                <div key={product.productId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{product.name}</p>
                    <Badge variant={
                      product.inventoryStatus === 'cleared' ? 'success'
                        : product.inventoryStatus === 'unavailable' ? 'secondary'
                          : 'warning'
                    }>
                      {product.inventoryStatus === 'cleared' ? 'Inventory cleared'
                        : product.inventoryStatus === 'partial' ? 'Partially sold'
                          : product.inventoryStatus === 'not_sold' ? 'Not yet sold'
                            : 'Financial data unavailable'}
                    </Badge>
                  </div>
                  {product.financialDataAvailable ? (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Recovered units</span><span className="text-right">{product.soldQuantity} / {product.initialQuantity} {product.unit}</span>
                      <span>Remaining potential loss</span><span className="text-right">{formatPaise(product.remainingPotentialLossPaise)}</span>
                      <span>Net seller proceeds</span><span className="text-right">{formatPaise(product.sellerProceedsPaise)}</span>
                      <span>Loss avoided</span><span className="text-right">{formatPaise(product.lossAvoidedPaise)}</span>
                      <span>Gross sales / commission</span><span className="text-right">{formatPaise(product.grossSalesPaise)} / −{formatPaise(product.platformCommissionPaise)}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Historical purchase cost, unsold recovery value, or initial quantity was not recorded. No loss estimate is shown.
                      {product.sellerProceedsPaise > 0 && ` Released seller proceeds: ${formatPaise(product.sellerProceedsPaise)}.`}
                    </p>
                  )}
                  {product.isDeleted && <p className="mt-2 text-xs text-muted-foreground">Listing archived/deleted; historical accounting retained.</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Product Stats */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" /> Product Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {[
            { label: 'Active Listings', value: products.active },
            { label: 'Sold Out', value: products.soldOut },
            { label: 'Expiring in 30 Days', value: products.expiringSoon },
            { label: 'Total Views', value: products.totalViews, isViews: true },
          ].map(({ label, value, isViews }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{isViews ? `👁 ${value}` : value}</span>
              </div>
              {!isViews && (
                <Progress
                  value={Math.min(100, (value / Math.max(products.active + products.soldOut + products.expiringSoon, 1)) * 100)}
                  className="h-1.5"
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      {monthlyRevenue?.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" /> Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end gap-2 h-28 overflow-x-auto pb-1">
              {monthlyRevenue.map((m, i) => {
                const pct = (m.revenue / maxRevenue) * 100
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[2.5rem]">
                    <span className="text-[10px] text-muted-foreground">₹{m.revenue >= 1000 ? `${(m.revenue/1000).toFixed(1)}k` : m.revenue}</span>
                    <div className="w-8 bg-muted rounded-t-sm overflow-hidden flex items-end" style={{ height: '72px' }}>
                      <div
                        className="w-full bg-orange-500 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{MONTHS[(m._id?.month || 1) - 1]}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Order Status Breakdown */}
      {recentOrders?.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Last 30 Days — Order Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {recentOrders.map(o => (
              <div key={o._id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    o._id === 'completed' ? 'success' :
                    o._id === 'cancelled' || o._id === 'rejected' ? 'destructive' : 'secondary'
                  } className="capitalize text-xs">{o._id}</Badge>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{o.count} orders</span>
                  {o.revenue > 0 && <span className="font-medium text-foreground">₹{o.revenue?.toLocaleString('en-IN')}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Loss Saved Highlight */}
      <Card className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Potential Loss Avoided</p>
              <p className="text-2xl font-bold">{inventoryRecovery ? formatPaise(inventoryRecovery.totalLossAvoidedPaise) : 'Unavailable'}</p>
              <p className="text-xs opacity-80 mt-0.5">
                Incremental value versus expected unsold recovery
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
