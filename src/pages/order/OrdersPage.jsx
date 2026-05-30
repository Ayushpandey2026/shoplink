// src/pages/order/OrdersPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, ChevronRight, Clock, CheckCircle2, XCircle, Truck } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge, Card, CardContent } from '@/components/ui'
import { EmptyState, PageWrapper, LoadingSpinner, orderStatusVariant } from '@/components/shared'
import { orderAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { format } from 'date-fns'

const statusIcons = {
  pending: Clock,
  accepted: CheckCircle2,
  packed: Package,
  dispatched: Truck,
  delivered: CheckCircle2,
  completed: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
}

const OrderCard = ({ order, onClick }) => {
  const { t } = useTranslation()
  const StatusIcon = statusIcons[order.status] || Package

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-md active:scale-[0.99] transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{order.orderNumber}</p>
              <Badge variant={orderStatusVariant(order.status)} className="capitalize text-xs">
                {t(`order.status.${order.status}`) || order.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {order.shop?.name || order.items?.[0]?.name}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span className="font-semibold text-foreground">₹{order.pricing?.total}</span>
              <span>•</span>
              <span>{format(new Date(order.createdAt), 'dd MMM')}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isSeller } = useAuthStore()

  const [activeTab, setActiveTab] = useState('buyer')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [activeTab, statusFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = { page: 1, limit: 50, ...(statusFilter && { status: statusFilter }) }
      const res = activeTab === 'buyer'
        ? await orderAPI.getBuyerOrders(params)
        : await orderAPI.getSellerOrders(params)
      setOrders(res.data?.orders || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const STATUS_FILTERS = ['', 'pending', 'accepted', 'dispatched', 'completed', 'cancelled']

  return (
    <PageWrapper>
      <h1 className="text-lg font-bold mb-4">{t('order.orders')}</h1>

      {isSeller && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="buyer" className="flex-1">My Orders</TabsTrigger>
            <TabsTrigger value="seller" className="flex-1">Shop Orders</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s ? 'bg-orange-500 text-white border-orange-500' : 'bg-background border-border'
            }`}
          >
            {s ? (t(`order.status.${s}`) || s) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description={activeTab === 'buyer' ? 'Start shopping to see your orders here' : 'Orders from buyers will appear here'}
          action={activeTab === 'buyer' ? () => navigate('/') : null}
          actionLabel="Browse Products"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onClick={() => navigate(`/orders/${order._id}`)}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
