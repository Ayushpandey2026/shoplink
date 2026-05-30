// src/pages/shop/AnalyticsPage.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Package, ShoppingBag, Star, IndianRupee, AlertCircle, Wallet, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui'
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
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await shopAPI.getAnalytics()
      setAnalytics(res.data)
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (!analytics) return (
    <EmptyState title="No analytics yet" description="Start listing products and receiving orders" />
  )

  const { overview, products, recentOrders, monthlyRevenue } = analytics
  const maxRevenue = Math.max(...(monthlyRevenue?.map(m => m.revenue) || [1]), 1)

  const orderStatusMap = {}
  recentOrders?.forEach(o => { orderStatusMap[o._id] = o })

  return (
    <PageWrapper>
      <h1 className="text-lg font-bold mb-4">📊 {t('shop.analytics')}</h1>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${overview.totalRevenue?.toLocaleString('en-IN') || 0}`}
          sub="All time earnings"
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
          label="Loss Saved"
          value={`₹${overview.estimatedLossSaved?.toLocaleString('en-IN') || 0}`}
          sub="Dead stock value recovered"
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

      {/* Product Stats */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" /> Product Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {[
            { label: 'Active Listings', value: products.active, color: 'bg-green-500' },
            { label: 'Sold Out', value: products.soldOut, color: 'bg-gray-400' },
            { label: 'Expiring in 30 Days', value: products.expiringSoon, color: 'bg-orange-500' },
            { label: 'Total Views', value: products.totalViews, color: 'bg-blue-500', isViews: true },
          ].map(({ label, value, color, isViews }) => (
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
              <p className="text-sm opacity-90">Total Loss Recovered via ShopLink</p>
              <p className="text-2xl font-bold">₹{overview.estimatedLossSaved?.toLocaleString('en-IN') || 0}</p>
              <p className="text-xs opacity-80 mt-0.5">
                By selling dead stock instead of throwing it away
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
