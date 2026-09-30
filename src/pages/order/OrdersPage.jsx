// src/pages/order/OrdersPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, ChevronRight } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, Badge, Card, CardContent } from '@/components/ui'
import { EmptyState, PageWrapper, LoadingSpinner, orderStatusVariant } from '@/components/shared'
import { orderAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import { format } from 'date-fns'

const OrderCard = ({ order, onClick }) => {
  const { t } = useTranslation()

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
  const [expenses, setExpenses] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    let active = true
    const loadOrders = async () => {
      setLoading(true)
      try {
        const params = { page: 1, limit: 50, ...(statusFilter && { status: statusFilter }) }
        const res = activeTab === 'buyer'
          ? await orderAPI.getBuyerOrders(params)
          : await orderAPI.getSellerOrders(params)
        if (!active) return
        setOrders(res.data?.orders || [])
        if (activeTab === 'buyer') {
          try {
            const expenseRes = await orderAPI.getBuyerExpenses()
            if (!active) return
            setExpenses(expenseRes.data?.expenses || [])
            setTotalSpent(expenseRes.data?.totalSpent || 0)
          } catch {
            if (active) {
              setExpenses([])
              setTotalSpent(0)
            }
          }
        } else {
          setExpenses([])
          setTotalSpent(0)
        }
      } catch {
        if (active) setOrders([])
      } finally {
        if (active) setLoading(false)
      }
    }
    loadOrders()
    return () => { active = false }
  }, [activeTab, statusFilter])

  const STATUS_FILTERS = ['', 'pending', 'accepted', 'dispatched', 'completed', 'cancelled']

  return (
    <PageWrapper>
      <h1 className="text-lg font-bold mb-4">{t('order.orders')}</h1>

      {activeTab === 'buyer' && (
        <section className="mb-5" aria-label="Purchase expenses">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Purchase expenses</h2>
            <p className="text-sm font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
          {expenses.length > 0 && (
            <div className="divide-y rounded-lg border">
              {expenses.map((expense) => (
                <button
                  type="button"
                  key={expense._id}
                  onClick={() => navigate(`/orders/${expense.order}`)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{expense.items?.map((item) => `${item.name} x${item.quantity}`).join(', ')}</span>
                    <span className="block text-xs text-muted-foreground">{expense.shopName} · {format(new Date(expense.paidAt), 'dd MMM yyyy')}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">₹{expense.amount.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

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
