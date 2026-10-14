// src/components/shared/Navbar.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, MessageSquare, ShoppingBag, Moon, Sun, Globe, Store, Home, Search, PlusCircle } from 'lucide-react'
import { useAuthStore, useUIStore, useNotificationStore } from '@/store'
import { Button, Avatar, AvatarImage, AvatarFallback } from '@/components/ui'

export const Navbar = () => {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, isSeller } = useAuthStore()
  const { theme, setTheme, setLanguage, unreadMessages } = useUIStore()
  const { unreadCount } = useNotificationStore()
  const role = user?.role && typeof user.role === 'string' ? user.role.toLowerCase() : undefined
  const navigate = useNavigate()
  const navigationItems = [
    { to: '/', label: t('nav.home'), icon: Home, end: true },
    { to: '/explore', label: t('nav.explore'), icon: Search },
    ...(isSeller ? [{ to: '/sell/add', label: t('nav.sell'), icon: PlusCircle }] : []),
    ...(isAuthenticated ? [
      { to: '/orders', label: t('nav.orders'), icon: ShoppingBag },
      { to: '/chat', label: t('nav.chat'), icon: MessageSquare },
    ] : []),
  ]

  const toggleLang = () => {
    const newLang = i18n.language === 'hi' ? 'en' : 'hi'
    i18n.changeLanguage(newLang)
    setLanguage(newLang)
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-[hsl(var(--background))] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-orange-500">
          <ShoppingBag className="h-6 w-6" />
          <span className="hidden sm:block">ShopLink</span>
        </Link>

        <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
          {navigationItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-muted text-orange-600 dark:text-orange-400' : 'text-foreground hover:bg-muted'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Language Toggle */}
          <Button variant="ghost" size="icon-sm" onClick={toggleLang} title="Toggle Language">
            <Globe className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAuthenticated && (
            <>
              {role === 'seller' || role === 'admin' ? (
                <Button variant="outline" size="sm" onClick={() => navigate('/shop/dashboard')} className="hidden sm:flex items-center gap-1.5">
                  <Store className="h-4 w-4" />
                  Shop Dashboard
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/shop/register')} className="hidden sm:flex items-center gap-1.5">
                  <Store className="h-4 w-4" />
                  Become a Seller
                </Button>
              )}

              {/* Chat */}
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/chat')} className="relative">
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate('/notifications')}
                className="relative overflow-visible"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, no unread notifications'}
                title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span aria-hidden="true" className="absolute -right-1.5 -top-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-semibold leading-none flex items-center justify-center ring-2 ring-[hsl(var(--background))]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Avatar / Profile */}
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/profile')}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar?.url} />
                  <AvatarFallback className="text-xs">{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </>
          )}

          {!isAuthenticated && (
            <Button size="sm" onClick={() => navigate('/auth/login')}>
              {t('auth.login')}
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
