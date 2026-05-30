// src/components/shared/BottomNav.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Search, PlusCircle, ShoppingBag, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store'
import { cn } from '@/lib/utils'

export const BottomNav = () => {
  const { t } = useTranslation()
  const { isAuthenticated, isSeller } = useAuthStore()
  const navigate = useNavigate()

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/explore', icon: Search, label: t('nav.explore') },
    ...(isSeller ? [{ to: '/sell/add', icon: PlusCircle, label: t('nav.sell'), accent: true }] : []),
    { to: '/orders', icon: ShoppingBag, label: t('nav.orders') },
    { to: '/chat', icon: MessageSquare, label: t('nav.chat') },
  ]

  if (!isAuthenticated) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background pb-safe">
      <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label, accent }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[48px]',
              isActive ? 'text-orange-500' : 'text-muted-foreground',
              accent && 'text-orange-500'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', (isActive || accent) && 'text-orange-500')} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
