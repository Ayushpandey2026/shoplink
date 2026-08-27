// src/pages/shop/ShopDashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Store, Package, ShoppingBag, TrendingUp, Wallet, Star,
  Plus, Settings, ToggleLeft, ToggleRight, CheckCircle2,
  Clock, AlertCircle, ChevronRight, Edit2, MapPin
} from 'lucide-react'
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Badge, Switch, Separator, Avatar, AvatarImage, AvatarFallback
} from '@/components/ui'
import { PageWrapper, LoadingSpinner, EmptyState } from '@/components/shared'
import { shopAPI, productAPI, orderAPI } from '@/services/api'
import toast from 'react-hot-toast'

const QuickStatCard = ({ icon: Icon, label, value, onClick, color = 'text-orange-500', bg = 'bg-orange-50 dark:bg-orange-950/20' }) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]" onClick={onClick}>
    <CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-none mb-1 truncate">{label}</p>
          <p className="text-xl font-bold leading-none">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function ShopDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [pendingOrders, setPendingOrders] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const shopRes = await shopAPI.getMyShop()
      setShop(shopRes.data.shop)

      // Fetch pending orders
      try {
        const ordersRes = await orderAPI.getSellerOrders({ status: 'pending', limit: 5 })
        setPendingOrders(ordersRes.data?.orders || [])
      } catch {
        setPendingOrders([])
      }

      // Fetch expiring soon products
      try {
        const prodRes = await productAPI.getMyProducts({ limit: 100 })
        const expiring = (prodRes.data?.products || []).filter(p => {
          if (!p.expiryDate) return false
          const days = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000)
          return days > 0 && days <= 30
        })
        setExpiringProducts(expiring.slice(0, 5))
      } catch {
        setExpiringProducts([])
      }
    } catch (error) {
      const statusCode = error?.statusCode || error?.error?.statusCode || error?.response?.status
      if (statusCode !== 404) {
        toast.error(error?.message || 'Unable to load your shop')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    setToggling(true)
    try {
      const res = await shopAPI.toggleStatus()
      setShop(prev => ({ ...prev, isOpen: res.data.isOpen }))
      toast.success(res.message)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  // No shop registered yet
  if (!shop) {
    return (
      <PageWrapper>
        <EmptyState
          icon={Store}
          title="No Shop Registered"
          description="Register your shop to start listing dead stock and receiving orders"
          action={() => navigate('/shop/register')}
          actionLabel="Register Shop"
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* Shop Header Card */}
      <Card className="mb-4 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-400 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-white/30">
              <AvatarImage src={shop.logo?.url} />
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {shop.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-white truncate">{shop.name}</h1>
                {shop.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-white/80 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-white/80 text-xs mt-0.5">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{shop.address?.city}, {shop.address?.state}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs border-0 ${shop.isOpen ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {shop.isOpen ? '🟢 Open' : '🔴 Closed'}
                </Badge>
                {!shop.isVerified && (
                  <Badge className="text-xs bg-yellow-500 border-0">⏳ Pending Verification</Badge>
                )}
              </div>
            </div>
            <button onClick={() => navigate('/shop/edit')} className="h-9 w-9 bg-white/20 rounded-lg flex items-center justify-center">
              <Edit2 className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Open/Close Toggle */}
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {shop.isOpen ? t('shop.open') : t('shop.closed')}
              </p>
              <p className="text-xs text-muted-foreground">
                {shop.isOpen ? 'Customers can find and order from your shop' : 'Shop hidden from buyers'}
              </p>
            </div>
            <Switch
              checked={shop.isOpen}
              onCheckedChange={handleToggleStatus}
              disabled={toggling}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <QuickStatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={shop.analytics?.totalOrders || 0}
          onClick={() => navigate('/orders?tab=seller')}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
        <QuickStatCard
          icon={TrendingUp}
          label="Revenue"
          value={`₹${(shop.analytics?.totalRevenue || 0).toLocaleString('en-IN')}`}
          onClick={() => navigate('/shop/analytics')}
          color="text-green-600"
          bg="bg-green-50 dark:bg-green-950/20"
        />
        <QuickStatCard
          icon={Star}
          label="Rating"
          value={shop.rating?.average ? `${shop.rating.average.toFixed(1)} ⭐` : 'No reviews'}
          onClick={() => navigate(`/shops/${shop._id}/reviews`)}
          color="text-yellow-500"
          bg="bg-yellow-50 dark:bg-yellow-950/20"
        />
        <QuickStatCard
          icon={TrendingUp}
          label="Loss Saved"
          value={`₹${(shop.analytics?.estimatedLossSaved || 0).toLocaleString('en-IN')}`}
          onClick={() => navigate('/shop/analytics')}
          color="text-orange-500"
          bg="bg-orange-50 dark:bg-orange-950/20"
        />
      </div>

      {/* Pending Orders Alert */}
      {pendingOrders.length > 0 && (
        <Card className="mb-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/10">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                  {pendingOrders.length} Pending Order{pendingOrders.length > 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => navigate('/orders?tab=seller&status=pending')}
                className="text-xs text-orange-500 font-medium">
                View All
              </button>
            </div>
            {pendingOrders.slice(0, 2).map(order => (
              <div
                key={order._id}
                className="flex items-center justify-between py-1.5 cursor-pointer"
                onClick={() => navigate(`/orders/${order._id}`)}
              >
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">₹{order.pricing?.total} • {order.items?.length} item(s)</p>
                </div>
                <Badge variant="warning" className="text-xs">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expiring Products Alert */}
      {expiringProducts.length > 0 && (
        <Card className="mb-4 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {expiringProducts.length} Product{expiringProducts.length > 1 ? 's' : ''} Expiring Soon
                </p>
              </div>
              <button onClick={() => navigate('/sell/my-products')} className="text-xs text-red-500 font-medium">
                View All
              </button>
            </div>
            {expiringProducts.slice(0, 2).map(prod => {
              const days = Math.ceil((new Date(prod.expiryDate) - new Date()) / 86400000)
              return (
                <div
                  key={prod._id}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
                  onClick={() => navigate(`/products/${prod._id}`)}
                >
                  <p className="text-sm font-medium truncate flex-1">{prod.name}</p>
                  <Badge variant={days <= 7 ? 'destructive' : 'warning'} className="text-xs ml-2 flex-shrink-0">
                    {days}d left
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-1">
          {[
            { icon: Plus, label: 'Add New Product', sub: 'List dead stock or inventory', path: '/sell/add' },
            { icon: Package, label: 'My Products', sub: 'View & manage listings', path: '/sell/my-products' },
            { icon: ShoppingBag, label: 'Manage Orders', sub: 'View and update order status', path: '/orders?tab=seller' },
            { icon: TrendingUp, label: 'Analytics', sub: 'Revenue, loss saved & insights', path: '/shop/analytics' },
            { icon: Wallet, label: 'Wallet & Withdraw', sub: `Balance: ₹${shop.analytics?.totalRevenue || 0}`, path: '/wallet' },
            { icon: Settings, label: 'Shop Settings', sub: 'Update info, bank details, hours', path: '/shop/settings' },
          ].map(({ icon: Icon, label, sub, path }) => (
            <div key={path}>
              <button
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
              >
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">{sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bank Details Reminder */}
      {!shop.bankDetails?.accountNumber && !shop.bankDetails?.upiId && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Add Bank Details</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Add your bank account or UPI ID to receive payments from orders.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate('/shop/settings')}>
              Add Bank Details
            </Button>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
