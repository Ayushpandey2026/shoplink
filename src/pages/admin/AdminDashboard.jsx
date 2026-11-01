import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IndianRupee, Package, RefreshCw, Search, Store, Users } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { adminAPI } from '@/services/api'
import AdminShell from './AdminShell'
import toast from 'react-hot-toast'

const resourceMeta = {
  users: { title: 'Users', description: 'Review marketplace accounts and account status.' },
  shops: { title: 'Shops', description: 'Review shop verification and marketplace availability.' },
  products: { title: 'Products', description: 'Review active listings and moderate marketplace availability.' },
  orders: { title: 'Orders & payments', description: 'Read-only order and payment status. Financial records cannot be changed here.' },
  memberships: { title: 'Memberships', description: 'Review ShopLink Plus membership records and current status.' },
  reviews: { title: 'Reviews', description: 'Review customer feedback and hide or restore inappropriate content.' },
  'audit-logs': { title: 'Audit log', description: 'Immutable record of administrative changes and support actions.' },
}

const money = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const displayDate = (value) => value ? new Date(value).toLocaleString() : '—'
const pretty = (value) => String(value ?? '—').replaceAll('_', ' ')
const countFor = (rows, key) => rows?.find((row) => row._id === key)?.count || 0

const Stat = ({ icon: Icon, label, value, note }) => (
  <Card className="border-slate-200 shadow-sm dark:border-slate-800">
    <CardContent className="flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('en-IN') : value || 0}</p>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
    </CardContent>
  </Card>
)

function TableCell({ children, className = '' }) {
  return <td className={`px-4 py-3 align-top text-sm ${className}`}>{children || '—'}</td>
}

