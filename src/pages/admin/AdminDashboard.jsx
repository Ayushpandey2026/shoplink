// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Store, Package, ShoppingBag, IndianRupee, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui'
import { PageWrapper, LoadingSpinner } from '@/components/shared'
import { adminAPI } from '@/services/api'
import toast from 'react-hot-toast'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card>
    <CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('overview')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [dashRes, shopsRes, usersRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getShops({ limit: 20, isVerified: false }),
        adminAPI.getUsers({ limit: 20 })
      ])
      setDashboard(dashRes.data)
      setShops(shopsRes.data.shops || [])
      setUsers(usersRes.data.users || [])
    } catch {} finally { setLoading(false) }
  }

  const verifyShop = async (shopId) => {
    try {
      await adminAPI.verifyShop(shopId)
      toast.success('Shop verified!')
      setShops(prev => prev.map(s => s._id === shopId ? { ...s, isVerified: true } : s))
    } catch { toast.error('Failed to verify') }
  }

  const banUser = async (userId) => {
    const reason = prompt('Ban reason:')
    if (!reason) return
    try {
      await adminAPI.banUser(userId, { reason })
      toast.success('User banned')
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: true } : u))
    } catch { toast.error('Failed to ban') }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  const userCounts = {}
  dashboard?.users?.forEach(u => { userCounts[u._id] = u.count })
  const orderCounts = {}
  dashboard?.orders?.forEach(o => { orderCounts[o._id] = o.count })

  return (
    <PageWrapper>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['overview', 'shops', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 capitalize ${tab === t ? 'bg-orange-500 text-white border-orange-500' : 'border-border'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard icon={Users} label="Total Sellers" value={userCounts['seller'] || 0} color="bg-blue-500" />
            <StatCard icon={Users} label="Total Buyers" value={userCounts['buyer'] || 0} color="bg-purple-500" />
            <StatCard icon={Store} label="Active Shops" value={dashboard?.shops || 0} color="bg-orange-500" />
            <StatCard icon={Package} label="Active Products" value={dashboard?.products || 0} color="bg-green-500" />
          </div>

          <Card className="mb-3">
            <CardHeader><CardTitle className="text-sm">Today's Activity</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orders Today</span>
                <span className="font-bold">{dashboard?.todayOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue Today</span>
                <span className="font-bold text-green-600">₹{dashboard?.todayRevenue?.toLocaleString('en-IN') || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Order Breakdown (All Time)</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm">
              {dashboard?.orders?.map(o => (
                <div key={o._id} className="flex justify-between">
                  <Badge variant={o._id === 'completed' ? 'success' : o._id === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize text-xs">
                    {o._id}
                  </Badge>
                  <span>{o.count} orders</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'shops' && (
        <>
          <div className="mb-3">
            <Input placeholder="Search shops..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-3">
            {shops.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())).map(shop => (
              <Card key={shop._id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{shop.name}</p>
                        <Badge variant={shop.isVerified ? 'success' : 'warning'} className="text-[10px]">
                          {shop.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{shop.shopType} • {shop.address?.city}</p>
                      <p className="text-xs text-muted-foreground">{shop.owner?.name} — {shop.owner?.phone}</p>
                    </div>
                    {!shop.isVerified && (
                      <Button size="sm" variant="success" onClick={() => verifyShop(shop._id)} className="flex-shrink-0 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          <div className="mb-3">
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-3">
            {users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)).map(u => (
              <Card key={u._id} className={u.isBanned ? 'border-red-200 dark:border-red-900' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm truncate">{u.name}</p>
                        <Badge variant={u.role === 'admin' ? 'default' : u.role === 'seller' ? 'blue' : 'secondary'} className="text-[10px] capitalize">
                          {u.role}
                        </Badge>
                        {u.isBanned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">+91 {u.phone}</p>
                    </div>
                    {!u.isBanned && u.role !== 'admin' && (
                      <Button size="sm" variant="destructive" onClick={() => banUser(u._id)} className="flex-shrink-0 gap-1 text-xs">
                        <XCircle className="h-3.5 w-3.5" /> Ban
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  )
}
