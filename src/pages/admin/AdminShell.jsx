import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ClipboardList, CreditCard, LayoutDashboard, LogOut, MessageSquare,
  Package, ShieldCheck, Store, Users, Star,
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { authAPI } from '@/services/api'
import { Button } from '@/components/ui'
import toast from 'react-hot-toast'

const navigation = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Shops', path: '/admin/shops', icon: Store },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Orders', path: '/admin/orders', icon: CreditCard },
  { label: 'Memberships', path: '/admin/memberships', icon: ShieldCheck },
  { label: 'Reviews', path: '/admin/reviews', icon: Star },
  { label: 'Support & privacy', path: '/admin/support', icon: MessageSquare },
  { label: 'Audit log', path: '/admin/audit-logs', icon: ClipboardList },
]

export default function AdminShell({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [loggingOut, setLoggingOut] = useState(false)

  const signOut = async () => {
    setLoggingOut(true)
    try {
      await authAPI.logout()
    } catch (error) {
      toast.error(error?.message || 'Could not revoke the server session. Local sign-in was cleared.')
    } finally {
      logout()
      setLoggingOut(false)
      navigate('/admin/login', { replace: true })
    }
  }

  const active = (item) => item.exact
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(`${item.path}/`)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-600 font-bold text-white">S</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">ShopLink Admin</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Marketplace operations</span>
            </span>
          </Link>
          <Button size="sm" variant="outline" onClick={signOut} disabled={loggingOut} className="shrink-0 gap-2">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
          </Button>
        </div>
        <nav aria-label="Admin navigation" className="overflow-x-auto border-t px-3 py-2 md:hidden dark:border-slate-800">
          <div className="flex min-w-max gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.path} to={item.path} aria-current={active(item) ? 'page' : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-medium ${active(item) ? 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  <Icon className="h-4 w-4" />{item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r bg-white p-3 md:block dark:border-slate-800 dark:bg-slate-900">
          <nav aria-label="Admin sections" className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.path} to={item.path} aria-current={active(item) ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${active(item) ? 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  <Icon className="h-4 w-4" />{item.label}
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-4 left-3 right-3 rounded-xl border bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <div className="mb-1 flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-emerald-600" /> Live data</div>
            Admin views use current marketplace records. Order and payment records are read-only.
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