export default function AdminDashboard() {
  const { pathname } = useLocation()
  const section = pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'overview'
  const meta = resourceMeta[section]
  const [dashboard, setDashboard] = useState(null)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchState, setSearchState] = useState({ section: '', value: '' })
  const [searchInputState, setSearchInputState] = useState({ section: '', value: '' })
  const [filterState, setFilterState] = useState({ section: '', value: '' })
  const [pageState, setPageState] = useState({ section: '', page: 1 })
  const [reloadSequence, setReloadSequence] = useState(0)
  const [loadedKey, setLoadedKey] = useState('')
  const requestSequence = useRef(0)
  const search = searchState.section === section ? searchState.value : ''
  const searchInput = searchInputState.section === section ? searchInputState.value : ''
  const filter = filterState.section === section ? filterState.value : ''
  const page = pageState.section === section ? pageState.page : 1
  const queryKey = `${section}:${page}:${search}:${filter}:${reloadSequence}`

  const fetchData = useCallback(async () => {
    const requestId = ++requestSequence.current
    setError('')
    try {
      if (section === 'overview') {
        const response = await adminAPI.getDashboard()
        if (requestId !== requestSequence.current) return
        setDashboard(response.data)
        setLoadedKey(queryKey)
        return
      }
      if (!meta) return
      const params = { page, limit: 20, ...(search.trim() && { search: search.trim() }) }
      if (filter) {
        if (section === 'users') params.role = filter
        if (section === 'shops') params.isVerified = filter
        if (section === 'products' || section === 'orders' || section === 'memberships') params.status = filter
        if (section === 'reviews') params.isVisible = filter
        if (section === 'audit-logs') params.action = filter
      }
      const response = section === 'users'
        ? await adminAPI.getUsers(params)
        : section === 'shops'
          ? await adminAPI.getShops(params)
          : await adminAPI.getResource(section, params)
      if (requestId !== requestSequence.current) return
      const records = response.data.items || response.data.users || response.data.shops || []
      setItems(records)
      setPagination(response.data.pagination || { page: 1, pages: 1, total: records.length })
      setLoadedKey(queryKey)
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load administrative data.')
        setLoadedKey(queryKey)
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [section, meta, page, search, filter, queryKey])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) fetchData()
    })
    return () => {
      active = false
      requestSequence.current += 1
    }
  }, [fetchData])

  const isLoading = loading || loadedKey !== queryKey
  const heading = meta?.title || (section === 'overview' ? 'Marketplace overview' : 'Administration')
  const subtitle = meta?.description || 'Current ShopLink marketplace activity and operational metrics.'
  const filters = useMemo(() => {
    if (section === 'users') return [['', 'All roles'], ['buyer', 'Buyers'], ['seller', 'Sellers'], ['admin', 'Administrators']]
    if (section === 'shops') return [['', 'All shops'], ['false', 'Pending verification'], ['true', 'Verified']]
    if (section === 'products') return [['', 'All statuses'], ['active', 'Active'], ['paused', 'Paused'], ['sold_out', 'Sold out']]
    if (section === 'orders') return [['', 'All order statuses'], ...['pending', 'accepted', 'packed', 'dispatched', 'delivered', 'completed', 'cancelled', 'refunded'].map((value) => [value, pretty(value)])]
    if (section === 'memberships') return [['', 'All memberships'], ...['pending', 'active', 'failed', 'expired', 'cancelled'].map((value) => [value, pretty(value)])]
    if (section === 'reviews') return [['', 'All reviews'], ['true', 'Visible'], ['false', 'Hidden']]
    return []
  }, [section])

  const runAction = async (action, successMessage) => {
    try {
      await action()
      toast.success(successMessage)
      setLoading(true)
      await fetchData()
    } catch (actionError) {
      toast.error(actionError?.response?.data?.message || actionError?.message || 'Action failed.')
    }
  }

  const manage = (item) => {
    if (section === 'users') {
      const nextState = !item.isBanned
      const reason = nextState ? window.prompt('Reason for suspending this user:') : ''
      if (nextState && !reason?.trim()) return
      return runAction(() => adminAPI.banUser(item._id, { isBanned: nextState, reason }), nextState ? 'User suspended.' : 'User reinstated.')
    }
    if (section === 'shops') {
      const action = window.confirm(`${item.isVerified ? 'Remove verification from' : 'Verify'} ${item.name}?`)
      if (!action) return
      return runAction(() => adminAPI.verifyShop(item._id, { isVerified: !item.isVerified }), item.isVerified ? 'Shop verification removed.' : 'Shop verified.')
    }
    if (section === 'products') {
      if (item.status === 'deleted') return
      const status = item.status === 'active' ? 'paused' : 'active'
      if (item.status === 'active' && !window.confirm(`Pause "${item.name}"?`)) return
      return runAction(() => adminAPI.updateProductStatus(item._id, { status }), `Product ${status}.`)
    }
    if (section === 'reviews') {
      const status = !item.isVisible
      return runAction(() => adminAPI.moderateReview(item._id, { isVisible: status }), status ? 'Review restored.' : 'Review hidden.')
    }
  }

  const renderResourceRows = () => items.map((item) => (
    <tr key={item._id} className="border-t dark:border-slate-800">
      {section === 'users' && <>
        <TableCell><strong>{item.name}</strong><div className="text-xs text-muted-foreground">{item.email || item.phone}</div></TableCell>
        <TableCell className="capitalize">{item.role}</TableCell>
        <TableCell><span className={item.isBanned ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}>{item.isBanned ? 'Suspended' : 'Active'}</span>{item.banReason && <div className="max-w-52 text-xs text-muted-foreground">{item.banReason}</div>}</TableCell>
        <TableCell>{displayDate(item.createdAt)}</TableCell>
        <TableCell><Button size="sm" variant={item.isBanned ? 'outline' : 'destructive'} disabled={item.role === 'admin'} onClick={() => manage(item)}>{item.isBanned ? 'Reinstate' : 'Suspend'}</Button></TableCell>
      </>}
      {section === 'shops' && <>
        <TableCell><strong>{item.name}</strong><div className="text-xs text-muted-foreground">{pretty(item.shopType)} · {item.address?.city}</div></TableCell>
        <TableCell>{item.owner?.name}<div className="text-xs text-muted-foreground">{item.owner?.email || item.owner?.phone}</div></TableCell>
        <TableCell>{item.isVerified ? 'Verified' : 'Pending'} · {item.isActive ? 'Active' : 'Inactive'}</TableCell>
        <TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => manage(item)}>{item.isVerified ? 'Unverify' : 'Verify'}</Button><Button size="sm" variant="outline" onClick={() => runAction(() => adminAPI.setShopActive(item._id, { isActive: !item.isActive }), item.isActive ? 'Shop deactivated.' : 'Shop activated.')}>{item.isActive ? 'Deactivate' : 'Activate'}</Button></div></TableCell>
      </>}
      {section === 'products' && <>
        <TableCell><strong>{item.name}</strong><div className="text-xs text-muted-foreground">{item.brand} · {item.category}</div></TableCell>
        <TableCell>{item.shop?.name || '—'}</TableCell>
        <TableCell>{money(item.sellingPrice)}</TableCell>
        <TableCell>{item.availableQuantity ?? item.quantity} · {pretty(item.status)}</TableCell>
        <TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => manage(item)}>{item.status === 'active' ? 'Pause' : 'Activate'}</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Remove "${item.name}" from public listings? The record will be retained.`)) runAction(() => adminAPI.updateProductStatus(item._id, { status: 'deleted' }), 'Product removed from public listings.') }}>Remove</Button></div></TableCell>
      </>}
      {section === 'orders' && <>
        <TableCell><strong>{item.orderNumber}</strong><div className="text-xs text-muted-foreground">{displayDate(item.createdAt)}</div></TableCell>
        <TableCell>{item.buyer?.name}<div className="text-xs text-muted-foreground">{item.buyer?.email}</div></TableCell>
        <TableCell>{item.shop?.name}</TableCell>
        <TableCell>{pretty(item.status)} · payment {pretty(item.payment?.status)}</TableCell>
        <TableCell>{money(item.pricing?.total)}</TableCell>
      </>}
      {section === 'memberships' && <>
        <TableCell>{item.user?.name}<div className="text-xs text-muted-foreground">{item.user?.email}</div></TableCell>
        <TableCell className="capitalize">{item.status}</TableCell>
        <TableCell>{money((item.amountPaise || 0) / 100)}</TableCell>
        <TableCell>{item.validityDays} days</TableCell>
        <TableCell>{displayDate(item.endsAt)}</TableCell>
      </>}
      {section === 'reviews' && <>
        <TableCell><strong>{item.product?.name || item.shop?.name || 'Shop review'}</strong><div className="text-xs text-muted-foreground">{item.reviewer?.name}</div></TableCell>
        <TableCell>{item.rating} / 5</TableCell>
        <TableCell className="max-w-sm whitespace-pre-wrap break-words">{item.comment || '—'}</TableCell>
        <TableCell>{item.isVisible ? 'Visible' : 'Hidden'} · {displayDate(item.createdAt)}</TableCell>
        <TableCell><Button size="sm" variant="outline" onClick={() => manage(item)}>{item.isVisible ? 'Hide' : 'Restore'}</Button></TableCell>
      </>}
      {section === 'audit-logs' && <>
        <TableCell>{displayDate(item.createdAt)}</TableCell>
        <TableCell>{item.actorEmail}</TableCell>
        <TableCell>{item.action}</TableCell>
        <TableCell>{item.targetType} · {item.targetId}</TableCell>
        <TableCell className="max-w-xs break-words text-xs">{item.details ? JSON.stringify(item.details) : '—'}</TableCell>
      </>}
    </tr>
  ))

  const headers = {
    users: ['Account', 'Role', 'Status', 'Joined', 'Actions'],
    shops: ['Shop', 'Owner', 'Status', 'Actions'],
    products: ['Listing', 'Shop', 'Price', 'Stock / status', 'Actions'],
    orders: ['Order', 'Buyer', 'Shop', 'Status', 'Total'],
    memberships: ['Member', 'Status', 'Amount', 'Validity', 'Ends'],
    reviews: ['Review subject', 'Rating', 'Review', 'Status', 'Moderation'],
    'audit-logs': ['Time', 'Administrator', 'Action', 'Target', 'Details'],
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1300px] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">ShopLink operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{heading}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p></div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setLoading(true); setReloadSequence((current) => current + 1) }} disabled={isLoading}><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</Button>
        </header>

        {section === 'overview' ? (
          isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((key) => <div key={key} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div>
            : error ? <ErrorPanel message={error} retry={fetchData} />
              : dashboard && <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat icon={Users} label="Buyers" value={countFor(dashboard.users, 'buyer')} />
                  <Stat icon={Store} label="Shops" value={(dashboard.shops || []).reduce((sum, item) => sum + item.count, 0)} note={`${countFor(dashboard.shops, true)} verified`} />
                  <Stat icon={Package} label="Active listings" value={countFor(dashboard.products, 'active')} />
                  <Stat icon={IndianRupee} label="Released order value · 30 days" value={money(dashboard.last30DaysReleasedRevenue)} note={`${dashboard.last30DaysReleasedOrders || 0} completed and released orders`} />
                </section>
                <section className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-slate-200 shadow-sm dark:border-slate-800"><CardContent className="p-5">
                    <h2 className="font-semibold">Marketplace totals</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <Metric label="Sellers" value={countFor(dashboard.users, 'seller')} />
                      <Metric label="Orders today" value={dashboard.todayOrders} />
                      <Metric label="All products" value={(dashboard.products || []).reduce((sum, item) => sum + item.count, 0)} />
                      <Metric label="All orders" value={(dashboard.orders || []).reduce((sum, item) => sum + item.count, 0)} />
                    </div>
                  </CardContent></Card>
                  <Card className="border-slate-200 shadow-sm dark:border-slate-800"><CardContent className="p-5">
                    <h2 className="font-semibold">Orders by status</h2>
                    <div className="mt-4 flex flex-wrap gap-2">{(dashboard.orders || []).map((order) => <span key={order._id} className="rounded-lg border px-3 py-2 text-sm capitalize dark:border-slate-700">{pretty(order._id)} <strong className="ml-1">{order.count}</strong></span>)}</div>
                  </CardContent></Card>
                </section>
                <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800"><CardContent className="p-0">
                  <div className="border-b p-5 dark:border-slate-800"><h2 className="font-semibold">Recent orders</h2><p className="mt-1 text-xs text-muted-foreground">Latest orders from the live database; no financial actions are available here.</p></div>
                  <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr>{['Order', 'Status', 'Total', 'Created'].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead><tbody>{dashboard.recentOrders?.map((order) => <tr key={order._id} className="border-t dark:border-slate-800"><TableCell>{order.orderNumber}</TableCell><TableCell className="capitalize">{pretty(order.status)}</TableCell><TableCell>{money(order.pricing?.total)}</TableCell><TableCell>{displayDate(order.createdAt)}</TableCell></tr>)}{!dashboard.recentOrders?.length && <tr><td className="p-6 text-center text-sm text-muted-foreground" colSpan={4}>No orders have been recorded.</td></tr>}</tbody></table></div>
                </CardContent></Card>
              </>
        ) : !meta ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">This administrative section is not available.</CardContent></Card>
        ) : (
          <>
            <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setLoading(true); setSearchState({ section, value: searchInput.trim() }); setPageState({ section, page: 1 }); setReloadSequence((current) => current + 1) }}>
              <div className="relative min-w-[220px] flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={searchInput} onChange={(event) => setSearchInputState({ section, value: event.target.value })} placeholder={`Search ${section}…`} /></div>
              {filters.length > 0 && <select aria-label={`Filter ${section}`} className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground" value={filter} onChange={(event) => { setLoading(true); setFilterState({ section, value: event.target.value }); setPageState({ section, page: 1 }) }}>{filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
              <Button type="submit" disabled={isLoading}>Search</Button>
            </form>

            {error ? <ErrorPanel message={error} retry={() => { setLoading(true); setReloadSequence((current) => current + 1) }} /> : (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800"><CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr>{headers[section].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead>
                    <tbody>{isLoading ? <tr><td className="p-8 text-center text-sm text-muted-foreground" colSpan={headers[section].length}>Loading records…</td></tr> : renderResourceRows()}</tbody>
                  </table>
                </div>
                {!isLoading && items.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No matching records found.</div>}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm dark:border-slate-800">
                  <span className="text-muted-foreground">{pagination.total || 0} records · page {pagination.page || page} of {pagination.pages || 1}</span>
                  <div className="flex gap-2"><Button size="sm" variant="outline" disabled={isLoading || page <= 1} onClick={() => { setLoading(true); setPageState({ section, page: Math.max(1, page - 1) }) }}>Previous</Button><Button size="sm" variant="outline" disabled={isLoading || page >= (pagination.pages || 1)} onClick={() => { setLoading(true); setPageState({ section, page: page + 1 }) }}>Next</Button></div>
                </div>
              </CardContent></Card>
            )}
          </>
        )}
      </div>
    </AdminShell>
  )
}

function Metric({ label, value }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{Number(value || 0).toLocaleString('en-IN')}</p></div>
}

function ErrorPanel({ message, retry }) {
  return <Card className="border-red-300 dark:border-red-900"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><p role="alert" className="text-sm text-red-800 dark:text-red-200">{message}</p><Button variant="outline" size="sm" onClick={retry}>Retry</Button></CardContent></Card>
}
